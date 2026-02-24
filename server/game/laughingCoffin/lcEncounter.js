const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const { getLcState } = require("./lcState.js");
const { getActiveFloor } = require("../floor/activeFloor.js");

const LC_CFG = config.LAUGHING_COFFIN_GUILD;
const TRIGGER_ACTIONS = ["mine", "soloAdv", "adv"];

/**
 * 檢查是否在 LC 據點樓層觸發據點發現事件
 * @param {string} userId
 * @param {string} actionType - "mine" | "soloAdv" | "adv" 等
 * @returns {object|null} 遭遇結果（null = 未觸發）
 */
async function checkLcEncounter(userId, actionType) {
  if (!TRIGGER_ACTIONS.includes(actionType)) return null;

  const lc = await getLcState();
  if (!lc || !lc.active || lc.disbanded) return null;

  const user = await db.findOne("user", { userId });
  if (!user) return null;

  // 已有待處理的遭遇，不重複觸發
  if (user.pendingLcEncounter) return null;

  const activeFloor = getActiveFloor(user);
  if (activeFloor !== lc.baseFloor) return null;

  // 機率判定
  if (!roll.d100Check(LC_CFG.ENCOUNTER_CHANCE)) return null;

  // 設定 pendingLcEncounter
  const encounter = { baseFloor: lc.baseFloor, discoveredAt: Date.now() };
  await db.update("user", { userId }, {
    $set: { pendingLcEncounter: encounter },
  });

  return {
    type: "lc_base_discovered",
    baseFloor: lc.baseFloor,
  };
}

module.exports = { checkLcEncounter };
