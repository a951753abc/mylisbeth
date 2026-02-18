# My Lisbeth

SAO 風格 Web RPG 遊戲 — 扮演鍛造師莉茲貝特，打造武器、挖掘素材、送冒險者去探險、協力攻略 Aincrad。

原為 Discord Bot，現已遷移為 Web 多人連線版本。

## 功能

### 基礎系統
- **挖礦** — 隨機獲得不同稀有度的素材（★ ～ ★★★），依當前樓層解鎖不同素材
- **鍛造** — 使用兩種素材合成武器，屬性隨機加成
- **強化** — 消耗素材提升武器數值（有機率損耗耐久）
- **冒險** — 派遣 NPC 冒險者持武器戰鬥，由 Gemini AI 生成日文戰鬥敘事
- **PVP** — 挑戰其他玩家，勝者可掠奪素材
- **等級系統** — 挖礦、鍛造各有獨立等級與經驗值

### Season 2：Aincrad Awakening
- **樓層系統** — 10 層漸進式地城，每層有專屬敵人、地點與 Boss
- **非同步 Boss 戰** — 共享 Boss HP，不需同時在線，72 小時挑戰期限，MVP 獲得額外獎勵
- **Col 貨幣** — 冒險、PvP、Boss 戰、每日登入均可獲得
- **每日登入獎勵** — 7 天循環，連續登入解鎖更豐富的獎勵與稱號
- **成就系統** — 15 個成就，解鎖後獲得專屬稱號
- **樓層素材** — 10 種新素材（每 2 層一組），影響冒險與挖礦掉落

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
│   │   └── game.js                 # 遊戲操作（含 Season 2 端點）
│   ├── socket/gameEvents.js        # 即時事件廣播
│   ├── middleware/auth.js          # 認證中介層
│   ├── scripts/
│   │   └── seed-season2.js        # Season 2 資料庫初始化腳本
│   └── game/
│       ├── battle.js               # 戰鬥系統（支援樓層敵人）
│       ├── config.js               # 遊戲常數
│       ├── move/{mine,forge,up,adv,pvp}.js
│       ├── weapon/weapon.js        # 武器鍛造與強化
│       ├── economy/col.js          # Col 貨幣工具
│       ├── floor/                  # 樓層系統
│       │   ├── floors.json         # 1-10 層定義資料
│       │   ├── floorData.js        # 樓層資料讀取
│       │   └── bossAttack.js       # Boss 攻擊邏輯
│       ├── progression/            # 進度系統
│       │   ├── achievement.js      # 成就定義與檢查
│       │   ├── daily.js            # 每日登入獎勵
│       │   └── statsTracker.js     # 統計追蹤
│       └── migration/
│           └── ensureUserFields.js # 舊玩家自動補欄位
├── client/
│   └── src/
│       ├── pages/{Login,Game}.jsx
│       ├── components/
│       │   ├── GamePanel.jsx       # 主操作面板
│       │   ├── FloorPanel.jsx      # 樓層進度 + Boss 戰
│       │   ├── BossHealthBar.jsx   # Boss 血量條
│       │   ├── AchievementPanel.jsx # 成就與稱號
│       │   ├── DailyPanel.jsx      # 每日獎勵
│       │   ├── InventoryPanel.jsx  # 物品欄
│       │   ├── BattleLog.jsx       # 戰鬥日誌
│       │   └── PlayerList.jsx      # 玩家名冊
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

### 3. 初始化 Season 2 資料（首次或重新部署時執行）

```bash
node server/scripts/seed-season2.js
```

會自動完成：
- 標記現有素材為基礎素材
- 插入 10 種樓層專屬素材
- 建立 1-10 層樓層資料
- 初始化 `server_state`（Aincrad 進度）

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
| POST | `/api/game/adventure` | 冒險 |
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

## Socket 事件

| 事件 | 方向 | 說明 |
|------|------|------|
| `battle:result` | Server → Client | 冒險/PvP 戰鬥結果 |
| `pvp:attacked` | Server → Client (個人) | 被 PvP 攻擊通知 |
| `boss:damage` | Server → 全體 | Boss 受到傷害 |
| `boss:defeated` | Server → 全體 | Boss 被擊敗，含 MVP 資訊 |
| `floor:unlocked` | Server → 全體 | 新樓層解鎖 |
