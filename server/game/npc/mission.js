const db = require("../../db.js");
const config = require("../config.js");
const { awardCol } = require("../economy/col.js");
const { killNpc } = require("./npcManager.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getModifier } = require("../title/titleModifier.js");
const roll = require("../roll.js");

const MISSIONS = config.NPC_MISSIONS;

/**
 * 計算任務預覽資訊（供前端顯示）
 * @param {object} npc - hiredNpc entry
 * @param {number} floor - 玩家當前樓層
 * @param {string|null} title - 玩家當前稱號
 * @returns {Array<object>} 任務選項列表
 */
function getMissionPreviews(npc, floor, title = null) {
  const qualityMult = MISSIONS.QUALITY_MULT[npc.quality] || 1.0;
  const rewardMod = getModifier(title, "missionReward");
  const successMod = getModifier(title, "missionSuccessRate");

  return MISSIONS.TYPES.map((type) => {
    const rawReward = Math.round(
      (type.baseReward + floor * type.baseReward * type.floorMult) * qualityMult,
    );
    const commission = Math.floor(rawReward * MISSIONS.COMMISSION_RATE);
    const netReward = Math.round((rawReward - commission) * rewardMod);
    const successRate = Math.min(99, Math.max(1, Math.round(type.successRate * successMod)));

    return {
      id: type.id,
      name: type.name,
      duration: type.duration,
      durationMinutes: type.duration * 5,
      reward: netReward,
      commission,
      successRate,
      condCost: type.condCost,
      failCondCost: type.failCondCost,
      deathChance: type.deathChance,
    };
  });
}

/**
 * 派遣 NPC 執行任務
 * @param {string} userId
 * @param {string} npcId
 * @param {string} missionType - "patrol" | "gather" | "escort"
 * @returns {{ success?: boolean, error?: string, mission?: object }}
 */
async function startMission(userId, npcId, missionType) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: "角色不存在" };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { error: "找不到該 NPC" };

  const npc = hired[npcIdx];

  // 檢查是否已在任務中
  if (npc.mission) return { error: `${npc.name} 正在執行任務中` };

  // 體力檢查（>= 10%）
  if ((npc.condition ?? 100) < 10) {
    return { error: `${npc.name} 體力過低，無法執行任務` };
  }

  // 驗證任務類型
  const missionDef = MISSIONS.TYPES.find((t) => t.id === missionType);
  if (!missionDef) return { error: "無效的任務類型" };

  const now = Date.now();
  const endsAt = now + missionDef.duration * config.TIME_SCALE;

  const mission = {
    type: missionType,
    name: missionDef.name,
    startedAt: now,
    endsAt,
    floor: user.currentFloor || 1,
  };

  await db.update(
    "user",
    { userId },
    { $set: { [`hiredNpcs.${npcIdx}.mission`]: mission } },
  );

  return {
    success: true,
    mission,
    npcName: npc.name,
    durationMinutes: missionDef.duration * 5,
  };
}

/**
 * 結算單個 NPC 的已完成任務
 * @param {string} userId
 * @param {number} npcIdx - hiredNpcs 中的 index
 * @param {object} npc - hiredNpc entry
 * @param {string|null} title - 玩家稱號
 * @returns {object|null} 結算結果，null 表示未到期
 */
