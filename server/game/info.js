const _ = require("lodash");
const type = require("./type.js");

module.exports = function (user) {
  const lose = _.get(user, "lost", 0);
  const name = _.get(user, "name", "");

  const items = [];
  if (_.get(user, "itemStock", 0) !== 0) {
    _.forEach(user.itemStock, function (value, key) {
      if (value && value.itemNum > 0) {
        items.push({
          index: key,
          name: value.itemName,
          level: value.itemLevel,
          levelText: type.ssrList(value.itemLevel),
          num: value.itemNum,
        });
      }
    });
  }

  const weapons = [];
  if (_.get(user, "weaponStock", 0) !== 0) {
    _.forEach(user.weaponStock, function (value, key) {
      let weaponName = value.weaponName;
      if (_.get(value, "buff", false)) {
        weaponName = weaponName + "+" + value.buff;
      }
      weapons.push({
        index: key,
        name: value.name,
        weaponName,
        atk: value.atk,
        def: value.def,
        agi: value.agi,
        cri: value.cri,
        hp: value.hp,
        durability: value.durability,
      });
    });
  }

  const wins = {};
  const winCategories = [
    "[優樹]Win",
    "[Hell]Win",
    "[Hard]Win",
    "[Normal]Win",
    "[Easy]Win",
  ];
  winCategories.forEach((cat) => {
    const val = _.get(user, cat, 0);
    if (val > 0) {
      wins[cat] = val;
    }
  });

  return {
    userId: _.get(user, "userId", ""),
    name,
    lost: lose,
    mineLevel: _.get(user, "mineLevel", 1),
    forgeLevel: _.get(user, "forgeLevel", 1),
    mineExp: _.get(user, "mine", 0),
    forgeExp: _.get(user, "forge", 0),
    items,
    weapons,
    wins,
    // Season 2 fields
    col: _.get(user, "col", 0),
    currentFloor: _.get(user, "currentFloor", 1),
    floorProgress: _.get(user, "floorProgress", { "1": { explored: 0, maxExplore: 5 } }),
    title: _.get(user, "title", null),
    availableTitles: _.get(user, "availableTitles", []),
    achievements: _.get(user, "achievements", []),
    stats: _.get(user, "stats", {}),
    bossContribution: _.get(user, "bossContribution", { totalDamage: 0, bossesDefeated: 0, mvpCount: 0 }),
    dailyLoginStreak: _.get(user, "dailyLoginStreak", 0),
    lastDailyClaimAt: _.get(user, "lastDailyClaimAt", null),
  };
};
