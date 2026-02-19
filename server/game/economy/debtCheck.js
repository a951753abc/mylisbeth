const db = require("../../db.js");
const { isSettlementDue } = require("../time/gameTime.js");
const { processSettlement } = require("./settlement.js");

/**
 * 懶結算鉤子：在玩家每次行動時觸發
 * 使用 findOneAndUpdate 確保同一結算週期只執行一次
 * @param {string} userId
 * @returns {{ checked: boolean, settled?: boolean, bankruptcy?: boolean, bankruptcyInfo?: object }}
 */
async function checkSettlement(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { checked: false };

  const now = Date.now();
  if (!isSettlementDue(user.nextSettlementAt, now)) {
    return { checked: true, settled: false };
  }

  // 以 nextSettlementAt <= now 為 guard，防雙重觸發
  const locked = await db.findOneAndUpdate(
    "user",
    { userId, nextSettlementAt: { $lte: now } },
    { $set: { nextSettlementAt: now + 999 * 24 * 3600 * 1000 } }, // 暫時佔位
    { returnDocument: "before" },
  );
  if (!locked) {
    // 已被其他並發請求處理中
    return { checked: true, settled: false };
  }

  // 可能需要補算多個週期（離線補算）
  let result = { checked: true, settled: false };
  let iteration = 0;
  const MAX_CYCLES = 10;

  while (iteration < MAX_CYCLES) {
    const freshUser = await db.findOne("user", { userId });
    if (!freshUser) {
      // 可能在破產中被刪除
      return { checked: true, settled: true, bankruptcy: true };
    }
    if (!isSettlementDue(freshUser.nextSettlementAt, now)) break;

    const cycleResult = await processSettlement(userId);
    result = { checked: true, settled: true, ...cycleResult };

    if (cycleResult.bankruptcy) {
      return result;
    }
    iteration++;
  }

  return result;
}

/**
 * 取得因負債造成的行動限制
 * @param {object} user
 * @returns {{ canForge: boolean, canPvp: boolean, advRewardMult: number }}
 */
function enforceDebtPenalties(user) {
  const isInDebt = user.isInDebt || false;
  return {
    canForge: !isInDebt,
    canPvp: !isInDebt,
    advRewardMult: isInDebt ? 0.5 : 1.0,
  };
}

module.exports = { checkSettlement, enforceDebtPenalties };
