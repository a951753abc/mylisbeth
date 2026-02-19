const config = require("../config.js");
const laughingCoffin = require("./handlers/laughingCoffin.js");

/**
 * 事件註冊表
 * 每個事件定義：
 *   id       - 唯一識別碼
 *   name     - 顯示名稱
 *   chance   - 觸發機率 (%)，從 config 讀取
 *   actions  - 可觸發的動作白名單
 *   condition(user) - 額外觸發條件（回傳 boolean）
 *   handler(user, actionType, actionResult) - 執行函式
 */
const eventDefs = [
  {
    id: "laughing_coffin",
    name: "微笑棺木襲擊",
    chance: config.RANDOM_EVENTS.LAUGHING_COFFIN.CHANCE,
    actions: config.RANDOM_EVENTS.TRIGGER_ACTIONS,
    condition(user) {
      return (
        (user.col || 0) > 0 ||
        (user.itemStock || []).length > 0 ||
        (user.weaponStock || []).length > 0
      );
    },
    handler: laughingCoffin,
  },
];

module.exports = eventDefs;
