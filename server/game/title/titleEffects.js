"use strict";

/**
 * 稱號效果定義（15 個）
 *
 * 乘法效果：存儲調整量（+0.15 = +15%，最終乘數 = 1 + value）
 * 加法百分比效果（forgeCritFailExtra）：存儲小數（0.05 = 5%），直接疊加到機率
 * 加法整數效果（forgeCritSuccessAdj）：存儲整數，直接疊加到門檻
 *
 * 效果鍵說明：
 *   forgeBuffChance     乘法 → buffWeapon 強化成功率
 *   forgeCritFailExtra  加法(0~1) → createWeapon 額外大失敗機率
 *   forgeCritSuccessAdj 加法(int) → createWeapon 大成功門檻（正值=更難）
 *   forgeDurability     乘法 → createWeapon 初始耐久
 *   mineStarChance      乘法 → mine 三星機率
 *   battleAtk           乘法 → battle 攻擊力
 *   battleDef           乘法 → battle 防禦力
 *   battleAgi           乘法 → battle 敏捷
 *   advColReward        乘法 → adv/soloAdv Col 獎勵
 *   advWeaponDmgChance  乘法 → adv/soloAdv 武器損壞機率
 *   soloDeathChance     乘法 → soloAdv 死亡率（負值=↓）
 *   pvpColReward        乘法 → pvp Col 獎勵
 *   settlementBill      乘法 → settlement 帳單（負值=↓）
 *   repairSuccess       乘法 → repair 修復成功率
 *   staminaCost         乘法 → staminaCheck 體力消耗（負值=↓）
 *   npcCondLoss         乘法 → npcManager NPC 體力損耗（負值=↓）
 *   npcDeathChance      乘法 → npcManager NPC 死亡率（負值=↓）
 *   shopSellPrice       乘法 → shop 出售價格
 *   bossDamage          乘法 → bossAttack Boss 傷害
 */
