/**
 * 新素材種子腳本（布料/皮革/寶石）
 * 執行方式: node server/scripts/seed-new-materials.js
 * 可重複執行（使用 upsert）
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const NEW_MATERIALS = [
  // 布料
  { itemId: "mat_fabric_silk", name: "蜘蛛の絹糸", mainStat: "hp", materialType: "fabric", floorItem: true, baseItem: false },
  { itemId: "mat_fabric_tough", name: "魔獣の厚皮", mainStat: "def", materialType: "fabric", floorItem: true, baseItem: false },
  // 皮革
  { itemId: "mat_leather_light", name: "輕靈鹿皮", mainStat: "agi", materialType: "leather", floorItem: true, baseItem: false },
  { itemId: "mat_leather_dragon", name: "飛竜の鱗皮", mainStat: "def", materialType: "leather", floorItem: true, baseItem: false },
  // 寶石
  { itemId: "mat_gem_ruby", name: "焔の紅玉", mainStat: "atk", materialType: "gem", floorItem: true, baseItem: false },
  { itemId: "mat_gem_sapphire", name: "蒼穹の碧玉", mainStat: "cri", materialType: "gem", floorItem: true, baseItem: false },
  { itemId: "mat_gem_emerald", name: "森の翠玉", mainStat: "hp", materialType: "gem", floorItem: true, baseItem: false },
  { itemId: "mat_gem_diamond", name: "虛空石", mainStat: "cri", materialType: "gem", floorItem: true, baseItem: false },
];

async function run() {
  await client.connect();
  const db = client.db("lisbeth");

  console.log("=== 新素材種子腳本 開始 ===\n");

  let inserted = 0;
  let skipped = 0;

  for (const mat of NEW_MATERIALS) {
    const existing = await db.collection("item").findOne({ itemId: mat.itemId });
    if (existing) {
      // 更新 materialType（若舊資料沒有此欄位）
      if (!existing.materialType) {
        await db.collection("item").updateOne(
          { itemId: mat.itemId },
          { $set: { materialType: mat.materialType } },
        );
        console.log(`  ~ "${mat.name}" 已存在，補充 materialType: ${mat.materialType}`);
      } else {
        console.log(`  - "${mat.name}" 已存在，跳過`);
      }
      skipped++;
    } else {
      await db.collection("item").insertOne(mat);
      console.log(`  + "${mat.name}" (${mat.materialType}) 插入成功`);
      inserted++;
    }
  }

  const itemCount = await db.collection("item").countDocuments();
  console.log(`\n=== 完成 ===`);
  console.log(`新增: ${inserted}, 跳過: ${skipped}`);
  console.log(`素材總數: ${itemCount}`);

  await client.close();
}

run().catch((err) => {
  console.error("種子腳本執行失敗:", err);
  process.exit(1);
});
