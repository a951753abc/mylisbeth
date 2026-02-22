const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getSkillsByWeaponType, getSkill } = require("./skillRegistry.js");
const { getNpcSlotCount } = require("./skillSlot.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");

const SKILL_CFG = config.SKILL;

/**
 * NPC 戰鬥後嘗試自動學習新技能
 * @param {string} userId
 * @param {number} npcIdx - hiredNpcs 中的索引
 * @param {object} npc - hiredNpc 子文件
 * @param {object} weapon - NPC 使用的武器
 * @param {number|null} [overrideChance=null] - 覆蓋學習機率（修練用）
 * @returns {{ learned: boolean, skillId?: string, skillName?: string } | null}
 */
async function tryNpcLearnSkill(userId, npcIdx, npc, weapon, overrideChance = null) {
  const weaponType = resolveWeaponType(weapon);
  if (!weaponType) return null;

  const qualityMult = SKILL_CFG.NPC_QUALITY_LEARN_MULT[npc.quality] || 1.0;
  const learnChance = overrideChance ?? (SKILL_CFG.NPC_LEARN_CHANCE * qualityMult);

  if (!roll.d100Check(learnChance)) {
    return null;
  }

  // 取得該武器類型的技能列表
  const availableSkills = getSkillsByWeaponType(weaponType);
  const alreadyLearned = new Set((npc.learnedSkills || []).map(
    (s) => typeof s === "string" ? s : s.skillId,
  ));

  // 過濾已學會的和熟練度不足的
  const npcProf = npc.weaponProficiency || 0;
  const candidates = availableSkills.filter(
    (s) => !alreadyLearned.has(s.id) && npcProf >= s.requiredProficiency,
  );

  if (candidates.length === 0) return null;

  // 按 tier 低的優先（更容易學到基礎技能）
  candidates.sort((a, b) => a.tier - b.tier);
  const selected = candidates[0];

  // 學習
  const learnedPath = `hiredNpcs.${npcIdx}.learnedSkills`;
  await db.update(
    "user",
    { userId },
    { $addToSet: { [learnedPath]: selected.id } },
  );

  // 自動裝備（如果有空槽）
  const slotCount = getNpcSlotCount(npc);
  const equipped = npc.equippedSkills || [];
  if (equipped.length < slotCount) {
    const equippedPath = `hiredNpcs.${npcIdx}.equippedSkills`;
    await db.update(
      "user",
      { userId },
      { $push: { [equippedPath]: { skillId: selected.id, mods: [] } } },
    );
  }

  return { learned: true, skillId: selected.id, skillName: selected.nameCn };
}

module.exports = { tryNpcLearnSkill };
