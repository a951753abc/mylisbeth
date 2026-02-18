const _ = require('lodash');
const db = require("../../db.js");
const { pvpBattle } = require("../battle.js");

module.exports = async function (cmd, attacker) {
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
        return { error: `找不到名為 "${defenderName}" 的玩家，請確認名稱是否正確。` };
    }

    const attackerWeapon = attacker.weaponStock[weaponId];

    if (_.isEmpty(defender.weaponStock)) {
        return {
            battleLog: [],
            winner: attacker.name,
            reward: `${defender.name} 手無寸鐵，無法應戰！\n**${attacker.name} 不戰而勝！**`,
            attackerWeapon: { name: attackerWeapon.name, weaponName: attackerWeapon.weaponName },
            defenderWeapon: null,
        };
    }

    const defenderWeapon = defender.weaponStock[0];
    const battleResult = await pvpBattle(attacker, attackerWeapon, defender, defenderWeapon);

    let resultText = battleResult.log.join('\n');
    let rewardText = "";

    if (battleResult.winner.userId === attacker.userId) {
        resultText += `\n\n**${attacker.name} 獲得了勝利！**`;

        const defenderItemKeys = Object.keys(defender.itemStock || {});
        if (defenderItemKeys.length > 0) {
            const stolenItemKey = defenderItemKeys[Math.floor(Math.random() * defenderItemKeys.length)];
            const stolenItem = { ...defender.itemStock[stolenItemKey] };

            rewardText = `\n\n**戰利品:** ${attacker.name} 從 ${defender.name} 身上奪走了 1 個 [${stolenItem.itemName}]！`;

            defender.itemStock[stolenItemKey].itemNum--;
            if (defender.itemStock[stolenItemKey].itemNum <= 0) {
                delete defender.itemStock[stolenItemKey];
            }

            const existingItemIndex = _.findIndex(attacker.itemStock, { itemId: stolenItem.itemId, itemLevel: stolenItem.itemLevel });
            if (existingItemIndex > -1) {
                attacker.itemStock[existingItemIndex].itemNum++;
            } else {
                const newKey = _.size(attacker.itemStock);
                attacker.itemStock[newKey] = { ...stolenItem, itemNum: 1 };
            }

            await db.update("user", { userId: attacker.userId }, { $set: { itemStock: attacker.itemStock } });
            await db.update("user", { userId: defender.userId }, { $set: { itemStock: defender.itemStock } });
        } else {
            rewardText = `\n\n${defender.name} 身上沒有任何素材可以掠奪。`;
        }
    } else {
        resultText += `\n\n**${defender.name} 成功擊退了挑戰者！**`;
    }

    await db.updateCooldown(attacker.userId);

    return {
        battleLog: resultText + rewardText,
        winner: battleResult.winner.name,
        reward: rewardText,
        attackerWeapon: { name: attackerWeapon.name, weaponName: attackerWeapon.weaponName },
        defenderWeapon: { name: defenderWeapon.name, weaponName: defenderWeapon.weaponName },
        attackerName: attacker.name,
        defenderName: defender.name,
    };
};
