module.exports = {
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

  BUFF_BASE_CHANCE: 20,
  BUFF_MAX: 10,                    // 武器強化上限
  BUFF_FORGE_LEVEL_MULT: 3,       // 成功率公式：forgeLevel * 3（原本 * 10）
  BUFF_COUNT_PENALTY: 5,          // 每次已強化 -5% 成功率
  BUFF_HP_MULTIPLIER: 5,          // HP 屬性倍率（相對其他屬性）

  WEAPON_DAMAGE_CHANCE: {
    WIN: 50,
    DEAD: 80,
    DRAW: 25,
  },

  INITIAL_ITEM_LIMIT: 5,
  INITIAL_WEAPON_LIMIT: 1,

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
  COL_DAILY: [50, 100, 150, 200, 300, 400, 500],

  // Season 2: Boss 系統
  BOSS_TIMEOUT_MS: 72 * 60 * 60 * 1000,

  // Boss 反擊機制
  BOSS_COUNTER: {
    ATK_MULT: 0.5,        // Boss 反擊 ATK 倍率
    BOSS_CRI: 11,         // 反擊暴擊門檻（d66 >= 11，約 8.3%）
    WIN_THRESHOLD: 0.40,  // 傷害/HP < 40% → WIN
    LOSE_THRESHOLD: 0.75, // 傷害/HP >= 75% → LOSE
    // 中間 40%~75% → DRAW
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

  // Season 6: 冒險委託費（勝利時從獎勵扣 10%）
  COL_ADVENTURE_FEE_RATE: 0.10,
  // deprecated: Season 6 改為勝利扣費制
  COL_ADVENTURE_FEE_BASE: 30,
  COL_ADVENTURE_FEE_PER_FLOOR: 10,

  // Season 2: 樓層素材分組 (每 2 層一組新素材)
  FLOOR_MATERIAL_GROUPS: [
    { floors: [1, 2], itemIds: ["mat_floor1_ore", "mat_floor1_crystal"] },
    { floors: [3, 4], itemIds: ["mat_floor3_ore", "mat_floor3_crystal"] },
    { floors: [5, 6], itemIds: ["mat_floor5_ore", "mat_floor5_crystal"] },
    { floors: [7, 8], itemIds: ["mat_floor7_ore", "mat_floor7_crystal"] },
    { floors: [9, 10], itemIds: ["mat_floor9_ore", "mat_floor9_crystal"] },
    { floors: [11, 12], itemIds: ["mat_floor11_ore", "mat_floor11_crystal"] },
    { floors: [13, 14], itemIds: ["mat_floor13_ore", "mat_floor13_crystal"] },
    { floors: [15, 16], itemIds: ["mat_floor15_ore", "mat_floor15_crystal"] },
    { floors: [17, 18], itemIds: ["mat_floor17_ore", "mat_floor17_crystal"] },
    { floors: [19, 20], itemIds: ["mat_floor19_ore", "mat_floor19_crystal"] },
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
  },

  // Season 5: PVP 決鬥系統
  PVP: {
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
