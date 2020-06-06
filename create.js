const db = require("./db.js");

module.exports = async function (cmd, userId) {
    if (cmd[1] === undefined || cmd[1] === null) {
        return "必須輸入角色姓名";
    }
    let query = {userId: userId}
    let user = await db.findOne("user", query);
    if (user !== null) {
        return "已有角色，無法重建";
    }
    //進行insert
    await db.insertOne("user", {userId:userId, name:cmd[1]});
    return "角色" + cmd[1] + "建立完成";
}

