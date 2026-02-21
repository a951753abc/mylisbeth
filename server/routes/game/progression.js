const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../../middleware/auth.js");
const db = require("../../db.js");
const help = require("../../game/help.js");
const list = require("../../game/list.js");
const config = require("../../game/config.js");
const { getAllDefinitions } = require("../../game/progression/achievement.js");
const claimDaily = require("../../game/progression/daily.js");
const { TITLE_EFFECTS } = require("../../game/title/titleEffects.js");
const { getLeaderboard, getMyRank } = require("../../game/leaderboard.js");
const { logAction } = require("../../game/logging/actionLogger.js");
const { handleRoute } = require("./helpers.js");

// Daily reward
router.post("/daily", ensureAuth, ensureNotPaused, async (req, res) => {
  await handleRoute(res, async () => {
    const result = await claimDaily(req.user.discordId);
    if (!result?.error) logAction(req.user.discordId, req.gameUser?.name, "daily", {});
    return result;
  }, "每日獎勵失敗");
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

    res.json({ achievements: unlocked, totalCount: allDefs.length });
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

// Player list
router.get("/players", ensureAuth, async (req, res) => {
  await handleRoute(res, () => list(parseInt(req.query.page, 10) || 1), "取得玩家列表失敗");
});

// Graveyard (墓碑紀錄)
router.get("/graveyard", async (req, res) => {
  try {
    const logs = await db.find("bankruptcy_log", {
      cause: { $in: config.DEATH_CAUSES },
    });
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

// Leaderboard
router.get("/leaderboard", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { category, sub, page } = req.query;
    if (!category) return { error: "缺少排行榜分類" };
    return await getLeaderboard(category, sub || null, page || 1, req.user.discordId);
  }, "取得排行榜失敗");
});

// Leaderboard: my rank
router.get("/leaderboard/my-rank", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { category, sub } = req.query;
    if (!category) return { error: "缺少排行榜分類" };
    const myRank = await getMyRank(category, sub || null, req.user.discordId);
    return { myRank };
  }, "取得我的排名失敗");
});

// Help
router.get("/help", (req, res) => {
  res.json({ commands: help() });
});

module.exports = router;
