const _ = require("lodash");
const db = require("../../db.js");
const { pvpBattle } = require("../battle.js");
const { awardCol } = require("../economy/col.js");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");

module.exports = async function (cmd, rawAttacker) {
  const attacker = await ensureUserFields(rawAttacker);

  const defenderName = cmd[2];
  const weaponId = cmd[3];

  if (!defenderName) {
    return { error: "請輸入你要挑戰的玩家角色名稱。" };
  }
  if (attacker.name === defenderName) {
    return { error: "你不能挑戰自己！" };
  }
  if (weaponId === undefined) {
    return { error: "請輸入你要使用的武器編號。" };
  }
  if (!_.get(attacker, `weaponStock[${weaponId}]`)) {
    return { error: `錯誤！你沒有編號為 ${weaponId} 的武器。` };
  }

  const defender = await db.findOne("user", { name: defenderName });
  if (!defender) {
    return {
      error: `找不到名為 "${defenderName}" 的玩家，請確認名稱是否正確。`,
    };
  }

  const attackerWeapon = attacker.weaponStock[weaponId];

  if (_.isEmpty(defender.weaponStock)) {
    await increment(attacker.userId, "totalPvpWins");
    await awardCol(attacker.userId, 50);
    await checkAndAward(attacker.userId);
    return {
      battleLog: [],
      winner: attacker.name,
      reward: `${defender.name} 手無寸鐵，無法應戰！\n**${attacker.name} 不戰而勝！**\n獲得 50 Col`,
      attackerWeapon: {
        name: attackerWeapon.name,
        weaponName: attackerWeapon.weaponName,
      },
      defenderWeapon: null,
      attackerName: attacker.name,
      defenderName: defender.name,
      defenderId: defender.userId,
    };
  }

  const defenderWeapon = defender.weaponStock[0];
  const battleResult = await pvpBattle(
    attacker,
    attackerWeapon,
    defender,
    defenderWeapon,
  );

  let resultText = battleResult.log.join("\n");
  let rewardText = "";

  if (battleResult.winner.userId === attacker.userId) {
    resultText += `\n\n**${attacker.name} 獲得了勝利！**`;

    const defenderItems = defender.itemStock || [];
    if (defenderItems.length > 0) {
      const randomIdx = Math.floor(Math.random() * defenderItems.length);
      const stolenItem = defenderItems[randomIdx];

      const success = await db.atomicIncItem(
        defender.userId,
        stolenItem.itemId,
        stolenItem.itemLevel,
        stolenItem.itemName,
        -1,
      );

      if (success) {
        await db.atomicIncItem(
          attacker.userId,
          stolenItem.itemId,
          stolenItem.itemLevel,
          stolenItem.itemName,
          1,
        );
        rewardText = `\n\n**戰利品:** ${attacker.name} 從 ${defender.name} 身上奪走了 1 個 [${stolenItem.itemName}]！`;
      } else {
        rewardText = `\n\n${defender.name} 身上的素材已被其他人搶走了。`;
      }
    } else {
      rewardText = `\n\n${defender.name} 身上沒有任何素材可以掠奪。`;
    }

    const colReward = 150;
    await awardCol(attacker.userId, colReward);
    rewardText += `\n獲得 ${colReward} Col`;

    await increment(attacker.userId, "totalPvpWins");
    await increment(defender.userId, "totalPvpLosses");
    await checkAndAward(attacker.userId);
  } else {
    resultText += `\n\n**${defender.name} 成功擊退了挑戰者！**`;
    await increment(attacker.userId, "totalPvpLosses");
    await increment(defender.userId, "totalPvpWins");
    await checkAndAward(defender.userId);
  }

  return {
    battleLog: resultText + rewardText,
    winner: battleResult.winner.name,
    reward: rewardText,
    attackerWeapon: {
      name: attackerWeapon.name,
      weaponName: attackerWeapon.weaponName,
    },
    defenderWeapon: {
      name: defenderWeapon.name,
      weaponName: defenderWeapon.weaponName,
    },
    attackerName: attacker.name,
    defenderName: defender.name,
    defenderId: defender.userId,
  };
};
