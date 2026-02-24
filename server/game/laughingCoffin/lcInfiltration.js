const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getLcState } = require("./lcState.js");
const { pickOpponent, executeLcCombat } = require("./lcCombat.js");
const { grabFromLootPool } = require("./lcLoot.js");
const { increment } = require("../progression/statsTracker.js");
const { getActiveFloor } = require("../floor/activeFloor.js");
const { getEffectiveStats } = require("../npc/npcStats.js");
const { getBattleLevelBonus } = require("../battleLevel.js");

const LC_CFG = config.LAUGHING_COFFIN_GUILD;
const SOLO = config.SOLO_ADV;

/**
 * 執行潛入（from move handler lcInfiltrate）
 * @param {object} user - 玩家資料
 * @returns {object} 潛入結果
 */
async function infiltrate(user) {
  const pending = user.pendingLcEncounter;
  if (!pending) return { error: "沒有待處理的微笑棺木遭遇" };

  const lc = await getLcState();
  if (!lc || !lc.active || lc.disbanded) {
    await clearPendingEncounter(user.userId);
    return { error: "微笑棺木公會已不存在" };
  }

  // 清除 pending
  await clearPendingEncounter(user.userId);
  await increment(user.userId, "lcInfiltrations");

  // 判定結果
  const rollValue = Math.random() * 100;

  if (rollValue < LC_CFG.STEALTH_CHANCE) {
    // 潛行成功：取回贓物
    return await processStealthSuccess(user, lc);
  } else if (rollValue < LC_CFG.STEALTH_CHANCE + LC_CFG.FIGHT_CHANCE) {
    // 遭遇戰鬥
    return await processInfiltrationCombat(user, lc);
  } else {
    // 被發現但逃脫
    return { outcome: "escape", text: "你被微笑棺木成員發現了，但成功逃離了據點！" };
  }
}

/**
 * 無視遭遇
 */
async function ignoreLcEncounter(userId) {
  await clearPendingEncounter(userId);
  return { outcome: "ignored" };
}

/**
 * 潛行成功：從贓物池取回物品
 */
async function processStealthSuccess(user, lcState) {
  await increment(user.userId, "lcStealthSuccess");

  const grabbed = await grabFromLootPool(
    user.userId,
    LC_CFG.LOOT_COL_RATE,
    LC_CFG.LOOT_MATERIAL_COUNT,
  );

  const hasLoot = grabbed.col > 0 || grabbed.materials.length > 0 || grabbed.weapons.length > 0;

  return {
    outcome: "stealth",
    loot: grabbed,
    hasLoot,
  };
}

/**
 * 潛入戰鬥：與具名成員作戰
 */
async function processInfiltrationCombat(user, lcState) {
  const currentFloor = getActiveFloor(user);
  const opponent = pickOpponent(lcState, currentFloor);

  // 建構玩家方戰鬥資料（鍛造師親自戰鬥，使用最強武器）
  const combatInfo = buildPlayerCombatInfo(user);

  // 手無寸鐵 → 無法戰鬥，直接逃脫
  if (!combatInfo.canFight) {
    return { outcome: "escape", text: "手無寸鐵，無法與微笑棺木成員交戰，只好倉皇逃離..." };
  }

  // 建構玩家劍技上下文
  const playerSkillCtx = buildPlayerSkillCtx(user, combatInfo);

  return await executeLcCombat(
    user, "soloAdv", {}, opponent, combatInfo, playerSkillCtx,
    {
      deathChances: { mine: LC_CFG.INFILTRATION_DEATH_CHANCE, soloAdv: LC_CFG.INFILTRATION_DEATH_CHANCE, adv: LC_CFG.INFILTRATION_DEATH_CHANCE },
      context: "infiltration",
    },
  );
}

/**
 * 建構玩家方戰鬥資料（潛入時鍛造師親自作戰）
 */
function buildPlayerCombatInfo(user) {
  const weapons = user.weaponStock || [];
  const bestIdx = findBestWeaponIndex(weapons);
  if (bestIdx === null) return { canFight: false };

  const weapon = weapons[bestIdx];
  const lvBonus = getBattleLevelBonus(user.battleLevel || 1);

  return {
    canFight: true,
    isNpc: false,
    playerSide: {
      name: user.name,
      hp: SOLO.BASE_HP + lvBonus.hpBonus,
      isHiredNpc: false,
    },
    weapon: {
      ...weapon,
      agi: Math.max(weapon.agi || 0, SOLO.BASE_AGI),
    },
  };
}

/**
 * 建構玩家劍技上下文
 */
function buildPlayerSkillCtx(user, combatInfo) {
  if (!combatInfo.canFight) return null;
  const { buildSkillContext } = require("../skill/skillCombat.js");
  const { getSkill } = require("../skill/skillRegistry.js");

  const equipped = user.equippedSkills || [];
  if (equipped.length === 0) return null;

  const effectiveSkills = equipped
    .map((e) => ({ skill: getSkill(e.skillId), mods: e.mods || [] }))
    .filter((e) => e.skill);
  if (effectiveSkills.length === 0) return null;

  const weaponType = combatInfo.weapon.type || null;
  const proficiency = user.weaponProficiency || {};
  return buildSkillContext(effectiveSkills, proficiency, weaponType);
}

function findBestWeaponIndex(weapons) {
  let bestIdx = null;
  let bestScore = -1;
  for (let i = 0; i < weapons.length; i++) {
    const w = weapons[i];
    if (!w) continue;
    const score = (w.atk || 0) + (w.def || 0) + (w.agi || 0) + (w.hp || 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

async function clearPendingEncounter(userId) {
  await db.update("user", { userId }, { $unset: { pendingLcEncounter: "" } });
}

module.exports = { infiltrate, ignoreLcEncounter };
