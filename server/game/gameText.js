/**
 * 遊戲文字集中定義
 * 所有 user-facing 文字統一在此管理，支援 {placeholder} 模板變數。
 * 透過 textManager.js 的 formatText(key, vars) 使用。
 * GM 可從 admin 面板即時覆蓋。
 */
module.exports = {
  // === 系統 ===
  SYSTEM: {
    INVALID_COMMAND: "指令錯誤\n 可用指令: mine, forge, up, adv, pvp, repair, boss",
    CHAR_NOT_FOUND: "請先建立角色",
    BUSINESS_PAUSED: "你的店已暫停營業，請先恢復營業才能進行操作。",
    COOLDOWN: "CD時間還有{remaining}秒",
    BANKRUPTCY: "你因無力清償負債而宣告破產，角色已被刪除。遊戲結束。",
  },

  // === 挖礦 ===
  MINE: {
    CAPACITY_FULL: "無法繼續挖礦 \n 目前素材數:{current} \n 素材儲存上限 {max}",
    OBTAINED: "獲得[{star}]{name}",
    EXP_GAIN: "經驗值增加 {exp} 點",
    LEVEL_UP: "{type}等級提升",
    BATCH_SUMMARY: "【連續挖礦】共 {iterations} 次，消耗 {stamina} 點體力",
    AUTO_SELL_1: "【精準挖礦】自動出售 ★ 素材 ×{count}，獲得 {col} Col",
    AUTO_SELL_2: "【批量出售】自動出售 ★★ 素材 ×{count}，獲得 {col} Col",
    RECIPE_HINT: "【大師之眼】{materialName} 可鍛造：{recipes}",
  },

  // === 鍛造 ===
  FORGE: {
    DEBT_BLOCKED: "你目前有未清還的負債，無法進行鍛造！請先至帳單頁面還清負債。",
    WEAPON_CAPACITY_FULL: "無法製造武器 \n 目前武器數:{current} \n 武器儲存上限 {max}",
    MATERIAL_COUNT_ERROR: "鍛造需要 2~4 個素材",
    MATERIAL_NOT_FOUND: "錯誤！素材 {index} 不存在",
    MATERIAL_INSUFFICIENT: "錯誤！素材 {index} 數量不足（需要 {count} 個）",
    MATERIAL_DEDUCTION_FAILED: "素材已不足，無法鍛造。",
    WEAPON_BROKEN: "{weaponName} 爆發四散了。",
    CREATION_COMPLETE: "使用{materials}製作完成",
    BUFF_SUCCESS: "強化成功！",
    BUFF_FAIL: "武器強化失敗！",
    BUFF_MAX: "這把武器已達強化上限（+{max}），無法繼續強化。",
    STAT_BOOST: "{stat} 提升{value}點。",
    STAT_BOOST_CRI: "暴擊門檻 降低{value}點。（暴擊更容易觸發！）",
    DURABILITY_DOWN: "武器的耐久值下降:{value}點",
    CRIT_SUCCESS: "{name}強化大成功！\n武器數值{stat}提高{value}",
    CRIT_FAIL: "{name}強化大失敗！\n武器數值{stat}降低了{value}",
    RARITY_UP: "稀有度提升為 {rarity}！",
    EXTRA_MATERIAL_BONUS: "追加素材加成：{stat} +{value}",
    FOURTH_MAT_DURABILITY: "第四素材加成：耐久 +{value}",
    COMBO_BONUS: "✨ 組合加成：{text}",
    INSPIRATION: "鍛造靈感湧現！額外強化成功！",
    FABRIC_DURABILITY: "{name}（{type}）：耐久 +2",
    GEM_INNATE: "{name}（寶石）：固有效果機率 +5%",
    INNATE_EFFECT: "武器獲得固有效果：{names}",
  },

  // === 強化 ===
  UPGRADE: {
    INVALID_WEAPON_INDEX: "無效的武器索引",
    INVALID_MATERIAL_INDEX: "無效的素材索引",
    WEAPON_NOT_FOUND: "錯誤！武器{index} 不存在",
    MATERIAL_NOT_FOUND: "錯誤！素材{index} 不存在",
    MATERIAL_INSUFFICIENT: "錯誤！素材{index} 數量不足",
    MATERIAL_DEDUCTION_FAILED: "素材已不足，無法強化。",
  },

  // === NPC 冒險 ===
  ADVENTURE: {
    NO_WEAPON: "你沒有任何武器，無法冒險！",
    WEAPON_NOT_FOUND: "錯誤！武器{index} 不存在",
    NPC_REQUIRED: "冒險必須選擇一位已雇用的 NPC 冒險者！",
    NPC_NOT_FOUND: "找不到該 NPC，請確認已雇用該冒險者。",
    NPC_LOW_CONDITION: "{npcName} 體力過低（< 10%），無法出戰！請先治療。",
    NPC_ON_MISSION: "{npcName} 正在執行任務中，無法出戰。",
    NPC_DEATH: "**{npcName} 在戰鬥中壯烈犧牲了...**",
    NPC_LEVEL_UP: "✨ {npcName} 升級了！LV {level}",
    NPC_CONDITION: "（{npcName} 體力: {condition}%）",
    ADV_LEVEL_UP: "🎖️ 冒險等級提升至 LV {level}！",
    LOOT_HEADER: "**戰利品:**",
    COL_REWARD: "獲得 {total} Col（委託費 {fee} Col）→ 實收 {net} Col",
    DEBT_PENALTY: "（負債懲罰：獎勵減半）",
    NPC_LEARN_SKILL: "🗡️ {npcName} 學會了新劍技：【{skillName}】！",
    UNKNOWN_ERROR: "冒險的過程中發生了未知的錯誤，請稍後再試。",
  },

  // === 獨自出擊 ===
  SOLO_ADV: {
    NO_WEAPON: "你沒有任何武器，無法獨自出擊！",
    WEAPON_NOT_FOUND: "武器 #{index} 不存在",
    DEATH: "{name} 在第 {floor} 層的冒險中壯烈犧牲，英魂已逝。角色已被刪除。",
    COL_REWARD: "獲得 {amount} Col",
    PROF_GAIN: "你的 {type} 熟練度 +{amount}",
    LEARN_SKILL: "🗡️ 你習得了新劍技：【{skillName}】！",
    EXTRA_SKILL: "✨ 你解鎖了隱藏技能：【{skillName}】！",
    UNKNOWN_ERROR: "獨自出擊的過程中發生了未知的錯誤，請稍後再試。",
  },

  // === PvP 決鬥 ===
  PVP: {
    NO_TARGET: "請選擇要挑戰的玩家。",
    SELF_DUEL: "你不能挑戰自己！",
    DEBT_BLOCKED: "你目前有未清還的負債，無法發起決鬥！請先至帳單頁面還清負債。",
    INVALID_MODE: "無效的決鬥模式。",
    WEAPON_REQUIRED: "請選擇要使用的武器。",
    WEAPON_NOT_FOUND: "錯誤！你沒有編號為 {weaponId} 的武器。",
    WAGER_TOO_LOW: "賭注不能低於 {min} Col。",
    WAGER_TOO_HIGH: "賭注不能超過 {max} Col。",
    WAGER_INSUFFICIENT: "你的 Col 不足以支付 {amount} 的賭注。",
    DAILY_LIMIT: "今日決鬥次數已達上限（{limit} 次）。",
    COOLDOWN: "與該對手的冷卻尚未結束，請等待 {seconds} 秒。",
    TARGET_NOT_FOUND: "找不到該玩家，可能已陣亡或不存在。",
    NEWBIE_PROTECTION: "{name} 還在新手保護期內，無法被挑戰。",
    DEFENDER_INSUFFICIENT: "{name} 的 Col 不足以支付 {amount} 的賭注，決鬥取消。",
    STAMINA_INSUFFICIENT: "體力不足！決鬥需要 {cost} 點，目前剩餘 {current} 點。",
    UNARMED: "{defender} 手無寸鐵，無法應戰！\n**{attacker} 不戰而勝！**",
    VICTORY: "**{winner} 獲得了勝利！**",
    LOOT_COL: "{winner} 搶走了 {loser} 的 {amount} Col！",
    LOOT_ITEM: "{winner} 從 {loser} 身上奪走了 1 個 [{item}]！",
    WAGER_WIN: "{winner} 贏得賭注 {payout} Col（系統稅 {tax} Col）",
    HONOR_DUEL: "榮譽決鬥——無 Col 交易。",
    DEATH: "**{loser} 在決鬥中被殺害了...角色已被刪除。**",
    RED_NAME: "**{winner} 殺害了無罪玩家，被標記為紅名（プレイヤーキラー）！**",
    BATTLE_LEVEL_UP: "{winner} 的戰鬥等級提升至 Lv.{level}！",
  },

  // === Boss 戰 ===
  BOSS: {
    WEAPON_NOT_FOUND: "錯誤！武器 {index} 不存在",
    NPC_REQUIRED: "Boss 戰必須選擇一位已雇用的 NPC 冒險者！",
    NPC_NOT_FOUND: "找不到該 NPC，請確認已雇用該冒險者。",
    NPC_LOW_CONDITION: "{npcName} 體力過低（< 10%），無法出戰！請先治療。",
    NPC_ON_MISSION: "{npcName} 正在執行任務中，無法出戰。",
    NOT_AT_FRONTIER: "必須先回到前線才能挑戰 Boss！",
    EXPLORE_REMAINING: "尚未完成迷宮探索！還需要探索 {remaining} 次才能挑戰 Boss。",
    TIMEOUT_RESET: "Boss 挑戰時間已超過 72 小時，Boss 已重置！請重新挑戰。",
    STATE_ERROR: "Boss 狀態異常，請重試。",
    NPC_LEVEL_UP: "{npcName} 升級了！LV {level}",
    ADV_LEVEL_UP: "冒險等級提升至 LV {level}！",
    UNKNOWN_ERROR: "Boss 攻擊過程中發生未知錯誤，請稍後再試。",
  },

  // === 修復 ===
  REPAIR: {
    WEAPON_NOT_FOUND: "武器不存在！",
    MATERIAL_NOT_FOUND: "素材不存在或數量不足！",
    FULL_DURABILITY: "{weaponName} 的耐久度已滿（{current}/{max}），無需修復！",
    COL_INSUFFICIENT: "Col 不足！修復 {weaponName}（{rarity}）需要 {cost} Col。",
    SUCCESS: "修復成功！{weaponName} 的耐久度恢復了 {amount} 點。（消耗 {cost} Col）",
    FAILURE: "修復失敗！{weaponName} 的耐久度沒有恢復。（消耗 {cost} Col 及素材）",
    FAILURE_PARTIAL: "修復失敗！{weaponName} 勉強恢復了 {amount} 點耐久度。（消耗 {cost} Col，返還 {refund} Col）",
    UNKNOWN_ERROR: "修復過程中發生了未知錯誤，請稍後再試。",
  },

  // === NPC 管理 ===
  NPC: {
    CHAR_NOT_FOUND: "角色不存在",
    HIRE_LIMIT: "已達雇用上限（{limit} 人）。提升冒險等級可增加上限。",
    ALREADY_HIRED: "該 NPC 已在你的隊伍中",
    INVALID_NPC_ID: "無效的 NPC ID",
    NPC_DEAD: "這位冒險者已不在人世",
    NPC_TAKEN: "這位冒險者已被其他人雇用",
    NPC_RACE: "這位冒險者剛才被其他人雇走了",
    HIRE_COL_INSUFFICIENT: "Col 不足，雇用需要 {cost} Col",
    NPC_NOT_FOUND: "找不到該 NPC",
    FULL_CONDITION: "該 NPC 體力已滿",
    HEAL_COL_INSUFFICIENT: "Col 不足，治療需要 {cost} Col",
    WEAPON_NOT_FOUND: "武器編號 {index} 不存在",
    WEAPON_ALREADY_EQUIPPED: "該武器已被其他冒險者裝備中",
    ON_MISSION: "{npcName} 正在執行任務中",
    MISSION_LIMIT: "同時派遣任務已達上限（{limit} 個）。請等待現有任務完成。",
    LOW_CONDITION: "{npcName} 體力過低，無法執行任務",
    INVALID_MISSION: "無效的任務類型",
    MISSION_LIMIT_OR_CHANGED: "同時派遣任務已達上限（{limit} 個），或 NPC 狀態已變更。",
    TRAINING_NO_WEAPON: "{npcName} 沒有裝備武器，無法進行修練",
    INVALID_TRAINING: "無效的修練類型",
    TRAINING_LIMIT: "修練派遣已達上限（{limit} 個）",
  },

  // === 體力 ===
  STAMINA: {
    INSUFFICIENT: "體力不足！需要 {cost} 點，目前剩餘 {current} 點（每 5 分鐘自然回復 {recovery} 點）",
  },

  // === 經濟 ===
  ECONOMY: {
    CHAR_NOT_FOUND: "角色不存在",
    NO_DEBT: "你目前沒有負債",
    INVALID_AMOUNT: "還款金額必須大於 0",
    COL_INSUFFICIENT_REPAY: "Col 不足，還款需要 {amount} Col",
    MARKET_INVALID_ITEM: "無效的素材索引",
    MARKET_INVALID_QTY: "數量必須為正整數",
    MARKET_INVALID_PRICE: "單價必須為正整數",
    MARKET_PK_BLOCKED: "你是紅名玩家，無法使用佈告板交易。",
    MARKET_MAX_LISTINGS: "最多掛賣 {max} 件",
    MARKET_ITEM_NOT_FOUND: "找不到該素材",
    MARKET_ITEM_INSUFFICIENT: "素材數量不足（擁有 {num}）",
    MARKET_COL_INSUFFICIENT: "Col 不足，手續費 {fee} Col",
    MARKET_DEDUCTION_FAILED: "素材扣除失敗",
    MARKET_INVALID_WEAPON: "無效的武器索引",
    MARKET_INVALID_WEAPON_PRICE: "價格必須為正整數",
    MARKET_WEAPON_NOT_FOUND: "找不到該武器",
    MARKET_WEAPON_NPC_EQUIPPED: "該武器正被 NPC 裝備中，請先卸除",
  },

  // === 隨機事件 ===
  EVENTS: {
    LC_NAME: "微笑棺木襲擊",
    LC_WIN: "微笑棺木的殺手從暗處現身！經過激烈交戰，你成功擊退了殺手。\n獲得賞金 {col} Col",
    LC_DRAW: "微笑棺木的殺手從暗處現身！雙方僵持不下，殺手趁亂搶走了部分金幣後撤退。",
    LC_LOSE_UNARMED: "微笑棺木的殺手從暗處現身！你手無寸鐵，毫無抵抗之力...",
    LC_LOSE: "微笑棺木的殺手從暗處現身！你在激戰中落敗...",
    LC_STOLEN_COL: "被搶走了 {amount} Col",
    LC_STOLEN_MATERIAL: "被搶走了 {name}",
    LC_STOLEN_WEAPON: "{name} 被奪走了！",
    LC_NPC_DEATH: "{name} 為了保護你而犧牲了...",
    LC_PLAYER_DEATH: "你被微笑棺木的殺手殺害了...",
    LC_COL_LOSS: "損失 {amount} Col",

    CHEST_NAME: "神秘寶箱",
    CHEST_WIN: "你發現了一個被苔蘚覆蓋的古老寶箱...\n小心翼翼地打開後，裡面竟然藏著珍貴的寶物！",
    CHEST_DRAW: "你發現了一個被苔蘚覆蓋的古老寶箱...\n打開後只看到一堆灰塵和蜘蛛網。看來有人捷足先登了。",
    CHEST_LOSE: "你發現了一個被苔蘚覆蓋的古老寶箱...\n打開的瞬間觸發了陷阱！一股毒氣噴出！",
    CHEST_COL_LOSS: "慌亂中掉落了 {amount} Col",
    CHEST_MATERIAL_LOSS: "{name} 在混亂中遺失了",

    WB_NAME: "流浪鍛冶師",
    WB_INSPIRATION: "一位白髮蒼蒼的老鍛冶師從霧中走來...\n「年輕人，讓我教你一個秘訣。」\n他指點了鍛造的要領——你感覺靈感湧現！\n（下次鍛造將保證觸發大成功）",
    WB_CHAT: "一位白髮蒼蒼的老鍛冶師從霧中走來...\n你們聊了一會兒關於鍛造的往事，老人留下一些零錢便離去了。",
    WB_BUFF_NAME: "鍛造靈感",

    RIFT_NAME: "迷宮裂隙",
    RIFT_WIN: "冒險途中，空間突然扭曲——一道次元裂隙在眼前撕開！\nNPC 勇敢地踏入裂隙，在第 {floor} 層的秘境中發現了珍貴的素材！",
    RIFT_LOSE: "冒險途中，空間突然扭曲——一道次元裂隙在眼前撕開！\n{npcName} 踏入裂隙後遭遇了強大的異界生物！\n勉強逃出時已是遍體鱗傷。（體力 -{condLoss}）",

    AWAKEN_NAME: "NPC 覺醒",
    AWAKEN_TEXT: "戰鬥中，{npcName} 的眼神突然變了——一股強大的氣息爆發而出！\n「我...感覺到了...更強大的力量！」",
    AWAKEN_RESULT: "{npcName} 覺醒了！\n品質提升：{oldQuality} → {newQuality}",
    AWAKEN_WAGE: "（月薪調整為 {wage} Col）",
  },
};
