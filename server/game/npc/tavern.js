const seedrandom = require("seedrandom");
const db = require("../../db.js");
const config = require("../config.js");
const { generateNpc } = require("./generator.js");
const { getCurrentGameDay } = require("../time/gameTime.js");

const POOL_SIZE = config.NPC.POOL_SIZE;
const TAVERN_COUNT = config.NPC.TAVERN_DAILY_COUNT;

/**
 * 取得今日酒館 NPC 列表（依遊戲日種子隨機挑選，跳過已雇/已死）
 * @param {number} [gameDay] - 遊戲日（預設當前）
 * @returns {Promise<object[]>} 酒館中可雇用的 NPC 陣列
 */
async function getTavernNpcs(gameDay) {
  if (gameDay === undefined) gameDay = getCurrentGameDay();

  const rng = seedrandom(`tavern:${gameDay}`);

  // 生成候選 index（避免重複）
  const candidates = [];
  const tried = new Set();
  let attempts = 0;
  while (candidates.length < TAVERN_COUNT * 5 && attempts < POOL_SIZE) {
    const idx = Math.floor(rng() * POOL_SIZE);
    if (!tried.has(idx)) {
      tried.add(idx);
      candidates.push(idx);
    }
    attempts++;
  }

  // 批量查詢已在 DB 中的 NPC
  const npcIds = candidates.map((i) => `npc_${i}`);
  const existingDocs = await db.find("npc", { npcId: { $in: npcIds } });
  const existingMap = {};
  for (const doc of existingDocs) {
    existingMap[doc.npcId] = doc;
  }

  // 過濾並組裝結果
  const result = [];
  for (const idx of candidates) {
    if (result.length >= TAVERN_COUNT) break;
    const npcId = `npc_${idx}`;
    const existing = existingMap[npcId];
    if (existing) {
      if (existing.status === "dead" || existing.status === "hired") continue;
      result.push({
        npcId: existing.npcId,
        name: existing.name,
        quality: existing.quality,
        baseStats: existing.baseStats,
        condition: existing.condition ?? 100,
        level: existing.level ?? 1,
        hireCost: existing.hireCost || config.NPC.HIRE_COST[existing.quality],
        monthlyCost: existing.monthlyCost || existing.weeklyCost || config.NPC.MONTHLY_WAGE[existing.quality],
        learnedSkills: existing.learnedSkills || [],
      });
    } else {
      // 即時生成（尚未寫入 DB）
      const generated = generateNpc(idx);
      result.push({
        npcId: generated.npcId,
        name: generated.name,
        quality: generated.quality,
        baseStats: generated.baseStats,
        condition: 100,
        level: 1,
        hireCost: generated.hireCost,
        monthlyCost: generated.monthlyCost,
        learnedSkills: generated.learnedSkills || [],
      });
    }
  }

  return result;
}

module.exports = { getTavernNpcs };
