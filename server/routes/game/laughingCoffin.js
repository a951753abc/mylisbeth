const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../../middleware/auth.js");
const { getLcState } = require("../../game/laughingCoffin/lcState.js");
const { getMembersBasicInfo } = require("../../game/laughingCoffin/lcMembers.js");

/**
 * GET /api/game/lc-status — LC 公會狀態（玩家視角，隱藏敏感資訊）
 */
router.get("/lc-status", ensureAuth, async (req, res) => {
  try {
    const lc = await getLcState();
    if (!lc) {
      return res.json({ active: false, disbanded: false });
    }

    const memberDefs = getMembersBasicInfo();
    const members = memberDefs.map((def) => {
      const state = (lc.members || []).find((m) => m.id === def.id);
      return {
        id: def.id,
        nameCn: def.nameCn,
        role: def.role,
        alive: state?.alive ?? false,
        killedBy: state?.killedBy || null,
        killedAt: state?.killedAt || null,
      };
    });

    res.json({
      active: lc.active,
      disbanded: lc.disbanded || false,
      aliveNamedCount: members.filter((m) => m.alive).length,
      members,
    });
  } catch (err) {
    console.error("取得 LC 狀態失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
