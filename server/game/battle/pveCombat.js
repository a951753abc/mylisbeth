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
const { trySkillConnect } = require("../skill/skillConnect.js");

const { ROUND_LIMIT } = config.BATTLE;

function runPveCombatLoop(playerSide, enemySide) {
  // 固有效果初始化
  const playerInnate = buildInnateContext(playerSide.innateEffects);
  const enemyInnate = buildInnateContext([]); // 敵人無固有效果
  applyInnatePassives(playerSide, playerInnate);

  playerSide.maxHp = playerSide.hp;
  enemySide.maxHp = enemySide.hp;

  let round = 1;
  const battleResult = {
    log: [],
    win: 0,
    dead: 0,
    enemyName: enemySide.name,
    npcName: playerSide.name,
    initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
    finalHp: {},
  };

  while (playerSide.hp > 0 && enemySide.hp > 0 && round <= ROUND_LIMIT) {
    // 先攻判定：initiative 固有效果強制先攻
    let playerFirst;
    const npcInitRoll = roll.d66();
    const eneInitRoll = roll.d66();
    const npcAct = npcInitRoll + playerSide.stats.agi;
    const eneAct = eneInitRoll + enemySide.stats.agi;

    if (playerInnate.initiative) {
      playerFirst = true;
    } else {
      playerFirst = npcAct >= eneAct;
    }

    battleResult.log.push({
      type: "round", number: round,
      initiative: { npcRoll: npcInitRoll, eneRoll: eneInitRoll, npcAct, eneAct,
        forced: playerInnate.initiative || false },
    });

    if (playerFirst) {
      const r1 = processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
      if (r1.defenderHp <= 0) { battleResult.win = 1; break; }
      // 暈眩：跳過敵人回擊
      if (!r1.stunned && enemySide.hp > 0) {
        const r2 = processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
        if (r2.defenderHp <= 0) { battleResult.dead = 1; break; }
      } else if (r1.stunned) {
        battleResult.log.push({ type: "stun", target: enemySide.name });
      }
    } else {
      const r1 = processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
      if (r1.defenderHp <= 0) { battleResult.dead = 1; break; }
      if (!r1.stunned && playerSide.hp > 0) {
        const r2 = processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
        if (r2.defenderHp <= 0) { battleResult.win = 1; break; }
      } else if (r1.stunned) {
        battleResult.log.push({ type: "stun", target: playerSide.name });
      }
    }
    round++;
  }

  if (round > ROUND_LIMIT && playerSide.hp > 0 && enemySide.hp > 0) {
    battleResult.log.push({ type: "end", outcome: "draw" });
  } else if (battleResult.win) {
    battleResult.log.push({ type: "end", outcome: "win", winner: playerSide.name });
  } else if (battleResult.dead) {
    battleResult.log.push({ type: "end", outcome: "lose", winner: enemySide.name });
  }

  battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
  return battleResult;
}

function runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx) {
  // 固有效果初始化（技能戰鬥也適用）
  const playerInnate = buildInnateContext(playerSide.innateEffects);
  const enemyInnate = buildInnateContext([]);
  applyInnatePassives(playerSide, playerInnate);

  if (!skillCtx || skillCtx.skills.length === 0) {
    // 已套用 innatePassives，但要走完整的 loop
    // 直接用上面的 runPveCombatLoop 邏輯不行（因為會重複套用）
    // 所以在這裡內聯無技能版本的 loop
    playerSide.maxHp = playerSide.hp;
    enemySide.maxHp = enemySide.hp;
    return _runLoopNoSkills(playerSide, enemySide, playerInnate, enemyInnate);
  }

  playerSide.maxHp = playerSide.hp;
  enemySide.maxHp = enemySide.hp;

  applyPassiveSkills(playerSide, skillCtx);

  let round = 1;
  const battleResult = {
    log: [],
    win: 0,
    dead: 0,
    enemyName: enemySide.name,
    npcName: playerSide.name,
    initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
    finalHp: {},
    skillEvents: [],
  };

  let connectChain = 0;

  while (playerSide.hp > 0 && enemySide.hp > 0 && round <= ROUND_LIMIT) {
    checkConditionalSkills(playerSide, skillCtx);
    const triggeredEntry = rollSkillTrigger(skillCtx);

    let playerFirst;
    let initData = null;

    // 先攻判定：技能 initiative > 固有效果 initiative > 骰子
    if (triggeredEntry) {
      const { parseSkillEffects } = require("../skill/skillCombat.js");
      const effects = parseSkillEffects(triggeredEntry.skill, triggeredEntry.mods);
      if (effects.initiative) {
        playerFirst = true;
        initData = { forced: true, skill: triggeredEntry.skill.nameCn };
      }
    }
    if (playerFirst === undefined && playerInnate.initiative) {
      playerFirst = true;
      initData = { forced: true, innate: true };
    }
    if (playerFirst === undefined) {
      const npcInitRoll = roll.d66();
      const eneInitRoll = roll.d66();
      const npcAct = npcInitRoll + playerSide.stats.agi;
      const eneAct = eneInitRoll + enemySide.stats.agi;
      playerFirst = npcAct >= eneAct;
      initData = { npcRoll: npcInitRoll, eneRoll: eneInitRoll, npcAct, eneAct };
    }
    battleResult.log.push({ type: "round", number: round, initiative: initData });

    if (playerFirst) {
      let stunTarget = false;
      if (triggeredEntry) {
        const result = processSkillAttack(
          playerSide, enemySide,
          triggeredEntry.skill, triggeredEntry.mods,
          connectChain, skillCtx, damCheck,
        );
        battleResult.log.push(result.log);
        battleResult.skillEvents.push(result.log);

        let connectResult = trySkillConnect(skillCtx, triggeredEntry.skill, triggeredEntry.mods, connectChain);
        while (connectResult.connected && enemySide.hp > 0) {
          const chainResult = processSkillAttack(
            playerSide, enemySide,
            connectResult.nextEntry.skill, connectResult.nextEntry.mods,
            connectResult.newChain, skillCtx, damCheck,
          );
          battleResult.log.push(chainResult.log);
          battleResult.skillEvents.push(chainResult.log);
          connectChain = connectResult.newChain;
          connectResult = trySkillConnect(
            skillCtx, connectResult.nextEntry.skill,
            connectResult.nextEntry.mods, connectChain,
          );
        }
        connectChain = connectResult.connected ? connectResult.newChain : (triggeredEntry ? 1 : 0);

        if (result.stunned && enemySide.hp > 0) {
          stunTarget = true;
          battleResult.log.push({ type: "stun", target: enemySide.name });
        }
      } else {
        const r = processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
        if (r.stunned) {
          stunTarget = true;
          battleResult.log.push({ type: "stun", target: enemySide.name });
        }
        connectChain = 0;
      }

      if (enemySide.hp <= 0) { battleResult.win = 1; break; }

      if (!stunTarget && enemySide.hp > 0) {
        processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
        if (playerSide.hp <= 0) { battleResult.dead = 1; break; }
      }
    } else {
      const r1 = processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
      if (r1.defenderHp <= 0) { battleResult.dead = 1; break; }

      if (triggeredEntry) {
        const result = processSkillAttack(
          playerSide, enemySide,
          triggeredEntry.skill, triggeredEntry.mods,
          connectChain, skillCtx, damCheck,
        );
        battleResult.log.push(result.log);
        battleResult.skillEvents.push(result.log);

        let connectResult = trySkillConnect(skillCtx, triggeredEntry.skill, triggeredEntry.mods, connectChain);
        while (connectResult.connected && enemySide.hp > 0) {
          const chainResult = processSkillAttack(
            playerSide, enemySide,
            connectResult.nextEntry.skill, connectResult.nextEntry.mods,
            connectResult.newChain, skillCtx, damCheck,
          );
          battleResult.log.push(chainResult.log);
          battleResult.skillEvents.push(chainResult.log);
          connectChain = connectResult.newChain;
          connectResult = trySkillConnect(
            skillCtx, connectResult.nextEntry.skill,
            connectResult.nextEntry.mods, connectChain,
          );
        }
        connectChain = triggeredEntry ? 1 : 0;
      } else {
        processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
        connectChain = 0;
      }

      if (enemySide.hp <= 0) { battleResult.win = 1; break; }
    }

    const healLog = applyEndOfRoundEffects(playerSide, skillCtx);
    if (healLog) battleResult.log.push(healLog);

    round++;
  }

  if (round > ROUND_LIMIT && playerSide.hp > 0 && enemySide.hp > 0) {
    battleResult.log.push({ type: "end", outcome: "draw" });
  } else if (battleResult.win) {
    battleResult.log.push({ type: "end", outcome: "win", winner: playerSide.name });
  } else if (battleResult.dead) {
    battleResult.log.push({ type: "end", outcome: "lose", winner: enemySide.name });
  }

  battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
  return battleResult;
}

// 內部輔助：已套用 innatePassives 後的無技能 loop
function _runLoopNoSkills(playerSide, enemySide, playerInnate, enemyInnate) {
  let round = 1;
  const battleResult = {
    log: [], win: 0, dead: 0,
    enemyName: enemySide.name, npcName: playerSide.name,
    initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
    finalHp: {},
    skillEvents: [],
  };

  while (playerSide.hp > 0 && enemySide.hp > 0 && round <= ROUND_LIMIT) {
    const npcInitRoll = roll.d66();
    const eneInitRoll = roll.d66();
    const npcAct = npcInitRoll + playerSide.stats.agi;
    const eneAct = eneInitRoll + enemySide.stats.agi;
    const playerFirst = playerInnate.initiative || npcAct >= eneAct;

    battleResult.log.push({
      type: "round", number: round,
      initiative: { npcRoll: npcInitRoll, eneRoll: eneInitRoll, npcAct, eneAct,
        forced: playerInnate.initiative || false },
    });

    if (playerFirst) {
      const r1 = processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
      if (r1.defenderHp <= 0) { battleResult.win = 1; break; }
      if (!r1.stunned && enemySide.hp > 0) {
        const r2 = processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
        if (r2.defenderHp <= 0) { battleResult.dead = 1; break; }
      } else if (r1.stunned) {
        battleResult.log.push({ type: "stun", target: enemySide.name });
      }
    } else {
      const r1 = processAttack(enemySide, playerSide, battleResult.log, enemyInnate, playerInnate);
      if (r1.defenderHp <= 0) { battleResult.dead = 1; break; }
      if (!r1.stunned && playerSide.hp > 0) {
        const r2 = processAttack(playerSide, enemySide, battleResult.log, playerInnate, enemyInnate);
        if (r2.defenderHp <= 0) { battleResult.win = 1; break; }
      } else if (r1.stunned) {
        battleResult.log.push({ type: "stun", target: playerSide.name });
      }
    }
    round++;
  }

  if (round > ROUND_LIMIT && playerSide.hp > 0 && enemySide.hp > 0) {
    battleResult.log.push({ type: "end", outcome: "draw" });
  } else if (battleResult.win) {
    battleResult.log.push({ type: "end", outcome: "win", winner: playerSide.name });
  } else if (battleResult.dead) {
    battleResult.log.push({ type: "end", outcome: "lose", winner: enemySide.name });
  }
  battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
  return battleResult;
}

module.exports = { runPveCombatLoop, runPveCombatLoopWithSkills };
