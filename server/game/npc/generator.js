const seedrandom = require("seedrandom");
const config = require("../config.js");
const { SURNAMES, GIVEN_NAMES } = require("./namePool.js");

const NPC_CFG = config.NPC;
const QUALITIES = Object.keys(NPC_CFG.QUALITY_DIST); // ["見習","普通","優秀","精銳","傳說"]

/**
 * 從累積分布隨機取品質（基於 seedrandom）
 * @param {function} rng - seedrandom rng
 * @returns {string} quality
 */
function rollQuality(rng) {
  const total = Object.values(NPC_CFG.QUALITY_DIST).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const q of QUALITIES) {
    r -= NPC_CFG.QUALITY_DIST[q];
    if (r <= 0) return q;
  }
  return QUALITIES[QUALITIES.length - 1];
}

/**
 * 在 [min, max] 範圍內取隨機整數（基於 seedrandom）
 * @param {function} rng
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 用 index 確定性地生成 NPC（同一 index 永遠回傳相同結果）
 * @param {number} index - 0 ~ NPC_POOL_SIZE-1
 * @param {string} [serverSeed="lisbeth"] - 伺服器種子（未來可配置）
 * @returns {object} NPC 資料物件（不含 DB 欄位）
 */
function generateNpc(index, serverSeed = "lisbeth") {
  const rng = seedrandom(`${serverSeed}:${index}`);

  const surnameIdx = Math.floor(rng() * SURNAMES.length);
  const givenIdx = Math.floor(rng() * GIVEN_NAMES.length);
  const name = SURNAMES[surnameIdx] + " " + GIVEN_NAMES[givenIdx];

  // SAO 無職業系統，跳過一次 rng 以保持後續骰值一致
  rng();
  const quality = rollQuality(rng);

  const range = NPC_CFG.STAT_RANGE[quality];
  const baseStats = {
    hp: randInt(rng, range.hp[0], range.hp[1]),
    atk: randInt(rng, range.atk[0], range.atk[1]),
    def: randInt(rng, range.def[0], range.def[1]),
    agi: randInt(rng, range.agi[0], range.agi[1]),
  };

  return {
    npcId: `npc_${index}`,
    index,
    name,
    quality,
    baseStats,
    condition: 100, // 體力（0-100）
    level: 1,
    exp: 0,
    hireCost: NPC_CFG.HIRE_COST[quality],
    weeklyCost: NPC_CFG.WEEKLY_WAGE[quality],
  };
}

module.exports = { generateNpc };
