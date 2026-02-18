const db = require("../db.js");

module.exports = async function (name, userId) {
    if (!name) {
        return { error: "必須輸入角色姓名" };
    }
    const user = await db.findOne("user", { userId });
    if (user !== null) {
        return { error: "已有角色，無法重建" };
    }
    await db.insertOne("user", { userId, name });
    return { success: true, message: "角色" + name + "建立完成" };
};
