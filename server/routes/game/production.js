const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../../middleware/auth.js");
const move = require("../../game/move.js");
const create = require("../../game/create.js");
const db = require("../../db.js");
const { validateName } = require("../../utils/sanitize.js");
const { handleRoute } = require("./helpers.js");

// Create character
router.post("/create", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const nameCheck = validateName(req.body.name, "角色名稱");
    if (!nameCheck.valid) return { error: nameCheck.error };
    return await create(nameCheck.value, req.user.discordId);
  }, "建立角色失敗");
});

// Mine
router.post("/mine", ensureAuth, async (req, res) => {
  await handleRoute(res, () => move([null, "mine"], req.user.discordId), "挖礦失敗");
});

// Forge
router.post("/forge", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { material1, material2 } = req.body;
    let weaponName = null;
    if (req.body.weaponName && String(req.body.weaponName).trim().length > 0) {
      const nameCheck = validateName(req.body.weaponName, "武器名稱");
      if (!nameCheck.valid) return { error: nameCheck.error };
      weaponName = nameCheck.value;
    }
    return await move([null, "forge", material1, material2, weaponName], req.user.discordId);
  }, "鍛造失敗");
});

// Rename weapon (once per weapon)
router.post("/rename-weapon", ensureAuth, async (req, res) => {
  try {
    const { weaponIndex, newName } = req.body;
    const nameCheck = validateName(newName, "武器名稱");
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.error });
    }
    const userId = req.user.discordId;
    const idx = parseInt(weaponIndex, 10);
    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ error: "找不到該武器" });
    }
    const filter = {
      userId,
      [`weaponStock.${idx}`]: { $exists: true },
      [`weaponStock.${idx}.renameCount`]: { $not: { $gte: 1 } },
    };
    const update = {
      $set: { [`weaponStock.${idx}.weaponName`]: nameCheck.value },
      $inc: { [`weaponStock.${idx}.renameCount`]: 1 },
    };
    const result = await db.findOneAndUpdate("user", filter, update);
    if (!result) {
      return res.status(400).json({ error: "這把武器已經改過名了，或武器不存在。" });
    }
    res.json({ success: true, weaponName: nameCheck.value });
  } catch (err) {
    console.error("武器改名失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Upgrade
router.post("/upgrade", ensureAuth, async (req, res) => {
  const { weaponId, materialId } = req.body;
  await handleRoute(res, () => move([null, "up", weaponId, materialId], req.user.discordId), "強化失敗");
});

// Repair
router.post("/repair", ensureAuth, async (req, res) => {
  const { weaponId, materialId } = req.body;
  await handleRoute(res, () => move([null, "repair", weaponId, materialId], req.user.discordId), "修復失敗");
});

module.exports = router;
