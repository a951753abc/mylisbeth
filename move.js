const _ = require('lodash');
const db = require("./db.js");
const weapon = require("./weapon_test.js");
const coolTime = 5 * 1000;// 15秒
const mine = require("./move/mine.js");
const forge = require("./move/forge.js");
const cmdList = {mine: mine};
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
    const client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return;
    }
    try {
        return await weapon(cmd[1], user.name, userId);
    } catch (err) {
        console.log(err);
    }
}

