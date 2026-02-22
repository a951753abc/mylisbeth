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
const { checkMissions } = require('../game/npc/mission.js');

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

        // 清理幽靈 NPC（死亡競態條件殘留的不完整條目）— 必須在 checkMissions 之前
        if (user.hiredNpcs && user.hiredNpcs.some((n) => !n.npcId || !n.name || !n.baseStats)) {
            await db.update(
                "user",
                { userId: user.userId },
                { $pull: { hiredNpcs: { $or: [
                    { npcId: { $exists: false } }, { npcId: null },
                    { name: { $exists: false } }, { name: null },
                    { baseStats: { $exists: false } }, { baseStats: null },
                ] } } },
            );
            user = await db.findOne("user", { userId: req.user.discordId });
            if (!user) return res.json({ exists: false });
        }

        // 修復 NaN 資料汙染（競態條件導致 condition/exp/level 變 NaN）
        if (user.hiredNpcs && user.hiredNpcs.length > 0) {
            const nanFixes = {};
            user.hiredNpcs.forEach((npc, idx) => {
                if (typeof npc.condition !== 'number' || isNaN(npc.condition)) {
                    nanFixes[`hiredNpcs.${idx}.condition`] = 0;
                }
                if (typeof npc.exp !== 'number' || isNaN(npc.exp)) {
                    nanFixes[`hiredNpcs.${idx}.exp`] = 0;
                }
                if (typeof npc.level !== 'number' || isNaN(npc.level) || npc.level < 1) {
                    nanFixes[`hiredNpcs.${idx}.level`] = 1;
                }
            });
            if (Object.keys(nanFixes).length > 0) {
                console.warn(`[/api/me] 修復 NaN 資料 userId=${user.userId}:`, Object.keys(nanFixes));
                await db.update("user", { userId: user.userId }, { $set: nanFixes });
                user = await db.findOne("user", { userId: req.user.discordId });
                if (!user) return res.json({ exists: false });
            }
        }

        // Season 6: 懶結算 NPC 任務（錯誤隔離：失敗不阻斷登入）
        try {
            await checkMissions(user.userId);
        } catch (missionErr) {
            console.error(`[/api/me] checkMissions 失敗 userId=${user.userId}:`, missionErr);
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
