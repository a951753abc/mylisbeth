const _ = require("lodash");
const type = require("./type.js");
const { calculateRarity } = require("./weapon/rarity.js");
const config = require("./config.js");

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
      const rarity = value.rarity
        ? {
            id: value.rarity,
            label: value.rarityLabel,
            color: value.rarityColor,
          }
        : calculateRarity(value);
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
        rarity: rarity.id,
        rarityLabel: rarity.label,
        rarityColor: rarity.color,
        totalScore:
          rarity.totalScore ||
          (value.atk || 0) +
            (value.def || 0) +
            (value.agi || 0) +
            (value.cri || 0) +
            (value.hp || 0) +
            (value.durability || 0),
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

  // Season 3: NPC 資料（前端只需要展示用的精簡版）
  const hiredNpcs = (_.get(user, "hiredNpcs", [])).map((npc) => ({
    npcId: npc.npcId,
    name: npc.name,
    quality: npc.quality,
    baseStats: npc.baseStats,
    condition: npc.condition ?? 100,
    level: npc.level ?? 1,
    exp: npc.exp ?? 0,
    equippedWeaponIndex: npc.equippedWeaponIndex ?? null,
    weeklyCost: npc.weeklyCost,
  }));

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
    floorProgress: _.get(user, "floorProgress", {
      1: { explored: 0, maxExplore: 5 },
    }),
    title: _.get(user, "title", null),
    availableTitles: _.get(user, "availableTitles", []),
    achievements: _.get(user, "achievements", []),
    stats: _.get(user, "stats", {}),
    bossContribution: _.get(user, "bossContribution", {
      totalDamage: 0,
      bossesDefeated: 0,
      mvpCount: 0,
    }),
    dailyLoginStreak: _.get(user, "dailyLoginStreak", 0),
    lastDailyClaimAt: _.get(user, "lastDailyClaimAt", null),
    // Season 3 fields
    hiredNpcs,
    debt: _.get(user, "debt", 0),
    isInDebt: _.get(user, "isInDebt", false),
    debtCycleCount: _.get(user, "debtCycleCount", 0),
    nextSettlementAt: _.get(user, "nextSettlementAt", null),
    gameCreatedAt: _.get(user, "gameCreatedAt", null),
    // Season 3: 玩家體力值
    stamina: _.get(user, "stamina", config.STAMINA.MAX),
    maxStamina: _.get(user, "maxStamina", config.STAMINA.MAX),
    lastStaminaRegenAt: _.get(user, "lastStaminaRegenAt", null),
    // Season 5: 戰鬥等級 & PVP
    battleLevel: _.get(user, "battleLevel", 1),
    battleExp: _.get(user, "battleExp", 0),
    isPK: _.get(user, "isPK", false),
    pkKills: _.get(user, "pkKills", 0),
    defenseWeaponIndex: _.get(user, "defenseWeaponIndex", 0),
  };
};
