const _ = require('lodash');
const db = require("./db.js");
const weapon = require("./weapon_test.js");
const coolTime = 15 * 1000;// 15秒
const mine = require("./move/mine.js");
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
    return await cmdList[cmd[1]](cmd, user);
    const client = await mongoClient.connect(uri, {useUnifiedTopology: true})
        .catch(err => {
            console.log(err);
        });
    if (!client) {
        return;
    }
    try {
        const db = client.db("lisbeth");
        let collection = db.collection('user');
        client.close();

        let m = (+new Date());
        let moveTime = _.get(user, "move_time", 0);
        if ((moveTime > 0) && (m - moveTime < coolTime)) {
            return "CD時間還有" + Math.floor((moveTime + coolTime - m) / 1000) + "秒";
        }
        return await weapon(cmd[1], user.name, userId);
    } catch (err) {
        console.log(err);
    }
}

