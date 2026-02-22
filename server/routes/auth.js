const express = require('express');
const passport = require('passport');
const router = express.Router();

// Discord OAuth2 login
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth2 callback
router.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        const clientUrl = process.env.NODE_ENV === 'production'
            ? '/'
            : 'http://localhost:5173/';
        // 確保 session 寫入 MongoDB 後再 redirect，防止 race condition
        req.session.save((err) => {
            if (err) {
                console.error('Session save error after Discord OAuth:', err);
            }
            res.redirect(clientUrl);
        });
    }
);

// Google OAuth2 login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth2 callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        const clientUrl = process.env.NODE_ENV === 'production'
            ? '/'
            : 'http://localhost:5173/';
        // 確保 session 寫入 MongoDB 後再 redirect，防止 race condition
        req.session.save((err) => {
            if (err) {
                console.error('Session save error after Google OAuth:', err);
            }
            res.redirect(clientUrl);
        });
    }
);

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: '登出失敗' });
        }
        // 完全銷毀 session 並清除 cookie，避免殘留 session 影響下次登入
        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                console.error('Session destroy error:', destroyErr);
            }
            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    });
});

// Get current session status
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: { ...req.user, provider: req.user.provider || 'discord' },
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
