const express = require("express");
const router = express.Router();
const { ensureAuth } = require("./helpers.js");
const { getLcState } = require("../../game/laughingCoffin/lcState.js");
const { getMembersForDisplay } = require("../../game/laughingCoffin/lcMembers.js");

/**
 * GET /api/game/lc-status — LC 公會狀態
 */
router.get("/lc-status", ensureAuth, async (req, res) => {
  try {
    const lc = await getLcState();
    if (!lc) {
      return res.json({ active: false, disbanded: false });
    }

    const memberDefs = getMembersForDisplay();
    const members = memberDefs.map((def) => {
      const state = (lc.members || []).find((m) => m.id === def.id);
      return {
        ...def,
        alive: state?.alive ?? false,
        killedBy: state?.killedBy || null,
        killedAt: state?.killedAt || null,
      };
    });

    res.json({
      active: lc.active,
      disbanded: lc.disbanded || false,
      baseFloor: lc.baseFloor,
      gruntCount: lc.gruntCount || 0,
      members,
      lootPool: {
        col: lc.lootPool?.col || 0,
        materialCount: (lc.lootPool?.materials || []).length,
        weaponCount: (lc.lootPool?.weapons || []).length,
      },
    });
  } catch (err) {
    console.error("取得 LC 狀態失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
