const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../middleware/auth.js");
const create = require("../game/create.js");
const move = require("../game/move.js");
const help = require("../game/help.js");
const list = require("../game/list.js");
const db = require("../db.js");
const { getFloor } = require("../game/floor/floorData.js");
const { getAllDefinitions, checkAndAward } = require("../game/progression/achievement.js");
const claimDaily = require("../game/progression/daily.js");
const { calculateBill, payDebt } = require("../game/economy/settlement.js");
const { takeLoan, getLoanInfo } = require("../game/economy/loan.js");
const { sellItem, sellWeapon } = require("../game/economy/shop.js");
const { TITLE_EFFECTS } = require("../game/title/titleEffects.js");
const { validateName } = require("../utils/sanitize.js");
const config = require("../game/config.js");
const { getNextSettlementTime } = require("../game/time/gameTime.js");
const { increment } = require("../game/progression/statsTracker.js");
const { getLeaderboard, getMyRank } = require("../game/leaderboard.js");

// Create character
router.post("/create", ensureAuth, async (req, res) => {
  try {
    const nameCheck = validateName(req.body.name, "角色名稱");
    if (!nameCheck.valid) {
      return res.status(400).json({ error: nameCheck.error });
    }
    const result = await create(nameCheck.value, req.user.discordId);
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
    if (result.bankruptcy) {
      return res.status(200).json(result);
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
    const { material1, material2 } = req.body;
    // 武器名稱為選填，鍛造後可改名一次
    let weaponName = null;
    if (req.body.weaponName && String(req.body.weaponName).trim().length > 0) {
      const nameCheck = validateName(req.body.weaponName, "武器名稱");
      if (!nameCheck.valid) {
        return res.status(400).json({ error: nameCheck.error });
      }
      weaponName = nameCheck.value;
    }
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
    // 原子操作：確保 renameCount < 1 才允許改名，防止並發競態
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

// Repair
router.post("/repair", ensureAuth, async (req, res) => {
  try {
    const { weaponId, materialId } = req.body;
    const cmd = [null, "repair", weaponId, materialId];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("修復失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Adventure
router.post("/adventure", ensureAuth, async (req, res) => {
  try {
    const { weaponId, npcId } = req.body;
    const cmd = [null, "adv", weaponId, npcId];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    if (result.bankruptcy) {
      return res.status(200).json(result);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        playerName: result.battleResult?.npcName,
        result: result.battleResult,
      });
      // 廣播 NPC 死亡事件
      if (result.socketEvents) {
        for (const evt of result.socketEvents) {
          io.emit(evt.event, evt.data);
        }
      }
    }

    // 不傳 socketEvents 給前端
    const { socketEvents, ...clientResult } = result;
    res.json(clientResult);
  } catch (err) {
    console.error("冒險失敗:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "伺服器錯誤" });
    }
  }
});

// PVP (Season 5: 決鬥系統)
router.post("/pvp", ensureAuth, async (req, res) => {
  try {
    const { targetUserId, weaponId, mode, wagerCol } = req.body;
    const cmd = [null, "pvp", targetUserId, weaponId, mode, wagerCol];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    const io = req.app.get("io");
    if (io) {
      // 廣播 + 私人通知
      if (result.socketEvents) {
        for (const evt of result.socketEvents) {
          io.emit(evt.event, evt.data);
        }
      }
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
    res.json(clientResult);
  } catch (err) {
    console.error("PVP 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PVP vs NPC: 挑戰其他玩家的 NPC
router.post("/pvp-npc", ensureAuth, async (req, res) => {
  try {
    const { targetNpcId, weaponId, mode, wagerCol } = req.body;
    const cmd = [null, "pvpNpc", targetNpcId, weaponId, mode, wagerCol];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    const io = req.app.get("io");
    if (io) {
      if (result.socketEvents) {
        for (const evt of result.socketEvents) {
          io.emit(evt.event, evt.data);
        }
      }
      // 通知 NPC 擁有者
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
    res.json(clientResult);
  } catch (err) {
    console.error("PVP-NPC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 查詢某玩家的 NPC 列表（供 NPC 決鬥選擇用）
router.get("/players/:userId/npcs", ensureAuth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const user = await db.findOne("user", { userId: targetUserId });
    if (!user) {
      return res.status(404).json({ error: "找不到該玩家" });
    }
    const npcs = (user.hiredNpcs || []).map((npc, idx) => {
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
  try {
    const { weaponId, npcId } = req.body;
    const cmd = [null, "boss", weaponId !== undefined ? weaponId : 0, npcId];
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
    const rawProgress = (user.floorProgress || {})[currentFloor] || {};
    const floorProgress = {
      explored: rawProgress.explored ?? 0,
      maxExplore: rawProgress.maxExplore ?? (floorData.maxExplore || config.FLOOR_MAX_EXPLORE),
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

    // 精簡 phases 資料（只給前端需要的顯示資訊）
    const phases = (floorData.boss.phases || []).map((p) => ({
      hpThreshold: p.hpThreshold,
      weapon: p.weapon || null,
    }));

    res.json({
      floor: {
        floorNumber: floorData.floorNumber,
        name: floorData.name,
        nameCn: floorData.nameCn,
        boss: {
          name: floorData.boss.name,
          totalHp: floorData.boss.hp,
          initialWeapon: floorData.boss.initialWeapon || null,
          phases,
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
        currentWeapon: bossStatus.currentWeapon || floorData.boss.initialWeapon || null,
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
router.post("/daily", ensureAuth, ensureNotPaused, async (req, res) => {
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

    const unlocked = allDefs
      .filter((ach) => userAchievements.has(ach.id))
      .map((ach) => ({
        id: ach.id,
        name: ach.name,
        nameCn: ach.nameCn,
        desc: ach.desc,
        titleReward: ach.titleReward,
        unlocked: true,
      }));

    const totalCount = allDefs.length;

    res.json({ achievements: unlocked, totalCount });
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

// Settlement preview
router.get("/settlement", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });
    const bill = calculateBill(user);
    const loanInfo = getLoanInfo(user);
    res.json({
      bill,
      debt: user.debt || 0,
      isInDebt: user.isInDebt || false,
      debtCycleCount: user.debtCycleCount || 0,
      nextSettlementAt: user.nextSettlementAt || null,
      col: user.col || 0,
      loanInfo,
    });
  } catch (err) {
    console.error("取得帳單失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Pay debt
router.post("/pay-debt", ensureAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "還款金額無效" });
    const result = await payDebt(req.user.discordId, amount);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("還債失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Loan (擴大負債)
router.post("/loan", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "借款金額無效" });
    const result = await takeLoan(req.user.discordId, Math.floor(amount));
    if (result.error) return res.status(400).json(result);
    if (result.bankruptcy) {
      return res.status(200).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("借款失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Sell item (回收素材，不走 move 冷卻)
router.post("/sell-item", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { itemIndex, quantity } = req.body;
    if (itemIndex === undefined || itemIndex === null) {
      return res.status(400).json({ error: "缺少素材索引" });
    }
    const result = await sellItem(
      req.user.discordId,
      parseInt(itemIndex, 10),
      parseInt(quantity, 10) || 1,
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("出售素材失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Sell weapon (回收武器，不走 move 冷卻)
router.post("/sell-weapon", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const { weaponIndex } = req.body;
    if (weaponIndex === undefined || weaponIndex === null) {
      return res.status(400).json({ error: "缺少武器索引" });
    }
    const result = await sellWeapon(
      req.user.discordId,
      parseInt(weaponIndex, 10),
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    console.error("出售武器失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Solo adventure (鍛造師親自冒險)
router.post("/solo-adventure", ensureAuth, async (req, res) => {
  try {
    const { weaponId } = req.body;
    const cmd = [null, "soloAdv", weaponId !== undefined ? weaponId : 0];
    const result = await move(cmd, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    if (result.bankruptcy) {
      return res.status(200).json(result);
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("battle:result", {
        type: "soloAdv",
        playerName: result.battleResult?.npcName,
        result: result.battleResult,
      });
    }
    res.json(result);
  } catch (err) {
    console.error("獨自出擊失敗:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "伺服器錯誤" });
    }
  }
});

// Player list
router.get("/players", ensureAuth, async (req, res) => {
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

// Graveyard (墓碑紀錄)
router.get("/graveyard", async (req, res) => {
  try {
    const DEATH_CAUSES = config.DEATH_CAUSES;
    const logs = await db.find("bankruptcy_log", {
      cause: { $in: DEATH_CAUSES },
    });
    // 按死亡時間降序排列（最近的在前）
    logs.sort((a, b) => (b.bankruptedAt || 0) - (a.bankruptedAt || 0));
    const CAUSE_LABELS = {
      solo_adventure_death: "冒險戰死",
      laughing_coffin_mine: "微笑棺木襲擊",
      laughing_coffin_solo: "微笑棺木襲擊",
      debt: "負債破產",
      pvp_total_loss: "決鬥陣亡",
    };
    const graves = logs.map((log) => ({
      name: log.name,
      title: log.title || null,
      forgeLevel: log.forgeLevel || 1,
      currentFloor: log.currentFloor || 1,
      weaponCount: log.weaponCount || 0,
      hiredNpcCount: log.hiredNpcCount || 0,
      finalCol: log.finalCol || 0,
      diedAt: log.bankruptedAt,
      cause: CAUSE_LABELS[log.cause] || "不明",
    }));
    res.json({ graves });
  } catch (err) {
    console.error("取得墓碑紀錄失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Title effects
router.get("/title-effects", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });
    const title = user.title || null;
    const effects = title ? (TITLE_EFFECTS[title] || null) : null;
    res.json({ title, effects, allEffects: TITLE_EFFECTS });
  } catch (err) {
    console.error("取得稱號效果失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 暫停/恢復營業
router.post("/pause-business", ensureAuth, async (req, res) => {
  try {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const { paused } = req.body;
    if (typeof paused !== "boolean") {
      return res.status(400).json({ error: "參數錯誤" });
    }

    if (paused === (user.businessPaused || false)) {
      return res.status(400).json({
        error: paused ? "已經處於暫停狀態" : "目前沒有暫停營業",
      });
    }

    const now = Date.now();
    const updates = paused
      ? { businessPaused: true, businessPausedAt: now }
      : {
          businessPaused: false,
          businessPausedAt: null,
          nextSettlementAt: getNextSettlementTime(now),
        };

    await db.update("user", { userId }, { $set: updates });

    // 暫停時記錄統計並檢查成就
    if (paused) {
      await increment(userId, "totalPauses");
      await checkAndAward(userId);
    }

    res.json({ success: true, businessPaused: paused });
  } catch (err) {
    console.error("暫停營業失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Leaderboard
router.get("/leaderboard", ensureAuth, async (req, res) => {
  try {
    const { category, sub, page } = req.query;
    if (!category) {
      return res.status(400).json({ error: "缺少排行榜分類" });
    }
    const result = await getLeaderboard(category, sub || null, page || 1, req.user.discordId);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error("取得排行榜失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Leaderboard: my rank
router.get("/leaderboard/my-rank", ensureAuth, async (req, res) => {
  try {
    const { category, sub } = req.query;
    if (!category) {
      return res.status(400).json({ error: "缺少排行榜分類" });
    }
    const myRank = await getMyRank(category, sub || null, req.user.discordId);
    res.json({ myRank });
  } catch (err) {
    console.error("取得我的排名失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Help
router.get("/help", (req, res) => {
  res.json({ commands: help() });
});

module.exports = router;
