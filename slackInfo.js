const _ = require('lodash');
const Discord = require('discord.js');
const db = require("./db.js");
const type = require("./type.js");
module.exports = async function (cmd, userId) {
    let query = {userId: userId}
    let user = await db.findOne("user", query);
    let lose = _.get(user, "lost", 0);
    let cName = _.get(user, "name", "");
    let mes = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("鍛造師" + cName);
    let itemListText = "";
    if (_.get(user, "itemStock", 0) === 0) {
        itemListText = "無";
    } else {
        _.forEach(user.itemStock, function (value, key) {
            itemListText += "編號:" + key + " ";
            itemListText += "[" + type.ssrList(value.itemLevel) + "]" + value.itemName + " 數量:" + value.itemNum + "\n";
        });
    }
    let weaponListText = "";
    if (_.get(user, "weaponStock", 0) === 0) {
        weaponListText = "無";
    } else {
        _.forEach(user.weaponStock, function (value, key) {
            weaponListText += "編號:" + key + " ";
            weaponListText += "[" + value.name + "]" + value.weaponName + "\n";
            weaponListText += "|攻擊力" + value.atk + "|防禦力" + value.def + "|敏捷" + value.agi + "|\n";
            weaponListText += "|暴擊率" + value.cri + "|生命力" + value.hp + "|耐久值" + value.durability + "|\n";
            weaponListText += "\n";
        });
    }
    mes.addFields(
        {name: '拿著你鍛造武器冒險死亡人數', value: lose},
        {name: '挖礦等級 | 挖礦經驗值 | 鍛造等級 | 鍛造經驗值',
            value: _.get(user, "mineLevel", 1) + " | "
                + _.get(user, "mine", 0) + " | "
                +  _.get(user, "forgeLevel", 1) + " | "
                + _.get(user, "forge", 0)},
        {name: '素材', value: itemListText},
        {name: '武器', value: weaponListText}
    ).setTimestamp();

    return mes;
}