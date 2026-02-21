const db = require("../../db.js");
const config = require("../config.js");
const { awardCol, deductCol } = require("../economy/col.js");
const { getCombinedModifier } = require("../title/titleModifier.js");

const PVP = config.PVP;

/**
 * 骰出 PvP 體力消耗並原子扣除
 * @param {string} userId
 * @returns {Promise<{ ok: boolean, staminaCost?: number, stamina?: number, error?: string }>}
 */
async function deductPvpStamina(userId) {
  const staminaCost = PVP.STAMINA_COST.min + Math.floor(Math.random() * (PVP.STAMINA_COST.max - PVP.STAMINA_COST.min + 1));
  const staminaUpdated = await db.findOneAndUpdate(
    "user",
    { userId, stamina: { $gte: staminaCost } },
    { $inc: { stamina: -staminaCost } },
    { returnDocument: "after" },
  );
  if (!staminaUpdated) {
    const freshAtk = await db.findOne("user", { userId });
    return { ok: false, error: `體力不足！決鬥需要 ${staminaCost} 點，目前剩餘 ${freshAtk?.stamina ?? 0} 點。` };
  }
  return { ok: true, staminaCost, stamina: staminaUpdated.stamina };
}

/**
 * 扣除雙方賭注，失敗時自動回滾（退還攻擊方賭注 + 體力）
 * @param {string} attackerId
 * @param {string} defenderId
 * @param {string} defenderName
 * @param {number} wagerCol
 * @param {number} staminaCost - 用於回滾時退還體力
 * @param {string} mode - 決鬥模式
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function deductWagers(attackerId, defenderId, defenderName, wagerCol, staminaCost, mode) {
  const MODES = PVP.MODES;
  if (mode === MODES.TOTAL_LOSS || wagerCol <= 0) return { ok: true };

  const atkDeducted = await deductCol(attackerId, wagerCol);
  if (!atkDeducted) {
    await db.update("user", { userId: attackerId }, { $inc: { stamina: staminaCost } });
    return { ok: false, error: `你的 Col 不足以支付 ${wagerCol} 的賭注。` };
  }
  const defDeducted = await deductCol(defenderId, wagerCol);
  if (!defDeducted) {
    await awardCol(attackerId, wagerCol);
    await db.update("user", { userId: attackerId }, { $inc: { stamina: staminaCost } });
    return { ok: false, error: `${defenderName} 的 Col 不足以支付 ${wagerCol} 的賭注，決鬥取消。` };
  }
  return { ok: true };
}

/**
 * 構建戰鬥修正物件（稱號 + 聖遺物合併修正）
 * @param {string|null} title
 * @param {Array} relics
 * @returns {{ battleAtk: number, battleDef: number, battleAgi: number }}
 */
function buildCombatMods(title, relics) {
  return {
    battleAtk: getCombinedModifier(title, relics, "battleAtk"),
    battleDef: getCombinedModifier(title, relics, "battleDef"),
    battleAgi: getCombinedModifier(title, relics, "battleAgi"),
  };
}

/**
 * 共用決鬥前驗證：負債、模式、武器、賭注
 * @param {object} attacker - 攻擊方 user document
 * @param {*} weaponId - 武器 index（raw）
 * @param {string} mode - 決鬥模式
 * @param {number} wagerCol - 賭注金額
 * @returns {{ error?: string, atkWeaponIndex?: number }}
 */
function validateDuelRequest(attacker, weaponId, mode, wagerCol) {
  const MODES = PVP.MODES;
  const VALID_MODES = new Set(Object.values(MODES));

  if (attacker.isInDebt) {
    return { error: "你目前有未清還的負債，無法發起決鬥！請先至帳單頁面還清負債。" };
  }
  if (!VALID_MODES.has(mode)) {
    return { error: "無效的決鬥模式。" };
  }
  if (weaponId === undefined || weaponId === null) {
    return { error: "請選擇要使用的武器。" };
  }
  const atkWeaponIndex = Number(weaponId);
  if (Number.isNaN(atkWeaponIndex) || !attacker.weaponStock?.[atkWeaponIndex]) {
    return { error: `錯誤！你沒有編號為 ${weaponId} 的武器。` };
  }

  if (mode !== MODES.TOTAL_LOSS) {
    if (!Number.isFinite(wagerCol) || wagerCol < PVP.WAGER_MIN) {
      return { error: `賭注不能低於 ${PVP.WAGER_MIN} Col。` };
    }
    if (wagerCol > PVP.WAGER_MAX) {
      return { error: `賭注不能超過 ${PVP.WAGER_MAX} Col。` };
    }
    if (wagerCol > 0 && (attacker.col || 0) < wagerCol) {
      return { error: `你的 Col 不足以支付 ${wagerCol} 的賭注。` };
    }
  }

  return { atkWeaponIndex };
}

/**
 * 計算賭注制勝利的獎金與稅金
 * @param {number} wagerCol - 賭注金額
 * @returns {{ payout: number, tax: number }}
 */
function calcWagerPayout(wagerCol) {
  const payout = Math.floor(wagerCol * 2 * (1 - PVP.WAGER_TAX));
  const tax = wagerCol * 2 - payout;
  return { payout, tax };
}

module.exports = { deductPvpStamina, deductWagers, buildCombatMods, validateDuelRequest, calcWagerPayout };
