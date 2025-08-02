const _ = require('lodash');
const Discord = require("discord.js");
// main.js - 修改後
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const auth = require("./auth.js");
const move = require("./move.js");
const create = require("./create.js");
const help = require("./help.js");
const info = require("./info.js");
const list = require("./list.js");
const cmdList = {create: create, help: help, move: move, info: info, list:list};
const db = require("./db.js"); // 引入 db 模組

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// 使用 async function 包裝啟動流程
async function startServer() {
    // 優先執行資料庫連線
    await db.connect();

    // 確認連線成功後，再登入 Discord
    client.on('ready', () => {
        console.log(`以 ${client.user.tag} 的身份登入!`);
    });

    client.on('message', async msg => {
        //不回應BOT
        if (msg.author.bot) {
            return false;
        }
        //指定使用-l 開頭        
        if (!msg.content.startsWith("-l ")) {
            return false;
        }
        //使用的指令不含在指令列時不處理
        const cmd = msg.content.substring(3).split(' ');
        const mainCmd = cmd[0];        
        if (!(mainCmd in cmdList)) {
            return false;
        }
        let res;
        // 對於需要完整 user 物件的指令，預先查找
        if (mainCmd === 'move' || mainCmd === 'info') {
            const user = await db.findOne("user", { userId: msg.author.id });
            if (!user) {
                return msg.reply("請先建立角色");
            }
            res = await cmdList[mainCmd](cmd, user);
        } else {
            // 其他指令（create, help, list）只需要 author ID 或無須 user 資料
            res = await cmdList[mainCmd](cmd, msg.author.id);
        }
        msg.reply(res);
    });
    
    client.login(auth.token);
}

// 執行啟動函式
startServer();