const db = require("../../db.js");
const config = require("../config.js");
const { deductCol, awardCol } = require("../economy/col.js");
const { generateNpc } = require("./generator.js");
const { getExpToNextLevel } = require("./npcStats.js");
const { getGameDaysSince } = require("../time/gameTime.js");
const { getModifier } = require("../title/titleModifier.js");
const { formatText, getText } = require("../textManager.js");

const NPC_CFG = config.NPC;

/**
 * 計算玩家可雇用 NPC 上限
 * @param {number} adventureLevel - 冒險等級
 * @returns {number}
 */
function getHireLimit(adventureLevel) {
  const base = NPC_CFG.HIRE_LIMIT_BASE;
  const bonus = Math.floor((adventureLevel || 1) / NPC_CFG.HIRE_LIMIT_PER_ADV_LEVEL);
  return Math.min(NPC_CFG.HIRE_LIMIT_MAX, base + bonus);
}

/**
 * 雇用 NPC
 * @param {string} userId
 * @param {string} npcId - e.g. "npc_123"
 * @returns {{ success: boolean, error?: string, npc?: object }}
 */
async function hireNpc(userId, npcId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];

  // 雇用上限檢查
  const limit = getHireLimit(user.adventureLevel);
  if (hired.length >= limit) {
    return { error: formatText("NPC.HIRE_LIMIT", { limit }) };
  }

  if (hired.some((n) => n.npcId === npcId)) {
    return { error: getText("NPC.ALREADY_HIRED") };
  }

  // 從 DB 取得或生成 NPC 資料
  let npcDoc = await db.findOne("npc", { npcId });
  if (!npcDoc) {
    // 按需生成並寫入 DB
    const index = parseInt(npcId.replace("npc_", ""), 10);
    if (isNaN(index) || index < 0 || index >= NPC_CFG.POOL_SIZE) {
      return { error: getText("NPC.INVALID_NPC_ID") };
    }
    const generated = generateNpc(index);
    npcDoc = { ...generated, status: "available", hiredBy: null, diedAt: null, causeOfDeath: null };
    await db.upsert("npc", { npcId }, { $set: npcDoc });
  }

  if (npcDoc.status === "dead") return { error: getText("NPC.NPC_DEAD") };
  if (npcDoc.status === "hired") return { error: getText("NPC.NPC_TAKEN") };

  // 嘗試原子性搶雇（防競爭）
  const updated = await db.findOneAndUpdate(
    "npc",
    { npcId, status: "available" },
    { $set: { status: "hired", hiredBy: userId } },
    { returnDocument: "after" },
  );
  if (!updated) return { error: getText("NPC.NPC_RACE") };

  // 扣除雇用費
  const cost = npcDoc.hireCost || NPC_CFG.HIRE_COST[npcDoc.quality];
  const paid = await deductCol(userId, cost);
  if (!paid) {
    // 回滾雇用狀態
    await db.update("npc", { npcId }, { $set: { status: "available", hiredBy: null } });
    return { error: formatText("NPC.HIRE_COL_INSUFFICIENT", { cost }) };
  }

  // 加入 hiredNpcs（原子性保證不超過上限）
  const npcEntry = {
    npcId: npcDoc.npcId,
    name: npcDoc.name,
    quality: npcDoc.quality,
    baseStats: npcDoc.baseStats,
    condition: npcDoc.condition ?? 100,
    level: npcDoc.level ?? 1,
    exp: npcDoc.exp ?? 0,
    equippedWeaponIndex: null,
    monthlyCost: npcDoc.monthlyCost || npcDoc.weeklyCost || NPC_CFG.MONTHLY_WAGE[npcDoc.quality],
    mission: null,
    hiredAt: Date.now(),
    // Season 9: 劍技系統（高品質 NPC 可能自帶初始技能）
    learnedSkills: npcDoc.learnedSkills || [],
    equippedSkills: npcDoc.equippedSkills || [],
    weaponProficiency: typeof npcDoc.weaponProficiency === "object" ? npcDoc.weaponProficiency : (npcDoc.weaponProficiency || 0),
    proficientType: npcDoc.proficientType || null,
  };
  const pushResult = await db.findOneAndUpdate(
    "user",
    { userId, [`hiredNpcs.${limit - 1}`]: { $exists: false } },
    { $push: { hiredNpcs: npcEntry } },
    { returnDocument: "after" },
  );
  if (!pushResult) {
    // 競爭條件：雇用上限已在其他併發請求中達到，回滾 NPC 狀態 + 退款
    await db.update("npc", { npcId }, { $set: { status: "available", hiredBy: null } });
    await awardCol(userId, cost);
    return { error: formatText("NPC.HIRE_LIMIT", { limit }) };
  }

  return { success: true, npc: npcEntry, cost };
}

