const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { deductCol } = require("../economy/col.js");
const { calculateRarity } = require("../weapon/rarity.js");
const ensureUserFields = require("../migration/ensureUserFields.js");

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
      return { error: "武器不存在！" };
    }
    if (
      isNaN(matIndex) ||
      !user.itemStock ||
      !user.itemStock[matIndex] ||
      user.itemStock[matIndex].itemNum <= 0
    ) {
      return { error: "素材不存在或數量不足！" };
    }

    const thisWeapon = user.weaponStock[weaponIndex];
    const thisMat = user.itemStock[matIndex];

    // 耐久已滿則拒絕
    const maxDurability = thisWeapon.maxDurability || 12;
    if (thisWeapon.durability >= maxDurability) {
      return {
        error: `${thisWeapon.weaponName} 的耐久度已滿（${thisWeapon.durability}/${maxDurability}），無需修復！`,
      };
    }

    // 依稀有度計算費用
    const rarity = calculateRarity(thisWeapon);
    const cost =
      config.COL_REPAIR_COST[rarity.id] || config.COL_REPAIR_COST.common;

    // 扣除 Col（不足則返回錯誤）
    const colSuccess = await deductCol(user.userId, cost);
    if (!colSuccess) {
      return {
        error: `Col 不足！修復 ${thisWeapon.weaponName}（${rarity.label}）需要 ${cost} Col。`,
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

    // 判定修復成敗
    const success = roll.d100Check(config.REPAIR_SUCCESS_RATE);

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
      resultText = `修復成功！${thisWeapon.weaponName} 的耐久度恢復了 ${repairAmount} 點。（消耗 ${cost} Col）`;
    } else {
      resultText = `修復失敗！${thisWeapon.weaponName} 的耐久度沒有恢復。（消耗 ${cost} Col 及素材）`;
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
    return { error: "修復過程中發生了未知錯誤，請稍後再試。" };
  }
};
