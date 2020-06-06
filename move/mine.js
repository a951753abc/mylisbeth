const _ = require('lodash');
const roll = require("../roll.js");
const level = require("../level");
const db = require("../db.js");
const drawLevelList = [
    [
        {itemLevel:3, less:4, text:"★★★"},
        {itemLevel:2, less:20, text:"★★"},
        {itemLevel:1, less:100, text:"★"}
    ],
    [
        {itemLevel:3, less:6, text:"★★★"},
        {itemLevel:2, less:24, text:"★★"},
        {itemLevel:1, less:100, text:"★"}
    ]
];
const itemLimit = 5;
module.exports = async function (cmd, user) {
    //判斷素材庫滿了沒有
    let filter = [
        { $match : { userId : user.userId}},
        { $project: {
                "values": { "$sum": "$itemStock.itemNum" },
                "name": 1,
            } },
    ];
    let item = await db.aggregate("user", filter);
    let nowItems = itemLimit + user.mineLevel;
    if (item[0].values > nowItems) {
        return "無法繼續挖礦 \n 目前素材數:" + item[0].values + " \n 素材儲存上限 " + nowItems;
    }
    let mineList = await db.find("item", "");
    let mine = mineList[Math.floor(Math.random() * mineList.length)];
    let mineLevel = _.get(user, "mineLevel", 1);
    mine.level = drawItemLevel(mineLevel);
    let text = "獲得[" + mine.level.text + "]" + mine.name + "\n\n";
    //挖到的礦存入道具資料
    await mineSave(user, mine);
    //獲得挖礦經驗
    text += await level(cmd[1], user);
    //寫入CD時間
    let m = (+new Date());
    let query = {userId: user.userId};
    await db.update("user", query, {$set: {move_time:m}})
    return text;
}

async function mineSave(user, mine) {
    let query = {userId: user.userId};
    let newValue;
    let item = _.filter(user.itemStock, {itemId:mine.itemId, itemLevel:mine.level.itemLevel});
    let itemNum = _.get(item[0], "itemNum", undefined);
    if (itemNum === undefined) {
        newValue = {$push: {"itemStock":{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:1, itemName:mine.name}}};
        await db.update("user", query, newValue);
    } else {
        query = {userId: user.userId, itemStock:{itemId:mine.itemId, itemLevel:mine.level.itemLevel, itemNum:itemNum, itemName:mine.name}};
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