const db = require("../db.js");

const PAGE_SIZE = 15;
const CACHE_TTL = 30_000; // 30 seconds

// In-memory cache: key => { data, ts }
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// NPC quality $switch expression (reusable)
const NPC_QUALITY_SWITCH = {
  $switch: {
    branches: [
      { case: { $eq: ["$$this.quality", "傳說"] }, then: 5 },
      { case: { $eq: ["$$this.quality", "精銳"] }, then: 4 },
      { case: { $eq: ["$$this.quality", "優秀"] }, then: 3 },
      { case: { $eq: ["$$this.quality", "普通"] }, then: 2 },
      { case: { $eq: ["$$this.quality", "見習"] }, then: 1 },
    ],
    default: 0,
  },
};

// NPC quality $reduce expression (reusable)
const NPC_QUALITY_REDUCE = {
  $reduce: {
    input: { $ifNull: ["$hiredNpcs", []] },
    initialValue: 0,
    in: { $add: ["$$value", NPC_QUALITY_SWITCH] },
  },
};

// Power score $addFields expression (reusable)
const POWER_SCORE_EXPR = {
  $add: [
    { $multiply: [{ $ifNull: ["$forgeLevel", 1] }, 10] },
    { $multiply: [{ $ifNull: ["$mineLevel", 1] }, 8] },
    { $multiply: [{ $ifNull: ["$battleLevel", 1] }, 5] },
    { $multiply: [{ $ifNull: ["$currentFloor", 1] }, 12] },
    { $multiply: [{ $ifNull: ["$bossContribution.totalDamage", 0] }, 0.01] },
    { $multiply: [{ $ifNull: ["$bossContribution.mvpCount", 0] }, 20] },
    { $multiply: [{ $size: { $ifNull: ["$achievements", []] } }, 3] },
  ],
};

// ── getMyRank: two-query approach (avoids 16MB $group limit) ────

async function computeMyRank(matchStage, addFieldsStage, scoreField, userId) {
  // Step 1: Get the user's score
  const userPipeline = [
    ...(addFieldsStage ? [addFieldsStage] : []),
    { $match: { userId, ...((matchStage && matchStage.$match) || {}) } },
    { $project: { _score: `$${scoreField}` } },
  ];
  const userResult = await db.aggregate("user", userPipeline);
  if (userResult.length === 0 || userResult[0]._score == null) return null;

  const myScore = userResult[0]._score;

  // Step 2: Count users with higher score
  const countPipeline = [
    ...(addFieldsStage ? [addFieldsStage] : []),
    ...(matchStage ? [matchStage] : []),
    { $match: { [scoreField]: { $gt: myScore } } },
    { $count: "above" },
  ];
  const countResult = await db.aggregate("user", countPipeline);
  const above = countResult[0]?.above || 0;

  return { rank: above + 1, value: Math.floor(myScore) };
}

// ── Category definitions ─────────────────────────────────────────

