# My Lisbeth

SAO 風格 Web RPG 遊戲 — 扮演鍛造師莉茲貝特，打造武器、挖掘素材、送冒險者去探險、協力攻略 Aincrad。

原為 Discord Bot，現已遷移為 Web 多人連線版本。

## 功能

### 基礎系統
- **挖礦** — 隨機獲得不同稀有度的素材（★ ～ ★★★），依當前樓層解鎖不同素材
- **鍛造** — 使用兩種素材合成武器，屬性隨機加成，鍛造完成可命名武器
- **強化** — 消耗素材提升武器數值（有機率損耗耐久）
- **修理** — 消耗素材與 Col 修復武器耐久度（85% 成功率）
- **冒險** — 派遣 NPC 冒險者持武器戰鬥，由 Gemini AI 生成日文戰鬥敘事
- **個人冒險** — 不帶 NPC 的單人冒險模式
- **PVP** — 挑戰其他玩家，勝者可掠奪素材；可設定防禦武器
- **NPC 決鬥** — 在排行榜中對其他玩家的 NPC 發起決鬥
- **等級系統** — 挖礦、鍛造、冒險各有獨立等級與經驗值
- **武器改名** — 每把武器可改名一次

### Season 2：Aincrad Awakening
- **樓層系統** — 20 層漸進式地城，每層有專屬敵人、地點與 Boss
- **非同步 Boss 戰** — 共享 Boss HP，不需同時在線，72 小時挑戰期限，MVP 獲得額外獎勵
- **Boss 反擊** — 每次攻擊 Boss 後，Boss 會反擊你的 NPC
- **Col 貨幣** — 冒險、PvP、Boss 戰、每日登入均可獲得
- **每日登入獎勵** — 7 天循環，連續登入解鎖更豐富的獎勵與稱號
- **成就系統** — 64 項成就，解鎖後獲得專屬稱號
- **樓層素材** — 每 2 層一組新素材，影響冒險與挖礦掉落
- **武器稀有度** — common → fine → rare → epic → legendary，影響鍛造動畫與顯示

### Season 3：NPC 冒險者與經濟系統
- **酒館招募** — 每個遊戲日（5 分鐘現實時間）隨機刷新 3 名 NPC，從 8,000 人確定性池中生成
- **NPC 品質** — 見習（16%）、普通（68%）、優秀（13.5%）、精銳（2.4%）、傳說（0.1%），品質影響基礎能力與費用
- **NPC 管理** — 雇用、解僱、治療、裝備武器，NPC 可升級累積經驗
- **體力系統** — NPC 戰鬥後消耗體力（勝利 -15 / 平手 -25 / 敗北 -40），體力過低時戰力大幅下降，敗北且體力 ≤ 20 時有 80% 機率永久死亡
- **戰鬥敘事** — 基於模板的日文風格戰鬥敘事，依難度與結果變化，打字機動畫呈現
- **月結算制度** — 每 30 遊戲日（約 2.5 小時）自動結算房租（100 Col）+ 樓層稅（30 Col/層）+ NPC 月薪
- **債務機制** — 結算時 Col 不足則進入債務狀態，鍛造與 PvP 被禁用，冒險獎勵減半
- **破產系統** — 連續 3 次結算無法清償 → 角色永久刪除，寫入破產紀錄
- **新手保護** — 建立角色後 3 遊戲日（15 分鐘）內免結算

### Season 6：經濟改革
- **結算週期延長** — 7 遊戲日 → 30 遊戲日（約 2.5 小時），NPC 薪資改為月薪制
- **委託費改革** — 冒險不再預扣費用，改為勝利時從獎勵扣 10% 委託費，敗北免費
- **NPC 自主任務** — 派遣 NPC 執行巡邏（15 分鐘）、採集（25 分鐘）、護送（50 分鐘）任務，自動結算獎勵/失敗/死亡
- **佈告板掛賣** — 玩家間交易系統，可掛賣素材與武器，2% 手續費，NPC 每遊戲日自動購買低價商品
- **回收商店** — 素材依星級定價（★1:x1, ★2:x3, ★3:x6），武器依稀有度定價（普通:x1 ~ 傳說:x50）
- **貸款系統** — 向系統借貸 Col，有利息與還款期限
- **暫停營業** — 暫時停止結算，防止離線時被破產
- **稱號效果** — 各稱號附帶戰鬥加成/減益效果，可查看詳細效果說明
- **隨機事件** — 冒險中可能觸發特殊事件（如 Laughing Coffin 襲擊）

