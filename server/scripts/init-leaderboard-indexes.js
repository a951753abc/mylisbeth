/**
 * 排行榜 MongoDB 索引初始化
 * 執行：node server/scripts/init-leaderboard-indexes.js
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("lisbeth");
  const users = db.collection("user");

  console.log("建立排行榜索引...");

  // Boss 協力
  await users.createIndex({ "bossContribution.totalDamage": -1 });
  await users.createIndex({ "bossContribution.bossesDefeated": -1 });
  await users.createIndex({ "bossContribution.mvpCount": -1 });
  await users.createIndex({ "bossContribution.lastAttackCount": -1 });
  console.log("✅ Boss 排行索引建立完成");

  // 決鬥場
  await users.createIndex({ "stats.duelKills": -1 });
  await users.createIndex({ "stats.firstStrikeWins": -1 });
  await users.createIndex({ pkKills: -1 });
  await users.createIndex({ battleLevel: -1, battleExp: -1 });
  console.log("✅ 決鬥場排行索引建立完成");

  // 商會經濟
  await users.createIndex({ "stats.totalColEarned": -1 });
  await users.createIndex({ "stats.totalMarketEarned": -1 });
  await users.createIndex({ col: -1 });
  console.log("✅ 經濟排行索引建立完成");

  // 活動紀錄
  await users.createIndex({ "stats.totalForges": -1 });
  await users.createIndex({ "stats.totalMines": -1 });
  await users.createIndex({ "stats.totalAdventures": -1 });
  await users.createIndex({ "stats.totalMissionsCompleted": -1 });
  console.log("✅ 活動紀錄排行索引建立完成");

  // 綜合實力 (forgeLevel, mineLevel 用於 sort)
  await users.createIndex({ forgeLevel: -1 });
  await users.createIndex({ mineLevel: -1 });
  console.log("✅ 綜合實力排行索引建立完成");

  await client.close();
  console.log("所有排行榜索引建立完畢！");
}

main().catch(console.error);
