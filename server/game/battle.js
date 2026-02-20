const _ = require("lodash");
const config = require("./config.js");
const roll = require("./roll");
const eneExample = require("./ene/list.json");

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
    // 優樹: use highest stats from floor or random high stats
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
  // Fallback to any enemy
  return _.clone(floorEnemies[Math.floor(Math.random() * floorEnemies.length)]);
}

function hitCheck(atkAgi, defAgi) {
  const atkAct = roll.d66() + atkAgi;
  const defAct = roll.d66() + defAgi;
  if (atkAct === 12) {
    return { success: true, text: "擲出了大成功！" };
  } else if (atkAct >= defAct) {
    return { success: true, text: "成功命中。" };
  } else {
    return { success: false, text: "攻擊被閃過了。" };
  }
}

function damCheck(atk, atkCri, def) {
  let atkDam = 0;
  let defSum = 0;
  let isCrit = false;
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
  }
  let finalDamage = atkDam - defSum;
  if (finalDamage <= 0) {
    finalDamage = 1;
  }
  text += `最終造成 ${finalDamage} 點傷害。`;
  return { damage: finalDamage, isCrit, text };
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
  }

  battleLog.push(attackLog);
  return defender.hp;
}

const battleModule = {};

battleModule.pveBattle = async function (weapon, npc, npcNameList, floorEnemies, titleMods = {}) {
  const roundLimit = 5;
  let round = 1;

  // 若為已雇用 NPC（含 baseStats + condition），套用素質加成
  let playerHp = (npc.hp || 0) + (weapon.hp || 0);
  let playerAtk = weapon.atk || 0;
  let playerDef = weapon.def || 0;
  let playerAgi = weapon.agi || 0;
  let playerCri = weapon.cri || 10;

  if (npc.isHiredNpc && npc.effectiveStats) {
    const es = npc.effectiveStats;
    playerHp = es.hp + (weapon.hp || 0);
    playerAtk = (weapon.atk || 0) + Math.floor(es.atk * 0.5);
    playerDef = (weapon.def || 0) + Math.floor(es.def * 0.5);
    playerAgi = Math.max(weapon.agi || 0, es.agi);
    playerCri = weapon.cri || 10;
  }

  // 套用稱號戰鬥屬性修正
  if (titleMods.battleAtk && titleMods.battleAtk !== 1) {
    playerAtk = Math.max(1, Math.round(playerAtk * titleMods.battleAtk));
  }
  if (titleMods.battleDef && titleMods.battleDef !== 1) {
    playerDef = Math.max(0, Math.round(playerDef * titleMods.battleDef));
  }
  if (titleMods.battleAgi && titleMods.battleAgi !== 1) {
    playerAgi = Math.max(1, Math.round(playerAgi * titleMods.battleAgi));
  }

  const playerSide = {
    name: npc.name,
    hp: playerHp,
    stats: {
      atk: playerAtk,
      def: playerDef,
      agi: playerAgi,
      cri: playerCri,
    },
  };

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

  const battleResult = {
    log: [],
    win: 0,
    dead: 0,
    category: enemyData.category,
    enemyName: enemySide.name,
    npcName: playerSide.name,
    initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
    finalHp: {},
  };

  while (playerSide.hp > 0 && enemySide.hp > 0 && round <= roundLimit) {
    battleResult.log.push({ type: "round", number: round });
    const npcAct = roll.d66() + playerSide.stats.agi;
    const eneAct = roll.d66() + enemySide.stats.agi;

    if (npcAct >= eneAct) {
      if (
        processAttack(playerSide, enemySide, battleResult.log) <= 0
      ) {
        battleResult.win = 1;
        break;
      }
      if (
        enemySide.hp > 0 &&
        processAttack(enemySide, playerSide, battleResult.log) <= 0
      ) {
        battleResult.dead = 1;
        break;
      }
    } else {
      if (
        processAttack(enemySide, playerSide, battleResult.log) <= 0
      ) {
        battleResult.dead = 1;
        break;
      }
      if (
        playerSide.hp > 0 &&
        processAttack(playerSide, enemySide, battleResult.log) <= 0
      ) {
        battleResult.win = 1;
        break;
      }
    }
    round++;
  }

  if (round > roundLimit && playerSide.hp > 0 && enemySide.hp > 0) {
    battleResult.log.push({ type: "end", outcome: "draw" });
  } else if (battleResult.win) {
    battleResult.log.push({
      type: "end",
      outcome: "win",
      winner: playerSide.name,
    });
  } else if (battleResult.dead) {
    battleResult.log.push({
      type: "end",
      outcome: "lose",
      winner: enemySide.name,
    });
  }

  battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
  return battleResult;
};

