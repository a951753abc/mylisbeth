"use strict";

const { getSkillsByCategory } = require("../skill/skillRegistry.js");

/** tier → 加權（tier 1 最容易獲得） */
const TIER_WEIGHTS = { 1: 50, 2: 35, 3: 15 };

/**
 * 從遠征專屬技能池中選取一個 NPC 尚未學會的技能
 * @param {object} npc - hiredNpc 子文件
 * @returns {object|null} 選到的技能定義，或 null（全學完/無候選）
 */
function pickExpeditionSkill(npc) {
  const allExpSkills = getSkillsByCategory("expedition");
  if (allExpSkills.length === 0) return null;

  const learned = new Set(
    (npc.learnedSkills || []).map((s) => (typeof s === "string" ? s : s.skillId)),
  );

  const candidates = allExpSkills.filter((s) => !learned.has(s.id));
  if (candidates.length === 0) return null;

  // 加權隨機選取
  const weighted = [];
  for (const s of candidates) {
    const weight = TIER_WEIGHTS[s.tier] || 10;
    for (let i = 0; i < weight; i++) {
      weighted.push(s);
    }
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

module.exports = { pickExpeditionSkill };
