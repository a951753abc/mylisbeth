/**
 * 武器類型親和力 — 素材屬性偏向影響武器類型出現機率
 *
 * 每個武器類型對每種 stat 有一個權重倍率。
 * 投入的素材 stat 越偏向某武器，該武器出現的機率越高。
 */

const TYPE_STAT_AFFINITY = {
  one_handed_sword: { atk: 1.5, def: 1.0, agi: 1.0, hp: 0.8, cri: 1.0, durability: 1.0 },
  two_handed_sword: { atk: 2.0, def: 0.5, agi: 0.3, hp: 1.0, cri: 0.8, durability: 1.0 },
  two_handed_axe:   { atk: 2.0, def: 0.5, agi: 0.3, hp: 1.2, cri: 0.6, durability: 1.0 },
  mace:             { atk: 1.2, def: 0.8, agi: 1.0, hp: 1.0, cri: 1.5, durability: 1.0 },
  katana:           { atk: 1.2, def: 0.3, agi: 1.5, hp: 0.5, cri: 1.5, durability: 1.0 },
  curved_sword:     { atk: 1.5, def: 0.5, agi: 0.8, hp: 0.8, cri: 1.5, durability: 1.0 },
  rapier:           { atk: 0.8, def: 0.5, agi: 2.0, hp: 0.5, cri: 1.5, durability: 1.0 },
  dagger:           { atk: 0.5, def: 0.3, agi: 2.5, hp: 0.3, cri: 1.0, durability: 1.0 },
  spear:            { atk: 1.5, def: 1.0, agi: 0.5, hp: 1.0, cri: 0.8, durability: 1.0 },
  bow:              { atk: 1.8, def: 0.3, agi: 0.8, hp: 0.5, cri: 1.0, durability: 1.0 },
  shield:           { atk: 0.3, def: 2.5, agi: 0.3, hp: 2.0, cri: 0.3, durability: 1.0 },
};

/**
 * 計算每個武器類型的加權值
 * @param {string[]} materialStats - 各素材的主要 stat（如 ["atk", "def"]）
 * @returns {Array<{ type: string, weight: number }>}
 */
function calcWeaponTypeWeights(materialStats) {
  const types = Object.keys(TYPE_STAT_AFFINITY);
  return types.map((type) => {
    const affinities = TYPE_STAT_AFFINITY[type];
    let weight = 1.0;
    for (const stat of materialStats) {
      weight *= (affinities[stat] || 1.0);
    }
    return { type, weight };
  });
}

/**
 * 加權隨機選取武器類型
 * @param {Array<{ type: string, weight: number }>} weights
 * @returns {string} 武器類型 key
 */
function selectWeaponType(weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const w of weights) {
    rand -= w.weight;
    if (rand <= 0) return w.type;
  }
  return weights[weights.length - 1].type;
}

module.exports = { TYPE_STAT_AFFINITY, calcWeaponTypeWeights, selectWeaponType };