/**
 * Season 5 PVP 決鬥戰鬥
 * @param {object} attackerData - 攻擊方 user document
 * @param {object} attackerWeapon - 攻擊方武器
 * @param {object} defenderData - 防守方 user document
 * @param {object} defenderWeapon - 防守方武器
 * @param {object} attackerMods - 攻擊方 { battleAtk, battleDef, battleAgi } 乘數
 * @param {object} defenderMods - 防守方 { battleAtk, battleDef, battleAgi } 乘數
 * @param {string} duelMode - "first_strike" | "half_loss" | "total_loss"
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
  const roundLimit = 5;
  let round = 1;
  const battleLog = [];

  const { getBattleLevelBonus } = require("./battleLevel.js");

  // 攻擊方數值
  const atkLvBonus = getBattleLevelBonus(attackerData.battleLevel || 1);
  const atkMaxHp = 100 + atkLvBonus.hpBonus + (attackerWeapon.hp || 0);
  const attacker = {
    name: attackerData.name,
    hp: atkMaxHp,
    maxHp: atkMaxHp,
    stats: {
      atk: Math.max(1, Math.round((attackerWeapon.atk || 0) * atkLvBonus.atkMult * (attackerMods.battleAtk || 1))),
      def: Math.max(0, Math.round((attackerWeapon.def || 0) * atkLvBonus.defMult * (attackerMods.battleDef || 1))),
      agi: Math.max(1, Math.round((attackerWeapon.agi || 0) * atkLvBonus.agiMult * (attackerMods.battleAgi || 1))),
      cri: attackerWeapon.cri || 10,
    },
  };

  // 防守方數值（對稱）
  const defLvBonus = getBattleLevelBonus(defenderData.battleLevel || 1);
  const defMaxHp = 100 + defLvBonus.hpBonus + (defenderWeapon.hp || 0);
  const defender = {
    name: defenderData.name,
    hp: defMaxHp,
    maxHp: defMaxHp,
    stats: {
      atk: Math.max(1, Math.round((defenderWeapon.atk || 0) * defLvBonus.atkMult * (defenderMods.battleAtk || 1))),
      def: Math.max(0, Math.round((defenderWeapon.def || 0) * defLvBonus.defMult * (defenderMods.battleDef || 1))),
      agi: Math.max(1, Math.round((defenderWeapon.agi || 0) * defLvBonus.agiMult * (defenderMods.battleAgi || 1))),
      cri: defenderWeapon.cri || 10,
    },
  };

  let winnerSide = null; // "attacker" | "defender"

  while (attacker.hp > 0 && defender.hp > 0 && round <= roundLimit) {
    battleLog.push(`\n**第 ${round} 回合**`);
    const atkAct = roll.d66() + attacker.stats.agi;
    const defAct = roll.d66() + defender.stats.agi;

    const firstSide = atkAct >= defAct ? "attacker" : "defender";
    const order = firstSide === "attacker"
      ? [{ src: attacker, dst: defender, srcKey: "attacker", dstKey: "defender" },
         { src: defender, dst: attacker, srcKey: "defender", dstKey: "attacker" }]
      : [{ src: defender, dst: attacker, srcKey: "defender", dstKey: "attacker" },
         { src: attacker, dst: defender, srcKey: "attacker", dstKey: "defender" }];

    for (const { src, dst, srcKey, dstKey } of order) {
      if (dst.hp <= 0) break;
      const dmgResult = damCheck(src.stats.atk, src.stats.cri, dst.stats.def);
      dst.hp -= dmgResult.damage;
      battleLog.push(`${src.name} 對 ${dst.name} 造成了 ${dmgResult.damage} 點傷害。`);

      // First Strike 模式：單擊造成 >= 10% maxHP 即勝
      if (duelMode === "first_strike" && dmgResult.damage >= dst.maxHp * 0.10) {
        winnerSide = srcKey;
        break;
      }
      // Half Loss 模式：對方 HP ≤ 50% maxHP
      if (duelMode === "half_loss" && dst.hp <= dst.maxHp * 0.50) {
        winnerSide = srcKey;
        break;
      }
      // Total Loss：HP ≤ 0
      if (dst.hp <= 0) {
        winnerSide = srcKey;
        break;
      }
    }

    if (winnerSide) break;
    round++;
  }

  // 超過回合上限：HP 較高者勝
  if (!winnerSide) {
    winnerSide = attacker.hp >= defender.hp ? "attacker" : "defender";
  }

  const winner = winnerSide === "attacker" ? attackerData : defenderData;
  const loser = winnerSide === "attacker" ? defenderData : attackerData;

  return {
    log: battleLog,
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
 * 直接傳入敵人數據的 PvE 戰鬥（不走 getEneFromFloor 隨機選擇）
 * @param {object} weapon - 玩家武器
 * @param {object} npc - 玩家/NPC 資料（同 pveBattle 格式）
 * @param {object} enemyData - { name, hp, atk, def, agi, cri }
 * @param {object} titleMods - 稱號修正
 */
