const _ = require('lodash');
const weapon = require("../weapon/weapon.js");
const db = require("../db.js");
const Discord = require('discord.js');
const level = require("../level");
const type = require("../type.js");
const weaponLimit = 1;
module.exports = async function (cmd, user) {
    let weaponLevel = _.get(user, "forceLevel", 1);
    if (_.get(user, "weaponStock", false)) {
        //判斷武器庫滿了沒有
        let filter = [
            { $match : { userId : user.userId}},
            { $project: {
                    "values": { "$size": "$weaponStock" },
                    "name": 1,
                } },
        ];
        let weaponNum = await db.aggregate("user", filter);
        let nowWeaponLimit = weaponLimit + weaponLevel;
        if (weaponNum[0].values >= nowWeaponLimit) {
            return "無法製造武器 \n 目前武器數:" + weaponNum[0].values + " \n 武器儲存上限 " + nowWeaponLimit;
        }
    }
    let itemList = [];
    // 確認有無2 + 3 (素材編號
    _.forEach(user.itemStock, function (value, key) {
        itemList.push(key);
    });
    if (!(cmd[2] in itemList)) {
        return "錯誤！素材" + cmd[2] + " 不存在";
    }
    if (!(cmd[3] in itemList)) {
        return "錯誤！素材" + cmd[3] + " 不存在";
    }
    if (cmd[2] === cmd[3]) {
        //確認重複素材是否足夠
        if (user.itemStock[cmd[2]].itemNum < 2) {
            return "錯誤！素材" + cmd[2] + " 數量不足";
        }
    }
    if (user.itemStock[cmd[2]].itemNum < 1) {
        return "錯誤！素材" + cmd[2] + " 數量不足";
    }
    if (user.itemStock[cmd[3]].itemNum < 1) {
        return "錯誤！素材" + cmd[3] + " 數量不足";
    }
    if (cmd[4] === undefined || cmd[4] === null) {
        return "必須輸入武器名稱";
    }
    //合成GO!
    //製造武器
    let thisWeapon = await weapon.createWeapon(cmd, user);
    //消耗素材1
    user.itemStock[cmd[2]].itemNum--;
    //消耗素材2
    user.itemStock[cmd[3]].itemNum--;
    //寫回user
    db.update("user", {userId:user.userId}, {$set: {itemStock:user.itemStock}});
    //如果武器耐久為0就爆炸
    if (thisWeapon.durability <= 0) {
        thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    } else {
        let query = {userId: user.userId};
        let newValue = {$push: {weaponStock:thisWeapon}};
        await db.update("user", query, newValue);
    }
    //獲得鍛造經驗
    thisWeapon.text += await level(cmd[1], user);
    //寫入CD時間
    let m = (+new Date());
    let query = {userId: user.userId};
    await db.update("user", query, {$set: {move_time:m}})
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    newNovel.addFields(
        {name: '武器名稱', value: thisWeapon.weaponName, inline: true},
        {name: '武器分類', value: thisWeapon.name, inline: true},
        {name: '\u200B', value: '\u200B', inline: true},
    ).addFields(
            {name: '攻擊力', value: thisWeapon.atk, inline: true},
            {name: '防禦力', value: thisWeapon.def, inline: true},
            {name: '敏捷', value: thisWeapon.agi, inline: true},
            {name: '暴擊率', value: thisWeapon.cri, inline: true},
            {name: '生命力加成', value: thisWeapon.hp, inline: true},
            {name: '武器耐久值', value: thisWeapon.durability, inline: true},
            {name: '武器製造經過', value: thisWeapon.text}
        );
//取得道具列表重新顯示
    /**
    user = await db.findOne("user", {userId: user.userId});
    let itemListText = "";
    let itemListKey = "";
    let itemNums = "";
    if (_.get(user, "itemStock", 0) === 0) {
        itemListText = "無";
        itemListKey = "無";
        itemNums = "無";
    } else {
        _.forEach(user.itemStock, function (value, key) {
            itemListKey += key + "\n";
            itemListText += "[" + type.ssrList(value.itemLevel) + "]" + value.itemName + "\n";
            itemNums += value.itemNum + "\n";
        });
    }
    newNovel.addFields(
        {name: '\u200B', value: '\u200B'},
        {name: '編號', value: itemListKey, inline:true},
        {name: '名稱', value: itemListText, inline:true},
        {name: '數量', value: itemNums, inline:true},
    )*/
    return newNovel;
}

