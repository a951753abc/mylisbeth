const db = require("../../db.js");
const config = require("../config.js");

const ADV = config.ADV_LEVEL;

/**
 * 計算升到下一級所需的經驗值
 * @param {number} level - 當前等級
 * @returns {number}
 */
function getAdvExpToNextLevel(level) {
  if (level >= ADV.MAX_LEVEL) return null;
  return Math.floor(ADV.EXP_BASE * Math.pow(ADV.EXP_MULTIPLIER, level - 1));
}

/**
 * 給予冒險經驗並處理升級
 * @param {string} userId
 * @param {number} amount - 經驗值
 * @returns {{ levelUp: boolean, newLevel?: number, expGained: number }}
 */
async function awardAdvExp(userId, amount) {
  if (amount <= 0) return { levelUp: false, expGained: 0 };

  const user = await db.findOne("user", { userId });
  if (!user) return { levelUp: false, expGained: 0 };

  let level = user.adventureLevel || 1;
  let exp = (user.adventureExp || 0) + amount;
  let didLevelUp = false;

  // 已達上限不再升級
  if (level >= ADV.MAX_LEVEL) {
    return { levelUp: false, expGained: amount };
  }

  // 升級迴圈（可能連升多級）
  while (level < ADV.MAX_LEVEL) {
    const needed = getAdvExpToNextLevel(level);
    if (exp < needed) break;
    exp -= needed;
    level += 1;
    didLevelUp = true;
  }

  // 到頂後多餘經驗歸零
  if (level >= ADV.MAX_LEVEL) {
    exp = 0;
  }

  await db.update("user", { userId }, {
    $set: { adventureLevel: level, adventureExp: exp },
  });

  return {
    levelUp: didLevelUp,
    newLevel: didLevelUp ? level : undefined,
    expGained: amount,
  };
}

module.exports = { getAdvExpToNextLevel, awardAdvExp };
