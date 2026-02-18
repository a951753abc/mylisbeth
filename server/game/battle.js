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

battleModule.pveBattle = async function (weapon, npc, npcNameList, floorEnemies) {
  const roundLimit = 5;
  let round = 1;

  const playerSide = {
    name: npc.name,
    hp: npc.hp + weapon.hp,
    stats: {
      atk: weapon.atk,
      def: weapon.def,
      agi: weapon.agi,
      cri: weapon.cri,
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

battleModule.pvpBattle = async function (
  attackerData,
  attackerWeapon,
  defenderData,
  defenderWeapon,
) {
  const roundLimit = 5;
  let round = 1;
  const battleLog = [];

  const attacker = {
    name: attackerData.name,
    hp: 100 + (attackerWeapon.hp || 0),
    stats: { ...attackerWeapon },
  };
  const defender = {
    name: defenderData.name,
    hp: 100 + (defenderWeapon.hp || 0),
    stats: { ...defenderWeapon },
  };

  while (attacker.hp > 0 && defender.hp > 0 && round <= roundLimit) {
    battleLog.push(`\n**第 ${round} 回合**`);
    const atkAct = roll.d66() + attacker.stats.agi;
    const defAct = roll.d66() + defender.stats.agi;

    if (atkAct >= defAct) {
      const dmg1 = damCheck(
        attacker.stats.atk,
        attacker.stats.cri,
        defender.stats.def,
      ).damage;
      defender.hp -= dmg1;
      battleLog.push(
        `${attacker.name} 對 ${defender.name} 造成了 ${dmg1} 點傷害。`,
      );
      if (defender.hp <= 0) break;

      const dmg2 = damCheck(
        defender.stats.atk,
        defender.stats.cri,
        attacker.stats.def,
      ).damage;
      attacker.hp -= dmg2;
      battleLog.push(
        `${defender.name} 對 ${attacker.name} 造成了 ${dmg2} 點傷害。`,
      );
    } else {
      const dmg1 = damCheck(
        defender.stats.atk,
        defender.stats.cri,
        attacker.stats.def,
      ).damage;
      attacker.hp -= dmg1;
      battleLog.push(
        `${defender.name} 對 ${attacker.name} 造成了 ${dmg1} 點傷害。`,
      );
      if (attacker.hp <= 0) break;

      const dmg2 = damCheck(
        attacker.stats.atk,
        attacker.stats.cri,
        defender.stats.def,
      ).damage;
      defender.hp -= dmg2;
      battleLog.push(
        `${attacker.name} 對 ${defender.name} 造成了 ${dmg2} 點傷害。`,
      );
    }
    round++;
  }

  const winner = attacker.hp > defender.hp ? attackerData : defenderData;
  return { log: battleLog, winner };
};

module.exports = battleModule;
