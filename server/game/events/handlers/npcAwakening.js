const config = require("../../config.js");
const db = require("../../../db.js");
const { increment } = require("../../progression/statsTracker.js");
const { formatText, getText } = require("../../textManager.js");

const NPC_CFG = config.NPC;
const QUALITY_ORDER = config.RANDOM_EVENTS.QUALITY_ORDER;

/**
 * NPC 覺醒事件 handler
 * NPC 永久提升一個稀有度等級
 * @param {object} user - 最新 user 文件
 * @param {string} actionType - "adv"
 * @param {object} actionResult - 原始動作結果
 * @returns {object|null} eventResult
 */
async function npcAwakening(user, actionType, actionResult) {
  const advNpcId = actionResult.advNpcId;
  if (!advNpcId) return null;

  // 重新 fetch 最新 user 資料避免 stale data
  const latestUser = await db.findOne("user", { userId: user.userId });
  if (!latestUser) return null;

  const hired = latestUser.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === advNpcId);
  if (npcIdx === -1) return null;

  const npc = hired[npcIdx];
  const oldQuality = npc.quality;
  const qualityIdx = QUALITY_ORDER.indexOf(oldQuality);

  // 防禦性檢查：已是傳說等級不應觸發（由 eventDefs condition 攔截）
  if (qualityIdx === -1 || qualityIdx >= QUALITY_ORDER.length - 1) {
    return null;
  }

  const newQuality = QUALITY_ORDER[qualityIdx + 1];
  const newRange = NPC_CFG.STAT_RANGE[newQuality];

  // 重算 baseStats：取 max(舊值, 新品質區間隨機值)，保證不降
  const oldStats = npc.baseStats;
  const newBaseStats = {
    hp: Math.max(oldStats.hp, randInt(newRange.hp[0], newRange.hp[1])),
    atk: Math.max(oldStats.atk, randInt(newRange.atk[0], newRange.atk[1])),
    def: Math.max(oldStats.def, randInt(newRange.def[0], newRange.def[1])),
    agi: Math.max(oldStats.agi, randInt(newRange.agi[0], newRange.agi[1])),
  };

  const newMonthlyCost = NPC_CFG.MONTHLY_WAGE[newQuality];

  // 更新 user.hiredNpcs
  await db.update(
    "user",
    { userId: user.userId },
    {
      $set: {
        [`hiredNpcs.${npcIdx}.quality`]: newQuality,
        [`hiredNpcs.${npcIdx}.baseStats`]: newBaseStats,
        [`hiredNpcs.${npcIdx}.monthlyCost`]: newMonthlyCost,
      },
    },
  );

  // 同步更新 npc collection
  await db.update(
    "npc",
    { npcId: advNpcId },
    {
      $set: {
        quality: newQuality,
        baseStats: newBaseStats,
        monthlyCost: newMonthlyCost,
      },
    },
  );

  await increment(user.userId, "npcAwakenings");

  const statChanges = formatStatChanges(oldStats, newBaseStats);

  return {
    eventId: "npc_awakening",
    eventName: getText("EVENTS.AWAKEN_NAME"),
    outcome: "win",
    text: formatText("EVENTS.AWAKEN_TEXT", { npcName: npc.name }) + "\n\n" +
      formatText("EVENTS.AWAKEN_RESULT", { npcName: npc.name, oldQuality, newQuality }) + "\n" +
      statChanges +
      "\n" + formatText("EVENTS.AWAKEN_WAGE", { wage: newMonthlyCost }),
    battleResult: null,
    rewards: {
      npcUpgrade: {
        npcName: npc.name,
        npcId: advNpcId,
        oldQuality,
        newQuality,
        oldStats,
        newStats: newBaseStats,
      },
    },
    losses: {},
  };
}

/**
 * 格式化屬性變化文字
 */
function formatStatChanges(oldStats, newStats) {
  const labels = { hp: "HP", atk: "ATK", def: "DEF", agi: "AGI" };
  const parts = [];
  for (const [key, label] of Object.entries(labels)) {
    const diff = newStats[key] - oldStats[key];
    if (diff > 0) {
      parts.push(`${label}: ${oldStats[key]} → ${newStats[key]} (+${diff})`);
    } else {
      parts.push(`${label}: ${oldStats[key]} → ${newStats[key]}`);
    }
  }
  return parts.join("\n");
}

/**
 * 在 [min, max] 範圍內取隨機整數
 */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

module.exports = npcAwakening;
