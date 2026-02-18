function setupGameEvents(io) {
    // Store io instance on the app for use in routes
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

        // Client can join a room for their user
        socket.on('join:user', (userId) => {
            socket.join(`user:${userId}`);
        });
    });

    return io;
}

module.exports = { setupGameEvents };
