const roll = require("../roll.js");
const config = require("../config.js");
const { getEffectiveDelay, rollSkillTrigger } = require("./skillCombat.js");

const SKILL_CFG = config.SKILL;

/**
 * 嘗試 Skill Connect（技能連鎖）
 * 在技能成功觸發後調用，判定是否連鎖到下一個技能
 *
 * @param {object} skillCtx - 技能上下文
 * @param {object} lastSkill - 剛觸發的技能定義
 * @param {string[]} lastMods - 剛觸發技能的 Mod
 * @param {number} currentChain - 當前連鎖數
 * @returns {{ connected: boolean, nextEntry: object|null, newChain: number }}
 */
function trySkillConnect(skillCtx, lastSkill, lastMods, currentChain) {
  // 已達最大連鎖數
  if (currentChain >= SKILL_CFG.CONNECT_MAX_CHAIN) {
    return { connected: false, nextEntry: null, newChain: 0 };
  }

  // 計算連鎖機率 = base + prof bonus - delay penalty
  const delay = getEffectiveDelay(lastSkill, lastMods);
  const profBonus = Math.floor(skillCtx.proficiency / 100) * SKILL_CFG.CONNECT_PROF_BONUS_PER_100;
  const chance = SKILL_CFG.CONNECT_BASE_CHANCE + profBonus - delay * 10;

  if (chance <= 0 || !roll.d100Check(chance)) {
    return { connected: false, nextEntry: null, newChain: 0 };
  }

  // 從剩餘的機率型技能中隨機選一個（排除剛觸發的）
  const candidates = skillCtx.probabilities.filter(
    (entry) => entry.skill.id !== lastSkill.id,
  );

  if (candidates.length === 0) {
    return { connected: false, nextEntry: null, newChain: 0 };
  }

  // 隨機選擇（不需再判定觸發率，Connect 自動觸發）
  const nextEntry = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    connected: true,
    nextEntry,
    newChain: currentChain + 1,
  };
}

module.exports = { trySkillConnect };
