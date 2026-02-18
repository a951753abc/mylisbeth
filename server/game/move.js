const _ = require('lodash');
const config = require('./config.js');
const db = require("../db.js");

const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const up = require("./move/up.js");
const adv = require("./move/adv.js");
const pvp = require("./move/pvp.js");

const coolTime = config.MOVE_COOLDOWN;
const cmdList = { mine, forge, up, adv, pvp };

module.exports = async function (cmd, userOrId) {
    if (!(cmd[1] in cmdList)) {
        return { error: "指令錯誤\n 可用指令: mine, forge, up, adv, pvp" };
    }

    let user = userOrId;
    if (typeof user === 'string') {
        user = await db.findOne("user", { userId: user });
    }

    if (user === null) {
        return { error: "請先建立角色" };
    }

    const now = Date.now();
    const moveTime = _.get(user, "move_time", 0);
    if ((moveTime > 0) && (now - moveTime < coolTime)) {
        const remaining = Math.floor((moveTime + coolTime - now) / 1000);
        return { error: "CD時間還有" + remaining + "秒", cooldown: remaining };
    }

    return await cmdList[cmd[1]](cmd, user);
};
