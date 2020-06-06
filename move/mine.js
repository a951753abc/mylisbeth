const _ = require('lodash');
const roll = require("../roll.js");
const level = require("../level");
const db = require("../db.js");
const drawLevelList = [
    [
        {itemLevel:3, less:4, text:"SSR"},
        {itemLevel:2, less:20, text:"SR"},
        {itemLevel:1, less:100, text:"R"}
    ],
    [
        {itemLevel:3, less:6, text:"SSR"},
        {itemLevel:2, less:24, text:"SR"},
        {itemLevel:1, less:100, text:"R"}
    ]
];
module.exports = async function (cmd, user) {
    let mineList = await db.find("item", "");
    let mine = mineList[Math.floor(Math.random() * mineList.length)];
    let mineLevel = _.get(user, "mineLevel", 1);
    mine.level = drawItemLevel(mineLevel);
    let text = "獲得[" + mine.level.text + "]" + mine.name + "\n\n";
    //挖到的礦存入道具資料
    await mineSave(user, mine);
    //獲得挖礦經驗
    text += await level(cmd[1], user);
    return text;
}

async function mineSave(user, mine) {
    let query = {userId: user.userId};
    let newValue;
    let item = _.filter(user.itemStock, {itemId:mine.itemId, itemLevel:mine.level.itemLevel});
    let itemNum = _.get(item[0], "itemNum", 0);
    if (itemNum === 0) {
        newValue = {$push: {"itemStock":{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:1, itemName:mine.name}}};
        await db.update("user", query, newValue);
    } else {
        query = {userId: user.userId, itemStock:{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:itemNum, itemName:mine.name}};
        let res = await db.findOne("user", query);
        newValue = {$inc: {"itemStock.$.itemNum":1}};
        await db.update("user", query, newValue);
    }
}

function drawItemLevel(level) {
    let thisItemLevelList = drawLevelList[level-1];
    let itemLevel = 0;
    let count = 0;
    while (itemLevel === 0) {
        if (roll.d100Check(thisItemLevelList[count].less)) {
            itemLevel = thisItemLevelList[count].itemLevel;
        }
        count++;
    }
    return thisItemLevelList[count-1];
}