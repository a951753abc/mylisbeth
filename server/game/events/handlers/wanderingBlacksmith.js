const config = require("../../config.js");
const db = require("../../../db.js");
const roll = require("../../roll.js");
const { getText } = require("../../textManager.js");
const { awardCol } = require("../../economy/col.js");
const { increment } = require("../../progression/statsTracker.js");

const WB = config.RANDOM_EVENTS.WANDERING_BLACKSMITH;

/**
 * 流浪鍛冶師事件 handler
 * 65% 傳授靈感(win) / 35% 閒聊(draw)
 * @param {object} user - 最新 user 文件
 * @param {string} actionType - "mine"
 * @param {object} actionResult - 原始動作結果
 * @returns {object} eventResult
 */
async function wanderingBlacksmith(user, actionType, actionResult) {
  const outcome = roll.d100();

  if (outcome <= 65) {
    return await processInspiration(user);
  } else {
    return await processChat(user);
  }
}

/**
 * 傳授靈感：設定 forgeInspiration = true
 */
async function processInspiration(user) {
  await db.update(
    "user",
    { userId: user.userId },
    { $set: { forgeInspiration: true } },
  );
  await increment(user.userId, "forgeInspirationReceived");

  return {
    eventId: "wandering_blacksmith",
    eventName: getText("EVENTS.WB_NAME"),
    outcome: "win",
    text: getText("EVENTS.WB_INSPIRATION"),
    battleResult: null,
    rewards: {
      buff: getText("EVENTS.WB_BUFF_NAME"),
    },
    losses: {},
  };
}

/**
 * 閒聊：給了 20-50 Col 小費
 */
async function processChat(user) {
  const colReward = WB.CHAT_COL_MIN + Math.floor(Math.random() * (WB.CHAT_COL_MAX - WB.CHAT_COL_MIN + 1));
  await awardCol(user.userId, colReward);

  return {
    eventId: "wandering_blacksmith",
    eventName: getText("EVENTS.WB_NAME"),
    outcome: "draw",
    text: getText("EVENTS.WB_CHAT"),
    battleResult: null,
    rewards: { col: colReward },
    losses: {},
  };
}

module.exports = wanderingBlacksmith;