/**
 * 解雇 NPC
 * @param {string} userId
 * @param {string} npcId
 * @returns {{ success: boolean, error?: string }}
 */
async function fireNpc(userId, npcId) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];
  const npcEntry = hired.find((n) => n.npcId === npcId);
  if (!npcEntry) return { error: getText("NPC.NPC_NOT_FOUND") };

  await db.update("user", { userId }, { $pull: { hiredNpcs: { npcId } } });
  await db.update("npc", { npcId }, { $set: { status: "available", hiredBy: null } });

  return { success: true };
}

/**
 * 治療 NPC
 * @param {string} userId
 * @param {string} npcId
 * @param {"quick"|"full"} healType
 * @returns {{ success: boolean, error?: string, conditionAfter?: number }}
 */
async function healNpc(userId, npcId, healType) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { error: getText("NPC.NPC_NOT_FOUND") };

  const npc = hired[npcIdx];
  const currentCond = npc.condition ?? 100;
  if (currentCond >= 100) return { error: getText("NPC.FULL_CONDITION") };

  const cost = healType === "full" ? NPC_CFG.HEAL_FULL_COST : NPC_CFG.HEAL_QUICK_COST;
  const paid = await deductCol(userId, cost);
  if (!paid) return { error: formatText("NPC.HEAL_COL_INSUFFICIENT", { cost }) };

  const newCond = healType === "full" ? 100 : Math.min(100, currentCond + 30);
  await db.update(
    "user",
    { userId },
    { $set: { [`hiredNpcs.${npcIdx}.condition`]: newCond } },
  );

  return { success: true, conditionAfter: newCond };
}

/**
 * NPC 戰鬥後受傷（更新 condition 與 exp，並判斷死亡）
 * @param {string} userId
 * @param {string} npcId
 * @param {"WIN"|"LOSE"|"DRAW"} outcome
 * @param {number} expGain
 * @returns {{ survived: boolean, levelUp: boolean, died?: boolean }}
 */
async function resolveNpcBattle(userId, npcId, outcome, expGain, userTitle = null, bossAtkBoost = 0) {
  const user = await db.findOne("user", { userId });
  if (!user) return { survived: false, died: false };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { survived: false, died: false };

  const npc = hired[npcIdx];
  // 套用 npcCondLoss 稱號修正
  const condLossMod = getModifier(userTitle, "npcCondLoss");
  const baseCondLoss = NPC_CFG.CONDITION_LOSS[outcome] || 15;
  // Boss phase atkBoost 額外增加體力損耗（每點 +3）
  const condLoss = Math.max(1, Math.round((baseCondLoss + bossAtkBoost * 3) * condLossMod));
  const newCond = Math.max(0, (npc.condition ?? 100) - condLoss);

  // 判斷死亡：敗北 + 體力 ≤ 閾值 → 套用 npcDeathChance 修正
  const deathChanceMod = getModifier(userTitle, "npcDeathChance");
  const effectiveDeathChance = Math.max(1, Math.round(NPC_CFG.DEATH_CHANCE * deathChanceMod));
  const isDeath =
    outcome === "LOSE" &&
    newCond <= NPC_CFG.DEATH_THRESHOLD &&
    Math.random() * 100 < effectiveDeathChance;

  if (isDeath) {
    return await killNpc(userId, npcId, "戰死");
  }

  // 計算升級
  const newExp = (npc.exp || 0) + expGain;
  const expNeeded = getExpToNextLevel(npc.level || 1);
  const didLevelUp = newExp >= expNeeded;
  const finalExp = didLevelUp ? newExp - expNeeded : newExp;
  const newLevel = didLevelUp ? (npc.level || 1) + 1 : (npc.level || 1);

  await db.update(
    "user",
    { userId },
    {
      $set: {
        [`hiredNpcs.${npcIdx}.condition`]: newCond,
        [`hiredNpcs.${npcIdx}.exp`]: finalExp,
        [`hiredNpcs.${npcIdx}.level`]: newLevel,
      },
    },
  );

  return { survived: true, levelUp: didLevelUp, newCondition: newCond, newLevel };
}

