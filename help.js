const Discord = require('discord.js');
const exampleEmbed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('My Lisbeth 指令一覽')
    .setAuthor('JP6', 'https://i.imgur.com/SceeVw9.png')
    .addFields(
        { name: 'help', value: '呼叫這個選單' },
        { name: 'create [人物名稱]', value: '建立你的人物' },
        { name: 'move [武器名稱]', value: '鍛造你的武器給人去冒險' },
        { name: 'info', value: '觀看人物資訊' },
    )
    .setTimestamp();
module.exports = function (cmd, userId) {
    return exampleEmbed;
}