const CATEGORIES = {
  // 1. 鍛造師之力（綜合實力）
  power: {
    subs: {},
    buildPipeline(sub, skip, limit) {
      return [
        { $addFields: { powerScore: POWER_SCORE_EXPR } },
        { $sort: { powerScore: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          powerScore: 1, currentFloor: 1, forgeLevel: 1,
          mineLevel: 1, battleLevel: 1,
        }},
      ];
    },
    buildCountPipeline() {
      return [{ $count: "total" }];
    },
    async getMyRank(userId) {
      return computeMyRank(
        null,
        { $addFields: { powerScore: POWER_SCORE_EXPR } },
        "powerScore",
        userId,
      );
    },
  },

  // 2. 攻略進度（Boss 協力）
  boss: {
    subs: {
      damage: { field: "bossContribution.totalDamage", default: true },
      defeated: { field: "bossContribution.bossesDefeated" },
      mvp: { field: "bossContribution.mvpCount" },
      lastAttack: { field: "bossContribution.lastAttackCount" },
    },
    buildPipeline(sub, skip, limit) {
      const info = this.subs[sub] || this.subs.damage;
      const sortField = info.field;
      return [
        { $match: { [sortField]: { $gt: 0 } } },
        { $sort: { [sortField]: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          "bossContribution.totalDamage": 1,
          "bossContribution.bossesDefeated": 1,
          "bossContribution.mvpCount": 1,
          "bossContribution.lastAttackCount": 1,
        }},
      ];
    },
    buildCountPipeline(sub) {
      const info = this.subs[sub] || this.subs.damage;
      return [
        { $match: { [info.field]: { $gt: 0 } } },
        { $count: "total" },
      ];
    },
    async getMyRank(userId, sub) {
      const info = this.subs[sub] || this.subs.damage;
      return computeMyRank(
        { $match: { [info.field]: { $gt: 0 } } },
        null,
        info.field,
        userId,
      );
    },
  },

  // 3. 決鬥場（PvP）
  arena: {
    subs: {
      wins: { field: "stats.duelKills", default: true },
      firstStrike: { field: "stats.firstStrikeWins" },
      pkKills: { field: "pkKills", filter: { pkKills: { $gt: 0 } } },
      battleLevel: { field: "battleLevel", secondary: "battleExp" },
    },
    buildPipeline(sub, skip, limit) {
      const info = this.subs[sub] || this.subs.wins;
      const sortField = info.field;
      const matchStage = info.filter
        ? { $match: info.filter }
        : { $match: { [sortField]: { $gt: 0 } } };
      const sort = info.secondary
        ? { [sortField]: -1, [info.secondary]: -1 }
        : { [sortField]: -1 };

      return [
        matchStage,
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        { $addFields: {
          duelTotal: { $add: [
            { $ifNull: ["$stats.duelKills", 0] },
            { $ifNull: ["$stats.duelLosses", 0] },
          ]},
        }},
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          "stats.duelKills": 1, "stats.duelLosses": 1,
          "stats.firstStrikeWins": 1,
          pkKills: 1, battleLevel: 1, battleExp: 1,
          duelTotal: 1,
        }},
      ];
    },
    buildCountPipeline(sub) {
      const info = this.subs[sub] || this.subs.wins;
      const matchStage = info.filter || { [info.field]: { $gt: 0 } };
      return [{ $match: matchStage }, { $count: "total" }];
    },
    async getMyRank(userId, sub) {
      const info = this.subs[sub] || this.subs.wins;
      const matchStage = info.filter || { [info.field]: { $gt: 0 } };
      return computeMyRank(
        { $match: matchStage },
        null,
        info.field,
        userId,
      );
    },
  },

  // 4. 商會排行（經濟）
  economy: {
    subs: {
      totalEarned: { field: "stats.totalColEarned", default: true },
      market: { field: "stats.totalMarketEarned" },
      currentCol: { field: "col" },
    },
    buildPipeline(sub, skip, limit) {
      const info = this.subs[sub] || this.subs.totalEarned;
      const sortField = info.field;
      return [
        { $match: { [sortField]: { $gt: 0 } } },
        { $sort: { [sortField]: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          col: 1,
          "stats.totalColEarned": 1,
          "stats.totalMarketEarned": 1,
        }},
      ];
    },
    buildCountPipeline(sub) {
      const info = this.subs[sub] || this.subs.totalEarned;
      return [{ $match: { [info.field]: { $gt: 0 } } }, { $count: "total" }];
    },
    async getMyRank(userId, sub) {
      const info = this.subs[sub] || this.subs.totalEarned;
      return computeMyRank(
        { $match: { [info.field]: { $gt: 0 } } },
        null,
        info.field,
        userId,
      );
    },
  },

  // 5. 活動紀錄（勤勉度）
  activity: {
    subs: {
      forges: { field: "stats.totalForges", default: true },
      mines: { field: "stats.totalMines" },
      adventures: { field: "stats.totalAdventures" },
      missions: { field: "stats.totalMissionsCompleted" },
      achievements: { computed: true },
    },
    buildPipeline(sub, skip, limit) {
      if (sub === "achievements") {
        return [
          { $addFields: { achievementCount: { $size: { $ifNull: ["$achievements", []] } } } },
          { $match: { achievementCount: { $gt: 0 } } },
          { $sort: { achievementCount: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: {
            userId: 1, name: 1, title: 1, isPK: 1,
            achievementCount: 1,
          }},
        ];
      }
      const info = this.subs[sub] || this.subs.forges;
      const sortField = info.field;
      return [
        { $match: { [sortField]: { $gt: 0 } } },
        { $sort: { [sortField]: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          "stats.totalForges": 1, "stats.totalMines": 1,
          "stats.totalAdventures": 1, "stats.totalMissionsCompleted": 1,
        }},
      ];
    },
    buildCountPipeline(sub) {
      if (sub === "achievements") {
        return [
          { $addFields: { achievementCount: { $size: { $ifNull: ["$achievements", []] } } } },
          { $match: { achievementCount: { $gt: 0 } } },
          { $count: "total" },
        ];
      }
      const info = this.subs[sub] || this.subs.forges;
      return [{ $match: { [info.field]: { $gt: 0 } } }, { $count: "total" }];
    },
    async getMyRank(userId, sub) {
      if (sub === "achievements") {
        return computeMyRank(
          { $match: { achievementCount: { $gt: 0 } } },
          { $addFields: { achievementCount: { $size: { $ifNull: ["$achievements", []] } } } },
          "achievementCount",
          userId,
        );
      }
      const info = this.subs[sub] || this.subs.forges;
      return computeMyRank(
        { $match: { [info.field]: { $gt: 0 } } },
        null,
        info.field,
        userId,
      );
    },
  },

  // 6. 收藏家
  collection: {
    subs: {
      relics: { computed: true, default: true },
      weapons: { computed: true },
      npcTeam: { computed: true },
    },
    buildPipeline(sub, skip, limit) {
      if (sub === "relics") {
        return [
          { $addFields: { relicCount: { $size: { $ifNull: ["$bossRelics", []] } } } },
          { $match: { relicCount: { $gt: 0 } } },
          { $sort: { relicCount: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: {
            userId: 1, name: 1, title: 1, isPK: 1,
            relicCount: 1,
          }},
        ];
      }
      if (sub === "weapons") {
        return [
          { $addFields: {
            epicLegendaryCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$weaponStock", []] },
                  cond: { $in: ["$$this.rarity", ["epic", "legendary"]] },
                },
              },
            },
          }},
          { $match: { epicLegendaryCount: { $gt: 0 } } },
          { $sort: { epicLegendaryCount: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: {
            userId: 1, name: 1, title: 1, isPK: 1,
            epicLegendaryCount: 1,
          }},
        ];
      }
      // npcTeam — use two $project stages to avoid mixing exclusion with computed expression
      return [
        { $addFields: { npcQualityScore: NPC_QUALITY_REDUCE } },
        { $match: { npcQualityScore: { $gt: 0 } } },
        { $sort: { npcQualityScore: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: {
          userId: 1, name: 1, title: 1, isPK: 1,
          npcQualityScore: 1,
          hiredNpcs: { $map: {
            input: { $ifNull: ["$hiredNpcs", []] },
            in: { name: "$$this.name", quality: "$$this.quality" },
          }},
        }},
      ];
    },
    buildCountPipeline(sub) {
      if (sub === "relics") {
        return [
          { $addFields: { relicCount: { $size: { $ifNull: ["$bossRelics", []] } } } },
          { $match: { relicCount: { $gt: 0 } } },
          { $count: "total" },
        ];
      }
      if (sub === "weapons") {
        return [
          { $addFields: {
            epicLegendaryCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$weaponStock", []] },
                  cond: { $in: ["$$this.rarity", ["epic", "legendary"]] },
                },
              },
            },
          }},
          { $match: { epicLegendaryCount: { $gt: 0 } } },
          { $count: "total" },
        ];
      }
      // npcTeam — use same $switch formula as data pipeline
      return [
        { $addFields: { npcQualityScore: NPC_QUALITY_REDUCE } },
        { $match: { npcQualityScore: { $gt: 0 } } },
        { $count: "total" },
      ];
    },
    async getMyRank(userId, sub) {
      if (sub === "relics") {
        return computeMyRank(
          { $match: { relicCount: { $gt: 0 } } },
          { $addFields: { relicCount: { $size: { $ifNull: ["$bossRelics", []] } } } },
          "relicCount",
          userId,
        );
      }
      if (sub === "weapons") {
        return computeMyRank(
          { $match: { epicLegendaryCount: { $gt: 0 } } },
          { $addFields: {
            epicLegendaryCount: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$weaponStock", []] },
                  cond: { $in: ["$$this.rarity", ["epic", "legendary"]] },
                },
              },
            },
          }},
          "epicLegendaryCount",
          userId,
        );
      }
      // npcTeam
      return computeMyRank(
        { $match: { npcQualityScore: { $gt: 0 } } },
        { $addFields: { npcQualityScore: NPC_QUALITY_REDUCE } },
        "npcQualityScore",
        userId,
      );
    },
  },
};

