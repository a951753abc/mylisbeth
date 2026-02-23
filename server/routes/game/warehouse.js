const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../../middleware/auth.js");
const warehouse = require("../../game/warehouse.js");
const { handleRoute } = require("./helpers.js");
const { logAction } = require("../../game/logging/actionLogger.js");

// GET 倉庫狀態
router.get("/warehouse", ensureAuth, async (req, res) => {
  await handleRoute(res, () => warehouse.getStatus(req.user.discordId), "查詢倉庫失敗");
});

// POST 建置倉庫
router.post("/warehouse/build", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const result = await warehouse.build(req.user.discordId);
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:build", {});
    return result;
  }, "建置倉庫失敗");
});

// POST 擴容升級
router.post("/warehouse/upgrade", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const result = await warehouse.upgrade(req.user.discordId);
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:upgrade", {});
    return result;
  }, "倉庫升級失敗");
});

// POST 存入素材
router.post("/warehouse/store-item", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { itemIndex, quantity } = req.body;
    const result = await warehouse.storeItem(
      req.user.discordId,
      parseInt(itemIndex, 10),
      Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 9999),
    );
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:store_item", { itemIndex, quantity });
    return result;
  }, "存入素材失敗");
});

// POST 取出素材
router.post("/warehouse/retrieve-item", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { itemIndex, quantity } = req.body;
    const result = await warehouse.retrieveItem(
      req.user.discordId,
      parseInt(itemIndex, 10),
      Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 9999),
    );
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:retrieve_item", { itemIndex, quantity });
    return result;
  }, "取出素材失敗");
});

// POST 存入武器
router.post("/warehouse/store-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponIndex } = req.body;
    const result = await warehouse.storeWeapon(req.user.discordId, parseInt(weaponIndex, 10));
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:store_weapon", { weaponIndex });
    return result;
  }, "存入武器失敗");
});

// POST 取出武器
router.post("/warehouse/retrieve-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponIndex } = req.body;
    const result = await warehouse.retrieveWeapon(req.user.discordId, parseInt(weaponIndex, 10));
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "warehouse:retrieve_weapon", { weaponIndex });
    return result;
  }, "取出武器失敗");
});

module.exports = router;
