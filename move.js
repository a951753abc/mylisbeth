const auth = require("./auth.js");
const weapon = require("./weapon_test.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;

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
        return await weapon(cmd[1], user.name);
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}