### Season 7：排行榜系統
- **六大排行分類** — 綜合實力、攻略進度、決鬥場、商會排行、活動紀錄、收藏家
- **綜合實力** — 加權複合分（鍛造×10 + 挖礦×8 + 戰鬥×5 + 樓層×12 + Boss 貢獻 + 成就）
- **攻略進度** — 4 子排行：總傷害、擊破數、MVP、最後一擊
- **決鬥場** — 4 子排行：勝場（含勝率）、初撃勝、PK 殺數、戰鬥等級
- **商會排行** — 3 子排行：累計收入、佈告板收入、現有 Col
- **活動紀錄** — 5 子排行：鍛造、挖礦、冒險、委託、成就數量
- **收藏家** — 3 子排行：聖遺物、史詩/傳說武器、NPC 團隊品質分
- **排名裝飾** — Top 3 金銀銅皇冠、自己排名金框高亮、即時「我的排名」顯示
- **決鬥整合** — 排行榜內可直接對任意玩家發起決鬥
- **墓碑紀錄** — 查看已破產角色的墓碑紀錄
- **30 秒快取** — 伺服器端 TTL 快取避免頻繁查詢

### Season 8：隨機事件擴展
- **微笑棺木襲擊** — PK 公會隨機偷取 Col、素材或武器
- **神秘寶箱** — 挖礦/冒險時隨機發現，開啟獲得額外素材或 Col
- **流浪鍛冶師** — 鍛造時遇到，免費提升武器一項數值
- **迷宮裂隙** — 冒險時傳送到高難度層，成功獲得稀有素材
- **NPC 覺醒** — NPC 冒險時突破品質上限，永久提升能力

### Season 9：劍技系統
- **武器熟練度** — 11 種武器類型（單手劍、雙手劍、雙手斧、棍、刀、彎刀、細劍、短劍、槍、弓、盾），各自獨立追蹤至上限 1000
- **技能學習** — 達到武器熟練度門檻後解鎖對應劍技，NPC 每戰有 5% 機率自動學習（品質倍率加成）
- **技能裝備** — 玩家最多 8 個技能槽位，NPC 最多 5 個，依等級解鎖
- **技能連鎖** — 最多 3 連鎖，+15% 傷害加成
- **Mod 系統** — 每 50 熟練度增加 1 個 Mod 槽位（每技能最多 3 個），微調技能效果
- **武器固有效果** — 鍛造時有機率附加固有效果（`5% + 鍛造等級 × 2%`），每把最多 2 個，效果包含破甲、飲血、迅速、精準等 16+ 種
- **素材組合加成** — 相同樓層套裝、相同素材、跨樓層組合、星級和諧各有不同屬性加成

### Season 10：樓層往返
- **樓層選擇** — 解鎖高樓層後可自由往返已攻略的樓層
- **連線限制** — 最高同時在線 50 人，超過時顯示伺服器已滿畫面

### Season 11：NPC 自主修練
- **快速修練** — 10 分鐘，獲得 20 熟練度 + 15 經驗
- **集中修練** — 30 分鐘，獲得 40 熟練度 + 40 經驗
- **樓層加成** — 有效樓層（currentFloor - 3）每層增加 30% 收益
- **封頂機制** — 熟練度上限 = 有效樓層 × 100，等級上限 = 有效樓層 × 2
- **技能學習** — 修練中有機率學習新劍技（機率依品質與修練類型不同）

