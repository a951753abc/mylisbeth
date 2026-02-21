const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { deductCol } = require("../economy/col.js");
const { calculateRarity } = require("../weapon/rarity.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { getModifier } = require("../title/titleModifier.js");
const { formatText, getText } = require("../textManager.js");

module.exports = async function (cmd, rawUser) {
  try {
    const user = await ensureUserFields(rawUser);

    // cmd: [null, "repair", weaponId, materialId]
    const weaponIndex = parseInt(cmd[2], 10);
    const matIndex = parseInt(cmd[3], 10);

    if (
      isNaN(weaponIndex) ||
      !user.weaponStock ||
      !user.weaponStock[weaponIndex]
    ) {
      return { error: getText("REPAIR.WEAPON_NOT_FOUND") };
    }
    if (
      isNaN(matIndex) ||
      !user.itemStock ||
      !user.itemStock[matIndex] ||
      user.itemStock[matIndex].itemNum <= 0
    ) {
      return { error: getText("REPAIR.MATERIAL_NOT_FOUND") };
    }

    const thisWeapon = user.weaponStock[weaponIndex];
    const thisMat = user.itemStock[matIndex];

    // 耐久已滿則拒絕
    const maxDurability = thisWeapon.maxDurability || 12;
    if (thisWeapon.durability >= maxDurability) {
      return {
        error: formatText("REPAIR.FULL_DURABILITY", { weaponName: thisWeapon.weaponName, current: thisWeapon.durability, max: maxDurability }),
      };
    }

    // 依稀有度計算費用（優先使用已儲存的稀有度，與 info.js 一致）
    const rarity = thisWeapon.rarity
      ? { id: thisWeapon.rarity, label: thisWeapon.rarityLabel }
      : calculateRarity(thisWeapon);
    const cost =
      config.COL_REPAIR_COST[rarity.id] || config.COL_REPAIR_COST.common;

    // 扣除 Col（不足則返回錯誤）
    const colSuccess = await deductCol(user.userId, cost);
    if (!colSuccess) {
      return {
        error: formatText("REPAIR.COL_INSUFFICIENT", { weaponName: thisWeapon.weaponName, rarity: rarity.label, cost }),
      };
    }

    // 消耗素材 1 個
    await db.atomicIncItem(
      user.userId,
      thisMat.itemId,
      thisMat.itemLevel,
      thisMat.itemName,
      -1,
    );

    // 判定修復成敗（套用 repairSuccess 稱號修正）
    const repairMod = getModifier(user.title || null, "repairSuccess");
    const effectiveSuccessRate = Math.min(99, Math.max(1, Math.round(config.REPAIR_SUCCESS_RATE * repairMod)));
    const success = roll.d100Check(effectiveSuccessRate);

    let repairAmount = 0;
    let resultText = "";

    if (success) {
      const forgeLevel = user.forgeLevel || 1;
      repairAmount = Math.min(
        thisMat.itemLevel * 2 + forgeLevel,
        maxDurability - thisWeapon.durability,
      );
      const durPath = `weaponStock.${weaponIndex}.durability`;
      await db.findOneAndUpdate(
        "user",
        { userId: user.userId },
        { $inc: { [durPath]: repairAmount } },
        { returnDocument: "after" },
      );
      resultText = formatText("REPAIR.SUCCESS", { weaponName: thisWeapon.weaponName, amount: repairAmount, cost });
    } else {
      resultText = formatText("REPAIR.FAILURE", { weaponName: thisWeapon.weaponName, cost });
    }

    return {
      success,
      repairAmount,
      cost,
      weaponName: thisWeapon.weaponName,
      text: resultText,
    };
  } catch (error) {
    console.error("修復武器時發生錯誤:", error);
    return { error: getText("REPAIR.UNKNOWN_ERROR") };
  }
};
