const _ = require('lodash');
const Discord = require('discord.js');
const auth = require("./auth.js");
const mongoClient = require('mongodb').MongoClient;
const uri = auth.uri;
module.exports = async function (cmd, userId) {
    let lose = 0;
    let cName = "";
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
        lose = _.get(user, "lost", 0);
        cName = _.get(user, "name", "");
    } catch (err) {
        console.log(err);
    } finally {
        client.close();
    }
    return new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("鍛造師" + cName)
        .addFields(
            {name: '拿著你鍛造武器冒險死亡人數', value: lose},
        )
        .setTimestamp();
}
