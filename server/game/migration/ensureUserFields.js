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
    // Season 5: PVP 決鬥
    totalDuelsPlayed: 0,
    duelKills: 0,
    firstStrikeWins: 0,
    halfLossWins: 0,
    totalLossWins: 0,
    totalShopSells: 0,
    npcDeaths: 0,
    debtCleared: 0,
    laughingCoffinDefeats: 0,
    // Season 6: 經濟改革
    totalMissionRewards: 0,
    totalMissionsCompleted: 0,
    totalEscortMissions: 0,
    totalMarketSold: 0,
    totalMarketEarned: 0,
    // Season 7: 暫停營業
    totalPauses: 0,
    // Season 8: 隨機事件擴充
    mysteriousChestsOpened: 0,
    forgeInspirationReceived: 0,
    npcAwakenings: 0,
    // Season 13: 遠征
    totalExpeditions: 0,
    expeditionsSucceeded: 0,
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
  // Season 4: Boss 聖遺物
  bossRelics: [],
  // Season 3: 玩家體力值
  stamina: 100,
  maxStamina: 100,
  lastStaminaRegenAt: null,
  // 挖礦 & 鍛造等級
  mineLevel: 1,
  mine: 0,
  forgeLevel: 1,
  forge: 0,
  // Season 7: 暫停營業
  businessPaused: false,
  businessPausedAt: null,
  // Season 5: 戰鬥等級 & PVP
  battleLevel: 1,
  battleExp: 0,
  isPK: false,
  pkKills: 0,
  defenseWeaponIndex: 0,
  // Season 8: 封印武器
  sealedWeapons: [],
  // Season 8: 鍛造靈感（流浪鍛冶師事件）
  forgeInspiration: false,
  // Season 12: 配方書（已發現配方）
  discoveredRecipes: [],
  // Season 12: 素材強化記錄書
  materialStatBook: {},
  // Season 12: 素材記錄書（挖礦 LV3，記錄素材-樓層關係）
  materialFloorBook: {},
  // 倉庫系統
  warehouse: { built: false, level: 0, items: [], weapons: [] },
  // Season 9: 劍技系統
  weaponProficiency: {
    one_handed_sword: 0, two_handed_sword: 0, two_handed_axe: 0,
    mace: 0, katana: 0, curved_sword: 0, rapier: 0,
    dagger: 0, spear: 0, bow: 0, shield: 0,
  },
  learnedSkills: [],
  equippedSkills: [],
  extraSkills: [],
  uniqueSkills: [],
  // Season 10: 樓層往返
  activeFloor: null, // null = 在前線（= currentFloor）
  // Season 11: 多登入管道
  provider: "discord",
  // Season 13: 遠征系統
  activeExpedition: null,
  lastExpeditionAt: null,
};

module.exports = async function ensureUserFields(user) {
  const updates = {};

  for (const [key, defaultVal] of Object.entries(DEFAULT_FIELDS)) {
    if (user[key] === undefined) {
      updates[key] = defaultVal;
    }
  }

  // 嵌套 stats 合併：舊玩家已有 stats 但缺少新賽季鍵值
  if (user.stats && !updates.stats) {
    const statsDefaults = DEFAULT_FIELDS.stats;
    const statsPatch = {};
    for (const [statKey, statDefault] of Object.entries(statsDefaults)) {
      if (user.stats[statKey] === undefined) {
        statsPatch[`stats.${statKey}`] = statDefault;
      }
    }
    if (Object.keys(statsPatch).length > 0) {
      Object.assign(updates, statsPatch);
    }
  }

  // 嵌套 weaponProficiency 合併：舊玩家已有 weaponProficiency 但可能缺少新武器類型
  if (user.weaponProficiency && !updates.weaponProficiency) {
    const profDefaults = DEFAULT_FIELDS.weaponProficiency;
    const profPatch = {};
    for (const [typeKey, typeDefault] of Object.entries(profDefaults)) {
      if (user.weaponProficiency[typeKey] === undefined) {
        profPatch[`weaponProficiency.${typeKey}`] = typeDefault;
      }
    }
    if (Object.keys(profPatch).length > 0) {
      Object.assign(updates, profPatch);
    }
  }

  // 若舊帳號缺少 Season 3 欄位，補上合理初始值
  if (updates.gameCreatedAt === null || user.gameCreatedAt === undefined) {
    const now = Date.now();
    if (!user.gameCreatedAt) updates.gameCreatedAt = now;
    if (!user.nextSettlementAt) updates.nextSettlementAt = getNextSettlementTime(now);
    if (!user.lastSettlementAt) updates.lastSettlementAt = now;
  }

  // 安全檢查：nextSettlementAt 若超過正常範圍，視為損壞並重設
  // Season 6: 30 遊戲日 × 5 分鐘 = 150 分鐘 = 2.5 小時，容差 ×1.2 = 3 小時
  const maxValidFuture = Date.now() + config.SETTLEMENT.INTERVAL_GAME_DAYS * config.TIME_SCALE * 1.2;
  const currentNext = updates.nextSettlementAt || user.nextSettlementAt;
  if (currentNext && currentNext > maxValidFuture) {
    updates.nextSettlementAt = getNextSettlementTime(Date.now());
  }

  // Season 6: 遷移 NPC weeklyCost → monthlyCost + 補缺欄位
  const npcs = updates.hiredNpcs || user.hiredNpcs || [];
  let npcPatched = false;
  const patchedNpcs = npcs.map((npc) => {
    let patched = npc;
    // 遷移 weeklyCost → monthlyCost
    if (npc.monthlyCost === undefined) {
      npcPatched = true;
      const cost = npc.weeklyCost || config.NPC.MONTHLY_WAGE[npc.quality] || 100;
      patched = { ...patched, monthlyCost: cost };
    }
    // 補缺 mission 欄位
    if (npc.mission === undefined) {
      npcPatched = true;
      patched = { ...patched, mission: null };
    }
    // 遷移 NPC weaponProficiency: number → per-weapon-type object
    if (typeof npc.weaponProficiency === "number") {
      npcPatched = true;
      const profObj = npc.proficientType && npc.weaponProficiency > 0
        ? { [npc.proficientType]: npc.weaponProficiency }
        : {};
      patched = { ...patched, weaponProficiency: profObj };
    }
    return patched;
  });
  if (npcPatched) {
    updates.hiredNpcs = patchedNpcs;
  }

  let patched = user;
  if (Object.keys(updates).length > 0) {
    await db.update("user", { userId: user.userId }, { $set: updates });
    // 分離 dot-notation 鍵（嵌套欄位如 stats.xxx）與普通鍵
    const flatUpdates = {};
    for (const [key, val] of Object.entries(updates)) {
      if (key.includes(".")) {
        const parts = key.split(".");
        // 只處理兩層嵌套（stats.xxx）
        if (parts.length === 2) {
          if (!flatUpdates[parts[0]]) flatUpdates[parts[0]] = { ...(user[parts[0]] || {}) };
          flatUpdates[parts[0]][parts[1]] = val;
        }
      } else {
        flatUpdates[key] = val;
      }
    }
    patched = { ...user, ...flatUpdates };
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
