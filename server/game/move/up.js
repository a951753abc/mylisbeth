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

  // 索引型別安全檢查
  const weaponIdx = parseInt(cmd[2], 10);
  const materialIdx = parseInt(cmd[3], 10);
  if (!Number.isInteger(weaponIdx) || weaponIdx < 0) {
    return { error: "無效的武器索引" };
  }
  if (!Number.isInteger(materialIdx) || materialIdx < 0) {
    return { error: "無效的素材索引" };
  }

  if (!user.weaponStock || !user.weaponStock[weaponIdx]) {
    return { error: "錯誤！武器" + weaponIdx + " 不存在" };
  }
  if (!user.itemStock || !user.itemStock[materialIdx]) {
    return { error: "錯誤！素材" + materialIdx + " 不存在" };
  }
  if (user.itemStock[materialIdx].itemNum < 1) {
    return { error: "錯誤！素材" + materialIdx + " 數量不足" };
  }

  // 強化上限前置檢查（避免消耗素材後才發現已達上限）
  const currentBuff = user.weaponStock[weaponIdx]?.buff ?? 0;
  if (currentBuff >= config.BUFF_MAX) {
    return { error: "這把武器已達強化上限（+" + config.BUFF_MAX + "），無法繼續強化。" };
  }

  const safeCmd = [cmd[0], cmd[1], weaponIdx, materialIdx];
  const thisWeapon = weapon.buffWeapon(safeCmd, user);

  const material = user.itemStock[materialIdx];
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
    await weapon.destroyWeapon(user.userId, weaponIdx);
    await increment(user.userId, "weaponsBroken");
  } else {
    const weaponUnset = "weaponStock." + weaponIdx;
    const mod = { $set: {} };
    mod["$set"][weaponUnset] = thisWeapon;
    await db.update("user", { userId: user.userId }, mod);
  }

  thisWeapon.text += await level("forge", user);

  await checkAndAward(user.userId);

  let weaponName = thisWeapon.weaponName;
  if (thisWeapon.buff) {
    weaponName = weaponName + "+" + thisWeapon.buff;
  }

  return {
    weapon: {
      weaponName,
      name: thisWeapon.name,
      weaponIndex: weaponIdx,
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
