const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../../middleware/auth.js");
const db = require("../../db.js");
const { calculateBill, payDebt } = require("../../game/economy/settlement.js");
const { sellItem, sellWeapon, sellSealedWeapon } = require("../../game/economy/shop.js");
const { discardItem, discardWeapon } = require("../../game/economy/discard.js");
const { getNextSettlementTime } = require("../../game/time/gameTime.js");
const { increment } = require("../../game/progression/statsTracker.js");
const { checkAndAward } = require("../../game/progression/achievement.js");
const { logAction } = require("../../game/logging/actionLogger.js");
const { handleRoute } = require("./helpers.js");

// Settlement preview
router.get("/settlement", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });
    const bill = calculateBill(user);
    res.json({
      bill,
      debt: user.debt || 0,
      isInDebt: user.isInDebt || false,
      debtCycleCount: user.debtCycleCount || 0,
      nextSettlementAt: user.nextSettlementAt || null,
      col: user.col || 0,
    });
  } catch (err) {
    console.error("取得帳單失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Pay debt
router.post("/pay-debt", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return { error: "還款金額無效" };
    return await payDebt(req.user.discordId, amount);
  }, "還債失敗");
});

// Sell item
router.post("/sell-item", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { itemIndex, quantity } = req.body;
    if (itemIndex === undefined || itemIndex === null) return { error: "缺少素材索引" };
    const result = await sellItem(
      req.user.discordId,
      parseInt(itemIndex, 10),
      parseInt(quantity, 10) || 1,
    );
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "sell_item", { itemIndex, quantity });
    return result;
  }, "出售素材失敗");
});

// Sell weapon
router.post("/sell-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponIndex } = req.body;
    if (weaponIndex === undefined || weaponIndex === null) return { error: "缺少武器索引" };
    const result = await sellWeapon(req.user.discordId, parseInt(weaponIndex, 10));
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "sell_weapon", { weaponIndex });
    return result;
  }, "出售武器失敗");
});

// Sell sealed weapon
router.post("/sell-sealed-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { sealedIndex } = req.body;
    if (sealedIndex === undefined || sealedIndex === null) return { error: "缺少封印武器索引" };
    return await sellSealedWeapon(req.user.discordId, parseInt(sealedIndex, 10));
  }, "出售封印武器失敗");
});

// Discard item
router.post("/discard-item", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { itemIndex, quantity } = req.body;
    if (itemIndex === undefined || itemIndex === null) return { error: "缺少素材索引" };
    return await discardItem(
      req.user.discordId,
      parseInt(itemIndex, 10),
      parseInt(quantity, 10) || 1,
    );
  }, "丟棄素材失敗");
});

// Discard weapon
router.post("/discard-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponIndex } = req.body;
    if (weaponIndex === undefined || weaponIndex === null) return { error: "缺少武器索引" };
    return await discardWeapon(req.user.discordId, parseInt(weaponIndex, 10));
  }, "丟棄武器失敗");
});

// 暫停/恢復營業
router.post("/pause-business", ensureAuth, async (req, res) => {
  try {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const { paused } = req.body;
    if (typeof paused !== "boolean") {
      return res.status(400).json({ error: "參數錯誤" });
    }

    if (paused === (user.businessPaused || false)) {
      return res.status(400).json({
        error: paused ? "已經處於暫停狀態" : "目前沒有暫停營業",
      });
    }

    const now = Date.now();
    const updates = paused
      ? { businessPaused: true, businessPausedAt: now }
      : {
          businessPaused: false,
          businessPausedAt: null,
          nextSettlementAt: getNextSettlementTime(now),
        };

    await db.update("user", { userId }, { $set: updates });

    if (paused) {
      await increment(userId, "totalPauses");
      await checkAndAward(userId);
    }

    res.json({ success: true, businessPaused: paused });
  } catch (err) {
    console.error("暫停營業失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