battleModule.pveBattleDirect = async function (weapon, npc, enemyData, titleMods = {}) {
  const roundLimit = 5;
  let round = 1;

  let playerHp = (npc.hp || 0) + (weapon.hp || 0);
  let playerAtk = weapon.atk || 0;
  let playerDef = weapon.def || 0;
  let playerAgi = weapon.agi || 0;
  let playerCri = weapon.cri || 10;

  if (npc.isHiredNpc && npc.effectiveStats) {
    const es = npc.effectiveStats;
    playerHp = es.hp + (weapon.hp || 0);
    playerAtk = (weapon.atk || 0) + Math.floor(es.atk * 0.5);
    playerDef = (weapon.def || 0) + Math.floor(es.def * 0.5);
    playerAgi = Math.max(weapon.agi || 0, es.agi);
    playerCri = weapon.cri || 10;
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

  const playerSide = {
    name: npc.name,
    hp: playerHp,
    stats: { atk: playerAtk, def: playerDef, agi: playerAgi, cri: playerCri },
  };

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

  const battleResult = {
    log: [],
    win: 0,
    dead: 0,
    category: enemyData.category || "[Event]",
    enemyName: enemySide.name,
    npcName: playerSide.name,
    initialHp: { npc: playerSide.hp, enemy: enemySide.hp },
    finalHp: {},
  };

  while (playerSide.hp > 0 && enemySide.hp > 0 && round <= roundLimit) {
    battleResult.log.push({ type: "round", number: round });
    const npcAct = roll.d66() + playerSide.stats.agi;
    const eneAct = roll.d66() + enemySide.stats.agi;

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

  if (round > roundLimit && playerSide.hp > 0 && enemySide.hp > 0) {
    battleResult.log.push({ type: "end", outcome: "draw" });
  } else if (battleResult.win) {
    battleResult.log.push({ type: "end", outcome: "win", winner: playerSide.name });
  } else if (battleResult.dead) {
    battleResult.log.push({ type: "end", outcome: "lose", winner: enemySide.name });
  }

  battleResult.finalHp = { npc: playerSide.hp, enemy: enemySide.hp };
  return battleResult;
};

battleModule.hitCheck = hitCheck;
battleModule.damCheck = damCheck;

module.exports = battleModule;
