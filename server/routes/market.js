const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../middleware/auth.js");
const {
  listMaterial,
  listWeapon,
  getListings,
  getMyListings,
  buyListing,
  cancelListing,
} = require("../game/economy/market.js");
const { logAction } = require("../game/logging/actionLogger.js");

// POST /api/market/list-item — 掛賣素材
router.post("/list-item", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { itemIndex, quantity, pricePerUnit } = req.body;
    const result = await listMaterial(
      req.user.discordId,
      parseInt(itemIndex, 10),
      parseInt(quantity, 10),
      parseInt(pricePerUnit, 10),
    );
    if (result.error) return res.status(400).json(result);
    logAction(req.user.discordId, null, "market:list_item", { itemIndex, quantity, pricePerUnit });
    res.json(result);
  } catch (err) {
    console.error("掛賣素材失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/market/list-weapon — 掛賣武器
router.post("/list-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { weaponIndex, totalPrice } = req.body;
    const result = await listWeapon(
      req.user.discordId,
      parseInt(weaponIndex, 10),
      parseInt(totalPrice, 10),
    );
    if (result.error) return res.status(400).json(result);
    logAction(req.user.discordId, null, "market:list_weapon", { weaponIndex, totalPrice });
    res.json(result);
  } catch (err) {
    console.error("掛賣武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/market/listings — 瀏覽上架
router.get("/listings", ensureAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const listings = await getListings(filter);
    res.json({ listings });
  } catch (err) {
    console.error("取得掛賣列表失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/market/my-listings — 我的掛賣
router.get("/my-listings", ensureAuth, async (req, res) => {
  try {
    const listings = await getMyListings(req.user.discordId);
    res.json({ listings });
  } catch (err) {
    console.error("取得我的掛賣失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/market/buy — 購買
router.post("/buy", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: "請提供 listingId" });
    const result = await buyListing(req.user.discordId, listingId);
    if (result.error) return res.status(400).json(result);
    logAction(req.user.discordId, null, "market:buy", { listingId });
    res.json(result);
  } catch (err) {
    console.error("購買失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/market/cancel — 下架
router.post("/cancel", ensureAuth, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: "請提供 listingId" });
    const result = await cancelListing(req.user.discordId, listingId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("下架失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
