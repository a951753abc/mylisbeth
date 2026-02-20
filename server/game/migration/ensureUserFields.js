const db = require("../../db.js");
const config = require("../config.js");
const { getNextSettlementTime } = require("../time/gameTime.js");

const DEFAULT_FIELDS = {
  col: 0,
  currentFloor: 1,
  floorProgress: { "1": { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE } },
  bossContribution: { totalDamage: 0, bossesDefeated: 0, mvpCount: 0, lastAttackCount: 0 },
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
    // Season 4
    totalSoloAdventures: 0,
    totalLoans: 0,
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
  lastLoanAt: null,
  // Season 4: Boss 聖遺物
  bossRelics: [],
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

  // 安全檢查：nextSettlementAt 若超過正常範圍（1 小時後），視為損壞並重設
  const maxValidFuture = Date.now() + 60 * 60 * 1000;
  const currentNext = updates.nextSettlementAt || user.nextSettlementAt;
  if (currentNext && currentNext > maxValidFuture) {
    updates.nextSettlementAt = getNextSettlementTime(Date.now());
  }

  // 修補已雇用 NPC 缺少 weeklyCost 的問題
  const npcs = updates.hiredNpcs || user.hiredNpcs || [];
  let npcPatched = false;
  const patchedNpcs = npcs.map((npc) => {
    if (npc.weeklyCost === undefined || npc.weeklyCost === null) {
      npcPatched = true;
      return { ...npc, weeklyCost: config.NPC.WEEKLY_WAGE[npc.quality] || 100 };
    }
    return npc;
  });
  if (npcPatched) {
    updates.hiredNpcs = patchedNpcs;
  }

  let patched = user;
  if (Object.keys(updates).length > 0) {
    await db.update("user", { userId: user.userId }, { $set: updates });
    patched = { ...user, ...updates };
  }

  // 自動同步到伺服器前線樓層（已清過的樓層不需要重打 Boss）
  const serverState = await db.findOne("server_state", { _id: "aincrad" });
  if (serverState) {
    const frontierFloor = serverState.currentFloor || 1;
    const playerFloor = patched.currentFloor || 1;
    if (playerFloor < frontierFloor) {
      const floorSync = {
        currentFloor: frontierFloor,
        [`floorProgress.${frontierFloor}`]: { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE },
      };
      await db.update("user", { userId: user.userId }, { $set: floorSync });
      patched = { ...patched, currentFloor: frontierFloor };
      patched.floorProgress = { ...(patched.floorProgress || {}) };
      patched.floorProgress[String(frontierFloor)] = { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE };
    }
  }

  return patched;
};
