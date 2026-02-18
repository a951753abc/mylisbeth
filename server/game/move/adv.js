const _ = require("lodash");
const config = require("../config.js");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const level = require("../level");
const roll = require("../roll.js");
const npcNameList = require("../npc/list.json");
const eneNameList = require("../ene/name.json");
const { pveBattle } = require("../battle");
const gemini = require("../gemini.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getFloor } = require("../floor/floorData.js");
const ensureUserFields = require("../migration/ensureUserFields.js");

function createBattlePrompt(battleResult, user, weaponData, place, floorNum, floorName) {
  let logText = "";
  battleResult.log.forEach((entry) => {
    switch (entry.type) {
      case "round":
        logText += `第 ${entry.number} 回合開始。\n`;
        break;
      case "attack":
        logText += `- ${entry.attacker} 攻擊 ${entry.defender}。${entry.rollText}\n`;
        break;
      case "end":
        if (entry.outcome === "win")
          logText += `${entry.winner} 獲得了勝利！\n`;
        if (entry.outcome === "lose")
          logText += `${entry.winner} 獲勝，${battleResult.npcName}倒下了。\n`;
        if (entry.outcome === "draw") logText += `雙方勢均力敵，不分勝負。\n`;
        break;
    }
  });

  return `
你是日本輕小說家「川原礫」，會基於你的寫作經驗與風格，並按照以下的「戰鬥情境」和「戰鬥紀錄」來創作，但不要逐字翻譯紀錄，而是用你的文筆使其成為一段精彩的故事。
故事風格、背景設定請按照「刀劍神域(SAO)」。
使用第三人稱寫作。
使用日文寫作。
參與戰鬥的人物必須進行對話。
**重要：請將總描述長度控制在 600 字元左右，絕對不要超過 800 字元。**

### 戰鬥情境
- **地點**: Aincrad 第 ${floorNum} 層「${floorName}」的 ${place}。
- **我方**: ${battleResult.npcName} (冒險者)。
- **我方武器**: ${weaponData.weaponName} (由鍛造師 ${user.name} 所打造的 ${weaponData.name})。
- **敵方**: ${battleResult.enemyName} (兇惡的敵人)。

### 戰鬥紀錄 (請以此為基礎進行描述)
${logText}

現在，請開始你的描述：
`;
}

module.exports = async function (cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);

    if (!user.weaponStock || user.weaponStock.length === 0) {
      return { error: "你沒有任何武器，無法冒險！" };
    }

    if (cmd[2] === undefined) {
      cmd[2] = 0;
    }

    if (!user.weaponStock[cmd[2]]) {
      return { error: "錯誤！武器" + cmd[2] + " 不存在" };
    }

    const thisWeapon = user.weaponStock[cmd[2]];
    const npcExample = npcNameList[Math.floor(Math.random() * npcNameList.length)];
    const npc = _.clone(npcExample);

    const currentFloor = user.currentFloor || 1;
    const floorData = getFloor(currentFloor);
    const place = floorData.places[Math.floor(Math.random() * floorData.places.length)];

    const battleResult = await pveBattle(thisWeapon, npc, eneNameList, floorData.enemies);

    const prompt = createBattlePrompt(battleResult, user, thisWeapon, place, currentFloor, floorData.name);
    const narrativeText = await gemini.generateBattleNarrative(prompt);

    let durabilityText = "";
    let weaponCheck;
    if (battleResult.win === 1) {
      weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.WIN);
    } else if (battleResult.dead === 1) {
      weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.DEAD);
    } else {
      weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.DRAW);
    }

    if (weaponCheck) {
      const reduceDurability = roll.d6();
      const durPath = `weaponStock.${cmd[2]}.durability`;
      const updatedUser = await db.findOneAndUpdate(
        "user",
        { userId: user.userId },
        { $inc: { [durPath]: -reduceDurability } },
        { returnDocument: "after" },
      );

      durabilityText = `\n\n(激烈的戰鬥後，${thisWeapon.weaponName} 的耐久度減少了 ${reduceDurability} 點。)`;
      if (updatedUser.weaponStock[cmd[2]].durability <= 0) {
        durabilityText += `\n**${thisWeapon.weaponName} 爆發四散了！**`;
        await weapon.destroyWeapon(user.userId, cmd[2]);
        await increment(user.userId, "weaponsBroken");
      }
    }

    let rewardText = "";
    let colEarned = 0;
    if (battleResult.win === 1) {
      const winString = `${battleResult.category}Win`;
      const mineResultText = await mineBattle(user, battleResult.category, currentFloor);
      rewardText = `\n\n**戰利品:**\n${mineResultText}`;
      await db.update("user", { userId: user.userId }, { $inc: { [winString]: 1 } });

      const colReward = config.COL_ADVENTURE_REWARD[battleResult.category] || 50;
      colEarned = colReward;
      await awardCol(user.userId, colReward);
      rewardText += `獲得 ${colReward} Col\n`;

      if (battleResult.category === "[優樹]") {
        await increment(user.userId, "yukiDefeats");
      }
    } else if (battleResult.dead === 1) {
      await db.update("user", { userId: user.userId }, { $inc: { lost: 1 } });
    }

    // 更新探索進度
    const floorProgressKey = `floorProgress.${currentFloor}.explored`;
    const currentExplored = _.get(user, `floorProgress.${currentFloor}.explored`, 0);
    const maxExplore = _.get(user, `floorProgress.${currentFloor}.maxExplore`, config.FLOOR_MAX_EXPLORE);
    if (currentExplored < maxExplore) {
      await db.update(
        "user",
        { userId: user.userId },
        { $inc: { [floorProgressKey]: 1 } },
      );
    }

    await increment(user.userId, "totalAdventures");
    await checkAndAward(user.userId);

    return {
      battleResult: {
        win: battleResult.win,
        dead: battleResult.dead,
        category: battleResult.category,
        enemyName: battleResult.enemyName,
        npcName: battleResult.npcName,
        log: battleResult.log,
      },
      narrative: narrativeText,
      durabilityText,
      reward: rewardText,
      colEarned,
      floor: currentFloor,
      floorName: floorData.name,
    };
  } catch (error) {
    console.error("在執行 move adv 時發生嚴重錯誤:", error);
    return { error: "冒險的過程中發生了未知的錯誤，請稍後再試。" };
  }
};

