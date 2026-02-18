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

module.exports = { ensureAuth };
