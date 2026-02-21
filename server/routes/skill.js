const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/auth.js");
const db = require("../db.js");
const { getAllSkills, getSkill, canLearnSkill, getMaxProficiency } = require("../game/skill/skillRegistry.js");
const {
  equipSkill, unequipSkill, installMod, uninstallMod,
  getPlayerSlotCount, MOD_MAP,
} = require("../game/skill/skillSlot.js");
const modDefs = require("../game/skill/modDefs.json");
const { resolveWeaponType } = require("../game/weapon/weaponType.js");
const ensureUserFields = require("../game/migration/ensureUserFields.js");

// 取得所有技能定義
router.get("/definitions", ensureAuth, (req, res) => {
  res.json({ skills: getAllSkills(), mods: modDefs });
});

// 取得玩家技能狀態
router.get("/status", ensureAuth, async (req, res) => {
  try {
    const rawUser = await db.findOne("user", { userId: req.user.discordId });
    if (!rawUser) return res.status(404).json({ error: "角色不存在" });
    const user = await ensureUserFields(rawUser);

    const maxProf = getMaxProficiency(user);
    const slotCount = getPlayerSlotCount(user);

    res.json({
      weaponProficiency: user.weaponProficiency || {},
      learnedSkills: user.learnedSkills || [],
      equippedSkills: user.equippedSkills || [],
      extraSkills: user.extraSkills || [],
      uniqueSkills: user.uniqueSkills || [],
      maxProficiency: maxProf,
      slotCount,
      modSlots: Math.floor(maxProf / 50),
      currentModCount: (user.equippedSkills || []).reduce(
        (sum, s) => sum + (s.mods || []).length, 0,
      ),
    });
  } catch (err) {
    console.error("取得技能狀態失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 學習技能（手動觸發解鎖）
router.post("/learn", ensureAuth, async (req, res) => {
  try {
    const { skillId } = req.body;
    if (!skillId) return res.status(400).json({ error: "缺少 skillId" });

    const rawUser = await db.findOne("user", { userId: req.user.discordId });
    if (!rawUser) return res.status(404).json({ error: "角色不存在" });
    const user = await ensureUserFields(rawUser);

    const result = canLearnSkill(user, skillId);
    if (!result.canLearn) {
      return res.status(400).json({ error: result.reason });
    }

    await db.update(
      "user",
      { userId: user.userId },
      { $addToSet: { learnedSkills: skillId } },
    );

    res.json({ success: true, skillId });
  } catch (err) {
    console.error("學習技能失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 裝備技能
router.post("/equip", ensureAuth, async (req, res) => {
  try {
    const { skillId } = req.body;
    if (!skillId) return res.status(400).json({ error: "缺少 skillId" });

    const result = await equipSkill(req.user.discordId, skillId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("裝備技能失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 卸除技能
router.post("/unequip", ensureAuth, async (req, res) => {
  try {
    const { skillId } = req.body;
    if (!skillId) return res.status(400).json({ error: "缺少 skillId" });

    const result = await unequipSkill(req.user.discordId, skillId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("卸除技能失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 安裝 Mod
router.post("/mod/install", ensureAuth, async (req, res) => {
  try {
    const { skillId, modId } = req.body;
    if (!skillId || !modId) return res.status(400).json({ error: "缺少參數" });

    const result = await installMod(req.user.discordId, skillId, modId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("安裝 Mod 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 卸除 Mod
router.post("/mod/uninstall", ensureAuth, async (req, res) => {
  try {
    const { skillId, modId } = req.body;
    if (!skillId || !modId) return res.status(400).json({ error: "缺少參數" });

    const result = await uninstallMod(req.user.discordId, skillId, modId);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("卸除 Mod 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
