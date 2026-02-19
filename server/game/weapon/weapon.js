const _ = require("lodash");
const db = require("../../db.js");
const randWeapon = require("./category.json");
const roll = require("../roll.js");
const { getModifier, getRawModifier } = require("../title/titleModifier.js");

const weaponPer = ["hp", "atk", "def", "agi", "durability"];
const hpUp = [1, 5, 10, 15, 20, 25, 30, 35, 40];

// Season 2 floor items use string itemIds with mainStat from seed-season2.js
const FLOOR_ITEM_STATS = {
  mat_floor1_ore: "atk",
  mat_floor1_crystal: "def",
  mat_floor3_ore: "agi",
  mat_floor3_crystal: "hp",
  mat_floor5_ore: "atk",
  mat_floor5_crystal: "cri",
  mat_floor7_ore: "def",
  mat_floor7_crystal: "hp",
  mat_floor9_ore: "atk",
  mat_floor9_crystal: "agi",
};

function getStatName(itemId) {
  const idx = parseInt(itemId, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= weaponPer.length) {
    return weaponPer[idx - 1];
  }
  return (
    FLOOR_ITEM_STATS[itemId] ||
    weaponPer[Math.floor(Math.random() * weaponPer.length)]
  );
}

module.exports.buffWeapon = function (cmd, user) {
  const thisWeapon = user.weaponStock[cmd[2]];
  const forgeLevel = _.get(user, "forgeLevel", 1);
  const title = user.title || null;
  thisWeapon.text = "";
  const basePer = 20 + user.itemStock[cmd[3]].itemLevel * 5 + forgeLevel * 10;
  const per = Math.min(99, Math.max(1, Math.round(basePer * getModifier(title, "forgeBuffChance"))));
  let isBuff = false;
  if (roll.d100Check(per)) {
    let perName = getStatName(user.itemStock[cmd[3]].itemId);
    let statBoost = forgeLevel;
    if (perName === "hp") {
      statBoost = hpUp[roll.d6() - 1 + forgeLevel];
    }
    thisWeapon.text += "強化成功！\n";
    thisWeapon.text += perName;
    thisWeapon.text += " 提升" + statBoost + "點。 \n";
    thisWeapon[perName] += statBoost;
    thisWeapon.buff = _.get(thisWeapon, "buff", 0) + 1;
    isBuff = true;
  } else {
    thisWeapon.text += "武器強化失敗！\n";
  }
  if (isBuff) {
    return thisWeapon;
  }
  let durabilityCheck = 9 - forgeLevel;
  if (durabilityCheck < 3) {
    durabilityCheck = 2;
  }
  if (roll.d66() <= durabilityCheck) {
    let changeValue = roll.d6() - forgeLevel;
    if (changeValue <= 0) {
      changeValue = 1;
    }
    thisWeapon.durability -= changeValue;
    thisWeapon.text += "武器的耐久值下降:" + changeValue + "點\n";
  }
  return thisWeapon;
};

module.exports.createWeapon = async function (cmd, user) {
  const forceLevel = _.get(user, "forceLevel", 1);
  const title = user.title || null;
  const critFailExtra = getRawModifier(title, "forgeCritFailExtra") * 100; // 0.05 → 5
  const critSuccessAdj = getRawModifier(title, "forgeCritSuccessAdj"); // integer
  const query = {
    forge1: user.itemStock[cmd[2]].itemId,
    forge2: user.itemStock[cmd[3]].itemId,
  };
  let weapon = await db.findOne("weapon", query);
  if (!weapon) {
    weapon = _.clone(randWeapon[Math.floor(Math.random() * randWeapon.length)]);
  }
  weapon.weaponName = cmd[4];
  weapon.hp = 0;
  const baseDurability = roll.d66();
  const durMod = getModifier(title, "forgeDurability");
  weapon.durability = Math.max(1, Math.round(baseDurability * durMod));
  weapon.maxDurability = weapon.durability;
  weapon.text = "";
  weapon.text +=
    "使用" +
    user.itemStock[cmd[2]].itemName +
    "和" +
    user.itemStock[cmd[3]].itemName +
    "製作完成\n";

  if (cmd[2] === cmd[3]) {
    const per =
      20 +
      (user.itemStock[cmd[2]].itemLevel + user.itemStock[cmd[3]].itemLevel) * 5;
    if (roll.d100Check(per)) {
      const perName = getStatName(user.itemStock[cmd[2]].itemId);
      weapon.text += "強化成功！\n";
      weapon.text += perName;
      weapon.text += " 提升" + forceLevel + "點。 \n";
      weapon[perName] += forceLevel;
    }
  } else {
    let per = 20 + user.itemStock[cmd[2]].itemLevel * 5;
    if (roll.d100Check(per)) {
      const perName = getStatName(user.itemStock[cmd[2]].itemId);
      weapon.text += "強化成功！\n";
      weapon.text += perName;
      weapon.text += " 提升" + forceLevel + "點。 \n";
      weapon[perName] += forceLevel;
    }
    per = 20 + user.itemStock[cmd[3]].itemLevel * 5;
    if (roll.d100Check(per)) {
      const perName = getStatName(user.itemStock[cmd[3]].itemId);
      weapon.text += "強化成功！\n";
      weapon.text += perName;
      weapon.text += " 提升" + forceLevel + "點。 \n";
      weapon[perName] += forceLevel;
    }
  }

  let rollResult = roll.d66();
  // 大失敗：自然骰出 2，或額外機率觸發
  const isCritFail = rollResult === 2 || (rollResult > 2 && critFailExtra > 0 && roll.d100Check(critFailExtra));
  if (isCritFail) {
    changeWeapon(weapon, "fail");
    return weapon;
  }
  // 大成功門檻：基礎 10，正值代表更難觸發
  const critSuccessThresh = 10 + critSuccessAdj;
  while (rollResult >= critSuccessThresh) {
    changeWeapon(weapon, "success");
    rollResult = roll.d66();
  }
  return weapon;
};

function changeWeapon(weapon, type) {
  const per = weaponPer[Math.floor(Math.random() * weaponPer.length)];
  const changeValue = roll.d6();
  let text = "";
  if (type === "success") {
    text =
      weapon.name +
      "強化大成功！\n武器數值" +
      per +
      "提高" +
      changeValue +
      "\n";
    weapon[per] += changeValue;
  } else if (type === "fail") {
    text =
      weapon.name +
      "強化大失敗！\n武器數值" +
      per +
      "降低了" +
      changeValue +
      "\n";
    weapon[per] -= changeValue;
    if (weapon[per] < 0) {
      weapon[per] = 0;
    }
  }
  if (weapon.text === "武器製作完成") {
    weapon.text = text;
  } else {
    weapon.text += text;
  }
}

module.exports.destroyWeapon = async function (userId, weaponIndex) {
  const query = { userId };
  const weaponUnset = "weaponStock." + weaponIndex;
  const mod = { $unset: {} };
  mod["$unset"][weaponUnset] = 1;
  await db.update("user", query, mod);
  await db.update("user", query, { $pull: { weaponStock: null } });
};
