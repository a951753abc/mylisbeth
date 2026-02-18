const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/auth.js");
const create = require("../game/create.js");
const move = require("../game/move.js");
const help = require("../game/help.js");
const list = require("../game/list.js");
const db = require("../db.js");
const { getFloor } = require("../game/floor/floorData.js");
const { getAllDefinitions } = require("../game/progression/achievement.js");
const claimDaily = require("../game/progression/daily.js");

// Create character
router.post("/create", ensureAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await create(name, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("建立角色失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Mine
router.post("/mine", ensureAuth, async (req, res) => {
  try {
    const cmd = [null, "mine"];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("挖礦失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Forge
router.post("/forge", ensureAuth, async (req, res) => {
  try {
    const { material1, material2, weaponName } = req.body;
    const cmd = [null, "forge", material1, material2, weaponName];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("鍛造失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Upgrade
router.post("/upgrade", ensureAuth, async (req, res) => {
  try {
    const { weaponId, materialId } = req.body;
    const cmd = [null, "up", weaponId, materialId];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("強化失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Adventure
router.post("/adventure", ensureAuth, async (req, res) => {
  try {
    const { weaponId } = req.body;
    const cmd = [null, "adv", weaponId];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        playerName: result.battleResult?.npcName,
        result: result.battleResult,
      });
    }
    res.json(result);
  } catch (err) {
    console.error("冒險失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PVP
router.post("/pvp", ensureAuth, async (req, res) => {
  try {
    const { targetName, weaponId } = req.body;
    const cmd = [null, "pvp", targetName, weaponId];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        type: "pvp",
        attacker: result.attackerName,
        defender: result.defenderName,
        winner: result.winner,
      });
      if (result.defenderId) {
        io.to("user:" + result.defenderId).emit("pvp:attacked", {
          attacker: result.attackerName,
          winner: result.winner,
          reward: result.reward,
        });
      }
    }
    res.json(result);
  } catch (err) {
    console.error("PVP 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Boss Attack
router.post("/boss-attack", ensureAuth, async (req, res) => {
  try {
    const { weaponId } = req.body;
    const cmd = [null, "boss", weaponId !== undefined ? weaponId : 0];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }

    const io = req.app.get("io");
    if (io && result.socketEvents) {
      for (const evt of result.socketEvents) {
        io.emit(evt.event, evt.data);
      }
    }

    const { socketEvents, ...clientResult } = result;
    res.json(clientResult);
  } catch (err) {
    console.error("Boss 攻擊失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Get floor info
router.get("/floor", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const currentFloor = user.currentFloor || 1;
    const floorData = getFloor(currentFloor);
    const floorProgress = (user.floorProgress || {})[currentFloor] || {
      explored: 0,
      maxExplore: 5,
    };

    let serverState = await db.findOne("server_state", { _id: "aincrad" });
    const bossStatus = serverState?.bossStatus || {
      floorNumber: currentFloor,
      active: false,
      currentHp: floorData.boss.hp,
      totalHp: floorData.boss.hp,
      participants: [],
    };

    // Check if boss expired
    if (bossStatus.active && bossStatus.expiresAt) {
      const now = new Date();
      if (now > new Date(bossStatus.expiresAt)) {
        bossStatus.active = false;
        bossStatus.currentHp = floorData.boss.hp;
      }
    }

    res.json({
      floor: {
        floorNumber: floorData.floorNumber,
        name: floorData.name,
        nameCn: floorData.nameCn,
        boss: {
          name: floorData.boss.name,
          totalHp: floorData.boss.hp,
        },
        maxExplore: floorData.maxExplore,
      },
      progress: floorProgress,
      bossStatus: {
        active: bossStatus.active,
        currentHp: Math.max(0, bossStatus.currentHp),
        totalHp: bossStatus.totalHp || floorData.boss.hp,
        participants: (bossStatus.participants || []).map((p) => ({
          name: p.name,
          damage: p.damage,
          attacks: p.attacks,
        })),
        expiresAt: bossStatus.expiresAt,
      },
      canAttackBoss: floorProgress.explored >= floorProgress.maxExplore,
    });
  } catch (err) {
    console.error("取得樓層資訊失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Floor history
router.get("/floor/history", ensureAuth, async (req, res) => {
  try {
    const serverState = await db.findOne("server_state", { _id: "aincrad" });
    const history = serverState?.floorHistory || [];
    res.json({ history });
  } catch (err) {
    console.error("取得樓層歷史失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Daily reward
router.post("/daily", ensureAuth, async (req, res) => {
  try {
    const result = await claimDaily(req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("每日獎勵失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Achievements
router.get("/achievements", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const allDefs = getAllDefinitions();
    const userAchievements = new Set(user.achievements || []);

    const achievements = allDefs.map((ach) => ({
      id: ach.id,
      name: ach.name,
      nameCn: ach.nameCn,
      desc: ach.desc,
      titleReward: ach.titleReward,
      unlocked: userAchievements.has(ach.id),
    }));

    res.json({ achievements });
  } catch (err) {
    console.error("取得成就失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Set title
router.post("/title", ensureAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    if (title !== null && !(user.availableTitles || []).includes(title)) {
      return res.status(400).json({ error: "你沒有這個稱號" });
    }

    await db.update(
      "user",
      { userId: req.user.discordId },
      { $set: { title } },
    );
    res.json({ success: true, title });
  } catch (err) {
    console.error("設定稱號失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Player list
router.get("/players", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const result = await list(page);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("取得玩家列表失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Help
router.get("/help", (req, res) => {
  res.json({ commands: help() });
});

module.exports = router;
