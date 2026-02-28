"use strict";

const config = require("../config.js");
const categories = require("./category.json");

/**
 * 武器類型基底比例（用於合成後加權分配）
 * DEF/HP 設下限 0.5 避免歸零
 */
const TYPE_WEIGHTS = Object.fromEntries(
  categories.map((cat) => [
    cat.type,
    {
      atk: Math.max(0.5, cat.atk),
      def: Math.max(0.5, cat.def),
      agi: Math.max(0.5, cat.agi),
      hp: 0.5,
    },
  ]),
);

/**
 * 依權重將素質池分配到各屬性
 * @param {number} pool - 總素質點數
 * @param {object} weights - { atk, def, agi, hp } 權重
 * @returns {{ atk: number, def: number, agi: number, hp: number }}
 */
function distributeStats(pool, weights) {
  const totalWeight = weights.atk + weights.def + weights.agi + weights.hp;
  const result = { atk: 0, def: 0, agi: 0, hp: 0 };

  // 先依比例分配整數部分
  let remaining = pool;
  const shares = {};
  for (const stat of ["atk", "def", "agi", "hp"]) {
    const exact = (pool * weights[stat]) / totalWeight;
    shares[stat] = { floor: Math.floor(exact), frac: exact - Math.floor(exact) };
    result[stat] = shares[stat].floor;
    remaining -= shares[stat].floor;
  }

  // 餘數依小數部分大小分配
  const sorted = Object.entries(shares)
    .sort((a, b) => b[1].frac - a[1].frac);
  for (let i = 0; i < remaining; i++) {
    result[sorted[i][0]] += 1;
  }

  return result;
}

/**
 * 合成兩把武器
 * @param {object} weapon1 - 第一把武器
 * @param {object} weapon2 - 第二把武器
 * @param {string} targetType - 目標武器類型（必須是 weapon1 或 weapon2 的 type）
 * @returns {{ weapon: object, pool: number, retention: number }}
 */
function synthesizeWeapons(weapon1, weapon2, targetType) {
  const syn = config.SYNTHESIS;

  // 合成世代
  const gen1 = weapon1.fusionGen || 0;
  const gen2 = weapon2.fusionGen || 0;
  const newGen = Math.max(gen1, gen2) + 1;

  // 保留率（依世代衰減）
  const retention = Math.max(
    syn.MIN_RETENTION,
    syn.BASE_RETENTION - Math.max(gen1, gen2) * syn.RETENTION_DECAY,
  );

  // HP 折算後建立素質池
  const hp1 = Math.round((weapon1.hp || 0) / syn.HP_DIVISOR);
  const hp2 = Math.round((weapon2.hp || 0) / syn.HP_DIVISOR);

  const rawPool =
    (weapon1.atk || 0) + (weapon2.atk || 0) +
    (weapon1.def || 0) + (weapon2.def || 0) +
    (weapon1.agi || 0) + (weapon2.agi || 0) +
    hp1 + hp2;

  const pool = Math.max(1, Math.round(rawPool * retention));

  // 依目標武器類型的基底比例分配
  const weights = TYPE_WEIGHTS[targetType] || TYPE_WEIGHTS.one_handed_sword;
  const stats = distributeStats(pool, weights);

  // HP 還原（×HP_DIVISOR）
  stats.hp = stats.hp * syn.HP_DIVISOR;

  // CRI：取較好值 + 懲罰
  const cri = Math.max(
    syn.MIN_CRI,
    Math.min(weapon1.cri || 10, weapon2.cri || 10) + syn.CRI_PENALTY,
  );

  // 耐久：取平均
  const dur1 = weapon1.durability || 1;
  const dur2 = weapon2.durability || 1;
  const durability = Math.max(1, Math.round((dur1 + dur2) / 2));

  // 先天效果：從兩把武器中隨機保留 0~1 個
  const allEffects = [
    ...(weapon1.innateEffects || []),
    ...(weapon2.innateEffects || []),
  ];
  const keptEffects = [];
  if (allEffects.length > 0 && Math.random() < 0.5) {
    const idx = Math.floor(Math.random() * allEffects.length);
    keptEffects.push(allEffects[idx]);
  }

  // 查找目標武器類型名稱
  const targetCat = categories.find((c) => c.type === targetType);
  const typeName = targetCat ? targetCat.name : "未知武器";

  const newWeapon = {
    name: typeName,
    type: targetType,
    weaponName: null,
    atk: stats.atk,
    def: stats.def,
    agi: stats.agi,
    cri,
    hp: stats.hp,
    durability,
    maxDurability: durability,
    buff: 0,
    renameCount: 0,
    recipeMatched: false,
    recipeKey: null,
    innateEffects: keptEffects,
    fusionGen: newGen,
  };

  return { weapon: newWeapon, pool, retention };
}

module.exports = { synthesizeWeapons, distributeStats, TYPE_WEIGHTS };
