const auth = require("./auth.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;

module.exports = async function (cmd, userId) {
    if (cmd[1] === undefined || cmd[1] === null) {
        return "必須輸入角色姓名";
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
        if (user !== null) {
            return "已有角色，無法重建";
        }
        //進行insert
        await collection.insertOne({userId:userId, name:cmd[1]});
        return "角色" + cmd[1] + "建立完成";
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
}

