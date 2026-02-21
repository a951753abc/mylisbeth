const express = require("express");
const router = express.Router();
const db = require("../../db.js");
const { logAction } = require("../../game/logging/actionLogger.js");

// GET /api/admin/players?search=&page=1&limit=20
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { userId: search },
          ],
        }
      : {};

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await db.count("user", query);
    const players = await db.findWithOptions("user", query, {
      sort: { lastActionAt: -1 },
      skip,
      limit: parseInt(limit),
      projection: {
        userId: 1,
        name: 1,
        col: 1,
        currentFloor: 1,
        forgeLevel: 1,
        mineLevel: 1,
        battleLevel: 1,
        adventureLevel: 1,
        title: 1,
        isInDebt: 1,
        businessPaused: 1,
        lastActionAt: 1,
        stamina: 1,
      },
    });

    res.json({
      players,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("查詢玩家失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/admin/players/:userId — 完整玩家文件
router.get("/:userId", async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });
    res.json({ player: user });
  } catch (err) {
    console.error("查詢玩家詳情失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PATCH /api/admin/players/:userId/col — 修改 Col
router.patch("/:userId/col", async (req, res) => {
  try {
    const { amount, operation } = req.body;
    const userId = req.params.userId;
    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) return res.status(400).json({ error: "金額無效" });

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    let update;
    if (operation === "set") {
      if (numAmount < 0) return res.status(400).json({ error: "Col 不能為負數" });
      update = { $set: { col: numAmount } };
    } else if (operation === "add") {
      update = { $inc: { col: numAmount } };
    } else if (operation === "subtract") {
      if (user.col < numAmount) return res.status(400).json({ error: "玩家 Col 不足" });
      update = { $inc: { col: -numAmount } };
    } else {
      return res.status(400).json({ error: "operation 必須為 set/add/subtract" });
    }

    await db.update("user", { userId }, update);

    logAction(userId, user.name, "admin:modify_col", {
      operation,
      amount: numAmount,
      previousCol: user.col,
      adminUser: req.session.admin.username,
    });

    const updated = await db.findOne("user", { userId });
    res.json({ success: true, col: updated.col });
  } catch (err) {
    console.error("修改 Col 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PATCH /api/admin/players/:userId/items — 修改物品數量
router.patch("/:userId/items", async (req, res) => {
  try {
    const { itemId, itemLevel, itemName, delta } = req.body;
    const userId = req.params.userId;
    if (!itemId || delta === undefined) {
      return res.status(400).json({ error: "缺少 itemId 或 delta" });
    }

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const result = await db.atomicIncItem(
      userId,
      itemId,
      parseInt(itemLevel) || 1,
      itemName || itemId,
      parseInt(delta),
    );

    logAction(userId, user.name, "admin:modify_item", {
      itemId,
      itemLevel,
      delta: parseInt(delta),
      adminUser: req.session.admin.username,
    });

    res.json({ success: result });
  } catch (err) {
    console.error("修改物品失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PATCH /api/admin/players/:userId/reset — 重設特定狀態
router.patch("/:userId/reset", async (req, res) => {
  try {
    const { fields } = req.body;
    const userId = req.params.userId;
    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: "請提供要重設的欄位" });
    }

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const updates = {};
    for (const field of fields) {
      switch (field) {
        case "debt":
          updates.debt = 0;
          updates.isInDebt = false;
          updates.debtCycleCount = 0;
          updates.debtStartedAt = null;
          break;
        case "stamina":
          updates.stamina = 100;
          updates.lastStaminaRegenAt = Date.now();
          break;
        case "cooldown":
          updates.move_time = 0;
          break;
        case "businessPaused":
          updates.businessPaused = false;
          updates.businessPausedAt = null;
          break;
        default:
          return res.status(400).json({ error: `不支援重設欄位: ${field}` });
      }
    }

    await db.update("user", { userId }, { $set: updates });

    logAction(userId, user.name, "admin:reset_fields", {
      fields,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true, resetFields: fields });
  } catch (err) {
    console.error("重設狀態失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// DELETE /api/admin/players/:userId — 強制刪除玩家
router.delete("/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    // 寫入 bankruptcy_log
    await db.insertOne("bankruptcy_log", {
      userId,
      name: user.name,
      title: user.title || null,
      forgeLevel: user.forgeLevel || 1,
      currentFloor: user.currentFloor || 1,
      weaponCount: (user.weaponStock || []).length,
      hiredNpcCount: (user.hiredNpcs || []).length,
      finalCol: user.col || 0,
      totalDebt: user.debt || 0,
      cause: "admin_delete",
      bankruptedAt: Date.now(),
    });

    // 釋放 NPC
    const npcIds = (user.hiredNpcs || []).map((n) => n.npcId);
    if (npcIds.length > 0) {
      await db.updateMany(
        "npc",
        { npcId: { $in: npcIds } },
        { $set: { status: "available", hiredBy: null } },
      );
    }

    await db.deleteOne("user", { userId });

    logAction(userId, user.name, "admin:delete_player", {
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("刪除玩家失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
