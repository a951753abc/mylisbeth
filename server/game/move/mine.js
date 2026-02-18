const _ = require('lodash');
const roll = require("../roll.js");
const level = require("../level");
const db = require("../../db.js");

const drawLevelList = [
    [
        { itemLevel: 3, less: 4, text: "★★★" },
        { itemLevel: 2, less: 20, text: "★★" },
        { itemLevel: 1, less: 100, text: "★" }
    ],
    [
        { itemLevel: 3, less: 6, text: "★★★" },
        { itemLevel: 2, less: 24, text: "★★" },
        { itemLevel: 1, less: 100, text: "★" }
    ],
    [
        { itemLevel: 3, less: 8, text: "★★★" },
        { itemLevel: 2, less: 24, text: "★★" },
        { itemLevel: 1, less: 100, text: "★" }
    ]
];

const itemLimit = 5;

module.exports = async function (cmd, user) {
    let text = "";
    const mineLevel = _.get(user, "mineLevel", 1);
    const filter = [
        { $match: { userId: user.userId } },
        { $project: { values: { "$sum": "$itemStock.itemNum" }, name: 1 } },
    ];
    const item = await db.aggregate("user", filter);
    const nowItems = itemLimit + mineLevel;
    if (item[0].values >= nowItems) {
        return { error: "無法繼續挖礦 \n 目前素材數:" + item[0].values + " \n 素材儲存上限 " + nowItems };
    }
    const mineList = await db.find("item", {});
    let count = item[0].values;
    while (nowItems > count) {
        const mine = _.clone(mineList[Math.floor(Math.random() * mineList.length)]);
        mine.level = drawItemLevel(mineLevel);
        text += "獲得[" + mine.level.text + "]" + mine.name + "\n";
        await db.saveItemToUser(user.userId, user.itemStock, mine);
        user = await db.findOne("user", { userId: user.userId });
        count++;
    }
    text += await level(cmd[1], user);
    await db.updateCooldown(user.userId);
    return { text };
};

function drawItemLevel(level) {
    const thisItemLevelList = drawLevelList[level - 1];
    let itemLevel = 0;
    let count = 0;
    while (itemLevel === 0) {
        if (roll.d100Check(thisItemLevelList[count].less)) {
            itemLevel = thisItemLevelList[count].itemLevel;
        }
        count++;
    }
    return thisItemLevelList[count - 1];
}
