const roll = require("../roll.js");
const config = require("../config.js");
const { getSkill } = require("./skillRegistry.js");
const modDefs = require("./modDefs.json");

const MOD_MAP = {};
for (const mod of modDefs) {
  MOD_MAP[mod.id] = mod;
}

/**
 * 解析技能效果為扁平結構（含 Mod 加成）
 * @param {object} skill - 技能定義
 * @param {string[]} mods - 已安裝的 Mod ID 列表
 * @returns {object}
 */
function parseSkillEffects(skill, mods = []) {
  const result = {
    damageMult: 1.0,
    hitCount: 1,
    guaranteedCrit: false,
    ignoreDef: 0,
    initiative: false,
    lifesteal: 0,
    stunChance: 0,
    atkBoost: 0,
    defBoost: 0,
    agiBoost: 0,
    criBoost: 0,
    evasionBoost: 0,
    damageReduction: 0,
    healPerRound: 0,
    counter: 0,
    shieldHp: 0,
    katanaTriggerBonus: 0,
    katanaDamageBonus: 0,
    rareEncounterBonus: 0,
  };

  for (const eff of skill.effects) {
    switch (eff.type) {
      case "damage_mult": result.damageMult = eff.value; break;
      case "multi_hit": result.hitCount = eff.value; break;
      case "guaranteed_crit": result.guaranteedCrit = !!eff.value; break;
      case "ignore_def": result.ignoreDef = eff.value; break;
      case "initiative": result.initiative = !!eff.value; break;
      case "lifesteal": result.lifesteal = eff.value; break;
      case "stun": result.stunChance = eff.value; break;
      case "atk_boost": result.atkBoost = eff.value; break;
      case "def_boost": result.defBoost = eff.value; break;
      case "agi_boost": result.agiBoost = eff.value; break;
      case "cri_boost": result.criBoost = eff.value; break;
      case "evasion_boost": result.evasionBoost = eff.value; break;
      case "damage_reduction": result.damageReduction = eff.value; break;
      case "heal_per_round": result.healPerRound = eff.value; break;
      case "counter": result.counter = eff.value; break;
      case "shield_hp": result.shieldHp = eff.value; break;
      case "katana_trigger_bonus": result.katanaTriggerBonus = eff.value; break;
      case "katana_damage_bonus": result.katanaDamageBonus = eff.value; break;
      case "rare_encounter_bonus": result.rareEncounterBonus = eff.value; break;
    }
  }

  // 套用 Mod 加成
  for (const modId of mods) {
    const mod = MOD_MAP[modId];
    if (!mod) continue;
    switch (mod.effect.type) {
      case "damage_mult_bonus": result.damageMult += mod.effect.value; break;
      case "extra_hit": result.hitCount += mod.effect.value; break;
      case "cri_bonus": result.criBoost += mod.effect.value; break;
      case "lifesteal_bonus": result.lifesteal += mod.effect.value; break;
      // trigger_chance_bonus 和 delay_reduction 在觸發判定時處理
    }
  }

  return result;
}

/**
 * 取得技能觸發的有效機率（含 Mod、刀術極意等加成）
 * @param {object} skill
 * @param {string[]} mods
 * @param {object} skillCtx - { katanaMasteryActive }
 * @returns {number} 0-100
 */
function getEffectiveTriggerChance(skill, mods = [], skillCtx = {}) {
  if (skill.triggerType !== "probability") return 0;

  let chance = skill.triggerChance || 0;

  // Mod: speed_boost
  for (const modId of mods) {
    const mod = MOD_MAP[modId];
    if (mod && mod.effect.type === "trigger_chance_bonus") {
      chance += mod.effect.value;
    }
  }

  // 刀術極意加成
  if (skillCtx.katanaMasteryActive && skill.weaponType === "katana") {
    chance += skillCtx.katanaTriggerBonus || 0;
  }

  return Math.min(95, Math.max(1, chance));
}

/**
 * 取得技能有效後搖值（含 Mod）
 * @param {object} skill
 * @param {string[]} mods
 * @returns {number}
 */
function getEffectiveDelay(skill, mods = []) {
  let delay = skill.postMotionDelay || 0;

  for (const modId of mods) {
    const mod = MOD_MAP[modId];
    if (mod && mod.effect.type === "delay_reduction") {
      delay -= mod.effect.value;
    }
  }

  return Math.max(0, delay);
}

/**
 * 構建技能上下文（戰鬥開始前調用）
 * @param {object[]} effectiveSkills - [{ skill, mods }]
 * @param {object} proficiency - weaponProficiency 或單一值
 * @param {string} weaponType
 * @returns {object} skillCtx
 */
