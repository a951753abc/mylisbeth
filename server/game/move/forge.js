const weapon = require("../weapon/weapon.js");
const db = require("../../db.js");
const level = require("../level");
const { increment } = require("../progression/statsTracker.js");
const { checkAndAward } = require("../progression/achievement.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { calculateRarity } = require("../weapon/rarity.js");

const config = require("../config.js");
const weaponLimit = config.INITIAL_WEAPON_LIMIT;

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  // 負債禁止鍛造
  if (user.isInDebt) {
    return { error: "你目前有未清還的負債，無法進行鍛造！請先至帳單頁面還清負債。" };
  }

  const weaponLevel = user.forgeLevel ?? 1;
  if (user.weaponStock) {
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

  // cmd[2] = materials array (indices), cmd[3] = weaponName
  const materialIndices = Array.isArray(cmd[2]) ? cmd[2] : [cmd[2], cmd[3]];
  const weaponName = Array.isArray(cmd[2]) ? cmd[3] : cmd[4];

  if (materialIndices.length < 2 || materialIndices.length > 4) {
    return { error: "鍛造需要 2~4 個素材" };
  }

  // 驗證所有素材索引
  for (const idx of materialIndices) {
    if (!user.itemStock || !user.itemStock[idx]) {
      return { error: "錯誤！素材 " + idx + " 不存在" };
    }
  }

  // 統計每個索引使用次數
  const usageCounts = {};
  for (const idx of materialIndices) {
    usageCounts[idx] = (usageCounts[idx] || 0) + 1;
  }

  // 檢查數量是否足夠
  for (const [idx, count] of Object.entries(usageCounts)) {
    if (user.itemStock[idx].itemNum < count) {
      return { error: "錯誤！素材 " + idx + " 數量不足（需要 " + count + " 個）" };
    }
  }

  // 武器名稱驗證
  if (weaponName !== undefined && weaponName !== null && String(weaponName).trim().length > 0) {
    if (String(weaponName).length > 20) {
      return { error: "武器名稱不得超過 20 個字" };
    }
  }

  // 原子扣除素材（逐一扣除，失敗時回滾已扣除的）
  const deducted = [];
  let decOk = true;
  for (const [idx, count] of Object.entries(usageCounts)) {
    const item = user.itemStock[idx];
    const result = await db.atomicIncItem(
      user.userId, item.itemId, item.itemLevel, item.itemName, -count,
    );
    if (result) {
      deducted.push({ idx, count, item });
    } else {
      decOk = false;
      break;
    }
  }

  // 扣除失敗：回滾所有已扣除的素材
  if (!decOk) {
    for (const d of deducted) {
      await db.atomicIncItem(user.userId, d.item.itemId, d.item.itemLevel, d.item.itemName, d.count);
    }
    return { error: "素材已不足，無法鍛造。" };
  }

  // 組裝 materials 物件陣列（傳給 createWeapon）
  const materials = materialIndices.map((idx) => user.itemStock[idx]);

  // 鍛造靈感 buff（流浪鍛冶師事件）— 素材扣除成功後才消耗
  const hasInspiration = user.forgeInspiration || false;
  const thisWeapon = await weapon.createWeapon(materials, weaponName, user, { forgeInspiration: hasInspiration });
  if (hasInspiration) {
    await db.update("user", { userId: user.userId }, { $set: { forgeInspiration: false } });
  }

  const rarity = calculateRarity(thisWeapon);
  thisWeapon.rarity = rarity.id;
  thisWeapon.rarityLabel = rarity.label;
  thisWeapon.rarityColor = rarity.color;

  let weaponIndex = -1;
  if (thisWeapon.durability <= 0) {
    thisWeapon.text += thisWeapon.weaponName + " 爆發四散了。";
    await increment(user.userId, "weaponsBroken");
  } else {
    const updated = await db.findOneAndUpdate(
      "user",
      { userId: user.userId },
      { $push: { weaponStock: thisWeapon } },
      { returnDocument: "after" },
    );
    if (updated && updated.weaponStock) {
      weaponIndex = updated.weaponStock.length - 1;
    }
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
      rarity: rarity.id,
      rarityLabel: rarity.label,
      rarityColor: rarity.color,
      totalScore: rarity.totalScore,
      renameCount: thisWeapon.renameCount || 0,
      weaponIndex,
    },
    text: thisWeapon.text,
  };
};
