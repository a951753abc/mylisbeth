const _ = require('lodash');
const weapon = require("../weapon/weapon.js");
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
    if (cmd[4] === undefined || cmd[4] === null) {
        return "必須輸入武器名稱";
    }
    //合成GO!
    //製造武器
    let thisWeapon = await weapon.createWeapon(cmd, user);
    //消耗素材1

    //如果武器耐久為0就爆炸
    if (thisWeapon.durability === 0) {
        thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
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
    return newNovel;
}

