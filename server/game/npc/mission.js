const db = require("../../db.js");
const config = require("../config.js");
const { awardCol } = require("../economy/col.js");
const { killNpc } = require("./npcManager.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getModifier } = require("../title/titleModifier.js");
const roll = require("../roll.js");
const { awardAdvExp } = require("../progression/adventureLevel.js");
const { getActiveFloor } = require("../floor/activeFloor.js");
const { formatText, getText } = require("../textManager.js");

const { resolveWeaponType } = require("../weapon/weaponType.js");
const { getExpToNextLevel } = require("./npcStats.js");
const { tryNpcLearnSkill } = require("../skill/npcSkillLearning.js");
const { ensureNpcProfMap } = require("../skill/skillProficiency.js");
const { isNpcOnExpedition } = require("../expedition/expedition.js");

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
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { error: getText("NPC.NPC_NOT_FOUND") };

  const npc = hired[npcIdx];

  // 檢查是否已在任務中
  if (npc.mission) return { error: formatText("NPC.ON_MISSION", { npcName: npc.name }) };

  // 檢查是否正在遠征中
  if (isNpcOnExpedition(user, npcId)) {
    return { error: formatText("EXPEDITION.NPC_ON_EXPEDITION", { npcName: npc.name }) };
  }

  // 同時派遣任務上限（只計算非修練任務）
  const activeMissions = hired.filter((n) => n.mission && !n.mission.isTraining).length;
  const concurrentLimit = MISSIONS.CONCURRENT_LIMIT ?? 2;
  if (activeMissions >= concurrentLimit) {
    return { error: formatText("NPC.MISSION_LIMIT", { limit: concurrentLimit }) };
  }

  // 體力檢查（>= 10%）
  if ((npc.condition ?? 100) < 10) {
    return { error: formatText("NPC.LOW_CONDITION", { npcName: npc.name }) };
  }

  // 驗證任務類型
  const missionDef = MISSIONS.TYPES.find((t) => t.id === missionType);
  if (!missionDef) return { error: getText("NPC.INVALID_MISSION") };

  const now = Date.now();
  const endsAt = now + missionDef.duration * config.TIME_SCALE;

  const mission = {
    type: missionType,
    name: missionDef.name,
    startedAt: now,
    endsAt,
    floor: getActiveFloor(user),
  };

  // 原子性寫入：同時驗證該 NPC 未在任務中 + 非修練任務數未超上限
  const updateResult = await db.findOneAndUpdate(
    "user",
    {
      userId,
      [`hiredNpcs.${npcIdx}.mission`]: null,
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$hiredNpcs",
                cond: {
                  $and: [
                    { $ne: ["$$this.mission", null] },
                    { $ne: ["$$this.mission.isTraining", true] },
                  ],
                },
              },
            },
          },
          concurrentLimit,
        ],
      },
    },
    { $set: { [`hiredNpcs.${npcIdx}.mission`]: mission } },
    { returnDocument: "after" },
  );
  if (!updateResult) {
    return { error: formatText("NPC.MISSION_LIMIT_OR_CHANGED", { limit: concurrentLimit }) };
  }

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

    // 體力損耗
    const condLossMod = getModifier(title, "npcCondLoss");
    const condLoss = Math.max(1, Math.round(missionDef.condCost * condLossMod));
    const newCond = Math.max(0, (npc.condition ?? 100) - condLoss);

    // 冪等性保護：原子清除 mission + 更新體力，mission 已被清除時跳過
    const guard = await db.findOneAndUpdate(
      "user",
      { userId, [`hiredNpcs.${npcIdx}.mission`]: { $ne: null } },
      { $set: {
        [`hiredNpcs.${npcIdx}.mission`]: null,
        [`hiredNpcs.${npcIdx}.condition`]: newCond,
      } },
      { returnDocument: "after" },
    );
    if (!guard) return null; // 已被另一個請求結算

    // 獎勵發放（在原子 guard 之後，確保不會重複）
    await awardCol(userId, netReward);
    await increment(userId, "totalMissionRewards", netReward);
    await increment(userId, "totalMissionsCompleted");
    if (mission.type === "escort") {
      await increment(userId, "totalEscortMissions");
    }

    // 冒險等級經驗
    const advExpResult = await awardAdvExp(userId, config.ADV_LEVEL.EXP_MISSION_SUCCESS);

    result = {
      success: true,
      missionName: missionDef.name,
      npcName: npc.name,
      reward: netReward,
      commission,
      condLoss,
      newCondition: newCond,
      advExpGained: config.ADV_LEVEL.EXP_MISSION_SUCCESS,
      advLevelUp: advExpResult.levelUp,
      advNewLevel: advExpResult.newLevel,
    };
  } else {
    // 失敗：體力大幅損耗 + 死亡判定
    const condLossMod = getModifier(title, "npcCondLoss");
    const condLoss = Math.max(1, Math.round(missionDef.failCondCost * condLossMod));
    const newCond = Math.max(0, (npc.condition ?? 100) - condLoss);

    const effectiveDeathChance = Math.max(1, Math.round(missionDef.deathChance * deathMod));
    const isDeath = newCond <= 20 && roll.d100Check(effectiveDeathChance);

    if (isDeath) {
      // 冪等性保護：先原子清除 mission
      const guard = await db.findOneAndUpdate(
        "user",
        { userId, [`hiredNpcs.${npcIdx}.mission`]: { $ne: null } },
        { $set: { [`hiredNpcs.${npcIdx}.mission`]: null } },
        { returnDocument: "after" },
      );
      if (!guard) return null;

      await killNpc(userId, npc.npcId, `任務失敗：${missionDef.name}`);
      await increment(userId, "npcDeaths");
      const advExpResultFail = await awardAdvExp(userId, config.ADV_LEVEL.EXP_MISSION_FAIL);

      result = {
        success: false,
        died: true,
        missionName: missionDef.name,
        npcName: npc.name,
        condLoss,
        advExpGained: config.ADV_LEVEL.EXP_MISSION_FAIL,
        advLevelUp: advExpResultFail.levelUp,
        advNewLevel: advExpResultFail.newLevel,
      };
    } else {
      // 冪等性保護：原子清除 mission + 更新體力
      const guard = await db.findOneAndUpdate(
        "user",
        { userId, [`hiredNpcs.${npcIdx}.mission`]: { $ne: null } },
        { $set: {
          [`hiredNpcs.${npcIdx}.mission`]: null,
          [`hiredNpcs.${npcIdx}.condition`]: newCond,
        } },
        { returnDocument: "after" },
      );
      if (!guard) return null;

      const advExpResultFail = await awardAdvExp(userId, config.ADV_LEVEL.EXP_MISSION_FAIL);

      result = {
        success: false,
        died: false,
        missionName: missionDef.name,
        npcName: npc.name,
        condLoss,
        newCondition: newCond,
        advExpGained: config.ADV_LEVEL.EXP_MISSION_FAIL,
        advLevelUp: advExpResultFail.levelUp,
        advNewLevel: advExpResultFail.newLevel,
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
    if (!npc || !npc.mission) continue;
    if (Date.now() < npc.mission.endsAt) continue;

    try {
      const result = npc.mission.isTraining
        ? await resolveTraining(userId, i, npc)
        : await resolveMission(userId, i, npc, title);
      if (result) {
        results.push(result);
        if (result.died) break;
      }
    } catch (err) {
      // 單一 NPC 結算失敗：log 錯誤 + 清除該 NPC 的 mission（防止無限重試）
      console.error(`[checkMissions] NPC 結算失敗 userId=${userId} npcIdx=${i} npcId=${npc.npcId}:`, err);
      try {
        await db.update("user", { userId }, { $set: { [`hiredNpcs.${i}.mission`]: null } });
      } catch (cleanupErr) {
        console.error(`[checkMissions] mission 清除也失敗:`, cleanupErr);
      }
    }
  }

  return results;
}

/**
 * 計算修練預覽資訊
 * @param {object} npc - hiredNpc entry
 * @param {object[]} weapons - user.weaponStock
 * @param {number} currentFloor - 玩家當前樓層
 * @returns {Array<object>}
 */
function getTrainingPreviews(npc, weapons, currentFloor) {
  const TRAINING = config.NPC_TRAINING;
  const equippedWeapon = npc.equippedWeaponIndex != null
    ? weapons[npc.equippedWeaponIndex]
    : null;
  const hasWeapon = !!equippedWeapon;
  const weaponType = equippedWeapon ? resolveWeaponType(equippedWeapon) : null;
  const effectiveFloor = Math.max(1, currentFloor - 3);
  const floorMult = 1 + (effectiveFloor - 1) * (TRAINING.FLOOR_MULT || 0.3);
  const qualityMult = config.SKILL.NPC_QUALITY_LEARN_MULT[npc.quality] || 1.0;

  // 封頂計算
  const profCap = effectiveFloor * (TRAINING.PROF_CAP_PER_FLOOR || 100);
  const levelCap = effectiveFloor * (TRAINING.LEVEL_CAP_PER_FLOOR || 2);
  const currentProf = weaponType
    ? ((npc.weaponProficiency || {})[weaponType] || 0)
    : 0;
  const currentLevel = npc.level || 1;
  const atProfCap = currentProf >= profCap;
  const atLevelCap = currentLevel >= levelCap;

  return TRAINING.TYPES.map((type) => {
    const rawProfGain = Math.round(type.profGain * floorMult);
    const effectiveProfGain = atProfCap ? 0 : Math.min(rawProfGain, profCap - currentProf);
    const rawExpReward = Math.round(type.expReward * floorMult);
    const effectiveExpReward = atLevelCap ? 0 : rawExpReward;

    return {
      id: type.id,
      name: type.name,
      duration: type.duration,
      durationMinutes: type.duration * 5,
      profGain: effectiveProfGain,
      learnChance: atProfCap ? 0 : Math.round(
        config.SKILL.NPC_LEARN_CHANCE * type.learnChanceMult * qualityMult,
      ),
      condCost: type.condCost,
      expReward: effectiveExpReward,
      hasWeapon,
      weaponType,
      atProfCap,
      atLevelCap,
      profCap,
      levelCap,
    };
  });
}

/**
 * 派遣 NPC 進行自主修練
 * @param {string} userId
 * @param {string} npcId
 * @param {string} trainingType - "quick_training" | "intensive_training"
 * @returns {{ success?: boolean, error?: string }}
 */
async function startTraining(userId, npcId, trainingType) {
  const user = await db.findOne("user", { userId });
  if (!user) return { error: getText("NPC.CHAR_NOT_FOUND") };

  const hired = user.hiredNpcs || [];
  const npcIdx = hired.findIndex((n) => n.npcId === npcId);
  if (npcIdx === -1) return { error: getText("NPC.NPC_NOT_FOUND") };

  const npc = hired[npcIdx];

  if (npc.mission) return { error: formatText("NPC.ON_MISSION", { npcName: npc.name }) };

  // 檢查是否正在遠征中
  if (isNpcOnExpedition(user, npcId)) {
    return { error: formatText("EXPEDITION.NPC_ON_EXPEDITION", { npcName: npc.name }) };
  }

  // 修練獨立上限（只計算修練任務）
  const activeTrainings = hired.filter((n) => n.mission?.isTraining).length;
  const trainingLimit = config.NPC_TRAINING.CONCURRENT_LIMIT ?? 2;
  if (activeTrainings >= trainingLimit) {
    return { error: formatText("NPC.TRAINING_LIMIT", { limit: trainingLimit }) };
  }

  if ((npc.condition ?? 100) < 10) {
    return { error: formatText("NPC.LOW_CONDITION", { npcName: npc.name }) };
  }

  const trainingDef = (config.NPC_TRAINING.TYPES || []).find((t) => t.id === trainingType);
  if (!trainingDef) return { error: getText("NPC.INVALID_TRAINING") };

  // 需裝備武器
  const weapons = user.weaponStock || [];
  const equippedWeapon = npc.equippedWeaponIndex != null
    ? weapons[npc.equippedWeaponIndex]
    : null;
  if (!equippedWeapon) {
    return { error: formatText("NPC.TRAINING_NO_WEAPON", { npcName: npc.name }) };
  }

  const now = Date.now();
  const endsAt = now + trainingDef.duration * config.TIME_SCALE;

  const mission = {
    type: trainingType,
    name: trainingDef.name,
    startedAt: now,
    endsAt,
    floor: getActiveFloor(user),
    isTraining: true,
  };

  // 原子性寫入：修練任務數未超上限
  const updateResult = await db.findOneAndUpdate(
    "user",
    {
      userId,
      [`hiredNpcs.${npcIdx}.mission`]: null,
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: "$hiredNpcs",
                cond: {
                  $and: [
                    { $ne: ["$$this.mission", null] },
                    { $eq: ["$$this.mission.isTraining", true] },
                  ],
                },
              },
            },
          },
          trainingLimit,
        ],
      },
    },
    { $set: { [`hiredNpcs.${npcIdx}.mission`]: mission } },
    { returnDocument: "after" },
  );
  if (!updateResult) {
    return { error: formatText("NPC.TRAINING_LIMIT", { limit: trainingLimit }) };
  }

  return {
    success: true,
    mission,
    npcName: npc.name,
    durationMinutes: trainingDef.duration * 5,
  };
}

