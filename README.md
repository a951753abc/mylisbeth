# My Lisbeth

SAO 風格 Web RPG 遊戲 — 扮演鍛造師莉茲貝特，打造武器、挖掘素材、送冒險者去探險、協力攻略 Aincrad。

原為 Discord Bot，現已遷移為 Web 多人連線版本。

## 功能

### 基礎系統
- **挖礦** — 隨機獲得不同稀有度的素材（★ ～ ★★★），依當前樓層解鎖不同素材
- **鍛造** — 使用兩種素材合成武器，屬性隨機加成
- **強化** — 消耗素材提升武器數值（有機率損耗耐久）
- **修理** — 消耗素材與 Col 修復武器耐久度（85% 成功率）
- **冒險** — 派遣 NPC 冒險者持武器戰鬥，由 Gemini AI 生成日文戰鬥敘事
- **PVP** — 挑戰其他玩家，勝者可掠奪素材
- **等級系統** — 挖礦、鍛造各有獨立等級與經驗值

### Season 2：Aincrad Awakening
- **樓層系統** — 10 層漸進式地城，每層有專屬敵人、地點與 Boss
- **非同步 Boss 戰** — 共享 Boss HP，不需同時在線，72 小時挑戰期限，MVP 獲得額外獎勵
- **Col 貨幣** — 冒險、PvP、Boss 戰、每日登入均可獲得
- **每日登入獎勵** — 7 天循環，連續登入解鎖更豐富的獎勵與稱號
- **成就系統** — 19 個成就，解鎖後獲得專屬稱號
- **樓層素材** — 10 種新素材（每 2 層一組），影響冒險與挖礦掉落
- **武器稀有度** — common → fine → rare → epic → legendary，影響鍛造動畫與顯示

### Season 3：NPC 冒險者與經濟系統
- **酒館招募** — 每個遊戲日（5 分鐘現實時間）隨機刷新 3 名 NPC，從 8,000 人確定性池中生成
- **NPC 品質** — 見習（16%）、普通（68%）、優秀（13.5%）、精銳（2.4%）、傳說（0.1%），品質影響基礎能力與費用
- **NPC 管理** — 雇用、解僱、治療、裝備武器，NPC 可升級累積經驗
- **體力系統** — NPC 戰鬥後消耗體力（勝利 -15 / 平手 -25 / 敗北 -40），體力過低時戰力大幅下降，敗北且體力 ≤ 20 時有 80% 機率永久死亡
- **戰鬥敘事** — 基於模板的日文風格戰鬥敘事，依難度與結果變化，打字機動畫呈現
- **週結算制度** — 每 7 遊戲日自動結算房租（100 Col）+ 樓層稅（30 Col/層）+ NPC 薪資
- **債務機制** — 結算時 Col 不足則進入債務狀態，鍛造與 PvP 被禁用，冒險獎勵減半
- **破產系統** — 連續 3 次結算無法清償 → 角色永久刪除，寫入破產紀錄
- **新手保護** — 建立角色後 3 遊戲日（15 分鐘）內免結算

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
│   │   ├── game.js                 # 遊戲操作（Season 1-3 端點）
│   │   └── npc.js                  # NPC 管理端點（酒館、雇用、治療、裝備）
│   ├── socket/gameEvents.js        # 即時事件廣播
│   ├── middleware/auth.js          # 認證中介層
│   ├── scripts/
│   │   ├── seed-season2.js         # Season 2 資料庫初始化腳本
│   │   └── init-season3-indexes.js # Season 3 MongoDB 索引初始化
│   └── game/
│       ├── battle.js               # 戰鬥系統（支援 NPC 品質加成）
│       ├── config.js               # 遊戲常數（含 Season 3 NPC/結算設定）
│       ├── move/{mine,forge,up,adv,pvp,repair}.js
│       ├── weapon/
│       │   ├── weapon.js           # 武器鍛造與強化
│       │   └── rarity.js           # 武器稀有度判定
│       ├── economy/
│       │   ├── col.js              # Col 貨幣工具
│       │   ├── settlement.js       # 週結算計算與處理
│       │   ├── debtCheck.js        # 懶結算觸發 + 債務懲罰
│       │   └── bankruptcy.js       # 破產流程（記錄→釋放NPC→刪除角色）
│       ├── floor/                  # 樓層系統
│       │   ├── floors.json         # 1-10 層定義資料
│       │   ├── floorData.js        # 樓層資料讀取
│       │   └── bossAttack.js       # Boss 攻擊邏輯
│       ├── npc/
│       │   ├── generator.js        # 確定性 NPC 生成（seedrandom，8000 人池）
│       │   ├── npcManager.js       # NPC CRUD（雇用/解僱/治療/裝備/戰鬥/死亡）
│       │   ├── tavern.js           # 每日酒館 3 人刷新
│       │   ├── npcStats.js         # 體力→有效能力值換算
│       │   └── namePool.js         # NPC 姓名池
│       ├── narrative/
│       │   ├── templates.js        # 戰鬥敘事模板（勝/敗/平 × 5 難度）
│       │   └── generate.js         # 模板變數填充與敘事生成
│       ├── time/
│       │   └── gameTime.js         # 遊戲時間（5 分鐘=1 日）、結算時機、新手保護
│       ├── progression/            # 進度系統
│       │   ├── achievement.js      # 成就定義與檢查（含 Season 3）
│       │   ├── daily.js            # 每日登入獎勵
│       │   └── statsTracker.js     # 統計追蹤
│       └── migration/
│           └── ensureUserFields.js # 舊玩家自動補 Season 2/3 欄位
├── client/
│   └── src/
│       ├── pages/{Login,Game}.jsx
│       ├── components/
│       │   ├── GamePanel.jsx        # 主操作面板
│       │   ├── FloorPanel.jsx       # 樓層進度 + Boss 戰
│       │   ├── BossHealthBar.jsx    # Boss 血量條
│       │   ├── AchievementPanel.jsx # 成就與稱號
│       │   ├── DailyPanel.jsx       # 每日獎勵
│       │   ├── InventoryPanel.jsx   # 物品欄
│       │   ├── BattleLog.jsx        # 戰鬥日誌
│       │   ├── PlayerList.jsx       # 玩家名冊
│       │   ├── NpcPanel.jsx         # NPC 管理（治療/解僱/裝備）
│       │   ├── TavernPanel.jsx      # 酒館招募面板
│       │   ├── SettlementPanel.jsx  # 結算資訊與債務管理
│       │   ├── BankruptcyScreen.jsx # 破產畫面
│       │   ├── NarrativeDisplay.jsx # 戰鬥敘事（打字機動畫）
│       │   └── NpcDeathToast.jsx    # NPC 死亡通知
│       └── hooks/{useAuth,useSocket}.js
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
| POST | `/api/game/upgrade` | 強化 |
| POST | `/api/game/repair` | 修理武器耐久 |
| POST | `/api/game/adventure` | 冒險（可指定 NPC） |
| POST | `/api/game/pvp` | PVP |
| GET | `/api/game/players` | 玩家名冊 |