### Season 12：鍛造/挖礦等級附加功能
- **LV2 配方書** — 查詢素材組合對應的武器
- **LV2 連續挖礦** — 設定體力預算，一次挖多次
- **LV4 精準挖礦** — 自動出售 ★1 素材
- **LV6 礦脈探測** — 預覽當前樓層可挖掘的素材
- **LV8 批量出售** — 自動出售 ★2 以下素材
- **LV10 大師之眼** — 10% 機率額外獲得一份素材

### GM 管理後台
- **獨立登入** — 帳號密碼制（非 Discord OAuth），使用 bcrypt 加密
- **儀表板** — 即時在線人數、伺服器狀態（透過 Socket.io 推送）
- **玩家管理** — 搜尋、檢視、編輯玩家資料（物品/武器/NPC/技能/聖遺物）
- **行動日誌** — 搜尋與過濾所有玩家操作紀錄（30 天 TTL）
- **配置編輯** — 執行時動態修改遊戲常數，免重啟
- **文字編輯** — 修改遊戲內所有文字，即時生效

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + Vite |
| 後端 | Express + Socket.io |
| 認證 | Discord OAuth2 (Passport) |
| 管理認證 | 帳號密碼 (bcrypt) |
| 資料庫 | MongoDB (native driver, 無 Mongoose) |
| AI 敘事 | Google Gemini 2.5 Flash |
| 測試 | Vitest + @vitest/coverage-v8 |
| 部署 | Docker (Node 22-alpine) |

## 專案結構