/**
 * 永久殺死 NPC（移除隊伍 + 標記 DB）
 * @param {string} userId
 * @param {string} npcId
 * @param {string} [cause="未知原因"]
 * @returns {{ survived: false, died: true, npcName: string }}
 */
async function killNpc(userId, npcId, cause = "未知原因") {
  const user = await db.findOne("user", { userId });
  if (!user) return { survived: false, died: true, npcName: "未知" };

  const hired = user.hiredNpcs || [];
  const npc = hired.find((n) => n.npcId === npcId);
  const npcName = npc?.name || "未知冒險者";

  // 從 hiredNpcs 移除（武器也一同失去）
  await db.update("user", { userId }, { $pull: { hiredNpcs: { npcId } } });

  // 標記 DB
  await db.update(
    "npc",
    { npcId },
    { $set: { status: "dead", hiredBy: null, diedAt: Date.now(), causeOfDeath: cause } },
  );

  return { survived: false, died: true, npcName };
}

/**
 * 為 NPC 裝備武器
 * @param {string} userId
 * @param {string} npcId
 * @param {number|null} weaponIndex - user.weaponStock 的 index，null 表示卸除
 * @returns {{ success: boolean, error?: string }}
 */
async function equipWeapon(userId, npcId, weaponIndex) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { error: getText("NPC.NPC_NOT_FOUND") };

  if (weaponIndex !== null && !user.weaponStock?.[weaponIndex]) {
    return { error: formatText("NPC.WEAPON_NOT_FOUND", { index: weaponIndex }) };
  }

  // 檢查是否已被其他 NPC 裝備
  if (weaponIndex !== null) {
    const alreadyEquipped = hired.some(
      (n, i) => i !== npcIdx && n.equippedWeaponIndex === weaponIndex,
    );
    if (alreadyEquipped) {
      return { error: getText("NPC.WEAPON_ALREADY_EQUIPPED") };
    }
  }

  await db.update(
    "user",
    { userId },
    { $set: { [`hiredNpcs.${npcIdx}.equippedWeaponIndex`]: weaponIndex } },
  );

  return { success: true };
}

/**
 * 依遊戲天數自然恢復所有在雇 NPC 的體力
 * @param {string} userId
 * @param {number} gameDaysPassed - 自上次恢復起經過的遊戲天數
 */
async function recoverConditions(userId, gameDaysPassed) {
  if (!gameDaysPassed || gameDaysPassed <= 0) return;

  const user = await db.findOne("user", { userId });
  if (!user || !user.hiredNpcs || user.hiredNpcs.length === 0) return;

  const recover = Math.min(100, NPC_CFG.DAILY_RECOVER * gameDaysPassed);
  const updates = {};
  user.hiredNpcs.forEach((npc, idx) => {
    const newCond = Math.min(100, (npc.condition ?? 100) + recover);
    updates[`hiredNpcs.${idx}.condition`] = newCond;
  });

  if (Object.keys(updates).length > 0) {
    await db.update("user", { userId }, { $set: updates });
  }
}

/**
 * 解雇所有 NPC（破產用）
 * @param {string} userId
 */
async function releaseAllNpcs(userId) {
  const user = await db.findOne("user", { userId });
  if (!user || !user.hiredNpcs) return;

  const npcIds = user.hiredNpcs.map((n) => n.npcId);
  for (const npcId of npcIds) {
    await db.update("npc", { npcId }, { $set: { status: "available", hiredBy: null } });
  }
  await db.update("user", { userId }, { $set: { hiredNpcs: [] } });
}

module.exports = {
  hireNpc,
  fireNpc,
  healNpc,
  resolveNpcBattle,
  killNpc,
  equipWeapon,
  recoverConditions,
  releaseAllNpcs,
  getHireLimit,
};
