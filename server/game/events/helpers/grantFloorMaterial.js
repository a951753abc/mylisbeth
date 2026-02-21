const config = require("../../config.js");
const db = require("../../../db.js");
const itemCache = require("../../cache/itemCache.js");

/**
 * 從指定樓層素材池隨機取得一個素材並存入玩家背包
 * @param {string} userId
 * @param {number} floor - 目標樓層
 * @param {number} starLevel - 星級 (1-3)
 * @returns {{ name: string, level: string } | null}
 */
async function grantFloorMaterial(userId, floor, starLevel) {
  const allItems = itemCache.getAll();
  const floorSpecificIds = config.FLOOR_MATERIAL_GROUPS
    .filter((g) => g.floors.includes(floor))
    .flatMap((g) => g.itemIds);

  const floorItems = allItems.filter((item) => floorSpecificIds.includes(item.itemId));
  const pool = floorItems.length > 0
    ? floorItems
    : allItems.filter((item) => item.baseItem === true || !item.floorItem);
  if (pool.length === 0) return null;

  const mine = { ...pool[Math.floor(Math.random() * pool.length)] };
  const levelText = "\u2605".repeat(starLevel);
  mine.level = { itemLevel: starLevel, text: levelText };
  await db.saveItemToUser(userId, mine);
  return { name: mine.name, level: levelText };
}

module.exports = grantFloorMaterial;