```
mylisbeth/
├── server/
│   ├── index.js                    # Express + Socket.io 入口
│   ├── db.js                       # MongoDB 連線與共用操作
│   ├── routes/
│   │   ├── auth.js                 # Discord OAuth2
│   │   ├── user.js                 # 使用者資訊
│   │   ├── game.js                 # 遊戲路由總入口
│   │   ├── game/
│   │   │   ├── production.js       # 挖礦/鍛造/強化/修理（含連續挖礦、配方書）
│   │   │   ├── combat.js           # 冒險/PvP/NPC 決鬥
│   │   │   ├── economy.js          # 經濟系統（商店、貸款、結算、暫停）
│   │   │   ├── floor.js            # 樓層與 Boss 戰
│   │   │   ├── progression.js      # 進度（每日獎勵、成就、稱號）
│   │   │   └── helpers.js          # 路由工具函式
│   │   ├── npc.js                  # NPC 管理（酒館、雇用、治療、裝備、任務、修練）
│   │   ├── market.js               # 佈告板交易
│   │   ├── skill.js                # 劍技系統（學習、裝備、Mod）
│   │   └── admin/
│   │       ├── index.js            # Admin 路由集中點
│   │       ├── auth.js             # 管理員驗證
│   │       ├── dashboard.js        # 即時統計儀表板
│   │       ├── players.js          # 玩家管理 CRUD
│   │       ├── config.js           # 執行時配置編輯
│   │       ├── logs.js             # 行動記錄查詢
│   │       └── texts.js            # 遊戲文字編輯
│   ├── utils/sanitize.js           # 輸入清理工具
│   ├── socket/
│   │   ├── events.js               # Socket 事件常數定義
│   │   ├── emitter.js              # Socket 事件發送函式
│   │   └── gameEvents.js           # 在線玩家追蹤與事件廣播
│   ├── middleware/
│   │   ├── auth.js                 # 認證中介層 + ensureOnline
│   │   └── adminAuth.js            # Admin 認證中介層
│   ├── scripts/
│   │   ├── seed-season2.js             # Season 2 資料庫初始化
│   │   ├── seed-weapon-recipes.js      # 武器配方 seed
│   │   ├── seed-new-materials.js       # 新素材 seed
│   │   ├── seed-admin.js               # 建立 GM 管理員帳號
│   │   ├── init-season3-indexes.js     # Season 3 索引
│   │   ├── init-season6-indexes.js     # Season 6 索引
│   │   ├── init-leaderboard-indexes.js # 排行榜索引
│   │   └── init-admin-indexes.js       # Admin 索引
│   └── game/
│       ├── config.js               # 所有遊戲常數
│       ├── configManager.js        # 執行時配置覆蓋
│       ├── textManager.js          # 遊戲文字管理（動態覆蓋）
│       ├── gameText.js             # 預設遊戲文字定義
│       ├── roll.js                 # 骰子系統（d6, d66, d100）
│       ├── create.js               # 角色建立
│       ├── info.js                 # 遊戲資訊查詢
│       ├── level.js                # 等級經驗值計算
│       ├── battleLevel.js          # 戰鬥等級計算
│       ├── leaderboard.js          # 排行榜（6 分類 + 快取）
│       ├── move/
│       │   ├── mine.js             # 挖礦（含連續挖礦、大師之眼）
│       │   ├── forge.js            # 鍛造（含素材組合加成）
│       │   ├── up.js               # 強化
│       │   ├── repair.js           # 修理
│       │   ├── adv.js              # NPC 冒險
│       │   ├── soloAdv.js          # 個人冒險
│       │   ├── pvp.js              # 玩家 PvP
│       │   ├── pvpNpc.js           # NPC 決鬥
│       │   ├── pvpUtils.js         # PvP 共用工具
│       │   └── adventureUtils.js   # 冒險共用工具
│       ├── battle/
│       │   ├── combatCalc.js       # 核心傷害計算
│       │   ├── enemyGenerator.js   # 敵人生成
│       │   ├── fighterBuilder.js   # 戰鬥者屬性構建
│       │   ├── innateEffectCombat.js # 固有效果戰鬥應用
│       │   ├── pveCombat.js        # PvE 戰鬥邏輯
│       │   └── pvpCombat.js        # PvP 決鬥邏輯
│       ├── weapon/
│       │   ├── weapon.js           # 鍛造與強化
│       │   ├── rarity.js           # 稀有度判定
│       │   ├── weaponType.js       # 11 種武器類型定義
│       │   ├── weaponTypeAffinity.js # 武器類型親和力
│       │   ├── innateEffect.js     # 武器固有效果（16+ 種）
│       │   └── forgeBonuses.js     # 素材組合加成
│       ├── skill/
│       │   ├── skillRegistry.js    # 技能定義查詢
│       │   ├── skillSlot.js        # 技能槽位管理
│       │   ├── skillCombat.js      # 技能戰鬥效果
│       │   ├── skillConnect.js     # 技能連鎖系統
│       │   ├── skillProficiency.js # 武器熟練度追蹤
│       │   ├── npcSkillLearning.js # NPC 自動學習技能
│       │   └── extraSkillChecker.js # 額外技能解鎖
│       ├── economy/
│       │   ├── col.js              # Col 貨幣工具
│       │   ├── settlement.js       # 月結算計算與處理
│       │   ├── debtCheck.js        # 懶結算觸發 + 債務懲罰
│       │   ├── bankruptcy.js       # 破產流程
│       │   ├── shop.js             # 回收商店
│       │   ├── market.js           # 佈告板交易
│       │   ├── loan.js             # 貸款系統
│       │   └── discard.js          # 素材/武器丟棄
│       ├── floor/
│       │   ├── floors.json         # 1-20 層定義資料
│       │   ├── floorData.js        # 樓層資料讀取
│       │   ├── activeFloor.js      # 玩家活躍樓層（往返系統）
│       │   ├── bossAttack.js       # Boss 攻擊協調器
│       │   ├── bossRewards.js      # Boss 獎勵分配（掉落 + 聖遺物）
│       │   ├── bossCounterAttack.js # Boss 反擊機制
│       │   └── floorAdvancement.js # 樓層推進
│       ├── npc/
│       │   ├── generator.js        # 確定性 NPC 生成（seedrandom，8000 人池）
│       │   ├── npcManager.js       # NPC CRUD
│       │   ├── tavern.js           # 每日酒館刷新
│       │   ├── npcStats.js         # 體力→有效能力值
│       │   ├── namePool.js         # NPC 姓名池
│       │   └── mission.js          # NPC 任務 + 修練
│       ├── events/
│       │   ├── eventDefs.js        # 隨機事件定義（5 種）
│       │   ├── eventTrigger.js     # 事件觸發判定
│       │   └── handlers/
│       │       ├── laughingCoffin.js   # 微笑棺木襲擊
│       │       ├── mysteriousChest.js  # 神秘寶箱
│       │       ├── wanderingBlacksmith.js # 流浪鍛冶師
│       │       ├── labyrinthRift.js    # 迷宮裂隙
│       │       └── npcAwakening.js     # NPC 覺醒
│       ├── narrative/
│       │   ├── templates.js        # 戰鬥敘事模板
│       │   └── generate.js         # 敘事生成
│       ├── title/
│       │   ├── titleEffects.js     # 稱號效果定義
│       │   └── titleModifier.js    # 稱號戰鬥修正
│       ├── loot/
│       │   ├── battleLoot.js       # 戰鬥掉落物計算
│       │   └── discardRecovery.js  # 丟棄物品回收
│       ├── cache/
│       │   ├── itemCache.js        # 物品資料快取
│       │   └── weaponCache.js      # 武器資料快取
│       ├── stamina/
│       │   └── staminaCheck.js     # 體力消耗與檢查
│       ├── time/
│       │   └── gameTime.js         # 遊戲時間、結算時機、新手保護
│       ├── progression/
│       │   ├── achievement.js      # 成就定義與檢查（64 項）
│       │   ├── daily.js            # 每日登入獎勵
│       │   ├── statsTracker.js     # 統計追蹤
│       │   └── adventureLevel.js   # 冒險等級系統
│       ├── logging/
│       │   └── actionLogger.js     # 行動日誌（fire-and-forget）
│       └── migration/
│           └── ensureUserFields.js # 舊玩家自動補新欄位
├── client/
│   ├── admin.html                  # Admin 後台入口
│   └── src/
│       ├── pages/{Login,Game}.jsx
│       ├── constants/
│       │   ├── socketEvents.js     # Socket 事件常數（client 鏡像）
│       │   └── npcQuality.js       # NPC 品質定義
│       ├── components/
│       │   ├── GamePanel.jsx        # 主操作面板
│       │   ├── game/
│       │   │   ├── MineSection.jsx      # 挖礦（含連續挖礦、配方書）
│       │   │   ├── ForgeSection.jsx     # 鍛造（含組合加成提示）
│       │   │   ├── UpgradeSection.jsx   # 強化
│       │   │   ├── AdventureSection.jsx # NPC 冒險
│       │   │   ├── SoloAdvSection.jsx   # 個人冒險
│       │   │   └── DuelSetupSection.jsx # 決鬥設置
│       │   ├── CharacterStats.jsx   # 角色資訊
│       │   ├── StaminaDisplay.jsx   # 體力條 + 倒數
│       │   ├── WeaponSelect.jsx     # 武器下拉選單
│       │   ├── WeaponInnateDisplay.jsx # 武器固有效果展示
│       │   ├── CooldownTimer.jsx    # 操作冷卻計時器
│       │   ├── ForgeAnimation.jsx   # 鍛造動畫
│       │   ├── FloorPanel.jsx       # 樓層進度 + Boss 戰
│       │   ├── BossHealthBar.jsx    # Boss 血量條
│       │   ├── AchievementPanel.jsx # 成就與稱號
│       │   ├── DailyPanel.jsx       # 每日獎勵
│       │   ├── InventoryPanel.jsx   # 物品欄
│       │   ├── BattleLog.jsx        # 戰鬥日誌
│       │   ├── NarrativeDisplay.jsx # 戰鬥敘事（打字機動畫）
│       │   ├── LeaderboardPanel.jsx # 排行榜
│       │   ├── DuelPanel.jsx        # 決鬥配置 UI
│       │   ├── GraveyardView.jsx    # 墓碑紀錄
│       │   ├── NpcPanel.jsx         # NPC 管理
│       │   ├── TavernPanel.jsx      # 酒館招募
│       │   ├── SkillPanel.jsx       # 技能學習與裝備
│       │   ├── SkillSlotEditor.jsx  # 技能槽位 + Mod 編輯
│       │   ├── ProficiencyBar.jsx   # 熟練度進度條
│       │   ├── ShopPanel.jsx        # 回收商店
│       │   ├── MarketPanel.jsx      # 佈告板交易
│       │   ├── SettlementPanel.jsx  # 結算與債務
│       │   ├── BankruptcyScreen.jsx # 破產畫面
│       │   ├── TitleEffectHint.jsx  # 稱號效果提示
│       │   ├── RandomEventDisplay.jsx # 隨機事件顯示
│       │   └── NpcDeathToast.jsx    # NPC 死亡通知
│       ├── hooks/
│       │   ├── useAuth.js           # 認證狀態管理
│       │   ├── useSocket.js         # Socket.io 事件訂閱
│       │   ├── useDuelState.js      # 決鬥狀態管理
│       │   └── useStaminaTimer.js   # 體力恢復倒數
│       └── admin/
│           ├── main.jsx             # Admin 獨立入口
│           ├── AdminApp.jsx         # Admin 路由
│           ├── components/
│           │   ├── AdminLayout.jsx  # Admin 佈局
│           │   ├── StatCard.jsx     # 統計卡片
│           │   └── AdminNpcCard.jsx # NPC 管理卡片
│           └── pages/
│               ├── AdminLogin.jsx   # 管理員登入
│               ├── Dashboard.jsx    # 儀表板
│               ├── Players.jsx      # 玩家列表
│               ├── PlayerDetail.jsx # 玩家詳細編輯
│               ├── ConfigEditor.jsx # 配置編輯
│               ├── ActionLogs.jsx   # 行動日誌
│               └── TextEditor.jsx   # 文字編輯
├── vitest.config.mjs               # 測試配置
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

## 安裝與啟動

### 1. 環境設定

```bash
cp .env.example .env
```

編輯 `.env`，填入：

```
MONGODB_URI=your_mongodb_uri
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/callback
GEMINI_API_KEY=your_gemini_key
SESSION_SECRET=random_secret
```

### 2. 安裝依賴

```bash
npm run install:all
```

### 3. 初始化資料庫（首次或重新部署時執行）

```bash
# Season 2 樓層/素材/Boss 資料
node server/scripts/seed-season2.js

