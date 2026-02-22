/**
 * 修復配方武器基礎數值腳本
 * 執行方式: node server/scripts/fix-recipe-weapons.js
 *
 * 問題：配方命中時，weapon.js 直接使用 db.findOne("weapon") 回傳的文件作為武器物件。
 *       該文件只有 {_id, forge1, forge2, name, type}，不含 atk/def/agi/cri 基礎數值。
 *       導致配方命中的武器基礎數值全部缺失（為 0 或 undefined）。
 *
 * 偵測方式：受影響武器的 weaponStock 項目會包含 forge1 欄位（正常武器不會有）。
 *
 * 修復方式：根據武器 type 從 category.json 查找基礎數值，補加到現有數值上。
 *           同時清除不屬於武器的多餘欄位（_id, forge1, forge2）。
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("缺少 MONGODB_URI 環境變數");
  process.exit(1);
}
const client = new MongoClient(uri);

const CATEGORY = require("../game/weapon/category.json");

// type → base stats 查找表
const BASE_STATS = {};
for (const cat of CATEGORY) {
  BASE_STATS[cat.type] = { atk: cat.atk, def: cat.def, agi: cat.agi, cri: cat.cri };
}

// cri 暴擊門檻下限（與 weapon.js 的 MIN_CRI 一致）
const MIN_CRI = 5;

async function run() {
  await client.connect();
  const db = client.db("lisbeth");

  console.log("=== 修復配方武器基礎數值 ===\n");

  // 找出所有 weaponStock 中包含 forge1 欄位的使用者（即受 bug 影響的武器）
  const users = await db.collection("user").find({
    weaponStock: { $elemMatch: { forge1: { $exists: true } } },
  }).toArray();

  console.log(`找到 ${users.length} 位玩家有受影響的武器\n`);

  let totalFixed = 0;
  let totalSkipped = 0;

  for (const user of users) {
    const weaponStock = user.weaponStock || [];
    let modified = false;

    for (let i = 0; i < weaponStock.length; i++) {
      const w = weaponStock[i];
      if (!w || w.forge1 == null) continue;

      const base = BASE_STATS[w.type];
      if (!base) {
        console.log(`  [!] ${user.name} 的武器 "${w.weaponName}" 類型 "${w.type}" 找不到基礎數值，跳過`);
        totalSkipped++;
        continue;
      }

      console.log(`  修復 ${user.name} 的 "${w.weaponName}" (${w.type}):`);
      console.log(`    修復前: atk=${w.atk ?? "N/A"}, def=${w.def ?? "N/A"}, agi=${w.agi ?? "N/A"}, cri=${w.cri ?? "N/A"}`);

      // 補上基礎數值
      const fixed = { ...w };
      fixed.atk = (w.atk || 0) + base.atk;
      fixed.def = (w.def || 0) + base.def;
      fixed.agi = (w.agi || 0) + base.agi;

      // cri 修正：buggy 時 applyStatBoost 預設用 10，需調整偏差
      if (w.cri != null) {
        fixed.cri = Math.max(MIN_CRI, w.cri + (base.cri - 10));
      } else {
        fixed.cri = base.cri;
      }

      // 補上 recipeMatched / recipeKey（若缺少）
      if (fixed.recipeMatched == null) {
        fixed.recipeMatched = true;
      }
      if (fixed.recipeKey == null && fixed.forge1 != null && fixed.forge2 != null) {
        fixed.recipeKey = `${fixed.forge1}:${fixed.forge2}`;
      }

      // 清除不屬於武器的多餘欄位
      delete fixed._id;
      delete fixed.forge1;
      delete fixed.forge2;

      console.log(`    修復後: atk=${fixed.atk}, def=${fixed.def}, agi=${fixed.agi}, cri=${fixed.cri}`);

      weaponStock[i] = fixed;
      modified = true;
      totalFixed++;
    }

    if (modified) {
      await db.collection("user").updateOne(
        { userId: user.userId },
        { $set: { weaponStock } },
      );

      // 補充 discoveredRecipes（如果之前的配方 key 不在列表中）
      const newKeys = weaponStock
        .filter((w) => w && w.recipeMatched && w.recipeKey && w.durability > 0)
        .map((w) => w.recipeKey);
      if (newKeys.length > 0) {
        await db.collection("user").updateOne(
          { userId: user.userId },
          { $addToSet: { discoveredRecipes: { $each: newKeys } } },
        );
      }

      console.log(`  -> ${user.name} 的武器已更新\n`);
    }
  }

  console.log("=== 完成 ===");
  console.log(`修復武器數: ${totalFixed}`);
  console.log(`跳過武器數: ${totalSkipped}`);

  await client.close();
}

run().catch((err) => {
  console.error("修復腳本執行失敗:", err);
  process.exit(1);
});
