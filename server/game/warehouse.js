const db = require("../db.js");
const config = require("./config.js");
const { formatText, getText } = require("./textManager.js");
const { deductCol } = require("./economy/col.js");
const { getWeaponLockError } = require("./weapon/weaponLock.js");
const { remapWeaponIndices } = require("./economy/discard.js");

// ===== 容量計算 =====

function getItemCapacity(level) {
  const wh = config.WAREHOUSE;
  return wh.BASE_ITEM_CAPACITY + level * wh.ITEM_CAPACITY_PER_LEVEL;
}

function getWeaponCapacity(level) {
  const wh = config.WAREHOUSE;
  return wh.BASE_WEAPON_CAPACITY + level * wh.WEAPON_CAPACITY_PER_LEVEL;
}

function getUpgradeCost(currentLevel) {
  const wh = config.WAREHOUSE;
  return Math.floor(wh.UPGRADE_BASE_COST * Math.pow(wh.UPGRADE_COST_MULT, currentLevel));
}

function countWarehouseItems(warehouseItems) {
  return (warehouseItems || []).filter((i) => i.itemNum > 0).length;
}

// ===== 前置檢查 =====

function checkUnlocked(user) {
  const unlockFloor = config.WAREHOUSE.UNLOCK_FLOOR;
  if ((user.currentFloor || 1) < unlockFloor) {
    return formatText("WAREHOUSE.NOT_UNLOCKED", { currentFloor: user.currentFloor || 1 });
  }
  return null;
}

function checkBuilt(warehouse) {
  if (!warehouse || !warehouse.built) {
    return getText("WAREHOUSE.NOT_BUILT");
  }
  return null;
}

function getWarehouse(user) {
  return user.warehouse || { built: false, level: 0, items: [], weapons: [] };
}

// ===== 核心操作 =====

/**
 * 建置倉庫
 */
async function build(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };

  const warehouse = getWarehouse(user);
  if (warehouse.built) return { error: getText("WAREHOUSE.ALREADY_BUILT") };

  const cost = config.WAREHOUSE.BUILD_COST;
  if ((user.col || 0) < cost) {
    return { error: formatText("WAREHOUSE.BUILD_COL_INSUFFICIENT", { cost, col: user.col || 0 }) };
  }

  const paid = await deductCol(userId, cost);
  if (!paid) {
    return { error: formatText("WAREHOUSE.BUILD_COL_INSUFFICIENT", { cost, col: user.col || 0 }) };
  }

  await db.update("user", { userId }, {
    $set: { "warehouse.built": true, "warehouse.level": 0, "warehouse.items": [], "warehouse.weapons": [] },
  });

  return {
    success: true,
    message: getText("WAREHOUSE.BUILD_SUCCESS"),
  };
}

/**
 * 擴容升級
 */
async function upgrade(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };

  const warehouse = getWarehouse(user);
  const builtErr = checkBuilt(warehouse);
  if (builtErr) return { error: builtErr };

  const maxLevel = config.WAREHOUSE.MAX_LEVEL;
  if (warehouse.level >= maxLevel) {
    return { error: formatText("WAREHOUSE.UPGRADE_MAX", { level: maxLevel }) };
  }

  const cost = getUpgradeCost(warehouse.level);
  if ((user.col || 0) < cost) {
    return {
      error: formatText("WAREHOUSE.UPGRADE_COL_INSUFFICIENT", {
        nextLevel: warehouse.level + 1,
        cost,
        col: user.col || 0,
      }),
    };
  }

  const paid = await deductCol(userId, cost);
  if (!paid) {
    return {
      error: formatText("WAREHOUSE.UPGRADE_COL_INSUFFICIENT", {
        nextLevel: warehouse.level + 1,
        cost,
        col: user.col || 0,
      }),
    };
  }

  const newLevel = warehouse.level + 1;
  await db.update("user", { userId }, { $set: { "warehouse.level": newLevel } });

  return {
    success: true,
    message: formatText("WAREHOUSE.UPGRADE_SUCCESS", {
      level: newLevel,
      itemCap: getItemCapacity(newLevel),
      weaponCap: getWeaponCapacity(newLevel),
    }),
  };
}

