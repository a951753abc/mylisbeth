const _ = require("lodash");
const config = require("../config.js");
const db = require("../../db.js");
const weapon = require("../weapon/weapon.js");
const roll = require("../roll.js");
const { getModifier } = require("../title/titleModifier.js");
const { increment } = require("../progression/statsTracker.js");

/**
 * 武器耐久損傷處理
 * @param {string} userId
 * @param {number} weaponIndex - 武器在 weaponStock 中的 index
 * @param {string} outcomeKey - "WIN" | "LOSE" | "DRAW"
 * @param {string|null} title - 玩家稱號
 * @param {object} thisWeapon - 武器物件（需 weaponName）
 * @returns {Promise<string>} durabilityText
 */
async function applyWeaponDurability(userId, weaponIndex, outcomeKey, title, thisWeapon) {
  const weaponDmgMod = getModifier(title, "advWeaponDmgChance");

  const damageChanceKey = outcomeKey === "WIN" ? "WIN" : outcomeKey === "LOSE" ? "DEAD" : "DRAW";
  const weaponCheck = roll.d100Check(
    Math.min(100, Math.round(config.WEAPON_DAMAGE_CHANCE[damageChanceKey] * weaponDmgMod)),
  );

  if (!weaponCheck) return "";

  const reduceDurability = roll.d6();
  const durPath = `weaponStock.${weaponIndex}.durability`;
  const updatedUser = await db.findOneAndUpdate(
    "user",
    { userId },
    { $inc: { [durPath]: -reduceDurability } },
    { returnDocument: "after" },
  );

  let durabilityText = `\n\n(激烈的戰鬥後，${thisWeapon.weaponName} 的耐久度減少了 ${reduceDurability} 點。)`;
  if (updatedUser.weaponStock[weaponIndex]?.durability <= 0) {
    durabilityText += `\n**${thisWeapon.weaponName} 爆發四散了！**`;
    await weapon.destroyWeapon(userId, weaponIndex);
    await increment(userId, "weaponsBroken");
  }

  return durabilityText;
}

/**
 * 樓層探索進度 +1
 * @param {string} userId
 * @param {object} user - 完整 user 文件
 * @param {number} currentFloor
 */
async function incrementFloorExploration(userId, user, currentFloor) {
  const floorProgressKey = `floorProgress.${currentFloor}.explored`;
  const maxExploreKey = `floorProgress.${currentFloor}.maxExplore`;
  const currentExplored = _.get(user, `floorProgress.${currentFloor}.explored`, 0);
  const maxExplore = _.get(user, `floorProgress.${currentFloor}.maxExplore`, config.FLOOR_MAX_EXPLORE);
  if (currentExplored < maxExplore) {
    await db.update(
      "user",
      { userId },
      { $inc: { [floorProgressKey]: 1 }, $set: { [maxExploreKey]: maxExplore } },
    );
  }
}

module.exports = { applyWeaponDurability, incrementFloorExploration };
