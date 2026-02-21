const config = require("../config.js");
const roll = require("../roll");
const { processAttack, damCheck } = require("./combatCalc.js");
const { buildInnateContext, applyInnatePassives } = require("./innateEffectCombat.js");
const {
  applyPassiveSkills,
  checkConditionalSkills,
  rollSkillTrigger,
  processSkillAttack,
  applyEndOfRoundEffects,
} = require("../skill/skillCombat.js");

const { ROUND_LIMIT } = config.BATTLE;

function runPvpCombatLoop(attacker, defender, duelMode) {
  // 固有效果初始化
  const atkInnate = buildInnateContext(attacker.innateEffects);
  const defInnate = buildInnateContext(defender.innateEffects);
  applyInnatePassives(attacker, atkInnate);
  applyInnatePassives(defender, defInnate);

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
      ? [{ src: attacker, dst: defender, srcKey: "attacker", srcInnate: atkInnate, dstInnate: defInnate },
         { src: defender, dst: attacker, srcKey: "defender", srcInnate: defInnate, dstInnate: atkInnate }]
      : [{ src: defender, dst: attacker, srcKey: "defender", srcInnate: defInnate, dstInnate: atkInnate },
         { src: attacker, dst: defender, srcKey: "attacker", srcInnate: atkInnate, dstInnate: defInnate }];

    let skipNext = false;
    for (let i = 0; i < order.length; i++) {
      const { src, dst, srcKey, srcInnate, dstInnate } = order[i];
      if (dst.hp <= 0 || skipNext) break;

      const r = processAttack(src, dst, detailLog, srcInnate, dstInnate);
      battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${detailLog[detailLog.length - 1].damage || 0} 點傷害。`);

      // 暈眩：跳過對方的回擊
      if (r.stunned && i === 0) {
        skipNext = true;
        detailLog.push({ type: "stun", target: dst.name });
      }

      if (duelMode === "first_strike" && dst.maxHp && (dst.maxHp - dst.hp) >= dst.maxHp * 0.10) {
        winnerSide = srcKey;
        break;
      }
      if (duelMode === "half_loss" && dst.maxHp && dst.hp <= dst.maxHp * 0.50) {
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
  // 固有效果初始化
  const atkInnate = buildInnateContext(attacker.innateEffects);
  const defInnate = buildInnateContext(defender.innateEffects);
  applyInnatePassives(attacker, atkInnate);
  applyInnatePassives(defender, defInnate);

  if ((!atkSkillCtx || atkSkillCtx.skills.length === 0) &&
      (!defSkillCtx || defSkillCtx.skills.length === 0)) {
    // 已套用 innatePassives，走無技能版 loop（但不能再呼叫 runPvpCombatLoop 避免重複套用）
    return _runLoopNoSkills(attacker, defender, duelMode, atkInnate, defInnate);
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
          { src: attacker, dst: defender, ctx: atkSkillCtx, key: "attacker", srcInnate: atkInnate, dstInnate: defInnate },
          { src: defender, dst: attacker, ctx: defSkillCtx, key: "defender", srcInnate: defInnate, dstInnate: atkInnate },
        ]
      : [
          { src: defender, dst: attacker, ctx: defSkillCtx, key: "defender", srcInnate: defInnate, dstInnate: atkInnate },
          { src: attacker, dst: defender, ctx: atkSkillCtx, key: "attacker", srcInnate: atkInnate, dstInnate: defInnate },
        ];

    let skipNext = false;
    for (let i = 0; i < sides.length; i++) {
      const { src, dst, ctx, key, srcInnate, dstInnate } = sides[i];
      if (dst.hp <= 0 || skipNext) break;

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
        const r = processAttack(src, dst, detailLog, srcInnate, dstInnate);
        battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${detailLog[detailLog.length - 1].damage || 0} 點傷害。`);

        if (r.stunned && i === 0) {
          skipNext = true;
          detailLog.push({ type: "stun", target: dst.name });
        }
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

// 內部輔助：已套用 innatePassives 後的無技能 PvP loop
function _runLoopNoSkills(attacker, defender, duelMode, atkInnate, defInnate) {
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
      ? [{ src: attacker, dst: defender, srcKey: "attacker", srcInnate: atkInnate, dstInnate: defInnate },
         { src: defender, dst: attacker, srcKey: "defender", srcInnate: defInnate, dstInnate: atkInnate }]
      : [{ src: defender, dst: attacker, srcKey: "defender", srcInnate: defInnate, dstInnate: atkInnate },
         { src: attacker, dst: defender, srcKey: "attacker", srcInnate: atkInnate, dstInnate: defInnate }];

    let skipNext = false;
    for (let i = 0; i < order.length; i++) {
      const { src, dst, srcKey, srcInnate, dstInnate } = order[i];
      if (dst.hp <= 0 || skipNext) break;

      const r = processAttack(src, dst, detailLog, srcInnate, dstInnate);
      battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${detailLog[detailLog.length - 1].damage || 0} 點傷害。`);

      if (r.stunned && i === 0) {
        skipNext = true;
        detailLog.push({ type: "stun", target: dst.name });
      }

      if (duelMode === "first_strike" && dst.maxHp && (dst.maxHp - dst.hp) >= dst.maxHp * 0.10) {
        winnerSide = srcKey; break;
      }
      if (duelMode === "half_loss" && dst.maxHp && dst.hp <= dst.maxHp * 0.50) {
        winnerSide = srcKey; break;
      }
      if (dst.hp <= 0) {
        winnerSide = srcKey; break;
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

module.exports = { runPvpCombatLoop, runPvpCombatLoopWithSkills };
