/**
 * 武器鎖定檢查 — NPC 裝備中的武器禁止操作
 *
 * 當武器被任何 NPC 裝備時，禁止以下操作：
 * - 出售（sell）、丟棄（discard）、上架（market list）
 * - 強化（upgrade）、修復（repair）、改名（rename）
 */

/**
 * 檢查指定武器是否被 NPC 裝備中，若是則回傳錯誤訊息
 * @param {Array} hiredNpcs - user.hiredNpcs
 * @param {number} weaponIndex - weaponStock 陣列索引
 * @returns {string|null} 錯誤訊息，null 表示未鎖定
 */
function getWeaponLockError(hiredNpcs, weaponIndex) {
  if (!hiredNpcs || !Array.isArray(hiredNpcs)) return null;

  const idx = Number(weaponIndex);
  const npc = hiredNpcs.find((n) => n.equippedWeaponIndex != null && Number(n.equippedWeaponIndex) === idx);
  if (!npc) return null;

  if (npc.mission) {
    return `該武器正由【${npc.name}】攜帶執行任務中，任務結束前無法操作`;
  }
  return `該武器正被【${npc.name}】裝備中，請先卸除`;
}

module.exports = { getWeaponLockError };
