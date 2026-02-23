const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../../middleware/auth.js");
const move = require("../../game/move.js");
const create = require("../../game/create.js");
const db = require("../../db.js");
const { validateName } = require("../../utils/sanitize.js");
const { handleRoute } = require("./helpers.js");
const config = require("../../game/config.js");
const { getActiveFloor } = require("../../game/floor/activeFloor.js");
const itemCache = require("../../game/cache/itemCache.js");
const { getModifier } = require("../../game/title/titleModifier.js");
const { getFloorMinePool, getStarRates } = require("../../game/move/mine.js");
const weaponCache = require("../../game/cache/weaponCache.js");
const { getWeaponLockError } = require("../../game/weapon/weaponLock.js");

// Create character
router.post("/create", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const nameCheck = validateName(req.body.name, "角色名稱");
    if (!nameCheck.valid) return { error: nameCheck.error };
    return await create(nameCheck.value, req.user.discordId, req.user.provider || "discord");
  }, "建立角色失敗");
});

// Mine（支援連續挖礦選項）
router.post("/mine", ensureAuth, async (req, res) => {
  const { staminaBudget, autoSell1Star, autoSell2Star } = req.body || {};
  const options = {};
  const maxBudget = config.MINE_PERKS?.MAX_BUDGET ?? 200;
  if (Number.isInteger(staminaBudget) && staminaBudget > 0 && staminaBudget <= maxBudget) {
    options.staminaBudget = staminaBudget;
  }
  if (autoSell1Star === true) options.autoSell1Star = true;
  if (autoSell2Star === true) options.autoSell2Star = true;
  const hasOptions = Object.keys(options).length > 0;
  await handleRoute(res, () => move([null, "mine", hasOptions ? options : undefined], req.user.discordId), "挖礦失敗");
});

// Mine preview（礦脈探測 LV6，純讀取不消耗）
router.get("/mine/preview", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return { error: "角色不存在" };

    const perks = config.MINE_PERKS || {};
    const mineLevel = user.mineLevel ?? 1;
    if (mineLevel < (perks.ORE_RADAR_LEVEL ?? 6)) {
      return { error: `此功能需要挖礦等級 LV${perks.ORE_RADAR_LEVEL ?? 6}` };
    }

    const currentFloor = getActiveFloor(user);
    const allItems = itemCache.getAll();
    const pool = getFloorMinePool(allItems, currentFloor);
    const starMod = getModifier(user.title || null, "mineStarChance");
    const starRates = getStarRates(mineLevel, starMod);

    return {
      floor: currentFloor,
      mineLevel,
      pool: pool.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        floorItem: !!item.floorItem,
      })),
      starRates,
    };
  }, "礦脈探測失敗");
});

// Recipes（配方書 LV2，純讀取不消耗）
router.get("/recipes", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return { error: "角色不存在" };

    const forgeLevel = user.forgeLevel ?? 1;
    const requiredLevel = config.FORGE_PERKS?.RECIPE_BOOK_LEVEL ?? 2;
    if (forgeLevel < requiredLevel) {
      return { error: `此功能需要鍛造等級 LV${requiredLevel}` };
    }

    const allItems = itemCache.getAll();
    const itemMap = {};
    for (const item of allItems) {
      itemMap[item.itemId] = item.name;
    }

    const allRecipes = weaponCache.getAll();
    const discovered = new Set(user.discoveredRecipes || []);
    const filtered = allRecipes.filter((r) => discovered.has(`${r.forge1}:${r.forge2}`));
    return {
      recipes: filtered.map((r) => ({
        weaponName: r.name,
        forge1: r.forge1,
        forge1Name: itemMap[r.forge1] || r.forge1,
        forge2: r.forge2,
        forge2Name: itemMap[r.forge2] || r.forge2,
      })),
      discovered: filtered.length,
      total: allRecipes.length,
    };
  }, "配方查詢失敗");
});

// Forge (支援 2~4 素材)
router.post("/forge", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    // 向後相容：支援舊格式 material1/material2 及新格式 materials[]
    let materials;
    if (Array.isArray(req.body.materials)) {
      materials = req.body.materials;
    } else {
      const { material1, material2 } = req.body;
      materials = [material1, material2];
    }
    if (materials.length < 2 || materials.length > 4) {
      return { error: "鍛造需要 2~4 個素材" };
    }
    let weaponName = null;
    if (req.body.weaponName && String(req.body.weaponName).trim().length > 0) {
      const nameCheck = validateName(req.body.weaponName, "武器名稱");
      if (!nameCheck.valid) return { error: nameCheck.error };
      weaponName = nameCheck.value;
    }
    return await move([null, "forge", materials, weaponName], req.user.discordId);
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
    // 檢查是否被 NPC 裝備中
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "角色不存在" });
    const lockError = getWeaponLockError(user.hiredNpcs, idx, user.activeExpedition);
    if (lockError) return res.status(400).json({ error: lockError });

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

// Material Floor Book（素材記錄書 挖礦LV3，純讀取不消耗）
router.get("/material-book", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return { error: "角色不存在" };

    const mineLevel = user.mineLevel ?? 1;
    const requiredLevel = config.MINE_PERKS?.MATERIAL_BOOK_LEVEL ?? 3;
    if (mineLevel < requiredLevel) {
      return { error: `此功能需要挖礦等級 LV${requiredLevel}` };
    }

    const allItems = itemCache.getAll();
    const itemMap = {};
    for (const item of allItems) {
      itemMap[item.itemId] = item.name;
    }

    const book = user.materialFloorBook || {};
    const entries = Object.entries(book).map(([itemId, floors]) => ({
      itemId,
      itemName: itemMap[itemId] || itemId,
      floors: Array.isArray(floors) ? [...floors].sort((a, b) => a - b) : [floors],
    }));

    // 按樓層分組顯示
    const floorMap = {};
    for (const entry of entries) {
      for (const floor of entry.floors) {
        if (!floorMap[floor]) floorMap[floor] = [];
        floorMap[floor].push({ itemId: entry.itemId, itemName: entry.itemName });
      }
    }

    // 計算每層的素材總數（供前端顯示 已發現/總數）
    const currentFloor = getActiveFloor(user);
    const highestFloor = user.currentFloor || 1;
    const floorTotals = {};
    for (let f = 1; f <= highestFloor; f++) {
      const pool = getFloorMinePool(allItems, f);
      floorTotals[f] = pool.length;
    }

    return { entries, floorMap, floorTotals, currentFloor, total: entries.length };
  }, "素材記錄書查詢失敗");
});

// Stat Book（素材強化記錄書 LV3，純讀取不消耗）
router.get("/stat-book", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return { error: "角色不存在" };

    const forgeLevel = user.forgeLevel ?? 1;
    const requiredLevel = config.FORGE_PERKS?.STAT_BOOK_LEVEL ?? 3;
    if (forgeLevel < requiredLevel) {
      return { error: `此功能需要鍛造等級 LV${requiredLevel}` };
    }

    const allItems = itemCache.getAll();
    const itemMap = {};
    for (const item of allItems) {
      itemMap[item.itemId] = item.name;
    }

    const book = user.materialStatBook || {};
    const entries = Object.entries(book).map(([itemId, stat]) => ({
      itemId,
      itemName: itemMap[itemId] || itemId,
      stat,
    }));

    return { entries, total: entries.length };
  }, "強化記錄書查詢失敗");
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
