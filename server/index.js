require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const path = require("path");
const db = require("./db.js");

const itemCache = require("./game/cache/itemCache.js");
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");
const gameRoutes = require("./routes/game.js");
const npcRoutes = require("./routes/npc.js");
const marketRoutes = require("./routes/market.js");
const { setupGameEvents } = require("./socket/gameEvents.js");
const { runNpcPurchases } = require("./game/economy/market.js");
const config = require("./game/config.js");

const app = express();
app.set("trust proxy", 1);
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
    secure: false,
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
app.use("/api/npc", npcRoutes);
app.use("/api/market", marketRoutes);

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
  await itemCache.load();

  // Season 6: NPC 自動購買（每遊戲日 = 5 分鐘）
  setInterval(() => {
    runNpcPurchases().catch((err) => console.error("NPC 自動購買失敗:", err));
  }, config.TIME_SCALE);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
