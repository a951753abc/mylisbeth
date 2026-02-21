/**
 * 封印 BUG 武器遷移腳本
 * 將所有 weaponStock 中 buff > BUFF_MAX (10) 的武器移至 sealedWeapons[]
 *
 * 執行方式:
 *   node server/scripts/seal-bug-weapons.js            # 實際執行
 *   node server/scripts/seal-bug-weapons.js --dry-run  # 預覽模式
 */
require("dotenv").config();
const { MongoClient } = require("mongodb");

const BUFF_MAX = 10;
const SEALED_TITLE = "超越系統的鍛造";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("缺少 MONGODB_URI 環境變數");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("lisbeth");
  const userCol = db.collection("user");

  console.log(`模式: ${isDryRun ? "DRY-RUN（預覽）" : "LIVE（實際執行）"}`);
  console.log(`BUFF 上限: ${BUFF_MAX}`);
  console.log("---");

  // 查詢所有擁有 buff > BUFF_MAX 武器的玩家
  const affectedUsers = await userCol
    .find({ "weaponStock.buff": { $gt: BUFF_MAX } })
    .toArray();

  console.log(`受影響玩家數: ${affectedUsers.length}`);

  if (affectedUsers.length === 0) {
    console.log("無需遷移的武器。");
    await client.close();
    return;
  }

  let totalSealed = 0;

  for (const user of affectedUsers) {
    const weapons = user.weaponStock || [];
    const sealedWeapons = user.sealedWeapons || [];

    // 分離 BUG 武器和正常武器，記錄原始索引
    const bugIndices = new Set();
    const newSealed = [];

    weapons.forEach((w, idx) => {
      if (w && (w.buff || 0) > BUFF_MAX) {
        bugIndices.add(idx);
        newSealed.push({
          ...w,
          sealedAt: Date.now(),
        });
      }
    });

    if (bugIndices.size === 0) continue;

    // 過濾掉 BUG 武器與 null 槽位（歷史 $unset 殘留）
    const normalWeapons = weapons.filter((w, idx) => w != null && !bugIndices.has(idx));

    // 建立索引重映射表: 舊索引 → 新索引（跳過 null 和 BUG 武器）
    const indexMap = new Map();
    let newIdx = 0;
    weapons.forEach((w, oldIdx) => {
      if (w != null && !bugIndices.has(oldIdx)) {
        indexMap.set(oldIdx, newIdx);
        newIdx++;
      }
    });

    // 重映射 NPC 裝備索引
    const hiredNpcs = (user.hiredNpcs || []).map((npc) => {
      if (npc.equippedWeaponIndex == null) return npc;
      if (bugIndices.has(npc.equippedWeaponIndex)) {
        // NPC 裝備的是封印武器 → 解除裝備
        return { ...npc, equippedWeaponIndex: null };
      }
      const remapped = indexMap.get(npc.equippedWeaponIndex);
      if (remapped !== undefined && remapped !== npc.equippedWeaponIndex) {
        return { ...npc, equippedWeaponIndex: remapped };
      }
      return npc;
    });

    // 重映射 defenseWeaponIndex
    let defenseWeaponIndex = user.defenseWeaponIndex ?? 0;
    if (bugIndices.has(defenseWeaponIndex)) {
      // 防禦武器是封印武器 → 重設為 0（若有正常武器）或 0
      defenseWeaponIndex = 0;
    } else {
      const remapped = indexMap.get(defenseWeaponIndex);
      if (remapped !== undefined) {
        defenseWeaponIndex = remapped;
      }
    }

    // 報告
    console.log(`\n玩家: ${user.name} (${user.userId})`);
    console.log(`  封印武器數: ${newSealed.length}`);
    newSealed.forEach((w) => {
      console.log(`    - ${w.weaponName} (+${w.buff}) ATK:${w.atk} DEF:${w.def} AGI:${w.agi} HP:${w.hp} CRI:${w.cri}`);
    });
    console.log(`  保留正常武器數: ${normalWeapons.length}`);

    const npcChanges = hiredNpcs.filter((npc, i) => {
      const orig = (user.hiredNpcs || [])[i];
      return orig && orig.equippedWeaponIndex !== npc.equippedWeaponIndex;
    });
    if (npcChanges.length > 0) {
      console.log(`  NPC 裝備索引重映射: ${npcChanges.length} 筆`);
    }
    if (defenseWeaponIndex !== (user.defenseWeaponIndex ?? 0)) {
      console.log(`  防禦武器索引: ${user.defenseWeaponIndex} → ${defenseWeaponIndex}`);
    }

    totalSealed += newSealed.length;

    if (!isDryRun) {
      await userCol.updateOne(
        { userId: user.userId },
        {
          $set: {
            weaponStock: normalWeapons,
            sealedWeapons: [...sealedWeapons, ...newSealed],
            hiredNpcs,
            defenseWeaponIndex,
          },
          $addToSet: { availableTitles: SEALED_TITLE },
        },
      );
      console.log(`  ✓ 已更新`);
    }
  }

  console.log("\n---");
  console.log(`總計封印武器數: ${totalSealed}`);
  console.log(`受影響玩家數: ${affectedUsers.length}`);
  if (isDryRun) {
    console.log("\n這是預覽模式。移除 --dry-run 參數以實際執行。");
  } else {
    console.log("\n遷移完成！");
  }

  await client.close();
}

main().catch((err) => {
  console.error("遷移失敗:", err);
  process.exit(1);
});
