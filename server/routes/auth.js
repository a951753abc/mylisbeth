const express = require('express');
const passport = require('passport');
const router = express.Router();

// Discord OAuth2 login
router.get('/discord', passport.authenticate('discord'));

// OAuth2 callback
router.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
        // Redirect to frontend after successful auth
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
            user: req.user,
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