# 武器配方
node server/scripts/seed-weapon-recipes.js

# 新素材
node server/scripts/seed-new-materials.js

# Season 3 MongoDB 索引（NPC、破產紀錄）
node server/scripts/init-season3-indexes.js

# Season 6 MongoDB 索引（佈告板、貸款）
node server/scripts/init-season6-indexes.js

# 排行榜索引
node server/scripts/init-leaderboard-indexes.js

# GM 管理員帳號
ADMIN_USER=admin ADMIN_PASS=your_password node server/scripts/seed-admin.js

# Admin 索引（action_logs TTL、admin_users unique）
node server/scripts/init-admin-indexes.js
```

### 4. 啟動

```bash
# 後端（port 3000）
npm start

# 前端開發伺服器（port 5173）
npm run client:dev
```

### 5. 測試

```bash
# 執行所有測試（411 tests, 16 files）
npm test

# 執行測試 + 覆蓋率報告
npm run test:coverage
```

### 6. Production Build

```bash
npm run client:build
NODE_ENV=production npm start
```

### Docker 部署（推薦）

使用 Docker Compose 一鍵部署，包含 App 與 MongoDB：

```bash
# 1. 建立 .env
cp .env.example .env
# 編輯 .env，填入 Discord OAuth、Gemini API Key 等
# 注意：MONGODB_URI 不需要設定，docker-compose 會自動指向容器內的 MongoDB

