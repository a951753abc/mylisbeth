/**
 * Socket.io 事件名稱常數 — 客戶端鏡像
 * 與 server/socket/events.js 保持同步
 */

// 遊戲事件（Server → Client）
export const BATTLE_RESULT = "battle:result";
export const PVP_ATTACKED = "pvp:attacked";
export const BOSS_DAMAGE = "boss:damage";
export const BOSS_DEFEATED = "boss:defeated";
export const BOSS_PHASE = "boss:phase";
export const FLOOR_UNLOCKED = "floor:unlocked";
export const NPC_DEATH = "npc:death";

// 管理事件（Server → Client）
export const ADMIN_DASHBOARD_UPDATE = "admin:dashboard:update";

// 系統事件（Server → Client）
export const SERVER_FULL = "server:full";
export const JOIN_ACCEPTED = "join:accepted";

// 控制事件（Client → Server）
export const JOIN_USER = "join:user";
export const LEAVE_USER = "leave:user";
export const JOIN_ADMIN = "join:admin";
