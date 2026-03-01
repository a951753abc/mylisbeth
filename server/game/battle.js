/**
 * 戰鬥系統公開 API — 組合子模組提供完整戰鬥功能
 */
const { getEneFromList, getEneFromFloor, eneExample } = require("./battle/enemyGenerator.js");
const { hitCheck, damCheck } = require("./battle/combatCalc.js");
const { buildPvePlayerSide, buildPvpFighter, buildBossFighter } = require("./battle/fighterBuilder.js");
const { runPveCombatLoop, runPveCombatLoopWithSkills } = require("./battle/pveCombat.js");
const { runPvpCombatLoop, runPvpCombatLoopWithSkills } = require("./battle/pvpCombat.js");
const { buildSkillContext } = require("./skill/skillCombat.js");
const { resolveWeaponType } = require("./weapon/weaponType.js");

const battleModule = {};

battleModule.pveBattle = async function (weapon, npc, npcNameList, floorEnemies, titleMods = {}) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const enemyData = floorEnemies
    ? getEneFromFloor(floorEnemies)
    : getEneFromList(eneExample);
  const enemyName = npcNameList[Math.floor(Math.random() * npcNameList.length)].name;
  const enemySide = {
    name: `${enemyData.category}${enemyData.name || enemyName}`,
    hp: enemyData.hp,
    stats: { atk: enemyData.atk, def: enemyData.def, agi: enemyData.agi, cri: enemyData.cri },
  };

  const battleResult = runPveCombatLoop(playerSide, enemySide);
  battleResult.category = enemyData.category;
  return battleResult;
};

battleModule.pvpBattle = async function (
  attackerData, attackerWeapon,
  defenderData, defenderWeapon,
  attackerMods = {}, defenderMods = {},
  duelMode = "half_loss",
) {
  const { getBattleLevelBonus } = require("./battleLevel.js");
  const atkLvBonus = getBattleLevelBonus(attackerData.battleLevel || 1);
  const attacker = buildPvpFighter(attackerData.name, attackerWeapon, atkLvBonus, attackerMods);
  const defLvBonus = getBattleLevelBonus(defenderData.battleLevel || 1);
  const defender = buildPvpFighter(defenderData.name, defenderWeapon, defLvBonus, defenderMods);

  const { battleLog, detailLog, winnerSide } = runPvpCombatLoop(attacker, defender, duelMode);
  const winner = winnerSide === "attacker" ? attackerData : defenderData;
  const loser = winnerSide === "attacker" ? defenderData : attackerData;

  return {
    log: battleLog, detailLog, winner, loser, duelMode,
    winnerHpRemaining: winnerSide === "attacker" ? attacker.hp : defender.hp,
    loserHpRemaining: winnerSide === "attacker" ? defender.hp : attacker.hp,
    attackerHp: attacker.hp, defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp, defenderMaxHp: defender.maxHp,
  };
};

battleModule.pvpRawBattle = function (atkFighter, defFighter, duelMode = "half_loss") {
  const attacker = {
    name: atkFighter.name, hp: atkFighter.hp, maxHp: atkFighter.hp,
    stats: {
      atk: Math.max(1, atkFighter.atk), def: Math.max(0, atkFighter.def),
      agi: Math.max(1, atkFighter.agi), cri: atkFighter.cri || 10,
    },
  };
  const defender = {
    name: defFighter.name, hp: defFighter.hp, maxHp: defFighter.hp,
    stats: {
      atk: Math.max(1, defFighter.atk), def: Math.max(0, defFighter.def),
      agi: Math.max(1, defFighter.agi), cri: defFighter.cri || 10,
    },
  };

  const { battleLog, detailLog, winnerSide } = runPvpCombatLoop(attacker, defender, duelMode);
  return {
    log: battleLog, detailLog, winnerSide,
    attackerHp: attacker.hp, defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp, defenderMaxHp: defender.maxHp,
  };
};

battleModule.pveBattleDirect = async function (weapon, npc, enemyData, titleMods = {}) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const enemySide = {
    name: enemyData.name, hp: enemyData.hp,
    stats: { atk: enemyData.atk, def: enemyData.def, agi: enemyData.agi, cri: enemyData.cri },
  };
  const battleResult = runPveCombatLoop(playerSide, enemySide);
  battleResult.category = enemyData.category || "[Event]";
  return battleResult;
};