# 2. 啟動
docker compose up -d --build

# 3. 初始化資料庫（首次部署）
docker compose exec app node server/scripts/seed-season2.js
docker compose exec app node server/scripts/seed-weapon-recipes.js
docker compose exec app node server/scripts/seed-new-materials.js
docker compose exec app node server/scripts/init-season3-indexes.js
docker compose exec app node server/scripts/init-season6-indexes.js
docker compose exec app node server/scripts/init-leaderboard-indexes.js
docker compose exec app node server/scripts/init-admin-indexes.js

# 4. 建立 GM 帳號
docker compose exec app sh -c 'ADMIN_USER=admin ADMIN_PASS=your_password node server/scripts/seed-admin.js'

# 5. 查看 log
docker compose logs -f app
```

預設對外 port 為 `4000`，可在 `docker-compose.yml` 中修改。

> **Discord OAuth Callback URL** 記得更新為 `http://你的伺服器IP:4000/api/auth/callback`

## API 一覽

### 認證
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/auth/discord` | Discord OAuth2 登入 |
| GET | `/api/auth/callback` | OAuth2 回調 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/user/me` | 取得角色資訊 |

### 遊戲操作
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/game/create` | 建立角色 |
| POST | `/api/game/mine` | 挖礦 |
| POST | `/api/game/continuous-mine` | 連續挖礦（LV2+） |
| GET | `/api/game/mine/preview` | 連續挖礦預覽 |
| GET | `/api/game/mine/radar` | 礦脈探測（LV6+） |
| POST | `/api/game/forge` | 鍛造 |
| GET | `/api/game/recipe-book` | 配方書查詢（LV2+） |
| POST | `/api/game/rename-weapon` | 武器改名 |
| POST | `/api/game/upgrade` | 強化 |
| POST | `/api/game/repair` | 修理武器耐久 |
| POST | `/api/game/adventure` | 冒險（NPC 派遣） |
| POST | `/api/game/solo-adventure` | 個人冒險 |
| POST | `/api/game/pvp` | 玩家 PvP |
| POST | `/api/game/pvp-npc` | NPC 決鬥 |
| POST | `/api/game/pvp/set-defense-weapon` | 設定防禦武器 |
| GET | `/api/game/players` | 玩家名冊 |
| GET | `/api/game/players/:userId/npcs` | 查看玩家的 NPC |
| GET | `/api/game/help` | 遊戲說明 |

### 樓層 & Boss
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/game/floor` | 當前樓層資訊 + Boss 狀態 |
| POST | `/api/game/boss-attack` | 攻擊樓層 Boss |
| GET | `/api/game/floor/history` | 已攻略樓層歷史 |

