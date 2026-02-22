const config = require("./config.js");
const db = require("../db.js");
const { formatText, getText } = require("./textManager.js");
const { checkSettlement } = require("./economy/debtCheck.js");
const { checkAndConsumeStamina } = require("./stamina/staminaCheck.js");
const { checkEvent } = require("./events/eventTrigger.js");
const { logAction } = require("./logging/actionLogger.js");
const { getActiveFloor } = require("./floor/activeFloor.js");

const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const up = require("./move/up.js");
const adv = require("./move/adv.js");
const pvp = require("./move/pvp.js");
const pvpNpc = require("./move/pvpNpc.js");
const repair = require("./move/repair.js");
const soloAdv = require("./move/soloAdv.js");
const bossAttack = require("./floor/bossAttack.js");

const coolTime = config.MOVE_COOLDOWN;
const cmdList = { mine, forge, up, adv, pvp, pvpNpc, repair, soloAdv, boss: bossAttack };

module.exports = async function (cmd, userOrId) {
  if (!(cmd[1] in cmdList)) {
    return { error: getText("SYSTEM.INVALID_COMMAND") };
  }

  let userId = userOrId;
  if (typeof userOrId !== "string") {
    userId = userOrId.userId;
  }

  const now = Date.now();
  const user = await db.findOneAndUpdate(
    "user",
    {
      userId,
      $or: [
        { move_time: { $exists: false } },
        { move_time: { $lte: now - coolTime } },
      ],
    },
    { $set: { move_time: now, lastActionAt: now } },
    { returnDocument: "before" },
  );

  if (!user) {
    const existing = await db.findOne("user", { userId });
    if (!existing) return { error: getText("SYSTEM.CHAR_NOT_FOUND") };
    // 暫停營業：在冷卻錯誤前優先返回暫停提示
    if (existing.businessPaused) {
      return { error: getText("SYSTEM.BUSINESS_PAUSED") };
    }
    const moveTime = existing.move_time ?? 0;
    const remaining = Math.ceil((moveTime + coolTime - now) / 1000);
    return { error: formatText("SYSTEM.COOLDOWN", { remaining }), cooldown: remaining };
  }

  // 暫停營業：封鎖所有遊戲行動，並回退冷卻時間
  if (user.businessPaused) {
    await db.update("user", { userId }, {
      $set: { move_time: user.move_time || 0, lastActionAt: user.lastActionAt || 0 },
    });
    return { error: getText("SYSTEM.BUSINESS_PAUSED") };
  }

  // 懶結算：CD 通過後 dispatch 前執行
  const settlementResult = await checkSettlement(userId);
  if (settlementResult.bankruptcy) {
    return {
      bankruptcy: true,
      message: getText("SYSTEM.BANKRUPTCY"),
      bankruptcyInfo: settlementResult.bankruptcyInfo,
    };
  }

  // 體力檢查：挖礦/鍛造/修復才消耗（傳入稱號以套用修正）
  // 連續挖礦：mine handler 內部管理體力
  const isBatchMine = cmd[1] === "mine" && cmd[2]?.staminaBudget > 0;

  let staminaResult = { ok: true };
  if (!isBatchMine) {
    // 多素材鍛造：每多 1 個素材 +2 體力消耗
    let extraStaminaCost = 0;
    if (cmd[1] === "forge" && Array.isArray(cmd[2]) && cmd[2].length > 2) {
      extraStaminaCost = (cmd[2].length - 2) * 2;
    }
    staminaResult = await checkAndConsumeStamina(userId, cmd[1], user.title || null, extraStaminaCost);
    if (!staminaResult.ok) {
      return { error: staminaResult.error };
    }
  }

  const actionResult = await cmdList[cmd[1]](cmd, user, isBatchMine ? null : staminaResult);

  // 將體力值附加到回傳結果（前端可即時更新顯示）
  // 批次挖礦由 mine handler 自行附帶體力資訊
  if (!isBatchMine && staminaResult.cost !== undefined && actionResult && !actionResult.error) {
    actionResult.staminaCost = staminaResult.cost;
    actionResult.stamina = staminaResult.stamina;
    actionResult.lastStaminaRegenAt = staminaResult.lastStaminaRegenAt;
  }

  // 隨機事件檢查（僅限白名單動作且動作成功）
  if (actionResult && !actionResult.error && !actionResult.bankruptcy) {
    const eventResult = await checkEvent(userId, cmd[1], actionResult);
    if (eventResult) {
      actionResult.randomEvent = eventResult;
      // 若事件導致破產，標記到頂層
      if (eventResult.bankruptcy) {
        actionResult.bankruptcy = true;
        actionResult.message = eventResult.text;
        actionResult.bankruptcyInfo = eventResult.losses?.bankruptcyInfo || {};
      }
    }
  }

  // 操作日誌（fire-and-forget）
  const logDetails = {
    cmd: cmd.slice(1),
    floor: getActiveFloor(user),
    staminaCost: actionResult?.staminaCost,
    randomEvent: actionResult?.randomEvent?.type || null,
  };

  // 戰鬥類動作：提取完整戰鬥過程
  if (actionResult && !actionResult.error) {
    const action = cmd[1];
    if ((action === "adv" || action === "soloAdv") && actionResult.battleResult) {
      const br = actionResult.battleResult;
      logDetails.battle = {
        outcome: br.win ? "win" : br.dead ? "lose" : "draw",
        enemyName: br.enemyName,
        category: br.category,
        npcName: br.npcName,
        initialHp: br.initialHp,
        finalHp: br.finalHp,
        log: br.log,
        skillEvents: actionResult.skillEvents,
      };
      if (actionResult.colEarned) logDetails.colEarned = actionResult.colEarned;
      if (actionResult.colSpent) logDetails.colSpent = actionResult.colSpent;
    } else if (action === "pvp" && actionResult.battleLog !== undefined) {
      logDetails.battle = {
        outcome: actionResult.winner,
        attackerName: actionResult.attackerName,
        defenderName: actionResult.defenderName,
        duelMode: actionResult.duelMode,
        wagerCol: actionResult.wagerCol,
        detailLog: actionResult.detailLog,
        skillEvents: actionResult.skillEvents,
      };
    } else if (action === "boss" && actionResult.damage !== undefined) {
      logDetails.battle = {
        damage: actionResult.damage,
        bossName: actionResult.bossName,
        bossHpRemaining: actionResult.bossHpRemaining,
        bossHpTotal: actionResult.bossHpTotal,
        bossDefeated: actionResult.bossDefeated,
        counterAttack: actionResult.counterAttack,
      };
    }
  }

  logAction(userId, user.name, cmd[1], logDetails, !actionResult?.error, actionResult?.error || null);

  return actionResult;
};
