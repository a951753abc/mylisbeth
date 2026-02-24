const db = require("../../db.js");
const config = require("../config.js");
const roll = require("../roll.js");
const itemCache = require("../cache/itemCache.js");
const { getFloorMineList } = require("../loot/battleLoot.js");
const { getRelicModifier } = require("../title/titleModifier.js");
const { pickExpeditionSkill } = require("./expeditionSkills.js");
const { getNpcSlotCount } = require("../skill/skillSlot.js");

const REWARDS = config.EXPEDITION.REWARDS;
const QUALITY_ORDER = config.RANDOM_EVENTS.QUALITY_ORDER;
const NPC_CFG = config.NPC;

/** 遠征專屬聖遺物定義 */
const EXPEDITION_RELICS = [
  {
    id: "expedition_relic_valor",
    name: "Medal of Valor",
    nameCn: "勇氣勳章",
    effects: { expeditionPower: 0.1 },
    description: "遠征戰力 +10%",
  },
  {
    id: "expedition_relic_fortune",
    name: "Fortune Charm",
    nameCn: "幸運護符",
    effects: { expeditionReward: 0.15 },
    description: "遠征獎勵 +15%",
  },
  {
    id: "expedition_relic_guardian",
    name: "Guardian Amulet",
    nameCn: "守護者護符",
    effects: { expeditionSafety: 0.2 },
    description: "遠征 NPC 死亡機率 -20%",
  },
];

/**
 * 產生遠征獎勵
 * @param {object} user
 * @param {object} expedition - activeExpedition 資料
 * @param {Array} hired - user.hiredNpcs
 * @returns {object} rewards
 */
