const skillDefs = require("./skillDefs.json");
const config = require("../config.js");

// 索引：id → skill
const SKILL_MAP = {};
for (const skill of skillDefs) {
  SKILL_MAP[skill.id] = skill;
}

// 索引：weaponType → skills[]
const SKILLS_BY_WEAPON = {};
for (const skill of skillDefs) {
  if (skill.category === "weapon" && skill.weaponType) {
    if (!SKILLS_BY_WEAPON[skill.weaponType]) {
      SKILLS_BY_WEAPON[skill.weaponType] = [];
    }
    SKILLS_BY_WEAPON[skill.weaponType].push(skill);
  }
}

// 索引：category → skills[]
const SKILLS_BY_CATEGORY = {};
for (const skill of skillDefs) {
  if (!SKILLS_BY_CATEGORY[skill.category]) {
    SKILLS_BY_CATEGORY[skill.category] = [];
  }
  SKILLS_BY_CATEGORY[skill.category].push(skill);
}

/**
 * 根據 ID 取得技能定義
 * @param {string} skillId
 * @returns {object|null}
 */
function getSkill(skillId) {
  return SKILL_MAP[skillId] || null;
}

/**
 * 取得指定武器類型的所有技能
 * @param {string} weaponType
 * @returns {object[]}
 */
function getSkillsByWeaponType(weaponType) {
  return SKILLS_BY_WEAPON[weaponType] || [];
}

/**
 * 取得指定分類的所有技能
 * @param {string} category - "weapon" | "combat" | "extra" | "unique"
 * @returns {object[]}
 */
function getSkillsByCategory(category) {
  return SKILLS_BY_CATEGORY[category] || [];
}

/**
 * 取得所有技能定義
 * @returns {object[]}
 */
function getAllSkills() {
  return skillDefs.map(({ unlockCondition, ...rest }) => rest);
}

/**
 * 判斷玩家是否有資格學習某技能
 * @param {object} user - 玩家資料
 * @param {string} skillId
 * @returns {{ canLearn: boolean, reason?: string }}
 */
function canLearnSkill(user, skillId) {
  const skill = getSkill(skillId);
  if (!skill) return { canLearn: false, reason: "技能不存在" };

  const learned = user.learnedSkills || [];
  if (learned.includes(skillId)) {
    return { canLearn: false, reason: "已學會此技能" };
  }

  // extra 技能需要特殊解鎖條件
  if (skill.category === "extra") {
    return { canLearn: false, reason: "額外技能需透過特殊條件解鎖" };
  }

  // unique 技能暫不實作
  if (skill.category === "unique") {
    return { canLearn: false, reason: "唯一技能尚未開放" };
  }

  // 武器技能：檢查對應武器熟練度
  if (skill.category === "weapon" && skill.weaponType) {
    const prof = (user.weaponProficiency || {})[skill.weaponType] || 0;
    if (prof < skill.requiredProficiency) {
      return {
        canLearn: false,
        reason: `${skill.weaponType} 熟練度不足（需要 ${skill.requiredProficiency}，目前 ${prof}）`,
      };
    }
  }

  // 戰鬥技能：檢查最高武器熟練度
  if (skill.category === "combat") {
    const maxProf = getMaxProficiency(user);
    if (maxProf < skill.requiredProficiency) {
      return {
        canLearn: false,
        reason: `最高武器熟練度不足（需要 ${skill.requiredProficiency}，目前 ${maxProf}）`,
      };
    }
  }

  return { canLearn: true };
}

/**
 * 檢查並自動解鎖可學習的技能
 * @param {object} user - 玩家資料
 * @returns {string[]} 新解鎖的技能 ID 列表
 */
function checkUnlockableSkills(user) {
  const learned = new Set(user.learnedSkills || []);
  const newlyUnlocked = [];

  for (const skill of skillDefs) {
    if (learned.has(skill.id)) continue;
    if (skill.category === "extra" || skill.category === "unique") continue;

    const { canLearn } = canLearnSkill(user, skill.id);
    if (canLearn) {
      newlyUnlocked.push(skill.id);
    }
  }

  return newlyUnlocked;
}

/**
 * 取得玩家所有武器類型中的最高熟練度
 * @param {object} user
 * @returns {number}
 */
function getMaxProficiency(user) {
  const profs = user.weaponProficiency || {};
  let max = 0;
  for (const val of Object.values(profs)) {
    if (val > max) max = val;
  }
  return max;
}

module.exports = {
  getSkill,
  getSkillsByWeaponType,
  getSkillsByCategory,
  getAllSkills,
  canLearnSkill,
  checkUnlockableSkills,
  getMaxProficiency,
  SKILL_MAP,
};
