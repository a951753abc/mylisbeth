/**
 * 41~50 層素材種子腳本
 * 執行方式: node server/scripts/seed-floors-41-50.js
 * 可重複執行（使用 upsert）
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const NEW_MATERIALS = [
  // 樓層 41-42
  { itemId: "mat_floor41_ore", name: "時空鉱石", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor41_crystal", name: "時空結晶", mainStat: "def", floorItem: true, baseItem: false },
  // 樓層 43-44
  { itemId: "mat_floor43_ore", name: "妖樹の樹液", mainStat: "agi", floorItem: true, baseItem: false },
  { itemId: "mat_floor43_crystal", name: "妖樹の核", mainStat: "hp", floorItem: true, baseItem: false },
  // 樓層 45-46
  { itemId: "mat_floor45_ore", name: "隕鉄", mainStat: "atk", floorItem: true, baseItem: false },
  { itemId: "mat_floor45_crystal", name: "星屑の結晶", mainStat: "cri", floorItem: true, baseItem: false },
  // 樓層 47-48
  { itemId: "mat_floor47_ore", name: "天機の歯車", mainStat: "def", floorItem: true, baseItem: false },
  { itemId: "mat_floor47_crystal", name: "天機の水晶", mainStat: "agi", floorItem: true, baseItem: false },
  // 樓層 49-50
  { itemId: "mat_floor49_ore", name: "冥界の魂石", mainStat: "hp", floorItem: true, baseItem: false },
  { itemId: "mat_floor49_crystal", name: "神罰の結晶", mainStat: "cri", floorItem: true, baseItem: false },
];

async function main() {
  try {
    await client.connect();
    const db = client.db("lisbeth");
    const itemCol = db.collection("item");

    for (const mat of NEW_MATERIALS) {
      await itemCol.updateOne(
        { itemId: mat.itemId },
        { $set: mat },
        { upsert: true },
      );
      console.log(`[upsert] ${mat.itemId} (${mat.name})`);
    }

    console.log(`\n完成：${NEW_MATERIALS.length} 個素材已建立/更新`);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