async function generateRewards(user, expedition, hired) {
  const rewards = {
    col: 0,
    materials: [],
    qualityUpgrade: null,
    relic: null,
    npcSkill: null,
  };

  const npcCount = expedition.npcs.length;

  // Col 獎勵（套用聖遺物加成）
  const rawCol = REWARDS.COL_BASE + REWARDS.COL_PER_NPC * npcCount;
  const rewardMult = getRelicModifier(user.bossRelics, "expeditionReward");
  rewards.col = Math.round(rawCol * rewardMult);

  // 素材掉落
  const currentFloor = user.currentFloor || 1;
  const allItems = itemCache.getAll();
  const floorItems = getFloorMineList(allItems, currentFloor);

  if (floorItems.length > 0) {
    // ★★★ 素材（100% 掉落）
    if (roll.d100Check(REWARDS.THREE_STAR_CHANCE)) {
      const mat = floorItems[Math.floor(Math.random() * floorItems.length)];
      await db.atomicIncItem(user.userId, mat.itemId, 3, mat.name, 1);
      rewards.materials.push({ name: mat.name, level: 3, levelText: "★★★" });
    }

    // ★★★★ 素材（60% 掉落）
    if (roll.d100Check(REWARDS.FOUR_STAR_CHANCE)) {
      const mat = floorItems[Math.floor(Math.random() * floorItems.length)];
      await db.atomicIncItem(user.userId, mat.itemId, 4, mat.name, 1);
      rewards.materials.push({ name: mat.name, level: 4, levelText: "★★★★" });
    }
  }

  // NPC 品質提升（隨機選一位非傳說 NPC）
  if (roll.d100Check(REWARDS.QUALITY_UPGRADE_CHANCE)) {
    const eligibleNpcs = expedition.npcs.filter((en) => {
      const npc = hired.find((h) => h.npcId === en.npcId);
      if (!npc) return false;
      const qIdx = QUALITY_ORDER.indexOf(npc.quality);
      return qIdx >= 0 && qIdx < QUALITY_ORDER.length - 1;
    });

    if (eligibleNpcs.length > 0) {
      const chosen = eligibleNpcs[Math.floor(Math.random() * eligibleNpcs.length)];
      const npc = hired.find((h) => h.npcId === chosen.npcId);
      const npcIdx = hired.findIndex((h) => h.npcId === chosen.npcId);
      const oldQuality = npc.quality;
      const qualityIdx = QUALITY_ORDER.indexOf(oldQuality);
      const newQuality = QUALITY_ORDER[qualityIdx + 1];
      const newRange = NPC_CFG.STAT_RANGE[newQuality];

      // 重算 baseStats：保證不降
      const oldStats = npc.baseStats;
      const newBaseStats = {
        hp: Math.max(oldStats.hp, randInt(newRange.hp[0], newRange.hp[1])),
        atk: Math.max(oldStats.atk, randInt(newRange.atk[0], newRange.atk[1])),
        def: Math.max(oldStats.def, randInt(newRange.def[0], newRange.def[1])),
        agi: Math.max(oldStats.agi, randInt(newRange.agi[0], newRange.agi[1])),
      };
      const newMonthlyCost = NPC_CFG.MONTHLY_WAGE[newQuality];

      // 更新 user.hiredNpcs
      await db.update("user", { userId: user.userId }, {
        $set: {
          [`hiredNpcs.${npcIdx}.quality`]: newQuality,
          [`hiredNpcs.${npcIdx}.baseStats`]: newBaseStats,
          [`hiredNpcs.${npcIdx}.monthlyCost`]: newMonthlyCost,
        },
      });

      // 同步 npc collection
      await db.update("npc", { npcId: npc.npcId }, {
        $set: {
          quality: newQuality,
          baseStats: newBaseStats,
          monthlyCost: newMonthlyCost,
        },
      });

      rewards.qualityUpgrade = {
        npcName: npc.name,
        npcId: npc.npcId,
        oldQuality,
        newQuality,
        oldStats,
        newStats: newBaseStats,
        newMonthlyCost,
      };
    }
  }

  // 聖遺物（5% 機率，從未擁有的池中選取）
  if (roll.d100Check(REWARDS.RELIC_CHANCE)) {
    const existingRelicIds = (user.bossRelics || []).map((r) => r.id);
    const available = EXPEDITION_RELICS.filter(
      (r) => !existingRelicIds.includes(r.id),
    );

    if (available.length > 0) {
      const relic = available[Math.floor(Math.random() * available.length)];
      const relicObj = {
        id: relic.id,
        name: relic.name,
        nameCn: relic.nameCn,
        bossFloor: 0,
        effects: { ...relic.effects },
        obtainedAt: new Date(),
      };

      await db.update("user", { userId: user.userId }, {
        $push: { bossRelics: relicObj },
      });

      rewards.relic = relicObj;
    }
  }

  // NPC 遠征專屬技能學習（15% 機率，隨機一位 NPC）
  if (roll.d100Check(REWARDS.NPC_SKILL_CHANCE)) {
    // 洗牌避免永遠偏好排列最前的 NPC
    const shuffled = [...expedition.npcs].sort(() => Math.random() - 0.5);
    for (const en of shuffled) {
      const npc = hired.find((h) => h.npcId === en.npcId);
      if (!npc) continue;

      const selected = pickExpeditionSkill(npc);
      if (!selected) continue;

      // 使用 positional operator 以 npcId 定址，避免索引偏移
      await db.update(
        "user",
        { userId: user.userId, "hiredNpcs.npcId": npc.npcId },
        { $addToSet: { "hiredNpcs.$.learnedSkills": selected.id } },
      );

      // 自動裝備（有空槽時）
      const slotCount = getNpcSlotCount(npc);
      const equipped = npc.equippedSkills || [];
      if (equipped.length < slotCount) {
        await db.update(
          "user",
          { userId: user.userId, "hiredNpcs.npcId": npc.npcId },
          { $push: { "hiredNpcs.$.equippedSkills": { skillId: selected.id, mods: [] } } },
        );
      }

      rewards.npcSkill = {
        npcName: npc.name,
        skillId: selected.id,
        skillName: selected.nameCn,
      };
      break; // 每次遠征最多學一個
    }
  }

  return rewards;
}

/**
 * 在 [min, max] 範圍內取隨機整數
 */
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

module.exports = { generateRewards, EXPEDITION_RELICS };
