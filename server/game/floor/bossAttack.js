const _ = require("lodash");
const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getFloor, getFloorBoss } = require("./floorData.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getEffectiveStats, getCombinedBattleStats } = require("../npc/npcStats.js");
const { resolveNpcBattle } = require("../npc/npcManager.js");
const { getCombinedModifier } = require("../title/titleModifier.js");
const bossCounterAttack = require("./bossCounterAttack.js");

function calcDamage(atk, cri, def) {
  let atkDam = 0;
  for (let i = 0; i < atk; i++) {
    atkDam += roll.d66();
  }
  let defSum = 0;
  for (let i = 0; i < def; i++) {
    defSum += roll.d66();
  }
  while (roll.d66() >= cri) {
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
        event: "boss:phase",
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

async function distributeBossDrops(drops, participants, mvpUserId, totalDamage) {
  if (!drops?.length) return [];
  const results = [];
  for (const p of participants) {
    const isMvp = p.userId === mvpUserId;
    const ratio = totalDamage > 0 ? p.damage / totalDamage : 0;
    const chance = isMvp ? 100 : Math.min(90, Math.round(ratio * 200));
    if (roll.d100Check(chance)) {
      const drop = drops[Math.floor(Math.random() * drops.length)];
      const itemId = `boss_drop_${drop.name}`;
      const itemLevel = drop.rarity || 1;
      await db.atomicIncItem(p.userId, itemId, itemLevel, drop.name, 1);
      results.push({ userId: p.userId, playerName: p.name,
                     itemName: drop.name, itemLevel, isMvp });
    }
  }
  return results;
}

module.exports = async function bossAttack(cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);
    const weaponIdx = cmd[2] !== undefined ? parseInt(cmd[2], 10) : 0;

    if (!user.weaponStock || !user.weaponStock[weaponIdx]) {
      return { error: `錯誤！武器 ${weaponIdx} 不存在` };
    }

    // 必須提供 NPC
    const npcId = cmd[3];
    if (!npcId) {
      return { error: "Boss 戰必須選擇一位已雇用的 NPC 冒險者！" };
    }

    const hired = user.hiredNpcs || [];
    const hiredNpc = hired.find((n) => n.npcId === npcId);
    if (!hiredNpc) {
      return { error: "找不到該 NPC，請確認已雇用該冒險者。" };
    }

    // NPC 體力檢查
    const effectiveStats = getEffectiveStats(hiredNpc);
    if (!effectiveStats) {
      return { error: `${hiredNpc.name} 體力過低（< 10%），無法出戰！請先治療。` };
    }

    // Boss 是全伺服器共享的，使用伺服器前線樓層
    let state = await getOrInitServerState(1, getFloorBoss(1));
    const currentFloor = state.currentFloor || 1;
    const floorData = getFloor(currentFloor);
    const bossData = getFloorBoss(currentFloor);

    // 玩家樓層落後前線 → 自動同步到前線
    const userFloor = user.currentFloor || 1;
    if (userFloor < currentFloor) {
      await db.update(
        "user",
        { userId: user.userId },
        {
          $set: {
            currentFloor,
            [`floorProgress.${currentFloor}`]: { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE },
          },
        },
      );
      user.currentFloor = currentFloor;
      _.set(user, `floorProgress.${currentFloor}`, { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE });
    }

    const floorProgress = _.get(user, `floorProgress.${currentFloor}`, { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE });
    if (floorProgress.explored < floorProgress.maxExplore) {
      const remaining = floorProgress.maxExplore - floorProgress.explored;
      return {
        error: `尚未完成迷宮探索！還需要探索 ${remaining} 次才能挑戰 Boss。`,
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
          error: "Boss 挑戰時間已超過 72 小時，Boss 已重置！請重新挑戰。",
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
    const effectiveBossDef = getEffectiveBossDef(bossData, activatedPhases);
    const damage = Math.max(1, Math.round(calcDamage(combined.atk, combined.cri, effectiveBossDef) * bossDamageMod));

    // 原子減少 Boss HP
    const updatedState = await db.findOneAndUpdate(
      "server_state",
      { _id: "aincrad", "bossStatus.active": true },
      { $inc: { "bossStatus.currentHp": -damage } },
      { returnDocument: "after" },
    );

    if (!updatedState) {
      return { error: "Boss 狀態異常，請重試。" };
    }

    const remainingHp = Math.max(0, updatedState.bossStatus.currentHp);
    const totalHp = updatedState.bossStatus.totalHp;

    // 更新參與者傷害記錄
    const existingParticipant = updatedState.bossStatus.participants?.find(
      (p) => p.userId === user.userId,
    );
    if (existingParticipant) {
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

    // Boss 反擊計算
    const bossAtkBoost = getEffectiveBossAtk(bossData, [...activatedPhases, ...phaseCheck.newPhases]);
    const counterResult = bossCounterAttack({ bossData, bossAtkBoost, combined });

    // NPC 戰鬥結算（以反擊結果取代固定 WIN）
    const npcResult = await resolveNpcBattle(user.userId, npcId, counterResult.outcome, BOSS_NPC_EXP_GAIN, user.title || null, bossAtkBoost);

    // npcEventText 只放次要事件（升級），反擊結果由 counterAttack 結構化物件傳遞
    let npcEventText = "";
    if (npcResult.levelUp) {
      npcEventText = `${hiredNpc.name} 升級了！LV ${npcResult.newLevel}`;
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
        event: "boss:damage",
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
        // 使用 clearResult（returnDocument: "before"）的 participants，避免額外查詢和資料過時
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

        // Last Attacker = 當前攻擊者（打出致命一擊的玩家）
        const lastAttacker = { userId: user.userId, name: user.name };

        // LA 聖遺物獎勵
        let lastAttackDrop = null;
        let lastAttackAlreadyOwned = false;
        if (bossData.lastAttackDrop) {
          const relicDef = bossData.lastAttackDrop;
          const existingRelics = user.bossRelics || [];
          const alreadyHas = existingRelics.some((r) => r.id === relicDef.id);

          if (!alreadyHas) {
            const relicObj = {
              id: relicDef.id,
              name: relicDef.name,
              nameCn: relicDef.nameCn,
              bossFloor: relicDef.bossFloor,
              effects: { ...relicDef.effects },
              obtainedAt: new Date(),
            };
            await db.update(
              "user",
              { userId: user.userId },
              { $push: { bossRelics: relicObj } },
            );
            lastAttackDrop = relicObj;
          } else {
            lastAttackAlreadyOwned = true;
          }

          // LA Col 獎勵（每次 Last Attack 都給予）
          await awardCol(user.userId, config.COL_BOSS_LA_BONUS);

          // 追蹤 LA 次數
          await db.update(
            "user",
            { userId: user.userId },
            { $inc: { "bossContribution.lastAttackCount": 1 } },
          );
        }

        // 給獎勵：按傷害比例計算 Col
        const totalDamage = participants.reduce((sum, p) => sum + p.damage, 0);
        for (const p of participants) {
          const ratio = totalDamage > 0 ? p.damage / totalDamage : 0;
          const colReward = Math.round(200 + ratio * 800);
          const isMvp = mvp && p.userId === mvp.userId;
          const mvpBonus = isMvp ? config.COL_BOSS_MVP_BONUS : 0;

          await awardCol(p.userId, colReward + mvpBonus);
          await db.update(
            "user",
            { userId: p.userId },
            {
              $inc: {
                "bossContribution.totalDamage": p.damage,
                "bossContribution.bossesDefeated": 1,
                ...(isMvp ? { "bossContribution.mvpCount": 1 } : {}),
              },
            },
          );
          await checkAndAward(p.userId);
        }

        const dropResults = await distributeBossDrops(
          bossData.drops || [], participants, mvp?.userId, totalDamage,
        );

        const nextFloor = currentFloor + 1;
        const clearedAt = new Date();

        await db.update(
          "server_state",
          { _id: "aincrad" },
          {
            $set: {
              currentFloor: nextFloor,
              "bossStatus.floorNumber": nextFloor,
              "bossStatus.currentHp": 0,
              "bossStatus.totalHp": 0,
              "bossStatus.participants": [],
              "bossStatus.startedAt": null,
              "bossStatus.expiresAt": null,
              "bossStatus.activatedPhases": [],
              "bossStatus.currentWeapon": null,
            },
            $push: {
              floorHistory: {
                floorNumber: currentFloor,
                clearedAt,
                mvp: mvp ? { userId: mvp.userId, name: mvp.name, damage: mvp.damage } : null,
                lastAttacker: { userId: lastAttacker.userId, name: lastAttacker.name },
                lastAttackDrop: lastAttackDrop ? { id: lastAttackDrop.id, name: lastAttackDrop.name, nameCn: lastAttackDrop.nameCn } : null,
              },
            },
          },
        );

        // Boss 擊敗廣播（所有樓層都廣播）
        socketEvents.push({
          event: "boss:defeated",
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

        // 解鎖全體玩家的下一層
        if (nextFloor <= 10) {
          const nextFloorData = getFloor(nextFloor);
          await db.updateMany(
            "user",
            { currentFloor: currentFloor },
            {
              $set: {
                currentFloor: nextFloor,
                [`floorProgress.${nextFloor}`]: {
                  explored: 0,
                  maxExplore: config.FLOOR_MAX_EXPLORE,
                },
              },
            },
          );

          socketEvents.push({
            event: "floor:unlocked",
            data: {
              floorNumber: nextFloor,
              name: nextFloorData.name,
              nameCn: nextFloorData.nameCn,
            },
          });
        }

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
          npcResult: {
            survived: !npcResult.died,
            died: !!npcResult.died,
            levelUp: !!npcResult.levelUp,
            newCondition: npcResult.newCondition,
            newLevel: npcResult.newLevel,
          },
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
        npcResult: {
          survived: npcResult.survived !== false,
          died: !!npcResult.died,
          levelUp: !!npcResult.levelUp,
          newCondition: npcResult.newCondition,
          newLevel: npcResult.newLevel,
        },
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
      npcResult: {
        survived: npcResult.survived !== false,
        died: !!npcResult.died,
        levelUp: !!npcResult.levelUp,
        newCondition: npcResult.newCondition,
        newLevel: npcResult.newLevel,
      },
      socketEvents,
    };
  } catch (err) {
    console.error("Boss 攻擊發生錯誤:", err);
    return { error: "Boss 攻擊過程中發生未知錯誤，請稍後再試。" };
  }
};
