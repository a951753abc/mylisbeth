function setupGameEvents(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });

    socket.on("join:user", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("leave:user", (userId) => {
      socket.leave(`user:${userId}`);
    });

    // GM 後台：加入 admin dashboard 房間
    socket.on("join:admin", () => {
      if (socket.request?.session?.admin) {
        socket.join("admin:dashboard");
      }
    });
  });

  return io;
}

module.exports = { setupGameEvents };
