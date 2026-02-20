/**
 * Season 6: 初始化 market_listing 索引
 * 執行一次：node server/scripts/init-season6-indexes.js
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("lisbeth");

  const col = db.collection("market_listing");

  console.log("建立 market_listing 索引...");

  await col.createIndex({ listingId: 1 }, { unique: true });
  console.log("  ✅ listingId (unique)");

  await col.createIndex({ sellerId: 1 });
  console.log("  ✅ sellerId");

  await col.createIndex({ status: 1 });
  console.log("  ✅ status");

  await col.createIndex({ status: 1, listedAt: -1 });
  console.log("  ✅ { status, listedAt }");

  console.log("完成！");
  await client.close();
}

main().catch((err) => {
  console.error("索引建立失敗:", err);
  process.exit(1);
});
