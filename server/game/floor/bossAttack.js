const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const E = require("../../socket/events.js");
const { getFloor, getFloorBoss } = require("./floorData.js");
const { increment } = require("../progression/statsTracker.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getEffectiveStats, getCombinedBattleStats } = require("../npc/npcStats.js");
const { resolveNpcBattle } = require("../npc/npcManager.js");
const { getCombinedModifier } = require("../title/titleModifier.js");
const bossCounterAttack = require("./bossCounterAttack.js");
const { awardAdvExp } = require("../progression/adventureLevel.js");
const { awardProficiency, awardNpcProficiency } = require("../skill/skillProficiency.js");
const { isAtFrontier } = require("./activeFloor.js");
const { distributeBossDrops, processLastAttackRelic, distributeBossColRewards } = require("./bossRewards.js");
const { advanceFloor } = require("./floorAdvancement.js");
const { buildInnateContext } = require("../battle/innateEffectCombat.js");
const { formatText, getText } = require("../textManager.js");

function calcDamage(atk, cri, def) {
  let atkDam = 0;
  for (let i = 0; i < atk; i++) {
    atkDam += roll.d66();
  }
  let defSum = 0;
  for (let i = 0; i < def; i++) {
    defSum += roll.d66();
  }
  const MAX_CRIT_ROUNDS = 999;
  for (let c = 0; c < MAX_CRIT_ROUNDS && roll.d66() >= cri; c++) {
    atkDam += roll.d66();
  }
  const final = Math.max(1, atkDam - defSum);
  return final;
}

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

function getEffectiveBossDef(bossData, activatedPhases) {
  let def = bossData.def;
  for (const idx of activatedPhases) {
    const phase = bossData.phases?.[idx];
    if (phase) {
      // 向後兼容：新版用 defBoost，舊版用 atkBoost
      def += phase.defBoost ?? phase.atkBoost ?? 0;
    }
  }
  return def;
}

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

    // 使用 NPC + 武器合成數值計算傷害（套用 bossDamage 稱號+聖遺物修正 + Phase 防禦加成）
    const combined = getCombinedBattleStats(effectiveStats, weapon);
    const bossDamageMod = getCombinedModifier(user.title || null, user.bossRelics || [], "bossDamage");
    const activatedPhases = state.bossStatus.activatedPhases || [];

    // 固有效果：套用被動 stat boost + 攻擊效果
    const innateCtx = buildInnateContext(combined.innateEffects);
    combined.atk += innateCtx.atkBoost;
    combined.def += innateCtx.defBoost;
    combined.agi += innateCtx.agiBoost;
    if (innateCtx.criBoost > 0) {
      combined.cri = Math.max(5, combined.cri - innateCtx.criBoost);
    }

    // 固有效果：破甲 — 降低 Boss 有效防禦
    let effectiveBossDef = getEffectiveBossDef(bossData, activatedPhases);
    if (innateCtx.ignoreDef > 0) {
      effectiveBossDef = Math.max(0, Math.floor(effectiveBossDef * (1 - innateCtx.ignoreDef)));
    }

    let damage = Math.max(1, Math.round(calcDamage(combined.atk, combined.cri, effectiveBossDef) * bossDamageMod));

    // 固有效果：傷害倍率
    if (innateCtx.damageMult !== 1.0) {
      damage = Math.max(1, Math.floor(damage * innateCtx.damageMult));
    }

    // 原子減少 Boss HP
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
      // 移除舊角色的參與記錄，視為新參與者
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

    // Phase 檢查：HP% 降到閾值以下時啟動新 phase
    const phaseCheck = checkPhaseActivation(bossData, remainingHp, totalHp, activatedPhases);
    if (phaseCheck.newPhases.length > 0) {
      const latestWeapon = getLatestWeapon(bossData, activatedPhases, phaseCheck.newPhases);
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
    await awardProficiency(user.userId, weapon, "BOSS");
    const bossNpcIdx = (user.hiredNpcs || []).findIndex((n) => n.npcId === npcId);
    if (bossNpcIdx >= 0) {
      await awardNpcProficiency(user.userId, bossNpcIdx, weapon, "BOSS");
    }

    // 冒險等級經驗
    const advExpResult = await awardAdvExp(user.userId, config.ADV_LEVEL.EXP_BOSS_ATTACK);

    // Boss 反擊計算
    const bossAtkBoost = getEffectiveBossAtk(bossData, [...activatedPhases, ...phaseCheck.newPhases]);
    const counterResult = bossCounterAttack({ bossData, bossAtkBoost, combined });

    // NPC 戰鬥結算（以反擊結果取代固定 WIN）
    const npcResult = await resolveNpcBattle(user.userId, npcId, counterResult.outcome, BOSS_NPC_EXP_GAIN, user.title || null, bossAtkBoost);

    // npcEventText 只放次要事件（升級），反擊結果由 counterAttack 結構化物件傳遞
    let npcEventText = "";
    if (npcResult.levelUp) {
      npcEventText = formatText("BOSS.NPC_LEVEL_UP", { npcName: hiredNpc.name, level: npcResult.newLevel });
    }
    if (advExpResult.levelUp) {
      npcEventText += `${npcEventText ? "\n" : ""}${formatText("BOSS.ADV_LEVEL_UP", { level: advExpResult.newLevel })}`;
    }

    const counterAttackData = {
      hit: counterResult.hit,
      dodged: counterResult.dodged,
      counterDamage: counterResult.counterDamage,
      outcome: counterResult.outcome,
      isCrit: counterResult.isCrit,
      npcDied: !!npcResult.died,
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
          counterAttack: counterAttackData,
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
          counterAttack: counterAttackData,
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
        counterAttack: counterAttackData,
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
      counterAttack: counterAttackData,
      npcResult: buildNpcResultPayload(npcResult),
      socketEvents,
    };
  } catch (err) {
    console.error("Boss 攻擊發生錯誤:", err);
    return { error: getText("BOSS.UNKNOWN_ERROR") };
  }
};