const TITLE_EFFECTS = {
  // 1. 見習い鍛冶師 — 鍛造類
  "見習い鍛冶師": {
    forgeBuffChance: 0.15,      // 強化成功率 +15%
    forgeCritFailExtra: 0.05,   // 額外大失敗機率 +5%
  },

  // 2. ボスキラー — Boss 類
  "ボスキラー": {
    bossDamage: 0.20,           // Boss 傷害 +20%
    mineStarChance: -0.20,      // 三星挖掘率 -20%
  },

  // 3. 冒険の始まり — 冒險類
  "冒険の始まり": {
    advColReward: 0.20,         // 冒險 Col +20%
    advWeaponDmgChance: 0.15,   // 武器損壞率 +15%
  },

  // 4. 中層攻略者 — 戰鬥類
  "中層攻略者": {
    battleAtk: 0.15,            // 攻擊力 +15%
    battleDef: 0.10,            // 防禦力 +10%
    settlementBill: 0.20,       // 帳單 +20%
  },

  // 5. 決闘者 — 決鬥類
  "決闘者": {
    pvpColReward: 0.25,         // PvP Col +25%
    battleAgi: 0.10,            // 敏捷 +10%
    npcCondLoss: 0.20,          // NPC 損耗 +20%
  },

  // 6. 你才是挑戰者 — 獨行者類
  "你才是挑戰者": {
    soloDeathChance: -0.25,     // 獨自冒險死亡率 -25%
    battleAtk: 0.10,            // 攻擊力 +10%
    npcDeathChance: 0.20,       // NPC 死亡率 +20%
  },

  // 7. 悲運の鍛冶師 — 鍛造類
  "悲運の鍛冶師": {
    repairSuccess: 0.15,        // 修復成功率 +15%
    forgeDurability: 0.20,      // 初始耐久 +20%
    forgeCritSuccessAdj: 1,     // 大成功門檻 +1（更難）
  },

  // 8. 七日の鍛冶師 — 持久力類
  "七日の鍛冶師": {
    staminaCost: -0.20,         // 體力消耗 -20%
    mineStarChance: 0.10,       // 三星挖掘率 +10%
    battleAtk: -0.10,           // 攻擊力 -10%
  },

  // 9. 英雄 — 英雄類
  "英雄": {
    bossDamage: 0.25,           // Boss 傷害 +25%
    advColReward: 0.10,         // 冒險 Col +10%
    staminaCost: 0.15,          // 體力消耗 +15%
    shopSellPrice: -0.20,       // 出售價格 -20%
  },

  // 10. 商人 — 經濟類
  "商人": {
    shopSellPrice: 0.30,        // 出售價格 +30%
    settlementBill: -0.15,      // 帳單 -15%
    battleAtk: -0.15,           // 攻擊力 -15%
    battleDef: -0.10,           // 防禦力 -10%
  },

  // 11. 討伐者 — 團隊類
  "討伐者": {
    bossDamage: 0.15,           // Boss 傷害 +15%
    npcCondLoss: -0.15,         // NPC 損耗 -15%
    soloDeathChance: 0.20,      // 獨自冒險死亡率 +20%
  },

  // 12. 隊長 — NPC 類
  "隊長": {
    npcCondLoss: -0.20,         // NPC 損耗 -20%
    npcDeathChance: -0.15,      // NPC 死亡率 -15%
    forgeBuffChance: -0.15,     // 強化成功率 -15%
    mineStarChance: -0.10,      // 三星挖掘率 -10%
  },

  // 13. 再起の鍛冶師 — 經濟類
  "再起の鍛冶師": {
    settlementBill: -0.25,      // 帳單 -25%
    repairSuccess: 0.10,        // 修復成功率 +10%
    advColReward: -0.15,        // 冒險 Col -15%
    pvpColReward: -0.15,        // PvP Col -15%
  },

  // 14. 伝説使い — 傳說類
  "伝説使い": {
    battleAtk: 0.20,            // 攻擊力 +20%
    battleDef: 0.10,            // 防禦力 +10%
    settlementBill: 0.25,       // 帳單 +25%
    staminaCost: 0.10,          // 體力消耗 +10%
  },

  // 15. 收破爛的 — 回收類
  "収破爛的": {
    shopSellPrice: 0.25,        // 出售價格 +25%
    mineStarChance: 0.15,       // 三星挖掘率 +15%
    forgeCritSuccessAdj: 2,     // 大成功門檻 +2（更難）
    forgeDurability: -0.15,     // 初始耐久 -15%
  },

  // 16. ラストアタッカー — LA 類
  "ラストアタッカー": {
    bossDamage: 0.15,           // Boss 傷害 +15%
    battleAtk: 0.05,            // 攻擊力 +5%
    forgeDurability: -0.10,     // 初始耐久 -10%
  },

  // === Season 4.5 新增稱號 ===

  // 17. 生存者 — 微笑棺木生還者
  "生存者": {
    soloDeathChance: -0.15,     // 獨自冒險死亡率 -15%
    npcDeathChance: -0.10,      // NPC 死亡率 -10%
    advColReward: -0.10,        // 冒險 Col -10%
  },

  // 18. PKキラー — 微笑棺木獵手
  "PKキラー": {
    battleAtk: 0.15,            // 攻擊力 +15%
    battleAgi: 0.10,            // 敏捷 +10%
    settlementBill: 0.15,       // 帳單 +15%
  },

  // 19. 戦う鍛冶師 — 親自上陣的鍛造師
  "戦う鍛冶師": {
    battleAtk: 0.10,            // 攻擊力 +10%
    soloDeathChance: -0.10,     // 獨自冒險死亡率 -10%
    forgeBuffChance: -0.10,     // 強化成功率 -10%
    forgeCritFailExtra: 0.03,   // 額外大失敗機率 +3%
  },

  // 20. 遺物収集家 — 聖遺物收藏者
  "遺物収集家": {
    bossDamage: 0.10,           // Boss 傷害 +10%
    mineStarChance: 0.10,       // 三星挖掘率 +10%
    staminaCost: 0.10,          // 體力消耗 +10%
  },

  // 21. 解放者 — 全聖遺物收集者
  "解放者": {
    battleAtk: 0.15,            // 攻擊力 +15%
    battleDef: 0.15,            // 防禦力 +15%
    bossDamage: 0.10,           // Boss 傷害 +10%
    settlementBill: 0.30,       // 帳單 +30%
    staminaCost: 0.15,          // 體力消耗 +15%
  },

  // 22. 富豪 — 經濟大亨
  "富豪": {
    shopSellPrice: 0.20,        // 出售價格 +20%
    settlementBill: -0.20,      // 帳單 -20%
    battleAtk: -0.20,           // 攻擊力 -20%
    battleDef: -0.15,           // 防禦力 -15%
  },

  // 23. 指揮官 — NPC 養成大師
  "指揮官": {
    npcCondLoss: -0.25,         // NPC 損耗 -25%
    npcDeathChance: -0.20,      // NPC 死亡率 -20%
    forgeBuffChance: -0.20,     // 強化成功率 -20%
    mineStarChance: -0.15,      // 三星挖掘率 -15%
  },

  // 24. 匠 — 大師級鍛造師
  "匠": {
    forgeBuffChance: 0.25,      // 強化成功率 +25%
    forgeDurability: 0.15,      // 初始耐久 +15%
    battleAtk: -0.20,           // 攻擊力 -20%
    battleDef: -0.10,           // 防禦力 -10%
  },

  // 25. 闘技王 — PvP 霸主
  "闘技王": {
    pvpColReward: 0.30,         // PvP Col +30%
    battleAgi: 0.15,            // 敏捷 +15%
    npcCondLoss: 0.25,          // NPC 損耗 +25%
    shopSellPrice: -0.15,       // 出售價格 -15%
  },

  // 26. 地獄覇者 — 地獄難度征服者
  "地獄覇者": {
    battleAtk: 0.20,            // 攻擊力 +20%
    advColReward: 0.15,         // 冒險 Col +15%
    soloDeathChance: 0.15,      // 獨自冒險死亡率 +15%
    staminaCost: 0.10,          // 體力消耗 +10%
  },
};

module.exports = { TITLE_EFFECTS };
