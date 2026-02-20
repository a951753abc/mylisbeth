/**
 * 正式伺服器回溯腳本：回溯到第 11 層起始狀態
 *
 * 用途：修復 floors.json 只定義到第 10 層時，
 *       floorData fallback 到第 1 層導致 currentFloor 虛高的問題。
 *
 * 執行方式: node server/scripts/rollback-to-floor11.js
 * ⚠️ 請先在測試環境驗證，確認無誤後才在正式伺服器執行。
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db("lisbeth");

  console.log("=== 回溯腳本：重置到第 11 層起始狀態 ===\n");

  // 1. 重置 server_state
  console.log("[1] 重置 server_state...");
  const stateResult = await db.collection("server_state").updateOne(
    { _id: "aincrad" },
    {
      $set: {
        currentFloor: 11,
        "bossStatus.floorNumber": 11,
        "bossStatus.active": false,
        "bossStatus.currentHp": 0,
        "bossStatus.totalHp": 0,
        "bossStatus.participants": [],
        "bossStatus.startedAt": null,
        "bossStatus.expiresAt": null,
        "bossStatus.activatedPhases": [],
        "bossStatus.currentWeapon": null,
      },
    },
  );
  console.log(`  修改 ${stateResult.modifiedCount} 筆 server_state`);

  // 2. 清除 floorHistory 中 floorNumber > 10 的記錄（這些是 fallback 造成的錯誤記錄）
  console.log("\n[2] 清除 floorHistory 中 floorNumber > 10 的記錄...");
  const pullResult = await db.collection("server_state").updateOne(
    { _id: "aincrad" },
    { $pull: { floorHistory: { floorNumber: { $gt: 10 } } } },
  );
  console.log(`  修改 ${pullResult.modifiedCount} 筆 server_state`);

  // 3. 將所有 currentFloor > 11 的玩家回退到 11
  console.log("\n[3] 將 currentFloor > 11 的玩家回退到 11...");
  const userResult = await db.collection("user").updateMany(
    { currentFloor: { $gt: 11 } },
    { $set: { currentFloor: 11 } },
  );
  console.log(`  修改 ${userResult.modifiedCount} 位玩家的 currentFloor`);

  // 4. 刪除所有 user 的 floorProgress 中 > 10 的項目
  console.log("\n[4] 清除玩家 floorProgress 中 > 10 的項目...");
  const users = await db.collection("user").find({}).toArray();
  let cleanedCount = 0;
  for (const user of users) {
    const fp = user.floorProgress || {};
    const keysToRemove = Object.keys(fp).filter((k) => parseInt(k, 10) > 10);
    if (keysToRemove.length > 0) {
      const unsetOps = {};
      for (const k of keysToRemove) {
        unsetOps[`floorProgress.${k}`] = "";
      }
      await db.collection("user").updateOne(
        { userId: user.userId },
        { $unset: unsetOps },
      );
      cleanedCount++;
    }
  }
  console.log(`  清理 ${cleanedCount} 位玩家的 floorProgress`);

  // 5. 統計當前狀態
  console.log("\n[5] 驗證...");
  const state = await db.collection("server_state").findOne({ _id: "aincrad" });
  console.log(`  currentFloor: ${state.currentFloor}`);
  console.log(`  bossStatus.active: ${state.bossStatus.active}`);
  console.log(`  floorHistory 筆數: ${(state.floorHistory || []).length}`);

  const highFloorUsers = await db.collection("user").countDocuments({ currentFloor: { $gt: 11 } });
  console.log(`  currentFloor > 11 的玩家: ${highFloorUsers}`);

  console.log("\n=== 回溯完成 ===");
  await client.close();
}

run().catch((err) => {
  console.error("回溯腳本執行失敗:", err);
  process.exit(1);
});
