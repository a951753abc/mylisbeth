const express = require("express");
const router = express.Router();
const { adminLogin, ensureAdmin } = require("../../middleware/adminAuth.js");

// POST /api/admin/login
router.post("/login", adminLogin);

// POST /api/admin/logout
router.post("/logout", ensureAdmin, (req, res) => {
  delete req.session.admin;
  res.json({ success: true });
});

// GET /api/admin/me
router.get("/me", (req, res) => {
  if (req.session && req.session.admin) {
    return res.json({ authenticated: true, admin: req.session.admin });
  }
  res.json({ authenticated: false });
});

module.exports = router;
