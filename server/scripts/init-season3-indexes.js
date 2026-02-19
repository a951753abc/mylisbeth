/**
 * Season 3 MongoDB 索引初始化
 * 執行：node server/scripts/init-season3-indexes.js
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("lisbeth");

  console.log("建立 Season 3 索引...");

  // npc collection
  await db.collection("npc").createIndex({ npcId: 1 }, { unique: true });
  await db.collection("npc").createIndex({ status: 1 });
  await db.collection("npc").createIndex({ hiredBy: 1 });
  console.log("✅ npc 索引建立完成");

  // bankruptcy_log collection
  await db.collection("bankruptcy_log").createIndex({ userId: 1 });
  await db.collection("bankruptcy_log").createIndex({ bankruptedAt: -1 });
  console.log("✅ bankruptcy_log 索引建立完成");

  // user collection: nextSettlementAt（加速結算查詢）
  await db.collection("user").createIndex({ nextSettlementAt: 1 });
  console.log("✅ user.nextSettlementAt 索引建立完成");

  await client.close();
  console.log("所有 Season 3 索引建立完畢！");
}

main().catch(console.error);
