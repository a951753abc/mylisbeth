const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../middleware/auth.js");
const { getTavernNpcs } = require("../game/npc/tavern.js");
const {
  hireNpc,
  fireNpc,
  healNpc,
  equipWeapon,
  getHireLimit,
} = require("../game/npc/npcManager.js");
const {
  startMission,
  checkMissions,
  getMissionPreviews,
} = require("../game/npc/mission.js");
const db = require("../db.js");
const config = require("../game/config.js");

// GET /api/npc/tavern — 酒館 NPC 列表（含雇用上限）
router.get("/tavern", ensureAuth, async (req, res) => {
  try {
    const npcs = await getTavernNpcs();
    const user = await db.findOne("user", { userId: req.user.discordId });
    const hireLimit = user ? getHireLimit(user.adventureLevel) : 2;
    const currentHired = (user?.hiredNpcs || []).length;
    res.json({ npcs, hireLimit, currentHired });
  } catch (err) {
    console.error("取得酒館 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/hire — 雇用 NPC
router.post("/hire", ensureAuth, ensureNotPaused, async (req, res) => {
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
router.post("/fire", ensureAuth, ensureNotPaused, async (req, res) => {
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
router.post("/heal", ensureAuth, ensureNotPaused, async (req, res) => {
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
router.post("/equip", ensureAuth, ensureNotPaused, async (req, res) => {
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

// POST /api/npc/mission/start — 派遣 NPC 執行任務
router.post("/mission/start", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { npcId, missionType } = req.body;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    if (!missionType) return res.status(400).json({ error: "請選擇任務類型" });
    const result = await startMission(req.user.discordId, npcId, missionType);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("派遣任務失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/npc/mission/check — 結算完成的任務
router.post("/mission/check", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const results = await checkMissions(req.user.discordId);
    res.json({ results });
  } catch (err) {
    console.error("結算任務失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/npc/mission/types — 任務預覽
router.get("/mission/types", ensureAuth, async (req, res) => {
  try {
    const { npcId } = req.query;
    if (!npcId) return res.status(400).json({ error: "請提供 npcId" });
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const npc = (user.hiredNpcs || []).find((n) => n.npcId === npcId);
    if (!npc) return res.status(404).json({ error: "找不到該 NPC" });

    const previews = getMissionPreviews(npc, user.currentFloor || 1, user.title || null);
    const activeMissions = (user.hiredNpcs || []).filter((n) => n.mission).length;
    const concurrentLimit = config.NPC_MISSIONS.CONCURRENT_LIMIT ?? 2;
    res.json({ missions: previews, activeMissions, concurrentLimit });
  } catch (err) {
    console.error("取得任務預覽失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
