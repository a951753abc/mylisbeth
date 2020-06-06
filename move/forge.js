const _ = require('lodash');
const weapon = require("../weapon/weapon.js");
const db = require("../db.js");
const Discord = require('discord.js');
module.exports = async function (cmd, user) {

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
    if (thisWeapon.durability === 0) {
        thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    } else {
        //@todo:寫入武器

    }
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
    if (thisWeapon.durability > 0) {
        //冒險example
        //先隨機取得要給武器的人
        const npcNameList = require("../npc/list.json");
        const battle = require("../battle");
        let npcExample = npcNameList[Math.floor(Math.random() * npcNameList.length)];
        let npc = _.clone(npcExample);
        const placeList = [
            "迷宮",
            "深山",
            "沼澤",
            "樹林",
            "城鎮外",
        ];
        //隨機冒險地點
        let place = placeList[Math.floor(Math.random() * placeList.length)];
        //隨機層數
        let floor = Math.floor(Math.random() * 100 + 1);
        let battleResult = await battle(thisWeapon, npc, npcNameList);
        let text = npc.name + "，拿著" + user.name + "鑄造的" + cmd[4] + "，前往第" + floor + "層的" + place
            + "。\n " + npc.name + "碰到 " + battleResult.name + " 發生不得不戰鬥的危機！"
        newNovel.addFields({name: '經過', value: text});
        newNovel.addFields({name: '戰鬥過程', value: battleResult.text});
    }
    return newNovel;
}

