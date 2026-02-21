const express = require("express");
const router = express.Router();
const {
  getCurrentConfig,
  getDefaults,
  getOverrides,
  setOverride,
  resetOverride,
  resetAll,
} = require("../../game/configManager.js");
const { logAction } = require("../../game/logging/actionLogger.js");

// GET /api/admin/config — 當前完整設定
router.get("/", (req, res) => {
  res.json({ config: getCurrentConfig() });
});

// GET /api/admin/config/defaults — 預設值
router.get("/defaults", (req, res) => {
  res.json({ defaults: getDefaults() });
});

// GET /api/admin/config/overrides — 僅覆蓋值
router.get("/overrides", async (req, res) => {
  try {
    const overrides = await getOverrides();
    res.json({ overrides });
  } catch (err) {
    console.error("取得覆蓋值失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PUT /api/admin/config/overrides — 設定覆蓋值
router.put("/overrides", async (req, res) => {
  try {
    const { path, value } = req.body;
    if (!path) return res.status(400).json({ error: "缺少 path" });
    if (value === undefined) return res.status(400).json({ error: "缺少 value" });

    await setOverride(path, value, req.session.admin.username);

    logAction(null, null, "admin:config_override", {
      path,
      value,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true, path, value });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/config/overrides/:path — 還原單一設定
router.delete("/overrides/:path(*)", async (req, res) => {
  try {
    const path = req.params.path;
    await resetOverride(path, req.session.admin.username);

    logAction(null, null, "admin:config_reset", {
      path,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true, path });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/config/reset-all — 全部還原預設
router.post("/reset-all", async (req, res) => {
  try {
    await resetAll(req.session.admin.username);

    logAction(null, null, "admin:config_reset_all", {
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("全部還原失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
