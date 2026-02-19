const db = require("../../db.js");
const roll = require("../roll.js");
const eventDefs = require("./eventDefs.js");

/**
 * 隨機事件檢查（每次動作成功後呼叫）
 * @param {string} userId
 * @param {string} actionType - "mine" | "soloAdv" | "adv" 等
 * @param {object} actionResult - 原始動作回傳結果
 * @returns {object|null} eventResult 或 null（未觸發）
 */
async function checkEvent(userId, actionType, actionResult) {
  // 讀最新 user 文件
  const user = await db.findOne("user", { userId });
  if (!user) return null;

  // 篩選符合 actionType 的事件
  const eligible = eventDefs.filter(
    (ev) => ev.actions.includes(actionType) && ev.condition(user),
  );
  if (eligible.length === 0) return null;

  // 逐一 d100Check（命中即停，一次最多觸發一個）
  for (const ev of eligible) {
    if (roll.d100Check(ev.chance)) {
      const result = await ev.handler(user, actionType, actionResult);
      return result;
    }
  }

  return null;
}

module.exports = { checkEvent };
