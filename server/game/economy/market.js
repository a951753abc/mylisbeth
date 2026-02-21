const db = require("../../db.js");
const config = require("../config.js");
const { awardCol, deductCol } = require("./col.js");
const { calculateRarity } = require("../weapon/rarity.js");
const { destroyWeapon } = require("../weapon/weapon.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getModifier } = require("../title/titleModifier.js");
const { d100Check } = require("../roll.js");

const MARKET = config.MARKET;

function generateListingId() {
  return `listing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 掛賣素材
 */
async function listMaterial(userId, itemIndex, quantity, pricePerUnit) {
  if (!Number.isInteger(itemIndex) || itemIndex < 0) return { error: "無效的素材索引" };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: "數量必須為正整數" };
  if (!Number.isInteger(pricePerUnit) || pricePerUnit <= 0) return { error: "單價必須為正整數" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };
  if (user.isPK) return { error: "你是紅名玩家，無法使用佈告板交易。" };

  // 檢查掛賣上限
  const myListings = await db.count("market_listing", { sellerId: userId, status: "active" });
  if (myListings >= MARKET.MAX_LISTINGS) return { error: `最多掛賣 ${MARKET.MAX_LISTINGS} 件` };

  const item = (user.itemStock || [])[itemIndex];
  if (!item) return { error: "找不到該素材" };
  if (item.itemNum < quantity) return { error: `素材數量不足（擁有 ${item.itemNum}）` };

  const totalPrice = pricePerUnit * quantity;

  // 手續費（套用稱號修正）
  const feeMod = getModifier(user.title || null, "marketListingFee");
  const feeRate = Math.max(0, MARKET.LISTING_FEE_RATE * feeMod);
  const fee = Math.max(1, Math.floor(totalPrice * feeRate));

  // 扣手續費
  const paid = await deductCol(userId, fee);
  if (!paid) return { error: `Col 不足，手續費 ${fee} Col` };

  // 扣素材
  const removed = await db.atomicIncItem(userId, item.itemId, item.itemLevel, item.itemName, -quantity);
  if (!removed) {
    await awardCol(userId, fee); // 回退手續費
    return { error: "素材扣除失敗" };
  }

  const listing = {
    listingId: generateListingId(),
    sellerId: userId,
    sellerName: user.name,
    type: "material",
    itemData: { itemId: item.itemId, itemLevel: item.itemLevel, itemName: item.itemName, quantity },
    totalPrice,
    pricePerUnit,
    fee,
    status: "active",
    listedAt: Date.now(),
  };

  await db.insertOne("market_listing", listing);
  return { success: true, listing, fee };
}

/**
 * 掛賣武器
 */
async function listWeapon(userId, weaponIndex, totalPrice) {
  if (!Number.isInteger(weaponIndex) || weaponIndex < 0) return { error: "無效的武器索引" };
  if (!Number.isInteger(totalPrice) || totalPrice <= 0) return { error: "價格必須為正整數" };

  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };
  if (user.isPK) return { error: "你是紅名玩家，無法使用佈告板交易。" };

  const myListings = await db.count("market_listing", { sellerId: userId, status: "active" });
  if (myListings >= MARKET.MAX_LISTINGS) return { error: `最多掛賣 ${MARKET.MAX_LISTINGS} 件` };

  const weapon = (user.weaponStock || [])[weaponIndex];
  if (!weapon) return { error: "找不到該武器" };

  // 檢查 NPC 是否裝備此武器
  const isEquipped = (user.hiredNpcs || []).some((n) => n.equippedWeaponIndex === weaponIndex);
  if (isEquipped) return { error: "該武器正被 NPC 裝備中，請先卸除" };

  // 手續費
  const feeMod = getModifier(user.title || null, "marketListingFee");
  const feeRate = Math.max(0, MARKET.LISTING_FEE_RATE * feeMod);
  const fee = Math.max(1, Math.floor(totalPrice * feeRate));

  const paid = await deductCol(userId, fee);
  if (!paid) return { error: `Col 不足，手續費 ${fee} Col` };

  // 銷毀武器（從 weaponStock 移除）
  const rarity = calculateRarity(weapon);
  await destroyWeapon(userId, weaponIndex);

  const listing = {
    listingId: generateListingId(),
    sellerId: userId,
    sellerName: user.name,
    type: "weapon",
    weaponData: { ...weapon, rarityId: rarity.id, rarityLabel: rarity.label },
    totalPrice,
    fee,
    status: "active",
    listedAt: Date.now(),
  };

  try {
    await db.insertOne("market_listing", listing);
  } catch (err) {
    // 上架失敗：恢復武器到玩家背包
    await db.update("user", { userId }, { $push: { weaponStock: weapon } });
    throw err;
  }
  return { success: true, listing, fee };
}

/**
 * 查詢上架列表
 */
async function getListings(filter = {}) {
  const query = { status: "active" };
  if (filter.type) query.type = filter.type;
  const listings = await db.find("market_listing", query);
  // 按上架時間排序（新→舊）
  listings.sort((a, b) => b.listedAt - a.listedAt);
  return listings;
}

/**
 * 查詢我的掛賣
 */
async function getMyListings(userId) {
  return await db.find("market_listing", { sellerId: userId, status: { $ne: "deleted" } });
}

/**
 * 購買掛賣品
 */
async function buyListing(buyerUserId, listingId) {
  const buyer = await db.findOne("user", { userId: buyerUserId });
  if (!buyer) return { error: "角色不存在" };
  if (buyer.isPK) return { error: "你是紅名玩家，無法使用佈告板交易。" };

  // 原子搶購（同時排除自買）
  const listing = await db.findOneAndUpdate(
    "market_listing",
    { listingId, status: "active", sellerId: { $ne: buyerUserId } },
    { $set: { status: "sold", buyerId: buyerUserId, soldAt: Date.now() } },
    { returnDocument: "after" },
  );

  if (!listing) return { error: "商品不存在、已被購買，或不能購買自己的商品" };

  // 扣買家 Col
  const paid = await deductCol(buyerUserId, listing.totalPrice);
  if (!paid) {
    // 回滾狀態
    await db.update("market_listing", { listingId }, { $set: { status: "active" }, $unset: { buyerId: "", soldAt: "" } });
    return { error: `Col 不足，需要 ${listing.totalPrice} Col` };
  }

  // 付款給賣家 + 轉移物品（任一步驟失敗則全面回滾）
  try {
    await awardCol(listing.sellerId, listing.totalPrice);
    await increment(listing.sellerId, "totalMarketSold");
    await increment(listing.sellerId, "totalMarketEarned", listing.totalPrice);

    // 轉移物品給買家
    if (listing.type === "material") {
      const d = listing.itemData;
      await db.atomicIncItem(buyerUserId, d.itemId, d.itemLevel, d.itemName, d.quantity);
    } else if (listing.type === "weapon") {
      await db.update("user", { userId: buyerUserId }, { $push: { weaponStock: listing.weaponData } });
    }

    await checkAndAward(listing.sellerId);
  } catch (err) {
    // 回滾：退還買家 Col，恢復商品狀態
    console.error("市場交易後續步驟失敗，回滾中:", err.message);
    await awardCol(buyerUserId, listing.totalPrice).catch(() => {});
    await db.update("market_listing", { listingId }, {
      $set: { status: "active" }, $unset: { buyerId: "", soldAt: "" },
    }).catch(() => {});
    return { error: "交易過程中發生錯誤，已退還 Col，請重試。" };
  }

  return { success: true, listing };
}

/**
 * 下架
 */
async function cancelListing(userId, listingId) {
  const listing = await db.findOneAndUpdate(
    "market_listing",
    { listingId, sellerId: userId, status: "active" },
    { $set: { status: "cancelled", cancelledAt: Date.now() } },
    { returnDocument: "after" },
  );

  if (!listing) return { error: "找不到該掛賣或已成交" };

  // 歸還物品（手續費不退）
  if (listing.type === "material") {
    const d = listing.itemData;
    await db.atomicIncItem(userId, d.itemId, d.itemLevel, d.itemName, d.quantity);
  } else if (listing.type === "weapon") {
    await db.update("user", { userId }, { $push: { weaponStock: listing.weaponData } });
  }

  return { success: true };
}

/**
 * NPC 自動購買（每遊戲日執行一次）
 */
async function runNpcPurchases() {
  const listings = await db.find("market_listing", { status: "active" });
  if (listings.length === 0) return;

  for (const listing of listings) {
    // 自動下架過期品
    const ageDays = (Date.now() - listing.listedAt) / config.TIME_SCALE;
    if (ageDays > MARKET.MAX_LISTING_DAYS) {
      // 過期下架：歸還物品
      if (listing.type === "material") {
        const d = listing.itemData;
        await db.atomicIncItem(listing.sellerId, d.itemId, d.itemLevel, d.itemName, d.quantity);
      } else if (listing.type === "weapon") {
        await db.update("user", { userId: listing.sellerId }, { $push: { weaponStock: listing.weaponData } });
      }
      await db.update("market_listing", { listingId: listing.listingId }, { $set: { status: "expired", expiredAt: Date.now() } });
      continue;
    }

    // 計算公平價
    let fairPrice = 0;
    if (listing.type === "material") {
      const d = listing.itemData;
      const base = MARKET.MATERIAL_BASE_PRICE[d.itemLevel] || 5;
      fairPrice = base * d.quantity;
    } else {
      const wd = listing.weaponData;
      fairPrice = MARKET.WEAPON_BASE_PRICE[wd.rarityId] || 20;
    }

    // NPC 只買公平價以下的
    if (listing.totalPrice > fairPrice * MARKET.NPC_BUY_THRESHOLD) continue;

    // 隨機購買判定
    if (!d100Check(MARKET.NPC_BUY_BASE_CHANCE)) continue;

    // NPC 購買：直接標記 sold，發款給賣家
    const purchased = await db.findOneAndUpdate(
      "market_listing",
      { listingId: listing.listingId, status: "active" },
      { $set: { status: "sold", buyerId: "npc_market", soldAt: Date.now() } },
      { returnDocument: "after" },
    );

    if (purchased) {
      await awardCol(listing.sellerId, listing.totalPrice); // 已自動追蹤 totalColEarned
      await increment(listing.sellerId, "totalMarketSold");
      await increment(listing.sellerId, "totalMarketEarned", listing.totalPrice);
      await checkAndAward(listing.sellerId);
    }
  }
}

module.exports = { listMaterial, listWeapon, getListings, getMyListings, buyListing, cancelListing, runNpcPurchases };
