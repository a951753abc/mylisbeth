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
        res.redirect(clientUrl);
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
        res.redirect(clientUrl);
    }
);

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: '登出失敗' });
        }
        res.json({ success: true });
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
