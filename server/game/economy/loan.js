const db = require("../../db.js");
const config = require("../config.js");
const { calculateBill } = require("./settlement.js");
const { executeBankruptcy } = require("./bankruptcy.js");
const { isNewbie } = require("../time/gameTime.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");

const SETTLE = config.SETTLEMENT;
const LOAN_COOLDOWN = 5000; // 借款冷卻 5 秒

/**
 * 計算借款後的破產機率（死亡閾值）
 * @param {number} totalDebt - 借款後的總負債
 * @param {number} bill - 當期帳單
 * @returns {number} 0-90 之間的百分比
 */
function calcDeathThreshold(totalDebt, bill) {
  if (bill <= 0) return 0;
  return Math.min(
    SETTLE.LOAN_DEATH_CAP,
    Math.floor((totalDebt / bill) * SETTLE.LOAN_DEATH_PER_BILL),
  );
}

/**
 * 取得借款資訊（純函式，給 API 預覽用）
 * @param {object} user
 * @returns {{ bill, maxLoan, minLoan, currentDebt, canLoan, deathPerBill, deathCap, reason? }}
 */
function getLoanInfo(user) {
  const bill = calculateBill(user);
  const maxLoan = bill * SETTLE.LOAN_MAX_BILL_MULT;
  const currentDebt = user.debt || 0;
  const debtCycles = user.debtCycleCount || 0;

  const base = {
    bill,
    currentDebt,
    deathPerBill: SETTLE.LOAN_DEATH_PER_BILL,
    deathCap: SETTLE.LOAN_DEATH_CAP,
  };

  if (isNewbie(user.gameCreatedAt)) {
    return { ...base, maxLoan: 0, minLoan: 0, canLoan: false, reason: "新手保護期內無需借款" };
  }
  if (debtCycles >= SETTLE.MAX_DEBT_CYCLES) {
    return { ...base, maxLoan: 0, minLoan: 0, canLoan: false, reason: "負債週期已達上限，無法再借款" };
  }
  if (bill <= 0) {
    return { ...base, maxLoan: 0, minLoan: 0, canLoan: false, reason: "無帳單時不可借款" };
  }

  return {
    ...base,
    maxLoan,
    minLoan: SETTLE.LOAN_MIN,
    canLoan: true,
    currentDeathChance: calcDeathThreshold(currentDebt, bill),
    maxDeathChance: calcDeathThreshold(currentDebt + maxLoan, bill),
  };
}

/**
 * 執行借款（原子操作防競爭）
 * @param {string} userId
 * @param {number} amount
 * @returns {{ success?, error?, bankruptcy?, roll?, threshold?, col?, debt?, bankruptcyInfo? }}
 */
async function takeLoan(userId, amount) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  if (isNewbie(user.gameCreatedAt)) {
    return { error: "新手保護期內無需借款" };
  }

  const debtCycles = user.debtCycleCount || 0;
  if (debtCycles >= SETTLE.MAX_DEBT_CYCLES) {
    return { error: "負債週期已達上限，無法再借款" };
  }

  const bill = calculateBill(user);
  if (bill <= 0) return { error: "無帳單時不可借款" };

  const maxLoan = bill * SETTLE.LOAN_MAX_BILL_MULT;

  if (amount < SETTLE.LOAN_MIN) {
    return { error: `最低借款金額為 ${SETTLE.LOAN_MIN} Col` };
  }
  if (amount > maxLoan) {
    return { error: `單次借款上限為 ${maxLoan} Col（帳單的 ${SETTLE.LOAN_MAX_BILL_MULT} 倍）` };
  }

  // 冷卻檢查：原子性防連續借款
  const now = Date.now();
  const cooldownGuard = await db.findOneAndUpdate(
    "user",
    {
      userId,
      $or: [
        { lastLoanAt: null },
        { lastLoanAt: { $exists: false } },
        { lastLoanAt: { $lte: now - LOAN_COOLDOWN } },
      ],
    },
    { $set: { lastLoanAt: now } },
    { returnDocument: "before" },
  );
  if (!cooldownGuard) return { error: "操作過於頻繁，請稍後再試" };

  // 以冷卻 guard 回傳的文件為準（最新狀態）
  const currentDebt = cooldownGuard.debt || 0;
  const newTotalDebt = currentDebt + amount;
  const threshold = calcDeathThreshold(newTotalDebt, bill);

  // 擲 d100（1~100）
  const roll = Math.floor(Math.random() * 100) + 1;
  const died = roll <= threshold;

  if (died) {
    const bankruptcyInfo = await executeBankruptcy(userId, newTotalDebt, debtCycles + 1);
    return {
      success: false,
      bankruptcy: true,
      bankruptcyInfo,
      roll,
      threshold,
      deathChance: threshold,
      amount,
    };
  }

  // 存活：原子性加 Col、加 debt（以 currentDebt 作為 guard 防競爭）
  const committed = await db.findOneAndUpdate(
    "user",
    {
      userId,
      debt: currentDebt,
      debtCycleCount: { $lt: SETTLE.MAX_DEBT_CYCLES },
    },
    {
      $inc: { col: amount, debt: amount },
      $set: {
        isInDebt: true,
        debtStartedAt: cooldownGuard.debtStartedAt || now,
      },
    },
    { returnDocument: "after" },
  );

  if (!committed) {
    return { error: "借款條件已變更，請重試" };
  }

  await increment(userId, "totalLoans");
  await checkAndAward(userId);

  return {
    success: true,
    roll,
    threshold,
    deathChance: threshold,
    amount,
    col: committed.col,
    debt: committed.debt,
    nextDeathChance: calcDeathThreshold(committed.debt + SETTLE.LOAN_MIN, bill),
  };
}

module.exports = { takeLoan, getLoanInfo, calcDeathThreshold };
