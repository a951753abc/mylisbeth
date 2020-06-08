const Discord = require('discord.js');
const exampleEmbed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('My Lisbeth 指令一覽')
    .setAuthor('JP6', 'https://i.imgur.com/SceeVw9.png')
    .addFields(
        { name: 'help', value: '呼叫這個選單' },
        { name: 'create [人物名稱]', value: '建立你的人物' },
        { name: 'move mine', value: '挖掘素材' },
        { name: 'move forge [素材1編號] [素材2編號] [武器名稱]', value: '鍛造武器' },
        { name: 'move up [武器編號] [素材編號] ', value: '使用素材強化武器(機率減少耐久值)' },
        { name: 'move adv [武器編號|不輸入則預設第一把]', value: '跟著冒險者去探險(機率減少耐久值、機率獲得素材)' },
        { name: 'info', value: '觀看人物資訊(Discord)' },
        { name: 'slack', value: '觀看人物資訊(Slack)' },
    )
    .setTimestamp();
module.exports = function (cmd, userId) {
    return exampleEmbed;
}
