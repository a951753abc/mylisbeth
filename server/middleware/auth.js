const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

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
        };
        return done(null, user);
    }));
}

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: '未登入，請先進行 Discord 認證。' });
}

/**
 * 暫停營業檢查中間件：封鎖經濟相關操作
 * 必須放在 ensureAuth 之後使用
 */
function ensureNotPaused(req, res, next) {
    const db = require('../db.js');
    db.findOne('user', { userId: req.user.discordId })
        .then((user) => {
            if (!user) {
                return res.status(404).json({ error: '角色不存在' });
            }
            if (user.businessPaused) {
                return res.status(400).json({ error: '你的店已暫停營業，請先恢復營業才能進行操作。' });
            }
            next();
        })
        .catch((err) => {
            console.error('暫停營業檢查失敗:', err);
            res.status(500).json({ error: '伺服器錯誤' });
        });
}

module.exports = { ensureAuth, ensureNotPaused };
