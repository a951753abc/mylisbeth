/**
 * 武器鎖定檢查 — NPC 裝備中或遠征中的武器禁止操作
 *
 * 當武器被任何 NPC 裝備或正在遠征中時，禁止以下操作：
 * - 出售（sell）、丟棄（discard）、上架（market list）
 * - 強化（upgrade）、修復（repair）、改名（rename）
 * - 存入倉庫
 */

const { getText } = require("../textManager.js");

/**
 * 檢查指定武器是否被 NPC 裝備中或遠征中，若是則回傳錯誤訊息
 * @param {Array} hiredNpcs - user.hiredNpcs
 * @param {number} weaponIndex - weaponStock 陣列索引
 * @param {object|null} activeExpedition - user.activeExpedition
 * @returns {string|null} 錯誤訊息，null 表示未鎖定
 */
function getWeaponLockError(hiredNpcs, weaponIndex, activeExpedition) {
  const idx = Number(weaponIndex);

  // 遠征鎖定檢查
  if (activeExpedition) {
    const onExpedition = activeExpedition.npcs.some((n) =>
      n.weaponIndices.includes(idx),
    );
    if (onExpedition) {
      return getText("EXPEDITION.WEAPON_ON_EXPEDITION");
    }
  }

  // NPC 裝備鎖定檢查
  if (!hiredNpcs || !Array.isArray(hiredNpcs)) return null;

  const npc = hiredNpcs.find((n) => n.equippedWeaponIndex != null && Number(n.equippedWeaponIndex) === idx);
  if (!npc) return null;

  if (npc.mission) {
    return `該武器正由【${npc.name}】攜帶執行任務中，任務結束前無法操作`;
  }
  return `該武器正被【${npc.name}】裝備中，請先卸除`;
}

module.exports = { getWeaponLockError };
