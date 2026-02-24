const db = require("../../db.js");

const STATE_KEY = "laughingCoffin";

/**
 * 將被搶贓物加入 LC 贓物池
 * @param {object} goods - { col?, materials?, weapons? }
 */
async function addToLootPool(goods) {
  const updates = {};
  if (goods.col && goods.col > 0) {
    updates[`${STATE_KEY}.lootPool.col`] = goods.col;
  }

  const ops = {};
  if (Object.keys(updates).length > 0) {
    ops.$inc = updates;
  }

  const pushOps = {};
  if (goods.materials && goods.materials.length > 0) {
    pushOps[`${STATE_KEY}.lootPool.materials`] = { $each: goods.materials };
  }
  if (goods.weapons && goods.weapons.length > 0) {
    pushOps[`${STATE_KEY}.lootPool.weapons`] = { $each: goods.weapons };
  }
  if (Object.keys(pushOps).length > 0) {
    ops.$push = pushOps;
  }

  if (Object.keys(ops).length > 0) {
    await db.update("server_state", {}, ops);
  }
}

/**
 * 從贓物池取回物品（潛行成功時）
 * @param {string} userId
 * @param {number} colRate - 取回 Col 比例（0~1）
 * @param {number} materialCount - 最多取回幾個素材
 * @returns {object} { col, materials, weapons }
 */
async function grabFromLootPool(userId, colRate, materialCount) {
  const serverState = await db.findOne("server_state", {});
  const lootPool = serverState?.[STATE_KEY]?.lootPool;
  if (!lootPool) return { col: 0, materials: [], weapons: [] };

  const grabbed = { col: 0, materials: [], weapons: [] };

  // 取回 Col（原子操作：確保贓物池有足夠 Col 才扣除）
  const colToGrab = Math.floor((lootPool.col || 0) * colRate);
  if (colToGrab > 0) {
    const colResult = await db.findOneAndUpdate(
      "server_state",
      { [`${STATE_KEY}.lootPool.col`]: { $gte: colToGrab } },
      { $inc: { [`${STATE_KEY}.lootPool.col`]: -colToGrab } },
    );
    if (colResult !== null) {
      grabbed.col = colToGrab;
      await db.update("user", { userId }, { $inc: { col: colToGrab } });
    }
  }

  // 取回素材（從尾部取，避免索引問題）
  const poolMats = lootPool.materials || [];
  const matsToGrab = poolMats.slice(0, materialCount);
  if (matsToGrab.length > 0) {
    grabbed.materials = matsToGrab;
    // 從贓物池移除
    for (let i = 0; i < matsToGrab.length; i++) {
      await db.update("server_state", {}, {
        $pop: { [`${STATE_KEY}.lootPool.materials`]: -1 }, // 移除第一個
      });
    }
    // 給玩家素材
    for (const mat of matsToGrab) {
      await db.atomicIncItem(userId, mat.itemId, mat.itemLevel, mat.itemName, 1);
    }
  }

  // 取回武器（最多 1 把）
  const poolWeapons = lootPool.weapons || [];
  if (poolWeapons.length > 0) {
    const weapon = poolWeapons[0];
    grabbed.weapons = [weapon];
    await db.update("server_state", {}, {
      $pop: { [`${STATE_KEY}.lootPool.weapons`]: -1 },
    });
    // 給玩家武器
    await db.update("user", { userId }, {
      $push: { weaponStock: weapon },
    });
  }

  return grabbed;
}

module.exports = { addToLootPool, grabFromLootPool };
