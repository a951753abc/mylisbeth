const _ = require('lodash');
const config = require('./config.js');
const db = require("./db.js");
const coolTime = config.MOVE_COOLDOWN;// 15秒
const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const up = require("./move/up.js");
const adv = require("./move/adv.js");
const cmdList = {mine: mine, forge:forge, up:up, adv:adv};
module.exports = async function (cmd, userId) {
    if (!(cmd[1] in cmdList)) {
        return "指令錯誤\n 可用 -l help 查詢指令一覽";
    }
    let query = {userId: userId}
    let user = await db.findOne("user", query);
    if (user === null) {
        return "請先建立角色";
    }
    let m = (+new Date());
    let moveTime = _.get(user, "move_time", 0);
    if ((moveTime > 0) && (m - moveTime < coolTime)) {
        return "CD時間還有" + Math.floor((moveTime + coolTime - m) / 1000) + "秒";
    }
    return await cmdList[cmd[1]](cmd, user);
}

