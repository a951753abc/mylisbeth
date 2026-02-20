"use strict";

const { TITLE_EFFECTS } = require("./titleEffects.js");

// 加法百分比類型（直接累加到機率，不套 1+value 公式）
const ADDITIVE_PERCENT_KEYS = new Set(["forgeCritFailExtra"]);
// 加法整數類型（直接累加到門檻）
const ADDITIVE_INT_KEYS = new Set(["forgeCritSuccessAdj"]);

/**
 * 取得乘法修正乘數（1.0 = 無修正）
 * 對加法類型的 key 返回 1.0，請改用 getRawModifier
 * @param {string|null} title
 * @param {string} key
 * @returns {number}
 */
function getModifier(title, key) {
  if (!title) return 1.0;
  const effects = TITLE_EFFECTS[title];
  if (!effects || effects[key] === undefined) return 1.0;
  if (ADDITIVE_PERCENT_KEYS.has(key) || ADDITIVE_INT_KEYS.has(key)) return 1.0;
  return 1 + effects[key];
}

/**
 * 取得原始調整值（0 = 無修正）
 * 用於加法效果（forgeCritFailExtra、forgeCritSuccessAdj）
 * @param {string|null} title
 * @param {string} key
 * @returns {number}
 */
function getRawModifier(title, key) {
  if (!title) return 0;
  const effects = TITLE_EFFECTS[title];
  if (!effects || effects[key] === undefined) return 0;
  return effects[key];
}

/**
 * 套用乘法修正並夾住最小值
 * @param {number} value
 * @param {string|null} title
 * @param {string} key
 * @param {number} [minValue=1]
 * @returns {number}
 */
function applyModifier(value, title, key, minValue = 1) {
  const mod = getModifier(title, key);
  return Math.max(minValue, Math.round(value * mod));
}

/**
 * 套用加法百分比修正並夾至 0~100
 * @param {number} baseChance - 基礎機率 (0~100)
 * @param {string|null} title
 * @param {string} key
 * @returns {number} 修正後機率 (0~100)
 */
function applyChanceModifier(baseChance, title, key) {
  if (!title) return baseChance;
  const effects = TITLE_EFFECTS[title];
  if (!effects || effects[key] === undefined) return baseChance;
  const adj = effects[key] * 100; // 0.05 → 5
  return Math.min(100, Math.max(0, baseChance + adj));
}

/**
 * 計算所有聖遺物的累計修正乘數
 * @param {Array} relics - user.bossRelics
 * @param {string} key - 效果 key（如 "bossDamage"）
 * @returns {number} 乘數（1.0 = 無修正）
 */
function getRelicModifier(relics, key) {
  if (!relics || relics.length === 0) return 1.0;
  let sum = 0;
  for (const r of relics) {
    if (r.effects && r.effects[key] !== undefined) {
      sum += r.effects[key];
    }
  }
  return 1 + sum;
}

/**
 * 取得稱號 + 聖遺物的組合修正乘數（乘法疊加）
 * @param {string|null} title
 * @param {Array} relics - user.bossRelics
 * @param {string} key
 * @returns {number}
 */
function getCombinedModifier(title, relics, key) {
  return getModifier(title, key) * getRelicModifier(relics, key);
}

module.exports = { getModifier, getRawModifier, applyModifier, applyChanceModifier, getRelicModifier, getCombinedModifier };
