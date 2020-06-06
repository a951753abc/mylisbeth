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
            itemListText += "編號:" + (key + 1) + " ";
            itemListText += "[" + type.ssrList(value.itemLevel) + "]" + value.itemName + " 數量:" + value.itemNum + "\n";
        });
    }
    mes.addFields(
        {name: '拿著你鍛造武器冒險死亡人數', value: lose},
        {name: '挖礦等級', value: _.get(user, "mineLevel", 1), inline:true},
        {name: '挖礦經驗值', value: _.get(user, "mine", 1), inline:true},
        {name: '素材', value: itemListText},
    ).setTimestamp();

    return mes;
}
