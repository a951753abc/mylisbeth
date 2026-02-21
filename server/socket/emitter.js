/**
 * Socket.io 類型化發送函式
 * 路由層只需呼叫 emitter.battleResult(io, data) 等方法
 */
const E = require("./events.js");

/** 發送 socketEvents 陣列（boss:damage, floor:unlocked 等由 handler 組裝） */
function emitSocketEvents(io, events) {
  if (!io || !events) return;
  for (const evt of events) {
    io.emit(evt.event, evt.data);
  }
}

/** 廣播戰鬥結果（冒險 / 獨自出擊 / PvP） */
function battleResult(io, data) {
  if (!io) return;
  io.emit(E.BATTLE_RESULT, data);
}

/** 對特定玩家發送被挑戰通知 */
function pvpAttacked(io, targetUserId, data) {
  if (!io) return;
  io.to(`user:${targetUserId}`).emit(E.PVP_ATTACKED, data);
}

/** 推送 GM 儀表板更新 */
function adminDashboardUpdate(io, stats) {
  if (!io) return;
  io.to("admin:dashboard").emit(E.ADMIN_DASHBOARD_UPDATE, stats);
}

module.exports = {
  emitSocketEvents,
  battleResult,
  pvpAttacked,
  adminDashboardUpdate,
};
