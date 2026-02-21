const roll = require("../roll.js");
const config = require("../config.js");

const INNATE_CFG = config.WEAPON_INNATE;

/**
 * 每個武器類型的固有效果候選池
 * 每個效果有 name, effect: { type, value }, weight
 */
const INNATE_POOLS = {
  one_handed_sword: [
    { id: "sharp_edge", name: "鋭利", effect: { type: "damage_mult", value: 1.1 }, weight: 30 },
    { id: "swift", name: "迅速", effect: { type: "agi_boost", value: 1 }, weight: 25 },
    { id: "guardian", name: "守護", effect: { type: "def_boost", value: 1 }, weight: 25 },
    { id: "soul_drain", name: "魂吸", effect: { type: "lifesteal", value: 0.1 }, weight: 20 },
  ],
  two_handed_sword: [
    { id: "heavy_blade", name: "重刃", effect: { type: "damage_mult", value: 1.15 }, weight: 30 },
    { id: "crushing", name: "碎裂", effect: { type: "ignore_def", value: 0.1 }, weight: 25 },
    { id: "fortitude", name: "堅韌", effect: { type: "def_boost", value: 2 }, weight: 25 },
    { id: "tremor", name: "震盪", effect: { type: "stun", value: 10 }, weight: 20 },
  ],
  two_handed_axe: [
    { id: "brutal", name: "殘暴", effect: { type: "damage_mult", value: 1.2 }, weight: 30 },
    { id: "armor_break", name: "破甲", effect: { type: "ignore_def", value: 0.15 }, weight: 25 },
    { id: "berserker", name: "狂暴", effect: { type: "atk_boost", value: 1 }, weight: 25 },
    { id: "intimidate", name: "威嚇", effect: { type: "stun", value: 15 }, weight: 20 },
  ],
  mace: [
    { id: "concussion", name: "震擊", effect: { type: "stun", value: 15 }, weight: 30 },
    { id: "armor_break", name: "破甲", effect: { type: "ignore_def", value: 0.15 }, weight: 25 },
    { id: "steady", name: "穩固", effect: { type: "def_boost", value: 1 }, weight: 25 },
    { id: "heavy_blow", name: "猛力", effect: { type: "damage_mult", value: 1.1 }, weight: 20 },
  ],
  katana: [
    { id: "razor", name: "剃刀", effect: { type: "cri_boost", value: 1 }, weight: 30 },
    { id: "swift_draw", name: "速拔", effect: { type: "agi_boost", value: 1 }, weight: 25 },
    { id: "bleeding", name: "出血", effect: { type: "damage_mult", value: 1.1 }, weight: 25 },
    { id: "soul_drain", name: "魂吸", effect: { type: "lifesteal", value: 0.08 }, weight: 20 },
  ],
  curved_sword: [
    { id: "sweep", name: "橫掃", effect: { type: "damage_mult", value: 1.1 }, weight: 30 },
    { id: "life_drink", name: "飲血", effect: { type: "lifesteal", value: 0.12 }, weight: 25 },
    { id: "agile", name: "靈巧", effect: { type: "agi_boost", value: 1 }, weight: 25 },
    { id: "crescent", name: "弧月", effect: { type: "ignore_def", value: 0.1 }, weight: 20 },
  ],
  rapier: [
    { id: "precision", name: "精準", effect: { type: "cri_boost", value: 1 }, weight: 30 },
    { id: "swift", name: "迅速", effect: { type: "agi_boost", value: 2 }, weight: 25 },
    { id: "penetrate", name: "穿透", effect: { type: "ignore_def", value: 0.15 }, weight: 25 },
    { id: "sharp_point", name: "銳鋒", effect: { type: "damage_mult", value: 1.1 }, weight: 20 },
  ],
  dagger: [
    { id: "venom", name: "毒塗", effect: { type: "damage_mult", value: 1.1 }, weight: 25 },
    { id: "shadow", name: "暗影", effect: { type: "evasion_boost", value: 2 }, weight: 25 },
    { id: "swift", name: "迅速", effect: { type: "agi_boost", value: 2 }, weight: 25 },
    { id: "backstab", name: "背刺", effect: { type: "cri_boost", value: 1 }, weight: 25 },
  ],
  spear: [
    { id: "long_reach", name: "長距", effect: { type: "initiative", value: true }, weight: 25 },
    { id: "penetrate", name: "穿透", effect: { type: "ignore_def", value: 0.1 }, weight: 25 },
    { id: "sturdy", name: "堅固", effect: { type: "def_boost", value: 1 }, weight: 25 },
    { id: "sharp_tip", name: "銳鋒", effect: { type: "damage_mult", value: 1.1 }, weight: 25 },
  ],
  bow: [
    { id: "far_sight", name: "遠視", effect: { type: "cri_boost", value: 1 }, weight: 30 },
    { id: "rapid_fire", name: "速射", effect: { type: "agi_boost", value: 1 }, weight: 25 },
    { id: "armor_pierce", name: "穿甲", effect: { type: "ignore_def", value: 0.1 }, weight: 25 },
    { id: "power_draw", name: "強弓", effect: { type: "damage_mult", value: 1.1 }, weight: 20 },
  ],
  shield: [
    { id: "iron_wall", name: "鐵壁", effect: { type: "def_boost", value: 2 }, weight: 30 },
    { id: "reflect", name: "反射", effect: { type: "counter", value: 15 }, weight: 25 },
    { id: "barrier", name: "結界", effect: { type: "damage_reduction", value: 0.05 }, weight: 25 },
    { id: "bash", name: "擊退", effect: { type: "stun", value: 10 }, weight: 20 },
  ],
};

/**
 * 加權隨機選取
 * @param {object[]} pool
 * @returns {object}
 */
function weightedRandom(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of pool) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return pool[pool.length - 1];
}

/**
 * 嘗試為新鍛造的武器賦予固有效果
 * @param {object} weapon - 鍛造出的武器（會被加入 innateEffects 欄位）
 * @param {string} weaponType - 武器類型 ID
 * @param {number} forgeLevel - 鍛造等級
 * @returns {object[]} 賦予的固有效果列表
 */
function rollInnateEffects(weapon, weaponType, forgeLevel, options = {}) {
  const innateChanceBonus = options.innateChanceBonus || 0;
  const chance = INNATE_CFG.BASE_CHANCE + forgeLevel * INNATE_CFG.FORGE_LEVEL_MULT + innateChanceBonus;
  const effects = [];

  if (!roll.d100Check(chance)) {
    weapon.innateEffects = [];
    return effects;
  }

  const pool = INNATE_POOLS[weaponType];
  if (!pool || pool.length === 0) {
    weapon.innateEffects = [];
    return effects;
  }

  // 第一個固有效果
  const first = weightedRandom(pool);
  effects.push({ id: first.id, name: first.name, effect: first.effect });

  // 第二個固有效果（機率較低）
  if (INNATE_CFG.MAX_EFFECTS >= 2 && roll.d100Check(Math.floor(chance / 2))) {
    const remaining = pool.filter((p) => p.id !== first.id);
    if (remaining.length > 0) {
      const second = weightedRandom(remaining);
      effects.push({ id: second.id, name: second.name, effect: second.effect });
    }
  }

  weapon.innateEffects = effects;
  return effects;
}

module.exports = { rollInnateEffects, INNATE_POOLS };
