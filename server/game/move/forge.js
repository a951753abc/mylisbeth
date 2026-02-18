const _ = require("lodash");
const weapon = require("../weapon/weapon.js");
const db = require("../../db.js");
const level = require("../level");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");

const weaponLimit = 1;

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  const weaponLevel = _.get(user, "forceLevel", 1);
  if (_.get(user, "weaponStock", false)) {
    const filter = [
      { $match: { userId: user.userId } },
      { $project: { values: { $size: "$weaponStock" }, name: 1 } },
    ];
    const weaponNum = await db.aggregate("user", filter);
    const nowWeaponLimit = weaponLimit + weaponLevel;
    if (weaponNum[0].values >= nowWeaponLimit) {
      return {
        error:
          "無法製造武器 \n 目前武器數:" +
          weaponNum[0].values +
          " \n 武器儲存上限 " +
          nowWeaponLimit,
      };
    }
  }

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

  const item1 = user.itemStock[cmd[2]];
  const item2 = user.itemStock[cmd[3]];
  let decOk;
  if (cmd[2] === cmd[3]) {
    decOk = await db.atomicIncItem(
      user.userId,
      item1.itemId,
      item1.itemLevel,
      item1.itemName,
      -2,
    );
  } else {
    decOk = await db.atomicIncItem(
      user.userId,
      item1.itemId,
      item1.itemLevel,
      item1.itemName,
      -1,
    );
    if (decOk) {
      decOk = await db.atomicIncItem(
        user.userId,
        item2.itemId,
        item2.itemLevel,
        item2.itemName,
        -1,
      );
      if (!decOk) {
        await db.atomicIncItem(
          user.userId,
          item1.itemId,
          item1.itemLevel,
          item1.itemName,
          1,
        );
      }
    }
  }
  if (!decOk) {
    return { error: "素材已不足，無法鍛造。" };
  }

  if (thisWeapon.durability <= 0) {
    thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    await increment(user.userId, "weaponsBroken");
  } else {
    await db.update(
      "user",
      { userId: user.userId },
      { $push: { weaponStock: thisWeapon } },
    );
  }

  thisWeapon.text += await level(cmd[1], user);

  await increment(user.userId, "totalForges");
  await checkAndAward(user.userId);

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
