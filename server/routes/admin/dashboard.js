const express = require("express");
const router = express.Router();
const db = require("../../db.js");

async function getDashboardStats(io) {
  const [playerCount, deadCount, serverState, colAgg, debtCount, recentLogs] =
    await Promise.all([
      db.count("user", {}),
      db.count("bankruptcy_log", {}),
      db.findOne("server_state", { _id: "aincrad" }),
      db.aggregate("user", [
        {
          $group: {
            _id: null,
            totalCol: { $sum: "$col" },
            avgCol: { $avg: "$col" },
          },
        },
      ]),
      db.count("user", { isInDebt: true }),
      db.findWithOptions("action_logs", {}, {
        sort: { timestamp: -1 },
        limit: 20,
        projection: {
          userId: 1,
          playerName: 1,
          action: 1,
          success: 1,
          timestamp: 1,
        },
      }),
    ]);

  const onlineCount = io ? io.engine.clientsCount : 0;
  const economy = colAgg[0] || { totalCol: 0, avgCol: 0 };

  return {
    players: {
      alive: playerCount,
      dead: deadCount,
      online: onlineCount,
    },
    floor: {
      current: serverState?.bossStatus?.floorNumber || serverState?.currentFloor || 1,
    },
    boss: serverState?.bossStatus || null,
    economy: {
      totalCol: economy.totalCol,
      avgCol: Math.round(economy.avgCol || 0),
      playersInDebt: debtCount,
    },
    recentActivity: recentLogs,
  };
}

// GET /api/admin/dashboard/stats
router.get("/stats", async (req, res) => {
  try {
    const io = req.app.get("io");
    const stats = await getDashboardStats(io);
    res.json(stats);
  } catch (err) {
    console.error("取得儀表板統計失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/admin/dashboard/online — 線上玩家
router.get("/online", async (req, res) => {
  try {
    const io = req.app.get("io");
    const onlineCount = io ? io.engine.clientsCount : 0;
    res.json({ online: onlineCount });
  } catch (err) {
    console.error("取得線上人數失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
module.exports.getDashboardStats = getDashboardStats;
