const _ = require('lodash');
const db = require("../db.js");
const weapon = require("../weapon/weapon.js");
const Discord = require('discord.js');
const level = require("../level");
const type = require("../type.js");
module.exports = async function (cmd, user) {
    let weaponList = [];
    // 確認有無武器編號
    _.forEach(user.weaponStock, function (value, key) {
        weaponList.push(key);
    });
    let itemList = [];
    // 確認有無素材編號
    _.forEach(user.itemStock, function (value, key) {
        itemList.push(key);
    });
    if (!(cmd[2] in weaponList)) {
        return "錯誤！武器" + cmd[2] + " 不存在";
    }
    if (!(cmd[3] in itemList)) {
        return "錯誤！素材" + cmd[3] + " 不存在";
    }
    if (user.itemStock[cmd[3]].itemNum < 1) {
        return "錯誤！素材" + cmd[3] + " 數量不足";
    }
    //強化GO!
    //強化武器
    let thisWeapon = weapon.buffWeapon(cmd, user);
    //消耗素材
    user.itemStock[cmd[3]].itemNum--;
    //寫回user
    db.update("user", {userId:user.userId}, {$set: {itemStock:user.itemStock}});
    //如果武器耐久為0就爆炸
    if (thisWeapon.durability <= 0) {
        thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
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
    //獲得鍛造經驗
    thisWeapon.text += await level("forge", user);
    //寫入CD時間
    let m = (+new Date());
    let query = {userId: user.userId};
    await db.update("user", query, {$set: {move_time:m}})
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    let weaponName = thisWeapon.weaponName;
    if (_.get(thisWeapon, "buff", false)) {
        weaponName = weaponName + "+" + thisWeapon.buff;
    }
    newNovel.addFields(
        {name: '武器名稱', value: weaponName, inline: true},
        {name: '武器分類', value: thisWeapon.name, inline: true},
        {name: '武器編號', value: cmd[2], inline: true},
    ).addFields(
        {name: '攻擊力', value: thisWeapon.atk, inline: true},
        {name: '防禦力', value: thisWeapon.def, inline: true},
        {name: '敏捷', value: thisWeapon.agi, inline: true},
        {name: '暴擊率', value: thisWeapon.cri, inline: true},
        {name: '生命力加成', value: thisWeapon.hp, inline: true},
        {name: '武器耐久值', value: thisWeapon.durability, inline: true},
        {name: '武器強化經過', value: thisWeapon.text}
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

