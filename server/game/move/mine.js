const roll = require("../roll.js");
const level = require("../level");
const db = require("../../db.js");
const config = require("../config.js");
const { formatText } = require("../textManager.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getModifier } = require("../title/titleModifier.js");
const itemCache = require("../cache/itemCache.js");
const { checkAndConsumeStamina } = require("../stamina/staminaCheck.js");
const { awardCol } = require("../economy/col.js");

const drawLevelList = [
  // Lv1: 4% ★★★, 20% ★★
  [
    { itemLevel: 3, less: 4, text: "★★★" },
    { itemLevel: 2, less: 20, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv2: 6% ★★★, 24% ★★
  [
    { itemLevel: 3, less: 6, text: "★★★" },
    { itemLevel: 2, less: 24, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv3: 8% ★★★, 24% ★★
  [
    { itemLevel: 3, less: 8, text: "★★★" },
    { itemLevel: 2, less: 24, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv4: 10% ★★★, 28% ★★
  [
    { itemLevel: 3, less: 10, text: "★★★" },
    { itemLevel: 2, less: 28, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv5: 13% ★★★, 30% ★★
  [
    { itemLevel: 3, less: 13, text: "★★★" },
    { itemLevel: 2, less: 30, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv6: 16% ★★★, 32% ★★
  [
    { itemLevel: 3, less: 16, text: "★★★" },
    { itemLevel: 2, less: 32, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv7: 19% ★★★, 34% ★★
  [
    { itemLevel: 3, less: 19, text: "★★★" },
    { itemLevel: 2, less: 34, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv8: 22% ★★★, 36% ★★
  [
    { itemLevel: 3, less: 22, text: "★★★" },
    { itemLevel: 2, less: 36, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv9: 25% ★★★, 38% ★★
  [
    { itemLevel: 3, less: 25, text: "★★★" },
    { itemLevel: 2, less: 38, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
  // Lv10: 30% ★★★, 40% ★★
  [
    { itemLevel: 3, less: 30, text: "★★★" },
    { itemLevel: 2, less: 40, text: "★★" },
    { itemLevel: 1, less: 100, text: "★" },
  ],
];

const itemLimit = config.INITIAL_ITEM_LIMIT;

/**
 * 挖礦主函式（支援連續挖礦、精準挖礦、批量出售、大師之眼）
 * @param {Array} cmd - [null, "mine", options?]
 * @param {Object} rawUser - 使用者文件
 * @param {Object} [staminaInfo] - move.js 傳入的體力資訊（單次模式）
 */
module.exports = async function (cmd, rawUser, staminaInfo) {
  const user = await ensureUserFields(rawUser);
  const mineLevel = user.mineLevel ?? 1;
  const perks = config.MINE_PERKS || {};
  const options = cmd[2] || {};

  // 解析選項（需達到對應等級才生效）
  const staminaBudget = (mineLevel >= (perks.CONTINUOUS_MINING_LEVEL ?? 2) && options.staminaBudget > 0)
    ? options.staminaBudget
    : 0;
  const autoSell1Star = mineLevel >= (perks.PRECISE_MINING_LEVEL ?? 4) && !!options.autoSell1Star;
  const autoSell2Star = mineLevel >= (perks.BULK_SELL_LEVEL ?? 8) && !!options.autoSell2Star;
  const isBatch = staminaBudget > 0;

  const { getActiveFloor } = require("../floor/activeFloor.js");
  const currentFloor = getActiveFloor(user);
  const allItems = itemCache.getAll();
  const minePool = getFloorMinePool(allItems, currentFloor);
  const starMod = getModifier(user.title || null, "mineStarChance");
  const nowItems = itemLimit + mineLevel;

  let text = "";
  let iterations = 0;
  let totalStaminaSpent = 0;
  let lastStamina = null;
  let lastStaminaRegenAt = null;
  const minedItems = []; // 記錄所有挖到的素材 { itemId, itemName, itemLevel }
  let levelUpText = "";

  // 安全上限防止無限迴圈
  const maxIterations = 50;

  while (iterations < maxIterations) {
    // --- 體力檢查 ---
    if (isBatch) {
      // 批次模式：mine.js 自行管理體力
      const staminaResult = await checkAndConsumeStamina(user.userId, "mine", user.title || null);
      if (!staminaResult.ok) {
        if (iterations === 0) return { error: staminaResult.error };
        break; // 已挖過至少一次，優雅停止
      }
      totalStaminaSpent += staminaResult.cost;
      lastStamina = staminaResult.stamina;
      lastStaminaRegenAt = staminaResult.lastStaminaRegenAt;
    } else if (iterations > 0) {
      // 單次模式不會進入第二輪
      break;
    } else {
      // 單次模式第一輪：體力已由 move.js 扣除
      if (staminaInfo) {
        totalStaminaSpent = staminaInfo.cost || 0;
        lastStamina = staminaInfo.stamina;
        lastStaminaRegenAt = staminaInfo.lastStaminaRegenAt;
      }
    }

    // --- 倉庫容量檢查 ---
    const filter = [
      { $match: { userId: user.userId } },
      { $project: { values: { $sum: "$itemStock.itemNum" } } },
    ];
    const item = await db.aggregate("user", filter);
    const currentCount = item[0]?.values ?? 0;
    if (currentCount >= nowItems) {
      if (iterations === 0) {
        return { error: formatText("MINE.CAPACITY_FULL", { current: currentCount, max: nowItems }) };
      }
      break; // 已挖過，倉庫滿了停止
    }

    // --- 挖礦填充 ---
    let count = currentCount;
    while (nowItems > count) {
      const mine = { ...minePool[Math.floor(Math.random() * minePool.length)] };
      mine.level = drawItemLevel(mineLevel, starMod);
      text += formatText("MINE.OBTAINED", { star: mine.level.text, name: mine.name }) + "\n";
      await db.saveItemToUser(user.userId, mine);
      minedItems.push({ itemId: mine.itemId, itemName: mine.name, itemLevel: mine.level.itemLevel });
      count++;
    }

    // --- 經驗與升級 ---
    levelUpText += await level(cmd[1], user);
    iterations++;

    // --- 預算檢查 ---
    if (isBatch && totalStaminaSpent >= staminaBudget) break;
  }

  // --- 統計（一次行動 = 一次統計）---
  await increment(user.userId, "totalMines");
  await checkAndAward(user.userId);

  // --- 自動售出（精準挖礦 / 批量出售）---
  let autoSellCol = 0;
  let autoSellCount = 0;
  if (autoSell1Star || autoSell2Star) {
    const sellTargets = minedItems.filter((m) => {
      if (autoSell1Star && m.itemLevel === 1) return true;
      if (autoSell2Star && m.itemLevel === 2) return true;
      return false;
    });

    const priceMod = getModifier(user.title || null, "shopSellPrice");
    const starMults = config.SHOP?.MATERIAL_STAR_MULT || { 1: 1, 2: 3, 3: 6 };
    let sell1Col = 0;
    let sell1Count = 0;
    let sell2Col = 0;
    let sell2Count = 0;

    for (const item of sellTargets) {
      const starMult = starMults[item.itemLevel] || 1;
      const price = Math.max(1, Math.round(roll.d6() * starMult * priceMod));
      const removed = await db.atomicIncItem(user.userId, item.itemId, item.itemLevel, item.itemName, -1);
      if (removed) {
        autoSellCol += price;
        autoSellCount++;
        if (item.itemLevel === 1) { sell1Col += price; sell1Count++; }
        else { sell2Col += price; sell2Count++; }
      }
    }

    if (autoSellCol > 0) {
      await awardCol(user.userId, autoSellCol);
    }

    if (sell1Count > 0) {
      text += formatText("MINE.AUTO_SELL_1", { count: sell1Count, col: sell1Col }) + "\n";
    }
    if (sell2Count > 0) {
      text += formatText("MINE.AUTO_SELL_2", { count: sell2Count, col: sell2Col }) + "\n";
    }
  }

  // --- 大師之眼（LV10）---
  let recipeHint = null;
  if (mineLevel >= (perks.MASTER_EYE_LEVEL ?? 10) && minedItems.length > 0) {
    const chance = perks.MASTER_EYE_CHANCE ?? 10;
    if (roll.d100Check(chance)) {
      const target = minedItems[Math.floor(Math.random() * minedItems.length)];
      const recipes = await db.find("weapon", {
        $or: [{ forge1: target.itemId }, { forge2: target.itemId }],
      });
      if (recipes.length > 0) {
        const hints = recipes.slice(0, 3).map((r) => {
          const partnerId = r.forge1 === target.itemId ? r.forge2 : r.forge1;
          const partnerItem = allItems.find((i) => i.itemId === partnerId);
          return `${r.name}（+ ${partnerItem?.name || partnerId}）`;
        });
        recipeHint = { materialName: target.itemName, recipes: hints };
        text += formatText("MINE.RECIPE_HINT", {
          materialName: target.itemName,
          recipes: hints.join("、"),
        }) + "\n";
      }
    }
  }

  // --- 批次摘要 ---
  if (isBatch && iterations > 1) {
    text = formatText("MINE.BATCH_SUMMARY", { iterations, stamina: totalStaminaSpent }) + "\n" + text;
  }

  // --- 升級文字附加 ---
  if (levelUpText) {
    text += levelUpText;
  }

  const result = { text, iterations };
  if (autoSellCol > 0) {
    result.autoSellCol = autoSellCol;
    result.autoSellCount = autoSellCount;
  }
  if (recipeHint) {
    result.recipeHint = recipeHint;
  }
  // 體力資訊（批次模式自行附帶）
  if (isBatch) {
    result.staminaCost = totalStaminaSpent;
    result.stamina = lastStamina;
    result.lastStaminaRegenAt = lastStaminaRegenAt;
  }

  return result;
};

// --- 匯出給 preview 端點使用 ---
function getFloorMinePool(allItems, floorNumber) {
  const floorMaterials = config.FLOOR_MATERIAL_GROUPS;
  const floorSpecificIds = [];
  for (const group of floorMaterials) {
    if (group.floors.includes(floorNumber)) {
      floorSpecificIds.push(...group.itemIds);
    }
  }

  const baseItems = allItems.filter((item) => item.baseItem === true || !item.floorItem);
  const floorItems = allItems.filter((item) => floorSpecificIds.includes(item.itemId));

  const pool = [...baseItems, ...floorItems];
  return pool.length > 0 ? pool : allItems;
}

function getStarRates(mineLevel, starMod = 1.0) {
  const baseList = drawLevelList[Math.min(mineLevel - 1, drawLevelList.length - 1)];
  const star3 = Math.min(99, Math.max(1, Math.round(baseList[0].less * starMod)));
  const star2 = baseList[1].less;
  const star1 = 100 - star3 - (star2 - star3);
  return {
    star3,
    star2: star2 - star3,
    star1: Math.max(0, 100 - star3 - (star2 - star3)),
  };
}

function drawItemLevel(level, starMod = 1.0) {
  const baseList = drawLevelList[Math.min(level - 1, drawLevelList.length - 1)];
  const thisItemLevelList = baseList.map((entry, i) =>
    i === 0
      ? { ...entry, less: Math.min(99, Math.max(1, Math.round(entry.less * starMod))) }
      : entry,
  );
  let itemLevel = 0;
  let count = 0;
  while (itemLevel === 0) {
    if (roll.d100Check(thisItemLevelList[count].less)) {
      itemLevel = thisItemLevelList[count].itemLevel;
    }
    count++;
  }
  return thisItemLevelList[count - 1];
}

module.exports.getFloorMinePool = getFloorMinePool;
module.exports.getStarRates = getStarRates;
