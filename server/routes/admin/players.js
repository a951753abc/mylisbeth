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

// POST /api/admin/players/:userId/weapons — 新增武器
router.post("/:userId/weapons", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { weaponName, name, atk, def, agi, cri, hp, durability } = req.body;
    if (!weaponName) return res.status(400).json({ error: "缺少 weaponName" });

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const weapon = {
      weaponName: weaponName || "未知武器",
      name: name || weaponName,
      atk: parseInt(atk) || 0,
      def: parseInt(def) || 0,
      agi: parseInt(agi) || 0,
      cri: parseInt(cri) || 10,
      hp: parseInt(hp) || 0,
      durability: parseInt(durability) || 100,
      buff: 0,
      renameCount: 0,
    };

    await db.update("user", { userId }, { $push: { weaponStock: weapon } });

    logAction(userId, user.name, "admin:add_weapon", {
      weapon,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("新增武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// DELETE /api/admin/players/:userId/weapons/:index — 移除武器
router.delete("/:userId/weapons/:index", async (req, res) => {
  try {
    const userId = req.params.userId;
    const index = parseInt(req.params.index);

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const weapons = user.weaponStock || [];
    if (index < 0 || index >= weapons.length || !weapons[index]) {
      return res.status(400).json({ error: "無效的武器索引" });
    }

    const removedWeapon = weapons[index];

    // 同 weapon.js 的 removeWeapon 模式：先 $unset 再 $pull null
    await db.update("user", { userId }, { $unset: { [`weaponStock.${index}`]: 1 } });
    await db.update("user", { userId }, { $pull: { weaponStock: null } });

    logAction(userId, user.name, "admin:remove_weapon", {
      index,
      weaponName: removedWeapon.weaponName,
      name: removedWeapon.name,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("移除武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/players/:userId/relics — 新增聖遺物
router.post("/:userId/relics", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { id, name, nameCn, bossFloor, effects } = req.body;
    if (!id || !name) return res.status(400).json({ error: "缺少 id 或 name" });

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    // 檢查是否已擁有
    const existing = (user.bossRelics || []).some((r) => r.id === id);
    if (existing) return res.status(400).json({ error: "玩家已擁有此聖遺物" });

    const relic = {
      id,
      name,
      nameCn: nameCn || name,
      bossFloor: parseInt(bossFloor) || 0,
      effects: effects || {},
      obtainedAt: new Date(),
    };

    await db.update("user", { userId }, { $push: { bossRelics: relic } });

    logAction(userId, user.name, "admin:add_relic", {
      relic,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("新增聖遺物失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// DELETE /api/admin/players/:userId/relics/:relicId — 移除聖遺物
router.delete("/:userId/relics/:relicId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const relicId = req.params.relicId;

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const relic = (user.bossRelics || []).find((r) => r.id === relicId);
    if (!relic) return res.status(400).json({ error: "找不到此聖遺物" });

    await db.update("user", { userId }, { $pull: { bossRelics: { id: relicId } } });

    logAction(userId, user.name, "admin:remove_relic", {
      relicId,
      relicName: relic.name,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("移除聖遺物失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/players/:userId/npcs/:npcId/fire — 解雇 NPC
router.post("/:userId/npcs/:npcId/fire", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npc = hired.find((n) => n.npcId === npcId);
    if (!npc) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    await db.update("user", { userId }, { $pull: { hiredNpcs: { npcId } } });
    await db.update("npc", { npcId }, { $set: { status: "available", hiredBy: null } });

    logAction(userId, user.name, "admin:fire_npc", {
      npcId,
      npcName: npc.name,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("解雇 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/players/:userId/npcs/:npcId/heal — 治療 NPC（回滿體力）
router.post("/:userId/npcs/:npcId/heal", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npcIdx = hired.findIndex((n) => n.npcId === npcId);
    if (npcIdx === -1) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    await db.update(
      "user",
      { userId },
      { $set: { [`hiredNpcs.${npcIdx}.condition`]: 100 } },
    );

    logAction(userId, user.name, "admin:heal_npc", {
      npcId,
      npcName: hired[npcIdx].name,
      previousCondition: hired[npcIdx].condition,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("治療 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/players/:userId/npcs/:npcId/kill — 殺死 NPC
router.post("/:userId/npcs/:npcId/kill", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npc = hired.find((n) => n.npcId === npcId);
    if (!npc) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    await db.update("user", { userId }, { $pull: { hiredNpcs: { npcId } } });
    await db.update(
      "npc",
      { npcId },
      { $set: { status: "dead", hiredBy: null, diedAt: Date.now(), causeOfDeath: "admin_kill" } },
    );

    logAction(userId, user.name, "admin:kill_npc", {
      npcId,
      npcName: npc.name,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("殺死 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PATCH /api/admin/players/:userId/npcs/:npcId — 修改 NPC 屬性
router.patch("/:userId/npcs/:npcId", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const { condition, level, exp } = req.body;

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npcIdx = hired.findIndex((n) => n.npcId === npcId);
    if (npcIdx === -1) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    const updates = {};
    if (condition !== undefined) updates[`hiredNpcs.${npcIdx}.condition`] = Math.max(0, Math.min(100, parseInt(condition)));
    if (level !== undefined) updates[`hiredNpcs.${npcIdx}.level`] = Math.max(1, parseInt(level));
    if (exp !== undefined) updates[`hiredNpcs.${npcIdx}.exp`] = Math.max(0, parseInt(exp));

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "未提供任何修改欄位" });
    }

    await db.update("user", { userId }, { $set: updates });

    logAction(userId, user.name, "admin:modify_npc", {
      npcId,
      npcName: hired[npcIdx].name,
      changes: { condition, level, exp },
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("修改 NPC 失敗:", err);
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
