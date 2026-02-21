const _ = require("lodash");
const config = require("./config.js");
const roll = require("./roll");
const eneExample = require("./ene/list.json");

const { ROUND_LIMIT } = config.BATTLE;
const { BASE_HP: PVP_BASE_HP } = config.PVP;

function getEneFromList(enemyList) {
  const enemyRoll = Math.floor(Math.random() * 100) + 1;
  if (enemyRoll > config.ENEMY_PROBABILITY.YUKI) {
    return {
      category: "[優樹]",
      hp: roll.d66() * roll.d66(),
      atk: roll.d66(),
      def: roll.d6(),
      agi: roll.d6(),
      cri: roll.d66(),
    };
  } else if (enemyRoll > config.ENEMY_PROBABILITY.HELL) {
    return _.clone(enemyList[0]);
  } else if (enemyRoll > config.ENEMY_PROBABILITY.HARD) {
    return _.clone(enemyList[1]);
  } else if (enemyRoll > config.ENEMY_PROBABILITY.NORMAL) {
    return _.clone(enemyList[2]);
  } else {
    return _.clone(enemyList[3]);
  }
}

function getEneFromFloor(floorEnemies) {
  const enemyRoll = Math.floor(Math.random() * 100) + 1;
  let category;
  if (enemyRoll > config.ENEMY_PROBABILITY.YUKI) {
    const hellEnemies = floorEnemies.filter((e) => e.category === "[Hell]");
    if (hellEnemies.length > 0) {
      const base = hellEnemies[Math.floor(Math.random() * hellEnemies.length)];
      return {
        category: "[優樹]",
        hp: base.hp * 2,
        atk: base.atk + roll.d6(),
        def: base.def,
        agi: base.agi + 1,
        cri: Math.max(6, base.cri - 2),
      };
    }
    return {
      category: "[優樹]",
      hp: roll.d66() * roll.d66(),
      atk: roll.d66(),
      def: roll.d6(),
      agi: roll.d6(),
      cri: roll.d66(),
    };
  } else if (enemyRoll > config.ENEMY_PROBABILITY.HELL) {
    category = "[Hell]";
  } else if (enemyRoll > config.ENEMY_PROBABILITY.HARD) {
    category = "[Hard]";
  } else if (enemyRoll > config.ENEMY_PROBABILITY.NORMAL) {
    category = "[Normal]";
  } else {
    category = "[Easy]";
  }

  const categoryEnemies = floorEnemies.filter((e) => e.category === category);
  if (categoryEnemies.length > 0) {
    return _.clone(
      categoryEnemies[Math.floor(Math.random() * categoryEnemies.length)],
    );
  }
  return _.clone(floorEnemies[Math.floor(Math.random() * floorEnemies.length)]);
}

function hitCheck(atkAgi, defAgi) {
  const atkRoll = roll.d66();
  const defRoll = roll.d66();
  const atkAct = atkRoll + atkAgi;
  const defAct = defRoll + defAgi;
  if (atkAct === 12) {
    return { success: true, text: "擲出了大成功！", atkRoll, defRoll, atkAct, defAct };
  } else if (atkAct >= defAct) {
    return { success: true, text: "成功命中。", atkRoll, defRoll, atkAct, defAct };
  } else {
    return { success: false, text: "攻擊被閃過了。", atkRoll, defRoll, atkAct, defAct };
  }
}

function damCheck(atk, atkCri, def) {
  let atkDam = 0;
  let defSum = 0;
  let isCrit = false;
  let critCount = 0;
  let text = "";
  for (let i = 1; i <= atk; i++) {
    atkDam += roll.d66();
  }
  for (let i = 1; i <= def; i++) {
    defSum += roll.d66();
  }
  while (roll.d66() >= atkCri) {
    const criDam = roll.d66();
    text += `會心一擊！追加 ${criDam} 點傷害！`;
    atkDam += criDam;
    isCrit = true;
    critCount++;
  }
  let finalDamage = atkDam - defSum;
  if (finalDamage <= 0) {
    finalDamage = 1;
  }
  text += `最終造成 ${finalDamage} 點傷害。`;
  return { damage: finalDamage, isCrit, critCount, atkTotal: atkDam, defTotal: defSum, text };
}

