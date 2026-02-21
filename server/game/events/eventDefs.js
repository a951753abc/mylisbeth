const config = require("../config.js");
const laughingCoffin = require("./handlers/laughingCoffin.js");
const mysteriousChest = require("./handlers/mysteriousChest.js");
const wanderingBlacksmith = require("./handlers/wanderingBlacksmith.js");
const labyrinthRift = require("./handlers/labyrinthRift.js");
const npcAwakening = require("./handlers/npcAwakening.js");

const QUALITY_ORDER = config.RANDOM_EVENTS.QUALITY_ORDER;

/**
 * 事件註冊表
 * 每個事件定義：
 *   id       - 唯一識別碼
 *   name     - 顯示名稱
 *   chance   - 觸發機率 (%)，從 config 讀取
 *   actions  - 可觸發的動作白名單
 *   condition(user) - 額外觸發條件（回傳 boolean）
 *   handler(user, actionType, actionResult) - 執行函式
 *
 * 順序決定優先級：先判定的事件先觸發（命中即停）
 */
const eventDefs = [
  // 危險事件優先判定
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
  // Season 8: 神秘寶箱（mine, adv）
  {
    id: "mysterious_chest",
    name: "神秘寶箱",
    chance: config.RANDOM_EVENTS.MYSTERIOUS_CHEST.CHANCE,
    actions: ["mine", "adv"],
    condition() {
      return true;
    },
    handler: mysteriousChest,
  },
  // Season 8: 流浪鍛冶師（mine 限定）
  {
    id: "wandering_blacksmith",
    name: "流浪鍛冶師",
    chance: config.RANDOM_EVENTS.WANDERING_BLACKSMITH.CHANCE,
    actions: ["mine"],
    condition() {
      return true;
    },
    handler: wanderingBlacksmith,
  },
  // Season 8: 迷宮裂隙（adv 限定，NPC 體力 > 40）
  {
    id: "labyrinth_rift",
    name: "迷宮裂隙",
    chance: config.RANDOM_EVENTS.LABYRINTH_RIFT.CHANCE,
    actions: ["adv"],
    condition(user) {
      const hired = user.hiredNpcs || [];
      return hired.some((n) => (n.condition ?? 100) > config.RANDOM_EVENTS.LABYRINTH_RIFT.MIN_CONDITION);
    },
    handler: labyrinthRift,
  },
  // Season 8: NPC 覺醒（adv 限定，NPC 不是傳說品質）
  {
    id: "npc_awakening",
    name: "NPC 覺醒",
    chance: config.RANDOM_EVENTS.NPC_AWAKENING.CHANCE,
    actions: ["adv"],
    condition(user) {
      const hired = user.hiredNpcs || [];
      return hired.some((n) => {
        const qIdx = QUALITY_ORDER.indexOf(n.quality);
        return qIdx >= 0 && qIdx < QUALITY_ORDER.length - 1;
      });
    },
    handler: npcAwakening,
  },
];

module.exports = eventDefs;
