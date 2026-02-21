const config = require("../../config.js");
const db = require("../../../db.js");
const roll = require("../../roll.js");
const { awardCol } = require("../../economy/col.js");
const { increment } = require("../../progression/statsTracker.js");
const grantFloorMaterial = require("../helpers/grantFloorMaterial.js");

const MC = config.RANDOM_EVENTS.MYSTERIOUS_CHEST;

/**
 * 神秘寶箱事件 handler
 * 55% 寶物(win) / 25% 空箱(draw) / 20% 陷阱(lose)
 * @param {object} user - 最新 user 文件
 * @param {string} actionType - "mine" | "adv"
 * @param {object} actionResult - 原始動作結果
 * @returns {object} eventResult
 */
async function mysteriousChest(user, actionType, actionResult) {
  const floor = user.currentFloor || 1;
  const outcome = roll.d100();

  if (outcome <= 55) {
    return await processWin(user, floor);
  } else if (outcome <= 80) {
    return processDraw();
  } else {
    return await processLose(user);
  }
}

/**
 * 寶物：獲得當前樓層 ★★★ 素材 + 50-150 Col
 */
async function processWin(user, floor) {
  const material = await grantFloorMaterial(user.userId, floor, 3);
  const colReward = MC.WIN_COL_MIN + Math.floor(Math.random() * (MC.WIN_COL_MAX - MC.WIN_COL_MIN + 1));
  await awardCol(user.userId, colReward);
  await increment(user.userId, "mysteriousChestsOpened");

  return {
    eventId: "mysterious_chest",
    eventName: "神秘寶箱",
    outcome: "win",
    text: "你發現了一個被苔蘚覆蓋的古老寶箱...\n小心翼翼地打開後，裡面竟然藏著珍貴的寶物！",
    battleResult: null,
    rewards: {
      col: colReward,
      material: material ? { name: material.name, level: material.level } : null,
    },
    losses: {},
  };
}

/**
 * 空箱：什麼都沒有
 */
function processDraw() {
  return {
    eventId: "mysterious_chest",
    eventName: "神秘寶箱",
    outcome: "draw",
    text: "你發現了一個被苔蘚覆蓋的古老寶箱...\n打開後只看到一堆灰塵和蜘蛛網。看來有人捷足先登了。",
    battleResult: null,
    rewards: {},
    losses: {},
  };
}

/**
 * 陷阱：失去 1 個隨機素材 + 30-80 Col
 */
async function processLose(user) {
  const losses = { col: 0, material: null };
  const textParts = ["你發現了一個被苔蘚覆蓋的古老寶箱...\n打開的瞬間觸發了陷阱！一股毒氣噴出！"];

  // 扣 Col（原子操作）
  const freshUser = await db.findOne("user", { userId: user.userId });
  const currentCol = freshUser?.col || 0;
  const colLoss = MC.LOSE_COL_MIN + Math.floor(Math.random() * (MC.LOSE_COL_MAX - MC.LOSE_COL_MIN + 1));
  const actualLoss = Math.min(colLoss, currentCol);

  if (actualLoss > 0) {
    const result = await db.findOneAndUpdate(
      "user",
      { userId: user.userId, col: { $gte: actualLoss } },
      { $inc: { col: -actualLoss } },
    );
    if (result !== null) {
      losses.col = actualLoss;
      textParts.push(`慌亂中掉落了 ${actualLoss} Col`);
    }
  }

  // 隨機失去 1 素材（使用同一次 fetch 的 itemStock）
  const items = (freshUser?.itemStock || []).filter((it) => it.itemNum > 0);
  if (items.length > 0) {
    const stolen = items[Math.floor(Math.random() * items.length)];
    await db.atomicIncItem(user.userId, stolen.itemId, stolen.itemLevel, stolen.itemName, -1);
    losses.material = { name: stolen.itemName, level: stolen.itemLevel };
    textParts.push(`${stolen.itemName} 在混亂中遺失了`);
  }

  return {
    eventId: "mysterious_chest",
    eventName: "神秘寶箱",
    outcome: "lose",
    text: textParts.join("\n"),
    battleResult: null,
    rewards: {},
    losses,
  };
}

module.exports = mysteriousChest;
