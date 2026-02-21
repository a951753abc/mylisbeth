/**
 * 建立 GM 後台相關的 MongoDB 索引
 * 用法: node server/scripts/init-admin-indexes.js
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function initIndexes() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/lisbeth";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("lisbeth");

  console.log("建立 action_logs 索引...");
  const actionLogs = db.collection("action_logs");

  // TTL 索引：30 天自動清除
  await actionLogs.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60, name: "ttl_30days" },
  );

  // 玩家日誌查詢
  await actionLogs.createIndex(
    { userId: 1, timestamp: -1 },
    { name: "userId_timestamp" },
  );

  // 動作類型查詢
  await actionLogs.createIndex(
    { action: 1, timestamp: -1 },
    { name: "action_timestamp" },
  );

  console.log("建立 admin_users 索引...");
  const adminUsers = db.collection("admin_users");
  await adminUsers.createIndex(
    { username: 1 },
    { unique: true, name: "username_unique" },
  );

  console.log("所有索引建立完成。");
  await client.close();
  process.exit(0);
}

initIndexes().catch((err) => {
  console.error("建立索引失敗:", err);
  process.exit(1);
});
