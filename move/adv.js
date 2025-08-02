const _ = require('lodash');
const config = require('../config.js'); // 引入設定檔
const db = require("../db.js");
const weapon = require("../weapon/weapon.js");
const Discord = require('discord.js');
const level = require("../level");
const roll = require("../roll.js");
const npcNameList = require("../npc/list.json");
const eneNameList = require("../ene/name.json");
const { pveBattle } = require("../battle");
const gemini = require('../gemini.js'); // 引入 Gemini 模組
const mineModule = require("../move/mine.js");
const placeList = [
    "迷宮",
    "深山",
    "沼澤",
    "樹林",
    "城鎮外",
];

// 將戰鬥紀錄轉換為給 AI 的提示
function createBattlePrompt(battleResult, user, weapon, place, floor) {
    let logText = "";
    battleResult.log.forEach(entry => {
        switch (entry.type) {
            case 'round':
                logText += `第 ${entry.number} 回合開始。\n`;
                break;
            case 'attack':
                logText += `- ${entry.attacker} 攻擊 ${entry.defender}。${entry.rollText}\n`;
                break;
            case 'end':
                if (entry.outcome === 'win') logText += `${entry.winner} 獲得了勝利！\n`;
                if (entry.outcome === 'lose') logText += `${entry.winner} 獲勝，${battleResult.npcName}倒下了。\n`;
                if (entry.outcome === 'draw') logText += `雙方勢均力敵，不分勝負。\n`;
                break;
        }
    });

    const prompt = `
你是日本輕小說家「川原礫」，會基於你的寫作經驗與風格，並按照以下的「戰鬥情境」和「戰鬥紀錄」來創作，但不要逐字翻譯紀錄，而是用你的文筆使其成為一段精彩的故事。
故事風格、背景設定請按照「刀劍神域(SAO)」。
使用第三人稱寫作。
使用日文寫作。
參與戰鬥的人物必須進行對話。
**重要：請將總描述長度控制在 600 字元左右，絕對不要超過 800 字元。**

### 戰鬥情境
- **地點**: 在 ${place} 的第 ${floor} 層。
- **我方**: ${battleResult.npcName} (冒險者)。
- **我方武器**: ${weapon.weaponName} (由鍛造師 ${user.name} 所打造的 ${weapon.name})。
- **敵方**: ${battleResult.enemyName} (兇惡的敵人)。

### 戰鬥紀錄 (請以此為基礎進行描述)
${logText}

現在，請開始你的描述：
`;
    return prompt;
}

