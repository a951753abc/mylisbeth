const _ = require('lodash');
const Discord = require('discord.js');
const db = require("./db.js");
const type = require("./type.js");
module.exports = async function (cmd, user) {
    // 不再需要從資料庫查詢 user
    let lose = _.get(user, "lost", 0);
    let cName = _.get(user, "name", "");
    let mes = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("鍛造師" + cName);
    let itemListText = "";
    let weaponListText = "";
    let itemListKey = "";
    let itemNums = "";
    if (_.get(user, "itemStock", 0) === 0) {
        itemListText = "無";
        itemListKey = "無";
        itemNums = "無";
    } else {
        _.forEach(user.itemStock, function (value, key) {
            if (value && value.itemNum > 0) {
                itemListKey += key + "\n";
                itemListText += "[" + type.ssrList(value.itemLevel) + "]" + value.itemName + "\n";
                itemNums += value.itemNum + "\n";
            }
        });
    }
    if (_.isEmpty(itemListText)) {
        itemListText = "無";
    }
    if (_.isEmpty(itemListKey)) {
        itemListKey = "無";
    }
    if (_.isEmpty(itemNums)) {
        itemNums = "無";
    }
    if (_.isEmpty(weaponListText)) {
        weaponListText = "無";
    }
    if (_.get(user, "weaponStock", 0) === 0) {
        weaponListText = "無";
    } else {
        _.forEach(user.weaponStock, function (value, key) {
            let weaponName = value.weaponName;
            if (_.get(value, "buff", false)) {
                weaponName = weaponName + "+" + value.buff;
            }
            weaponListText += "編號:" + key + " ";
            weaponListText += "[" + value.name + "]" + weaponName + "\n";
            weaponListText += "|攻擊力" + value.atk + "|防禦力" + value.def + "|敏捷" + value.agi + "|\n";
            weaponListText += "|暴擊率" + value.cri + "|生命力" + value.hp + "|耐久值" + value.durability + "|\n";
            weaponListText += "\n";
        });
    }
    if (_.get(user, "[優樹]Win", false)) {
        mes.addFields({name:"擊敗[優樹]", value:_.get(user, "[優樹]Win"), inline:true});
    }
    if (_.get(user, "[Hell]Win", false)) {
        mes.addFields({name:"擊敗[Hell]", value:_.get(user, "[Hell]Win"), inline:true});
    }
    if (_.get(user, "[Hard]Win", false)) {
        mes.addFields({name:"擊敗[Hard]", value:_.get(user, "[Hard]Win"), inline:true});
    }
    if (_.get(user, "[Normal]Win", false)) {
        mes.addFields({name:"擊敗[Normal]", value:_.get(user, "[Normal]Win"), inline:true});
    }
    if (_.get(user, "[Easy]Win", false)) {
        mes.addFields({name:"擊敗[Easy]", value:_.get(user, "[Easy]Win"), inline:true});
    }
    mes.addFields(
        {name: '死亡人數', value: lose},
        {name: '技能', value: "挖礦" + "\n" + "鍛造", inline: true},
        {name: '等級', value: _.get(user, "mineLevel", 1) + "\n" +
                _.get(user, "forgeLevel", 1), inline: true},
        {name: '經驗值', value: _.get(user, "mine", 1)+ "\n" +
                _.get(user, "forge", 1), inline: true},
        {name: '編號', value: itemListKey, inline:true},
        {name: '名稱', value: itemListText, inline:true},
        {name: '數量', value: itemNums, inline:true},
        {name: '武器', value: weaponListText},
    ).setTimestamp();

    return mes;
}