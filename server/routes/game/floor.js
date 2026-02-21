const express = require("express");
const router = express.Router();
const { ensureAuth, ensureNotPaused } = require("../../middleware/auth.js");
const db = require("../../db.js");
const config = require("../../game/config.js");
const { getFloor } = require("../../game/floor/floorData.js");
const { getActiveFloor } = require("../../game/floor/activeFloor.js");
const { handleRoute } = require("./helpers.js");

// Get floor info
router.get("/floor", ensureAuth, async (req, res) => {
  try {
    const user = await db.findOne("user", { userId: req.user.discordId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const maxFloor = user.currentFloor || 1;
    const activeFloor = getActiveFloor(user);
    const currentFloor = maxFloor; // 前線樓層（用於 Boss 狀態）
    const floorData = getFloor(activeFloor);
    const rawProgress = (user.floorProgress || {})[String(activeFloor)] || {};
    const floorProgress = {
      explored: rawProgress.explored ?? 0,
      maxExplore: rawProgress.maxExplore ?? (floorData.maxExplore || config.FLOOR_MAX_EXPLORE),
    };
    const availableFloors = [];
    for (let f = 1; f <= maxFloor; f++) {
      const fd = getFloor(f);
      availableFloors.push({ floor: f, name: fd.name, nameCn: fd.nameCn });
    }

    // Boss 資訊始終使用前線樓層
    const frontierFloorData = getFloor(currentFloor);

    const serverState = await db.findOne("server_state", { _id: "aincrad" });
    const bossStatus = serverState?.bossStatus || {
      floorNumber: currentFloor,
      active: false,
      currentHp: frontierFloorData.boss.hp,
      totalHp: frontierFloorData.boss.hp,
      participants: [],
    };

    if (bossStatus.active && bossStatus.expiresAt) {
      const now = new Date();
      if (now > new Date(bossStatus.expiresAt)) {
        bossStatus.active = false;
        bossStatus.currentHp = frontierFloorData.boss.hp;
      }
    }

    const phases = (frontierFloorData.boss.phases || []).map((p) => ({
      hpThreshold: p.hpThreshold,
      weapon: p.weapon || null,
    }));

    res.json({
      floor: {
        floorNumber: floorData.floorNumber,
        name: floorData.name,
        nameCn: floorData.nameCn,
        boss: {
          name: frontierFloorData.boss.name,
          totalHp: frontierFloorData.boss.hp,
          initialWeapon: frontierFloorData.boss.initialWeapon || null,
          phases,
        },
        maxExplore: floorData.maxExplore,
      },
      progress: floorProgress,
      bossStatus: {
        active: bossStatus.active,
        currentHp: Math.max(0, bossStatus.currentHp),
        totalHp: bossStatus.totalHp || frontierFloorData.boss.hp,
        participants: (bossStatus.participants || []).map((p) => ({
          name: p.name,
          damage: p.damage,
          attacks: p.attacks,
        })),
        expiresAt: bossStatus.expiresAt,
        currentWeapon: bossStatus.currentWeapon || frontierFloorData.boss.initialWeapon || null,
      },
      canAttackBoss: activeFloor === maxFloor && floorProgress.explored >= floorProgress.maxExplore,
      // Season 10: 樓層往返
      activeFloor,
      maxFloor,
      availableFloors,
    });
  } catch (err) {
    console.error("取得樓層資訊失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Change active floor (Season 10: 樓層往返，不走 move cooldown)
router.post("/change-floor", ensureAuth, ensureNotPaused, async (req, res) => {
  try {
    const userId = req.user.discordId;
    const user = await db.findOne("user", { userId });
    if (!user) return res.status(404).json({ error: "角色不存在" });

    const { floor } = req.body;
    const maxFloor = user.currentFloor || 1;

    // floor = null → 回到前線
    if (floor === null || floor === undefined) {
      await db.update("user", { userId }, { $set: { activeFloor: null } });
      return res.json({ success: true, activeFloor: maxFloor, atFrontier: true });
    }

    const targetFloor = parseInt(floor, 10);
    if (Number.isNaN(targetFloor) || targetFloor < 1 || targetFloor > maxFloor) {
      return res.status(400).json({ error: `樓層範圍：1 ~ ${maxFloor}` });
    }

    // 設為前線時存 null
    const newActiveFloor = targetFloor === maxFloor ? null : targetFloor;
    await db.update("user", { userId }, { $set: { activeFloor: newActiveFloor } });

    res.json({
      success: true,
      activeFloor: targetFloor,
      maxFloor,
      atFrontier: targetFloor === maxFloor,
    });
  } catch (err) {
    console.error("切換樓層失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// Floor history
router.get("/floor/history", ensureAuth, async (req, res) => {
  await handleRoute(res, async () => {
    const serverState = await db.findOne("server_state", { _id: "aincrad" });
    return { history: serverState?.floorHistory || [] };
  }, "取得樓層歷史失敗");
});

module.exports = router;
