const TEMPLATES = require("./templates.js");

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
 * 根據戰鬥結果生成敘事文字
 * @param {Object} battleResult - 戰鬥結果 (win/dead/draw, category, enemyName, npcName, log)
 * @param {Object} context - 額外情境 { weaponName, smithName, place, floor, floorName }
 * @returns {string} 敘事文字
 */
function generateNarrative(battleResult, context) {
  const { win, dead, category, enemyName, npcName, log } = battleResult;
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

  // 正規化難度類別（處理 [優樹] 等特殊類別）
  const categoryKey = category || "[Normal]";
  const rounds = countRounds(log);
  const maxDamage = extractMaxDamage(log);

  // 取得對應模板列表，找不到難度就 fallback 至 [Normal]
  const outcomeTemplates = TEMPLATES[outcomeKey] || TEMPLATES.draw;
  const categoryTemplates =
    outcomeTemplates[categoryKey] ||
    outcomeTemplates["[Normal]"] ||
    outcomeTemplates["[Easy]"] ||
    [];

  if (categoryTemplates.length === 0) {
    return `${npcName} 在 ${place} 與 ${enemyName} 展開了激烈的戰鬥。`;
  }

  const template = pick(categoryTemplates);

  return fillTemplate(template, {
    npc: npcName,
    enemy: enemyName,
    weapon: weaponName,
    smith: smithName,
    place,
    floor,
    floorName,
    rounds,
    maxDamage,
  });
}

module.exports = { generateNarrative };
