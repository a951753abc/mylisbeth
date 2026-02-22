const db = require("../../db.js");
const config = require("../config.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");
const { checkUnlockableSkills } = require("./skillRegistry.js");

const SKILL_CFG = config.SKILL;

/**
 * 確保 NPC 的 weaponProficiency 是 per-weapon-type 物件
 * 若 DB 中仍為舊的 number 格式，原子轉換為 { [proficientType]: number } 或 {}
 */
async function ensureNpcProfMap(userId, npcIdx) {
  const profField = `hiredNpcs.${npcIdx}.weaponProficiency`;
  const typeField = `hiredNpcs.${npcIdx}.proficientType`;
  // 僅當 weaponProficiency 是 number 時才轉換
  const user = await db.findOne("user", { userId, [profField]: { $type: "number" } });
  if (!user) return; // 已是 object 或不存在
  const npc = (user.hiredNpcs || [])[npcIdx];
  if (!npc) return;
  const oldVal = npc.weaponProficiency || 0;
  const oldType = npc.proficientType || null;
  const profObj = oldType && oldVal > 0 ? { [oldType]: oldVal } : {};
  await db.update("user", { userId }, { $set: { [profField]: profObj } });
}

/**
 * 戰鬥後發放武器熟練度，並自動解鎖新技能
 * @param {string} userId
 * @param {object} weapon - 使用的武器
 * @param {string} gainKey - PROF_GAIN 的 key，如 "ADV_WIN", "BOSS"
 * @param {number} [multiplier=1] - 熟練度倍率（樓層往返衰減用）
 * @returns {{ profGained: number, weaponType: string, newSkills: string[] } | null}
 */
async function awardProficiency(userId, weapon, gainKey, multiplier = 1) {
  const weaponType = resolveWeaponType(weapon);
  if (!weaponType) return null;

  const rawGain = SKILL_CFG.PROF_GAIN[gainKey];
  if (!rawGain || rawGain <= 0) return null;

  const gain = Math.max(0, Math.round(rawGain * multiplier));
  if (gain <= 0) return { profGained: 0, weaponType, newSkills: [] };

  const profPath = `weaponProficiency.${weaponType}`;

  // 原子增加熟練度（上限 MAX_PROFICIENCY）
  const updated = await db.findOneAndUpdate(
    "user",
    { userId, [profPath]: { $lt: SKILL_CFG.MAX_PROFICIENCY } },
    { $inc: { [profPath]: gain } },
    { returnDocument: "after" },
  );

  if (!updated) {
    // 可能已滿 → 嘗試 cap
    await db.update(
      "user",
      { userId, [profPath]: { $gt: SKILL_CFG.MAX_PROFICIENCY } },
      { $set: { [profPath]: SKILL_CFG.MAX_PROFICIENCY } },
    );
    return { profGained: 0, weaponType, newSkills: [] };
  }

  // cap 超出值
  const currentProf = (updated.weaponProficiency || {})[weaponType] || 0;
  if (currentProf > SKILL_CFG.MAX_PROFICIENCY) {
    await db.update(
      "user",
      { userId },
      { $set: { [profPath]: SKILL_CFG.MAX_PROFICIENCY } },
    );
  }

  // 檢查可解鎖的技能
  const user = await db.findOne("user", { userId });
  const newSkills = checkUnlockableSkills(user);

  if (newSkills.length > 0) {
    await db.update(
      "user",
      { userId },
      { $addToSet: { learnedSkills: { $each: newSkills } } },
    );
  }

  return {
    profGained: Math.min(gain, SKILL_CFG.MAX_PROFICIENCY - (currentProf - gain)),
    weaponType,
    newSkills,
  };
}

/**
 * NPC 戰鬥後增加熟練度
 * @param {string} userId
 * @param {number} npcIdx - hiredNpcs 中的索引
 * @param {object} weapon - NPC 使用的武器
 * @param {string} gainKey
 * @param {number} [multiplier=1] - 熟練度倍率（樓層往返衰減用）
 * @returns {{ profGained: number, weaponType: string } | null}
 */
async function awardNpcProficiency(userId, npcIdx, weapon, gainKey, multiplier = 1) {
  const weaponType = resolveWeaponType(weapon);
  if (!weaponType) return null;

  const rawGain = SKILL_CFG.PROF_GAIN[gainKey];
  if (!rawGain || rawGain <= 0) return null;

  const gain = Math.max(0, Math.round(rawGain * multiplier));
  if (gain <= 0) return { profGained: 0, weaponType };

  // 確保舊格式已遷移為物件
  await ensureNpcProfMap(userId, npcIdx);

  // per-weapon-type 熟練度路徑
  const profPath = `hiredNpcs.${npcIdx}.weaponProficiency.${weaponType}`;

  // 遷移後重新讀取以確認當前值
  const freshUser = await db.findOne("user", { userId });
  const freshNpc = (freshUser?.hiredNpcs || [])[npcIdx];
  if (!freshNpc) return { profGained: 0, weaponType };

  const beforeProf = ((freshNpc.weaponProficiency || {})[weaponType]) || 0;
  if (beforeProf >= SKILL_CFG.MAX_PROFICIENCY) return { profGained: 0, weaponType };

  // 原子增加熟練度
  await db.update("user", { userId }, { $inc: { [profPath]: gain } });

  // cap 超出值
  const afterUser = await db.findOne("user", { userId });
  const afterNpc = (afterUser?.hiredNpcs || [])[npcIdx];
  const afterProf = ((afterNpc?.weaponProficiency || {})[weaponType]) || 0;
  if (afterProf > SKILL_CFG.MAX_PROFICIENCY) {
    await db.update("user", { userId }, { $set: { [profPath]: SKILL_CFG.MAX_PROFICIENCY } });
  }

  const actualGain = Math.min(afterProf, SKILL_CFG.MAX_PROFICIENCY) - beforeProf;
  return {
    profGained: Math.max(0, actualGain),
    weaponType,
  };
}

/**
 * 根據戰鬥結果取得對應的 PROF_GAIN key
 * @param {"WIN"|"LOSE"|"DRAW"} outcome
 * @param {"adv"|"solo"|"pvp"|"boss"} battleType
 * @returns {string}
 */
function getProfGainKey(outcome, battleType) {
  if (battleType === "boss") return "BOSS";
  if (battleType === "pvp") return outcome === "WIN" ? "PVP_WIN" : "PVP_LOSE";
  if (battleType === "solo") {
    if (outcome === "WIN") return "SOLO_WIN";
    if (outcome === "DRAW") return "SOLO_DRAW";
    return "SOLO_LOSE";
  }
  // adv
  if (outcome === "WIN") return "ADV_WIN";
  if (outcome === "DRAW") return "ADV_DRAW";
  return "ADV_LOSE";
}

module.exports = {
  awardProficiency,
  awardNpcProficiency,
  ensureNpcProfMap,
  getProfGainKey,
};
