const _ = require('lodash');
const Discord = require("discord.js");
const SlackBot = require('slackbots');
const client = new Discord.Client();
const auth = require("./auth.js");
const slack_client = new SlackBot({token: auth.slack});
const move = require("./move.js");
const create = require("./create.js");
const help = require("./help.js");
const info = require("./info.js");
const cmdList = {create: create, help: help, move: move, info: info};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
slack_client.on('start', function () {
    console.log("Slack connected");
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
slack_client.on('message', async function (message) {
    let realName = "";
    if (message.type !== "message" || message.subtype === "message_deleted" ||
        message.subtype === "message_changed" || message.subtype === "bot_message") {
        return false;
    }
    slack_client.getUsers()._value.members.forEach(function (elem) {
        if (elem.id === message.user) {
            realName = elem.real_name;
        }
    });
    //指定使用-l 開頭
    let check = message.text.substring(0, 3);
    if (check !== "-l ") {
        return false;
    }
    //使用的指令不含在指令列時不處理
    let cmd = message.text.substring(3).split(' ');
    if (!(cmd[0] in cmdList)) {
        return false;
    }
    let res = await cmdList[cmd[0]](cmd, message.user);
    let text = "";
    let title = _.get(res, "title", null);
    if (title) {
        text += "*" + title + "*\n";
    }
    let fields = _.get(res, "fields", null);
    if (!fields) {
        text = res;
    } else {
        _.forEach(fields, function (value) {
            text += "• " + value.name + " \n";
            text += value.value + " \n";
        });
    }
    console.log(res);
    slack_client.postMessage(message.channel, ">" + realName + "\n" + text);
});

client.login(auth.token);