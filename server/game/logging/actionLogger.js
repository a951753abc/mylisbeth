const db = require("../../db.js");

/**
 * 記錄玩家操作日誌（fire-and-forget，不阻塞遊戲流程）
 * @param {string} userId
 * @param {string} playerName
 * @param {string} action - "mine" | "forge" | "adv" | "boss" | "npc:hire" | "market:buy" | "admin:modify_col" 等
 * @param {object} details - 動作專屬資料
 * @param {boolean} success
 * @param {string|null} error
 */
function logAction(userId, playerName, action, details, success = true, error = null) {
  const doc = {
    userId: userId || "unknown",
    playerName: playerName || "unknown",
    action,
    details: details || {},
    success,
    error: error || null,
    timestamp: new Date(),
  };
  db.insertOne("action_logs", doc).catch((err) => {
    console.error("Action log write failed:", err.message);
  });
}

module.exports = { logAction };
