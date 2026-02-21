const config = require("../config.js");
const roll = require("../roll");
const eneExample = require("../ene/list.json");

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
    return { ...enemyList[0] };
  } else if (enemyRoll > config.ENEMY_PROBABILITY.HARD) {
    return { ...enemyList[1] };
  } else if (enemyRoll > config.ENEMY_PROBABILITY.NORMAL) {
    return { ...enemyList[2] };
  } else {
    return { ...enemyList[3] };
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
    return { ...categoryEnemies[Math.floor(Math.random() * categoryEnemies.length)] };
  }
  return { ...floorEnemies[Math.floor(Math.random() * floorEnemies.length)] };
}

module.exports = { getEneFromList, getEneFromFloor, eneExample };