### 進度 & 成就
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/game/daily` | 領取每日登入獎勵 |
| GET | `/api/game/achievements` | 成就列表 |
| POST | `/api/game/title` | 更換稱號 |
| GET | `/api/game/title-effects` | 稱號效果說明 |

### 排行榜
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/game/leaderboard` | 排行榜（category/sub/page） |
| GET | `/api/game/leaderboard/my-rank` | 我的排名 |
| GET | `/api/game/graveyard` | 墓碑紀錄（已破產角色） |

### NPC 管理
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/npc/tavern` | 今日酒館 NPC（每遊戲日刷新） |
| POST | `/api/npc/hire` | 雇用 NPC（費用依品質 100-3000 Col） |
| POST | `/api/npc/fire` | 解僱 NPC |
| POST | `/api/npc/heal` | 治療 NPC（快速 50 Col / 完全 200 Col） |
| POST | `/api/npc/equip` | 為 NPC 裝備武器 |
| POST | `/api/npc/mission/start` | 派遣 NPC 執行任務 |
| POST | `/api/npc/mission/check` | 檢查任務完成狀態 |
| GET | `/api/npc/mission/types` | 可用任務類型列表 |
| POST | `/api/npc/training/start` | 派遣 NPC 修練 |
| GET | `/api/npc/training/types` | 可用修練類型列表 |

### 劍技系統
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/skill/definitions` | 所有技能 + Mod 定義 |
| GET | `/api/skill/status` | 玩家技能狀態（熟練度、學會/裝備） |
| POST | `/api/skill/learn` | 學習技能 |
| POST | `/api/skill/equip` | 裝備技能到槽位 |
| POST | `/api/skill/unequip` | 卸除技能 |
| POST | `/api/skill/install-mod` | 安裝 Mod |
| POST | `/api/skill/uninstall-mod` | 卸除 Mod |

