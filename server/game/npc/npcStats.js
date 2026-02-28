const config = require("../config.js");

/**
 * 依 condition 計算有效素質倍率
 * 100-70%: ×1.0, 69-40%: ×0.7, 39-10%: ×0.4, <10%: 不可戰（回傳 null）
 * @param {object} npc - 含 baseStats, condition 的 NPC 物件
 * @returns {object|null} 有效素質，或 null（體力不足）
 */
function getEffectiveStats(npc) {
  const cond = npc.condition ?? 100;
  if (cond < 10) return null;

  let mult;
  if (cond >= 70) {
    mult = 1.0;
  } else if (cond >= 40) {
    mult = 0.7;
  } else {
    mult = 0.4;
  }

  const s = npc.baseStats;
  const level = npc.level || 1;
  const levelMult = 1 + (level - 1) * config.NPC.LEVEL_STAT_GROWTH;

  const stats = {
    hp:  Math.floor(s.hp  * mult * levelMult),
    atk: Math.max(1, Math.floor(s.atk * mult * levelMult)),
    def: Math.floor(s.def * mult * levelMult),
    agi: Math.max(1, Math.floor(s.agi * mult * levelMult)),
  };

  // 持續性 debuff（Boss 詛咒）
  const now = Date.now();
  const debuffs = npc.debuffs || [];
  for (const d of debuffs) {
    if (d.expiresAt > now && d.stat && d.mult) {
      if (stats[d.stat] !== undefined) {
        stats[d.stat] = Math.max(d.stat === "hp" ? 1 : (d.stat === "def" ? 0 : 1), Math.floor(stats[d.stat] * d.mult));
      }
    }
  }

  return stats;
}

/**
 * 合併 NPC 有效素質與武器素質（用於 pveBattle）
 * @param {object} npcEffective - getEffectiveStats 的結果
 * @param {object} weapon - 武器物件
 * @returns {object} 合併後的戰鬥素質
 */
function getCombinedBattleStats(npcEffective, weapon) {
  return {
    hp: npcEffective.hp + (weapon.hp || 0),
    atk: (weapon.atk || 0) + Math.floor(npcEffective.atk * 0.5),
    def: (weapon.def || 0) + Math.floor(npcEffective.def * 0.5),
    agi: Math.max(weapon.agi || 0, npcEffective.agi),
    cri: weapon.cri || 10,
    innateEffects: weapon.innateEffects || [],
  };
}

/**
 * 取得升級到下一級所需的經驗值
 * @param {number} level
 * @returns {number}
 */
function getExpToNextLevel(level) {
  return Math.floor(config.NPC.EXP_BASE * Math.pow(config.NPC.EXP_MULTIPLIER, level - 1));
}

/**
 * 取得 NPC 活躍的 debuff 列表（已過期的自動排除）
 * @param {object} npc
 * @returns {object[]}
 */
function getActiveDebuffs(npc) {
  const now = Date.now();
  return (npc.debuffs || []).filter((d) => d.expiresAt > now);
}

module.exports = { getEffectiveStats, getCombinedBattleStats, getExpToNextLevel, getActiveDebuffs };
