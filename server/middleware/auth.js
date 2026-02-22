const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/api/auth/callback',
        scope: ['identify'],
    }, (accessToken, refreshToken, profile, done) => {
        const user = {
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            provider: 'discord',
        };
        return done(null, user);
    }));
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
    }, (accessToken, refreshToken, profile, done) => {
        const user = {
            discordId: 'g_' + profile.id,
            username: profile.displayName,
            avatar: profile.photos?.[0]?.value || null,
            provider: 'google',
        };
        return done(null, user);
    }));
}

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: '未登入，請先進行認證。' });
}

/**
 * 暫停營業檢查中間件：封鎖經濟相關操作
 * 必須放在 ensureAuth 之後使用
 */
function ensureNotPaused(req, res, next) {
    const db = require('../db.js');
    db.findOne('user', { userId: req.user.discordId }, { projection: { businessPaused: 1, name: 1 } })
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: '角色不存在' });
            }
            if (user.businessPaused) {
                return res.status(400).json({ error: '你的店已暫停營業，請先恢復營業才能進行操作。' });
            }
            req.gameUser = user;
            next();
        })
        .catch((err) => {
            console.error('暫停營業檢查失敗:', err);
            res.status(500).json({ error: '伺服器錯誤' });
        });
}

/**
 * 在線人數限制中間件：未在線 + 伺服器已滿時返回 503
 * 未認證請求或伺服器未滿時直接放行（允許新玩家創角、重連中操作）
 */
function ensureOnline(req, res, next) {
    if (!req.isAuthenticated()) return next();
    const { isPlayerOnline, getOnlineCount } = require('../socket/gameEvents.js');
    const config = require('../game/config.js');
    if (!isPlayerOnline(req.user.discordId) && getOnlineCount() >= config.MAX_ONLINE_PLAYERS) {
        return res.status(503).json({ error: '伺服器已滿，請稍後再試。' });
    }
    next();
}

module.exports = { ensureAuth, ensureNotPaused, ensureOnline };
