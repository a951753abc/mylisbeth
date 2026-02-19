const _ = require("lodash");
const config = require("../config.js");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const level = require("../level");
const roll = require("../roll.js");
const eneNameList = require("../ene/name.json");
const { pveBattle } = require("../battle");
const { generateNarrative } = require("../narrative/generate.js");
const { awardCol, deductCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getFloor } = require("../floor/floorData.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getEffectiveStats } = require("../npc/npcStats.js");
const { resolveNpcBattle } = require("../npc/npcManager.js");
const { enforceDebtPenalties } = require("../economy/debtCheck.js");
const { getModifier } = require("../title/titleModifier.js");

// 冒險結果對應 NPC 經驗值
const NPC_EXP_GAIN = {
  WIN: 30,
  LOSE: 5,
  DRAW: 10,
};

module.exports = async function (cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);

    if (!user.weaponStock || user.weaponStock.length === 0) {
      return { error: "你沒有任何武器，無法冒險！" };
    }

    // cmd[2] = weaponId, cmd[3] = npcId
    if (cmd[2] === undefined) {
      cmd[2] = 0;
    }

    if (!user.weaponStock[cmd[2]]) {
      return { error: "錯誤！武器" + cmd[2] + " 不存在" };
    }

    // 必須提供 NPC
    const npcId = cmd[3];
    if (!npcId) {
      return { error: "冒險必須選擇一位已雇用的 NPC 冒險者！" };
    }

    const hired = user.hiredNpcs || [];
    const hiredNpc = hired.find((n) => n.npcId === npcId);
    if (!hiredNpc) {
      return { error: "找不到該 NPC，請確認已雇用該冒險者。" };
    }

    // 體力檢查
    const effectiveStats = getEffectiveStats(hiredNpc);
    if (!effectiveStats) {
      return { error: `${hiredNpc.name} 體力過低（< 10%），無法出戰！請先治療。` };
    }

    const thisWeapon = user.weaponStock[cmd[2]];
    const currentFloor = user.currentFloor || 1;

    // 扣除冒險委託費
    const fee =
      config.COL_ADVENTURE_FEE_BASE +
      currentFloor * config.COL_ADVENTURE_FEE_PER_FLOOR;

    // 負債時獎勵減半（但費用不變）
    const penalties = enforceDebtPenalties(user);

    const feeSuccess = await deductCol(user.userId, fee);
    if (!feeSuccess) {
      return { error: `Col 不足，冒險需要 ${fee} Col（第 ${currentFloor} 層委託費）。` };
    }

    // 組裝 NPC 資訊傳給 battle（標記為已雇用 NPC 並帶入有效素質）
    const npcForBattle = {
      name: hiredNpc.name,
      hp: effectiveStats.hp,
      isHiredNpc: true,
      effectiveStats,
    };

    const floorData = getFloor(currentFloor);
    const place = floorData.places[Math.floor(Math.random() * floorData.places.length)];

    const title = user.title || null;
    const titleMods = {
      battleAtk: getModifier(title, "battleAtk"),
      battleDef: getModifier(title, "battleDef"),
      battleAgi: getModifier(title, "battleAgi"),
    };
    const battleResult = await pveBattle(thisWeapon, npcForBattle, eneNameList, floorData.enemies, titleMods);

    const narrative = generateNarrative(battleResult, {
      weaponName: thisWeapon.weaponName,
      smithName: user.name,
      place,
      floor: currentFloor,
      floorName: floorData.name,
    });

    // 判斷戰鬥結果（對應 NPC 術語）
    let outcomeKey;
    if (battleResult.win === 1) outcomeKey = "WIN";
    else if (battleResult.dead === 1) outcomeKey = "LOSE";
    else outcomeKey = "DRAW";

    // 武器耐久損耗（套用 advWeaponDmgChance 修正）
    const weaponDmgMod = getModifier(title, "advWeaponDmgChance");
    let durabilityText = "";
    let weaponCheck;
    if (battleResult.win === 1) {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.WIN * weaponDmgMod)));
    } else if (battleResult.dead === 1) {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.DEAD * weaponDmgMod)));
    } else {
      weaponCheck = roll.d100Check(Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE.DRAW * weaponDmgMod)));
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

    // NPC 體力損耗 + 死亡判斷 + 升級
    const expGain = NPC_EXP_GAIN[outcomeKey] || 10;
    const npcResult = await resolveNpcBattle(user.userId, npcId, outcomeKey, expGain, title);

    let npcEventText = "";
    let npcDeathEvent = null;
    if (npcResult.died) {
      npcEventText = `\n\n**${hiredNpc.name} 在戰鬥中壯烈犧牲了...**`;
      npcDeathEvent = {
        npcName: hiredNpc.name,
        npcQuality: hiredNpc.quality,
        smithName: user.name,
        floor: currentFloor,
      };
      await increment(user.userId, "npcDeaths");
    } else if (npcResult.levelUp) {
      npcEventText = `\n\n✨ ${hiredNpc.name} 升級了！LV ${npcResult.newLevel}`;
    } else if (npcResult.newCondition !== undefined) {
      npcEventText = `\n（${hiredNpc.name} 體力: ${npcResult.newCondition}%）`;
    }

    // 獎勵
    let rewardText = "";
    let colEarned = 0;
    if (battleResult.win === 1) {
      const winString = `${battleResult.category}Win`;
      const mineResultText = await mineBattle(user, battleResult.category, currentFloor);
      rewardText = `\n\n**戰利品:**\n${mineResultText}`;
      await db.update("user", { userId: user.userId }, { $inc: { [winString]: 1 } });

      const advColMod = getModifier(title, "advColReward");
      let colReward = Math.round((config.COL_ADVENTURE_REWARD[battleResult.category] || 50) * advColMod);
      // 負債時獎勵減半
      colReward = Math.floor(colReward * penalties.advRewardMult);
      colEarned = colReward;
      await awardCol(user.userId, colReward);
      rewardText += `獲得 ${colReward} Col`;
      if (penalties.advRewardMult < 1) {
        rewardText += `（負債懲罰：獎勵減半）`;
      }
      rewardText += "\n";

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
      advNpcId: npcId,
      battleResult: {
        win: battleResult.win,
        dead: battleResult.dead,
        category: battleResult.category,
        enemyName: battleResult.enemyName,
        npcName: battleResult.npcName,
        log: battleResult.log,
      },
      narrative,
      durabilityText,
      reward: rewardText + npcEventText,
      colEarned,
      colSpent: fee,
      floor: currentFloor,
      floorName: floorData.name,
      npcResult: {
        survived: npcResult.survived !== false,
        died: !!npcResult.died,
        levelUp: !!npcResult.levelUp,
        newCondition: npcResult.newCondition,
        newLevel: npcResult.newLevel,
      },
      socketEvents: npcDeathEvent
        ? [{ event: "npc:death", data: npcDeathEvent }]
        : [],
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
