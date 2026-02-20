/**
 * Season 2 種子腳本
 * 執行方式: node server/scripts/seed-season2.js
 * 可重複執行（使用 upsert）
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const floors = require("../game/floor/floors.json");

const NEW_MATERIALS = [
  // 樓層 1-2
  { itemId: "mat_floor1_ore", name: "コバルト鉱石", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor1_crystal", name: "青銅の欠片", mainStat: "def", floorItem: true, baseItem: false },
  // 樓層 3-4
  { itemId: "mat_floor3_ore", name: "魔獣の牙", mainStat: "agi", floorItem: true, baseItem: false },
  { itemId: "mat_floor3_crystal", name: "霊木", mainStat: "hp", floorItem: true, baseItem: false },
  // 樓層 5-6
  { itemId: "mat_floor5_ore", name: "ミスリル原石", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor5_crystal", name: "火石", mainStat: "cri", floorItem: true, baseItem: false },
  // 樓層 7-8
  { itemId: "mat_floor7_ore", name: "竜鱗", mainStat: "def", floorItem: true, baseItem: false },
  { itemId: "mat_floor7_crystal", name: "精霊石", mainStat: "hp", floorItem: true, baseItem: false },
  // 樓層 9-10
  { itemId: "mat_floor9_ore", name: "ダマスカス鋼", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor9_crystal", name: "雷の核", mainStat: "agi", floorItem: true, baseItem: false },
  // 樓層 11-12
  { itemId: "mat_floor11_ore", name: "霧鋼", mainStat: "def", floorItem: true, baseItem: false },
  { itemId: "mat_floor11_crystal", name: "湖底の真珠", mainStat: "cri", floorItem: true, baseItem: false },
  // 樓層 13-14
  { itemId: "mat_floor13_ore", name: "毒牙の芯", mainStat: "agi", floorItem: true, baseItem: false },
  { itemId: "mat_floor13_crystal", name: "風切り石", mainStat: "atk", floorItem: true, baseItem: false },
  // 樓層 15-16
  { itemId: "mat_floor15_ore", name: "魔獣の骨髄", mainStat: "hp", floorItem: true, baseItem: false },
  { itemId: "mat_floor15_crystal", name: "水晶の核", mainStat: "def", floorItem: true, baseItem: false },
  // 樓層 17-18
  { itemId: "mat_floor17_ore", name: "雷鉄", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor17_crystal", name: "死者の魂石", mainStat: "hp", floorItem: true, baseItem: false },
  // 樓層 19-20
  { itemId: "mat_floor19_ore", name: "深淵鋼", mainStat: "cri", floorItem: true, baseItem: false },
  { itemId: "mat_floor19_crystal", name: "天空の欠片", mainStat: "agi", floorItem: true, baseItem: false },
];

const SERVER_STATE_INIT = {
  _id: "aincrad",
  currentFloor: 1,
  bossStatus: {
    floorNumber: 1,
    active: false,
    currentHp: floors[0].boss.hp,
    totalHp: floors[0].boss.hp,
    participants: [],
    startedAt: null,
    expiresAt: null,
  },
  floorHistory: [],
};

async function run() {
  await client.connect();
  const db = client.db("lisbeth");

  console.log("=== Season 2 種子腳本 開始 ===");

  // 1. 標記現有素材為 baseItem
  console.log("\n[1] 標記現有素材為 baseItem...");
  const existingItems = await db.collection("item").find({}).toArray();
  for (const item of existingItems) {
    if (item.baseItem === undefined) {
      await db.collection("item").updateOne(
        { _id: item._id },
        { $set: { baseItem: true, floorItem: false } },
      );
      console.log(`  ✓ 標記 "${item.name}" 為 baseItem`);
    }
  }

  // 2. 插入新素材
  console.log("\n[2] 插入樓層專屬素材...");
  for (const mat of NEW_MATERIALS) {
    const existing = await db.collection("item").findOne({ itemId: mat.itemId });
    if (existing) {
      console.log(`  - "${mat.name}" 已存在，跳過`);
    } else {
      await db.collection("item").insertOne(mat);
      console.log(`  ✓ 插入 "${mat.name}"`);
    }
  }

  // 3. 插入/更新樓層資料
  console.log("\n[3] 插入樓層資料...");
  for (const floor of floors) {
    await db.collection("floor").updateOne(
      { floorNumber: floor.floorNumber },
      { $set: floor },
      { upsert: true },
    );
    console.log(`  ✓ Floor ${floor.floorNumber}: ${floor.nameCn}`);
  }

  // 4. 初始化 server_state
  console.log("\n[4] 初始化 server_state...");
  const existingState = await db.collection("server_state").findOne({ _id: "aincrad" });
  if (existingState) {
    console.log("  - server_state 已存在，跳過（保留現有進度）");
  } else {
    await db.collection("server_state").insertOne(SERVER_STATE_INIT);
    console.log("  ✓ server_state 初始化完成");
  }

  // 5. 統計
  const itemCount = await db.collection("item").countDocuments();
  const floorCount = await db.collection("floor").countDocuments();
  console.log(`\n=== 完成 ===`);
  console.log(`素材總數: ${itemCount}`);
  console.log(`樓層總數: ${floorCount}`);

  await client.close();
}

run().catch((err) => {
  console.error("種子腳本執行失敗:", err);
  process.exit(1);
});
