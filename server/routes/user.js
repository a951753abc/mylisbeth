const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth.js');
const db = require('../db.js');
const info = require('../game/info.js');
const { checkSettlement } = require('../game/economy/debtCheck.js');
const { recoverConditions } = require('../game/npc/npcManager.js');
const { getGameDaysSince } = require('../game/time/gameTime.js');
const { regenStamina } = require('../game/stamina/staminaCheck.js');
const ensureUserFields = require('../game/migration/ensureUserFields.js');

// Get current user game info
router.get('/me', ensureAuth, async (req, res) => {
    try {
        let user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) {
            return res.json({ exists: false });
        }

        // 遷移檢查：補缺失欄位 + 修復損壞的 nextSettlementAt
        user = await ensureUserFields(user);

        // 補算離線期間的帳單
        const settlementResult = await checkSettlement(user.userId);
        if (settlementResult.bankruptcy) {
            return res.json({
                exists: false,
                bankruptcy: true,
                bankruptcyInfo: settlementResult.bankruptcyInfo,
            });
        }

        // 玩家體力自然回復（初始化 lastStaminaRegenAt + 補算離線回復）
        await regenStamina(user.userId);

        // NPC 體力自然恢復（依距上次登入的遊戲天數）
        const now = Date.now();
        const lastAction = user.lastActionAt || user.gameCreatedAt || now;
        const daysPassed = getGameDaysSince(lastAction, now);
        if (daysPassed > 0 && (user.hiredNpcs || []).length > 0) {
            await recoverConditions(user.userId, daysPassed);
        }

        // 重新讀取最新資料
        user = await db.findOne("user", { userId: req.user.discordId });
        if (!user) return res.json({ exists: false });

        const userInfo = info(user);
        res.json({ exists: true, ...userInfo });
    } catch (err) {
        console.error("取得使用者資料失敗:", err);
        res.status(500).json({ error: '伺服器錯誤' });
    }
});

module.exports = router;
