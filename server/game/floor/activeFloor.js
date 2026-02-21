const config = require("../config.js");

const TRAVEL = config.FLOOR_TRAVEL || { PROF_DECAY_PER_FLOOR: 0.25, PROF_MIN_MULT: 0 };

/**
 * 取得玩家實際活動樓層
 * activeFloor = null 代表在前線（= currentFloor）
 */
function getActiveFloor(user) {
  const active = user.activeFloor;
  const highest = user.currentFloor || 1;
  if (active == null || active > highest) return highest;
  return Math.max(1, active);
}

/**
 * 玩家是否在前線樓層
 */
function isAtFrontier(user) {
  return getActiveFloor(user) === (user.currentFloor || 1);
}

/**
 * 計算熟練度衰減倍率
 * 每差 1 層衰減 25%，差 4 層以上 = 0
 */
function getProficiencyMultiplier(user) {
  const diff = (user.currentFloor || 1) - getActiveFloor(user);
  if (diff <= 0) return 1;
  const mult = 1 - diff * TRAVEL.PROF_DECAY_PER_FLOOR;
  return Math.max(TRAVEL.PROF_MIN_MULT, mult);
}

module.exports = { getActiveFloor, isAtFrontier, getProficiencyMultiplier };