### Season 2
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/game/floor` | 當前樓層資訊 + Boss 狀態 |
| POST | `/api/game/boss-attack` | 攻擊樓層 Boss |
| GET | `/api/game/floor/history` | 已攻略樓層歷史 |
| POST | `/api/game/daily` | 領取每日登入獎勵 |
| GET | `/api/game/achievements` | 成就列表 |
| POST | `/api/game/title` | 更換稱號 |

### Season 3
| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/npc/tavern` | 今日酒館 NPC（每遊戲日刷新） |
| POST | `/api/npc/hire` | 雇用 NPC（費用依品質 100-3000 Col） |
| POST | `/api/npc/fire` | 解僱 NPC |
| POST | `/api/npc/heal` | 治療 NPC（快速 50 Col / 完全 200 Col） |
| POST | `/api/npc/equip` | 為 NPC 裝備武器 |
| GET | `/api/game/settlement` | 結算預覽（帳單明細、債務狀態） |
| POST | `/api/game/pay-debt` | 手動償還債務 |

## Socket 事件

| 事件 | 方向 | 說明 |
|------|------|------|
| `battle:result` | Server → Client | 冒險/PvP 戰鬥結果 |
| `pvp:attacked` | Server → Client (個人) | 被 PvP 攻擊通知 |
| `boss:damage` | Server → 全體 | Boss 受到傷害 |
| `boss:defeated` | Server → 全體 | Boss 被擊敗，含 MVP 資訊 |
| `floor:unlocked` | Server → 全體 | 新樓層解鎖 |
| `npc:death` | Server → 全體 | NPC 冒險者陣亡通知 |

## 遊戲時間

| 現實時間 | 遊戲時間 |
|----------|----------|
| 5 分鐘 | 1 遊戲日 |
| 35 分鐘 | 1 週（結算週期） |
| 15 分鐘 | 新手保護期（3 遊戲日） |