function buildSkillContext(effectiveSkills, proficiency, weaponType) {
  const ctx = {
    skills: effectiveSkills,
    weaponType,
    proficiency: typeof proficiency === "number" ? proficiency : (proficiency || {})[weaponType] || 0,
    passives: [],
    conditionals: [],
    probabilities: [],
    katanaMasteryActive: false,
    katanaTriggerBonus: 0,
    katanaDamageBonus: 0,
    // 戰鬥狀態
    activeBoosts: { atk: 0, def: 0, agi: 0, cri: 0, evasion: 0, damageReduction: 0 },
    shieldHp: 0,
    healPerRound: 0,
    counterChance: 0,
    conditionalActivated: new Set(),
  };

  for (const entry of effectiveSkills) {
    const { skill, mods } = entry;
    if (skill.triggerType === "passive") {
      ctx.passives.push(entry);
    } else if (skill.triggerType === "conditional") {
      ctx.conditionals.push(entry);
    } else if (skill.triggerType === "probability") {
      ctx.probabilities.push(entry);
    }

    // 檢查刀術極意
    if (skill.id === "katana_mastery") {
      ctx.katanaMasteryActive = true;
      const effects = parseSkillEffects(skill, mods);
      ctx.katanaTriggerBonus = effects.katanaTriggerBonus;
      ctx.katanaDamageBonus = effects.katanaDamageBonus;
    }
  }

  return ctx;
}

/**
 * 套用被動技能（戰鬥開始前）
 * @param {object} fighter - { hp, maxHp, stats }
 * @param {object} skillCtx
 */
function applyPassiveSkills(fighter, skillCtx) {
  for (const { skill, mods } of skillCtx.passives) {
    const effects = parseSkillEffects(skill, mods);
    skillCtx.activeBoosts.atk += effects.atkBoost;
    skillCtx.activeBoosts.def += effects.defBoost;
    skillCtx.activeBoosts.agi += effects.agiBoost;
    skillCtx.activeBoosts.cri += effects.criBoost;
    skillCtx.activeBoosts.evasion += effects.evasionBoost;
    skillCtx.activeBoosts.damageReduction += effects.damageReduction;
    skillCtx.shieldHp += effects.shieldHp;
    skillCtx.healPerRound += effects.healPerRound;
    skillCtx.counterChance = Math.max(skillCtx.counterChance, effects.counter);
  }

  // 套用 boost 到 fighter
  fighter.stats = { ...fighter.stats };
  fighter.stats.atk += skillCtx.activeBoosts.atk;
  fighter.stats.def += skillCtx.activeBoosts.def;
  fighter.stats.agi += skillCtx.activeBoosts.agi;
  if (skillCtx.activeBoosts.cri > 0) {
    fighter.stats.cri = Math.max(5, fighter.stats.cri - skillCtx.activeBoosts.cri);
  }
  if (skillCtx.shieldHp > 0) {
    fighter.hp += skillCtx.shieldHp;
  }
}

/**
 * 檢查條件觸發技能（每回合開始時調用）
 * @param {object} fighter
 * @param {object} skillCtx
 */
function checkConditionalSkills(fighter, skillCtx) {
  const maxHp = fighter.maxHp || fighter.hp;
  const hpRatio = fighter.hp / maxHp;

  for (const { skill, mods } of skillCtx.conditionals) {
    if (skillCtx.conditionalActivated.has(skill.id)) continue;

    let triggered = false;
    switch (skill.triggerCondition) {
      case "hp_below_50": triggered = hpRatio < 0.5; break;
      case "hp_below_30": triggered = hpRatio < 0.3; break;
      case "hp_below_10": triggered = hpRatio < 0.1; break;
    }

    if (triggered) {
      skillCtx.conditionalActivated.add(skill.id);
      const effects = parseSkillEffects(skill, mods);

      // 套用 boost
      fighter.stats = { ...fighter.stats };
      fighter.stats.atk += effects.atkBoost;
      fighter.stats.def += effects.defBoost;
      fighter.stats.agi += effects.agiBoost;
      if (effects.criBoost > 0) {
        fighter.stats.cri = Math.max(5, fighter.stats.cri - effects.criBoost);
      }
      if (effects.shieldHp > 0) {
        fighter.hp += effects.shieldHp;
      }
      skillCtx.activeBoosts.damageReduction += effects.damageReduction;
      skillCtx.counterChance = Math.max(skillCtx.counterChance, effects.counter);
      skillCtx.healPerRound += effects.healPerRound;

      // last_stand 的 damage_mult 和 guaranteed_crit 只在觸發後的攻擊生效
      if (effects.damageMult > 1.0 || effects.guaranteedCrit) {
        skillCtx._conditionalAttackBuff = {
          damageMult: effects.damageMult,
          guaranteedCrit: effects.guaranteedCrit,
        };
      }
    }
  }
}

/**
 * 機率觸發技能判定
 * @param {object} skillCtx
 * @returns {{ skill: object, mods: string[] } | null}
 */
