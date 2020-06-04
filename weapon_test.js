const _ = require('lodash');
const Discord = require('discord.js');
const category = require("./weapon/category.json");
const roll = require("./roll.js");
const npcNameList = [
    "黑色劍士",
    "KOB的閃光",
    "叫黑色劍士爸爸的小女孩",
    "叫黑色劍士哥哥的金髮妖精",
    "拿著狙擊槍的少女",
    "牙王",
    "愛麗絲",
    "尤吉歐",
    "克萊因",
    "艾基爾",
    "畢娜",
    "克拉帝爾"
];
const placeList = [
    "迷宮",
    "深山",
    "沼澤",
    "樹林",
    "城鎮外",
];
const endList = [
    "死於惡意PK下，從此登出艾恩葛朗特。",
    "意外發現茅場晶彥的存在，被滅口。",
    "由於武器數值過於低落，不幸身亡，從此登出艾恩葛朗特。",
    "由於武器數值過於低落，武器就此損毀，所幸人無事逃回城鎮。",
    "成功擊敗BOSS，解放當前區域。",
];
const weaponPer = ["atk", "def", "agi"];
function createWeapon(weaponName) {
    let weapon = category[Math.floor(Math.random() * category.length)];
    weapon = _.clone(weapon);
    _.set(weapon, 'weaponName', weaponName);
    _.set(weapon, 'text', "武器製作完成");
    //隨機鑄造武器
    //@todo:鑄造等級影響武器成品
    let userLevel = 1;
    /**
     * 強化公式:2D6>=10時，提升使用者等級D6的數值
     * 數值隨機分配給ath、def、agi
     * 重複到2D6<=9
     * 當第一次擲骰丟出2時，鑄造大失敗，隨機數值-1D6(最低為0)
     */
    let rollResult = roll.d66();
    //大失敗
    if (rollResult === 2) {
       changeWeapon(userLevel, weapon, "fail");
       return weapon;
    }
    //強化門檻
    while(rollResult >= 10) {
        changeWeapon(userLevel, weapon, "success");
        rollResult = roll.d66();
    }
    return weapon;
}
function changeWeapon(userLevel, weapon, type) {
    let per = weaponPer[Math.floor(Math.random() * weaponPer.length)];
    let changeValue = roll.d6() * userLevel;
    let text = "";
    if (type === "success") {
        text = weapon.name + "強化大成功！\n武器數值" + per + "提高" + changeValue + "\n";
        weapon[per] = weapon[per] + changeValue;
    } else if (type === "fail") {
        text = weapon.name + "強化大失敗！\n武器數值" + per + "降低了" + changeValue + "\n";
        weapon[per] = weapon[per] - changeValue;
        if (weapon[per] < 0) {
            weapon[per] = 0;
        }
    }
    if (weapon['text'] === "武器製作完成") {
        _.set(weapon, 'text', text);
    } else {
        _.set(weapon, 'text', weapon.text + text);
    }
}
module.exports = function (weaponName, name) {
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    //製造武器
    let weapon = createWeapon(weaponName);
    newNovel.addFields(
        { name: '武器名稱', value: weapon.weaponName, inline:true},
        { name: '武器分類', value: weapon.name, inline:true},
        { name: '\u200B', value: '\u200B', inline:true },
    )
    .addFields(
        { name: '攻擊力', value: weapon.atk, inline:true },
        { name: '防禦力', value: weapon.def, inline:true},
        { name: '敏捷', value: weapon.agi, inline:true},
        { name: '暴擊率', value: weapon.cri, inline:true},
        { name: '武器製造經過', value: weapon.text }
    );
    //先隨機取得要給武器的人
    let npc = npcNameList[Math.floor(Math.random() * npcNameList.length)];
    //隨機冒險地點
    let place = placeList[Math.floor(Math.random() * placeList.length)];
    //隨機層數
    let floor = Math.floor(Math.random() * 100 + 1);
    //隨機結局
    let end = endList[Math.floor(Math.random() * endList.length)];
    let text = npc + "，拿著" + name + "鑄造的" + weaponName + "，前往第" + floor + "層的" + place
    + "，最後" + end;
    console.log(text);

    newNovel.addFields({name:'經過', value:text});
    return newNovel;
}