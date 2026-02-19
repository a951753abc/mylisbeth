const db = require("../db.js");
const config = require("./config.js");
const { getNextSettlementTime } = require("./time/gameTime.js");

module.exports = async function (name, userId) {
  if (!name) {
    return { error: "必須輸入角色姓名" };
  }
  const user = await db.findOne("user", { userId });
  if (user !== null) {
    return { error: "已有角色，無法重建" };
  }
  const now = Date.now();
  await db.insertOne("user", {
    userId,
    name,
    col: 0,
    currentFloor: 1,
    floorProgress: {
      "1": { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE },
    },
    bossContribution: { totalDamage: 0, bossesDefeated: 0, mvpCount: 0 },
    adventureLevel: 1,
    adventureExp: 0,
    lastLoginAt: null,
    dailyLoginStreak: 0,
    lastDailyClaimAt: null,
    achievements: [],
    title: null,
    availableTitles: [],
    stats: {
      totalForges: 0,
      totalMines: 0,
      totalAdventures: 0,
      totalPvpWins: 0,
      totalPvpLosses: 0,
      weaponsBroken: 0,
      totalBossAttacks: 0,
      yukiDefeats: 0,
      totalColEarned: 0,
    },
    // Season 3
    gameCreatedAt: now,
    hiredNpcs: [],
    lastSettlementAt: now,
    nextSettlementAt: getNextSettlementTime(now),
    debt: 0,
    debtStartedAt: null,
    debtCycleCount: 0,
    isInDebt: false,
    lastActionAt: null,
    lastLoanAt: null,
    // Season 3: 玩家體力值
    stamina: 100,
    maxStamina: 100,
    lastStaminaRegenAt: now,
  });
  return { success: true, message: "角色" + name + "建立完成" };
};
