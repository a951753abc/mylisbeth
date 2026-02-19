module.exports = {
  MOVE_COOLDOWN: 5000,

  // Season 3: 遊戲時間
  TIME_SCALE: 5 * 60 * 1000, // 5 分鐘現實時間 = 1 遊戲日
  NEWBIE_PROTECTION_DAYS: 3, // 新手保護期（遊戲日）

  // Season 3: 帳單結算
  SETTLEMENT: {
    BASE_RENT: 100,           // 基礎租金（每週）
    FLOOR_TAX_PER_FLOOR: 30, // 每層樓稅（每週）
    INTERVAL_GAME_DAYS: 7,   // 結算間隔（遊戲日）
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
    // 週薪（每結算週期）
    WEEKLY_WAGE: {
      見習: 50,
      普通: 100,
      優秀: 250,
      精銳: 600,
      傳說: 1500,
    },
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
    // 升級經驗需求基數
    EXP_BASE: 100,
    EXP_MULTIPLIER: 1.5,
  },

  ENEMY_PROBABILITY: {
    YUKI: 99,
    HELL: 90,
    HARD: 50,
    NORMAL: 10,
    EASY: 0,
  },

  BUFF_BASE_CHANCE: 20,

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
  COL_PVP_WIN: 150,
  COL_BOSS_MVP_BONUS: 500,
  COL_DAILY: [50, 100, 150, 200, 300, 400, 500],

  // Season 2: Boss 系統
  BOSS_TIMEOUT_MS: 72 * 60 * 60 * 1000,
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

  // Season 2: 冒險委託費
  COL_ADVENTURE_FEE_BASE: 30,
  COL_ADVENTURE_FEE_PER_FLOOR: 10,

  // Season 2: 樓層素材分組 (每 2 層一組新素材)
  FLOOR_MATERIAL_GROUPS: [
    { floors: [1, 2], itemIds: ["mat_floor1_ore", "mat_floor1_crystal"] },
    { floors: [3, 4], itemIds: ["mat_floor3_ore", "mat_floor3_crystal"] },
    { floors: [5, 6], itemIds: ["mat_floor5_ore", "mat_floor5_crystal"] },
    { floors: [7, 8], itemIds: ["mat_floor7_ore", "mat_floor7_crystal"] },
    { floors: [9, 10], itemIds: ["mat_floor9_ore", "mat_floor9_crystal"] },
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

  // Season 3.5: 回收商店（收破爛商人，無差別低價）
  // 素材、武器一律 d6 Col（1~6），不看星級也不看稀有度
  SHOP: {},

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
