/**
 * Boss 特殊戰鬥機制處理
 * - agiPenalty: AGI 不足時最終傷害倍率懲罰
 * - weaponAffinity: 武器類型弱點/抗性/免疫
 * - weaponBreak: Boss 命中時有機率損傷武器耐久
 * - persistentDebuff: 戰後有機率施加持續性減益（提示用，實際邏輯在 bossAttack.js）
 */

const roll = require("../roll");

/**
 * 套用 Boss 特殊機制（戰前一次性呼叫）
 * @param {object} playerSide - 玩家方 fighter（含 stats.agi）
 * @param {object} bossSide - Boss 方 fighter（含 specialMechanics）
 * @param {string|null} weaponType - 玩家使用的武器類型 ID
 * @returns {object[]} 特殊機制觸發日誌
 */
function applySpecialMechanics(playerSide, bossSide, weaponType) {
  const mechanics = bossSide.specialMechanics;
  if (!mechanics) return [];

  const logs = [];

  if (mechanics.agiPenalty) {
    const { threshold, damageMult } = mechanics.agiPenalty;
    if (playerSide.stats.agi < threshold) {
      playerSide._agiPenaltyMult = damageMult;
      logs.push({
        type: "special_mechanic",
        mechanic: "agi_penalty",
        triggered: true,
        playerAgi: playerSide.stats.agi,
        threshold,
        damageMult,
        text: `AGI 不足！(${playerSide.stats.agi} < ${threshold}) 傷害降為 ${Math.round(damageMult * 100)}%`,
      });
    } else {
      logs.push({
        type: "special_mechanic",
        mechanic: "agi_penalty",
        triggered: false,
        playerAgi: playerSide.stats.agi,
        threshold,
        text: `AGI 突破！(${playerSide.stats.agi} >= ${threshold}) 速度懲罰無效化`,
      });
    }
  }

  if (mechanics.weaponAffinity && weaponType) {
    const { weak, resist, immune, weakMult, resistMult, immuneMult } = mechanics.weaponAffinity;
    let mult = 1.0;
    let affinityType = "neutral";

    if (immune && immune.length > 0 && immune.includes(weaponType)) {
      mult = immuneMult ?? 0.1;
      affinityType = "immune";
    } else if (resist && resist.length > 0 && resist.includes(weaponType)) {
      mult = resistMult ?? 0.5;
      affinityType = "resist";
    } else if (weak && weak.length > 0 && weak.includes(weaponType)) {
      mult = weakMult ?? 1.5;
      affinityType = "weak";
    }

    if (mult !== 1.0) {
      playerSide._weaponAffinityMult = mult;
    }

    const textMap = {
      weak: `弱點武器！傷害 x${mult}`,
      resist: `抗性武器...傷害 x${mult}`,
      immune: `免疫武器！傷害 x${mult}`,
      neutral: "一般武器，傷害無增減",
    };

    logs.push({
      type: "special_mechanic",
      mechanic: "weapon_affinity",
      affinityType,
      weaponType,
      mult,
      text: textMap[affinityType],
    });
  }

  if (mechanics.weaponBreak) {
    const { chance, durabilityDamage, descriptionCn } = mechanics.weaponBreak;
    logs.push({
      type: "special_mechanic",
      mechanic: "weapon_break",
      triggered: false,
      chance,
      durabilityDamage,
      text: descriptionCn || `武器破壞：Boss 命中時 ${chance}% 機率損傷武器耐久`,
    });
  }

  if (mechanics.persistentDebuff) {
    const { chance, descriptionCn } = mechanics.persistentDebuff;
    logs.push({
      type: "special_mechanic",
      mechanic: "persistent_debuff",
      triggered: false,
      chance,
      text: descriptionCn || `詛咒：戰後 ${chance}% 機率施加持續性減益`,
    });
  }

  return logs;
}

/**
 * 每回合 Boss 特殊機制（Boss 命中後呼叫）
 * @param {object} bossSide - Boss 方 fighter（含 specialMechanics）
 * @param {boolean} bossHit - Boss 本回合是否命中
 * @returns {{ logs: object[], durabilityDamage: number }}
 */
function applyPerRoundMechanics(bossSide, bossHit) {
  const mechanics = bossSide.specialMechanics;
  if (!mechanics) return { logs: [], durabilityDamage: 0 };

  const logs = [];
  let durabilityDamage = 0;

  if (mechanics.weaponBreak && bossHit) {
    const { chance, durabilityDamage: dmgRange } = mechanics.weaponBreak;
    if (roll.d100Check(chance)) {
      const [min, max] = dmgRange;
      const dmg = min + Math.floor(Math.random() * (max - min + 1));
      durabilityDamage = dmg;
      logs.push({
        type: "weapon_break",
        durabilityDamage: dmg,
        text: `Boss 的攻擊損傷了武器！耐久 -${dmg}`,
      });
    }
  }

  return { logs, durabilityDamage };
}

module.exports = { applySpecialMechanics, applyPerRoundMechanics };
