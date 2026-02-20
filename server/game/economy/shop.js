const db = require("../../db.js");
const { d6 } = require("../roll.js");
const { awardCol } = require("./col.js");
const { calculateRarity } = require("../weapon/rarity.js");
const { destroyWeapon } = require("../weapon/weapon.js");
const config = require("../config.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getModifier } = require("../title/titleModifier.js");

/**
 * 出售素材（以 itemStock 陣列索引定位）
 * 定價公式：d6 * 星級 Col / 單位
 * @param {string} userId
 * @param {number} itemIndex - itemStock 陣列索引
 * @param {number} quantity  - 欲出售數量
 * @returns {Promise<{success?: boolean, error?: string, ...}>}
 */
async function sellItem(userId, itemIndex, quantity) {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    return { error: "無效的素材索引" };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "數量必須為正整數" };
  }

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };
  if (user.isPK) return { error: "你是紅名玩家，城鎮商店拒絕為你服務。" };

  const item = (user.itemStock || [])[itemIndex];
  if (!item) return { error: "找不到該素材" };
  if (item.itemNum < quantity) {
    return { error: `素材數量不足（擁有 ${item.itemNum}，欲出售 ${quantity}）` };
  }

  // 計算隨機價格（套用 shopSellPrice 稱號修正）
  const priceMod = getModifier(user.title || null, "shopSellPrice");
  const pricePerUnit = Math.max(1, Math.round(d6() * priceMod));
  const totalPrice = pricePerUnit * quantity;

  // 原子扣除素材
  const success = await db.atomicIncItem(
    userId,
    item.itemId,
    item.itemLevel,
    item.itemName,
    -quantity,
  );
  if (!success) {
    return { error: "出售失敗，請確認素材數量" };
  }

  // 發放 Col + 統計
  await awardCol(userId, totalPrice);
  await increment(userId, "totalShopSells");
  const newAchievements = await checkAndAward(userId);

  return {
    success: true,
    newAchievements: newAchievements.map((a) => ({ id: a.id, nameCn: a.nameCn, titleReward: a.titleReward })),
    itemName: item.itemName,
    itemLevel: item.itemLevel,
    quantity,
    pricePerUnit,
    totalPrice,
    message: `收破爛商人以 ${pricePerUnit} Col/個收走了 ${item.itemName} x${quantity}，你獲得 ${totalPrice} Col。`,
  };
}

/**
 * 出售武器（以 weaponStock 陣列索引定位）
 * 定價公式：d6 * 稀有度倍率
 * @param {string} userId
 * @param {number} weaponIndex - weaponStock 陣列索引
 * @returns {Promise<{success?: boolean, error?: string, ...}>}
 */
async function sellWeapon(userId, weaponIndex) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0) {
    return { error: "無效的武器索引" };
  }

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };
  if (user.isPK) return { error: "你是紅名玩家，城鎮商店拒絕為你服務。" };

  const weapon = (user.weaponStock || [])[weaponIndex];
  if (!weapon) return { error: "找不到該武器" };

  // 收破爛：不論稀有度，基礎 d6 Col（套用 shopSellPrice 修正）
  const rarity = calculateRarity(weapon);
  const priceMod = getModifier(user.title || null, "shopSellPrice");
  const price = Math.max(1, Math.round(d6() * priceMod));

  // 銷毀武器
  await destroyWeapon(userId, weaponIndex);

  // 發放 Col + 統計
  await awardCol(userId, price);
  await increment(userId, "totalShopSells");
  const newAchievements = await checkAndAward(userId);

  return {
    success: true,
    newAchievements: newAchievements.map((a) => ({ id: a.id, nameCn: a.nameCn, titleReward: a.titleReward })),
    weaponName: weapon.weaponName,
    rarityLabel: rarity.label,
    rarityId: rarity.id,
    price,
    message: `收破爛商人收走了【${rarity.label}】${weapon.weaponName}，你獲得 ${price} Col。`,
  };
}

module.exports = { sellItem, sellWeapon };
