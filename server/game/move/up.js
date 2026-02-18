const _ = require("lodash");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const level = require("../level");

module.exports = async function (cmd, user) {
  // 修復: 使用陣列索引檢查而非 `in` 運算子
  if (!user.weaponStock || !user.weaponStock[cmd[2]]) {
    return { error: "錯誤！武器" + cmd[2] + " 不存在" };
  }
  if (!user.itemStock || !user.itemStock[cmd[3]]) {
    return { error: "錯誤！素材" + cmd[3] + " 不存在" };
  }
  if (user.itemStock[cmd[3]].itemNum < 1) {
    return { error: "錯誤！素材" + cmd[3] + " 數量不足" };
  }

  const thisWeapon = weapon.buffWeapon(cmd, user);

  const material = user.itemStock[cmd[3]];
  const decOk = await db.atomicIncItem(
    user.userId,
    material.itemId,
    material.itemLevel,
    material.itemName,
    -1,
  );
  if (!decOk) {
    return { error: "素材已不足，無法強化。" };
  }

  if (thisWeapon.durability <= 0) {
    thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    await weapon.destroyWeapon(user.userId, cmd[2]);
  } else {
    const weaponUnset = "weaponStock." + cmd[2];
    const mod = { $set: {} };
    mod["$set"][weaponUnset] = thisWeapon;
    await db.update("user", { userId: user.userId }, mod);
  }

  thisWeapon.text += await level("forge", user);

  let weaponName = thisWeapon.weaponName;
  if (_.get(thisWeapon, "buff", false)) {
    weaponName = weaponName + "+" + thisWeapon.buff;
  }

  return {
    weapon: {
      weaponName,
      name: thisWeapon.name,
      weaponIndex: cmd[2],
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
