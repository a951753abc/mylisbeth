const db = require("../db.js");
const config = require("./config.js");

const BL = config.BATTLE_LEVEL;

/**
 * 計算戰鬥等級加成
 * @param {number} battleLevel - 當前戰鬥等級 (1~30)
 * @returns {{ hpBonus: number, atkMult: number, defMult: number, agiMult: number }}
 */
function getBattleLevelBonus(battleLevel) {
  const lvl = Math.max(1, Math.min(battleLevel || 1, BL.MAX_LEVEL));
  return {
    hpBonus: (lvl - 1) * BL.STAT_BONUS.hp,
    atkMult: 1 + (lvl - 1) * BL.STAT_RATE.atk,
    defMult: 1 + (lvl - 1) * BL.STAT_RATE.def,
    agiMult: 1 + (lvl - 1) * BL.STAT_RATE.agi,
  };
}

/**
 * 計算升到下一級所需經驗
 * @param {number} level - 當前等級
 * @returns {number}
 */
function getExpForNextLevel(level) {
  if (level >= BL.MAX_LEVEL) return Infinity;
  return Math.floor(BL.EXP_BASE * Math.pow(BL.EXP_MULTIPLIER, level - 1));
}

/**
 * 頒發戰鬥經驗（原子操作）
 *
 * 使用 $inc 原子遞增 battleExp，再以 findOneAndUpdate 迴圈
 * 確保升級判定在並發下安全（CAS 模式）。
 *
 * @param {string} userId
 * @param {number} xpAmount
 * @returns {Promise<{ leveled: boolean, newLevel: number, newExp: number }>}
 */
async function awardBattleExp(userId, xpAmount) {
  if (!xpAmount || xpAmount <= 0) return { leveled: false, newLevel: 0, newExp: 0 };

  // Step 1: 原子遞增 battleExp
  const afterInc = await db.findOneAndUpdate(
    "user",
    { userId },
    { $inc: { battleExp: xpAmount } },
    { returnDocument: "after" },
  );
  if (!afterInc) return { leveled: false, newLevel: 0, newExp: 0 };

  // Step 2: CAS 升級迴圈 — 每次只升一級，以 level + exp 條件保證原子性
  let leveled = false;
  let currentLevel = afterInc.battleLevel || 1;
  let currentExp = afterInc.battleExp || 0;

  while (currentLevel < BL.MAX_LEVEL) {
    const needed = getExpForNextLevel(currentLevel);
    if (currentExp < needed) break;

    // 嘗試原子升級：只在 level 和 exp 未被其他操作改動時才成功
    const upgraded = await db.findOneAndUpdate(
      "user",
      { userId, battleLevel: currentLevel, battleExp: { $gte: needed } },
      { $inc: { battleLevel: 1, battleExp: -needed } },
      { returnDocument: "after" },
    );

    if (!upgraded) break; // 條件不符（被其他並發操作搶先），停止
    leveled = true;
    currentLevel = upgraded.battleLevel ?? (currentLevel + 1);
    currentExp = upgraded.battleExp ?? 0;
  }

  // 滿級時清除多餘經驗
  if (currentLevel >= BL.MAX_LEVEL && currentExp > 0) {
    await db.update("user", { userId, battleLevel: BL.MAX_LEVEL, battleExp: { $gt: 0 } }, {
      $set: { battleExp: 0 },
    });
    currentExp = 0;
  }

  return { leveled, newLevel: currentLevel, newExp: currentExp };
}

module.exports = { getBattleLevelBonus, getExpForNextLevel, awardBattleExp };
