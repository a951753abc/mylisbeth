const config = require("../config.js");

// 注意：不在模組層快取 config 的 primitive 值，
// 以確保 GM 後台的 runtime config override 能即時生效。

/**
 * 計算從 startTime 到 now 之間經過的遊戲天數
 * @param {number} startTime - 開始時間（毫秒時間戳）
 * @param {number} [now] - 當前時間（毫秒時間戳），預設 Date.now()
 * @returns {number}
 */
function getGameDaysSince(startTime, now = Date.now()) {
  if (!startTime) return 0;
  return Math.floor((now - startTime) / config.TIME_SCALE);
}

/**
 * 取得全域遊戲日（以伺服器啟動紀元為基準，用於酒館種子）
 * @param {number} [now]
 * @returns {number}
 */
function getCurrentGameDay(now = Date.now()) {
  const EPOCH = new Date("2026-01-01T00:00:00Z").getTime();
  return Math.floor((now - EPOCH) / config.TIME_SCALE);
}

/**
 * 判斷是否到結算日
 * @param {number|null} nextSettlementAt - 下次結算時間戳
 * @param {number} [now]
 * @returns {boolean}
 */
function isSettlementDue(nextSettlementAt, now = Date.now()) {
  if (!nextSettlementAt) return false;
  return now >= nextSettlementAt;
}

/**
 * 計算下次結算時間（從 lastSettlementAt 起算 SETTLEMENT_INTERVAL 個遊戲日後）
 * @param {number} lastSettlementAt
 * @returns {number}
 */
function getNextSettlementTime(lastSettlementAt) {
  return lastSettlementAt + config.SETTLEMENT.INTERVAL_GAME_DAYS * config.TIME_SCALE;
}

/**
 * 判斷是否在新手保護期內
 * @param {number|null} gameCreatedAt - 建角時間
 * @param {number} [now]
 * @returns {boolean}
 */
function isNewbie(gameCreatedAt, now = Date.now()) {
  if (!gameCreatedAt) return false;
  const daysSinceCreation = getGameDaysSince(gameCreatedAt, now);
  return daysSinceCreation < config.NEWBIE_PROTECTION_DAYS;
}

module.exports = {
  getGameDaysSince,
  getCurrentGameDay,
  isSettlementDue,
  getNextSettlementTime,
  isNewbie,
};
