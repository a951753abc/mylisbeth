const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth.js');
const db = require('../db.js');
const create = require('../game/create.js');
const move = require('../game/move.js');
const help = require('../game/help.js');
const list = require('../game/list.js');

// Create character
router.post('/create', ensureAuth, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await create(name, req.user.discordId);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("建立角色失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Mine
router.post('/mine', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.status(400).json({ error: '請先建立角色' });
        const cmd = [null, 'mine'];
        const result = await move(cmd, user);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("挖礦失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Forge
router.post('/forge', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.status(400).json({ error: '請先建立角色' });
        const { material1, material2, weaponName } = req.body;
        const cmd = [null, 'forge', material1, material2, weaponName];
        const result = await move(cmd, user);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("鍛造失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Upgrade
router.post('/upgrade', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.status(400).json({ error: '請先建立角色' });
        const { weaponId, materialId } = req.body;
        const cmd = [null, 'up', weaponId, materialId];
        const result = await move(cmd, user);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("強化失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Adventure
router.post('/adventure', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.status(400).json({ error: '請先建立角色' });
        const { weaponId } = req.body;
        const cmd = [null, 'adv', weaponId];
        const result = await move(cmd, user);
        if (result.error) {
            return res.status(400).json(result);
        }
        // Emit socket event for real-time battle results
        const io = req.app.get('io');
        if (io) {
            io.emit('battle:result', {
                playerName: user.name,
                result: result.battleResult,
            });
        }
        res.json(result);
    } catch (err) {
        console.error("冒險失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// PVP
router.post('/pvp', ensureAuth, async (req, res) => {
    try {
        const user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.status(400).json({ error: '請先建立角色' });
        const { targetName, weaponId } = req.body;
        const cmd = [null, 'pvp', targetName, weaponId];
        const result = await move(cmd, user);
        if (result.error) {
            return res.status(400).json(result);
        }
        const io = req.app.get('io');
        if (io) {
            io.emit('battle:result', {
                type: 'pvp',
                attacker: user.name,
                defender: targetName,
                winner: result.winner,
            });
        }
        res.json(result);
    } catch (err) {
        console.error("PVP 失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Player list
router.get('/players', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const result = await list(page);
        if (result.error) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        console.error("取得玩家列表失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

// Help
router.get('/help', (req, res) => {
    res.json({ commands: help() });
});

module.exports = router;
