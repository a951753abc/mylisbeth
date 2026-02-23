import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSocket } from "../hooks/useSocket";
import GamePanel from "../components/GamePanel";
import InventoryPanel from "../components/InventoryPanel";
import BattleLog from "../components/BattleLog";
import LeaderboardPanel from "../components/LeaderboardPanel";
import CooldownTimer from "../components/CooldownTimer";
import FloorPanel from "../components/FloorPanel";
import AchievementPanel from "../components/AchievementPanel";
import TavernPanel from "../components/TavernPanel";
import NpcPanel from "../components/NpcPanel";
import SettlementPanel from "../components/SettlementPanel";
import BankruptcyScreen from "../components/BankruptcyScreen";
import NpcDeathToast from "../components/NpcDeathToast";
import ShopPanel from "../components/ShopPanel";
import MarketPanel from "../components/MarketPanel";
import SkillPanel from "../components/SkillPanel";

const MOVE_COOLDOWN_SECONDS = 5;

const HEADER_COL_STYLE = { fontSize: '0.8rem', color: 'var(--gold)' };
const FLOOR_SECONDARY_STYLE = { color: 'var(--text-secondary)' };
const PK_BADGE_STYLE = { color: '#ef4444', marginLeft: '0.3rem', fontWeight: 'bold' };
const HEADER_ACTIONS_STYLE = { display: "flex", gap: "0.5rem", alignItems: "center" };
const USERNAME_STYLE = { color: "var(--text-secondary)", fontSize: "0.85rem" };
const COMPACT_BTN_STYLE = { padding: "0.4rem 0.8rem", fontSize: "0.8rem" };
const PAUSE_BANNER_STYLE = {
  background: "#92400e33",
  border: "1px solid #f59e0b",
  borderRadius: "6px",
  padding: "0.5rem 0.8rem",
  marginBottom: "0.5rem",
  color: "#fbbf24",
  textAlign: "center",
  fontSize: "0.85rem",
};

const TAB_GROUPS = [
  {
    label: "行動",
    tabs: [
      { key: "game", text: "遊戲" },
      { key: "floor", text: "樓層" },
      { key: "inventory", text: "物品" },
      { key: "shop", text: "商店" },
      { key: "market", text: "佈告板" },
    ],
  },
  {
    label: "NPC",
    tabs: [
      { key: "tavern", text: "酒館" },
      { key: "npc", text: "NPC", badge: true },
      { key: "skill", text: "劍技" },
      { key: "settlement", text: "帳單", debtBadge: true },
    ],
  },
  {
    label: "紀錄",
    tabs: [
      { key: "achievement", text: "成就" },
      { key: "log", text: "日誌" },
      { key: "players", text: "排行榜" },
    ],
  },
];

