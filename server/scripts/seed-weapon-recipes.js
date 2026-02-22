/**
 * 武器配方種子腳本
 * 執行方式: node server/scripts/seed-weapon-recipes.js
 * 可重複執行（使用 upsert，以 forge1+forge2 為 key）
 *
 * 配方定義了「素材1 + 素材2 → 確定武器類型」的對應關係。
 * 鍛造時若找不到配方，系統會根據素材屬性權重隨機選取武器類型。
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// ──────────────────────────────────────
// 武器類型參考（來自 category.json）
// ──────────────────────────────────────
// 單手劍 one_handed_sword   | 雙手劍 two_handed_sword | 雙手斧 two_handed_axe
// 單手棍 mace               | 刀 katana               | 彎刀 curved_sword
// 細劍 rapier               | 短劍 dagger             | 槍 spear
// 弓 bow                    | 大盾 shield
//
// 基礎素材 itemId：1=HP素材, 2=ATK素材, 3=DEF素材, 4=AGI素材, 5=耐久素材

// ──────────────────────────────────────
// 基礎素材（itemId 1~5）
// 這些素材從 Discord bot 時代就存在，但從未被 seed 進 item 集合。
// 補充進去讓 itemCache 能正確回傳名稱，也讓挖礦池能包含基礎素材。
// ──────────────────────────────────────
const BASE_ITEMS = [
  { itemId: "1", name: "命の結晶",     mainStat: "hp",         baseItem: true, floorItem: false },
  { itemId: "2", name: "鉄鉱石",       mainStat: "atk",        baseItem: true, floorItem: false },
  { itemId: "3", name: "堅岩石",       mainStat: "def",        baseItem: true, floorItem: false },
  { itemId: "4", name: "風切り羽",     mainStat: "agi",        baseItem: true, floorItem: false },
  { itemId: "5", name: "玄鉄の欠片",   mainStat: "durability", baseItem: true, floorItem: false },
];

const RECIPES = [
  // ═══════════════════════════════════
  // 基礎素材配方（itemId 1~5 互相組合）
  // ═══════════════════════════════════

  // ATK 系
  { forge1: "2", forge2: "2", name: "雙手劍", type: "two_handed_sword" },
  { forge1: "2", forge2: "3", name: "單手劍", type: "one_handed_sword" },
  { forge1: "3", forge2: "2", name: "單手劍", type: "one_handed_sword" },
  { forge1: "2", forge2: "4", name: "刀",     type: "katana" },
  { forge1: "4", forge2: "2", name: "彎刀",   type: "curved_sword" },
  { forge1: "2", forge2: "1", name: "弓",     type: "bow" },
  { forge1: "1", forge2: "2", name: "槍",     type: "spear" },
  { forge1: "2", forge2: "5", name: "雙手斧", type: "two_handed_axe" },
  { forge1: "5", forge2: "2", name: "雙手斧", type: "two_handed_axe" },

  // DEF 系
  { forge1: "3", forge2: "3", name: "大盾",   type: "shield" },
  { forge1: "3", forge2: "1", name: "單手棍", type: "mace" },
  { forge1: "1", forge2: "3", name: "單手棍", type: "mace" },
  { forge1: "3", forge2: "5", name: "大盾",   type: "shield" },
  { forge1: "5", forge2: "3", name: "槍",     type: "spear" },

  // AGI 系
  { forge1: "4", forge2: "4", name: "短劍",   type: "dagger" },
  { forge1: "4", forge2: "3", name: "細劍",   type: "rapier" },
  { forge1: "3", forge2: "4", name: "細劍",   type: "rapier" },
  { forge1: "4", forge2: "1", name: "弓",     type: "bow" },
  { forge1: "1", forge2: "4", name: "短劍",   type: "dagger" },
  { forge1: "4", forge2: "5", name: "彎刀",   type: "curved_sword" },

  // HP / 耐久系
  { forge1: "1", forge2: "1", name: "單手棍", type: "mace" },
  { forge1: "5", forge2: "5", name: "雙手斧", type: "two_handed_axe" },
  { forge1: "1", forge2: "5", name: "大盾",   type: "shield" },
  { forge1: "5", forge2: "1", name: "槍",     type: "spear" },
  { forge1: "5", forge2: "4", name: "細劍",   type: "rapier" },

  // ═══════════════════════════════════
  // 樓層素材配方（1~10 層）
  // ═══════════════════════════════════

  // 1-2 層：コバルト鉱石 + 青銅の欠片
  { forge1: "mat_floor1_ore", forge2: "mat_floor1_crystal", name: "コバルトブレード", type: "one_handed_sword" },
  { forge1: "mat_floor1_crystal", forge2: "mat_floor1_ore", name: "ブロンズシールド", type: "shield" },

  // 3-4 層：魔獣の牙 + 霊木
  { forge1: "mat_floor3_ore", forge2: "mat_floor3_crystal", name: "ビーストファング",   type: "dagger" },
  { forge1: "mat_floor3_crystal", forge2: "mat_floor3_ore", name: "霊木の杖",         type: "mace" },

  // 5-6 層：ミスリル原石 + 火石
  { forge1: "mat_floor5_ore", forge2: "mat_floor5_crystal", name: "ミスリルエッジ",     type: "katana" },
  { forge1: "mat_floor5_crystal", forge2: "mat_floor5_ore", name: "フレイムブレード",   type: "curved_sword" },

  // 7-8 層：竜鱗 + 精霊石
  { forge1: "mat_floor7_ore", forge2: "mat_floor7_crystal", name: "ドラゴンスケイル",   type: "shield" },
  { forge1: "mat_floor7_crystal", forge2: "mat_floor7_ore", name: "スピリットランス",   type: "spear" },

  // 9-10 層：ダマスカス鋼 + 雷の核
  { forge1: "mat_floor9_ore", forge2: "mat_floor9_crystal", name: "ライトニングソード", type: "two_handed_sword" },
  { forge1: "mat_floor9_crystal", forge2: "mat_floor9_ore", name: "サンダーボウ",       type: "bow" },

  // ═══════════════════════════════════
  // 樓層素材配方（11~20 層）
  // ═══════════════════════════════════

  // 11-12 層：霧鋼 + 湖底の真珠
  { forge1: "mat_floor11_ore", forge2: "mat_floor11_crystal", name: "ミストセイバー",   type: "rapier" },
  { forge1: "mat_floor11_crystal", forge2: "mat_floor11_ore", name: "パールシールド",   type: "shield" },

  // 13-14 層：毒牙の芯 + 風切り石
  { forge1: "mat_floor13_ore", forge2: "mat_floor13_crystal", name: "ポイズンダガー",   type: "dagger" },
  { forge1: "mat_floor13_crystal", forge2: "mat_floor13_ore", name: "ウィンドスラッシャー", type: "curved_sword" },

  // 15-16 層：魔獣の骨髄 + 水晶の核
  { forge1: "mat_floor15_ore", forge2: "mat_floor15_crystal", name: "ボーンクラッシャー", type: "two_handed_axe" },
  { forge1: "mat_floor15_crystal", forge2: "mat_floor15_ore", name: "クリスタルメイス",   type: "mace" },

  // 17-18 層：雷鉄 + 死者の魂石
  { forge1: "mat_floor17_ore", forge2: "mat_floor17_crystal", name: "ソウルスレイヤー",   type: "two_handed_sword" },
  { forge1: "mat_floor17_crystal", forge2: "mat_floor17_ore", name: "デスサイズ",         type: "katana" },

  // 19-20 層：深淵鋼 + 天空の欠片
  { forge1: "mat_floor19_ore", forge2: "mat_floor19_crystal", name: "アビスブレード",   type: "katana" },
  { forge1: "mat_floor19_crystal", forge2: "mat_floor19_ore", name: "セレスティアルボウ", type: "bow" },

  // ═══════════════════════════════════
  // 跨類型配方（寶石/布料/皮革 × 樓層/基礎素材）
  // ═══════════════════════════════════

  // 寶石系
  { forge1: "mat_gem_ruby",     forge2: "mat_gem_sapphire", name: "ジュエルソード",     type: "one_handed_sword" },
  { forge1: "mat_gem_emerald",  forge2: "mat_gem_diamond",  name: "エメラルドセプター", type: "mace" },
  { forge1: "mat_gem_ruby",     forge2: "2",                name: "ルビーエッジ",       type: "katana" },
  { forge1: "mat_gem_sapphire", forge2: "4",                name: "サファイアレイピア", type: "rapier" },
  { forge1: "mat_gem_diamond",  forge2: "mat_gem_ruby",     name: "ダイヤモンドランス", type: "spear" },

  // 皮革系
  { forge1: "mat_leather_light", forge2: "mat_leather_dragon", name: "ドラゴンレザーアーム", type: "shield" },
  { forge1: "mat_leather_light", forge2: "4",                  name: "レザーダガー",         type: "dagger" },
  { forge1: "mat_leather_dragon", forge2: "2",                 name: "ドラゴンボウ",         type: "bow" },

  // 布料系
  { forge1: "mat_fabric_silk",  forge2: "mat_fabric_tough", name: "シルクウィップ",   type: "curved_sword" },
  { forge1: "mat_fabric_tough", forge2: "3",                name: "タフガード",       type: "shield" },
  { forge1: "mat_fabric_silk",  forge2: "1",                name: "ヒーリングロッド", type: "mace" },

  // 特殊跨層配方（需要收集不同層素材）
  { forge1: "mat_floor1_ore",  forge2: "mat_floor5_ore",  name: "アロイブレード",   type: "two_handed_sword" },
  { forge1: "mat_floor3_ore",  forge2: "mat_floor7_ore",  name: "キメラファング",   type: "dagger" },
  { forge1: "mat_floor5_ore",  forge2: "mat_floor9_ore",  name: "ミスリルダマスカス", type: "katana" },
  { forge1: "mat_floor9_ore",  forge2: "mat_floor1_ore",  name: "サンダーコバルト", type: "spear" },
  { forge1: "mat_floor7_crystal", forge2: "mat_floor3_crystal", name: "精霊の大弓", type: "bow" },
];

async function run() {
  await client.connect();
  const db = client.db("lisbeth");

  console.log("=== 武器配方種子腳本 開始 ===\n");

  // 0. 補充基礎素材到 item 集合
  console.log("[0] 補充基礎素材...");
  for (const mat of BASE_ITEMS) {
    const result = await db.collection("item").updateOne(
      { itemId: mat.itemId },
      { $set: mat },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      console.log(`  + ${mat.name} (itemId: ${mat.itemId}, ${mat.mainStat})`);
    } else {
      console.log(`  - ${mat.name} 已存在`);
    }
  }

  // 1. 寫入配方
  console.log("\n[1] 寫入武器配方...");
  let upserted = 0;
  let unchanged = 0;

  for (const recipe of RECIPES) {
    const filter = { forge1: recipe.forge1, forge2: recipe.forge2 };
    const result = await db.collection("weapon").updateOne(
      filter,
      { $set: recipe },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      console.log(`  + [${recipe.forge1} + ${recipe.forge2}] → ${recipe.name} (${recipe.type})`);
      upserted++;
    } else if (result.modifiedCount > 0) {
      console.log(`  ~ [${recipe.forge1} + ${recipe.forge2}] → ${recipe.name} 已更新`);
      upserted++;
    } else {
      unchanged++;
    }
  }

  // 建立 forge1+forge2 的複合索引（加速查詢）
  await db.collection("weapon").createIndex(
    { forge1: 1, forge2: 1 },
    { unique: true },
  );
  console.log("\n  ✓ 已建立 forge1+forge2 複合唯一索引");

  const total = await db.collection("weapon").countDocuments();
  console.log(`\n=== 完成 ===`);
  console.log(`新增/更新: ${upserted}, 未變更: ${unchanged}`);
  console.log(`配方總數: ${total}`);

  await client.close();
}

run().catch((err) => {
  console.error("種子腳本執行失敗:", err);
  process.exit(1);
});
