const config = require("../config.js");

const INNATE_COMBAT = config.WEAPON_INNATE?.COMBAT || {};
const COUNTER_RATE = INNATE_COMBAT.COUNTER_DAMAGE_RATE || 0.3;

/**
 * 將 weapon.innateEffects[] 解析為扁平的戰鬥 context
 * @param {object[]} innateEffects
 * @returns {object}
 */
function buildInnateContext(innateEffects) {
  const ctx = {
    damageMult: 1.0,
    atkBoost: 0,
    defBoost: 0,
    agiBoost: 0,
    criBoost: 0,
    lifesteal: 0,
    ignoreDef: 0,
    evasionBoost: 0,
    stunChance: 0,
    counterChance: 0,
    initiative: false,
    damageReduction: 0,
  };
  if (!innateEffects || innateEffects.length === 0) return ctx;
  for (const ie of innateEffects) {
    if (!ie.effect) continue;
    const { type, value } = ie.effect;
    switch (type) {
      case "damage_mult": ctx.damageMult *= value; break;
      case "atk_boost": ctx.atkBoost += value; break;
      case "def_boost": ctx.defBoost += value; break;
      case "agi_boost": ctx.agiBoost += value; break;
      case "cri_boost": ctx.criBoost += value; break;
      case "lifesteal": ctx.lifesteal += value; break;
      case "ignore_def": ctx.ignoreDef += value; break;
      case "evasion_boost": ctx.evasionBoost += value; break;
      case "stun": ctx.stunChance = Math.max(ctx.stunChance, value); break;
      case "counter": ctx.counterChance = Math.max(ctx.counterChance, value); break;
      case "initiative": ctx.initiative = true; break;
      case "damage_reduction": ctx.damageReduction += value; break;
    }
  }
  return ctx;
}

/**
 * 戰前套用被動屬性加成（atk/def/agi/cri_boost）
 * @param {object} fighter - { stats: { atk, def, agi, cri } }
 * @param {object} ctx - buildInnateContext 結果
 */
function applyInnatePassives(fighter, ctx) {
  fighter.stats = { ...fighter.stats };
  fighter.stats.atk += ctx.atkBoost;
  fighter.stats.def += ctx.defBoost;
  fighter.stats.agi += ctx.agiBoost;
  if (ctx.criBoost > 0) {
    fighter.stats.cri = Math.max(5, fighter.stats.cri - ctx.criBoost);
  }
}

module.exports = { buildInnateContext, applyInnatePassives, COUNTER_RATE };
