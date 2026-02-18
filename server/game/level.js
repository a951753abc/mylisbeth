const _ = require('lodash');
const typeList = require("./type");
const db = require("../db.js");

const expList = { mine: 10, forge: 10, adv: 10 };
const levelList = {
    mine: { level: [150, 200] },
    forge: { level: [500, 500] },
    adv: { level: [500] }
};

module.exports = async function (type, user) {
    let text = "";
    const nowUserTypeExp = _.get(user, type, 0) + _.get(expList, type);
    text += "經驗值增加 " + _.get(expList, type) + " 點\n";
    const query = { userId: user.userId };
    const currentPath = type + "Level";
    const nowLevel = _.get(user, currentPath, 1);
    const levelUpExp = _.get(levelList[type].level, [nowLevel - 1], 0);
    let newValue;
    if (levelUpExp !== 0 && (nowUserTypeExp >= levelUpExp)) {
        text += typeList(type) + "等級提升 \n";
        newValue = { $set: { [currentPath]: nowLevel + 1, [type]: 0 } };
    } else {
        newValue = { $set: { [type]: nowUserTypeExp } };
    }
    await db.update("user", query, newValue);
    return text;
};
