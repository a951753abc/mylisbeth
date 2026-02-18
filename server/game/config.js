module.exports = {
  MOVE_COOLDOWN: 5000,

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

  // Season 2: 樓層素材分組 (每 2 層一組新素材)
  FLOOR_MATERIAL_GROUPS: [
    { floors: [1, 2], itemIds: ["mat_floor1_ore", "mat_floor1_crystal"] },
    { floors: [3, 4], itemIds: ["mat_floor3_ore", "mat_floor3_crystal"] },
    { floors: [5, 6], itemIds: ["mat_floor5_ore", "mat_floor5_crystal"] },
    { floors: [7, 8], itemIds: ["mat_floor7_ore", "mat_floor7_crystal"] },
    { floors: [9, 10], itemIds: ["mat_floor9_ore", "mat_floor9_crystal"] },
  ],
};
