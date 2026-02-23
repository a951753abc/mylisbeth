module.exports = {
  MAX_ONLINE_PLAYERS: 50,
  MOVE_COOLDOWN: 5000,

  // Season 3: 遊戲時間
  TIME_SCALE: 5 * 60 * 1000, // 5 分鐘現實時間 = 1 遊戲日
  NEWBIE_PROTECTION_DAYS: 3, // 新手保護期（遊戲日）

  // Season 3: 帳單結算（Season 6: 週→月制）
  SETTLEMENT: {
    BASE_RENT: 100,           // 基礎租金（每月）
    FLOOR_TAX_PER_FLOOR: 30, // 每層樓稅（每月）
    INTERVAL_GAME_DAYS: 30,  // 結算間隔（遊戲日）— Season 6: 7→30
    MAX_DEBT_CYCLES: 3,       // 最多負債幾個週期才破產
    LOAN_MIN: 50,              // 最低借款金額
    LOAN_MAX_BILL_MULT: 2,    // 每次最多借 bill * 此倍數
    LOAN_DEATH_PER_BILL: 15,  // 每 1x bill 負債 = 15% 破產機率
    LOAN_DEATH_CAP: 90,       // 破產機率上限 (%)
  },

  // Season 3: NPC 雇用
  NPC: {
    POOL_SIZE: 8000,          // 固定 NPC 池大小
    TAVERN_DAILY_COUNT: 3,    // 酒館每日顯示 NPC 數量
    // 品質分布（百分比）
    QUALITY_DIST: {
      見習: 16,
      普通: 68,
      優秀: 13.5,
      精銳: 2.4,
      傳說: 0.1,
    },
    // 各品質基礎素質範圍 [min, max]
    STAT_RANGE: {
      見習: { hp: [20, 40], atk: [1, 2], def: [0, 1], agi: [1, 2] },
      普通: { hp: [40, 80], atk: [2, 4], def: [1, 2], agi: [2, 3] },
      優秀: { hp: [80, 120], atk: [4, 6], def: [2, 3], agi: [3, 4] },
      精銳: { hp: [120, 180], atk: [6, 9], def: [3, 5], agi: [4, 6] },
      傳說: { hp: [180, 260], atk: [9, 14], def: [5, 7], agi: [6, 9] },
    },
    // 雇用費（一次性）
    HIRE_COST: {
      見習: 100,
      普通: 200,
      優秀: 500,
      精銳: 1200,
      傳說: 3000,
    },
    // 月薪（每結算週期）— Season 6: 週薪→月薪
    MONTHLY_WAGE: {
      見習: 50,
      普通: 100,
      優秀: 250,
      精銳: 600,
      傳說: 1500,
    },
    // 向後相容 alias
    get WEEKLY_WAGE() { return this.MONTHLY_WAGE; },
    // 冒險體力損耗
    CONDITION_LOSS: {
      WIN: 15,
      LOSE: 40,
      DRAW: 25,
    },
    // 體力死亡閾值（condition <= 此值且戰敗時有 80% 機率死亡）
    DEATH_THRESHOLD: 20,
    DEATH_CHANCE: 80,
    // 治療費用
    HEAL_QUICK_COST: 50,   // 快速治療（+30 condition）
    HEAL_FULL_COST: 200,   // 完全治療（100% condition）
    // 每遊戲日自然恢復
    DAILY_RECOVER: 5,
    // 雇用上限（公式：min(MAX, BASE + floor(adventureLevel / PER_ADV_LEVEL))）
    HIRE_LIMIT_BASE: 2,
    HIRE_LIMIT_PER_ADV_LEVEL: 3, // 每 3 級冒險等級 +1 人
    HIRE_LIMIT_MAX: 6,
    // 升級經驗需求基數
    EXP_BASE: 100,
    EXP_MULTIPLIER: 1.5,
    LEVEL_STAT_GROWTH: 0.08,
  },

  ENEMY_PROBABILITY: {
    YUKI: 99,
    HELL: 90,
    HARD: 50,
    NORMAL: 10,
    EASY: 0,
  },

  // 封印武器（歷史 BUG 產物，buff > BUFF_MAX）
  SEALED_WEAPON: {
    SELL_SCORE_MULTIPLIER: 10,  // 售價 = totalScore × 10
    TITLE: "超越系統的鍛造",
  },

  BUFF_BASE_CHANCE: 20,
  BUFF_MAX: 10,                    // 武器強化上限
  BUFF_FORGE_LEVEL_MULT: 3,       // 成功率公式：forgeLevel * 3（原本 * 10）
  BUFF_COUNT_PENALTY: 5,          // 每次已強化 -5% 成功率（前段）
  BUFF_HIGH_THRESHOLD: 5,         // buffCount > 此值時啟用衰減懲罰
  BUFF_HIGH_PENALTY: 3,           // 高強化階段每次只扣 3%
  BUFF_HP_MULTIPLIER: 5,          // HP 屬性倍率（相對其他屬性）

  // 鍛造素材星級加成倍率（乘以 forgeLevel）
  FORGE_STAR_MULT: { 1: 1.0, 2: 1.5, 3: 2.0 },

  // 3+ 素材額外加成
  FORGE_EXTRA_MAT: {
    BASE_BONUS: 2,                 // 保底加成量（舊 = 1）
    FOURTH_DURABILITY: 2,          // 第 4 素材額外耐久
    FOURTH_INNATE_BONUS: 10,       // 第 4 素材額外固有效果機率 (%)
  },

  // 稀有度計算中耐久度權重（0.5 = 只計入一半）
  RARITY_DURABILITY_WEIGHT: 0.5,

  WEAPON_DAMAGE_CHANCE: {
    WIN: 50,
    DEAD: 80,
    DRAW: 25,
  },

  INITIAL_ITEM_LIMIT: 7,
  INITIAL_WEAPON_LIMIT: 3,

  // 丟棄 & 撿拾系統
  DISCARD: {
    // NPC 冒險撿拾機率（d100Check）
    RECOVERY_CHANCE: { WIN: 30, DRAW: 15, LOSE: 5 },
    // 丟棄池最大數量（防止無限增長）
    MAX_POOL_SIZE: 500,
  },

  // Season 2: Col 貨幣
  COL_ADVENTURE_REWARD: {
    "[Easy]": 50,
    "[Normal]": 100,
    "[Hard]": 200,
    "[Hell]": 400,
    "[優樹]": 500,
  },
  COL_PVP_WIN: 150, // deprecated: Season 5 改為賭注制
  COL_BOSS_MVP_BONUS: 500,
  COL_BOSS_LA_BONUS: 300,
  // Season 2: Boss 系統
  BOSS_TIMEOUT_MS: 72 * 60 * 60 * 1000,

  // Boss 反擊機制
  BOSS_COUNTER: {
    ATK_MULT: 0.5,        // Boss 反擊 ATK 倍率
    AGI_BONUS: 4,         // Boss 反擊額外 AGI 加成（確保高 agi NPC 也有被命中的風險）
    BOSS_CRI: 11,         // 反擊暴擊門檻（d66 >= 11，約 8.3%）
    WIN_THRESHOLD: 0.40,  // 傷害/HP < 40% → WIN（仍用於死亡判定）
    LOSE_THRESHOLD: 0.75, // 傷害/HP >= 75% → LOSE（仍用於死亡判定）
    // 中間 40%~75% → DRAW
    // 比例式體力損耗參數
    COND_DODGE: 5,        // 閃避時最低疲勞
    COND_MIN: 8,          // 命中時最低體力損耗（高於 COND_DODGE，被擦傷 > 完美閃避）
    COND_MAX: 50,         // 命中時最高體力損耗（damageRatio = 100%）
    COND_PER_ATK_BOOST: 3, // 每點 bossAtkBoost 額外體力損耗
  },
  // Boss 5 回合循環戰鬥（取代單次反擊）
  BOSS_COMBAT: {
    ATK_MULT: 0.35,          // Boss ATK 倍率（5 回合分攤，比單次反擊 0.5 低）
    AGI_BONUS: 4,             // Boss 額外 AGI 加成
    BOSS_CRI: 11,             // Boss 暴擊門檻（d66 >= 11）
    COND_MIN: 8,              // 最低體力損耗
    COND_MAX: 55,             // 最高體力損耗（5 回合累計傷害更高，略高於舊的 50）
    COND_PER_ATK_BOOST: 2,   // 每點 bossAtkBoost 額外體力損耗（降低，因 ATK 已分攤到多回合）
  },
  FLOOR_MAX_EXPLORE: 5,

  // Season 2: 武器修復
  COL_REPAIR_COST: {
    common: 50,
    fine: 100,
    rare: 200,
    epic: 400,
    legendary: 800,
  },
  REPAIR_SUCCESS_RATE: 85,
  REPAIR_FAIL_COL_REFUND: 0.5,    // 修復失敗時返還 Col 比例
  REPAIR_FAIL_DURABILITY: 1,      // 修復失敗時仍恢復的耐久點數

  // Season 6: 冒險委託費（勝利時從獎勵扣 10%）
  COL_ADVENTURE_FEE_RATE: 0.10,
  // deprecated: Season 6 改為勝利扣費制
  COL_ADVENTURE_FEE_BASE: 30,
  COL_ADVENTURE_FEE_PER_FLOOR: 10,

  // Season 10: 樓層往返
  FLOOR_TRAVEL: {
    PROF_DECAY_PER_FLOOR: 0.25, // 每差 1 層，熟練度衰減 25%
    PROF_MIN_MULT: 0,           // 最低倍率（差 4 層以上 = 0%）
  },

  // Season 2: 樓層素材分組 (每 2 層一組新素材)
  FLOOR_MATERIAL_GROUPS: [
    { floors: [1, 2], itemIds: ["mat_floor1_ore", "mat_floor1_crystal"] },
    { floors: [3, 4], itemIds: ["mat_floor3_ore", "mat_floor3_crystal", "mat_fabric_silk", "mat_gem_emerald"] },
    { floors: [5, 6], itemIds: ["mat_floor5_ore", "mat_floor5_crystal", "mat_leather_light", "mat_gem_ruby"] },
    { floors: [7, 8], itemIds: ["mat_floor7_ore", "mat_floor7_crystal", "mat_fabric_tough", "mat_gem_sapphire"] },
    { floors: [9, 10], itemIds: ["mat_floor9_ore", "mat_floor9_crystal", "mat_leather_dragon", "mat_gem_diamond"] },
    { floors: [11, 12], itemIds: ["mat_floor11_ore", "mat_floor11_crystal", "mat_fabric_silk"] },
    { floors: [13, 14], itemIds: ["mat_floor13_ore", "mat_floor13_crystal", "mat_leather_light"] },
    { floors: [15, 16], itemIds: ["mat_floor15_ore", "mat_floor15_crystal", "mat_gem_ruby", "mat_fabric_tough"] },
    { floors: [17, 18], itemIds: ["mat_floor17_ore", "mat_floor17_crystal", "mat_gem_sapphire", "mat_leather_dragon"] },
    { floors: [19, 20], itemIds: ["mat_floor19_ore", "mat_floor19_crystal", "mat_gem_diamond", "mat_gem_emerald"] },
  ],

  // Season 3: 玩家體力值
  STAMINA: {
    MAX: 100,
    RECOVERY_PER_GAME_DAY: 20, // 每遊戲日（5 分鐘）回復 20 點
    COST: {
      mine:     { min: 1,  max: 6  },  // d6
      forge:    { min: 3,  max: 8  },  // d6+2
      repair:   { min: 1,  max: 5  },  // max(1, d6-1)
      soloAdv:  { min: 15, max: 25 },  // 15-25（高風險行動）
    },
  },

  // Season 3.5: 隨機事件
  RANDOM_EVENTS: {
    TRIGGER_ACTIONS: ["mine", "soloAdv", "adv"],
    LAUGHING_COFFIN: {
      CHANCE: 3,                        // 觸發機率 (%)
      // 敵方基礎數值（隨樓層 scaling: base * (1 + floor * 0.15)）
      ENEMY_BASE: {
        HP: 60,
        ATK: 4,
        DEF: 2,
        AGI: 3,
        CRI: 9,
      },
      // 勝利獎勵
      WIN_COL_MIN: 100,
      WIN_COL_MAX: 300,
      // 平手損失
      DRAW_COL_LOSS_RATE: 0.10,        // 損失 10% Col
      // 敗北搶奪
      LOSE_COL_LOSS_RATE: 0.25,        // 搶走 25% Col
      LOSE_COL_MIN: 20,                // 至少搶 20 Col
      LOSE_STEAL_MATERIAL: true,       // 隨機搶 1 素材
      LOSE_STEAL_WEAPON_CHANCE: 10,    // 10% 搶武器（需 2+ 把）
      // 敗北死亡機率（依動作類型不同）
      DEATH_CHANCE: {
        mine: 15,                       // 挖礦時毫無防備
        soloAdv: 10,                    // 至少有武器在手
        adv: 15,                        // NPC 替玩家擋刀（NPC 死亡）
      },
    },
    // Season 8: 神秘寶箱
    MYSTERIOUS_CHEST: {
      CHANCE: 2,                        // 觸發機率 (%)
      WIN_COL_MIN: 50,
      WIN_COL_MAX: 150,
      LOSE_COL_MIN: 30,
      LOSE_COL_MAX: 80,
    },
    // Season 8: 流浪鍛冶師
    WANDERING_BLACKSMITH: {
      CHANCE: 2,                        // 觸發機率 (%)
      CHAT_COL_MIN: 20,
      CHAT_COL_MAX: 50,
    },
    // Season 8: 迷宮裂隙
    LABYRINTH_RIFT: {
      CHANCE: 1,                        // 觸發機率 (%)
      MIN_CONDITION: 40,                // NPC 體力門檻
      LOSE_CONDITION: 20,               // 失敗時額外體力消耗
      FLOOR_BONUS: 2,                   // 探索樓層 +2
    },
    // Season 8: NPC 覺醒
    NPC_AWAKENING: {
      CHANCE: 1,                        // 觸發機率 (%)
    },
    // 品質升級順序
    QUALITY_ORDER: ["見習", "普通", "優秀", "精銳", "傳說"],
  },

  // Season 9: 劍技系統
  SKILL: {
    MAX_PROFICIENCY: 1000,
    PROF_GAIN: {
      ADV_WIN: 8, ADV_DRAW: 4, ADV_LOSE: 2,
      SOLO_WIN: 10, SOLO_DRAW: 5, SOLO_LOSE: 2,
      PVP_WIN: 12, PVP_LOSE: 6,
      BOSS: 15,
    },
    // 玩家技能槽位
    PLAYER_SLOTS_BASE: 2,
    PLAYER_SLOTS_PER_100_PROF: 1,
    PLAYER_SLOTS_MAX: 8,
    // NPC 技能槽位
    NPC_SLOTS_BASE: 1,
    NPC_SLOTS_PER_2_LEVEL: 1,
    NPC_SLOTS_MAX: 5,
    NPC_QUALITY_BONUS: { 見習: 0, 普通: 0, 優秀: 1, 精銳: 1, 傳說: 2 },
    // NPC 自動學習
    NPC_LEARN_CHANCE: 5,  // 每場戰鬥 5% 學習新技能
    NPC_QUALITY_LEARN_MULT: { 見習: 0.5, 普通: 1.0, 優秀: 1.5, 精銳: 2.0, 傳說: 3.0 },
    // Mod 系統
    MOD_SLOTS_PER_50_PROF: 1,
    MOD_MAX_PER_SKILL: 3,
    MOD_INSTALL_COST_MULT: 1.0, // Col 乘數（可用 configManager 調整）
    // Skill Connect
    CONNECT_MAX_CHAIN: 3,
    CONNECT_DAMAGE_BONUS: 0.15,  // 每個連鎖 +15%
    CONNECT_BASE_CHANCE: 40,
    CONNECT_PROF_BONUS_PER_100: 5,
  },

  // Season 9: 武器固有效果
  WEAPON_INNATE: {
    BASE_CHANCE: 5,           // 基礎觸發機率 (%)
    FORGE_LEVEL_MULT: 2,     // forgeLevel × 此值 加到機率
    MAX_EFFECTS: 2,           // 每把武器最多固有效果數
  },

  // 素材組合加成
  FORGE_COMBO: {
    FLOOR_SET: { BASE_ATK: 1, BASE_DEF: 1 },
    IDENTICAL: { BONUS_PER_EXTRA: 1 },
    CROSS_FLOOR: { MIN_FLOOR_GAP: 4, BONUS: 1 },
    STAR_HARMONY: { STAR_3: 2, STAR_2: 1 },
  },

  // 戰鬥通用常數
  BATTLE: {
    ROUND_LIMIT: 5,
  },

  // Season 5: PVP 決鬥系統
  PVP: {
    BASE_HP: 100,
    MODES: { FIRST_STRIKE: "first_strike", HALF_LOSS: "half_loss", TOTAL_LOSS: "total_loss" },
    FIRST_STRIKE_HP_THRESHOLD: 0.10,     // 單擊造成 >= 10% maxHP 即勝
    // Total Loss 死亡機率
    TOTAL_LOSS_BASE_DEATH_CHANCE: 20,     // 基礎 20%
    TOTAL_LOSS_POVERTY_DEATH_BONUS: 30,   // 沒錢沒素材 +30%
    TOTAL_LOSS_DEATH_CAP: 80,
    // 紅名設定
    RED_NAME_DURATION_DAYS: -1,           // -1 = 永久
    // 賭注（First Strike / Half Loss 模式）
    WAGER_TAX: 0.05,                     // 5% 系統稅
    WAGER_MIN: 0,                        // 最低賭注（0 = 允許榮譽決鬥）
    WAGER_MAX: 5000,
    // Total Loss 模式掠奪
    TOTAL_LOSS_COL_LOOT_RATE: 0.50,      // 搶走 50% Col
    TOTAL_LOSS_STEAL_ITEM: true,          // 隨機偷 1 素材
    // 冷卻與限制
    DAILY_DUEL_LIMIT: 0,                 // 0 = 無限制
    SAME_TARGET_COOLDOWN_MS: 1 * 60 * 1000,   // 同一對手冷卻 1 分鐘
    STAMINA_COST: { min: 5, max: 10 },   // 體力消耗
  },

  // Season 5: 戰鬥等級
  BATTLE_LEVEL: {
    MAX_LEVEL: 30,
    EXP_PVP_WIN: 80,
    EXP_SOLO_WIN: 30,
    EXP_LC_WIN: 50,
    EXP_BASE: 100,
    EXP_MULTIPLIER: 1.5,
    STAT_BONUS: { hp: 3 },              // 每級 +3 HP (flat)
    STAT_RATE: { atk: 0.04, def: 0.03, agi: 0.02 },  // 每級 % 加成
  },

  // Season 7: 冒險等級（決定 NPC 雇用上限）
  ADV_LEVEL: {
    MAX_LEVEL: 30,
    EXP_BASE: 80,
    EXP_MULTIPLIER: 1.4,
    // 經驗值來源
    EXP_ADV_WIN: 25,            // NPC 冒險勝利
    EXP_ADV_DRAW: 8,            // NPC 冒險平手
    EXP_ADV_LOSE: 3,            // NPC 冒險敗北
    EXP_MISSION_SUCCESS: 20,    // NPC 任務成功
    EXP_MISSION_FAIL: 5,        // NPC 任務失敗
    EXP_BOSS_ATTACK: 30,        // Boss 攻擊
  },

  // 死亡原因常數（用於 bankruptcy_log 查詢，list.js / graveyard 共用）
  DEATH_CAUSES: [
    "solo_adventure_death",
    "laughing_coffin_mine",
    "laughing_coffin_solo",
    "debt",
    "pvp_total_loss",
  ],

  // Season 3.5: 回收商店（Season 6: 依星級/稀有度定價）
  SHOP: {
    MATERIAL_STAR_MULT: { 1: 1, 2: 3, 3: 6 },
    WEAPON_RARITY_MULT: { common: 1, fine: 3, rare: 8, epic: 20, legendary: 50 },
  },

  // Season 6: 佈告板掛賣系統
  MARKET: {
    MATERIAL_BASE_PRICE: { 1: 5, 2: 15, 3: 40 },
    WEAPON_BASE_PRICE: { common: 20, fine: 60, rare: 150, epic: 400, legendary: 1000 },
    NPC_BUY_THRESHOLD: 1.5,
    NPC_BUY_BASE_CHANCE: 30,
    MAX_LISTINGS: 10,
    LISTING_FEE_RATE: 0.02,
    MAX_LISTING_DAYS: 30,
  },

  // Season 6: NPC 自主任務
  NPC_MISSIONS: {
    TYPES: [
      { id: "patrol",  name: "巡邏",     duration: 3,  baseReward: 80,  floorMult: 0.2, successRate: 85, condCost: 10, failCondCost: 25, deathChance: 10 },
      { id: "gather",  name: "採集委託", duration: 5,  baseReward: 150, floorMult: 0.3, successRate: 75, condCost: 15, failCondCost: 30, deathChance: 15 },
      { id: "escort",  name: "護送任務", duration: 10, baseReward: 350, floorMult: 0.5, successRate: 65, condCost: 20, failCondCost: 40, deathChance: 20 },
    ],
    QUALITY_MULT: { 見習: 0.6, 普通: 1.0, 優秀: 1.5, 精銳: 2.0, 傳說: 3.0 },
    COMMISSION_RATE: 0.10,
    CONCURRENT_LIMIT: 2,       // 同時派遣任務上限
  },

  // Season 11: NPC 自主修練
  NPC_TRAINING: {
    TYPES: [
      { id: "quick_training",     name: "快速修練", duration: 2,  profGain: 20, learnChanceMult: 3.0, condCost: 5,  expReward: 15 },
      { id: "intensive_training", name: "集中修練", duration: 6,  profGain: 40, learnChanceMult: 5.0, condCost: 10, expReward: 40 },
    ],
    FLOOR_MULT: 0.3,           // 每有效樓層（currentFloor - 3）增加 30% 收益
    CONCURRENT_LIMIT: 2,       // 修練獨立上限（與任務分開）
    PROF_CAP_PER_FLOOR: 100,   // 修練熟練度上限 = effectiveFloor × 100
    LEVEL_CAP_PER_FLOOR: 2,    // 修練等級上限 = effectiveFloor × 2
  },

  // Season 12: 鍛造等級附加功能
  FORGE_PERKS: {
    RECIPE_BOOK_LEVEL: 2,             // 配方書解鎖等級
    STAT_BOOK_LEVEL: 3,               // 素材強化記錄書解鎖等級
  },

  // Season 12: 挖礦等級附加功能
  MINE_PERKS: {
    CONTINUOUS_MINING_LEVEL: 2,     // 連續挖礦解鎖等級
    MATERIAL_BOOK_LEVEL: 3,         // 素材記錄書解鎖等級
    PRECISE_MINING_LEVEL: 4,        // 精準挖礦（自動售 ★1）解鎖等級
    ORE_RADAR_LEVEL: 6,             // 礦脈探測解鎖等級
    BULK_SELL_LEVEL: 8,             // 批量出售（自動售 ★2）解鎖等級
    MASTER_EYE_LEVEL: 10,           // 大師之眼解鎖等級
    MASTER_EYE_CHANCE: 10,          // 大師之眼觸發機率 (%)
    BUDGET_OPTIONS: [6, 12, 18, 24, 30],  // 前端下拉預設選項
    MAX_BUDGET: 200,                        // 連續挖礦體力預算上限（含「全部體力」）
  },

  // Season 3.5: 鍛造師親自冒險
  SOLO_ADV: {
    // 鍛造師基礎素質
    BASE_HP:  30,
    BASE_ATK: 1,
    BASE_DEF: 0,
    BASE_AGI: 1,
    BASE_CRI: 10,
    // 死亡判定機率（%）
    DEATH_ON_LOSE: 80,  // 敗北 → 80% 死亡
    DEATH_ON_DRAW: 30,  // 平手 → 30% 死亡
  },
};
