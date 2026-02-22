const express = require("express");
const router = express.Router();
const db = require("../../db.js");
const { logAction } = require("../../game/logging/actionLogger.js");
const { getAllSkills } = require("../../game/skill/skillRegistry.js");
const { getNpcSlotCount } = require("../../game/skill/skillSlot.js");
const { getAllWeaponTypes } = require("../../game/weapon/weaponType.js");
const { INNATE_POOLS } = require("../../game/weapon/innateEffect.js");

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

// GET /api/admin/players/skill-definitions — 技能和武器類型定義（Admin 用）
router.get("/skill-definitions", async (req, res) => {
  try {
    const skills = getAllSkills();
    const weaponTypes = getAllWeaponTypes();
    res.json({ skills, weaponTypes });
  } catch (err) {
    console.error("取得技能定義失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/admin/players/innate-definitions — 固有效果定義（Admin 用）
router.get("/innate-definitions", (req, res) => {
  try {
    // 扁平化所有武器類型的效果池，以 id+value 去重（同 id 不同數值保留）
    const seen = new Set();
    const effects = [];
    for (const [, pool] of Object.entries(INNATE_POOLS)) {
      for (const item of pool) {
        const key = `${item.id}:${JSON.stringify(item.effect.value)}`;
        if (!seen.has(key)) {
          seen.add(key);
          effects.push({ id: item.id, name: item.name, effect: item.effect });
        }
      }
    }
    res.json({ effects });
  } catch (err) {
    console.error("取得固有效果定義失敗:", err);
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

// PATCH /api/admin/players/:userId/weapons/:index — 編輯武器屬性
router.patch("/:userId/weapons/:index", async (req, res) => {
  try {
    const userId = req.params.userId;
    const index = parseInt(req.params.index);

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const weapons = user.weaponStock || [];
    if (index < 0 || index >= weapons.length || !weapons[index]) {
      return res.status(400).json({ error: "無效的武器索引" });
    }

    const { weaponName, name, atk, def, agi, cri, hp, durability, maxDurability, buff, innateEffects } = req.body;
    const updates = {};
    const prefix = `weaponStock.${index}`;

    const parseStat = (val, min, max) => {
      const n = parseInt(val, 10);
      if (isNaN(n)) return null;
      return Math.min(max, Math.max(min, n));
    };

    if (weaponName !== undefined) updates[`${prefix}.weaponName`] = String(weaponName);
    if (name !== undefined) updates[`${prefix}.name`] = String(name);

    const statFields = [
      ["atk", atk, 0, 9999],
      ["def", def, 0, 9999],
      ["agi", agi, 0, 9999],
      ["cri", cri, 5, 99],
      ["hp", hp, 0, 99999],
      ["durability", durability, 0, 9999],
      ["maxDurability", maxDurability, 0, 9999],
      ["buff", buff, 0, 99],
    ];
    for (const [field, val, min, max] of statFields) {
      if (val === undefined) continue;
      const parsed = parseStat(val, min, max);
      if (parsed === null) return res.status(400).json({ error: `${field} 必須為整數` });
      updates[`${prefix}.${field}`] = parsed;
    }

    // 固有效果
    if (innateEffects !== undefined) {
      if (!Array.isArray(innateEffects)) {
        return res.status(400).json({ error: "innateEffects 必須為陣列" });
      }
      if (innateEffects.length > 2) {
        return res.status(400).json({ error: "固有效果最多 2 個" });
      }
      for (const ie of innateEffects) {
        if (!ie.id || !ie.name || !ie.effect || !ie.effect.type) {
          return res.status(400).json({ error: "每個固有效果必須包含 id, name, effect.type" });
        }
      }
      updates[`${prefix}.innateEffects`] = innateEffects;
    }

    // 耐久不能超過最大耐久
    const newDur = updates[`${prefix}.durability`];
    const newMaxDur = updates[`${prefix}.maxDurability`];
    const effectiveDur = newDur ?? weapons[index].durability ?? 0;
    const effectiveMaxDur = newMaxDur ?? weapons[index].maxDurability ?? weapons[index].durability ?? 0;
    if (effectiveDur > effectiveMaxDur) {
      return res.status(400).json({ error: "耐久不能大於最大耐久" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "未提供任何修改欄位" });
    }

    await db.update("user", { userId }, { $set: updates });

    const previous = weapons[index];
    logAction(userId, user.name, "admin:edit_weapon", {
      index,
      weaponName: previous.weaponName,
      changes: { weaponName, name, atk, def, agi, cri, hp, durability, maxDurability, buff, innateEffects },
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("編輯武器失敗:", err);
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

// PATCH /api/admin/players/:userId/npcs/:npcId/proficiency — 修改 NPC 熟練度
router.patch("/:userId/npcs/:npcId/proficiency", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const { weaponProficiency, proficientType } = req.body;

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npcIdx = hired.findIndex((n) => n.npcId === npcId);
    if (npcIdx === -1) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    const updates = {};

    if (weaponProficiency !== undefined) {
      const prof = parseInt(weaponProficiency);
      if (isNaN(prof) || prof < 0 || prof > 1000) {
        return res.status(400).json({ error: "weaponProficiency 必須在 0-1000 之間" });
      }
      updates[`hiredNpcs.${npcIdx}.weaponProficiency`] = prof;
    }

    if (proficientType !== undefined) {
      const validTypes = getAllWeaponTypes();
      if (proficientType !== null && !validTypes.includes(proficientType)) {
        return res.status(400).json({ error: `無效的武器類型: ${proficientType}` });
      }
      updates[`hiredNpcs.${npcIdx}.proficientType`] = proficientType;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "未提供任何修改欄位" });
    }

    await db.update("user", { userId }, { $set: updates });

    logAction(userId, user.name, "admin:modify_npc_proficiency", {
      npcId,
      npcName: hired[npcIdx].name,
      changes: { weaponProficiency, proficientType },
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("修改 NPC 熟練度失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PATCH /api/admin/players/:userId/npcs/:npcId/skills — 管理 NPC 技能
router.patch("/:userId/npcs/:npcId/skills", async (req, res) => {
  try {
    const { userId, npcId } = req.params;
    const { action, skillId, target } = req.body;

    if (!["add", "remove"].includes(action)) {
      return res.status(400).json({ error: "action 必須為 add 或 remove" });
    }
    if (!skillId) return res.status(400).json({ error: "缺少 skillId" });
    if (!["learned", "equipped"].includes(target)) {
      return res.status(400).json({ error: "target 必須為 learned 或 equipped" });
    }

    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "找不到玩家" });

    const hired = user.hiredNpcs || [];
    const npcIdx = hired.findIndex((n) => n.npcId === npcId);
    if (npcIdx === -1) return res.status(400).json({ error: "玩家未雇用此 NPC" });

    const npc = hired[npcIdx];
    const learnedPath = `hiredNpcs.${npcIdx}.learnedSkills`;
    const equippedPath = `hiredNpcs.${npcIdx}.equippedSkills`;

    if (action === "add" && target === "learned") {
      // 驗證 skillId 存在
      const allSkills = getAllSkills();
      if (!allSkills.some((s) => s.id === skillId)) {
        return res.status(400).json({ error: `找不到技能: ${skillId}` });
      }
      await db.update("user", { userId }, { $addToSet: { [learnedPath]: skillId } });

    } else if (action === "remove" && target === "learned") {
      await db.update("user", { userId }, {
        $pull: {
          [learnedPath]: skillId,
          [equippedPath]: { skillId },
        },
      });

    } else if (action === "add" && target === "equipped") {
      const learned = npc.learnedSkills || [];
      if (!learned.includes(skillId)) {
        return res.status(400).json({ error: "NPC 尚未學會此技能" });
      }
      const slotCount = getNpcSlotCount(npc);
      const equipped = npc.equippedSkills || [];
      if (equipped.length >= slotCount) {
        return res.status(400).json({ error: `裝備欄已滿（上限 ${slotCount}）` });
      }
      const alreadyEquipped = equipped.some(
        (es) => (typeof es === "string" ? es : es.skillId) === skillId,
      );
      if (alreadyEquipped) {
        return res.status(400).json({ error: "此技能已裝備" });
      }
      await db.update("user", { userId }, {
        $push: { [equippedPath]: { skillId, mods: [] } },
      });

    } else if (action === "remove" && target === "equipped") {
      await db.update("user", { userId }, {
        $pull: { [equippedPath]: { skillId } },
      });
    }

    logAction(userId, user.name, "admin:modify_npc_skills", {
      npcId,
      npcName: npc.name,
      action,
      skillId,
      target,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("修改 NPC 技能失敗:", err);
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
