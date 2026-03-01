const db = require("../../db.js");
const config = require("../config.js");
const E = require("../../socket/events.js");
const { getFloor } = require("./floorData.js");
const { initializeLc, getLcState } = require("../laughingCoffin/lcState.js");

async function advanceFloor(currentFloor, participants, mvp, lastAttacker, lastAttackDrop) {
  const nextFloor = currentFloor + 1;
  const clearedAt = new Date();
  const socketEvents = [];

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
        "bossStatus.copiedWeapons": [],
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

  // 解鎖全體玩家的下一層
  if (nextFloor <= 20) {
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
      event: E.FLOOR_UNLOCKED,
      data: {
        floorNumber: nextFloor,
        name: nextFloorData.name,
        nameCn: nextFloorData.nameCn,
      },
    });
  }

  // 微笑棺木公會啟動：攻略到指定樓層時
  if (nextFloor >= config.LAUGHING_COFFIN_GUILD.ACTIVATION_FLOOR) {
    const lcState = await getLcState();
    if (!lcState) {
      await initializeLc(nextFloor);
      socketEvents.push({
        event: E.LC_GUILD_ACTIVATED,
        data: { floor: nextFloor },
      });
    }
  }

  return { nextFloor, clearedAt, socketEvents };
}

module.exports = { advanceFloor };