/**
 * 結算 NPC 修練結果
 * @param {string} userId
 * @param {number} npcIdx
 * @param {object} npc
 * @returns {object|null}
 */
async function resolveTraining(userId, npcIdx, npc) {
  const mission = npc.mission;
  if (!mission || Date.now() < mission.endsAt) return null;

  const trainingDef = (config.NPC_TRAINING.TYPES || []).find((t) => t.id === mission.type);
  if (!trainingDef) {
    await db.update("user", { userId }, { $set: { [`hiredNpcs.${npcIdx}.mission`]: null } });
    return null;
  }

  // 重新讀取最新資料
  const user = await db.findOne("user", { userId });
  if (!user) return null;
  const currentNpc = (user.hiredNpcs || [])[npcIdx];
  if (!currentNpc) return null;

  const weapons = user.weaponStock || [];
  const equippedWeapon = currentNpc.equippedWeaponIndex != null
    ? weapons[currentNpc.equippedWeaponIndex]
    : null;

  // 樓層加成：effectiveFloor = max(1, floor - 3)
  const trainingFloor = mission.floor || user.currentFloor || 1;
  const effectiveFloor = Math.max(1, trainingFloor - 3);
  const floorMult = 1 + (effectiveFloor - 1) * (config.NPC_TRAINING.FLOOR_MULT || 0.3);

  // 封頂計算
  const TRAINING = config.NPC_TRAINING;
  const profCap = effectiveFloor * (TRAINING.PROF_CAP_PER_FLOOR || 100);
  const levelCap = effectiveFloor * (TRAINING.LEVEL_CAP_PER_FLOOR || 2);

  let profResult = null;
  let newProf = null;
  let weaponType = null;

  if (equippedWeapon) {
    weaponType = resolveWeaponType(equippedWeapon);
    if (weaponType) {
      // 確保舊格式已遷移為物件
      await ensureNpcProfMap(userId, npcIdx);
      const refreshedForProf = await db.findOne("user", { userId });
      const profNpc = (refreshedForProf?.hiredNpcs || [])[npcIdx];
      const currentProf = ((profNpc?.weaponProficiency || {})[weaponType]) || 0;

      if (currentProf >= profCap) {
        profResult = { profGained: 0, weaponType, atCap: true };
      } else {
        const rawProfGain = Math.round(trainingDef.profGain * floorMult);
        const cappedProfGain = Math.min(rawProfGain, profCap - currentProf);
        newProf = Math.min(config.SKILL.MAX_PROFICIENCY, currentProf + cappedProfGain);
        profResult = { profGained: newProf - currentProf, weaponType, atCap: newProf >= profCap };
      }
    }
  }

  // 體力扣除
  const condLoss = trainingDef.condCost;
  const newCond = Math.max(0, (currentNpc.condition ?? 100) - condLoss);

  // NPC EXP（樓層加成，封頂）
  const currentLevel = currentNpc.level || 1;
  let expGain;
  let finalExp;
  let finalLevel;
  let levelUp;

  if (currentLevel >= levelCap) {
    expGain = 0;
    finalExp = currentNpc.exp || 0;
    finalLevel = currentLevel;
    levelUp = false;
  } else {
    expGain = Math.round(trainingDef.expReward * floorMult);
    const currentExp = currentNpc.exp || 0;
    const expNeeded = getExpToNextLevel(currentLevel);
    const totalExp = currentExp + expGain;
    levelUp = totalExp >= expNeeded;
    finalExp = levelUp ? totalExp - expNeeded : totalExp;
    finalLevel = levelUp ? Math.min(levelCap, currentLevel + 1) : currentLevel;
  }

  // 冪等性保護：所有欄位合併為單一原子更新，mission 已被清除時跳過
  const atomicSet = {
    [`hiredNpcs.${npcIdx}.mission`]: null,
    [`hiredNpcs.${npcIdx}.condition`]: newCond,
    [`hiredNpcs.${npcIdx}.exp`]: finalExp,
    [`hiredNpcs.${npcIdx}.level`]: finalLevel,
  };
  if (newProf !== null && weaponType) {
    atomicSet[`hiredNpcs.${npcIdx}.weaponProficiency.${weaponType}`] = newProf;
  }

  const guard = await db.findOneAndUpdate(
    "user",
    { userId, [`hiredNpcs.${npcIdx}.mission`]: { $ne: null } },
    { $set: atomicSet },
    { returnDocument: "after" },
  );
  if (!guard) return null; // 已被另一個請求結算

  // 技能學習（在原子 guard 之後，僅在有熟練度提升時嘗試）
  let skillResult = null;
  if (newProf !== null && weaponType && equippedWeapon) {
    const qualityMult = config.SKILL.NPC_QUALITY_LEARN_MULT[currentNpc.quality] || 1.0;
    const learnChance = config.SKILL.NPC_LEARN_CHANCE * trainingDef.learnChanceMult * qualityMult;

    const refreshedNpc = (guard.hiredNpcs || [])[npcIdx];
    if (refreshedNpc) {
      skillResult = await tryNpcLearnSkill(userId, npcIdx, refreshedNpc, equippedWeapon, learnChance);
    }
  }

  return {
    isTraining: true,
    trainingName: trainingDef.name,
    npcName: currentNpc.name,
    profResult,
    skillResult,
    condLoss,
    newCondition: newCond,
    expGained: expGain,
    levelUp,
    newLevel: finalLevel,
    atProfCap: profResult?.atCap || false,
    atLevelCap: currentLevel >= levelCap,
  };
}

module.exports = {
  startMission, checkMissions, resolveMission, getMissionPreviews,
  startTraining, resolveTraining, getTrainingPreviews,
};
