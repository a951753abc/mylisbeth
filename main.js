const Discord = require("discord.js");
const client = new Discord.Client();
const auth = require("./auth.js");
const move = require("./move.js");
const create = require("./create.js");
const help = require("./help.js");
const info = require("./info.js");
const cmdList = {create:create, help:help, move:move, info:info};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
    //不回應BOT
    if (msg.author.bot) {
        return false;
    }
    //指定使用-l 開頭
    let check = msg.content.substring(0, 3);
    if (check !== "-l ") {
        return false;
    }
    //使用的指令不含在指令列時不處理
    let cmd = msg.content.substring(3).split(' ');
    if (!(cmd[0] in cmdList)) {
        return false;
    }
    let res = await cmdList[cmd[0]](cmd, msg.author.id);
    msg.reply(res);
});

client.login(auth.token);