const express = require("express");
const router = express.Router();
const db = require("../../db.js");
const { getLcState, initializeLc, checkDisbandment } = require("../../game/laughingCoffin/lcState.js");
const { getMembersForDisplay, getAllMemberIds } = require("../../game/laughingCoffin/lcMembers.js");
const config = require("../../game/config.js");

const STATE_KEY = "laughingCoffin";

// GET /api/admin/lc — 取得完整 LC 公會狀態
router.get("/", async (req, res) => {
  try {
    const lc = await getLcState();
    if (!lc) {
      return res.json({ active: false, initialized: false });
    }

    const memberDefs = getMembersForDisplay();
    const members = (lc.members || []).map((m) => {
      const def = memberDefs.find((d) => d.id === m.id) || {};
      return {
        ...m,
        nameCn: def.nameCn || m.id,
        role: def.role || "不明",
        weaponName: def.weaponName || "不明",
        weaponType: def.weaponType || "不明",
        skillNames: def.skillNames || [],
      };
    });

    res.json({
      active: lc.active,
      disbanded: lc.disbanded,
      initialized: true,
      baseFloor: lc.baseFloor,
      lastFloorChangeAt: lc.lastFloorChangeAt,
      members,
      gruntCount: lc.gruntCount,
      lootPool: {
        col: lc.lootPool?.col || 0,
        materials: lc.lootPool?.materials || [],
        weapons: (lc.lootPool?.weapons || []).map((w) => ({
          weaponName: w.weaponName,
          type: w.type,
          atk: w.atk,
          def: w.def,
          agi: w.agi,
          cri: w.cri,
          hp: w.hp,
        })),
      },
      rotationIntervalMs: config.LAUGHING_COFFIN_GUILD.ROTATION_INTERVAL_MS,
    });
  } catch (err) {
    console.error("Admin: 取得 LC 狀態失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/reset — 重置（刪除）LC 公會
router.post("/reset", async (req, res) => {
  try {
    await db.update("server_state", {}, { $unset: { [STATE_KEY]: "" } });
    res.json({ success: true, message: "微笑棺木公會已重置" });
  } catch (err) {
    console.error("Admin: 重置 LC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/initialize — 手動初始化 LC 公會
router.post("/initialize", async (req, res) => {
  try {
    const { floor } = req.body;
    const currentFloor = floor || config.LAUGHING_COFFIN_GUILD.ACTIVATION_FLOOR;
    const result = await initializeLc(currentFloor);
    if (result) {
      res.json({ success: true, message: `微笑棺木公會已初始化（據點 ${result.baseFloor}F）` });
    } else {
      res.json({ success: false, message: "微笑棺木公會已存在，請先重置" });
    }
  } catch (err) {
    console.error("Admin: 初始化 LC 失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/revive/:memberId — 復活具名成員
router.post("/revive/:memberId", async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!getAllMemberIds().includes(memberId)) {
      return res.status(400).json({ error: "成員 ID 無效" });
    }
    const result = await db.findOneAndUpdate(
      "server_state",
      {
        [`${STATE_KEY}.members`]: {
          $elemMatch: { id: memberId, alive: false },
        },
      },
      {
        $set: {
          [`${STATE_KEY}.members.$.alive`]: true,
          [`${STATE_KEY}.members.$.killedBy`]: null,
          [`${STATE_KEY}.members.$.killedAt`]: null,
        },
      },
    );
    if (result) {
      // 若已解散，恢復啟動
      await db.update("server_state", {}, {
        $set: {
          [`${STATE_KEY}.disbanded`]: false,
          [`${STATE_KEY}.active`]: true,
        },
      });
      await checkDisbandment();
      res.json({ success: true, message: `${memberId} 已復活` });
    } else {
      res.json({ success: false, message: "找不到該成員或該成員仍存活" });
    }
  } catch (err) {
    console.error("Admin: 復活成員失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/set-floor — 設定據點樓層
router.post("/set-floor", async (req, res) => {
  try {
    const floor = Number(req.body.floor);
    if (!Number.isInteger(floor) || floor < 1 || floor > 100) {
      return res.status(400).json({ error: "樓層無效（1-100F）" });
    }
    await db.update("server_state", {}, {
      $set: {
        [`${STATE_KEY}.baseFloor`]: floor,
        [`${STATE_KEY}.lastFloorChangeAt`]: Date.now(),
      },
    });
    res.json({ success: true, message: `據點已移至 ${floor}F` });
  } catch (err) {
    console.error("Admin: 設定據點樓層失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/set-grunts — 設定雜魚數量
router.post("/set-grunts", async (req, res) => {
  try {
    const count = Number(req.body.count);
    if (!Number.isInteger(count) || count < 0 || count > 1000) {
      return res.status(400).json({ error: "數量無效（0-1000）" });
    }
    await db.update("server_state", {}, {
      $set: { [`${STATE_KEY}.gruntCount`]: count },
    });
    // 若增加到 > 0 且已解散，恢復啟動
    if (count > 0) {
      const lc = await getLcState();
      if (lc?.disbanded) {
        await db.update("server_state", {}, {
          $set: {
            [`${STATE_KEY}.disbanded`]: false,
            [`${STATE_KEY}.active`]: true,
          },
        });
      }
    }
    await checkDisbandment();
    res.json({ success: true, message: `雜魚數量已設為 ${count}` });
  } catch (err) {
    console.error("Admin: 設定雜魚數量失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// POST /api/admin/lc/clear-loot — 清空贓物池
router.post("/clear-loot", async (req, res) => {
  try {
    await db.update("server_state", {}, {
      $set: {
        [`${STATE_KEY}.lootPool`]: { col: 0, materials: [], weapons: [] },
      },
    });
    res.json({ success: true, message: "贓物池已清空" });
  } catch (err) {
    console.error("Admin: 清空贓物池失敗:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

module.exports = router;
