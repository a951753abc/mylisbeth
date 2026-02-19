const db = require("../../db.js");
const config = require("../config.js");
const { d6 } = require("../roll.js");

const STAMINA_ACTIONS = new Set(["mine", "forge", "repair"]);

/**
 * 骰出隨機體力消耗值
 * mine: 1~6 (d6), forge: 3~8 (d6+2), repair: 1~5 (max(1, d6-1))
 * @param {string} action
 * @returns {number}
 */
function rollStaminaCost(action) {
  const roll = d6();
  if (action === "mine")   return roll;             // 1~6
  if (action === "forge")  return roll + 2;         // 3~8
  if (action === "repair") return Math.max(1, roll - 1); // 1~5
  return 0;
}

/**
 * 依遊戲天數原子回復體力，精確追蹤時間戳防止漂移
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function regenStamina(userId) {
  const user = await db.findOne("user", { userId });
  if (!user) return;

  const now = Date.now();
  const maxStamina = user.maxStamina ?? config.STAMINA.MAX;

  // 舊帳號尚未遷移：直接初始化為滿體力
  if (user.stamina === undefined || user.stamina === null) {
    await db.update("user", { userId }, {
      $set: {
        stamina: maxStamina,
        maxStamina,
        lastStaminaRegenAt: now,
      },
    });
    return;
  }

  // 遷移使用者可能缺少 lastStaminaRegenAt，需初始化
  if (user.lastStaminaRegenAt == null) {
    await db.update("user", { userId }, {
      $set: { lastStaminaRegenAt: now },
    });
    return;
  }

  const lastRegen = user.lastStaminaRegenAt;
  const elapsed = now - lastRegen;
  const gameDays = Math.floor(elapsed / config.TIME_SCALE);
  if (gameDays <= 0) return;

  const currentStamina = user.stamina;
  if (currentStamina >= maxStamina) {
    // 體力已滿，僅更新時間戳
    await db.update("user", { userId }, {
      $set: { lastStaminaRegenAt: lastRegen + gameDays * config.TIME_SCALE },
    });
    return;
  }

  const recovered = gameDays * config.STAMINA.RECOVERY_PER_GAME_DAY;
  const newStamina = Math.min(currentStamina + recovered, maxStamina);

  await db.update("user", { userId }, {
    $set: {
      stamina: newStamina,
      lastStaminaRegenAt: lastRegen + gameDays * config.TIME_SCALE,
    },
  });
}

/**
 * 主入口：回復 → 骰消耗 → 原子扣除
 * 非受影響行動直接回傳 { ok: true }
 * @param {string} userId
 * @param {string} action
 * @returns {Promise<{ ok: boolean, cost?: number, stamina?: number, error?: string }>}
 */
async function checkAndConsumeStamina(userId, action) {
  if (!STAMINA_ACTIONS.has(action)) {
    return { ok: true };
  }

  // 先執行自然回復
  await regenStamina(userId);

  const cost = rollStaminaCost(action);
  const maxStamina = config.STAMINA.MAX;

  // 原子扣除：只有體力足夠才成功
  const updated = await db.findOneAndUpdate(
    "user",
    { userId, stamina: { $gte: cost } },
    { $inc: { stamina: -cost } },
    { returnDocument: "after" },
  );

  if (!updated) {
    // 體力不足：讀取當前體力以顯示剩餘值
    const user = await db.findOne("user", { userId });
    const current = user?.stamina ?? 0;
    return {
      ok: false,
      error: `體力不足！需要 ${cost} 點，目前剩餘 ${current} 點（每 5 分鐘自然回復 ${config.STAMINA.RECOVERY_PER_GAME_DAY} 點）`,
    };
  }

  return {
    ok: true,
    cost,
    stamina: Math.max(0, (updated.stamina ?? maxStamina)),
    lastStaminaRegenAt: updated.lastStaminaRegenAt ?? null,
  };
}

module.exports = { rollStaminaCost, regenStamina, checkAndConsumeStamina };
