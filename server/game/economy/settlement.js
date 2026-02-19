const db = require("../../db.js");
const config = require("../config.js");
const { getNextSettlementTime, isNewbie } = require("../time/gameTime.js");
const { executeBankruptcy } = require("./bankruptcy.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");

const SETTLE = config.SETTLEMENT;

/**
 * 純函式：計算本次帳單金額
 * @param {object} user - 使用者文件
 * @returns {number} 帳單總額
 */
function calculateBill(user) {
  const floor = user.currentFloor || 1;
  const npcWages = (user.hiredNpcs || []).reduce(
    (sum, npc) => sum + (npc.weeklyCost || 0),
    0,
  );
  return SETTLE.BASE_RENT + floor * SETTLE.FLOOR_TAX_PER_FLOOR + npcWages;
}

/**
 * 執行一次結算（扣款或進負債）
 * @param {string} userId
 * @returns {{ settled: boolean, bill: number, paid: boolean, bankruptcy?: boolean, bankruptcyInfo?: object }}
 */
async function processSettlement(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { settled: false };

  // 新手保護期內不結算
  if (isNewbie(user.gameCreatedAt)) {
    const nextAt = getNextSettlementTime(user.nextSettlementAt || Date.now());
    await db.update("user", { userId }, { $set: { nextSettlementAt: nextAt } });
    return { settled: true, bill: 0, paid: true, newbie: true };
  }

  const bill = calculateBill(user);
  const now = Date.now();

  if (user.col >= bill) {
    // 可以付款
    await db.update("user", { userId }, {
      $inc: { col: -bill },
      $set: {
        lastSettlementAt: now,
        nextSettlementAt: getNextSettlementTime(now),
        isInDebt: false,
        debt: 0,
        debtStartedAt: null,
        debtCycleCount: 0,
      },
    });
    return { settled: true, bill, paid: true };
  }

  // 付不出款：進負債
  const newDebt = (user.debt || 0) + bill;
  const debtCycles = (user.debtCycleCount || 0) + 1;
  const nextAt = getNextSettlementTime(now);

  if (debtCycles > SETTLE.MAX_DEBT_CYCLES) {
    // 超過最大負債週期：破產
    const bankruptcyInfo = await executeBankruptcy(userId, newDebt, debtCycles);
    return { settled: true, bill, paid: false, bankruptcy: true, bankruptcyInfo };
  }

  await db.update("user", { userId }, {
    $set: {
      lastSettlementAt: now,
      nextSettlementAt: nextAt,
      isInDebt: true,
      debt: newDebt,
      debtStartedAt: user.debtStartedAt || now,
      debtCycleCount: debtCycles,
    },
  });

  return { settled: true, bill, paid: false, debt: newDebt, debtCycles };
}

/**
 * 玩家主動還債
 * @param {string} userId
 * @param {number} amount
 * @returns {{ success: boolean, error?: string, remainingDebt?: number }}
 */
async function payDebt(userId, amount) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };
  if (!user.isInDebt || user.debt <= 0) return { error: "你目前沒有負債" };
  if (amount <= 0) return { error: "還款金額必須大於 0" };

  const actualAmount = Math.min(amount, user.debt);
  const paid = await db.findOneAndUpdate(
    "user",
    { userId, col: { $gte: actualAmount } },
    { $inc: { col: -actualAmount, debt: -actualAmount } },
    { returnDocument: "after" },
  );
  if (!paid) return { error: `Col 不足，還款需要 ${actualAmount} Col` };

  const remainingDebt = Math.max(0, paid.debt);
  if (remainingDebt <= 0) {
    await db.update("user", { userId }, {
      $set: { isInDebt: false, debt: 0, debtStartedAt: null, debtCycleCount: 0 },
    });
    await increment(userId, "debtCleared");
    await checkAndAward(userId);
    return { success: true, remainingDebt: 0, cleared: true };
  }

  return { success: true, remainingDebt };
}

module.exports = { calculateBill, processSettlement, payDebt };