async function mineBattle(user, category, floorNumber) {
  const battleMineList = [
    { category: "[優樹]", list: [{ itemLevel: 3, less: 100, text: "★★★" }] },
    {
      category: "[Hell]",
      list: [
        { itemLevel: 3, less: 40, text: "★★★" },
        { itemLevel: 2, less: 100, text: "★★" },
      ],
    },
    {
      category: "[Hard]",
      list: [
        { itemLevel: 3, less: 30, text: "★★★" },
        { itemLevel: 2, less: 100, text: "★★" },
      ],
    },
    {
      category: "[Normal]",
      list: [
        { itemLevel: 3, less: 20, text: "★★★" },
        { itemLevel: 2, less: 100, text: "★★" },
      ],
    },
    {
      category: "[Easy]",
      list: [
        { itemLevel: 3, less: 10, text: "★★★" },
        { itemLevel: 2, less: 100, text: "★★" },
      ],
    },
  ];

  const allItems = await db.find("item", {});
  const floorItems = getFloorMineList(allItems, floorNumber);
  const mine = _.clone(floorItems[Math.floor(Math.random() * floorItems.length)]);

  const list = _.find(battleMineList, ["category", category]);
  if (!list || !list.list) {
    console.error(`錯誤：在 battleMineList 中找不到類別為 "${category}" 的掉落設定。`);
    return "";
  }
  const thisItemLevelList = list.list;
  let itemLevel = 0;
  let levelCount = 0;
  while (itemLevel === 0) {
    if (levelCount >= thisItemLevelList.length) break;
    if (roll.d100Check(thisItemLevelList[levelCount].less)) {
      itemLevel = thisItemLevelList[levelCount].itemLevel;
    }
    levelCount++;
  }
  if (itemLevel !== 0) {
    mine.level = thisItemLevelList[levelCount - 1];
  } else {
    return "";
  }
  await db.saveItemToUser(user.userId, mine);
  return "獲得[" + mine.level.text + "]" + mine.name + "\n";
}

function getFloorMineList(allItems, floorNumber) {
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
