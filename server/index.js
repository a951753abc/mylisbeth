require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const db = require("./db.js");

const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");
const gameRoutes = require("./routes/game.js");
const { setupGameEvents } = require("./socket/gameEvents.js");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production" ? false : "http://localhost:5173",
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? false : "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "dev-secret-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// Passport Discord strategy setup
require("./middleware/auth.js");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/game", gameRoutes);

// Socket.io
setupGameEvents(io);
app.set("io", io);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await db.connect();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