/**
 * 存入素材（從身上 itemStock → 倉庫 warehouse.items）
 */
async function storeItem(userId, itemIndex, quantity) {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return { error: "無效的素材索引" };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "數量必須為正整數" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };
  const warehouse = getWarehouse(user);
  const builtErr = checkBuilt(warehouse);
  if (builtErr) return { error: builtErr };

  // 驗證身上素材
  const item = (user.itemStock || [])[itemIndex];
  if (!item || item.itemNum < quantity) {
    return { error: getText("WAREHOUSE.STORE_ITEM_NOT_FOUND") };
  }

  // 檢查倉庫容量（素材種類數）
  const warehouseItems = warehouse.items || [];
  const existingInWarehouse = warehouseItems.find(
    (wi) => wi.itemId === item.itemId && wi.itemLevel === item.itemLevel,
  );
  if (!existingInWarehouse) {
    const currentCount = countWarehouseItems(warehouseItems);
    const maxCap = getItemCapacity(warehouse.level);
    if (currentCount >= maxCap) {
      return { error: formatText("WAREHOUSE.STORE_ITEM_FULL", { current: currentCount, max: maxCap }) };
    }
  }

  // Step 1: 從身上扣除（原子操作）
  const deducted = await db.atomicIncItem(userId, item.itemId, item.itemLevel, item.itemName, -quantity);
  if (!deducted) return { error: getText("WAREHOUSE.STORE_ITEM_NOT_FOUND") };

  // Step 2: 加入倉庫（原子操作）
  if (existingInWarehouse) {
    await db.update(
      "user",
      { userId, "warehouse.items": { $elemMatch: { itemId: item.itemId, itemLevel: item.itemLevel } } },
      { $inc: { "warehouse.items.$.itemNum": quantity } },
    );
  } else {
    // 原子容量保護：用 $expr 確保當下種類數仍低於上限
    const maxCap = getItemCapacity(warehouse.level);
    const pushResult = await db.findOneAndUpdate(
      "user",
      {
        userId,
        $expr: {
          $lt: [
            { $size: { $filter: { input: "$warehouse.items", as: "i", cond: { $gt: ["$$i.itemNum", 0] } } } },
            maxCap,
          ],
        },
      },
      {
        $push: {
          "warehouse.items": {
            itemId: item.itemId,
            itemLevel: item.itemLevel,
            itemNum: quantity,
            itemName: item.itemName,
          },
        },
      },
      { returnDocument: "after" },
    );
    if (!pushResult) {
      // 回滾：把素材加回身上
      await db.atomicIncItem(userId, item.itemId, item.itemLevel, item.itemName, quantity);
      return { error: formatText("WAREHOUSE.STORE_ITEM_FULL", { current: maxCap, max: maxCap }) };
    }
  }

  return {
    success: true,
    message: formatText("WAREHOUSE.STORE_ITEM_SUCCESS", { name: item.itemName, quantity }),
  };
}

/**
 * 取出素材（從倉庫 warehouse.items → 身上 itemStock）
 */
