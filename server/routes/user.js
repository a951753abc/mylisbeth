const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth.js');
const db = require('../db.js');
const info = require('../game/info.js');

// Get current user game info
router.get('/me', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) {
            return res.json({ exists: false });
        }
        const userInfo = info(user);
        res.json({ exists: true, ...userInfo });
    } catch (err) {
        console.error("取得使用者資料失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

module.exports = router;