function rollSkillTrigger(skillCtx) {
  for (const entry of skillCtx.probabilities) {
    const { skill, mods } = entry;
    const chance = getEffectiveTriggerChance(skill, mods, skillCtx);
    if (roll.d100Check(chance)) {
      return entry;
    }
  }
  return null;
}

/**
 * 檢查是否有先制技能
 * @param {object} skillCtx
 * @param {number} round
 * @returns {boolean}
 */
function checkInitiativeSkill(skillCtx) {
  for (const { skill, mods } of skillCtx.probabilities) {
    const effects = parseSkillEffects(skill, mods);
    if (effects.initiative) return true;
  }
  return false;
}

/**
 * 處理技能攻擊
 * @param {object} attacker - { hp, stats }
 * @param {object} defender - { hp, stats }
 * @param {object} skill - 技能定義
 * @param {string[]} mods
 * @param {number} chainCount - Skill Connect 連鎖數
 * @param {object} skillCtx
 * @param {function} damCheck - battle.js 的 damCheck 函式
 * @returns {{ totalDamage: number, stunned: boolean, log: object }}
 */
function processSkillAttack(attacker, defender, skill, mods, chainCount, skillCtx, damCheck) {
  const effects = parseSkillEffects(skill, mods);
  const CONNECT_DAMAGE_BONUS = config.SKILL.CONNECT_DAMAGE_BONUS;

  // 條件觸發加成（last_stand 等）
  let condBuff = skillCtx._conditionalAttackBuff || null;
  let finalDamageMult = effects.damageMult;
  let guaranteedCrit = effects.guaranteedCrit;

  if (condBuff) {
    if (condBuff.damageMult > 1.0) finalDamageMult *= condBuff.damageMult;
    if (condBuff.guaranteedCrit) guaranteedCrit = true;
  }

  // 刀術極意傷害加成
  if (skillCtx.katanaMasteryActive && skill.weaponType === "katana") {
    finalDamageMult *= (1 + skillCtx.katanaDamageBonus);
  }

  // 有效防禦
  const effectiveDef = Math.max(0, Math.floor(defender.stats.def * (1 - effects.ignoreDef)));

  // 多段攻擊
  let totalDamage = 0;
  const hitCount = effects.hitCount;

  for (let i = 0; i < hitCount; i++) {
    const cri = guaranteedCrit ? 2 : attacker.stats.cri; // cri=2 → 幾乎必暴
    const dmgResult = damCheck(attacker.stats.atk, cri, effectiveDef);
    const hitDmg = Math.max(1, Math.floor(dmgResult.damage * finalDamageMult));
    totalDamage += hitDmg;
  }

  // Skill Connect 加成
  if (chainCount > 0) {
    totalDamage = Math.floor(totalDamage * (1 + chainCount * CONNECT_DAMAGE_BONUS));
  }

  // 暈眩判定
  const stunned = effects.stunChance > 0 && roll.d100Check(effects.stunChance);

  // 吸血
  let healed = 0;
  if (effects.lifesteal > 0) {
    healed = Math.floor(totalDamage * effects.lifesteal);
    attacker.hp += healed;
    if (attacker.maxHp) {
      attacker.hp = Math.min(attacker.hp, attacker.maxHp);
    }
  }

  // 傷害減免（防守方）
  const reducedDamage = skillCtx.activeBoosts?.damageReduction
    ? Math.floor(totalDamage * (1 - (skillCtx.activeBoosts.damageReduction || 0)))
    : totalDamage;

  defender.hp -= reducedDamage;

  const log = {
    type: "skill_attack",
    skillId: skill.id,
    skillName: skill.nameCn,
    nameJp: skill.nameJp,
    color: skill.color,
    attacker: attacker.name,
    defender: defender.name,
    damage: reducedDamage,
    hitCount,
    stunned,
    healed,
    chainCount,
    isCrit: guaranteedCrit,
  };

  return { totalDamage: reducedDamage, stunned, healed, log };
}

/**
 * 回合結束效果（回復等）
 * @param {object} fighter
 * @param {object} skillCtx
 * @returns {object|null} 日誌物件
 */
function applyEndOfRoundEffects(fighter, skillCtx) {
  if (skillCtx.healPerRound > 0) {
    const maxHp = fighter.maxHp || fighter.hp;
    const healAmount = Math.max(1, Math.floor(maxHp * skillCtx.healPerRound / 100));
    fighter.hp = Math.min(maxHp, fighter.hp + healAmount);
    return {
      type: "skill_heal",
      target: fighter.name,
      amount: healAmount,
    };
  }
  return null;
}

module.exports = {
  parseSkillEffects,
  getEffectiveTriggerChance,
  getEffectiveDelay,
  buildSkillContext,
  applyPassiveSkills,
  checkConditionalSkills,
  rollSkillTrigger,
  checkInitiativeSkill,
  processSkillAttack,
  applyEndOfRoundEffects,
};
