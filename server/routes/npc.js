const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/auth.js");
const { getTavernNpcs } = require("../game/npc/tavern.js");
const {
  hireNpc,
  fireNpc,
  healNpc,
  equipWeapon,
} = require("../game/npc/npcManager.js");

// GET /api/npc/tavern — 酒館 NPC 列表
router.get("/tavern", ensureAuth, async (req, res) => {
  try {
    const npcs = await getTavernNpcs();
    res.json({ npcs });
  } catch (err) {
    console.error("取得酒館 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/hire — 雇用 NPC
router.post("/hire", ensureAuth, async (req, res) => {
  try {
    const { npcId } = req.body;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    const result = await hireNpc(req.user.discordId, npcId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("雇用 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/fire — 解雇 NPC
router.post("/fire", ensureAuth, async (req, res) => {
  try {
    const { npcId } = req.body;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    const result = await fireNpc(req.user.discordId, npcId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("解雇 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/heal — 治療 NPC
router.post("/heal", ensureAuth, async (req, res) => {
  try {
    const { npcId, healType } = req.body;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    if (!["quick", "full"].includes(healType)) {
      return res.status(400).json({ error: "healType 必須為 quick 或 full" });
    }
    const result = await healNpc(req.user.discordId, npcId, healType);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("治療 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/equip — 裝備武器
router.post("/equip", ensureAuth, async (req, res) => {
  try {
    const { npcId, weaponIndex } = req.body;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    const idx = weaponIndex !== undefined ? weaponIndex : null;
    const result = await equipWeapon(req.user.discordId, npcId, idx);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("裝備武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
