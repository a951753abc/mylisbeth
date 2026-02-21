const db = require("../../db.js");
const randWeapon = require("./category.json");
const roll = require("../roll.js");
const { getModifier, getRawModifier } = require("../title/titleModifier.js");
const config = require("../config.js");
const { rollInnateEffects } = require("./innateEffect.js");
const { resolveWeaponType } = require("./weaponType.js");
const { calcWeaponTypeWeights, selectWeaponType } = require("./weaponTypeAffinity.js");
const { checkForgeBonuses } = require("./forgeBonuses.js");
const { formatText, getText } = require("../textManager.js");

const weaponPer = ["hp", "atk", "def", "agi", "durability"];

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
  // 布料
  mat_fabric_silk: "hp",
  mat_fabric_tough: "def",
  // 皮革
  mat_leather_light: "agi",
  mat_leather_dragon: "def",
  // 寶石
  mat_gem_ruby: "atk",
  mat_gem_sapphire: "cri",
  mat_gem_emerald: "hp",
  mat_gem_diamond: "cri",
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

// cri 是暴擊門檻（2d6 >= cri 觸發暴擊），越低越容易暴擊
// 下限 5 防止無限暴擊迴圈（P(2d6>=5)≈83%，期望暴擊次數≈5）
const MIN_CRI = 5;

function applyStatBoost(weapon, perName, boost) {
  if (perName === "cri") {
    weapon.cri = Math.max(MIN_CRI, (weapon.cri || 10) - boost);
    return;
  }
  if (perName === "durability") {
    const oldMax = weapon.maxDurability || weapon.durability || 0;
    weapon.durability = (weapon.durability || 0) + boost;
    weapon.maxDurability = oldMax + boost;
    return;
  }
  weapon[perName] = (weapon[perName] || 0) + boost;
}

function getStatBoostText(perName, boost) {
  if (perName === "cri") {
    return formatText("FORGE.STAT_BOOST_CRI", { value: boost }) + "\n";
  }
  return formatText("FORGE.STAT_BOOST", { stat: perName, value: boost }) + "\n";
}

module.exports.buffWeapon = function (cmd, user) {
  const thisWeapon = user.weaponStock[cmd[2]];
  const forgeLevel = user.forgeLevel ?? 1;
  const title = user.title || null;
  const buffCount = thisWeapon.buff ?? 0;
  thisWeapon.text = "";

  // 強化上限檢查
  if (buffCount >= config.BUFF_MAX) {
    thisWeapon.text += formatText("FORGE.BUFF_MAX", { max: config.BUFF_MAX }) + "\n";
    return thisWeapon;
  }

  // 新成功率公式：20 + itemLevel*5 + forgeLevel*3 - buffCount*5
  const basePer = config.BUFF_BASE_CHANCE
    + user.itemStock[cmd[3]].itemLevel * 5
    + forgeLevel * config.BUFF_FORGE_LEVEL_MULT
    - buffCount * config.BUFF_COUNT_PENALTY;
  const per = Math.min(99, Math.max(1, Math.round(basePer * getModifier(title, "forgeBuffChance"))));
  let isBuff = false;
  if (roll.d100Check(per)) {
    let perName = getStatName(user.itemStock[cmd[3]].itemId);
    // 新屬性增益公式：max(1, round(forgeLevel * d66() / 7))，7 = 2d6 中位數
    let statBoost = Math.max(1, Math.round(forgeLevel * roll.d66() / 7));
    if (perName === "hp") {
      // HP 特殊處理：statBoost * 5
      statBoost = statBoost * config.BUFF_HP_MULTIPLIER;
    }
    thisWeapon.text += getText("FORGE.BUFF_SUCCESS") + "\n";
    thisWeapon.text += getStatBoostText(perName, statBoost);
    applyStatBoost(thisWeapon, perName, statBoost);
    thisWeapon.buff = buffCount + 1;
    isBuff = true;
  } else {
    thisWeapon.text += getText("FORGE.BUFF_FAIL") + "\n";
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
    thisWeapon.text += formatText("FORGE.DURABILITY_DOWN", { value: changeValue }) + "\n";
  }
  return thisWeapon;
};

