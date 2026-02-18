# My Lisbeth

SAO 風格 Web RPG 遊戲 — 扮演鍛造師莉茲貝特，打造武器、挖掘素材、送冒險者去探險。

原為 Discord Bot，現已遷移為 Web 多人連線版本。

## 功能

- **挖礦** — 隨機獲得不同稀有度的素材（★ ～ ★★★）
- **鍛造** — 使用兩種素材合成武器，屬性隨機加成
- **強化** — 消耗素材提升武器數值（有機率損耗耐久）
- **冒險** — 派遣 NPC 冒險者持武器戰鬥，由 Gemini AI 生成日文戰鬥敘事
- **PVP** — 挑戰其他玩家，勝者可掠奪素材
- **等級系統** — 挖礦、鍛造各有獨立等級與經驗值

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
│   ├── index.js                # Express + Socket.io 入口
│   ├── db.js                   # MongoDB 連線與共用操作
│   ├── routes/                 # REST API
│   │   ├── auth.js             # Discord OAuth2
│   │   ├── user.js             # 使用者資訊
│   │   └── game.js             # 遊戲操作
│   ├── socket/gameEvents.js    # 即時事件廣播
│   ├── middleware/auth.js      # 認證中介層
│   └── game/                   # 遊戲邏輯（純資料）
│       ├── battle.js           # 戰鬥系統
│       ├── move/{mine,forge,up,adv,pvp}.js
│       ├── weapon/weapon.js    # 武器鍛造與強化
│       └── ...
├── client/
│   └── src/
│       ├── pages/{Login,Game}.jsx
│       ├── components/         # GamePanel, InventoryPanel, BattleLog...
│       └── hooks/              # useAuth, useSocket
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

### 3. 啟動

```bash
# 後端（port 3000）
npm start

# 前端開發伺服器（port 5173）
npm run client:dev
```

### 4. Production Build

```bash
npm run client:build
NODE_ENV=production npm start
```

## API 一覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/auth/discord` | Discord OAuth2 登入 |
| GET | `/api/auth/callback` | OAuth2 回調 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/user/me` | 取得角色資訊 |
| POST | `/api/game/create` | 建立角色 |
| POST | `/api/game/mine` | 挖礦 |
| POST | `/api/game/forge` | 鍛造 |
| POST | `/api/game/upgrade` | 強化 |
| POST | `/api/game/adventure` | 冒險 |
| POST | `/api/game/pvp` | PVP |
| GET | `/api/game/players` | 玩家名冊 |
