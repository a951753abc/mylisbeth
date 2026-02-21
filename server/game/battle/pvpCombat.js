const config = require("../config.js");
const roll = require("../roll");
const { damCheck } = require("./combatCalc.js");
const {
  applyPassiveSkills,
  checkConditionalSkills,
  rollSkillTrigger,
  processSkillAttack,
  applyEndOfRoundEffects,
} = require("../skill/skillCombat.js");

const { ROUND_LIMIT } = config.BATTLE;

function runPvpCombatLoop(attacker, defender, duelMode) {
  let round = 1;
  const battleLog = [];
  const detailLog = [];
  let winnerSide = null;

  while (attacker.hp > 0 && defender.hp > 0 && round <= ROUND_LIMIT) {
    const atkInitRoll = roll.d66();
    const defInitRoll = roll.d66();
    const atkAct = atkInitRoll + attacker.stats.agi;
    const defAct = defInitRoll + defender.stats.agi;
    battleLog.push(`\n**第 ${round} 回合**`);
    detailLog.push({
      type: "round", number: round,
      initiative: { atkRoll: atkInitRoll, defRoll: defInitRoll, atkAct, defAct },
    });

    const firstSide = atkAct >= defAct ? "attacker" : "defender";
    const order = firstSide === "attacker"
      ? [{ src: attacker, dst: defender, srcKey: "attacker" },
         { src: defender, dst: attacker, srcKey: "defender" }]
      : [{ src: defender, dst: attacker, srcKey: "defender" },
         { src: attacker, dst: defender, srcKey: "attacker" }];

    for (const { src, dst, srcKey } of order) {
      if (dst.hp <= 0) break;
      const dmgResult = damCheck(src.stats.atk, src.stats.cri, dst.stats.def);
      dst.hp -= dmgResult.damage;
      battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${dmgResult.damage} 點傷害。`);
      detailLog.push({
        attacker: src.name, defender: dst.name,
        damage: dmgResult.damage, isCrit: dmgResult.isCrit,
        damDetail: { atkTotal: dmgResult.atkTotal, defTotal: dmgResult.defTotal, critCount: dmgResult.critCount },
      });

      if (duelMode === "first_strike" && dmgResult.damage >= dst.maxHp * 0.10) {
        winnerSide = srcKey;
        break;
      }
      if (duelMode === "half_loss" && dst.hp <= dst.maxHp * 0.50) {
        winnerSide = srcKey;
        break;
      }
      if (dst.hp <= 0) {
        winnerSide = srcKey;
        break;
      }
    }

    if (winnerSide) break;
    round++;
  }

  if (!winnerSide) {
    winnerSide = attacker.hp >= defender.hp ? "attacker" : "defender";
  }

  return { battleLog, detailLog, winnerSide };
}

function runPvpCombatLoopWithSkills(attacker, defender, duelMode, atkSkillCtx, defSkillCtx) {
  if ((!atkSkillCtx || atkSkillCtx.skills.length === 0) &&
      (!defSkillCtx || defSkillCtx.skills.length === 0)) {
    return runPvpCombatLoop(attacker, defender, duelMode);
  }

  if (atkSkillCtx) applyPassiveSkills(attacker, atkSkillCtx);
  if (defSkillCtx) applyPassiveSkills(defender, defSkillCtx);

  let round = 1;
  const battleLog = [];
  const detailLog = [];
  const skillEvents = [];
  let winnerSide = null;

  while (attacker.hp > 0 && defender.hp > 0 && round <= ROUND_LIMIT) {
    battleLog.push(`\n**第 ${round} 回合**`);

    if (atkSkillCtx) checkConditionalSkills(attacker, atkSkillCtx);
    if (defSkillCtx) checkConditionalSkills(defender, defSkillCtx);

    const atkInitRoll = roll.d66();
    const defInitRoll = roll.d66();
    const atkAct = atkInitRoll + attacker.stats.agi;
    const defAct = defInitRoll + defender.stats.agi;
    detailLog.push({
      type: "round", number: round,
      initiative: { atkRoll: atkInitRoll, defRoll: defInitRoll, atkAct, defAct },
    });
    const firstSide = atkAct >= defAct ? "attacker" : "defender";

    const sides = firstSide === "attacker"
      ? [
          { src: attacker, dst: defender, ctx: atkSkillCtx, key: "attacker" },
          { src: defender, dst: attacker, ctx: defSkillCtx, key: "defender" },
        ]
      : [
          { src: defender, dst: attacker, ctx: defSkillCtx, key: "defender" },
          { src: attacker, dst: defender, ctx: atkSkillCtx, key: "attacker" },
        ];

    for (const { src, dst, ctx, key } of sides) {
      if (dst.hp <= 0) break;

      const triggered = ctx ? rollSkillTrigger(ctx) : null;

      if (triggered) {
        const result = processSkillAttack(
          src, dst, triggered.skill, triggered.mods, 0, ctx, damCheck,
        );
        battleLog.push(`⚔️ ${src.name} 發動劍技【${triggered.skill.nameCn}】對 ${dst.name} 造成 ${result.totalDamage} 點傷害！`);
        skillEvents.push(result.log);
        detailLog.push({
          attacker: src.name, defender: dst.name,
          skill: triggered.skill.nameCn, damage: result.totalDamage,
          isCrit: result.log.isCrit || false,
        });
      } else {
        const dmgResult = damCheck(src.stats.atk, src.stats.cri, dst.stats.def);
        dst.hp -= dmgResult.damage;
        battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${dmgResult.damage} 點傷害。`);
        detailLog.push({
          attacker: src.name, defender: dst.name,
          damage: dmgResult.damage, isCrit: dmgResult.isCrit,
          damDetail: { atkTotal: dmgResult.atkTotal, defTotal: dmgResult.defTotal, critCount: dmgResult.critCount },
        });
      }

      if (duelMode === "first_strike" && dst.maxHp && (dst.maxHp - dst.hp) >= dst.maxHp * 0.10) {
        winnerSide = key;
        break;
      }
      if (duelMode === "half_loss" && dst.maxHp && dst.hp <= dst.maxHp * 0.50) {
        winnerSide = key;
        break;
      }
      if (dst.hp <= 0) {
        winnerSide = key;
        break;
      }
    }

    if (winnerSide) break;

    if (atkSkillCtx) applyEndOfRoundEffects(attacker, atkSkillCtx);
    if (defSkillCtx) applyEndOfRoundEffects(defender, defSkillCtx);

    round++;
  }

  if (!winnerSide) {
    winnerSide = attacker.hp >= defender.hp ? "attacker" : "defender";
  }

  return { battleLog, detailLog, winnerSide, skillEvents };
}

module.exports = { runPvpCombatLoop, runPvpCombatLoopWithSkills };
