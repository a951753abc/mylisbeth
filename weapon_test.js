const _ = require('lodash');
const Discord = require('discord.js');
const category = require("./weapon/category.json");
const roll = require("./roll.js");
const npcNameList = require("./npc/list.json");
const battle = require("./battle");
const placeList = [
    "迷宮",
    "深山",
    "沼澤",
    "樹林",
    "城鎮外",
];
const weaponPer = ["atk", "def", "agi"];
const auth = require("./auth.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;
module.exports = async function (weaponName, name, userId) {
    let newNovel = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTimestamp();
    //製造武器
    let weapon = createWeapon(weaponName);
    newNovel.addFields(
        {name: '武器名稱', value: weapon.weaponName, inline: true},
        {name: '武器分類', value: weapon.name, inline: true},
        {name: '\u200B', value: '\u200B', inline: true},
    )
        .addFields(
            {name: '攻擊力', value: weapon.atk, inline: true},
            {name: '防禦力', value: weapon.def, inline: true},
            {name: '敏捷', value: weapon.agi, inline: true},
            {name: '暴擊率', value: weapon.cri, inline: true},
            {name: '武器製造經過', value: weapon.text}
        );
    //先隨機取得要給武器的人
    let npcExample = npcNameList[Math.floor(Math.random() * npcNameList.length)];
    let npc = _.clone(npcExample);
    //隨機冒險地點
    let place = placeList[Math.floor(Math.random() * placeList.length)];
    //隨機層數
    let floor = Math.floor(Math.random() * 100 + 1);
    let battleResult = await battle(weapon, npc, npcNameList);
    let text = npc.name + "，跟著" + name + "，前往第" + floor + "層的" + place
        + "。\n " + npc.name + "碰到 " + battleResult.name + " 發生不得不戰鬥的危機！\n"
    text += npc.name + "借用" + name + "鑄造的" + weaponName + "應戰。"
        console.log(battleResult.text);
    console.log(text);
    newNovel.addFields({name: '經過', value: text});
    newNovel.addFields({name: '戰鬥過程', value: battleResult.text});
    //資料庫處理
    if (battleResult.status === 0) {
        await dbProcess(userId);
    }
    return newNovel;
}

async function dbProcess(userId) {
    const client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return;
    }
    try {
        const db = client.db("lisbeth");
        let m = (+new Date());
        let collection = db.collection('user');
        let query = {userId: userId}
        let user = await collection.findOne(query);
        let lose = _.get(user, "lost", 0);
        lose++;
        let newValue = {$set: {lost: lose, move_time:m}};
        await collection.updateOne({userId: userId}, newValue);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}