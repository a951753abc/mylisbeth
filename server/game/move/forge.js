const _ = require('lodash');
const weapon = require("../weapon/weapon.js");
const db = require("../../db.js");
const level = require("../level");
const weaponLimit = 1;

module.exports = async function (cmd, user) {
    const weaponLevel = _.get(user, "forceLevel", 1);
    if (_.get(user, "weaponStock", false)) {
        const filter = [
            { $match: { userId: user.userId } },
            { $project: { values: { "$size": "$weaponStock" }, name: 1 } },
        ];
        const weaponNum = await db.aggregate("user", filter);
        const nowWeaponLimit = weaponLimit + weaponLevel;
        if (weaponNum[0].values >= nowWeaponLimit) {
            return { error: "無法製造武器 \n 目前武器數:" + weaponNum[0].values + " \n 武器儲存上限 " + nowWeaponLimit };
        }
    }

    // 修復: 使用陣列索引檢查而非 `in` 運算子
    if (!user.itemStock || !user.itemStock[cmd[2]]) {
        return { error: "錯誤！素材" + cmd[2] + " 不存在" };
    }
    if (!user.itemStock[cmd[3]]) {
        return { error: "錯誤！素材" + cmd[3] + " 不存在" };
    }
    if (cmd[2] === cmd[3]) {
        if (user.itemStock[cmd[2]].itemNum < 2) {
            return { error: "錯誤！素材" + cmd[2] + " 數量不足" };
        }
    }
    if (user.itemStock[cmd[2]].itemNum < 1) {
        return { error: "錯誤！素材" + cmd[2] + " 數量不足" };
    }
    if (user.itemStock[cmd[3]].itemNum < 1) {
        return { error: "錯誤！素材" + cmd[3] + " 數量不足" };
    }
    if (cmd[4] === undefined || cmd[4] === null) {
        return { error: "必須輸入武器名稱" };
    }

    const thisWeapon = await weapon.createWeapon(cmd, user);

    user.itemStock[cmd[2]].itemNum--;
    user.itemStock[cmd[3]].itemNum--;
    await db.update("user", { userId: user.userId }, { $set: { itemStock: user.itemStock } });

    if (thisWeapon.durability <= 0) {
        thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    } else {
        await db.update("user", { userId: user.userId }, { $push: { weaponStock: thisWeapon } });
    }

    thisWeapon.text += await level(cmd[1], user);
    await db.updateCooldown(user.userId);

    return {
        weapon: {
            weaponName: thisWeapon.weaponName,
            name: thisWeapon.name,
            atk: thisWeapon.atk,
            def: thisWeapon.def,
            agi: thisWeapon.agi,
            cri: thisWeapon.cri,
            hp: thisWeapon.hp,
            durability: thisWeapon.durability,
        },
        text: thisWeapon.text,
    };
};
