/**
 * 鍛造素材組合加成系統
 *
 * 特定素材組合在鍛造時提供額外屬性加成。
 */
const config = require("../config.js");

const STAT_POOL = ["atk", "def", "agi", "hp"];
const WEAPON_PER = ["hp", "atk", "def", "agi", "durability"];

// 素材 itemId → 主屬性（與 weapon.js 同步）
const FLOOR_ITEM_STATS = {
  mat_floor1_ore: "atk", mat_floor1_crystal: "def",
  mat_floor3_ore: "agi", mat_floor3_crystal: "hp",
  mat_floor5_ore: "atk", mat_floor5_crystal: "cri",
  mat_floor7_ore: "def", mat_floor7_crystal: "hp",
  mat_floor9_ore: "atk", mat_floor9_crystal: "agi",
};

function getStatFromItemId(itemId) {
  const idx = parseInt(itemId, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= WEAPON_PER.length) {
    return WEAPON_PER[idx - 1];
  }
  return FLOOR_ITEM_STATS[itemId] || "atk";
}

/** 從 itemId 解析樓層編號（mat_floor{N}_xxx → N），無法解析回傳 null */
function parseFloorNumber(itemId) {
  const m = String(itemId).match(/^mat_floor(\d+)_/);
  return m ? parseInt(m[1], 10) : null;
}

/** 從 itemId 解析素材子類型（ore / crystal），無法解析回傳 null */
function parseMaterialType(itemId) {
  const m = String(itemId).match(/^mat_floor\d+_(ore|crystal)$/);
  return m ? m[1] : null;
}

/**
 * 檢查所有素材組合加成
 * @param {Array<{ itemId: string, itemLevel: number, itemName: string }>} materials
 * @returns {{ bonuses: Array<{ name: string, stat?: string, value: number }>, text: string }}
 */
function checkForgeBonuses(materials) {
  const bonuses = [];
  const cfg = config.FORGE_COMBO || {};

  // 1. 同層套裝：同樓層的 ore + crystal
  const floorSet = checkFloorSet(materials);
  if (floorSet) {
    const baseAtk = cfg.FLOOR_SET?.BASE_ATK ?? 1;
    const baseDef = cfg.FLOOR_SET?.BASE_DEF ?? 1;
    bonuses.push({ name: "同層套裝", stat: "atk", value: baseAtk });
    bonuses.push({ name: "同層套裝", stat: "def", value: baseDef });
    bonuses.push({ name: "同層套裝", stat: "durability", value: 2 });
  }

  // 2. 同素材集中：2+ 個相同 itemId + itemLevel
  const identicalBonuses = checkIdentical(materials, cfg);
  bonuses.push(...identicalBonuses);

  // 3. 跨層共鳴：素材來自相差 4+ 層的樓層
  if (checkCrossFloor(materials, cfg)) {
    const randomStat = STAT_POOL[Math.floor(Math.random() * STAT_POOL.length)];
    const bonus = cfg.CROSS_FLOOR?.BONUS ?? 1;
    bonuses.push({ name: "跨層共鳴", stat: randomStat, value: bonus });
  }

  // 4. 星級調和：所有素材同星級
  const starBonus = checkStarHarmony(materials, cfg);
  if (starBonus > 0) {
    const randomStat = STAT_POOL[Math.floor(Math.random() * STAT_POOL.length)];
    bonuses.push({ name: "星級調和", stat: randomStat, value: starBonus });
  }

  // 組合文字
  const text = bonuses.length > 0
    ? bonuses.map((b) => `【${b.name}】${b.stat} +${b.value}`).join("、")
    : "";

  return { bonuses, text };
}

/** 同層套裝：同樓層包含 ore 和 crystal */
function checkFloorSet(materials) {
  const floorTypes = {};
  for (const mat of materials) {
    const floor = parseFloorNumber(mat.itemId);
    const type = parseMaterialType(mat.itemId);
    if (floor != null && type) {
      if (!floorTypes[floor]) floorTypes[floor] = new Set();
      floorTypes[floor].add(type);
    }
  }
  for (const types of Object.values(floorTypes)) {
    if (types.has("ore") && types.has("crystal")) return true;
  }
  return false;
}

/** 同素材集中：相同 itemId+itemLevel 出現 2+ 次，每多 1 個 +1 該屬性 */
function checkIdentical(materials, cfg) {
  const bonusPerExtra = cfg.IDENTICAL?.BONUS_PER_EXTRA ?? 1;
  const counts = {};
  for (const mat of materials) {
    const key = `${mat.itemId}:${mat.itemLevel}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const bonuses = [];
  for (const [key, count] of Object.entries(counts)) {
    if (count < 2) continue;
    const extra = count - 1;
    const itemId = key.split(":")[0];
    const stat = getStatFromItemId(itemId);
    bonuses.push({ name: "同素材集中", stat, value: extra * bonusPerExtra });
  }
  return bonuses;
}

/** 跨層共鳴：素材來自相差 N+ 層的樓層 */
function checkCrossFloor(materials, cfg) {
  const minGap = cfg.CROSS_FLOOR?.MIN_FLOOR_GAP ?? 4;
  const floors = [];
  for (const mat of materials) {
    const f = parseFloorNumber(mat.itemId);
    if (f != null) floors.push(f);
  }
  if (floors.length < 2) return false;
  const minFloor = Math.min(...floors);
  const maxFloor = Math.max(...floors);
  return (maxFloor - minFloor) >= minGap;
}

/** 星級調和：所有素材同星級 */
function checkStarHarmony(materials, cfg) {
  if (materials.length < 2) return 0;
  const level = materials[0].itemLevel;
  if (!materials.every((m) => m.itemLevel === level)) return 0;
  if (level >= 3) return cfg.STAR_HARMONY?.STAR_3 ?? 2;
  if (level >= 2) return cfg.STAR_HARMONY?.STAR_2 ?? 1;
  return 0;
}

module.exports = { checkForgeBonuses, parseFloorNumber, parseMaterialType };