function processAttack(attacker, defender, battleLog) {
  const hitCheckResult = hitCheck(attacker.stats.agi, defender.stats.agi);

  const attackLog = {
    attacker: attacker.name,
    defender: defender.name,
    hit: hitCheckResult.success,
    isCrit: false,
    damage: 0,
    rollText: hitCheckResult.text,
    hitDetail: {
      atkRoll: hitCheckResult.atkRoll,
      defRoll: hitCheckResult.defRoll,
      atkAct: hitCheckResult.atkAct,
      defAct: hitCheckResult.defAct,
    },
  };

  if (hitCheckResult.success) {
    const damageResult = damCheck(
      attacker.stats.atk,
      attacker.stats.cri,
      defender.stats.def,
    );
    const damageDealt = damageResult.damage;
    defender.hp -= damageDealt;

    attackLog.isCrit = damageResult.isCrit;
    attackLog.damage = damageDealt;
    attackLog.rollText += ` ${damageResult.text}`;
    attackLog.damDetail = {
      atkTotal: damageResult.atkTotal,
      defTotal: damageResult.defTotal,
      critCount: damageResult.critCount,
    };
  }

  battleLog.push(attackLog);
  return defender.hp;
}

// --- Shared helpers ---

/**
 * 構建 PvE 玩家/NPC 側戰鬥者物件
 * @param {object} weapon - 武器數據
 * @param {object} npc - NPC 資料（含 isHiredNpc, effectiveStats）
 * @param {object} titleMods - 稱號修正 { battleAtk, battleDef, battleAgi }
 * @returns {{ name, hp, stats: { atk, def, agi, cri } }}
 */
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
  };
}

/**
 * 構建 PvP 戰鬥者物件
 * @param {string} name
 * @param {object} weapon - { hp, atk, def, agi, cri }
 * @param {object} lvBonus - getBattleLevelBonus() 結果
 * @param {object} mods - { battleAtk, battleDef, battleAgi }
 * @returns {{ name, hp, maxHp, stats: { atk, def, agi, cri } }}
 */
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
  };
}

/**
 * PvE 戰鬥迴圈（pveBattle / pveBattleDirect 共用）
 */
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

/**
 * PvP 戰鬥迴圈（pvpBattle / pvpRawBattle 共用）
 */
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

// --- Skill-enhanced combat ---

const {
  buildSkillContext,
  applyPassiveSkills,
  checkConditionalSkills,
  rollSkillTrigger,
  processSkillAttack,
  applyEndOfRoundEffects,
} = require("./skill/skillCombat.js");
const { trySkillConnect } = require("./skill/skillConnect.js");

/**
 * 技能加持版 PvE 戰鬥迴圈
 * @param {object} playerSide - { name, hp, maxHp, stats }
 * @param {object} enemySide - { name, hp, stats }
 * @param {object|null} skillCtx - buildSkillContext() 的結果，null 則退回普通戰鬥
 * @returns {object} battleResult
 */
function runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx) {
  if (!skillCtx || skillCtx.skills.length === 0) {
    return runPveCombatLoop(playerSide, enemySide);
  }

  // 儲存 maxHp
  playerSide.maxHp = playerSide.hp;
  enemySide.maxHp = enemySide.hp;

  // Phase 0: 套用被動技能
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
    // 條件觸發檢查
    checkConditionalSkills(playerSide, skillCtx);

    // 機率觸發判定
    const triggeredEntry = rollSkillTrigger(skillCtx);

    // 先手判定
    let playerFirst;
    let initData = null;
    if (triggeredEntry) {
      const { parseSkillEffects } = require("./skill/skillCombat.js");
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
      // 玩家方先攻
      if (triggeredEntry) {
        const result = processSkillAttack(
          playerSide, enemySide,
          triggeredEntry.skill, triggeredEntry.mods,
          connectChain, skillCtx, damCheck,
        );
        battleResult.log.push(result.log);
        battleResult.skillEvents.push(result.log);

        // Skill Connect
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

      if (enemySide.hp <= 0) {
        battleResult.win = 1;
        break;
      }

      // 敵方反擊
      if (enemySide.hp > 0) {
        processAttack(enemySide, playerSide, battleResult.log);
        if (playerSide.hp <= 0) {
          battleResult.dead = 1;
          break;
        }
      }
    } else {
      // 敵方先攻
      processAttack(enemySide, playerSide, battleResult.log);
      if (playerSide.hp <= 0) {
        battleResult.dead = 1;
        break;
      }

      // 玩家方攻擊
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

      if (enemySide.hp <= 0) {
        battleResult.win = 1;
        break;
      }
    }

    // 回合結束效果
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

/**
 * 技能加持版 PvP 戰鬥迴圈
 */
function runPvpCombatLoopWithSkills(attacker, defender, duelMode, atkSkillCtx, defSkillCtx) {
  if ((!atkSkillCtx || atkSkillCtx.skills.length === 0) &&
      (!defSkillCtx || defSkillCtx.skills.length === 0)) {
    return runPvpCombatLoop(attacker, defender, duelMode);
  }

  // 套用被動
  if (atkSkillCtx) applyPassiveSkills(attacker, atkSkillCtx);
  if (defSkillCtx) applyPassiveSkills(defender, defSkillCtx);

  let round = 1;
  const battleLog = [];
  const detailLog = [];
  const skillEvents = [];
  let winnerSide = null;

  while (attacker.hp > 0 && defender.hp > 0 && round <= ROUND_LIMIT) {
    battleLog.push(`\n**第 ${round} 回合**`);

    // 條件觸發
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

    // 回合結束效果
    if (atkSkillCtx) applyEndOfRoundEffects(attacker, atkSkillCtx);
    if (defSkillCtx) applyEndOfRoundEffects(defender, defSkillCtx);

    round++;
  }

  if (!winnerSide) {
    winnerSide = attacker.hp >= defender.hp ? "attacker" : "defender";
  }

  return { battleLog, detailLog, winnerSide, skillEvents };
}

// --- Battle module ---

const battleModule = {};

battleModule.pveBattle = async function (weapon, npc, npcNameList, floorEnemies, titleMods = {}) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);

  const enemyData = floorEnemies
    ? getEneFromFloor(floorEnemies)
    : getEneFromList(eneExample);
  const enemyName =
    npcNameList[Math.floor(Math.random() * npcNameList.length)].name;
  const enemySide = {
    name: `${enemyData.category}${enemyData.name || enemyName}`,
    hp: enemyData.hp,
    stats: {
      atk: enemyData.atk,
      def: enemyData.def,
      agi: enemyData.agi,
      cri: enemyData.cri,
    },
  };

  const battleResult = runPveCombatLoop(playerSide, enemySide);
  battleResult.category = enemyData.category;
  return battleResult;
};

/**
 * Season 5 PVP 決鬥戰鬥
 */
battleModule.pvpBattle = async function (
  attackerData,
  attackerWeapon,
  defenderData,
  defenderWeapon,
  attackerMods = {},
  defenderMods = {},
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
    log: battleLog,
    detailLog,
    winner,
    loser,
    duelMode,
    winnerHpRemaining: winnerSide === "attacker" ? attacker.hp : defender.hp,
    loserHpRemaining: winnerSide === "attacker" ? defender.hp : attacker.hp,
    attackerHp: attacker.hp,
    defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp,
    defenderMaxHp: defender.maxHp,
  };
};

/**
 * 通用 PVP 戰鬥（接受預計算的雙方數據，適用於玩家 vs NPC 等場景）
 */
