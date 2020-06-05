const _ = require('lodash');
const auth = require("./auth.js");
const weapon = require("./weapon_test.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;
const coolTime = 15 * 1000;// 15秒

module.exports = async function (cmd, userId) {
    if (cmd[1] === undefined || cmd[1] === null) {
        return "必須輸入武器姓名";
    }
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
        let query = {userId: userId}
        let user = await collection.findOne(query);
        if (user === null) {
            return "請先建立角色";
        }
        let m = (+new Date());
        let moveTime = _.get(user, "move_time", 0);
        console.log(m);
        console.log(moveTime);
        console.log(m - moveTime);
        if ((moveTime > 0) && (m - moveTime < coolTime)) {
            console.log(m);
            console.log(moveTime);
            console.log(m - moveTime);
            return "CD時間還有" + Math.floor((moveTime + coolTime - m) / 1000) + "秒";
        }
        return await weapon(cmd[1], user.name, userId);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}

