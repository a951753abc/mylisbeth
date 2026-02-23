# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

My Lisbeth — an SAO-themed web RPG where players act as the blacksmith Lisbeth: mining materials, forging weapons, sending NPC adventurers on quests, and cooperatively clearing Aincrad floors. Originally a Discord bot, now a full-stack web multiplayer game.

**Language**: All code is vanilla JavaScript (CommonJS on server, ESM on client). No TypeScript.

## Development Commands

```bash
# Install all dependencies (root + client)
npm run install:all

# Start backend server (Express, port 3000)
npm start

# Start frontend dev server (Vite, port 5173, proxies /api and /socket.io to :3000)
npm run client:dev

# Build frontend for production
npm run client:build

# Seed Season 2 floor/material/boss data into MongoDB (idempotent)
node server/scripts/seed-season2.js

# Initialize Season 3 MongoDB indexes (run once after deploy)
node server/scripts/init-season3-indexes.js

# Create GM admin account (set env vars first)
ADMIN_USER=admin ADMIN_PASS=your_password node server/scripts/seed-admin.js

# Initialize admin panel indexes (action_logs TTL, admin_users unique)
node server/scripts/init-admin-indexes.js
```

Test framework: Vitest (backend `npm test`, client `npm run test:client`).
Coverage: `npm run test:coverage` (threshold: 18% functions / 14% lines — baseline, raise incrementally).

## Architecture

### Server (Express + Socket.io + MongoDB)

- **Entry**: `server/index.js` — boots Express, mounts session (shared with Socket.io via `io.engine.use`), Passport Discord OAuth2, REST routes, and socket listeners.
- **Database**: `server/db.js` — thin wrapper around the native MongoDB driver (no Mongoose). Exposes `findOne`, `find`, `update`, `findOneAndUpdate`, `atomicIncItem`, `upsert`, etc. Database name is `lisbeth`.
- **Auth**: Discord OAuth2 via `passport-discord`. Session stored in MongoDB via `connect-mongo`. Middleware at `server/middleware/auth.js`.
- **Admin Auth**: Independent username/password system via bcrypt. Middleware at `server/middleware/adminAuth.js`. Session stored as `req.session.admin` (coexists with Passport).

### Command Dispatch Pattern

All game actions route through `server/game/move.js`:
1. Routes in `server/routes/game.js` build a `cmd` array (e.g., `[null, "mine"]`, `[null, "forge", mat1, mat2, name]`).
2. `move.js` enforces a global cooldown (`MOVE_COOLDOWN` = 5s) with an atomic `findOneAndUpdate`, then dispatches to the handler in `server/game/move/` by `cmd[1]`.
3. Each handler (`mine.js`, `forge.js`, `up.js`, `adv.js`, `pvp.js`) and `floor/bossAttack.js` receives `(cmd, user)` and returns a result object.

### Key Game Subsystems

| Module | Path | Purpose |
|--------|------|---------|
| Battle | `server/game/battle.js` | Dice-based PvE/PvP combat (d66 rolls, hit/crit/damage). 5-round limit. Supports NPC quality bonus via `isHiredNpc + effectiveStats`. |
| Weapons | `server/game/weapon/weapon.js` | Forging (combine 2 materials → weapon) and upgrade (material → stat buff). Stat names resolved by `itemId`. |
| Rarity | `server/game/weapon/rarity.js` | Score-based tiers: common → fine → rare → epic → legendary. |
| Floor System | `server/game/floor/` | 10-floor Aincrad. `floors.json` defines enemies/bosses per floor. `bossAttack.js` handles async shared-HP boss fights with 72h timer. |
| Economy | `server/game/economy/col.js` | Col currency: `awardCol` / `deductCol` with atomic MongoDB ops. |
| Settlement | `server/game/economy/settlement.js` | Weekly bill calc + settlement processing. Debt → bankruptcy chain. |
| Debt Check | `server/game/economy/debtCheck.js` | Lazy settlement hook injected into every `move.js` dispatch. Prevents double-processing via `findOneAndUpdate` guard. |
| Bankruptcy | `server/game/economy/bankruptcy.js` | Writes `bankruptcy_log` → releases NPCs → deletes user. |
| Progression | `server/game/progression/` | Achievements, stats tracking. |
| AI Narrative | `server/game/gemini.js` | Calls Google Gemini to generate Japanese battle narratives for adventures. |
| Config | `server/game/config.js` | All game constants: cooldowns, probabilities, Col rewards, boss timeout, floor material groups, TIME_SCALE, SETTLEMENT, NPC. |
| Config Manager | `server/game/configManager.js` | Runtime config overrides: loads from DB on boot, mutates live config object via `lodash.set()`. No restart needed. |
| Action Logger | `server/game/logging/actionLogger.js` | Fire-and-forget action logging to `action_logs` collection. Injected in `move.js` and individual routes. |
| Migration | `server/game/migration/ensureUserFields.js` | Auto-patches old user documents with new Season 2/3 fields. |
| Game Time | `server/game/time/gameTime.js` | Pure functions: game day calculation, settlement timing, newbie protection. 5 min real = 1 game day. |
| NPC Generator | `server/game/npc/generator.js` | Deterministic NPC from index via `seedrandom`. Pool of 8000. |
| NPC Manager | `server/game/npc/npcManager.js` | Hire/fire/heal/equip/resolveNpcBattle/killNpc. All NPC CRUD ops. |
| NPC Tavern | `server/game/npc/tavern.js` | Daily 3-NPC tavern pool seeded by game day. |
| NPC Stats | `server/game/npc/npcStats.js` | Condition-based effective stats multiplier + combined battle stats calculation. |

