const { TEMPLATES, CHAIN_TEMPLATES } = require("./templates.js");

/**
 * 從戰鬥 log 中提取最大單次傷害值
 */
function extractMaxDamage(log) {
  let max = 0;
  for (const entry of log) {
    if (entry.damage && entry.damage > max) {
      max = entry.damage;
    }
  }
  return max;
}

/**
 * 計算實際回合數
 */
function countRounds(log) {
  return log.filter((e) => e.type === "round").length;
}

/**
 * 隨機從陣列中取一個元素
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 填入模板變數
 */
function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : `{${key}}`;
  });
}

/**
 * 從 skillEvents 提取劍技摘要資訊
 * @param {object[]} skillEvents
 * @returns {object|null}
 */
function extractSkillSummary(skillEvents) {
  if (!skillEvents || skillEvents.length === 0) return null;

  // 只考慮造成傷害的劍技事件（避免 buff/heal 技能產生「0 點傷害」敘事）
  const damagingEvents = skillEvents.filter((e) => e.damage > 0);
  if (damagingEvents.length === 0) return null;

  let bestEvent = damagingEvents[0];
  let chainMax = 0;

  for (const evt of skillEvents) {
    if (evt.damage > bestEvent.damage) {
      bestEvent = evt;
    }
    if (evt.chainCount > chainMax) {
      chainMax = evt.chainCount;
    }
  }

  return {
    skillName: bestEvent.skillName,
    skillNameJp: bestEvent.nameJp || bestEvent.skillName,
    skillDamage: bestEvent.damage,
    skillCount: damagingEvents.length,
    chainMax,
  };
}

/**
 * 根據戰鬥結果生成敘事文字
 * @param {Object} battleResult - 戰鬥結果 (win/dead/draw, category, enemyName, npcName, log, skillEvents)
 * @param {Object} context - 額外情境 { weaponName, smithName, place, floor, floorName }
 * @returns {string} 敘事文字
 */
function generateNarrative(battleResult, context) {
  const { win, dead, category, enemyName, npcName, log, skillEvents } = battleResult;
  const { weaponName, smithName, place, floor, floorName } = context;

  // 決定結果鍵
  let outcomeKey;
  if (win === 1) {
    outcomeKey = "win";
  } else if (dead === 1) {
    outcomeKey = "lose";
  } else {
    outcomeKey = "draw";
  }

  // 正規化難度類別
  const categoryKey = category || "[Normal]";
  const rounds = countRounds(log);
  const maxDamage = extractMaxDamage(log);

  // 提取劍技摘要
  const skillSummary = extractSkillSummary(skillEvents);

  // 模板變數
  const vars = {
    npc: npcName,
    enemy: enemyName,
    weapon: weaponName,
    smith: smithName,
    place,
    floor,
    floorName,
    rounds,
    maxDamage,
  };

  // 若有劍技事件，加入劍技變數
  if (skillSummary) {
    vars.skillName = skillSummary.skillName;
    vars.skillNameJp = skillSummary.skillNameJp;
    vars.skillDamage = skillSummary.skillDamage;
    vars.skillCount = skillSummary.skillCount;
    vars.chainMax = skillSummary.chainMax;
  }

  // 選取模板集：有劍技時優先使用劍技版，否則使用普通版
  let narrative = "";

  if (skillSummary) {
    const skillOutcomeKey = "skill" + outcomeKey.charAt(0).toUpperCase() + outcomeKey.slice(1);
    const skillTemplates = TEMPLATES[skillOutcomeKey];

    if (skillTemplates) {
      const categoryTemplates =
        skillTemplates[categoryKey] ||
        skillTemplates["[Normal]"] ||
        skillTemplates["[Easy]"] ||
        [];

      if (categoryTemplates.length > 0) {
        narrative = fillTemplate(pick(categoryTemplates), vars);
      }
    }
  }

  // fallback 至普通模板
  if (!narrative) {
    const outcomeTemplates = TEMPLATES[outcomeKey] || TEMPLATES.draw;
    const categoryTemplates =
      outcomeTemplates[categoryKey] ||
      outcomeTemplates["[Normal]"] ||
      outcomeTemplates["[Easy]"] ||
      [];

    if (categoryTemplates.length === 0) {
      return `${npcName} 在 ${place} 與 ${enemyName} 展開了激烈的戰鬥。`;
    }

    narrative = fillTemplate(pick(categoryTemplates), vars);
  }

  // Skill Connect 連鎖追加敘事
  if (skillSummary && skillSummary.chainMax > 0 && CHAIN_TEMPLATES[outcomeKey]) {
    const chainTemplate = pick(CHAIN_TEMPLATES[outcomeKey]);
    narrative += "\n" + fillTemplate(chainTemplate, vars);
  }

  return narrative;
}

module.exports = { generateNarrative };
