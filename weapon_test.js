const Discord = require('discord.js');
const exampleEmbed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTimestamp();
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

module.exports = function (weaponName, name) {
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
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    newNovel.addFields({name:'經過', value:text});
    return newNovel;
}