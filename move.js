const _ = require('lodash');
const config = require('./config.js');
const db = require("./db.js");
const coolTime = config.MOVE_COOLDOWN;// 15秒
const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const up = require("./move/up.js");
const adv = require("./move/adv.js");
const pvp = require("./move/pvp.js");
const cmdList = {mine: mine, forge:forge, up:up, adv:adv, pvp:pvp};
module.exports = async function (cmd, userOrId, mentionedUser = null) {
    if (!(cmd[1] in cmdList)) {
        return "指令錯誤\n 可用 -l help 查詢指令一覽";
    }
    // [修改] 統一處理 user 物件
    let user = userOrId;
    if (typeof user === 'string') {
        user = await db.findOne("user", { userId: user });
    }

    if (user === null) {
        return "請先建立角色";
    }
    let m = (+new Date());
    let moveTime = _.get(user, "move_time", 0);
    if ((moveTime > 0) && (m - moveTime < coolTime)) {
        return "CD時間還有" + Math.floor((moveTime + coolTime - m) / 1000) + "秒";
    }
    
    // [修改] 根據指令傳遞不同參數
    if (cmd[1] === 'pvp') {
        return await cmdList.pvp(cmd, user, mentionedUser);
    } else {
        return await cmdList[cmd[1]](cmd, user);
    }
}