### 經濟系統
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/game/settlement` | 結算預覽（帳單明細、債務狀態） |
| POST | `/api/game/pay-debt` | 手動償還債務 |
| POST | `/api/game/loan` | 申請貸款 |
| POST | `/api/game/sell-item` | 回收商店賣素材 |
| POST | `/api/game/sell-weapon` | 回收商店賣武器 |
| POST | `/api/game/pause-business` | 暫停/恢復營業 |

### 佈告板交易
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/market/listings` | 佈告板商品列表 |
| GET | `/api/market/my-listings` | 我的上架商品 |
| POST | `/api/market/list-item` | 上架素材 |
| POST | `/api/market/list-weapon` | 上架武器 |
| POST | `/api/market/buy` | 購買商品 |
| POST | `/api/market/cancel` | 下架商品 |

### GM 管理後台
| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/admin/api/auth/login` | 管理員登入 |
| POST | `/admin/api/auth/logout` | 管理員登出 |
| GET | `/admin/api/dashboard/stats` | 伺服器統計 |
| GET | `/admin/api/players` | 玩家列表（搜尋/分頁） |
| GET | `/admin/api/players/:userId` | 玩家詳細資料 |
| PUT | `/admin/api/players/:userId` | 編輯玩家資料 |
| GET | `/admin/api/logs` | 行動日誌（搜尋/過濾） |
| GET | `/admin/api/config` | 取得遊戲配置 |
| PUT | `/admin/api/config` | 修改遊戲配置 |
| GET | `/admin/api/texts` | 取得遊戲文字 |
| PUT | `/admin/api/texts` | 修改遊戲文字 |

## Socket 事件

| 事件 | 方向 | 說明 |
|------|------|------|
| `battle:result` | Server → 全體 | 冒險/PvP 戰鬥結果 |
| `pvp:attacked` | Server → Client (個人) | 被 PvP 攻擊通知 |
| `boss:phase` | Server → 全體 | Boss 進入新階段 |
| `boss:damage` | Server → 全體 | Boss 受到傷害 |
| `boss:defeated` | Server → 全體 | Boss 被擊敗，含 MVP 資訊 |
| `floor:unlocked` | Server → 全體 | 新樓層解鎖 |
| `npc:death` | Server → 全體 | NPC 冒險者陣亡通知 |
| `server:full` | Server → Client | 伺服器已滿（50 人上限） |
| `join:accepted` | Server → Client | 成功加入伺服器 |

## 遊戲時間

| 現實時間 | 遊戲時間 |
|----------|----------|
| 5 分鐘 | 1 遊戲日 |
| 2.5 小時 | 30 遊戲日（結算週期） |
| 15 分鐘 | 新手保護期（3 遊戲日） |

## MongoDB 集合

| 集合 | 說明 |
|------|------|
| `user` | 玩家資料（物品、武器、等級、NPC、技能、Col） |
| `weapon` | 武器配方（forge1 + forge2 → template） |
| `item` | 素材定義 |
| `server_state` | 伺服器狀態（樓層、Boss HP） |
| `npc` | NPC 記錄（status: available/hired/dead） |
| `bankruptcy_log` | 破產紀錄 |
| `admin_users` | GM 帳號（bcrypt） |
| `action_logs` | 操作日誌（30 天 TTL） |
| `config_overrides` | 執行時配置覆蓋 |
| `text_overrides` | 遊戲文字覆蓋 |
