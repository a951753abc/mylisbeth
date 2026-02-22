const E = require("./events.js");
const config = require("../game/config.js");

// 追蹤在線玩家：userId → Set<socketId>
const onlinePlayers = new Map();

/** 取得當前在線玩家數 */
function getOnlineCount() {
  return onlinePlayers.size;
}

/** 檢查玩家是否在線 */
function isPlayerOnline(userId) {
  return onlinePlayers.has(userId);
}

function setupGameEvents(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // 清理該 socket 所關聯的玩家
      const userId = socket._gameUserId;
      if (userId && onlinePlayers.has(userId)) {
        const sockets = onlinePlayers.get(userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlinePlayers.delete(userId);
        }
      }
    });

    socket.on(E.JOIN_USER, (userId) => {
      const sessionUser = socket.request?.session?.passport?.user;
      if (!sessionUser || sessionUser.discordId !== userId) {
        return; // 拒絕未認證或冒充他人的 join 請求
      }

      // 檢查是否已在線（同一玩家多分頁不佔額外名額）
      const alreadyOnline = onlinePlayers.has(userId);

      if (!alreadyOnline && onlinePlayers.size >= config.MAX_ONLINE_PLAYERS) {
        socket.emit(E.SERVER_FULL, {
          message: "伺服器已滿，請稍後再試。",
          current: onlinePlayers.size,
          max: config.MAX_ONLINE_PLAYERS,
        });
        return;
      }

      // 註冊玩家
      if (!alreadyOnline) {
        onlinePlayers.set(userId, new Set());
      }
      onlinePlayers.get(userId).add(socket.id);
      socket._gameUserId = userId;
      socket.join(`user:${userId}`);
      socket.emit(E.JOIN_ACCEPTED);
    });

    socket.on(E.LEAVE_USER, (userId) => {
      // 只允許離開自己的房間
      if (userId !== socket._gameUserId) return;
      socket.leave(`user:${userId}`);
      // 清理追蹤
      if (onlinePlayers.has(userId)) {
        const sockets = onlinePlayers.get(userId);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlinePlayers.delete(userId);
        }
      }
      delete socket._gameUserId;
    });

    // GM 後台：加入 admin dashboard 房間
    socket.on(E.JOIN_ADMIN, () => {
      if (socket.request?.session?.admin) {
        socket.join("admin:dashboard");
      }
    });
  });

  return io;
}

module.exports = { setupGameEvents, getOnlineCount, isPlayerOnline };
