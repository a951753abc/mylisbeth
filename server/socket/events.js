/**
 * Socket.io 事件名稱常數 — 伺服器端唯一定義來源
 */

// 遊戲事件（Server → Client）
const BATTLE_RESULT = "battle:result";
const PVP_ATTACKED = "pvp:attacked";
const BOSS_DAMAGE = "boss:damage";
const BOSS_DEFEATED = "boss:defeated";
const BOSS_PHASE = "boss:phase";
const FLOOR_UNLOCKED = "floor:unlocked";
const LC_GUILD_ACTIVATED = "lc:guild:activated";
const NPC_DEATH = "npc:death";

// 管理事件（Server → Client）
const ADMIN_DASHBOARD_UPDATE = "admin:dashboard:update";

// 系統事件（Server → Client）
const SERVER_FULL = "server:full";
const JOIN_ACCEPTED = "join:accepted";

// 控制事件（Client → Server）
const JOIN_USER = "join:user";
const LEAVE_USER = "leave:user";
const JOIN_ADMIN = "join:admin";

module.exports = {
  BATTLE_RESULT,
  PVP_ATTACKED,
  BOSS_DAMAGE,
  BOSS_DEFEATED,
  BOSS_PHASE,
  FLOOR_UNLOCKED,
  LC_GUILD_ACTIVATED,
  NPC_DEATH,
  ADMIN_DASHBOARD_UPDATE,
  SERVER_FULL,
  JOIN_ACCEPTED,
  JOIN_USER,
  LEAVE_USER,
  JOIN_ADMIN,
};
