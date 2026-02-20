const _ = require("lodash");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const level = require("../level");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { calculateRarity } = require("../weapon/rarity.js");
const config = require("../config.js");

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  if (!user.weaponStock || !user.weaponStock[cmd[2]]) {
    return { error: "錯誤！武器" + cmd[2] + " 不存在" };
  }
  if (!user.itemStock || !user.itemStock[cmd[3]]) {
    return { error: "錯誤！素材" + cmd[3] + " 不存在" };
  }
  if (user.itemStock[cmd[3]].itemNum < 1) {
    return { error: "錯誤！素材" + cmd[3] + " 數量不足" };
  }

  // 強化上限前置檢查（避免消耗素材後才發現已達上限）
  const currentBuff = _.get(user.weaponStock[cmd[2]], "buff", 0);
  if (currentBuff >= config.BUFF_MAX) {
    return { error: "這把武器已達強化上限（+" + config.BUFF_MAX + "），無法繼續強化。" };
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

  // Recalculate rarity based on updated stats
  const oldRarity = thisWeapon.rarity || null;
  const rarity = calculateRarity(thisWeapon);
  thisWeapon.rarity = rarity.id;
  thisWeapon.rarityLabel = rarity.label;
  thisWeapon.rarityColor = rarity.color;

  if (oldRarity && oldRarity !== rarity.id) {
    thisWeapon.text += "稀有度提升為 " + rarity.label + "！\n";
  }

  if (thisWeapon.durability <= 0) {
    thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    await weapon.destroyWeapon(user.userId, cmd[2]);
    await increment(user.userId, "weaponsBroken");
  } else {
    const weaponUnset = "weaponStock." + cmd[2];
    const mod = { $set: {} };
    mod["$set"][weaponUnset] = thisWeapon;
    await db.update("user", { userId: user.userId }, mod);
  }

  thisWeapon.text += await level("forge", user);

  await checkAndAward(user.userId);

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
      rarity: rarity.id,
      rarityLabel: rarity.label,
      rarityColor: rarity.color,
      totalScore: rarity.totalScore,
    },
    text: thisWeapon.text,
  };
};
