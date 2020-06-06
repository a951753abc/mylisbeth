const _ = require('lodash');
const db = require("../db.js");
const randWeapon = require("../weapon/category.json");
const roll = require("../roll.js");
const weaponPer = ["hp", "atk", "def", "agi", "durability"];
module.exports.createWeapon = async function (cmd, user) {
    let forceLevel = _.get(user, "forceLevel", 1);
    let query = {forge1:user.itemStock[cmd[2]].itemId, forge2:user.itemStock[cmd[3]].itemId};
    let weapon = await db.findOne("weapon", query);
    if (!weapon) {
        //不在既定合成表上，隨機產生
        weapon = _.clone(randWeapon[Math.floor(Math.random() * randWeapon.length)]);
    }
    //大概會多此一舉的賦值
    //隨機產生耐久度1D6
    _.set(weapon, 'weaponName', cmd[4]);
    _.set(weapon, 'weaponName', cmd[4]);
    _.set(weapon, 'hp', 0);
    _.set(weapon, 'durability', roll.d6());
    _.set(weapon, 'text', "");
    weapon.text += "使用" + user.itemStock[cmd[2]].itemName + "和" + user.itemStock[cmd[3]].itemName + "製作完成\n";
    //五種屬性全部都是20%機率起跳
    //使用一種對應素材，增加20%機率
    //高階素材，額外增加5%機率
    //總之開始算機率，從兩者相同開始
    if (cmd[2] === cmd[3]) {
        let per = 20 + ((user.itemStock[cmd[2]].itemLevel + user.itemStock[cmd[3]].itemLevel) * 5);
        if (roll.d100Check(per)) {
            //強化成功
            let perName = weaponPer[parseInt(user.itemStock[cmd[2]].itemId, 10) - 1];
            weapon.text += "強化成功！\n";
            weapon.text += perName;
            weapon.text += " 提升" + forceLevel + "點。 \n";
            weapon[perName] += forceLevel;
        }
    } else {
        //素材1是否強化成功
        let per = 20 + ((user.itemStock[cmd[2]].itemLevel) * 5);
        if (roll.d100Check(per)) {
            //強化成功
            let perName = weaponPer[parseInt(user.itemStock[cmd[2]].itemId, 10) - 1];
            weapon.text += "強化成功！\n";
            weapon.text += perName;
            weapon.text += " 提升" + forceLevel + "點。 \n";
            weapon[perName] += forceLevel;
        }
        //素材2是否強化成功
        per = 20 + ((user.itemStock[cmd[3]].itemLevel) * 5);
        if (roll.d100Check(per)) {
            //強化成功
            let perName = weaponPer[parseInt(user.itemStock[cmd[3]].itemId, 10) - 1];
            weapon.text += "強化成功！\n";
            weapon.text += perName;
            weapon.text += " 提升" + forceLevel + "點。 \n";
            weapon[perName] += forceLevel;
        }
    }
    /**
     * 強化公式:2D6>=10時，提升1D6的數值
     * 數值亂數分配HP ATK DEF AGI 武器耐久度
     * 重複到2D6<=9
     * 當第一次擲骰丟出2時，鑄造大失敗，隨機數值-1D6(最低為0)
     */
    let rollResult = roll.d66();
    //大失敗
    if (rollResult === 2) {
        changeWeapon(weapon, "fail");
        return weapon;
    }
    //強化門檻
    while (rollResult >= 10) {
        changeWeapon(weapon, "success");
        rollResult = roll.d66();
    }
    return weapon;
}
function changeWeapon(weapon, type) {
    let per = weaponPer[Math.floor(Math.random() * weaponPer.length)];
    let changeValue = roll.d6();
    let text = "";
    if (type === "success") {
        text = weapon.name + "強化大成功！\n武器數值" + per + "提高" + changeValue + "\n";
        weapon[per] = weapon[per] + changeValue;
    } else if (type === "fail") {
        text = weapon.name + "強化大失敗！\n武器數值" + per + "降低了" + changeValue + "\n";
        weapon[per] = weapon[per] - changeValue;
        if (weapon[per] < 0) {
            weapon[per] = 0;
        }
    }
    if (weapon['text'] === "武器製作完成") {
        _.set(weapon, 'text', text);
    } else {
        _.set(weapon, 'text', weapon.text + text);
    }
}
