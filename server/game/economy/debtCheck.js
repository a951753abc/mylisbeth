const db = require("../../db.js");
const { isSettlementDue, getNextSettlementTime } = require("../time/gameTime.js");
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

  // 暫停營業：跳過所有結算，推延下次結算時間
  // 注意：目前 move.js 會在呼叫 checkSettlement 前攔截暫停玩家，
  // 此守衛為防禦性設計，確保未來若有其他路徑呼叫 checkSettlement 也能正確跳過
  if (user.businessPaused) {
    if (isSettlementDue(user.nextSettlementAt, now)) {
      await db.update("user", { userId }, {
        $set: { nextSettlementAt: getNextSettlementTime(now) },
      });
    }
    return { checked: true, settled: false, paused: true };
  }

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
  // 第一次結算無需再檢查 isSettlementDue（鎖定前已確認到期），
  // 之後的補算迴圈才需要重新檢查
  let result = { checked: true, settled: false };
  const MAX_CYCLES = 10;

  for (let i = 0; i < MAX_CYCLES; i++) {
    if (i > 0) {
      const freshUser = await db.findOne("user", { userId });
      if (!freshUser) {
        return { checked: true, settled: true, bankruptcy: true };
      }
      if (!isSettlementDue(freshUser.nextSettlementAt, now)) break;
    }

    const cycleResult = await processSettlement(userId);
    result = { checked: true, settled: true, ...cycleResult };

    if (cycleResult.bankruptcy) {
      return result;
    }
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
