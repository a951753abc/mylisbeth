/**
 * Item 資料快取 — 啟動時從 DB 載入一次，避免每次操作都全表掃描
 *
 * item collection 是靜態配置資料（由 seed script 寫入），運行期間不會變動，
 * 因此快取一次即可。若未來需要動態更新，呼叫 reload() 即可重新載入。
 */
const db = require("../../db.js");

let _items = null;

async function load() {
  _items = await db.find("item", {});
  console.log(`[ItemCache] 已載入 ${_items.length} 筆素材資料`);
}

function getAll() {
  if (!_items) {
    throw new Error("[ItemCache] 尚未初始化，請先呼叫 load()");
  }
  return _items;
}

async function reload() {
  await load();
}

module.exports = { load, getAll, reload };
