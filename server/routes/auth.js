const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * 取得 OAuth 成功後的 redirect URL
 */
function getClientUrl() {
    return process.env.NODE_ENV === 'production'
        ? '/'
        : 'http://localhost:5173/';
}

/**
 * 建立 OAuth callback handler（通用於 Discord / Google）
 *
 * Passport 0.6+ 的 req.login() 預設會呼叫 session.regenerate()，
 * 這跟 connect-mongo 搭配時容易造成 session 在 redirect 前遺失。
 * 改用 custom callback 手動控制 login 流程，跳過 regenerate 以避免此問題。
 */
function oauthCallbackHandler(strategy) {
    return (req, res, next) => {
        passport.authenticate(strategy, (err, user, info) => {
            if (err) {
                console.error(`OAuth ${strategy} error:`, err);
                return res.redirect(getClientUrl());
            }
            if (!user) {
                console.error(`OAuth ${strategy} failed — no user returned. info:`, info);
                return res.redirect(getClientUrl());
            }

            // keepSessionInfo: true → 跳過 session.regenerate()，避免 Passport 0.6+ 與 MongoStore 的相容性問題
            req.login(user, { keepSessionInfo: true }, (loginErr) => {
                if (loginErr) {
                    console.error(`OAuth ${strategy} login error:`, loginErr);
                    return res.redirect(getClientUrl());
                }
                // 確保 session 寫入 MongoDB 後再 redirect
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error(`Session save error after ${strategy} OAuth:`, saveErr);
                    }
                    res.redirect(getClientUrl());
                });
            });
        })(req, res, next);
    };
}

// Discord OAuth2 login
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth2 callback
router.get('/callback', oauthCallbackHandler('discord'));

// Google OAuth2 login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth2 callback
router.get('/google/callback', oauthCallbackHandler('google'));

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
            res.clearCookie('connect.sid', {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: 'lax',
            });
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
