const express = require("express");
const router = express.Router();
const db = require("../../db.js");

// GET /api/admin/logs?userId=&action=&from=&to=&page=1&limit=50
router.get("/", async (req, res) => {
  try {
    const {
      userId,
      action,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await db.count("action_logs", query);
    const logs = await db.findWithOptions("action_logs", query, {
      sort: { timestamp: -1 },
      skip,
      limit: parseInt(limit),
    });

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("查詢日誌失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// GET /api/admin/logs/stats — 動作類型統計
router.get("/stats", async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to) match.timestamp.$lte = new Date(to);
    }

    const pipeline = [
      ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    const stats = await db.aggregate("action_logs", pipeline);
    res.json({ stats });
  } catch (err) {
    console.error("統計日誌失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
