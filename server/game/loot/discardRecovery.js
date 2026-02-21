/**
 * 丟棄池撿拾邏輯 — NPC 冒險時從全域丟棄池隨機拾取物品
 */
const db = require("../../db.js");
const config = require("../config.js");

/**
 * 從丟棄池隨機撿取物品並加入玩家背包
 * 使用 findOneAndDelete 逐筆原子操作，避免併發 double-claim
 * @param {string} userId - 撿取者的 userId
 * @param {number} maxCount - 最多撿取幾件（adventureLevel * d6）
 * @returns {{ recoveredText: string }}
 */
async function recoverFromDiscardPool(userId, maxCount) {
  if (maxCount <= 0) return { recoveredText: "" };

  // 先取得玩家目前武器數量和上限，決定是否還能撿武器
  const user = await db.findOne("user", { userId });
  if (!user) return { recoveredText: "" };
  const weaponCount = (user.weaponStock || []).length;
  const weaponLimit = config.INITIAL_WEAPON_LIMIT + (user.forgeLevel || 1);
  let weaponsAdded = 0;

  const recoveredItems = [];
  const recoveredWeapons = [];

  for (let i = 0; i < maxCount; i++) {
    // 原子取出一筆：findOneAndDelete 保證不會被其他冒險重複取用
    const doc = await db.findOneAndUpdate(
      "discard_pool",
      {},
      { $set: { _claimed: true } },
      { returnDocument: "before" },
    );
    if (!doc) break; // 丟棄池已空

    // 立即刪除已 claim 的文件
    await db.deleteOne("discard_pool", { _id: doc._id });

    if (doc.type === "item") {
      const d = doc.data;
      await db.atomicIncItem(userId, d.itemId, d.itemLevel, d.itemName, 1);
      // 合併同名素材的顯示
      const existing = recoveredItems.find(
        (r) => r.itemId === d.itemId && r.itemLevel === d.itemLevel,
      );
      if (existing) {
        existing.qty += 1;
      } else {
        recoveredItems.push({
          itemId: d.itemId,
          itemLevel: d.itemLevel,
          itemName: d.itemName,
          qty: 1,
        });
      }
    } else if (doc.type === "weapon") {
      // 武器要檢查上限
      if (weaponCount + weaponsAdded >= weaponLimit) {
        // 武器滿了，放回丟棄池
        await db.insertOne("discard_pool", {
          type: doc.type,
          data: doc.data,
          discardedBy: doc.discardedBy,
          discardedAt: doc.discardedAt,
        });
        continue;
      }
      const w = doc.data;
      await db.update("user", { userId }, { $push: { weaponStock: w } });
      recoveredWeapons.push(w.weaponName);
      weaponsAdded++;
    }
  }

  // 組裝顯示文字
  const lines = [];
  if (recoveredItems.length > 0 || recoveredWeapons.length > 0) {
    lines.push("**NPC 在野外撿到了丟棄的物品！**");
    for (const ri of recoveredItems) {
      const stars = ri.itemLevel === 3 ? "★★★" : ri.itemLevel === 2 ? "★★" : "★";
      lines.push(`拾獲素材 [${stars}] ${ri.itemName} x${ri.qty}`);
    }
    for (const wn of recoveredWeapons) {
      lines.push(`拾獲武器【${wn}】`);
    }
  }

  return { recoveredText: lines.join("\n") };
}

module.exports = { recoverFromDiscardPool };
