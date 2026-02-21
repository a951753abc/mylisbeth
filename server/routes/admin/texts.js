const express = require("express");
const router = express.Router();
const {
  getCurrentTexts,
  getDefaults,
  getOverrides,
  setOverride,
  resetOverride,
  resetAll,
} = require("../../game/textManager.js");
const { logAction } = require("../../game/logging/actionLogger.js");

// GET /api/admin/texts — 當前完整文字
router.get("/", (req, res) => {
  res.json({ texts: getCurrentTexts() });
});

// GET /api/admin/texts/defaults — 預設值
router.get("/defaults", (req, res) => {
  res.json({ defaults: getDefaults() });
});

// GET /api/admin/texts/overrides — 僅覆蓋值
router.get("/overrides", async (req, res) => {
  try {
    const overrides = await getOverrides();
    res.json({ overrides });
  } catch (err) {
    console.error("取得文字覆蓋值失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// PUT /api/admin/texts/overrides — 設定文字覆蓋
router.put("/overrides", async (req, res) => {
  try {
    const { path, value } = req.body;
    if (!path) return res.status(400).json({ error: "缺少 path" });
    if (value === undefined) return res.status(400).json({ error: "缺少 value" });

    await setOverride(path, value, req.session.admin.username);

    logAction(null, null, "admin:text_override", {
      path,
      value,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true, path, value });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/admin/texts/overrides/:path — 還原單一文字
router.delete("/overrides/:path(*)", async (req, res) => {
  try {
    const path = req.params.path;
    await resetOverride(path, req.session.admin.username);

    logAction(null, null, "admin:text_reset", {
      path,
      adminUser: req.session.admin.username,
    });

    res.json({ success: true, path });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/texts/reset-all — 全部還原預設
router.post("/reset-all", async (req, res) => {
  try {
    await resetAll(req.session.admin.username);

    logAction(null, null, "admin:text_reset_all", {
      adminUser: req.session.admin.username,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("全部還原文字失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
