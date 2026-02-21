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
- **成就系統** — 多種成就，解鎖後獲得專屬稱號
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

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + Vite |
| 後端 | Express + Socket.io |
| 認證 | Discord OAuth2 (Passport) |
| 資料庫 | MongoDB 6.x |
| AI 敘事 | Google Gemini 2.5 Flash |

## 專案結構

```
mylisbeth/
├── server/
│   ├── index.js                    # Express + Socket.io 入口
│   ├── db.js                       # MongoDB 連線與共用操作
│   ├── routes/
│   │   ├── auth.js                 # Discord OAuth2
│   │   ├── user.js                 # 使用者資訊
│   │   ├── game.js                 # 遊戲操作端點
│   │   ├── npc.js                  # NPC 管理端點（酒館、雇用、治療、裝備、任務）
│   │   └── market.js               # 佈告板交易端點
│   ├── utils/sanitize.js           # 輸入清理工具
│   ├── socket/gameEvents.js        # 即時事件廣播
│   ├── middleware/auth.js          # 認證中介層
│   ├── scripts/
│   │   ├── seed-season2.js             # Season 2 資料庫初始化腳本
│   │   ├── init-season3-indexes.js     # Season 3 MongoDB 索引初始化
│   │   ├── init-season6-indexes.js     # Season 6 MongoDB 索引初始化
│   │   ├── init-leaderboard-indexes.js # 排行榜 MongoDB 索引初始化
│   │   └── rollback-to-floor11.js      # 樓層回滾腳本
│   └── game/
│       ├── battle.js               # 戰鬥系統（支援 NPC 品質加成）
│       ├── battleLevel.js          # 戰鬥等級計算
│       ├── leaderboard.js          # 排行榜系統（6 分類 + 子排行 + 快取）
│       ├── config.js               # 遊戲常數（NPC/結算/戰鬥等設定）
│       ├── info.js                 # 遊戲資訊查詢
│       ├── list.js                 # 玩家列表
│       ├── create.js               # 角色建立
│       ├── roll.js                 # 骰子系統（d6, d66, d100）
│       ├── level.js                # 等級經驗值計算
│       ├── help.js                 # 遊戲說明
│       ├── type.js                 # 型別定義
│       ├── move/
│       │   ├── move.js             # 命令分發 + 全域冷卻
│       │   ├── mine.js             # 挖礦
│       │   ├── forge.js            # 鍛造
│       │   ├── up.js               # 強化
│       │   ├── repair.js           # 修理
│       │   ├── adv.js              # 冒險（NPC 派遣）
│       │   ├── soloAdv.js          # 個人冒險
│       │   ├── pvp.js              # 玩家 PvP
│       │   ├── pvpNpc.js           # NPC 決鬥
│       │   ├── pvpUtils.js         # PvP 共用工具（體力扣除、賭注、修正）
│       │   └── adventureUtils.js   # 冒險共用工具（耐久、樓層探索）
│       ├── weapon/
│       │   ├── weapon.js           # 武器鍛造與強化
│       │   └── rarity.js           # 武器稀有度判定
│       ├── economy/
│       │   ├── col.js              # Col 貨幣工具
│       │   ├── settlement.js       # 月結算計算與處理
│       │   ├── debtCheck.js        # 懶結算觸發 + 債務懲罰
│       │   ├── bankruptcy.js       # 破產流程（記錄→釋放NPC→刪除角色）
│       │   ├── shop.js             # 回收商店
│       │   ├── market.js           # 佈告板交易系統
│       │   └── loan.js             # 貸款系統
│       ├── floor/
│       │   ├── floors.json         # 1-20 層定義資料
│       │   ├── floorData.js        # 樓層資料讀取
│       │   ├── bossAttack.js       # Boss 攻擊協調器
│       │   ├── bossRewards.js      # Boss 獎勵分配（掉落 + 聖遺物）
│       │   ├── bossCounterAttack.js # Boss 反擊機制
│       │   └── floorAdvancement.js # 樓層推進（同步玩家 + 歷史記錄）
│       ├── npc/
│       │   ├── generator.js        # 確定性 NPC 生成（seedrandom，8000 人池）
│       │   ├── npcManager.js       # NPC CRUD（雇用/解僱/治療/裝備/戰鬥/死亡）
│       │   ├── tavern.js           # 每日酒館 3 人刷新
│       │   ├── npcStats.js         # 體力→有效能力值換算
│       │   ├── namePool.js         # NPC 姓名池
│       │   └── mission.js          # NPC 自主任務（巡邏/採集/護送）
│       ├── narrative/
│       │   ├── templates.js        # 戰鬥敘事模板（勝/敗/平 × 5 難度）
│       │   └── generate.js         # 模板變數填充與敘事生成
│       ├── events/
│       │   ├── eventDefs.js        # 隨機事件定義
│       │   ├── eventTrigger.js     # 事件觸發判定
│       │   └── handlers/
│       │       └── laughingCoffin.js # Laughing Coffin 襲擊事件
│       ├── title/
│       │   ├── titleEffects.js     # 稱號效果定義
│       │   └── titleModifier.js    # 稱號戰鬥修正計算
│       ├── stamina/
│       │   └── staminaCheck.js     # 體力消耗與檢查
│       ├── loot/
│       │   └── battleLoot.js       # 戰鬥掉落物計算
│       ├── cache/
│       │   └── itemCache.js        # 物品資料快取
│       ├── time/
│       │   └── gameTime.js         # 遊戲時間（5分鐘=1日）、結算時機、新手保護
│       ├── progression/
│       │   ├── achievement.js      # 成就定義與檢查
│       │   ├── daily.js            # 每日登入獎勵
│       │   ├── statsTracker.js     # 統計追蹤
│       │   └── adventureLevel.js   # 冒險等級系統
│       └── migration/
│           └── ensureUserFields.js # 舊玩家自動補新欄位
├── client/
│   └── src/
│       ├── pages/{Login,Game}.jsx
│       ├── components/
│       │   ├── GamePanel.jsx        # 主操作面板
│       │   ├── CharacterStats.jsx   # 角色資訊（等級、能力值）
│       │   ├── StaminaDisplay.jsx   # 體力條 + 倒數計時
│       │   ├── WeaponSelect.jsx     # 武器下拉選單（共用元件）
│       │   ├── CooldownTimer.jsx    # 操作冷卻計時器
│       │   ├── ForgeAnimation.jsx   # 鍛造動畫
│       │   ├── FloorPanel.jsx       # 樓層進度 + Boss 戰
│       │   ├── BossHealthBar.jsx    # Boss 血量條
│       │   ├── AchievementPanel.jsx # 成就與稱號
│       │   ├── DailyPanel.jsx       # 每日獎勵
│       │   ├── InventoryPanel.jsx   # 物品欄
│       │   ├── BattleLog.jsx        # 戰鬥日誌
│       │   ├── NarrativeDisplay.jsx # 戰鬥敘事（打字機動畫）
│       │   ├── LeaderboardPanel.jsx # 排行榜（6 分類 + 決鬥）
│       │   ├── DuelPanel.jsx        # 決鬥配置 UI（共用元件）
│       │   ├── GraveyardView.jsx    # 墓碑紀錄
│       │   ├── NpcPanel.jsx         # NPC 管理（治療/解僱/裝備）
│       │   ├── TavernPanel.jsx      # 酒館招募面板
│       │   ├── ShopPanel.jsx        # 回收商店
│       │   ├── MarketPanel.jsx      # 佈告板交易
│       │   ├── SettlementPanel.jsx  # 結算資訊與債務管理
│       │   ├── BankruptcyScreen.jsx # 破產畫面
│       │   ├── TitleEffectHint.jsx  # 稱號效果提示
│       │   ├── RandomEventDisplay.jsx # 隨機事件顯示
│       │   └── NpcDeathToast.jsx    # NPC 死亡通知
│       └── hooks/
│           ├── useAuth.js           # 認證狀態管理
│           ├── useSocket.js         # Socket.io 事件訂閱
│           ├── useDuelState.js      # 決鬥狀態管理（共用 hook）
│           └── useStaminaTimer.js   # 體力恢復倒數計時
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

# Season 3 MongoDB 索引（NPC、破產紀錄）
node server/scripts/init-season3-indexes.js

# Season 6 MongoDB 索引（佈告板、貸款）
node server/scripts/init-season6-indexes.js

# 排行榜索引
node server/scripts/init-leaderboard-indexes.js
```

### 4. 啟動

```bash
# 後端（port 3000）
npm start

# 前端開發伺服器（port 5173）
npm run client:dev
```

### 5. Production Build

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
docker compose exec app node server/scripts/init-season3-indexes.js
docker compose exec app node server/scripts/init-season6-indexes.js
docker compose exec app node server/scripts/init-leaderboard-indexes.js

# 4. 查看 log
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
| POST | `/api/game/forge` | 鍛造 |
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

## 遊戲時間

| 現實時間 | 遊戲時間 |
|----------|----------|
| 5 分鐘 | 1 遊戲日 |
| 2.5 小時 | 30 遊戲日（結算週期） |
| 15 分鐘 | 新手保護期（3 遊戲日） |
