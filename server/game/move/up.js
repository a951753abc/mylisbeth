const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const level = require("../level");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { calculateRarity } = require("../weapon/rarity.js");
const { getWeaponLockError } = require("../weapon/weaponLock.js");
const config = require("../config.js");
const { formatText, getText } = require("../textManager.js");

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  // 索引型別安全檢查
  const weaponIdx = parseInt(cmd[2], 10);
  const materialIdx = parseInt(cmd[3], 10);
  if (!Number.isInteger(weaponIdx) || weaponIdx < 0) {
    return { error: getText("UPGRADE.INVALID_WEAPON_INDEX") };
  }
  if (!Number.isInteger(materialIdx) || materialIdx < 0) {
    return { error: getText("UPGRADE.INVALID_MATERIAL_INDEX") };
  }

  if (!user.weaponStock || !user.weaponStock[weaponIdx]) {
    return { error: formatText("UPGRADE.WEAPON_NOT_FOUND", { index: weaponIdx }) };
  }

  // 檢查是否被 NPC 裝備中
  const lockError = getWeaponLockError(user.hiredNpcs, weaponIdx);
  if (lockError) return { error: lockError };

  if (!user.itemStock || !user.itemStock[materialIdx]) {
    return { error: formatText("UPGRADE.MATERIAL_NOT_FOUND", { index: materialIdx }) };
  }
  if (user.itemStock[materialIdx].itemNum < 1) {
    return { error: formatText("UPGRADE.MATERIAL_INSUFFICIENT", { index: materialIdx }) };
  }

  // 強化上限前置檢查（避免消耗素材後才發現已達上限）
  const currentBuff = user.weaponStock[weaponIdx]?.buff ?? 0;
  if (currentBuff >= config.BUFF_MAX) {
    return { error: formatText("FORGE.BUFF_MAX", { max: config.BUFF_MAX }) };
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
    return { error: getText("UPGRADE.MATERIAL_DEDUCTION_FAILED") };
  }

  // Recalculate rarity based on updated stats
  const oldRarity = thisWeapon.rarity || null;
  const rarity = calculateRarity(thisWeapon);
  thisWeapon.rarity = rarity.id;
  thisWeapon.rarityLabel = rarity.label;
  thisWeapon.rarityColor = rarity.color;

  if (oldRarity && oldRarity !== rarity.id) {
    thisWeapon.text += formatText("FORGE.RARITY_UP", { rarity: rarity.label }) + "\n";
  }

  // 素材強化紀錄書：記錄成功強化的素材→屬性（僅已知素材，跳過隨機 fallback）
  let newStatDiscovery = null;
  const buffedStat = thisWeapon.buffedStat;
  delete thisWeapon.buffedStat; // 清除暫存欄位，避免寫入武器文件
  const statBookLevel = config.FORGE_PERKS?.STAT_BOOK_LEVEL ?? 3;
  if (buffedStat && (user.forgeLevel ?? 1) >= statBookLevel) {
    const matId = material.itemId;
    // 原子寫入：只在尚未記錄時標記為新發現
    const fieldPath = `materialStatBook.${matId}`;
    const inserted = await db.findOneAndUpdate(
      "user",
      { userId: user.userId, [fieldPath]: { $exists: false } },
      { $set: { [fieldPath]: buffedStat } },
    );
    if (inserted) {
      newStatDiscovery = { itemId: matId, itemName: material.itemName, stat: buffedStat };
    } else {
      // 已存在，仍覆蓋（確保資料一致）
      await db.update("user", { userId: user.userId }, {
        $set: { [fieldPath]: buffedStat },
      });
    }
  }

  if (thisWeapon.durability <= 0) {
    thisWeapon.text += formatText("FORGE.WEAPON_BROKEN", { weaponName: thisWeapon.weaponName });
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

  const result = {
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
  if (newStatDiscovery) {
    result.newStatDiscovery = newStatDiscovery;
  }
  return result;
};
