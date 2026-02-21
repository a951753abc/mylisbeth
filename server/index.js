require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const path = require("path");
const db = require("./db.js");

const itemCache = require("./game/cache/itemCache.js");
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");
const gameRoutes = require("./routes/game.js");
const npcRoutes = require("./routes/npc.js");
const marketRoutes = require("./routes/market.js");
const skillRoutes = require("./routes/skill.js");
const adminRoutes = require("./routes/admin/index.js");
const { setupGameEvents } = require("./socket/gameEvents.js");
const emitter = require("./socket/emitter.js");
const { runNpcPurchases } = require("./game/economy/market.js");
const config = require("./game/config.js");
const configManager = require("./game/configManager.js");
const textManager = require("./game/textManager.js");
const { getDashboardStats } = require("./routes/admin/dashboard.js");

// Session Secret 安全檢查
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.error("CRITICAL: SESSION_SECRET 未設定，生產環境禁止使用預設值！");
  process.exit(1);
} else if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET 未設定，使用開發預設值。請勿在生產環境使用。");
}

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
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/lisbeth",
    collectionName: "sessions",
    ttl: 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
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
app.use("/api/skill", skillRoutes);
app.use("/api/admin", adminRoutes);

// Socket.io
setupGameEvents(io);
app.set("io", io);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  // Admin SPA 路由（比遊戲 catch-all 更具體，需放在前面）
  app.get("/admin*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/admin.html"));
  });
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  await db.connect();
  await itemCache.load();
  await configManager.loadOverrides();
  await textManager.loadOverrides();

  // Season 6: NPC 自動購買（每遊戲日 = 5 分鐘）
  const npcPurchaseTimer = setInterval(() => {
    runNpcPurchases().catch((err) => console.error("NPC 自動購買失敗:", err));
  }, config.TIME_SCALE);

  // GM 儀表板：每 10 秒向 admin 房間推送狀態
  const dashboardTimer = setInterval(async () => {
    const room = io.sockets.adapter.rooms.get("admin:dashboard");
    if (!room || room.size === 0) return;
    try {
      const stats = await getDashboardStats(io);
      emitter.adminDashboardUpdate(io, stats);
    } catch (err) {
      console.error("Dashboard push failed:", err.message);
    }
  }, 10000);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful Shutdown
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received — graceful shutdown...`);

    clearInterval(npcPurchaseTimer);
    clearInterval(dashboardTimer);

    server.close(() => {
      console.log("HTTP server closed.");
    });

    io.close();

    try {
      await db.close();
      console.log("MongoDB connection closed.");
    } catch (err) {
      console.error("MongoDB close error:", err.message);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
