const config = require("../config.js");
const db = require("../../db.js");
const E = require("../../socket/events.js");
const level = require("../level");
const eneNameList = require("../ene/name.json");
const { pveBattleWithSkills } = require("../battle");
const { generateNarrative } = require("../narrative/generate.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const { getFloor } = require("../floor/floorData.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getEffectiveStats } = require("../npc/npcStats.js");
const { resolveNpcBattle } = require("../npc/npcManager.js");
const { enforceDebtPenalties } = require("../economy/debtCheck.js");
const { getModifier } = require("../title/titleModifier.js");
const { mineBattle } = require("../loot/battleLoot.js");
const { awardAdvExp } = require("../progression/adventureLevel.js");
const { applyWeaponDurability, incrementFloorExploration } = require("./adventureUtils.js");
const roll = require("../roll.js");
const { recoverFromDiscardPool } = require("../loot/discardRecovery.js");
const { getNpcEffectiveSkills } = require("../skill/skillSlot.js");
const { buildSkillContext } = require("../skill/skillCombat.js");
const { awardProficiency, awardNpcProficiency, getProfGainKey } = require("../skill/skillProficiency.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");
const { tryNpcLearnSkill } = require("../skill/npcSkillLearning.js");
const { checkExtraSkills } = require("../skill/extraSkillChecker.js");
const { getActiveFloor, getProficiencyMultiplier } = require("../floor/activeFloor.js");
const { formatText, getText } = require("../textManager.js");
const { isNpcOnExpedition } = require("../expedition/expedition.js");

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
      return { error: getText("ADVENTURE.NO_WEAPON") };
    }

    // cmd[2] = weaponId, cmd[3] = npcId
    if (cmd[2] === undefined) {
      cmd[2] = 0;
    }

    if (!user.weaponStock[cmd[2]]) {
      return { error: formatText("ADVENTURE.WEAPON_NOT_FOUND", { index: cmd[2] }) };
    }

    // 必須提供 NPC
    const npcId = cmd[3];
    if (!npcId) {
      return { error: getText("ADVENTURE.NPC_REQUIRED") };
    }

    const hired = user.hiredNpcs || [];
    const hiredNpc = hired.find((n) => n.npcId === npcId);
    if (!hiredNpc) {
      return { error: getText("ADVENTURE.NPC_NOT_FOUND") };
    }

    // 體力檢查
    const effectiveStats = getEffectiveStats(hiredNpc);
    if (!effectiveStats) {
      return { error: formatText("ADVENTURE.NPC_LOW_CONDITION", { npcName: hiredNpc.name }) };
    }

    // 任務/遠征互斥鎖
    if (hiredNpc.mission) {
      return { error: formatText("ADVENTURE.NPC_ON_MISSION", { npcName: hiredNpc.name }) };
    }
    if (isNpcOnExpedition(user, hiredNpc.npcId)) {
      return { error: formatText("EXPEDITION.NPC_ON_EXPEDITION", { npcName: hiredNpc.name }) };
    }

    const thisWeapon = user.weaponStock[cmd[2]];
    const currentFloor = getActiveFloor(user);

    // Season 6: 委託費改為勝利時從獎勵扣 10%，不再預先扣費
    // 負債時獎勵減半
    const penalties = enforceDebtPenalties(user);

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
    // 構建 NPC 技能上下文
    const npcSkills = getNpcEffectiveSkills(hiredNpc, thisWeapon);
    const weaponType = resolveWeaponType(thisWeapon);
    const npcProf = hiredNpc.weaponProficiency || 0;
    const skillCtx = npcSkills.length > 0
      ? buildSkillContext(npcSkills, npcProf, weaponType)
      : null;

    const battleResult = await pveBattleWithSkills(thisWeapon, npcForBattle, eneNameList, floorData.enemies, titleMods, skillCtx);

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

    // 武器耐久損耗
    const durabilityText = await applyWeaponDurability(user.userId, cmd[2], outcomeKey, title, thisWeapon);

    // NPC 體力損耗 + 死亡判斷 + 升級
    const expGain = NPC_EXP_GAIN[outcomeKey] || 10;
    const npcResult = await resolveNpcBattle(user.userId, npcId, outcomeKey, expGain, title);

    let npcEventText = "";
    let npcDeathEvent = null;
    if (npcResult.died) {
      npcEventText = "\n\n" + formatText("ADVENTURE.NPC_DEATH", { npcName: hiredNpc.name });
      npcDeathEvent = {
        npcName: hiredNpc.name,
        npcQuality: hiredNpc.quality,
        smithName: user.name,
        floor: currentFloor,
      };
      await increment(user.userId, "npcDeaths");
    } else if (npcResult.levelUp) {
      npcEventText = "\n\n" + formatText("ADVENTURE.NPC_LEVEL_UP", { npcName: hiredNpc.name, level: npcResult.newLevel });
    } else if (npcResult.newCondition !== undefined) {
      npcEventText = "\n" + formatText("ADVENTURE.NPC_CONDITION", { npcName: hiredNpc.name, condition: npcResult.newCondition });
    }

    // 冒險等級經驗
    const advExpMap = { WIN: config.ADV_LEVEL.EXP_ADV_WIN, DRAW: config.ADV_LEVEL.EXP_ADV_DRAW, LOSE: config.ADV_LEVEL.EXP_ADV_LOSE };
    const advExpResult = await awardAdvExp(user.userId, advExpMap[outcomeKey] || 3);
    if (advExpResult.levelUp) {
      npcEventText += "\n\n" + formatText("ADVENTURE.ADV_LEVEL_UP", { level: advExpResult.newLevel });
    }

    // 獎勵
    let rewardText = "";
    let colEarned = 0;
    let colSpentFee = 0;
    if (battleResult.win === 1) {
      const winString = `${battleResult.category}Win`;
      const mineResultText = await mineBattle(user, battleResult.category, currentFloor);
      rewardText = "\n\n" + getText("ADVENTURE.LOOT_HEADER") + "\n" + mineResultText;
      await db.update("user", { userId: user.userId }, { $inc: { [winString]: 1 } });

      const advColMod = getModifier(title, "advColReward");
      let colReward = Math.round((config.COL_ADVENTURE_REWARD[battleResult.category] || 50) * advColMod);
      // 負債時獎勵減半
      colReward = Math.floor(colReward * penalties.advRewardMult);

      // Season 6: 從獎勵扣 10% 委託費
      const feeRate = config.COL_ADVENTURE_FEE_RATE || 0.10;
      const fee = Math.floor(colReward * feeRate);
      const netReward = colReward - fee;
      colSpentFee = fee;
      colEarned = netReward;
      await awardCol(user.userId, netReward);
      rewardText += formatText("ADVENTURE.COL_REWARD", { total: colReward, fee, net: netReward });
      if (penalties.advRewardMult < 1) {
        rewardText += getText("ADVENTURE.DEBT_PENALTY");
      }
      rewardText += "\n";

      if (battleResult.category === "[優樹]") {
        await increment(user.userId, "yukiDefeats");
      }
    } else if (battleResult.dead === 1) {
      await db.update("user", { userId: user.userId }, { $inc: { lost: 1 } });
    }

    // 丟棄池撿拾：NPC 冒險途中可能撿到其他玩家丟棄的物品
    const recoveryChance = config.DISCARD.RECOVERY_CHANCE[outcomeKey] || 0;
    if (recoveryChance > 0 && roll.d100Check(recoveryChance)) {
      const adventureLevel = user.adventureLevel || 1;
      const maxRecovery = Math.floor(adventureLevel * roll.d6());
      const recoveryResult = await recoverFromDiscardPool(user.userId, maxRecovery);
      if (recoveryResult.recoveredText) {
        rewardText += `\n${recoveryResult.recoveredText}`;
      }
    }

    // 更新探索進度
    await incrementFloorExploration(user.userId, user, currentFloor);

    // NPC 熟練度 + 自動學技（死亡時跳過，避免寫入已 $pull 的舊索引產生幽靈元素）
    let skillText = "";
    if (!npcResult.died) {
      const profMult = getProficiencyMultiplier(user);
      const profGainKey = getProfGainKey(outcomeKey, "adv");
      const npcIdx = hired.findIndex((n) => n.npcId === npcId);
      if (npcIdx >= 0) {
        await awardNpcProficiency(user.userId, npcIdx, thisWeapon, profGainKey, profMult);
      }

      const npcLearnResult = await tryNpcLearnSkill(user.userId, npcIdx, hiredNpc, thisWeapon);
      if (npcLearnResult && npcLearnResult.learned) {
        skillText += "\n" + formatText("ADVENTURE.NPC_LEARN_SKILL", { npcName: hiredNpc.name, skillName: npcLearnResult.skillName });
      }
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
      reward: rewardText + npcEventText + skillText,
      skillEvents: battleResult.skillEvents || [],
      colEarned,
      colSpent: colSpentFee,
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
        ? [{ event: E.NPC_DEATH, data: npcDeathEvent }]
        : [],
    };
  } catch (error) {
    console.error("在執行 move adv 時發生嚴重錯誤:", error);
    return { error: getText("ADVENTURE.UNKNOWN_ERROR") };
  }
};

// mineBattle 和 getFloorMineList 已提取到 ../loot/battleLoot.js