### Dice System (`server/game/roll.js`)

- `d6()` → 1-6, `d66()` → 2-12 (2d6), `d100Check(threshold)` → boolean.
- Used throughout battle, forging, and upgrade calculations.

### Real-time Events

Socket.io broadcasts from routes (not from socket handlers). Routes access `io` via `req.app.get("io")`. Boss attack returns `socketEvents` array that the route emits. Key events: `battle:result`, `pvp:attacked`, `boss:damage`, `boss:defeated`, `floor:unlocked`.

### Client (React 19 + Vite)

- No router — `App.jsx` toggles between `Login` and `Game` pages based on `useAuth()` hook state.
- `useSocket` hook manages all Socket.io event subscriptions, buffering last 50 events.
- Vite proxies `/api` and `/socket.io` to the backend in dev mode.

### GM Admin Panel (Client)

- Separate Vite entry point at `client/admin.html` → `client/src/admin/main.jsx`.
- Uses `react-router-dom` for internal navigation (`/admin`, `/admin/players`, `/admin/logs`, `/admin/config`).
- Independent auth flow (username/password), not Discord OAuth.
- Features: Dashboard (real-time stats via Socket.io), Player Management (CRUD), Action Logs (search/filter), Config Editor (live overrides).
- Admin routes: `server/routes/admin/` (auth, players, config, logs, dashboard).

### MongoDB Collections

- `user` — player data: inventory (`itemStock`), weapons (`weaponStock`), levels, floor progress, achievements, col balance, stats.
- `weapon` — recipe lookup (forge1 + forge2 → weapon template).
- `server_state` — single document (`_id: "aincrad"`) tracking current floor, boss HP, participants, floor history.
- `item` — material definitions (including Season 2 floor materials with `mainStat`).
- `npc` — NPC records (written on first hire). `status`: `available|hired|dead`. Indexed by `npcId` (unique), `status`, `hiredBy`.
- `bankruptcy_log` — permanent log of bankrupt characters. Indexed by `userId`, `bankruptedAt`.
- `admin_users` — GM accounts with bcrypt password hashes. Indexed by `username` (unique).
- `action_logs` — player/admin action logs with 30-day TTL. Indexed by `userId+timestamp`, `action+timestamp`.
- `config_overrides` — single document (`_id: "game_config"`) storing runtime config overrides.

### User Document Shape (key fields)

`userId` (Discord ID), `name`, `itemStock[]` (items with `itemId`, `itemLevel`, `itemNum`, `itemName`), `weaponStock[]`, `forgeLevel`, `forceLevel` (mining level), `currentFloor`, `floorProgress.{N}`, `col`, `achievements[]`, `availableTitles[]`, `title`, `stats`, `bossContribution`.

**Season 3 additions**: `gameCreatedAt`, `hiredNpcs[]` (each: `npcId, name, class, quality, baseStats, condition, level, exp, equippedWeaponIndex, weeklyCost`), `lastSettlementAt`, `nextSettlementAt`, `debt`, `debtStartedAt`, `debtCycleCount`, `isInDebt`, `lastActionAt`.

## Environment Variables

See `.env.example`: `MONGODB_URI`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_CALLBACK_URL`, `GEMINI_API_KEY`, `SESSION_SECRET`, `PORT`, `ADMIN_USER`, `ADMIN_PASS`.

## Conventions

- All user-facing text is in **Traditional Chinese** (繁體中文).
- Game error messages returned as `{ error: "..." }` with HTTP 400; server errors as HTTP 500 with generic message.
- Items are identified by `itemId` (numeric string for base items, `mat_floor{N}_ore`/`mat_floor{N}_crystal` for floor materials) and `itemLevel` (star rating).
- Weapon stats: `hp`, `atk`, `def`, `agi`, `cri`, `durability`.
- Atomic inventory operations via `db.atomicIncItem()` to prevent race conditions on item quantities.
