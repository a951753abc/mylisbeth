const _ = require('lodash');
const db = require("../db.js");
//const weapon = require("../weapon/weapon.js");
const Discord = require('discord.js');
//const level = require("../level");
const roll = require("../roll.js");
const npcNameList = require("../npc/list.json");
const eneNameList = require("../ene/name.json");
const battle = require("../battle");
const placeList = [
    "迷宮",
    "深山",
    "沼澤",
    "樹林",
    "城鎮外",
];
module.exports = async function (cmd, user) {
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    let weaponList = [];
    // 確認有無武器編號
    _.forEach(user.weaponStock, function (value, key) {
        weaponList.push(key);
    });
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
        weaponCheck = roll.d100Check(50);
    } else if (battleResult.dead === 1) {
        weaponCheck = roll.d100Check(80);
    } else {
        weaponCheck = roll.d100Check(25);
    }
    if (weaponCheck) {
        //問答無用1D6
        let reduceDurability = roll.d6();
        thisWeapon.durability = thisWeapon.durability - reduceDurability;
        battleResult.text += "激烈的戰鬥後，武器受到損傷，減少" + reduceDurability + "耐久值\n";
        //如果武器耐久為0就爆炸
        if (thisWeapon.durability <= 0) {
            battleResult.text += thisWeapon.weaponName + " 爆發四散了！";
            let query = {userId: user.userId};
            let weaponUnset = "weaponStock." + cmd[2];
            let mod = {"$unset": {}};
            mod["$unset"][weaponUnset] = 1;
            await db.update("user", query, mod);
            await db.update("user", query, {$pull:{"weaponStock":null }});
            query = {userId: user.userId, weaponStock:[]};
            await db.update("user", query, {$unset:{"weaponStock":1}});
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
        let mod = {"$set": {}};
        mod["$set"][winString] = user[winString];
        mod["$set"]["move_time"] = m;
        await db.update("user", {userId: user.userId}, mod);
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
}