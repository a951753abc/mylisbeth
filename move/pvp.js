const _ = require('lodash');
const db = require("../db.js");
const Discord = require('discord.js');
const { pvpBattle } = require("../battle.js"); // 引入 PVP 戰鬥函式
const roll = require("../roll.js");

module.exports = async function (cmd, attacker) {
    // --- 1. 指令與玩家驗證 ---
    const defenderName = cmd[2];
    const weaponId = cmd[3];

    if (!defenderName) {
        return "請輸入你要挑戰的玩家角色名稱。例如：`-l move pvp 角色名稱 武器編號`";
    }
    if (attacker.name === defenderName) {
        return "你不能挑戰自己！";
    }
    if (weaponId === undefined) {
        return "請輸入你要使用的武器編號。";
    }
    if (!_.get(attacker, `weaponStock[${weaponId}]`)) {
        return `錯誤！你沒有編號為 ${weaponId} 的武器。`;
    }

    const defender = await db.findOne("user", { name: defenderName });
    if (!defender) {
        return `找不到名為 "${defenderName}" 的玩家，請確認名稱是否正確。`;
    }

    const attackerWeapon = attacker.weaponStock[weaponId];
    const newNovel = new Discord.MessageEmbed()
        .setColor('#ff4444') // 使用紅色來突顯PVP的緊張感
        .setTitle(`⚔️ ${attacker.name} 向 ${defender.name} 發起挑戰！`)
        .setTimestamp();

    // --- 2. 檢查被挑戰者狀態 ---
    if (_.isEmpty(defender.weaponStock)) {
        newNovel.setDescription(`${defender.name} 手無寸鐵，無法應戰！\n**${attacker.name} 不戰而勝！**`);
        // 因為對方沒有武器，直接勝利，但不掠奪素材
        return newNovel;
    }

    // --- 3. 進行戰鬥 ---
    const defenderWeapon = defender.weaponStock[0]; // 預設使用第一把武器應戰
    newNovel.addFields(
        { name: `${attacker.name}的武器`, value: `[${attackerWeapon.name}] ${attackerWeapon.weaponName}`, inline: true },
        { name: `${defender.name}的武器`, value: `[${defenderWeapon.name}] ${defenderWeapon.weaponName}`, inline: true },
        { name: '\u200B', value: '\u200B' } // 分隔線
    );

    const battleResult = await pvpBattle(attacker, attackerWeapon, defender, defenderWeapon);
    
    // --- 4. 處理戰鬥結果與獎勵 ---
    let resultText = battleResult.log.join('\n'); // 組合戰鬥過程
    let rewardText = "";

    if (battleResult.winner.userId === attacker.userId) {
        // 挑戰者勝利
        resultText += `\n\n**${attacker.name} 獲得了勝利！**`;
        
        // 隨機掠奪素材
        const defenderItemKeys = Object.keys(defender.itemStock || {});
        if (defenderItemKeys.length > 0) {
            const stolenItemKey = defenderItemKeys[Math.floor(Math.random() * defenderItemKeys.length)];
            const stolenItem = { ...defender.itemStock[stolenItemKey] };

            rewardText = `\n\n**戰利品:** ${attacker.name} 從 ${defender.name} 身上奪走了 1 個 [${stolenItem.itemName}]！`;

            // 從被挑戰者身上移除素材
            defender.itemStock[stolenItemKey].itemNum--;
            if (defender.itemStock[stolenItemKey].itemNum <= 0) {
                delete defender.itemStock[stolenItemKey];
            }
            
            // 將素材給予挑戰者
            const existingItemIndex = _.findIndex(attacker.itemStock, { itemId: stolenItem.itemId, itemLevel: stolenItem.itemLevel });
            if (existingItemIndex > -1) {
                attacker.itemStock[existingItemIndex].itemNum++;
            } else {
                const newKey = _.size(attacker.itemStock);
                attacker.itemStock[newKey] = { ...stolenItem, itemNum: 1 };
            }

            // 更新雙方資料庫
            await db.update("user", { userId: attacker.userId }, { $set: { itemStock: attacker.itemStock } });
            await db.update("user", { userId: defender.userId }, { $set: { itemStock: defender.itemStock } });

        } else {
            rewardText = `\n\n${defender.name} 身上沒有任何素材可以掠奪。`;
        }
    } else {
        // 被挑戰者勝利
        resultText += `\n\n**${defender.name} 成功擊退了挑戰者！**`;
    }

    newNovel.addFields({ name: '戰鬥摘要', value: resultText + rewardText });
    
    // --- 5. 寫入行動冷卻時間 ---
    const m = (+new Date());
    await db.update("user", {userId: attacker.userId}, {$set: {move_time:m}});

    return newNovel;
}
