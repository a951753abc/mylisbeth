const db = require("../../db.js");
const config = require("../config.js");
const { getNextSettlementTime } = require("../time/gameTime.js");

const DEFAULT_FIELDS = {
  col: 0,
  currentFloor: 1,
  floorProgress: { "1": { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE } },
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
  // Season 3 fields
  gameCreatedAt: null,
  hiredNpcs: [],
  lastSettlementAt: null,
  nextSettlementAt: null,
  debt: 0,
  debtStartedAt: null,
  debtCycleCount: 0,
  isInDebt: false,
  lastActionAt: null,
  // Season 3: 玩家體力值
  stamina: 100,
  maxStamina: 100,
  lastStaminaRegenAt: null,
};

module.exports = async function ensureUserFields(user) {
  const updates = {};

  for (const [key, defaultVal] of Object.entries(DEFAULT_FIELDS)) {
    if (user[key] === undefined) {
      updates[key] = defaultVal;
    }
  }

  // 若舊帳號缺少 Season 3 欄位，補上合理初始值
  if (updates.gameCreatedAt === null || user.gameCreatedAt === undefined) {
    const now = Date.now();
    if (!user.gameCreatedAt) updates.gameCreatedAt = now;
    if (!user.nextSettlementAt) updates.nextSettlementAt = getNextSettlementTime(now);
    if (!user.lastSettlementAt) updates.lastSettlementAt = now;
  }

  if (Object.keys(updates).length === 0) {
    return user;
  }

  await db.update("user", { userId: user.userId }, { $set: updates });
  return { ...user, ...updates };
};
