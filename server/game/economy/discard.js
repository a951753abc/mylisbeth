const db = require("../../db.js");
const config = require("../config.js");
const { destroyWeapon } = require("../weapon/weapon.js");
const { getWeaponLockError } = require("../weapon/weaponLock.js");

const MAX_DISCARD_QTY = 99;

/**
 * 丟棄素材 — 從 itemStock 移除並寫入全域丟棄池
 * @param {string} userId
 * @param {number} itemIndex - itemStock 陣列索引
 * @param {number} quantity  - 欲丟棄數量（上限 99）
 */
async function discardItem(userId, itemIndex, quantity) {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    return { error: "無效的素材索引" };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "數量必須為正整數" };
  }
  // 限制單次丟棄數量
  quantity = Math.min(quantity, MAX_DISCARD_QTY);

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const item = (user.itemStock || [])[itemIndex];
  if (!item) return { error: "找不到該素材" };
  if (item.itemNum < quantity) {
    return { error: `素材數量不足（擁有 ${item.itemNum}，欲丟棄 ${quantity}）` };
  }

  // 原子扣除素材
  const success = await db.atomicIncItem(
    userId,
    item.itemId,
    item.itemLevel,
    item.itemName,
    -quantity,
  );
  if (!success) {
    return { error: "丟棄失敗，請確認素材數量" };
  }

  // 寫入丟棄池（尊重上限，超過就不寫入—素材已扣除是玩家的選擇）
  try {
    const poolCount = await db.count("discard_pool", {});
    const remaining = Math.max(0, config.DISCARD.MAX_POOL_SIZE - poolCount);
    const toInsert = Math.min(quantity, remaining);
    if (toInsert > 0) {
      const docs = [];
      for (let i = 0; i < toInsert; i++) {
        docs.push({
          type: "item",
          data: {
            itemId: item.itemId,
            itemLevel: item.itemLevel,
            itemName: item.itemName,
          },
          discardedBy: userId,
          discardedAt: new Date(),
        });
      }
      await db.insertMany("discard_pool", docs);
    }
  } catch (err) {
    console.error("丟棄池寫入失敗（素材已扣除）:", err);
  }

  return {
    success: true,
    itemName: item.itemName,
    itemLevel: item.itemLevel,
    quantity,
    message: `你將 ${item.itemName} x${quantity} 丟棄了。也許某天會有冒險者在野外撿到它。`,
  };
}

/**
 * 丟棄武器 — 從 weaponStock 移除並寫入全域丟棄池
 * 銷毀後會重新映射 NPC 裝備索引和 PVP 防禦武器索引
 * @param {string} userId
 * @param {number} weaponIndex - weaponStock 陣列索引
 */
async function discardWeapon(userId, weaponIndex) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0) {
    return { error: "無效的武器索引" };
  }

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const weapons = user.weaponStock || [];
  const weapon = weapons[weaponIndex];
  if (!weapon) return { error: "找不到該武器" };

  // 檢查是否被 NPC 裝備中或遠征中
  const lockError = getWeaponLockError(user.hiredNpcs, weaponIndex, user.activeExpedition);
  if (lockError) return { error: lockError };

  // 檢查是否為 PVP 防禦武器（只在明確設定時才擋）
  const defIdx = user.defenseWeaponIndex;
  if (defIdx != null && defIdx === weaponIndex) {
    return { error: "該武器是你的 PVP 防禦武器，請先更換防禦武器" };
  }

  // 銷毀武器
  await destroyWeapon(userId, weaponIndex);

  // 重新映射：NPC 裝備索引和防禦武器索引
  // destroyWeapon 用 $unset + $pull(null) 會使陣列壓縮，高於 weaponIndex 的索引都 -1
  await remapWeaponIndices(userId, weaponIndex);

  // 寫入丟棄池
  try {
    const poolCount = await db.count("discard_pool", {});
    if (poolCount < config.DISCARD.MAX_POOL_SIZE) {
      await db.insertOne("discard_pool", {
        type: "weapon",
        data: {
          weaponName: weapon.weaponName,
          name: weapon.name,
          hp: weapon.hp,
          atk: weapon.atk,
          def: weapon.def,
          agi: weapon.agi,
          cri: weapon.cri,
          durability: weapon.durability,
          buff: weapon.buff || 0,
        },
        discardedBy: userId,
        discardedAt: new Date(),
      });
    }
  } catch (err) {
    console.error("丟棄池寫入失敗（武器已銷毀）:", err);
  }

  return {
    success: true,
    weaponName: weapon.weaponName,
    message: `你將武器【${weapon.weaponName}】丟棄了。也許某天會有冒險者在野外撿到它。`,
  };
}

/**
 * 武器陣列壓縮後，重映射 NPC equippedWeaponIndex 和 defenseWeaponIndex
 * 所有 > removedIndex 的索引 -1
 */
async function remapWeaponIndices(userId, removedIndex) {
  const user = await db.findOne("user", { userId });
  if (!user) return;

  const updates = {};

  // 重映射 defenseWeaponIndex
  const defIdx = user.defenseWeaponIndex;
  if (defIdx != null && defIdx > removedIndex) {
    updates.defenseWeaponIndex = defIdx - 1;
  }

  // 重映射 NPC equippedWeaponIndex
  const hiredNpcs = user.hiredNpcs || [];
  let npcChanged = false;
  const newNpcs = hiredNpcs.map((npc) => {
    if (npc.equippedWeaponIndex == null) return npc;
    if (npc.equippedWeaponIndex > removedIndex) {
      npcChanged = true;
      return { ...npc, equippedWeaponIndex: npc.equippedWeaponIndex - 1 };
    }
    return npc;
  });

  if (npcChanged) {
    updates.hiredNpcs = newNpcs;
  }

  if (Object.keys(updates).length > 0) {
    await db.update("user", { userId }, { $set: updates });
  }
}

module.exports = { discardItem, discardWeapon, remapWeaponIndices };
