const db = require("../../db.js");
const { getSkillsByCategory } = require("./skillRegistry.js");
const { getGameDaysSince } = require("../time/gameTime.js");

/**
 * 檢查並解鎖符合條件的 Extra Skill
 * 在每次冒險/戰鬥結束後調用
 * @param {string} userId
 * @param {object} user - 最新的玩家資料
 * @returns {string[]} 新解鎖的 extra skill ID 列表
 */
async function checkExtraSkills(userId, user) {
  const extraSkills = getSkillsByCategory("extra");
  const alreadyUnlocked = new Set(user.extraSkills || []);
  const newlyUnlocked = [];

  for (const skill of extraSkills) {
    if (alreadyUnlocked.has(skill.id)) continue;
    if (!skill.unlockCondition) continue;

    const cond = skill.unlockCondition;
    let met = false;

    switch (cond.type) {
      case "adventure_count": {
        const totalAdv = (user.stats?.totalAdventures || 0) + (user.stats?.totalSoloAdventures || 0);
        met = totalAdv >= cond.value;
        break;
      }
      case "survive_days": {
        if (user.gameCreatedAt) {
          const days = getGameDaysSince(user.gameCreatedAt);
          met = days >= cond.value;
        }
        break;
      }
      case "katana_proficiency": {
        const katanaProf = (user.weaponProficiency || {}).katana || 0;
        met = katanaProf >= cond.value;
        break;
      }
    }

    if (met) {
      newlyUnlocked.push(skill.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.update(
      "user",
      { userId },
      { $addToSet: { extraSkills: { $each: newlyUnlocked } } },
    );
  }

  return newlyUnlocked;
}

module.exports = { checkExtraSkills };
