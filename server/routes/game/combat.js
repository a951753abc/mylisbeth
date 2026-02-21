const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../../middleware/auth.js");
const move = require("../../game/move.js");
const db = require("../../db.js");
const { handleRoute, emitSocketEvents } = require("./helpers.js");

// Adventure
router.post("/adventure", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponId, npcId } = req.body;
    const result = await move([null, "adv", weaponId, npcId], req.user.discordId);
    if (result.error) return result;
    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        userId: req.user.discordId,
        playerName: result.battleResult?.npcName,
        result: result.battleResult,
      });
      emitSocketEvents(io, result.socketEvents);
    }
    const { socketEvents, ...clientResult } = result;
    return clientResult;
  }, "冒險失敗");
});

// Solo adventure (鍛造師親自冒險)
router.post("/solo-adventure", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponId } = req.body;
    const result = await move([null, "soloAdv", weaponId !== undefined ? weaponId : 0], req.user.discordId);
    if (result.error) return result;
    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        userId: req.user.discordId,
        type: "soloAdv",
        playerName: result.battleResult?.npcName,
        result: result.battleResult,
      });
    }
    return result;
  }, "獨自出擊失敗");
});

// PVP (Season 5: 決鬥系統)
router.post("/pvp", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { targetUserId, weaponId, mode, wagerCol } = req.body;
    const result = await move([null, "pvp", targetUserId, weaponId, mode, wagerCol], req.user.discordId);
    if (result.error) return result;
    const io = req.app.get("io");
    if (io) {
      emitSocketEvents(io, result.socketEvents);
      if (result.defenderId) {
        io.to("user:" + result.defenderId).emit("pvp:attacked", {
          attacker: result.attackerName,
          defender: result.defenderName,
          winner: result.winner,
          loser: result.loser,
          reward: result.reward,
          duelMode: result.duelMode,
          battleLog: result.battleLog,
          loserDied: result.loserDied,
        });
      }
    }
    const { socketEvents, ...clientResult } = result;
    return clientResult;
  }, "PVP 失敗");
});

// PVP vs NPC: 挑戰其他玩家的 NPC
router.post("/pvp-npc", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { targetNpcId, weaponId, mode, wagerCol } = req.body;
    const result = await move([null, "pvpNpc", targetNpcId, weaponId, mode, wagerCol], req.user.discordId);
    if (result.error) return result;
    const io = req.app.get("io");
    if (io) {
      emitSocketEvents(io, result.socketEvents);
      if (result.defenderId) {
        io.to("user:" + result.defenderId).emit("pvp:attacked", {
          attacker: result.attackerName,
          defender: result.defenderName,
          defenderOwner: result.defenderOwnerName,
          winner: result.winner,
          loser: result.loser,
          reward: result.reward,
          duelMode: result.duelMode,
          battleLog: result.battleLog,
          loserDied: result.loserDied,
          npcDied: result.npcDied,
          isNpcDuel: true,
        });
      }
    }
    const { socketEvents, ...clientResult } = result;
    return clientResult;
  }, "PVP-NPC 失敗");
});

// 查詢某玩家的 NPC 列表（供 NPC 決鬥選擇用）
router.get("/players/:userId/npcs", ensureAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const user = await db.findOne("user", { userId: targetUserId });
    if (!user) {
      return res.status(404).json({ error: "找不到該玩家" });
    }
    const npcs = (user.hiredNpcs || []).map((npc) => {
      const weapon = npc.equippedWeaponIndex != null
        ? user.weaponStock?.[npc.equippedWeaponIndex]
        : null;
      return {
        npcId: npc.npcId,
        name: npc.name,
        quality: npc.quality,
        level: npc.level || 1,
        condition: npc.condition ?? 100,
        hasWeapon: !!weapon,
        weaponName: weapon?.weaponName || null,
        weaponAtk: weapon?.atk || 0,
      };
    });
    res.json({ npcs, ownerName: user.name });
  } catch (err) {
    console.error("查詢玩家 NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PVP: 設定防禦武器
router.post("/pvp/set-defense-weapon", ensureAuth, async (req, res) => {
  try {
    const { weaponIndex } = req.body;
    const idx = parseInt(weaponIndex, 10);
    if (Number.isNaN(idx) || idx < 0) {
      return res.status(400).json({ error: "無效的武器索引" });
    }
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });
    if (!user.weaponStock?.[idx]) {
      return res.status(400).json({ error: `武器 #${idx} 不存在` });
    }
    await db.update(
      "user",
      { userId: req.user.discordId },
      { $set: { defenseWeaponIndex: idx } },
    );
    res.json({ success: true, defenseWeaponIndex: idx });
  } catch (err) {
    console.error("設定防禦武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Boss Attack
router.post("/boss-attack", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { weaponId, npcId } = req.body;
    const result = await move([null, "boss", weaponId !== undefined ? weaponId : 0, npcId], req.user.discordId);
    if (result.error) return result;
    emitSocketEvents(req.app.get("io"), result.socketEvents);
    const { socketEvents, ...clientResult } = result;
    return clientResult;
  }, "Boss 攻擊失敗");
});

module.exports = router;