battleModule.pvpRawBattle = function (atkFighter, defFighter, duelMode = "half_loss") {
  const attacker = {
    name: atkFighter.name,
    hp: atkFighter.hp,
    maxHp: atkFighter.hp,
    stats: {
      atk: Math.max(1, atkFighter.atk),
      def: Math.max(0, atkFighter.def),
      agi: Math.max(1, atkFighter.agi),
      cri: atkFighter.cri || 10,
    },
  };

  const defender = {
    name: defFighter.name,
    hp: defFighter.hp,
    maxHp: defFighter.hp,
    stats: {
      atk: Math.max(1, defFighter.atk),
      def: Math.max(0, defFighter.def),
      agi: Math.max(1, defFighter.agi),
      cri: defFighter.cri || 10,
    },
  };

  const { battleLog, detailLog, winnerSide } = runPvpCombatLoop(attacker, defender, duelMode);

  return {
    log: battleLog,
    detailLog,
    winnerSide,
    attackerHp: attacker.hp,
    defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp,
    defenderMaxHp: defender.maxHp,
  };
};

/**
 * 直接傳入敵人數據的 PvE 戰鬥（不走 getEneFromFloor 隨機選擇）
 */
battleModule.pveBattleDirect = async function (weapon, npc, enemyData, titleMods = {}) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);

  const enemySide = {
    name: enemyData.name,
    hp: enemyData.hp,
    stats: {
      atk: enemyData.atk,
      def: enemyData.def,
      agi: enemyData.agi,
      cri: enemyData.cri,
    },
  };

  const battleResult = runPveCombatLoop(playerSide, enemySide);
  battleResult.category = enemyData.category || "[Event]";
  return battleResult;
};

/**
 * 技能加持版 PvE 戰鬥
 */
battleModule.pveBattleWithSkills = async function (weapon, npc, npcNameList, floorEnemies, titleMods = {}, skillCtx = null) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);

  const enemyData = floorEnemies
    ? getEneFromFloor(floorEnemies)
    : getEneFromList(eneExample);
  const enemyName =
    npcNameList[Math.floor(Math.random() * npcNameList.length)].name;
  const enemySide = {
    name: `${enemyData.category}${enemyData.name || enemyName}`,
    hp: enemyData.hp,
    stats: {
      atk: enemyData.atk,
      def: enemyData.def,
      agi: enemyData.agi,
      cri: enemyData.cri,
    },
  };

  const battleResult = runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx);
  battleResult.category = enemyData.category;
  return battleResult;
};

/**
 * 技能加持版 PvP 戰鬥
 */
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
    log: battleLog,
    detailLog,
    winner,
    loser,
    duelMode,
    winnerHpRemaining: winnerSide === "attacker" ? attacker.hp : defender.hp,
    loserHpRemaining: winnerSide === "attacker" ? defender.hp : attacker.hp,
    attackerHp: attacker.hp,
    defenderHp: defender.hp,
    attackerMaxHp: attacker.maxHp,
    defenderMaxHp: defender.maxHp,
    skillEvents: skillEvents || [],
  };
};

/**
 * 技能加持版直接 PvE 戰鬥
 */
battleModule.pveBattleDirectWithSkills = async function (weapon, npc, enemyData, titleMods = {}, skillCtx = null) {
  const playerSide = buildPvePlayerSide(weapon, npc, titleMods);
  const enemySide = {
    name: enemyData.name,
    hp: enemyData.hp,
    stats: {
      atk: enemyData.atk,
      def: enemyData.def,
      agi: enemyData.agi,
      cri: enemyData.cri,
    },
  };

  const battleResult = runPveCombatLoopWithSkills(playerSide, enemySide, skillCtx);
  battleResult.category = enemyData.category || "[Event]";
  return battleResult;
};

battleModule.hitCheck = hitCheck;
battleModule.damCheck = damCheck;
battleModule.buildPvpFighter = buildPvpFighter;
battleModule.buildSkillContext = buildSkillContext;

module.exports = battleModule;