async function retrieveItem(userId, itemIndex, quantity) {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return { error: "無效的素材索引" };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "數量必須為正整數" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };
  const warehouse = getWarehouse(user);
  const builtErr = checkBuilt(warehouse);
  if (builtErr) return { error: builtErr };

  // 驗證倉庫素材
  const warehouseItems = warehouse.items || [];
  const whItem = warehouseItems[itemIndex];
  if (!whItem || whItem.itemNum < quantity) {
    return { error: getText("WAREHOUSE.RETRIEVE_ITEM_NOT_FOUND") };
  }

  // 檢查身上背包是否有空間
  const existsOnPlayer = (user.itemStock || []).find(
    (si) => si.itemId === whItem.itemId && si.itemLevel === whItem.itemLevel && si.itemNum > 0,
  );
  if (!existsOnPlayer) {
    const currentItemCount = (user.itemStock || []).filter((si) => si.itemNum > 0).length;
    const itemLimit = config.INITIAL_ITEM_LIMIT + (user.mineLevel ?? 1);
    if (currentItemCount >= itemLimit) {
      return { error: formatText("WAREHOUSE.RETRIEVE_ITEM_CAPACITY_FULL", { current: currentItemCount, max: itemLimit }) };
    }
  }

  // Step 1: 從倉庫扣除（原子操作）
  const whResult = await db.findOneAndUpdate(
    "user",
    {
      userId,
      "warehouse.items": {
        $elemMatch: { itemId: whItem.itemId, itemLevel: whItem.itemLevel, itemNum: { $gte: quantity } },
      },
    },
    { $inc: { "warehouse.items.$.itemNum": -quantity } },
    { returnDocument: "after" },
  );
  if (!whResult) return { error: getText("WAREHOUSE.RETRIEVE_ITEM_NOT_FOUND") };

  // 清理 itemNum <= 0 的項目
  await db.update("user", { userId }, { $pull: { "warehouse.items": { itemNum: { $lte: 0 } } } });

  // Step 2: 加到身上（原子操作，含失敗回滾）
  const added = await db.atomicIncItem(userId, whItem.itemId, whItem.itemLevel, whItem.itemName, quantity);
  if (!added) {
    // 回滾：把素材加回倉庫
    await db.update(
      "user",
      { userId, "warehouse.items": { $elemMatch: { itemId: whItem.itemId, itemLevel: whItem.itemLevel } } },
      { $inc: { "warehouse.items.$.itemNum": quantity } },
    );
    console.error(`[warehouse] retrieveItem rollback for user ${userId}, item ${whItem.itemId}`);
    return { error: "取出失敗，請稍後再試" };
  }

  return {
    success: true,
    message: formatText("WAREHOUSE.RETRIEVE_ITEM_SUCCESS", { name: whItem.itemName, quantity }),
  };
}

/**
 * 存入武器（從身上 weaponStock → 倉庫 warehouse.weapons）
 */
async function storeWeapon(userId, weaponIndex) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0) return { error: "無效的武器索引" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };
  const warehouse = getWarehouse(user);
  const builtErr = checkBuilt(warehouse);
  if (builtErr) return { error: builtErr };

  // 檢查倉庫武器容量
  const currentWeaponCount = (warehouse.weapons || []).length;
  const maxCap = getWeaponCapacity(warehouse.level);
  if (currentWeaponCount >= maxCap) {
    return { error: formatText("WAREHOUSE.STORE_WEAPON_FULL", { current: currentWeaponCount, max: maxCap }) };
  }

  // 驗證武器存在
  const weapon = (user.weaponStock || [])[weaponIndex];
  if (!weapon) return { error: getText("WAREHOUSE.STORE_WEAPON_NOT_FOUND") };

  // 檢查武器是否被 NPC 裝備
  const lockError = getWeaponLockError(user.hiredNpcs, weaponIndex);
  if (lockError) return { error: lockError };

  // 檢查是否為 PVP 防禦武器
  if (user.defenseWeaponIndex != null && user.defenseWeaponIndex === weaponIndex) {
    return { error: getText("WAREHOUSE.STORE_WEAPON_DEFENSE") };
  }

  // Step 1: 原子確認無 NPC 裝備此武器後移除（防止 TOCTOU）
  const removeResult = await db.findOneAndUpdate(
    "user",
    {
      userId,
      [`weaponStock.${weaponIndex}`]: { $exists: true },
      "hiredNpcs.equippedWeaponIndex": { $ne: weaponIndex },
    },
    { $unset: { [`weaponStock.${weaponIndex}`]: 1 } },
    { returnDocument: "after" },
  );
  if (!removeResult) return { error: getText("WAREHOUSE.STORE_WEAPON_LOCKED") };

  await db.update("user", { userId }, { $pull: { weaponStock: null } });

  // Step 2: 加入倉庫
  await db.update("user", { userId }, { $push: { "warehouse.weapons": weapon } });

  // Step 3: 重映射索引（NPC equippedWeaponIndex, defenseWeaponIndex）
  await remapWeaponIndices(userId, weaponIndex);

  return {
    success: true,
    message: formatText("WAREHOUSE.STORE_WEAPON_SUCCESS", { name: weapon.weaponName }),
  };
}

