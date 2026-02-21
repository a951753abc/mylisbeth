const categories = require("./category.json");

// 中文名 → type ID 映射表（用於舊武器反查）
const NAME_TO_TYPE = {};
for (const cat of categories) {
  NAME_TO_TYPE[cat.name] = cat.type;
}

/**
 * 解析武器的類型 ID
 * 1. 優先使用武器自身的 type 欄位（新鍛造的武器）
 * 2. 回退到 name 反查（舊武器相容）
 * @param {object} weapon - 武器物件（至少有 name 欄位）
 * @returns {string|null} type ID，如 "one_handed_sword"
 */
function resolveWeaponType(weapon) {
  if (!weapon) return null;
  if (weapon.type) return weapon.type;
  return NAME_TO_TYPE[weapon.name] || null;
}

/**
 * 取得所有武器類型 ID 列表
 * @returns {string[]}
 */
function getAllWeaponTypes() {
  return categories.map((c) => c.type);
}

module.exports = { resolveWeaponType, getAllWeaponTypes, NAME_TO_TYPE };
