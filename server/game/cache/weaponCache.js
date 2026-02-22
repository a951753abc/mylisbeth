/**
 * Weapon 配方快取 — 啟動時從 DB 載入一次，避免每次查詢都全表掃描
 *
 * weapon collection 是靜態配方資料（由 seed script 寫入），運行期間不會變動，
 * 因此快取一次即可。若未來需要動態更新，呼叫 reload() 即可重新載入。
 */
const db = require("../../db.js");

let _weapons = null;

async function load() {
  _weapons = await db.find("weapon", {});
  console.log(`[WeaponCache] 已載入 ${_weapons.length} 筆配方資料`);
}

function getAll() {
  if (!_weapons) {
    throw new Error("[WeaponCache] 尚未初始化，請先呼叫 load()");
  }
  return _weapons;
}

async function reload() {
  await load();
}

module.exports = { load, getAll, reload };
