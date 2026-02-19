const db = require("../../db.js");
const { releaseAllNpcs } = require("../npc/npcManager.js");

/**
 * 執行破產處理：
 * 1. 寫入 bankruptcy_log
 * 2. 釋放所有 NPC
 * 3. 刪除 user 文件
 * @param {string} userId
 * @param {number} totalDebt
 * @param {number} debtCycles
 * @returns {object} 破產摘要
 */
async function executeBankruptcy(userId, totalDebt, debtCycles, options = {}) {
  const user = await db.findOne("user", { userId });
  const summary = {
    userId,
    name: user?.name || "未知",
    totalDebt,
    debtCycles,
    finalCol: user?.col || 0,
    hiredNpcCount: (user?.hiredNpcs || []).length,
    weaponCount: (user?.weaponStock || []).length,
    bankruptedAt: Date.now(),
    cause: options.cause || "debt",
  };

  // 1. 先寫 log（保留記錄）
  await db.insertOne("bankruptcy_log", summary);

  // 2. 釋放所有 NPC
  await releaseAllNpcs(userId);

  // 3. 刪除角色
  await db.deleteOne("user", { userId });

  return summary;
}

module.exports = { executeBankruptcy };
