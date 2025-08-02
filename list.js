const Discord = require('discord.js');
const db = require("./db.js");
const _ = require('lodash');

// 每頁顯示的玩家數量
const PLAYERS_PER_PAGE = 10;

module.exports = async function (cmd, userId) {
    // 解析頁數，預設為第 1 頁
    const page = parseInt(cmd[1], 10) || 1;
    if (page < 1) {
        return "頁數必須大於 0。";
    }

    // 從資料庫中找出所有玩家
    const allUsers = await db.find("user", {});
    if (_.isEmpty(allUsers)) {
        return "目前沒有任何已註冊的玩家。";
    }

    const totalPages = Math.ceil(allUsers.length / PLAYERS_PER_PAGE);
    if (page > totalPages) {
        return `頁數過大，總共只有 ${totalPages} 頁。`;
    }

    // 根據頁數篩選出要顯示的玩家
    const startIndex = (page - 1) * PLAYERS_PER_PAGE;
    const endIndex = startIndex + PLAYERS_PER_PAGE;
    const usersOnPage = allUsers.slice(startIndex, endIndex);

    const embed = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('鍛造師名冊')
        .setFooter(`第 ${page} / ${totalPages} 頁`);

    let description = "";
    usersOnPage.forEach((user, index) => {
        const forgeLevel = _.get(user, "forgeLevel", 1);
        const mineLevel = _.get(user, "mineLevel", 1);
        description += `**${startIndex + index + 1}. ${user.name}**\n`;
        description += `> 鍛造 Lv: ${forgeLevel} | 挖礦 Lv: ${mineLevel}\n`;
    });

    embed.setDescription(description);
    return embed;
};
