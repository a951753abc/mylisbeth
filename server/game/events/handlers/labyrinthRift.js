const config = require("../../config.js");
const db = require("../../../db.js");
const roll = require("../../roll.js");
const grantFloorMaterial = require("../helpers/grantFloorMaterial.js");

const LR = config.RANDOM_EVENTS.LABYRINTH_RIFT;

/**
 * 迷宮裂隙事件 handler
 * 65% 成功探索(win) / 35% 強敵遭遇(lose)
 * @param {object} user - 最新 user 文件
 * @param {string} actionType - "adv"
 * @param {object} actionResult - 原始動作結果
 * @returns {object} eventResult
 */
async function labyrinthRift(user, actionType, actionResult) {
  const floor = user.currentFloor || 1;
  const targetFloor = Math.min(floor + LR.FLOOR_BONUS, 20);

  // 確認冒險 NPC 體力足夠（eventDefs 條件檢查的是「任一 NPC」，這裡再精確確認）
  const advNpcId = actionResult.advNpcId;
  if (advNpcId) {
    const latestUser = await db.findOne("user", { userId: user.userId });
    const hired = latestUser?.hiredNpcs || [];
    const advNpc = hired.find((n) => n.npcId === advNpcId);
    if (advNpc && (advNpc.condition ?? 100) <= LR.MIN_CONDITION) {
      // 冒險 NPC 體力不足，事件靜默略過
      return null;
    }
  }

  const outcome = roll.d100();

  if (outcome <= 65) {
    return await processWin(user, targetFloor);
  } else {
    return await processLose(user, actionResult);
  }
}

/**
 * 成功探索：獲得高樓層 ★★★ 素材
 */
async function processWin(user, targetFloor) {
  const material = await grantFloorMaterial(user.userId, targetFloor, 3);

  return {
    eventId: "labyrinth_rift",
    eventName: "迷宮裂隙",
    outcome: "win",
    text: `冒險途中，空間突然扭曲——一道次元裂隙在眼前撕開！\nNPC 勇敢地踏入裂隙，在第 ${targetFloor} 層的秘境中發現了珍貴的素材！`,
    battleResult: null,
    rewards: {
      material: material ? { name: material.name, level: material.level } : null,
    },
    losses: {},
  };
}

/**
 * 強敵遭遇：NPC 體力額外消耗 20 點
 */
async function processLose(user, actionResult) {
  const advNpcId = actionResult.advNpcId;
  let npcName = "冒險者";

  if (advNpcId) {
    const latestUser = await db.findOne("user", { userId: user.userId });
    const hired = latestUser?.hiredNpcs || [];
    const npcIdx = hired.findIndex((n) => n.npcId === advNpcId);

    if (npcIdx !== -1) {
      npcName = hired[npcIdx].name;
      const newCond = Math.max(0, (hired[npcIdx].condition ?? 100) - LR.LOSE_CONDITION);
      await db.update(
        "user",
        { userId: user.userId },
        { $set: { [`hiredNpcs.${npcIdx}.condition`]: newCond } },
      );
    }
  }

  return {
    eventId: "labyrinth_rift",
    eventName: "迷宮裂隙",
    outcome: "lose",
    text: `冒險途中，空間突然扭曲——一道次元裂隙在眼前撕開！\n${npcName} 踏入裂隙後遭遇了強大的異界生物！\n勉強逃出時已是遍體鱗傷。（體力 -${LR.LOSE_CONDITION}）`,
    battleResult: null,
    rewards: {},
    losses: {
      npcCondition: LR.LOSE_CONDITION,
    },
  };
}

module.exports = labyrinthRift;
