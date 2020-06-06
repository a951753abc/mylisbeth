const _ = require('lodash');
const Discord = require('discord.js');
const db = require("./db.js");
module.exports = async function (cmd, userId) {
    let query = {userId: userId}
    let user = await db.findOne("user", query);
    let lose = _.get(user, "lost", 0);
    let cName = _.get(user, "name", "");
    return new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle("鍛造師" + cName)
        .addFields(
            {name: '拿著你鍛造武器冒險死亡人數', value: lose},
        )
        .setTimestamp();
}
