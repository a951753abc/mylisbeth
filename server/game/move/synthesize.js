"use strict";

const db = require("../../db.js");
const config = require("../config.js");
const ensureUserFields = require("../migration/ensureUserFields.js");
const { calculateRarity } = require("../weapon/rarity.js");
const { getWeaponLockError } = require("../weapon/weaponLock.js");
const { synthesizeWeapons } = require("../weapon/synthesis.js");

module.exports = async function (cmd, rawUser) {
  const user = await ensureUserFields(rawUser);

  // cmd = [null, "synthesize", { weaponIndex1, weaponIndex2, targetType }]
  const params = cmd[2];
  if (!params || typeof params !== "object") {
    return { error: "參數格式錯誤" };
  }

  const idx1 = parseInt(params.weaponIndex1, 10);
  const idx2 = parseInt(params.weaponIndex2, 10);
  const { targetType } = params;

  // 基本驗證
  if (!Number.isInteger(idx1) || !Number.isInteger(idx2) || idx1 < 0 || idx2 < 0) {
    return { error: "武器索引無效" };
  }
  if (idx1 === idx2) {
    return { error: "不能選擇同一把武器" };
  }

  // 鍛造等級檢查
  const forgeLevel = user.forgeLevel ?? 1;
  if (forgeLevel < config.FORGE_PERKS.SYNTHESIS_LEVEL) {
    return { error: `鍛造等級需達到 Lv${config.FORGE_PERKS.SYNTHESIS_LEVEL} 才能進行武器合成` };
  }

  // 武器存在檢查
  const weapons = user.weaponStock || [];
  if (!weapons[idx1]) {
    return { error: `找不到武器 #${idx1}` };
  }
  if (!weapons[idx2]) {
    return { error: `找不到武器 #${idx2}` };
  }

  // 武器鎖定檢查
  const lock1 = getWeaponLockError(user.hiredNpcs, idx1, user.activeExpedition);
  if (lock1) return { error: lock1 };
  const lock2 = getWeaponLockError(user.hiredNpcs, idx2, user.activeExpedition);
  if (lock2) return { error: lock2 };

  const weapon1 = weapons[idx1];
  const weapon2 = weapons[idx2];

  // 目標類型必須是兩把武器之一
  if (targetType !== weapon1.type && targetType !== weapon2.type) {
    return { error: "目標武器類型必須是兩把素材武器的類型之一" };
  }

  // 執行合成
  const { weapon: newWeapon, pool, retention } = synthesizeWeapons(weapon1, weapon2, targetType);

  // 計算稀有度（匹配 forge.js 存儲格式）
  const rarity = calculateRarity(newWeapon);
  const finalWeapon = {
    ...newWeapon,
    rarity: rarity.id,
    rarityLabel: rarity.label,
    rarityColor: rarity.color,
  };

  // 單次 $set 替換整個 weaponStock：移除兩把舊武器、新增新武器
  // move.js 的 5s cooldown 保證同一使用者不會有並行操作
  const newWeaponStock = weapons.filter((_, i) => i !== idx1 && i !== idx2);
  newWeaponStock.push(finalWeapon);

  await db.update(
    "user",
    { userId: user.userId },
    { $set: { weaponStock: newWeaponStock } },
  );

  return {
    success: true,
    weapon: finalWeapon,
    synthesis: {
      source1: { name: weapon1.weaponName || weapon1.name, type: weapon1.type },
      source2: { name: weapon2.weaponName || weapon2.name, type: weapon2.type },
      pool,
      retention: Math.round(retention * 100),
      fusionGen: finalWeapon.fusionGen,
    },
    text: `武器合成成功！${weapon1.weaponName || weapon1.name} + ${weapon2.weaponName || weapon2.name} → 【${rarity.label}】${finalWeapon.name}`,
  };
};
