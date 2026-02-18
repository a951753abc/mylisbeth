const _ = require("lodash");
const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getFloor, getFloorBoss } = require("./floorData.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");

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
      },
      floorHistory: [],
    };
    await db.insertOne("server_state", state);
  }
  return state;
}

async function resetBoss(floorNumber, bossData) {
  const now = new Date();
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
      },
    },
  );
}

module.exports = async function bossAttack(cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);
    const weaponIdx = cmd[2] !== undefined ? parseInt(cmd[2], 10) : 0;

    if (!user.weaponStock || !user.weaponStock[weaponIdx]) {
      return { error: `錯誤！武器 ${weaponIdx} 不存在` };
    }

    const currentFloor = user.currentFloor || 1;
    const floorData = getFloor(currentFloor);
    const bossData = getFloorBoss(currentFloor);

    const floorProgress = _.get(user, `floorProgress.${currentFloor}`, { explored: 0, maxExplore: config.FLOOR_MAX_EXPLORE });
    if (floorProgress.explored < floorProgress.maxExplore) {
      const remaining = floorProgress.maxExplore - floorProgress.explored;
      return {
        error: `尚未完成迷宮探索！還需要探索 ${remaining} 次才能挑戰 Boss。`,
      };
    }

    let state = await getOrInitServerState(currentFloor, bossData);

    // 如果當前 Boss 不在本層，重置到本層
    if (state.bossStatus.floorNumber !== currentFloor) {
      await resetBoss(currentFloor, bossData);
      state = await db.findOne("server_state", { _id: "aincrad" });
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
            "bossStatus.totalHp": bossData.hp,
            "bossStatus.startedAt": now,
            "bossStatus.expiresAt": expiresAt,
          },
        },
      );
    }

    const weapon = user.weaponStock[weaponIdx];
    const damage = calcDamage(weapon.atk, weapon.cri, bossData.def);

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

    await increment(user.userId, "totalBossAttacks");

    const socketEvents = [
      {
        event: "boss:damage",
        data: {
          player: user.name,
          damage,
          bossHpRemaining: remainingHp,
          bossHpTotal: totalHp,
          floorNumber: currentFloor,
          bossName: bossData.name,
        },
      },
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
        const finalState = await db.findOne("server_state", { _id: "aincrad" });
        const participants = finalState.bossStatus.participants || [];

        // 計算 MVP
        let mvp = null;
        let maxDamage = 0;
        for (const p of participants) {
          if (p.damage > maxDamage) {
            maxDamage = p.damage;
            mvp = p;
          }
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
            },
            $push: {
              floorHistory: {
                floorNumber: currentFloor,
                clearedAt,
                mvp: mvp ? { userId: mvp.userId, name: mvp.name, damage: mvp.damage } : null,
              },
            },
          },
        );

        // 解鎖全體玩家的下一層
        if (nextFloor <= 10) {
          const nextFloorData = getFloor(nextFloor);
          await db.update(
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
            event: "boss:defeated",
            data: {
              floorNumber: currentFloor,
              bossName: bossData.name,
              mvp: mvp ? { name: mvp.name, damage: mvp.damage } : null,
              participants: participants.map((p) => ({ name: p.name, damage: p.damage })),
            },
          });

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
          socketEvents,
        };
      }
    }

    return {
      success: true,
      damage,
      bossDefeated: false,
      bossHpRemaining: remainingHp,
      bossHpTotal: totalHp,
      floorNumber: currentFloor,
      bossName: bossData.name,
      socketEvents,
    };
  } catch (err) {
    console.error("Boss 攻擊發生錯誤:", err);
    return { error: "Boss 攻擊過程中發生未知錯誤，請稍後再試。" };
  }
};
