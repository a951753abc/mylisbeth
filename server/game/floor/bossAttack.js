const db = require("../../db.js");
const config = require("../config.js");
const E = require("../../socket/events.js");
const { getFloor, getFloorBoss } = require("./floorData.js");
const { increment } = require("../progression/statsTracker.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getEffectiveStats } = require("../npc/npcStats.js");
const { resolveNpcBattle } = require("../npc/npcManager.js");
const { getCombinedModifier, getModifier } = require("../title/titleModifier.js");
const { awardAdvExp } = require("../progression/adventureLevel.js");
const { awardProficiency, awardNpcProficiency, getProfGainKey } = require("../skill/skillProficiency.js");
const { isAtFrontier, getProficiencyMultiplier } = require("./activeFloor.js");
const { distributeBossDrops, processLastAttackRelic, distributeBossColRewards } = require("./bossRewards.js");
const { advanceFloor } = require("./floorAdvancement.js");
const { formatText, getText } = require("../textManager.js");
const { bossBattleWithSkills } = require("../battle.js");
const { getNpcEffectiveSkills } = require("../skill/skillSlot.js");
const { buildSkillContext } = require("../skill/skillCombat.js");
const { resolveWeaponType } = require("../weapon/weaponType.js");
const { tryNpcLearnSkill } = require("../skill/npcSkillLearning.js");
const { isNpcOnExpedition } = require("../expedition/expedition.js");

async function getOrInitServerState(floorNumber, bossData) {
  let state = await db.findOne("server_state", { _id: "aincrad" });
  if (!state) {
    state = {
      _id: "aincrad",
      currentFloor: 1,
      bossStatus: {
        floorNumber: 1,
        active: false,
        currentHp: bossData.hp,
        totalHp: bossData.hp,
        participants: [],
        startedAt: null,
        expiresAt: null,
        currentWeapon: null,
      },
      floorHistory: [],
    };
    await db.insertOne("server_state", state);
  }
  return state;
}

async function resetBoss(floorNumber, bossData) {
  await db.update(
    "server_state",
    { _id: "aincrad" },
    {
      $set: {
        "bossStatus.currentHp": bossData.hp,
        "bossStatus.totalHp": bossData.hp,
        "bossStatus.active": false,
        "bossStatus.participants": [],
        "bossStatus.startedAt": null,
        "bossStatus.expiresAt": null,
        "bossStatus.activatedPhases": [],
        "bossStatus.currentWeapon": null,
      },
    },
  );
}

// Boss 戰 NPC 經驗值（比冒險略高，因為 Boss 戰更危險）
const BOSS_NPC_EXP_GAIN = 40;

function getEffectiveBossAtk(bossData, activatedPhases) {
  let totalAtkBoost = 0;
  for (const idx of activatedPhases) {
    const phase = bossData.phases?.[idx];
    if (phase) {
      totalAtkBoost += phase.atkBoost ?? 0;
    }
  }
  return totalAtkBoost;
}

function checkPhaseActivation(bossData, currentHp, totalHp, activatedPhases) {
  const phases = bossData.phases || [];
  const hpRatio = currentHp / totalHp;
  const newPhases = [];
  const phaseEvents = [];
  for (let i = 0; i < phases.length; i++) {
    if (activatedPhases.includes(i)) continue;
    if (hpRatio <= phases[i].hpThreshold) {
      newPhases.push(i);
      phaseEvents.push({
        event: E.BOSS_PHASE,
        data: {
          bossName: bossData.name,
          phaseIndex: i,
          specialMove: phases[i].specialMove,
          defBoost: phases[i].defBoost ?? phases[i].atkBoost ?? 0,
          atkBoost: phases[i].atkBoost ?? 0,
          weapon: phases[i].weapon || null,
          hpThreshold: phases[i].hpThreshold,
        },
      });
    }
  }
  return { newPhases, phaseEvents };
}

/** 取得最新啟動 phase 的武器（用於 currentWeapon 追蹤） */
function getLatestWeapon(bossData, activatedPhases, newPhases) {
  const allPhases = [...activatedPhases, ...newPhases].sort((a, b) => a - b);
  for (let i = allPhases.length - 1; i >= 0; i--) {
    const phase = bossData.phases?.[allPhases[i]];
    if (phase?.weapon) return phase.weapon;
  }
  return bossData.initialWeapon || null;
}

function buildNpcResultPayload(npcResult) {
  return {
    survived: !npcResult.died,
    died: !!npcResult.died,
    levelUp: !!npcResult.levelUp,
    newCondition: npcResult.newCondition,
    newLevel: npcResult.newLevel,
  };
}

module.exports = async function bossAttack(cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);
    const weaponIdx = cmd[2] !== undefined ? parseInt(cmd[2], 10) : 0;

    if (!user.weaponStock || !user.weaponStock[weaponIdx]) {
      return { error: formatText("BOSS.WEAPON_NOT_FOUND", { index: weaponIdx }) };
    }

    // 必須提供 NPC
    const npcId = cmd[3];
    if (!npcId) {
      return { error: getText("BOSS.NPC_REQUIRED") };
    }

    const hired = user.hiredNpcs || [];
    const hiredNpc = hired.find((n) => n.npcId === npcId);
    if (!hiredNpc) {
      return { error: getText("BOSS.NPC_NOT_FOUND") };
    }

    // NPC 體力檢查
    const effectiveStats = getEffectiveStats(hiredNpc);
    if (!effectiveStats) {
      return { error: formatText("BOSS.NPC_LOW_CONDITION", { npcName: hiredNpc.name }) };
    }

    // 任務/遠征互斥鎖
    if (hiredNpc.mission) {
      return { error: formatText("BOSS.NPC_ON_MISSION", { npcName: hiredNpc.name }) };
    }
    if (isNpcOnExpedition(user, npcId)) {
      return { error: formatText("EXPEDITION.NPC_ON_EXPEDITION", { npcName: hiredNpc.name }) };
    }

    // 必須在前線樓層才能挑戰 Boss
    if (!isAtFrontier(user)) {
      return { error: getText("BOSS.NOT_AT_FRONTIER") };
    }

    // Boss 是全伺服器共享的，使用伺服器前線樓層
    let state = await getOrInitServerState(1, getFloorBoss(1));
    const currentFloor = state.currentFloor || 1;
    const bossData = getFloorBoss(currentFloor);

    const floorProgress = (user.floorProgress || {})[String(currentFloor)] || { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE };
    if (floorProgress.explored < floorProgress.maxExplore) {
      const remaining = floorProgress.maxExplore - floorProgress.explored;
      return {
        error: formatText("BOSS.EXPLORE_REMAINING", { remaining }),
      };
    }

    const now = new Date();

    // 檢查 72 小時計時是否到期
    if (state.bossStatus.active && state.bossStatus.expiresAt) {
      const expiresAt = new Date(state.bossStatus.expiresAt);
      if (now > expiresAt) {
        await resetBoss(currentFloor, bossData);
        state = await db.findOne("server_state", { _id: "aincrad" });
        return {
          error: getText("BOSS.TIMEOUT_RESET"),
          bossReset: true,
        };
      }
    }

    // 激活 Boss (首次攻擊)
    if (!state.bossStatus.active) {
      const expiresAt = new Date(now.getTime() + config.BOSS_TIMEOUT_MS);
      await db.update(
        "server_state",
        { _id: "aincrad" },
        {
          $set: {
            "bossStatus.active": true,
            "bossStatus.floorNumber": currentFloor,
            "bossStatus.currentHp": bossData.hp,
            "bossStatus.totalHp": bossData.hp,
            "bossStatus.startedAt": now,
            "bossStatus.expiresAt": expiresAt,
            "bossStatus.activatedPhases": [],
            "bossStatus.currentWeapon": bossData.initialWeapon || null,
          },
        },
      );
    }

    const weapon = user.weaponStock[weaponIdx];
    const activatedPhases = state.bossStatus.activatedPhases || [];
    // 首次攻擊時 state.bossStatus.active 仍為 false（上方 db.update 沒有 re-fetch），用 bossData.hp
    const bossHpBefore = state.bossStatus.active
      ? state.bossStatus.currentHp
      : bossData.hp;

    // ── 5 回合循環戰鬥（與冒險一致） ──

    // 組裝 NPC（同 adv.js）
    const npcForBattle = {
      name: hiredNpc.name,
      hp: effectiveStats.hp,
      isHiredNpc: true,
      effectiveStats,
    };

    const title = user.title || null;
    const titleMods = {
      battleAtk: getModifier(title, "battleAtk"),
      battleDef: getModifier(title, "battleDef"),
      battleAgi: getModifier(title, "battleAgi"),
    };

    // NPC 劍技上下文
    const npcSkills = getNpcEffectiveSkills(hiredNpc, weapon);
    const weaponType = resolveWeaponType(weapon);
    const npcProf = hiredNpc.weaponProficiency || 0;
    const skillCtx = npcSkills.length > 0
      ? buildSkillContext(npcSkills, npcProf, weaponType)
      : null;

    // 執行 5 回合戰鬥（Boss HP 使用實際剩餘值）
    const battleResult = bossBattleWithSkills(
      weapon, npcForBattle, bossData, activatedPhases,
      Math.max(1, bossHpBefore), titleMods, skillCtx,
    );

    // 計算對 Boss 造成的傷害（不超過 Boss 剩餘 HP）
    const bossDamageMod = getCombinedModifier(title, user.bossRelics || [], "bossDamage");
    const rawDamage = Math.max(0, (battleResult.initialHp?.enemy || bossHpBefore) - Math.max(0, battleResult.finalHp?.enemy || 0));
    // NPC 完全沒打中 Boss 時不扣 HP（rawDamage=0）；有命中則至少 1
    const damage = rawDamage === 0 ? 0 : Math.max(1, Math.round(rawDamage * bossDamageMod));

    // 判斷戰鬥結果
    let outcomeKey;
    if (battleResult.dead === 1) outcomeKey = "LOSE";
    else if (battleResult.win === 1) outcomeKey = "WIN";
    else outcomeKey = "DRAW";

    // 體力損耗（比例制：依 NPC 受傷比計算）
    const { COND_MIN, COND_MAX, COND_PER_ATK_BOOST } = config.BOSS_COMBAT;
    const npcMaxHp = battleResult.initialHp?.npc || 1;
    const npcFinalHp = Math.max(0, battleResult.finalHp?.npc || 0);
    const damageRatio = Math.min(1, (npcMaxHp - npcFinalHp) / npcMaxHp);
    const bossAtkBoost = getEffectiveBossAtk(bossData, activatedPhases);
    const bossCondLoss = Math.round(COND_MIN + (COND_MAX - COND_MIN) * damageRatio)
      + bossAtkBoost * COND_PER_ATK_BOOST;

    const npcResult = await resolveNpcBattle(
      user.userId, npcId, outcomeKey, BOSS_NPC_EXP_GAIN, title, 0, bossCondLoss,
    );

    // ── 原子減少 Boss HP ──

    const updatedState = await db.findOneAndUpdate(
      "server_state",
      { _id: "aincrad", "bossStatus.active": true },
      { $inc: { "bossStatus.currentHp": -damage } },
      { returnDocument: "after" },
    );

    if (!updatedState) {
      return { error: getText("BOSS.STATE_ERROR") };
    }

    const remainingHp = Math.max(0, updatedState.bossStatus.currentHp);
    const totalHp = updatedState.bossStatus.totalHp;

    // 更新參與者傷害記錄
    const existingParticipant = updatedState.bossStatus.participants?.find(
      (p) => p.userId === user.userId,
    );
    const userCreatedAt = user.gameCreatedAt || null;

    // 檢查是否為重建帳號（同 userId 但 gameCreatedAt 不同 = 新角色）
    const isStaleEntry = existingParticipant &&
      userCreatedAt &&
      existingParticipant.gameCreatedAt !== userCreatedAt;

    if (isStaleEntry) {
      await db.update(
        "server_state",
        { _id: "aincrad" },
        { $pull: { "bossStatus.participants": { userId: user.userId } } },
      );
      await db.update(
        "server_state",
        { _id: "aincrad" },
        {
          $push: {
            "bossStatus.participants": {
              userId: user.userId,
              name: user.name,
              gameCreatedAt: userCreatedAt,
              damage,
              attacks: 1,
            },
          },
        },
      );
    } else if (existingParticipant) {
      await db.update(
        "server_state",
        { _id: "aincrad", "bossStatus.participants.userId": user.userId },
        {
          $inc: {
            "bossStatus.participants.$.damage": damage,
            "bossStatus.participants.$.attacks": 1,
          },
        },
      );
    } else {
      await db.update(
        "server_state",
        { _id: "aincrad" },
        {
          $push: {
            "bossStatus.participants": {
              userId: user.userId,
              name: user.name,
              gameCreatedAt: userCreatedAt,
              damage,
              attacks: 1,
            },
          },
        },
      );
    }

    // Phase 檢查：使用原子更新後的最新 activatedPhases，避免併發重複廣播
    const freshActivatedPhases = updatedState.bossStatus.activatedPhases || [];
    const phaseCheck = checkPhaseActivation(bossData, remainingHp, totalHp, freshActivatedPhases);
    if (phaseCheck.newPhases.length > 0) {
      const latestWeapon = getLatestWeapon(bossData, freshActivatedPhases, phaseCheck.newPhases);
      await db.update(
        "server_state",
        { _id: "aincrad" },
        {
          $addToSet: { "bossStatus.activatedPhases": { $each: phaseCheck.newPhases } },
          $set: { "bossStatus.currentWeapon": latestWeapon },
        },
      );
    }

    await increment(user.userId, "totalBossAttacks");

    // 發放武器熟練度（Boss 戰）
    const profMult = getProficiencyMultiplier(user);
    const profGainKey = getProfGainKey(outcomeKey, "boss");
    await awardProficiency(user.userId, weapon, "BOSS");
    const bossNpcIdx = hired.findIndex((n) => n.npcId === npcId);
    if (bossNpcIdx >= 0) {
      await awardNpcProficiency(user.userId, bossNpcIdx, weapon, profGainKey, profMult);
    }

    // 冒險等級經驗
    const advExpResult = await awardAdvExp(user.userId, config.ADV_LEVEL.EXP_BOSS_ATTACK);

    // NPC 自動學技（死亡時跳過）
    let skillText = "";
    if (!npcResult.died && bossNpcIdx >= 0) {
      const npcLearnResult = await tryNpcLearnSkill(user.userId, bossNpcIdx, hiredNpc, weapon);
      if (npcLearnResult && npcLearnResult.learned) {
        skillText = formatText("ADVENTURE.NPC_LEARN_SKILL", { npcName: hiredNpc.name, skillName: npcLearnResult.skillName });
      }
    }

    // npcEventText
    let npcEventText = "";
    if (npcResult.levelUp) {
      npcEventText = formatText("BOSS.NPC_LEVEL_UP", { npcName: hiredNpc.name, level: npcResult.newLevel });
    }
    if (advExpResult.levelUp) {
      npcEventText += `${npcEventText ? "\n" : ""}${formatText("BOSS.ADV_LEVEL_UP", { level: advExpResult.newLevel })}`;
    }
    if (skillText) {
      npcEventText += `${npcEventText ? "\n" : ""}${skillText}`;
    }

    const condBefore = npcResult.condBefore ?? (hiredNpc.condition ?? 100);
    const condAfter = npcResult.died ? null : (npcResult.newCondition ?? condBefore);

    // 戰鬥日誌（不洩漏 Boss 精確 HP 到前端 log 中，只傳 NPC 相關資料）
    const battleLog = {
      win: battleResult.win,
      dead: battleResult.dead,
      npcName: battleResult.npcName,
      enemyName: battleResult.enemyName,
      log: battleResult.log,
      initialHp: { npc: battleResult.initialHp?.npc || 0 },
      finalHp: { npc: Math.max(0, battleResult.finalHp?.npc || 0) },
      specialMechanics: battleResult.specialMechanics || [],
    };

    // 戰鬥摘要（給 socket 廣播用）
    const battleSummary = {
      rounds: (battleResult.log || []).filter((e) => e.type === "round").length,
      npcDamageRatio: damageRatio,
      npcDied: !!npcResult.died,
      skillsUsed: (battleResult.skillEvents || []).length,
    };

    const socketEvents = [
      {
        event: E.BOSS_DAMAGE,
        data: {
          player: user.name,
          npcName: hiredNpc.name,
          damage,
          bossHpRemaining: remainingHp,
          bossHpTotal: totalHp,
          floorNumber: currentFloor,
          bossName: bossData.name,
          battleSummary,
        },
      },
      ...phaseCheck.phaseEvents,
    ];

    // Boss 被打倒
    if (remainingHp <= 0) {
      const clearResult = await db.findOneAndUpdate(
        "server_state",
        { _id: "aincrad", "bossStatus.active": true, "bossStatus.currentHp": { $lte: 0 } },
        { $set: { "bossStatus.active": false } },
        { returnDocument: "before" },
      );

      if (clearResult && clearResult.bossStatus.active) {
        const participants = clearResult.bossStatus.participants || [];

        // 計算 MVP
        let mvp = null;
        let maxDamage = 0;
        for (const p of participants) {
          if (p.damage > maxDamage) {
            maxDamage = p.damage;
            mvp = p;
          }
        }

        // Last Attacker = 當前攻擊者
        const lastAttacker = { userId: user.userId, name: user.name };

        // LA 聖遺物獎勵
        const { lastAttackDrop, lastAttackAlreadyOwned } = await processLastAttackRelic(user, bossData);

        // 按傷害比例計算 Col 獎勵
        const totalDamage = participants.reduce((sum, p) => sum + p.damage, 0);
        await distributeBossColRewards(participants, mvp, totalDamage);

        const dropResults = await distributeBossDrops(
          bossData.drops || [], participants, mvp?.userId, totalDamage,
        );

        // 推進樓層
        const advancement = await advanceFloor(currentFloor, participants, mvp, lastAttacker, lastAttackDrop);

        // Boss 擊敗廣播
        socketEvents.push({
          event: E.BOSS_DEFEATED,
          data: {
            floorNumber: currentFloor,
            bossName: bossData.name,
            mvp: mvp ? { name: mvp.name, damage: mvp.damage } : null,
            participants: participants.map((p) => ({ name: p.name, damage: p.damage })),
            drops: dropResults,
            lastAttacker: { name: lastAttacker.name },
            lastAttackDrop: lastAttackDrop ? {
              name: lastAttackDrop.name,
              nameCn: lastAttackDrop.nameCn,
              effects: lastAttackDrop.effects,
            } : null,
            lastAttackAlreadyOwned: lastAttackAlreadyOwned || false,
            laColBonus: bossData.lastAttackDrop ? config.COL_BOSS_LA_BONUS : 0,
          },
        });

        socketEvents.push(...advancement.socketEvents);

        return {
          success: true,
          damage,
          bossDefeated: true,
          floorNumber: currentFloor,
          bossName: bossData.name,
          mvp: mvp ? { name: mvp.name, damage: mvp.damage } : null,
          drops: dropResults,
          lastAttacker: { name: lastAttacker.name },
          lastAttackDrop: lastAttackDrop ? {
            name: lastAttackDrop.name,
            nameCn: lastAttackDrop.nameCn,
            effects: lastAttackDrop.effects,
          } : null,
          lastAttackAlreadyOwned: lastAttackAlreadyOwned || false,
          laColBonus: bossData.lastAttackDrop ? config.COL_BOSS_LA_BONUS : 0,
          npcName: hiredNpc.name,
          npcEventText,
          battleLog,
          skillEvents: battleResult.skillEvents || [],
          condBefore,
          condAfter,
          npcResult: buildNpcResultPayload(npcResult),
          socketEvents,
        };
      }

      // Race condition: Boss 已被另一個請求處理完畢
      return {
        success: true,
        damage,
        bossDefeated: true,
        bossAlreadyProcessed: true,
        floorNumber: currentFloor,
        bossName: bossData.name,
        npcName: hiredNpc.name,
        npcEventText,
        battleLog,
        skillEvents: battleResult.skillEvents || [],
        condBefore,
        condAfter,
        npcResult: buildNpcResultPayload(npcResult),
        socketEvents,
      };
    }

    return {
      success: true,
      damage,
      bossDefeated: false,
      bossHpRemaining: remainingHp,
      bossHpTotal: totalHp,
      floorNumber: currentFloor,
      bossName: bossData.name,
      npcName: hiredNpc.name,
      npcEventText,
      battleLog,
      skillEvents: battleResult.skillEvents || [],
      condBefore,
      condAfter,
      npcResult: buildNpcResultPayload(npcResult),
      socketEvents,
    };
  } catch (err) {
    console.error("Boss 攻擊發生錯誤:", err);
    return { error: getText("BOSS.UNKNOWN_ERROR") };
  }
};
