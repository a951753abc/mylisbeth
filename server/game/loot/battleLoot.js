/**
 * 戰利品共用邏輯 — 從 adv.js / soloAdv.js 提取
 */
const roll = require("../roll.js");
const db = require("../../db.js");
const config = require("../config.js");
const itemCache = require("../cache/itemCache.js");

const BATTLE_MINE_LIST = [
  { category: "[優樹]", list: [{ itemLevel: 3, less: 100, text: "★★★" }] },
  {
    category: "[Hell]",
    list: [
      { itemLevel: 3, less: 40, text: "★★★" },
      { itemLevel: 2, less: 100, text: "★★" },
    ],
  },
  {
    category: "[Hard]",
    list: [
      { itemLevel: 3, less: 30, text: "★★★" },
      { itemLevel: 2, less: 100, text: "★★" },
    ],
  },
  {
    category: "[Normal]",
    list: [
      { itemLevel: 3, less: 20, text: "★★★" },
      { itemLevel: 2, less: 100, text: "★★" },
    ],
  },
  {
    category: "[Easy]",
    list: [
      { itemLevel: 3, less: 10, text: "★★★" },
      { itemLevel: 2, less: 100, text: "★★" },
    ],
  },
];

/**
 * 根據樓層篩選可掉落素材池
 */
function getFloorMineList(allItems, floorNumber) {
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

/**
 * 戰鬥勝利後的素材掉落
 */
async function mineBattle(user, category, floorNumber) {
  const allItems = itemCache.getAll();
  const floorItems = getFloorMineList(allItems, floorNumber);
  const mine = { ...floorItems[Math.floor(Math.random() * floorItems.length)] };

  const list = BATTLE_MINE_LIST.find((entry) => entry.category === category);
  if (!list || !list.list) {
    console.error(`錯誤：在 battleMineList 中找不到類別為 "${category}" 的掉落設定。`);
    return "";
  }

  const thisItemLevelList = list.list;
  let itemLevel = 0;
  let levelCount = 0;
  while (itemLevel === 0) {
    if (levelCount >= thisItemLevelList.length) break;
    if (roll.d100Check(thisItemLevelList[levelCount].less)) {
      itemLevel = thisItemLevelList[levelCount].itemLevel;
    }
    levelCount++;
  }
  if (itemLevel === 0) return "";

  mine.level = thisItemLevelList[levelCount - 1];
  await db.saveItemToUser(user.userId, mine);
  return "獲得[" + mine.level.text + "]" + mine.name + "\n";
}

module.exports = { mineBattle, getFloorMineList };
