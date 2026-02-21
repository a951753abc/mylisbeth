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

module.exports = { deductPvpStamina, deductWagers, buildCombatMods };
