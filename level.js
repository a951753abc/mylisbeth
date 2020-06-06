const _ = require('lodash');
const typeList = require("./type");
const db = require("./db.js");
const expList = {mine:10};
const levelList = {
    mine: {
        level:[
            150
        ]
    }
};

module.exports = async function (type, user) {
    let text = "";
    //獲得經驗
    let nowUserTypeExp = _.get(user, type, 0) + _.get(expList, type);
    text += "經驗值增加 " + _.get(expList, type) + " 點\n";
    let query = {userId: user.userId};
    let newValue;
    let currentPath = type + "Level";
    let nowLevel = _.get(user, currentPath, 1);
    let levelUpExp = _.get(levelList[type].level, [nowLevel - 1], 0);
    if (levelUpExp !== 0 && (nowUserTypeExp >= levelUpExp)) {
        //升級處理
        text += typeList(type) + "等級提升 \n";
        newValue = {$set: {[currentPath]: nowLevel + 1, [type]:0}};
    } else {
        //經驗值增加處理
        newValue = {$set: {[type]:nowUserTypeExp}};
    }
    await db.update("user", query, newValue);
    return text;
}