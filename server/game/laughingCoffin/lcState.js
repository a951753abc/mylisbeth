const db = require("../../db.js");
const config = require("../config.js");
const { getAllMemberIds } = require("./lcMembers.js");

const LC_CFG = config.LAUGHING_COFFIN_GUILD;
const STATE_KEY = "laughingCoffin";

/**
 * 讀取 LC 公會狀態（from server_state）
 */
async function getLcState() {
  const serverState = await db.findOne("server_state", {});
  return serverState?.[STATE_KEY] || null;
}

/**
 * LC 是否已啟動且未解散
 */
async function isLcActive() {
  const lc = await getLcState();
  return lc !== null && lc.active === true && lc.disbanded !== true;
}

/**
 * LC 是否已解散
 */
async function isLcDisbanded() {
  const lc = await getLcState();
  return lc?.disbanded === true;
}

/**
 * 初始化微笑棺木公會（攻略到 ACTIVATION_FLOOR 時呼叫）
 * @param {number} currentFloor - 當前攻略樓層
 */
async function initializeLc(currentFloor) {
  const baseFloor = randomFloor(2, currentFloor);
  const members = getAllMemberIds().map((id) => ({
    id,
    alive: true,
    killedBy: null,
    killedAt: null,
  }));

  const lcState = {
    active: true,
    disbanded: false,
    baseFloor,
    lastFloorChangeAt: Date.now(),
    members,
    gruntCount: LC_CFG.INITIAL_GRUNT_COUNT,
    lootPool: { col: 0, materials: [], weapons: [] },
  };

  // 原子操作：只在 LC 尚未建立時才初始化，防止並行重複初始化
  const result = await db.findOneAndUpdate(
    "server_state",
    { [STATE_KEY]: { $exists: false } },
    { $set: { [STATE_KEY]: lcState } },
  );

  // result 為 null 表示 LC 已存在
  return result ? lcState : null;
}

/**
 * 懶惰更新據點樓層（每 ROTATION_INTERVAL_MS 輪替一次）
 * 據點範圍：第 2 層 ~ 伺服器當前攻略前線樓層
 * @returns {object|null} 更新後的 LC 狀態（null = 未啟動或未到輪替時間）
 */
async function checkAndRotateFloor() {
  // 單次讀取 server_state，同時取得 LC 狀態與前線樓層
  const serverState = await db.findOne("server_state", {});
  const lc = serverState?.[STATE_KEY] || null;
  if (!lc || !lc.active || lc.disbanded) return null;

  const elapsed = Date.now() - (lc.lastFloorChangeAt || 0);
  if (elapsed < LC_CFG.ROTATION_INTERVAL_MS) return null;

  const frontierFloor = serverState?.currentFloor || 1;
  const newFloor = randomFloor(2, Math.max(frontierFloor, 2));

  // 原子操作：只在 lastFloorChangeAt 未被其他 request 更新時才執行
  const result = await db.findOneAndUpdate(
    "server_state",
    { [`${STATE_KEY}.lastFloorChangeAt`]: lc.lastFloorChangeAt },
    {
      $set: {
        [`${STATE_KEY}.baseFloor`]: newFloor,
        [`${STATE_KEY}.lastFloorChangeAt`]: Date.now(),
      },
    },
    { returnDocument: "after" },
  );

  return result?.[STATE_KEY] || null;
}

/**
 * 標記具名成員死亡
 */
async function markMemberDead(memberId, killedByUserId) {
  // 原子操作：只在成員仍存活時才標記死亡，防止並行重複擊殺
  const result = await db.findOneAndUpdate(
    "server_state",
    {
      [`${STATE_KEY}.members`]: {
        $elemMatch: { id: memberId, alive: true },
      },
    },
    {
      $set: {
        [`${STATE_KEY}.members.$.alive`]: false,
        [`${STATE_KEY}.members.$.killedBy`]: killedByUserId,
        [`${STATE_KEY}.members.$.killedAt`]: Date.now(),
      },
    },
  );
  if (result) {
    await checkDisbandment();
  }
  return result !== null;
}

/**
 * 雜魚計數 -1
 */
async function decrementGruntCount() {
  await db.update(
    "server_state",
    { [`${STATE_KEY}.gruntCount`]: { $gt: 0 } },
    { $inc: { [`${STATE_KEY}.gruntCount`]: -1 } },
  );
  await checkDisbandment();
}

/**
 * 檢查是否全滅 → 解散
 */
async function checkDisbandment() {
  const lc = await getLcState();
  if (!lc || lc.disbanded) return false;

  const allNamedDead = lc.members.every((m) => !m.alive);
  const noGrunts = (lc.gruntCount || 0) <= 0;

  if (allNamedDead && noGrunts) {
    await db.update(
      "server_state",
      {},
      { $set: { [`${STATE_KEY}.disbanded`]: true, [`${STATE_KEY}.active`]: false } },
    );
    return true;
  }
  return false;
}

/**
 * 取得存活的具名成員 ID 列表
 */
async function getAliveMembers() {
  const lc = await getLcState();
  if (!lc) return [];
  return lc.members.filter((m) => m.alive).map((m) => m.id);
}

/** 隨機樓層（含 min 和 max） */
function randomFloor(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

module.exports = {
  getLcState,
  isLcActive,
  isLcDisbanded,
  initializeLc,
  checkAndRotateFloor,
  markMemberDead,
  decrementGruntCount,
  checkDisbandment,
  getAliveMembers,
};
