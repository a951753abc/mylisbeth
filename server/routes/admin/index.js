const express = require("express");
const router = express.Router();
const { ensureAdmin } = require("../../middleware/adminAuth.js");

const authRoutes = require("./auth.js");
const playerRoutes = require("./players.js");
const configRoutes = require("./config.js");
const logRoutes = require("./logs.js");
const dashboardRoutes = require("./dashboard.js");

// Auth 路由不需要 ensureAdmin（login/me 要公開）
router.use("/", authRoutes);
router.use("/players", ensureAdmin, playerRoutes);
router.use("/config", ensureAdmin, configRoutes);
router.use("/logs", ensureAdmin, logRoutes);
router.use("/dashboard", ensureAdmin, dashboardRoutes);

module.exports = router;
