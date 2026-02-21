const config = require("../config.js");
const roll = require("../roll");
const { processAttack, damCheck } = require("./combatCalc.js");
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
    const npcInitRoll = roll.d66();
    const eneInitRoll = roll.d66();
    const npcAct = npcInitRoll + playerSide.stats.agi;
    const eneAct = eneInitRoll + enemySide.stats.agi;
    battleResult.log.push({
      type: "round", number: round,
      initiative: { npcRoll: npcInitRoll, eneRoll: eneInitRoll, npcAct, eneAct },
    });

    if (npcAct >= eneAct) {
      if (processAttack(playerSide, enemySide, battleResult.log) <= 0) {
        battleResult.win = 1;
        break;
      }
      if (enemySide.hp > 0 && processAttack(enemySide, playerSide, battleResult.log) <= 0) {
        battleResult.dead = 1;
        break;
      }
    } else {
      if (processAttack(enemySide, playerSide, battleResult.log) <= 0) {
        battleResult.dead = 1;
        break;
      }
      if (playerSide.hp > 0 && processAttack(playerSide, enemySide, battleResult.log) <= 0) {
        battleResult.win = 1;
        break;
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
  if (!skillCtx || skillCtx.skills.length === 0) {
    return runPveCombatLoop(playerSide, enemySide);
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
    if (triggeredEntry) {
      const { parseSkillEffects } = require("../skill/skillCombat.js");
      const effects = parseSkillEffects(triggeredEntry.skill, triggeredEntry.mods);
      if (effects.initiative) {
        playerFirst = true;
        initData = { forced: true, skill: triggeredEntry.skill.nameCn };
      }
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
          battleResult.log.push({ type: "stun", target: enemySide.name });
        }
      } else {
        processAttack(playerSide, enemySide, battleResult.log);
        connectChain = 0;
      }

      if (enemySide.hp <= 0) { battleResult.win = 1; break; }

      if (enemySide.hp > 0) {
        processAttack(enemySide, playerSide, battleResult.log);
        if (playerSide.hp <= 0) { battleResult.dead = 1; break; }
      }
    } else {
      processAttack(enemySide, playerSide, battleResult.log);
      if (playerSide.hp <= 0) { battleResult.dead = 1; break; }

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
        processAttack(playerSide, enemySide, battleResult.log);
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

module.exports = { runPveCombatLoop, runPveCombatLoopWithSkills };