module.exports.createWeapon = async function (materials, weaponName, user, options = {}) {
  const forgeLevel = user.forgeLevel ?? 1;
  const title = user.title || null;
  const critFailExtra = getRawModifier(title, "forgeCritFailExtra") * 100; // 0.05 → 5
  const critSuccessAdj = getRawModifier(title, "forgeCritSuccessAdj"); // integer

  // 配方查找限前 2 個素材
  const query = {
    forge1: materials[0].itemId,
    forge2: materials[1].itemId,
  };
  let weapon = await db.findOne("weapon", query);
  if (!weapon) {
    // 素材屬性加權武器類型選取（所有素材參與）
    const matStats = materials.map((m) => getStatName(m.itemId));
    const weights = calcWeaponTypeWeights(matStats);
    const selectedType = selectWeaponType(weights);
    const matched = randWeapon.find((w) => w.type === selectedType);
    weapon = { ...(matched || randWeapon[Math.floor(Math.random() * randWeapon.length)]) };
  }
  weapon.weaponName = weaponName || weapon.name;
  weapon.renameCount = 0;
  weapon.hp = 0;
  const baseDurability = roll.d66();
  const durMod = getModifier(title, "forgeDurability");
  weapon.durability = Math.max(1, Math.round(baseDurability * durMod));
  weapon.maxDurability = weapon.durability;
  weapon.text = "";
  const matNames = materials.map((m) => m.itemName).join("、");
  weapon.text += formatText("FORGE.CREATION_COMPLETE", { materials: matNames }) + "\n";

  // 每個素材獨立判定 stat boost
  const processed = new Set();
  for (let i = 0; i < materials.length; i++) {
    const matKey = `${materials[i].itemId}:${materials[i].itemLevel}`;
    if (processed.has(matKey)) {
      // 相同素材重複時，合併判定一次（使用疊加星級）
      continue;
    }
    // 找出所有相同素材
    const sameIndices = [];
    for (let j = i; j < materials.length; j++) {
      if (materials[j].itemId === materials[i].itemId && materials[j].itemLevel === materials[i].itemLevel) {
        sameIndices.push(j);
      }
    }
    processed.add(matKey);

    if (sameIndices.length > 1) {
      // 同素材多個：合計星級判定
      const totalLevel = sameIndices.reduce((sum, idx) => sum + materials[idx].itemLevel, 0);
      const per = 20 + totalLevel * 5;
      if (roll.d100Check(per)) {
        const perName = getStatName(materials[i].itemId);
        weapon.text += getText("FORGE.BUFF_SUCCESS") + "\n";
        weapon.text += getStatBoostText(perName, forgeLevel);
        applyStatBoost(weapon, perName, forgeLevel);
      }
    } else {
      const per = 20 + materials[i].itemLevel * 5;
      if (roll.d100Check(per)) {
        const perName = getStatName(materials[i].itemId);
        weapon.text += getText("FORGE.BUFF_SUCCESS") + "\n";
        weapon.text += getStatBoostText(perName, forgeLevel);
        applyStatBoost(weapon, perName, forgeLevel);
      }
    }
  }

  // 3+ 素材額外加成：每多 1 個素材 +1 隨機屬性 × floor(forgeLevel/2)
  if (materials.length > 2) {
    const extraCount = materials.length - 2;
    const bonusPerExtra = Math.max(1, Math.floor(forgeLevel / 2));
    for (let e = 0; e < extraCount; e++) {
      const randomStat = weaponPer[Math.floor(Math.random() * weaponPer.length)];
      applyStatBoost(weapon, randomStat, bonusPerExtra);
      weapon.text += formatText("FORGE.EXTRA_MATERIAL_BONUS", { stat: randomStat, value: bonusPerExtra }) + "\n";
    }
  }

  // 素材組合加成
  const comboResult = checkForgeBonuses(materials);
  if (comboResult.bonuses.length > 0) {
    for (const b of comboResult.bonuses) {
      applyStatBoost(weapon, b.stat, b.value);
    }
    weapon.text += formatText("FORGE.COMBO_BONUS", { text: comboResult.text }) + "\n";
  }

  let rollResult = roll.d66();
  // 大失敗：自然骰出 2，或額外機率觸發（鍛造靈感可免除大失敗）
  const isCritFail = rollResult === 2 || (rollResult > 2 && critFailExtra > 0 && roll.d100Check(critFailExtra));
  if (isCritFail && !options.forgeInspiration) {
    changeWeapon(weapon, "fail");
    return weapon;
  }

  // 鍛造靈感：保證 1 次大成功（流浪鍛冶師事件 buff），且免除大失敗
  if (options.forgeInspiration) {
    changeWeapon(weapon, "success");
    weapon.text += getText("FORGE.INSPIRATION") + "\n";
  }

  // 大成功門檻：基礎 10，正值代表更難觸發
  const critSuccessThresh = 10 + critSuccessAdj;
  while (rollResult >= critSuccessThresh) {
    changeWeapon(weapon, "success");
    rollResult = roll.d66();
  }

  // 素材類型特殊加成
  let innateChanceBonus = 0;
  for (const mat of materials) {
    const matType = mat.materialType || "";
    if (matType === "fabric" || matType === "leather") {
      // 布料/皮革：耐久 +2
      applyStatBoost(weapon, "durability", 2);
      weapon.text += formatText("FORGE.FABRIC_DURABILITY", { name: mat.itemName, type: matType === "fabric" ? "布料" : "皮革" }) + "\n";
    } else if (matType === "gem") {
      // 寶石：固有效果觸發機率 +5%
      innateChanceBonus += 5;
      weapon.text += formatText("FORGE.GEM_INNATE", { name: mat.itemName }) + "\n";
    }
  }

  // Season 9: 武器類型 + 固有效果
  const weaponType = resolveWeaponType(weapon);
  if (weaponType) {
    weapon.type = weaponType;
  }
  const innateResults = rollInnateEffects(weapon, weaponType, forgeLevel, { innateChanceBonus });
  if (innateResults.length > 0) {
    const innateNames = innateResults.map((e) => e.name).join("、");
    weapon.text += formatText("FORGE.INNATE_EFFECT", { names: innateNames }) + "\n";
  }

  return weapon;
};

function changeWeapon(weapon, type) {
  const per = weaponPer[Math.floor(Math.random() * weaponPer.length)];
  const changeValue = roll.d6();
  let text = "";
  if (type === "success") {
    text = formatText("FORGE.CRIT_SUCCESS", { name: weapon.name, stat: per, value: changeValue }) + "\n";
    weapon[per] += changeValue;
    if (per === "durability") {
      weapon.maxDurability = (weapon.maxDurability || 0) + changeValue;
    }
  } else if (type === "fail") {
    text = formatText("FORGE.CRIT_FAIL", { name: weapon.name, stat: per, value: changeValue }) + "\n";
    weapon[per] -= changeValue;
    if (weapon[per] < 0) {
      weapon[per] = 0;
    }
    if (per === "durability") {
      weapon.maxDurability = Math.max(0, (weapon.maxDurability || 0) - changeValue);
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