module.exports = async function (cmd, user) {
    try {
        let newNovel = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTimestamp();
        let weaponList = [];
        // 確認有無武器編號
        _.forEach(user.weaponStock, function (value, key) {
            weaponList.push(key);
        });
        if (cmd[2] === undefined) {
            cmd[2] = 0;
        }
        if (!(cmd[2] in weaponList)) {
            return "錯誤！武器" + cmd[2] + " 不存在";
        }
        let thisWeapon = user.weaponStock[cmd[2]];
        //先隨機取得要給武器的人
        let npcExample = npcNameList[Math.floor(Math.random() * npcNameList.length)];
        let npc = _.clone(npcExample);
        //隨機冒險地點
        let place = placeList[Math.floor(Math.random() * placeList.length)];
        //層數 = 難度
        let floor = 1;
        let battleResult = await pveBattle(thisWeapon, npc, eneNameList);

        // 產生給 AI 的 Prompt
        const prompt = createBattlePrompt(battleResult, user, thisWeapon, place, floor);
        // 呼叫 Gemini API 產生故事
        let narrativeText = await gemini.generateBattleNarrative(prompt);

        //武器耗損判定
        //死亡>80%
        //獲勝>50%
        //平手>25%
        let durabilityText = "";
        let weaponCheck;
        if (battleResult.win === 1) {
            weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.WIN);
        } else if (battleResult.dead === 1) {
            weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.DEAD);
        } else {
            weaponCheck = roll.d100Check(config.WEAPON_DAMAGE_CHANCE.DRAW);
        }
        if (weaponCheck) {
            //問答無用1D6
            let reduceDurability = roll.d6();
            thisWeapon.durability = thisWeapon.durability - reduceDurability;
            durabilityText = `\n\n(激烈的戰鬥後，${thisWeapon.weaponName} 的耐久度減少了 ${reduceDurability} 點。)`;
            //如果武器耐久為0就爆炸
            if (thisWeapon.durability <= 0) {
                durabilityText += `\n**${thisWeapon.weaponName} 爆發四散了！**`;
                await weapon.destroyWeapon(user.userId, cmd[2]);
            } else {
                let query = {userId: user.userId};
                let weaponUnset = "weaponStock." + cmd[2];
                let mod = {"$set": {}};
                mod["$set"][weaponUnset] = thisWeapon;
                await db.update("user", query, mod);
            }
        }

        //回寫戰鬥結果數據到人物情報內
        let rewardText = "";
        if (battleResult.win === 1) {
            const winString = `${battleResult.category}Win`;
            const newWinCount = _.get(user, winString, 0) + 1;
            const mineResultText = await mineBattle(user, battleResult.category);
            rewardText = `\n\n**戰利品:**\n${mineResultText}`;

            await db.update("user", {userId: user.userId}, { "$set": { [winString]: newWinCount } });            
        } else if (battleResult.dead === 1) {
            const newLostCount = _.get(user, "lost", 0) + 1;
            await db.update("user", {userId: user.userId}, { "$set": { lost: newLostCount } });  
        }

        // 寫入CD時間
        let m = (+new Date());
        await db.update("user", {userId: user.userId}, {$set: {move_time:m}});

        // [修正] 組合最終報告文字，並檢查長度
        let finalReport = narrativeText + durabilityText + rewardText;
        if (finalReport.length > 1024) {
            // 如果文字仍然過長，從尾部截斷以保留結尾的戰利品和耐久度訊息
            const overLength = finalReport.length - 1024;
            narrativeText = narrativeText.substring(0, narrativeText.length - overLength - 5) + "..."; // 減去多餘長度和一些緩衝
            finalReport = narrativeText + durabilityText + rewardText;
        }

        newNovel.addFields({name: '冒險日誌', value: narrativeText + durabilityText + rewardText});
        return newNovel;
    } catch (error) {
        console.error("在執行 move adv 時發生嚴重錯誤:", error);
        return "冒險的過程中發生了未知的錯誤，請稍後再試。";
    }
    
}
async function mineBattle(user, category) {
    const battleMineList = [
        {category:"[優樹]", list:[{itemLevel:3, less:100, text:"★★★"}]},
        {category:"[Hell]", list:[{itemLevel:3, less:40, text:"★★★"}, {itemLevel:2, less:100, text:"★★"}]},
        {category:"[Hard]", list:[{itemLevel:3, less:30, text:"★★★"}, {itemLevel:2, less:100, text:"★★"}]},
        {category:"[Normal]", list:[{itemLevel:3, less:20, text:"★★★"}, {itemLevel:2, less:100, text:"★★"}]},
        {category:"[Easy]", list:[{itemLevel:3, less:10, text:"★★★"}, {itemLevel:2, less:100, text:"★★"}]}
    ];
    let mineList = await db.find("item", "");
    let mine = _.clone(mineList[Math.floor(Math.random() * mineList.length)]);
    let list =  _.find(battleMineList, ['category', category]);
    // [修正 1] 增加防禦性檢查，如果找不到對應的掉落表，就直接回傳，避免崩潰
    if (!list || !list.list) {
        console.error(`錯誤：在 battleMineList 中找不到類別為 "${category}" 的掉落設定。`);
        return ""; // 回傳空字串，不顯示任何獲得物品的訊息
    }    
    let thisItemLevelList = list.list;
    let itemLevel = 0;
    let levelCount = 0;
    while (itemLevel === 0) {
        // [修正 2] 增加邊界檢查，防止 levelCount 超出陣列範圍導致崩潰
        if (levelCount >= thisItemLevelList.length) {
            console.error(`警告：在 mineBattle 的 while 迴圈中，levelCount (${levelCount}) 超出範圍。掉落表可能設定有誤。`);
            break; // 強制跳出迴圈
        }        
        if (roll.d100Check(thisItemLevelList[levelCount].less)) {
            itemLevel = thisItemLevelList[levelCount].itemLevel;
        }
        levelCount++;
    }
    // 如果迴圈正常結束，設定物品等級
    if (itemLevel !== 0) {
        mine.level = thisItemLevelList[levelCount - 1];
    } else {
        // 如果迴圈是因為 break 跳出的，給一個預設值或直接返回
        console.error("無法決定獲得物品的等級，取消本次掉落。");
        return "";
    }        
    //存入道具資料
    let query = {userId: user.userId};
    let newValue;
    let item = _.filter(user.itemStock, {itemId:mine.itemId, itemLevel:mine.level.itemLevel});
    let itemNum = _.get(item[0], "itemNum", undefined);
    if (itemNum === undefined) {
        newValue = {$push: {"itemStock":{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:1, itemName:mine.name}}};
        await db.update("user", query, newValue);
    } else {
        query = {userId: user.userId, itemStock:{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:itemNum, itemName:mine.name}};
        newValue = {$inc: {"itemStock.$.itemNum":1}};
        await db.update("user", query, newValue);
    }
    return "獲得[" + mine.level.text + "]" + mine.name + "\n";
}