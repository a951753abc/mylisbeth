const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../../middleware/auth.js");
const { handleRoute } = require("./helpers.js");
const {
  getExpeditionPreview,
  startExpedition,
  checkExpedition,
} = require("../../game/expedition/expedition.js");
const db = require("../../db.js");

// 遠征狀態預覽
router.get("/expedition", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return { error: "角色不存在" };
    return getExpeditionPreview(user);
  }, "取得遠征資訊失敗");
});

// 啟動遠征
router.post("/expedition/start", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const { dungeonId, npcWeaponMap, playerWeaponIndex } = req.body;
    if (!dungeonId || typeof dungeonId !== "string") return { error: "請選擇迷宮" };
    if (!Array.isArray(npcWeaponMap) || npcWeaponMap.length === 0) {
      return { error: "請選擇至少一位 NPC" };
    }
    if (npcWeaponMap.length > 20) {
      return { error: "NPC 數量超過上限" };
    }
    // 驗證每個 entry 的結構
    for (const entry of npcWeaponMap) {
      if (!entry || typeof entry.npcId !== "string" || !entry.npcId) {
        return { error: "無效的 NPC ID" };
      }
      if (!Array.isArray(entry.weaponIndices)) {
        return { error: "無效的武器索引格式" };
      }
      for (const idx of entry.weaponIndices) {
        if (!Number.isInteger(idx) || idx < 0) {
          return { error: "武器索引必須為非負整數" };
        }
      }
    }
    // 玩家武器索引驗證：null/undefined = 不參加，number = 參加
    const validPlayerIdx = (playerWeaponIndex !== null && playerWeaponIndex !== undefined)
      ? playerWeaponIndex : null;
    if (validPlayerIdx !== null) {
      if (typeof validPlayerIdx !== "number" || !Number.isInteger(validPlayerIdx) || validPlayerIdx < 0) {
        return { error: "無效的武器索引" };
      }
    }
    return await startExpedition(req.user.discordId, dungeonId, npcWeaponMap, validPlayerIdx);
  }, "啟動遠征失敗");
});

// 手動結算遠征（前端倒數完呼叫）
router.post("/expedition/resolve", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const result = await checkExpedition(req.user.discordId);
    if (!result) return { pending: true, message: "遠征尚未結束或已結算" };
    return result;
  }, "結算遠征失敗");
});

module.exports = router;
