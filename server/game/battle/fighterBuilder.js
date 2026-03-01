const config = require("../config.js");

const { BASE_HP: PVP_BASE_HP } = config.PVP;

function buildPvePlayerSide(weapon, npc, titleMods = {}) {
  let playerHp = (npc.hp || 0) + (weapon.hp || 0);
  let playerAtk = weapon.atk || 0;
  let playerDef = weapon.def || 0;
  let playerAgi = weapon.agi || 0;
  const playerCri = weapon.cri || 10;

  if (npc.isHiredNpc && npc.effectiveStats) {
    const es = npc.effectiveStats;
    playerHp = es.hp + (weapon.hp || 0);
    playerAtk = (weapon.atk || 0) + Math.floor(es.atk * 0.5);
    playerDef = (weapon.def || 0) + Math.floor(es.def * 0.5);
    playerAgi = Math.max(weapon.agi || 0, es.agi);
  }

  if (titleMods.battleAtk && titleMods.battleAtk !== 1) {
    playerAtk = Math.max(1, Math.round(playerAtk * titleMods.battleAtk));
  }
  if (titleMods.battleDef && titleMods.battleDef !== 1) {
    playerDef = Math.max(0, Math.round(playerDef * titleMods.battleDef));
  }
  if (titleMods.battleAgi && titleMods.battleAgi !== 1) {
    playerAgi = Math.max(1, Math.round(playerAgi * titleMods.battleAgi));
  }

  return {
    name: npc.name,
    hp: playerHp,
    stats: { atk: playerAtk, def: playerDef, agi: playerAgi, cri: playerCri },
    innateEffects: weapon.innateEffects || [],
  };
}

function buildPvpFighter(name, weapon, lvBonus, mods) {
  const maxHp = PVP_BASE_HP + lvBonus.hpBonus + (weapon.hp || 0);
  return {
    name,
    hp: maxHp,
    maxHp,
    stats: {
      atk: Math.max(1, Math.round((weapon.atk || 0) * lvBonus.atkMult * (mods.battleAtk || 1))),
      def: Math.max(0, Math.round((weapon.def || 0) * lvBonus.defMult * (mods.battleDef || 1))),
      agi: Math.max(1, Math.round((weapon.agi || 0) * lvBonus.agiMult * (mods.battleAgi || 1))),
      cri: weapon.cri || 10,
    },
    innateEffects: weapon.innateEffects || [],
  };
}

/**
 * 建構 Boss fighter（供 PvE combat loop 使用）
 * @param {object} bossData - floors.json 的 Boss 定義
 * @param {number[]} activatedPhases - 已啟動的 phase 索引
 * @param {number} remainingHp - Boss 實際剩餘 HP
 * @param {object|null} weaponCopyData - weaponCopy 機制資料
 *   null = 一般 Boss（無 weaponCopy）
 *   { hasWeapon: false } = weaponCopy Boss，武器庫空 → ATK 歸零
 *   { hasWeapon: true, atk, def, agi } = weaponCopy Boss，裝備抄來的武器
 */
function buildBossFighter(bossData, activatedPhases, remainingHp, weaponCopyData = null) {
  const { BOSS_COMBAT } = config;
  let totalAtkBoost = 0;
  let totalDefBoost = 0;
  for (const idx of activatedPhases) {
    const phase = bossData.phases?.[idx];
    if (phase) {
      totalAtkBoost += phase.atkBoost ?? 0;
      totalDefBoost += phase.defBoost ?? phase.atkBoost ?? 0;
    }
  }

  let finalAtk, finalDef, finalAgi;

  if (weaponCopyData && !weaponCopyData.hasWeapon) {
    // 武器庫空 → Boss 無法攻擊（第一戰完全挨打）
    finalAtk = 0;
    finalDef = Math.max(0, bossData.def + totalDefBoost);
    finalAgi = (bossData.agi || 0) + (BOSS_COMBAT.AGI_BONUS || 0);
  } else if (weaponCopyData && weaponCopyData.hasWeapon) {
    // 有武器 → 三圍加到 Boss 基礎值
    finalAtk = Math.max(1, Math.ceil(
      (bossData.atk + totalAtkBoost + weaponCopyData.atk) * BOSS_COMBAT.ATK_MULT,
    ));
    finalDef = Math.max(0, bossData.def + totalDefBoost + weaponCopyData.def);
    finalAgi = (bossData.agi || 0) + (BOSS_COMBAT.AGI_BONUS || 0) + weaponCopyData.agi;
  } else {
    // 一般 Boss（無 weaponCopy）
    finalAtk = Math.max(1, Math.ceil((bossData.atk + totalAtkBoost) * BOSS_COMBAT.ATK_MULT));
    finalDef = Math.max(0, bossData.def + totalDefBoost);
    finalAgi = (bossData.agi || 0) + (BOSS_COMBAT.AGI_BONUS || 0);
  }

  return {
    name: bossData.name,
    hp: remainingHp,
    stats: {
      atk: finalAtk,
      def: finalDef,
      agi: finalAgi,
      cri: BOSS_COMBAT.BOSS_CRI || 11,
    },
    innateEffects: [],
    specialMechanics: bossData.specialMechanics || null,
  };
}

module.exports = { buildPvePlayerSide, buildPvpFighter, buildBossFighter };