/**
 * 取出武器（從倉庫 warehouse.weapons → 身上 weaponStock）
 */
async function retrieveWeapon(userId, weaponIndex) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0) return { error: "無效的武器索引" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockErr = checkUnlocked(user);
  if (unlockErr) return { error: unlockErr };
  const warehouse = getWarehouse(user);
  const builtErr = checkBuilt(warehouse);
  if (builtErr) return { error: builtErr };

  // 驗證倉庫武器存在
  const whWeapons = warehouse.weapons || [];
  const weapon = whWeapons[weaponIndex];
  if (!weapon) return { error: getText("WAREHOUSE.RETRIEVE_WEAPON_NOT_FOUND") };

  // 檢查身上武器容量
  const currentWeaponCount = (user.weaponStock || []).length;
  const weaponLimit = config.INITIAL_WEAPON_LIMIT + (user.forgeLevel ?? 1);
  if (currentWeaponCount >= weaponLimit) {
    return { error: formatText("WAREHOUSE.RETRIEVE_WEAPON_CAPACITY_FULL", { current: currentWeaponCount, max: weaponLimit }) };
  }

  // Step 1: 從倉庫移除（$unset + $pull null）
  await db.update("user", { userId }, { $unset: { [`warehouse.weapons.${weaponIndex}`]: 1 } });
  await db.update("user", { userId }, { $pull: { "warehouse.weapons": null } });

  // Step 2: 加到身上（含崩潰日誌）
  try {
    await db.update("user", { userId }, { $push: { weaponStock: weapon } });
  } catch (err) {
    console.error(`[warehouse] retrieveWeapon failed push for user ${userId}, weapon: ${weapon.weaponName}`, err);
    throw err;
  }

  return {
    success: true,
    message: formatText("WAREHOUSE.RETRIEVE_WEAPON_SUCCESS", { name: weapon.weaponName }),
  };
}

/**
 * 查詢倉庫狀態
 */
async function getStatus(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const unlockFloor = config.WAREHOUSE.UNLOCK_FLOOR;
  const unlocked = (user.currentFloor || 1) >= unlockFloor;
  const warehouse = getWarehouse(user);

  return {
    unlocked,
    unlockFloor,
    built: warehouse.built,
    level: warehouse.level,
    items: warehouse.items || [],
    weapons: warehouse.weapons || [],
    itemCapacity: warehouse.built ? getItemCapacity(warehouse.level) : 0,
    weaponCapacity: warehouse.built ? getWeaponCapacity(warehouse.level) : 0,
    upgradeCost:
      warehouse.built && warehouse.level < config.WAREHOUSE.MAX_LEVEL
        ? getUpgradeCost(warehouse.level)
        : null,
    buildCost: config.WAREHOUSE.BUILD_COST,
    maxLevel: config.WAREHOUSE.MAX_LEVEL,
    baseItemCapacity: config.WAREHOUSE.BASE_ITEM_CAPACITY,
    baseWeaponCapacity: config.WAREHOUSE.BASE_WEAPON_CAPACITY,
  };
}

module.exports = {
  build,
  upgrade,
  storeItem,
  retrieveItem,
  storeWeapon,
  retrieveWeapon,
  getStatus,
  getItemCapacity,
  getWeaponCapacity,
  getUpgradeCost,
};