async function resolveMission(userId, npcIdx, npc, title) {
  const mission = npc.mission;
  if (!mission || Date.now() < mission.endsAt) return null;

  const missionDef = MISSIONS.TYPES.find((t) => t.id === mission.type);
  if (!missionDef) {
    // 清除無效任務
    await db.update("user", { userId }, { $set: { [`hiredNpcs.${npcIdx}.mission`]: null } });
    return null;
  }

  const qualityMult = MISSIONS.QUALITY_MULT[npc.quality] || 1.0;

  // 套用稱號修正
  const successMod = getModifier(title, "missionSuccessRate");
  const rewardMod = getModifier(title, "missionReward");
  const deathMod = getModifier(title, "npcDeathChance");

  const effectiveSuccessRate = Math.min(99, Math.max(1, Math.round(missionDef.successRate * successMod)));
  const isSuccess = roll.d100Check(effectiveSuccessRate);

  let result;

  if (isSuccess) {
    // 成功：計算獎勵
    const floor = mission.floor || 1;
    const rawReward = Math.round(
      (missionDef.baseReward + floor * missionDef.baseReward * missionDef.floorMult) * qualityMult,
    );
    const commission = Math.floor(rawReward * MISSIONS.COMMISSION_RATE);
    const netReward = Math.max(1, Math.round((rawReward - commission) * rewardMod));

    await awardCol(userId, netReward); // awardCol 已自動追蹤 totalColEarned
    await increment(userId, "totalMissionRewards", netReward);
    await increment(userId, "totalMissionsCompleted");
    if (mission.type === "escort") {
      await increment(userId, "totalEscortMissions");
    }

    // 體力損耗
    const condLossMod = getModifier(title, "npcCondLoss");
    const condLoss = Math.max(1, Math.round(missionDef.condCost * condLossMod));
    const newCond = Math.max(0, (npc.condition ?? 100) - condLoss);

    await db.update("user", { userId }, {
      $set: {
        [`hiredNpcs.${npcIdx}.mission`]: null,
        [`hiredNpcs.${npcIdx}.condition`]: newCond,
      },
    });

    result = {
      success: true,
      missionName: missionDef.name,
      npcName: npc.name,
      reward: netReward,
      commission,
      condLoss,
      newCondition: newCond,
    };
  } else {
    // 失敗：體力大幅損耗 + 死亡判定
    const condLossMod = getModifier(title, "npcCondLoss");
    const condLoss = Math.max(1, Math.round(missionDef.failCondCost * condLossMod));
    const newCond = Math.max(0, (npc.condition ?? 100) - condLoss);

    const effectiveDeathChance = Math.max(1, Math.round(missionDef.deathChance * deathMod));
    const isDeath = newCond <= 20 && roll.d100Check(effectiveDeathChance);

    if (isDeath) {
      await killNpc(userId, npc.npcId, `任務失敗：${missionDef.name}`);
      await increment(userId, "npcDeaths");
      result = {
        success: false,
        died: true,
        missionName: missionDef.name,
        npcName: npc.name,
        condLoss,
      };
    } else {
      await db.update("user", { userId }, {
        $set: {
          [`hiredNpcs.${npcIdx}.mission`]: null,
          [`hiredNpcs.${npcIdx}.condition`]: newCond,
        },
      });

      result = {
        success: false,
        died: false,
        missionName: missionDef.name,
        npcName: npc.name,
        condLoss,
        newCondition: newCond,
      };
    }
  }

  await checkAndAward(userId);
  return result;
}

/**
 * 掃描並結算所有已完成的 NPC 任務（懶結算）
 * @param {string} userId
 * @returns {Array<object>} 結算結果列表
 */
async function checkMissions(userId) {
  const user = await db.findOne("user", { userId });
  if (!user || !user.hiredNpcs || user.hiredNpcs.length === 0) return [];

  const title = user.title || null;
  const results = [];

  // 逆序遍歷以避免 index 位移問題（killNpc 會 $pull）
  for (let i = user.hiredNpcs.length - 1; i >= 0; i--) {
    const npc = user.hiredNpcs[i];
    if (!npc.mission) continue;
    if (Date.now() < npc.mission.endsAt) continue;

    const result = await resolveMission(userId, i, npc, title);
    if (result) {
      results.push(result);
      // 若 NPC 死亡，$pull 會導致 index 位移，逆序遍歷下直接 break 是安全的
      // （已處理完當前及更高 index 的 NPC，剩餘的留待下次 checkMissions）
      if (result.died) break;
    }
  }

  return results;
}

module.exports = { startMission, checkMissions, resolveMission, getMissionPreviews };