// ── Public API ────────────────────────────────────────────────────

async function getLeaderboard(category, sub, page, requesterId) {
  const cat = CATEGORIES[category];
  if (!cat) return { error: "無效的排行榜分類" };

  // Resolve sub: use default if not specified, or first key
  const subKeys = Object.keys(cat.subs);
  const resolvedSub = sub || subKeys.find((k) => cat.subs[k]?.default) || subKeys[0] || null;

  // Validate sub if provided
  if (resolvedSub && !cat.subs[resolvedSub]) {
    return { error: "無效的子排行" };
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const skip = (p - 1) * PAGE_SIZE;

  // Try cache for player list
  const cacheKey = `${category}:${resolvedSub || ""}:${p}`;
  const cached = getCached(cacheKey);
  if (cached) {
    const myRank = requesterId ? await cat.getMyRank(requesterId, resolvedSub) : null;
    return { ...cached, myRank };
  }

  // Get total count
  const countPipeline = cat.buildCountPipeline(resolvedSub);
  const countResult = await db.aggregate("user", countPipeline);
  const totalPlayers = countResult[0]?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));

  // Get players
  const pipeline = cat.buildPipeline(resolvedSub, skip, PAGE_SIZE);
  const rawPlayers = await db.aggregate("user", pipeline);

  // Add rank numbers
  const players = rawPlayers.map((player, i) => ({
    rank: skip + i + 1,
    ...player,
    _id: undefined,
  }));

  const result = {
    players,
    page: p,
    totalPages,
    totalPlayers,
    category,
    subRanking: resolvedSub,
  };

  setCache(cacheKey, result);

  // My rank (not cached — needs to be real-time)
  const myRank = requesterId ? await cat.getMyRank(requesterId, resolvedSub) : null;

  return { ...result, myRank };
}

async function getMyRank(category, sub, userId) {
  const cat = CATEGORIES[category];
  if (!cat) return null;

  const subKeys = Object.keys(cat.subs);
  const resolvedSub = sub || subKeys.find((k) => cat.subs[k]?.default) || subKeys[0] || null;

  return cat.getMyRank(userId, resolvedSub);
}

module.exports = { getLeaderboard, getMyRank, CATEGORIES };
