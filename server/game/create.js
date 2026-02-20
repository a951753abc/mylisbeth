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

  // 取得伺服器前線樓層，新玩家直接從前線開始
  const serverState = await db.findOne("server_state", { _id: "aincrad" });
  const frontierFloor = serverState ? serverState.currentFloor : 1;

  const now = Date.now();
  await db.insertOne("user", {
    userId,
    name,
    col: 0,
    currentFloor: frontierFloor,
    floorProgress: {
      [String(frontierFloor)]: { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE },
    },
    bossContribution: { totalDamage: 0, bossesDefeated: 0, mvpCount: 0, lastAttackCount: 0 },
    bossRelics: [],
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
      npcDeaths: 0,
      debtCleared: 0,
      totalShopSells: 0,
      laughingCoffinDefeats: 0,
      totalSoloAdventures: 0,
      totalLoans: 0,
      // Season 5
      totalDuelsPlayed: 0,
      duelKills: 0,
      firstStrikeWins: 0,
      halfLossWins: 0,
      totalLossWins: 0,
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
    // 挖礦 & 鍛造等級
    mineLevel: 1,
    mine: 0,
    forgeLevel: 1,
    forge: 0,
    // Season 5: 戰鬥等級 & PVP
    battleLevel: 1,
    battleExp: 0,
    isPK: false,
    pkKills: 0,
    defenseWeaponIndex: 0,
  });
  return { success: true, message: "角色" + name + "建立完成" };
};
