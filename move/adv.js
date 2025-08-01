const _ = require('lodash');
const config = require('../config.js'); // 引入設定檔
const db = require("../db.js");
//const weapon = require("../weapon/weapon.js");
const Discord = require('discord.js');
//const level = require("../level");
const roll = require("../roll.js");
const npcNameList = require("../npc/list.json");
const eneNameList = require("../ene/name.json");
const battle = require("../battle");
const mineModule = require("../move/mine.js");
const placeList = [
    "迷宮",
    "深山",
    "沼澤",
    "樹林",
    "城鎮外",
];
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
        let battleResult = await battle(thisWeapon, npc, eneNameList);
        let text = npc.name + "，跟著" + user.name + "，前往第" + floor + "層的" + place
            + "。碰到 " + battleResult.name + " 發生不得不戰鬥的危機！\n";
        text += npc.name + "借用" + user.name + "鑄造的" + thisWeapon.weaponName + "應戰。";
        //武器耗損判定
        //死亡>80%
        //獲勝>50%
        //平手>25%
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
            battleResult.text += "激烈的戰鬥後，武器受到損傷，減少" + reduceDurability + "耐久值\n";
            //如果武器耐久為0就爆炸
            if (thisWeapon.durability <= 0) {
                battleResult.text += thisWeapon.weaponName + " 爆發四散了！";
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
        if (battleResult.win === 1) {
            let winString = battleResult.category + "Win";
            if (_.get(user, winString, false)) {
                user[winString] = user[winString] + 1;
            } else {
                user[winString] = 1;
            }
            let m = (+new Date());

            // 1. 建立兩個 Promise，但不立即 await
            const updateUserPromise = db.update("user", {userId: user.userId}, {
                "$set": {
                    [winString]: user[winString],
                    "move_time": m
                }
            });
            
            //根據敵方難度高機率獲得稀少素材
            const mineBattlePromise = mineBattle(user, battleResult.category);

            // 2. 使用 Promise.all 等待兩個操作同時完成
            const [_, mineResultText] = await Promise.all([
                updateUserPromise,
                mineBattlePromise
            ]);

            // 3. 將戰鬥後挖礦的結果附加到文字中
            battleResult.text += mineResultText;
        } else if (battleResult.dead === 1) {
            if (_.get(user, "lost", false)) {
                user.lost = user.lost + 1;
            } else {
                user.lost = 1;
            }
            let m = (+new Date());
            let newValue = {$set: {lost: user.lost, move_time:m}};
            await db.update("user", {userId: user.userId}, newValue);
        }
        newNovel.addFields({name: '經過', value: text});
        newNovel.addFields({name: '戰鬥過程', value: battleResult.text});
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