battleModule.pveBattleWithSkills = async function (weapon, npc, npcNameList, floorEnemies, titleMods = {}, skillCtx = null) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const enemyData = floorEnemies
    ? getEneFromFloor(floorEnemies)
    : getEneFromList(eneExample);
  const enemyName = npcNameList[Math.floor(Math.random() * npcNameList.length)].name;
  const enemySide = {
    name: `${enemyData.category}${enemyData.name || enemyName}`,
    hp: enemyData.hp,
    stats: { atk: enemyData.atk, def: enemyData.def, agi: enemyData.agi, cri: enemyData.cri },
  };
  const battleResult = runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx);
  battleResult.category = enemyData.category;
  return battleResult;
};

battleModule.pvpBattleWithSkills = async function (
  attackerData, attackerWeapon,
  defenderData, defenderWeapon,
  attackerMods, defenderMods,
  duelMode, atkSkillCtx, defSkillCtx,
) {
  const { getBattleLevelBonus } = require("./battleLevel.js");
  const atkLvBonus = getBattleLevelBonus(attackerData.battleLevel || 1);
  const attacker = buildPvpFighter(attackerData.name, attackerWeapon, atkLvBonus, attackerMods);
  const defLvBonus = getBattleLevelBonus(defenderData.battleLevel || 1);
  const defender = buildPvpFighter(defenderData.name, defenderWeapon, defLvBonus, defenderMods);

  const { battleLog, detailLog, winnerSide, skillEvents } = runPvpCombatLoopWithSkills(
    attacker, defender, duelMode, atkSkillCtx, defSkillCtx,
  );
  const winner = winnerSide === "attacker" ? attackerData : defenderData;
  const loser = winnerSide === "attacker" ? defenderData : attackerData;

  return {
    log: battleLog, detailLog, winner, loser, duelMode,
    winnerHpRemaining: winnerSide === "attacker" ? attacker.hp : defender.hp,
    loserHpRemaining: winnerSide === "attacker" ? defender.hp : attacker.hp,
    attackerHp: attacker.hp, defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp, defenderMaxHp: defender.maxHp,
    skillEvents: skillEvents || [],
  };
};

battleModule.pveBattleDirectWithSkills = async function (weapon, npc, enemyData, titleMods = {}, skillCtx = null) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const enemySide = {
    name: enemyData.name, hp: enemyData.hp,
    stats: { atk: enemyData.atk, def: enemyData.def, agi: enemyData.agi, cri: enemyData.cri },
  };
  const battleResult = runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx);
  battleResult.category = enemyData.category || "[Event]";
  return battleResult;
};

battleModule.bossBattleWithSkills = function (
  weapon, npc, bossData, activatedPhases, remainingHp, titleMods = {}, skillCtx = null, bonusAtk = 0,
) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const bossSide = buildBossFighter(bossData, activatedPhases, remainingHp, bonusAtk);
  const weaponType = resolveWeaponType(weapon);
  return runPveCombatLoopWithSkills(playerSide, bossSide, skillCtx, weaponType);
};

/**
 * LC 公會戰鬥：雙方都有劍技（復用 PvP 迴圈，結果轉 PvE 格式）
 * @param {object} playerWeapon - 玩家/NPC 裝備的武器
 * @param {object} playerNpc - 玩家/NPC 資料（含 name, hp, effectiveStats 等）
 * @param {object} titleMods - 稱號修正
 * @param {object|null} playerSkillCtx - 玩家方劍技上下文
 * @param {object} lcFighter - LC 成員 fighter（from buildLcFighter）
 * @param {object|null} lcSkillCtx - LC 成員劍技上下文（from buildLcSkillContext）
 */
battleModule.lcBattleWithSkills = function (
  playerWeapon, playerNpc, titleMods, playerSkillCtx,
  lcFighter, lcSkillCtx,
) {
  const playerSide = buildPvePlayerSide(playerWeapon, playerNpc, titleMods);
  playerSide.maxHp = playerSide.hp;
  lcFighter.maxHp = lcFighter.hp;

  const { winnerSide, detailLog, skillEvents } = runPvpCombatLoopWithSkills(
    playerSide, lcFighter, null, playerSkillCtx, lcSkillCtx,
  );

  return {
    win: winnerSide === "attacker" ? 1 : 0,
    dead: winnerSide === "defender" ? 1 : 0,
    log: detailLog,
    skillEvents: skillEvents || [],
    npcName: playerNpc.name,
    enemyName: lcFighter.name,
    category: "[Laughing Coffin]",
    initialHp: { npc: playerSide.maxHp, enemy: lcFighter.maxHp },
    finalHp: { npc: playerSide.hp, enemy: lcFighter.hp },
  };
};

battleModule.hitCheck = hitCheck;
battleModule.damCheck = damCheck;
battleModule.buildPvpFighter = buildPvpFighter;
battleModule.buildSkillContext = buildSkillContext;

module.exports = battleModule;