export default function Game({ user, onLogout }) {
  const [gameUser, setGameUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("game");
  const [battleLogs, setBattleLogs] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const [bossUpdate, setBossUpdate] = useState(null);
  const [bankruptcy, setBankruptcy] = useState(null);
  const [isPauseLoading, setIsPauseLoading] = useState(false);
  const { events, serverFull, retryJoin } = useSocket(gameUser?.userId);

  const handleCooldownExpire = useCallback(() => setCooldown(0), []);
  const isCooldownActive = cooldown > 0;

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me", { credentials: "include" });
      const data = await res.json();
      if (data.bankruptcy) {
        setBankruptcy(data.bankruptcyInfo);
        setGameUser(null);
      } else if (data.exists) {
        setGameUser(data);
      } else {
        setGameUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (events.length > 0) {
      const latest = events[events.length - 1];

      if (latest.type === "battle") {
        const actionMap = { soloAdv: "solo-adventure", "pvp-npc": "pvp-npc", pvp: "pvp" };
        const action = actionMap[latest.data.type] || "adventure";
        setBattleLogs((prev) => [...prev, { action, ...latest.data, time: Date.now() }]);
      }
      if (latest.type === "pvp:attacked") {
        setBattleLogs((prev) => [
          ...prev,
          { action: "pvp:attacked", ...latest.data, time: Date.now() },
        ]);
        fetchUser();
      }
      if (latest.type === "boss:damage") {
        setBattleLogs((prev) => [
          ...prev,
          { action: "boss:damage", ...latest.data, time: Date.now() },
        ]);
        setBossUpdate(Date.now());
      }
      if (latest.type === "boss:phase") {
        setBattleLogs((prev) => [
          ...prev,
          { action: "boss:phase", ...latest.data, time: Date.now() },
        ]);
        setBossUpdate(Date.now());
      }
      if (latest.type === "boss:defeated") {
        setBattleLogs((prev) => [
          ...prev,
          { action: "boss:defeated", ...latest.data, time: Date.now() },
        ]);
        setBossUpdate(Date.now());
        fetchUser();
      }
      if (latest.type === "floor:unlocked") {
        setBattleLogs((prev) => [
          ...prev,
          { action: "floor:unlocked", ...latest.data, time: Date.now() },
        ]);
        fetchUser();
      }
      // npc:death 事件由 NpcDeathToast 消費，不需特別處理
    }
  }, [events, fetchUser]);

  const handleCreate = useCallback(async (name) => {
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.error) {
      return data.error;
    }
    await fetchUser();
    return null;
  }, [fetchUser]);

  const handleAction = useCallback(async (action, body = {}) => {
    const res = await fetch(`/api/game/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.bankruptcy) {
      setBankruptcy(data.bankruptcyInfo || {});
      setGameUser(null);
      return { error: data.message || "角色已破產" };
    }
    if (data.error) {
      if (data.cooldown) {
        setCooldown(data.cooldown);
      }
      return { error: data.error };
    }
    setBattleLogs((prev) => [...prev, { action, ...data, time: Date.now() }]);
    // 成功操作後啟動本地 CD（與伺服器 MOVE_COOLDOWN 同步）
    setCooldown(MOVE_COOLDOWN_SECONDS);
    await fetchUser();
    return data;
  }, [fetchUser]);

  const handleTitleChange = useCallback((newTitle) => {
    setGameUser((prev) => prev ? { ...prev, title: newTitle } : prev);
  }, []);

  const handleSetTitle = useCallback(async (title) => {
    try {
      const res = await fetch("/api/game/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.success) {
        handleTitleChange(title);
        return { success: true };
      }
      return { error: data.error || "更換失敗" };
    } catch {
      return { error: "更換失敗" };
    }
  }, [handleTitleChange]);

  const handleTogglePause = useCallback(async () => {
    if (isPauseLoading) return;
    const nextPaused = !gameUser.businessPaused;
    const msg = nextPaused
      ? "確定要暫停營業嗎？暫停期間所有遊戲行動將被封鎖，但帳單也會暫停計算。"
      : "確定要恢復營業嗎？結算計時器將重新開始。";
    if (!window.confirm(msg)) return;
    setIsPauseLoading(true);
    try {
      const res = await fetch("/api/game/pause-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paused: nextPaused }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      await fetchUser();
    } catch {
      alert("操作失敗，請稍後再試");
    } finally {
      setIsPauseLoading(false);
    }
  }, [isPauseLoading, gameUser?.businessPaused, fetchUser]);

  const handleBankruptcy = useCallback((info) => {
    setBankruptcy(info);
    setGameUser(null);
  }, []);

  const handleBankruptcyDismiss = useCallback(() => {
    setBankruptcy(null);
    setLoading(true);
    fetchUser();
  }, [fetchUser]);

  const handleTabClick = useCallback((e) => {
    const key = e.currentTarget.dataset.tab;
    if (key) setTab(key);
  }, []);

  // NPC tab 動態文字
  const npcCount = gameUser?.hiredNpcs?.length || 0;

  if (loading) {
    return <div className="loading">載入遊戲資料中...</div>;
  }

  if (bankruptcy) {
    return (
      <BankruptcyScreen
        info={bankruptcy}
        onDismiss={handleBankruptcyDismiss}
      />
    );
  }

  if (serverFull) {
    return (
      <div className="login-page">
        <h1>伺服器已滿</h1>
        <p>目前在線人數已達上限（{serverFull.max} 人），請稍後再試。</p>
        <button className="btn-primary" onClick={retryJoin} style={{ marginTop: "1rem" }}>
          重新嘗試連線
        </button>
        <button
          onClick={onLogout}
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "none",
            marginTop: "1rem",
          }}
        >
          登出
        </button>
      </div>
    );
  }

  if (!gameUser) {
    return (
      <CreateCharacter
        user={user}
        onCreate={handleCreate}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div>
      <NpcDeathToast events={events} />
      <div className="header">
        <div>
          <h1>
            鍛造師 {gameUser.name}
            {gameUser.title && (
              <span className="header-title">「{gameUser.title}」</span>
            )}
          </h1>
          <div style={HEADER_COL_STYLE}>
            {(gameUser.col || 0).toLocaleString()} Col ｜ {gameUser.activeFloor != null && gameUser.activeFloor !== (gameUser.currentFloor || 1)
              ? <>{gameUser.activeFloor}F <span style={FLOOR_SECONDARY_STYLE}>/ {gameUser.currentFloor || 1}F</span></>
              : <>{gameUser.currentFloor || 1}F</>
            } ｜ 冒險Lv.{gameUser.adventureLevel || 1}
            {gameUser.isPK && <span style={PK_BADGE_STYLE}>[紅名]</span>}
          </div>
        </div>
        <div style={HEADER_ACTIONS_STYLE}>
          <span style={USERNAME_STYLE}>
            {user.username}
          </span>
          <button
            className={gameUser.businessPaused ? "btn-primary" : "btn-warning"}
            onClick={handleTogglePause}
            disabled={isPauseLoading}
            style={COMPACT_BTN_STYLE}
          >
            {isPauseLoading ? "處理中..." : gameUser.businessPaused ? "恢復營業" : "暫停營業"}
          </button>
          <button
            className="btn-danger"
            onClick={onLogout}
            style={COMPACT_BTN_STYLE}
          >
            登出
          </button>
        </div>
      </div>

      <div className="container">
        {gameUser.businessPaused && (
          <div style={PAUSE_BANNER_STYLE}>
            店鋪已暫停營業 — 所有行動已凍結，帳單暫停計算。點擊「恢復營業」繼續遊戲。
          </div>
        )}
        <CooldownTimer cooldown={cooldown} onExpire={handleCooldownExpire} />

        <div className="nav-tabs-grouped">
          {TAB_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              <div className="nav-group-buttons">
                {group.tabs.map((t) => {
                  let className = tab === t.key ? "active" : "";
                  let text = t.text;
                  let style = undefined;
                  if (t.badge && npcCount > 0) {
                    className += " npc-tab-badge";
                    text = `NPC(${npcCount})`;
                  }
                  if (t.debtBadge && gameUser.isInDebt) {
                    className += " debt-tab-badge";
                    text = "帳單⚠";
                    style = { color: "#f87171" };
                  }
                  return (
                    <button
                      key={t.key}
                      className={className}
                      data-tab={t.key}
                      onClick={handleTabClick}
                      style={style}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {tab === "game" && (
          <GamePanel
            user={gameUser}
            onAction={handleAction}
            setCooldown={setCooldown}
            onUserUpdate={fetchUser}
            cooldownActive={isCooldownActive}
            onSetTitle={handleSetTitle}
          />
        )}
        {tab === "floor" && (
          <FloorPanel
            user={gameUser}
            onAction={handleAction}
            bossUpdate={bossUpdate}
            cooldownActive={isCooldownActive}
            onUserRefresh={fetchUser}
          />
        )}
        {tab === "achievement" && (
          <AchievementPanel
            user={gameUser}
            onTitleChange={handleTitleChange}
          />
        )}
        {tab === "inventory" && <InventoryPanel user={gameUser} onUserUpdate={fetchUser} />}
        {tab === "log" && <BattleLog logs={battleLogs} />}
        {tab === "players" && <LeaderboardPanel user={gameUser} onAction={handleAction} cooldownActive={isCooldownActive} />}
        {tab === "tavern" && (
          <TavernPanel user={gameUser} onRefresh={fetchUser} />
        )}
        {tab === "npc" && (
          <NpcPanel user={gameUser} onRefresh={fetchUser} />
        )}
        {tab === "skill" && (
          <SkillPanel user={gameUser} />
        )}
        {tab === "settlement" && (
          <SettlementPanel
            user={gameUser}
            onRefresh={fetchUser}
            onBankruptcy={handleBankruptcy}
          />
        )}
        {tab === "shop" && (
          <ShopPanel user={gameUser} onRefresh={fetchUser} />
        )}
        {tab === "market" && (
          <MarketPanel user={gameUser} onRefresh={fetchUser} />
        )}
      </div>
    </div>
  );
}

function CreateCharacter({ user, onCreate, onLogout }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const err = await onCreate(name.trim());
    if (err) setError(err);
    setCreating(false);
  };

  return (
    <div className="login-page">
      <h1>建立角色</h1>
      <p>歡迎，{user.username}！請為你的鍛造師命名。</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="角色名稱"
          maxLength={20}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={creating || !name.trim()}
        >
          {creating ? "建立中..." : "建立"}
        </button>
      </form>
      {error && <p className="error-msg">{error}</p>}
      <button
        onClick={onLogout}
        style={{
          background: "transparent",
          color: "var(--text-secondary)",
          border: "none",
          marginTop: "1rem",
        }}
      >
        登出
      </button>
    </div>
  );
}
