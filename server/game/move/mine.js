const _ = require("lodash");
const roll = require("../roll.js");
const level = require("../level");
const db = require("../../db.js");
const config = require("../config.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getModifier } = require("../title/titleModifier.js");

const drawLevelList = [
  [
    { itemLevel: 3, less: 4, text: "★★★" },
    { itemLevel: 2, less: 20, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  [
    { itemLevel: 3, less: 6, text: "★★★" },
    { itemLevel: 2, less: 24, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  [
    { itemLevel: 3, less: 8, text: "★★★" },
    { itemLevel: 2, less: 24, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
];

const itemLimit = 5;

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  let text = "";
  const mineLevel = _.get(user, "mineLevel", 1);
  const filter = [
    { $match: { userId: user.userId } },
    { $project: { values: { $sum: "$itemStock.itemNum" }, name: 1 } },
  ];
  const item = await db.aggregate("user", filter);
  const nowItems = itemLimit + mineLevel;
  if (item[0].values >= nowItems) {
    return {
      error:
        "無法繼續挖礦 \n 目前素材數:" +
        item[0].values +
        " \n 素材儲存上限 " +
        nowItems,
    };
  }

  const currentFloor = user.currentFloor || 1;
  const allItems = await db.find("item", {});
  const minePool = getFloorMinePool(allItems, currentFloor);

  const starMod = getModifier(user.title || null, "mineStarChance");
  let count = item[0].values;
  while (nowItems > count) {
    const mine = _.clone(minePool[Math.floor(Math.random() * minePool.length)]);
    mine.level = drawItemLevel(mineLevel, starMod);
    text += "獲得[" + mine.level.text + "]" + mine.name + "\n";
    await db.saveItemToUser(user.userId, mine);
    count++;
  }
  text += await level(cmd[1], user);

  await increment(user.userId, "totalMines");
  await checkAndAward(user.userId);

  return { text };
};

function getFloorMinePool(allItems, floorNumber) {
  const floorMaterials = config.FLOOR_MATERIAL_GROUPS;
  const floorSpecificIds = [];
  for (const group of floorMaterials) {
    if (group.floors.includes(floorNumber)) {
      floorSpecificIds.push(...group.itemIds);
    }
  }

  const baseItems = allItems.filter((item) => item.baseItem === true || !item.floorItem);
  const floorItems = allItems.filter((item) => floorSpecificIds.includes(item.itemId));

  const pool = [...baseItems, ...floorItems];
  return pool.length > 0 ? pool : allItems;
}

function drawItemLevel(level, starMod = 1.0) {
  const baseList = drawLevelList[Math.min(level - 1, drawLevelList.length - 1)];
  // 套用三星機率修正（僅調整第一格，即 ★★★ 的門檻）
  const thisItemLevelList = baseList.map((entry, i) =>
    i === 0
      ? { ...entry, less: Math.min(99, Math.max(1, Math.round(entry.less * starMod))) }
      : entry,
  );
  let itemLevel = 0;
  let count = 0;
  while (itemLevel === 0) {
    if (roll.d100Check(thisItemLevelList[count].less)) {
      itemLevel = thisItemLevelList[count].itemLevel;
    }
    count++;
  }
  return thisItemLevelList[count - 1];
}
