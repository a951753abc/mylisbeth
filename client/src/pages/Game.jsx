import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../hooks/useSocket";
import GamePanel from "../components/GamePanel";
import InventoryPanel from "../components/InventoryPanel";
import BattleLog from "../components/BattleLog";
import PlayerList from "../components/PlayerList";
import CooldownTimer from "../components/CooldownTimer";
import FloorPanel from "../components/FloorPanel";
import AchievementPanel from "../components/AchievementPanel";
import DailyPanel from "../components/DailyPanel";
import TavernPanel from "../components/TavernPanel";
import NpcPanel from "../components/NpcPanel";
import SettlementPanel from "../components/SettlementPanel";
import BankruptcyScreen from "../components/BankruptcyScreen";
import NpcDeathToast from "../components/NpcDeathToast";

export default function Game({ user, onLogout }) {
  const [gameUser, setGameUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("game");
  const [battleLogs, setBattleLogs] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const [bossUpdate, setBossUpdate] = useState(null);
  const [bankruptcy, setBankruptcy] = useState(null);
  const { events } = useSocket(gameUser?.userId);

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
        setBattleLogs((prev) => [...prev, latest.data]);
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

  const handleCreate = async (name) => {
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
  };

  const handleAction = async (action, body = {}) => {
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
    await fetchUser();
    return data;
  };

  const handleTitleChange = (newTitle) => {
    setGameUser((prev) => prev ? { ...prev, title: newTitle } : prev);
  };

  if (loading) {
    return <div className="loading">載入遊戲資料中...</div>;
  }

  if (bankruptcy) {
    return (
      <BankruptcyScreen
        info={bankruptcy}
        onDismiss={() => {
          setBankruptcy(null);
          setLoading(true);
          fetchUser();
        }}
      />
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
          <div style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>
            {(gameUser.col || 0).toLocaleString()} Col ｜ 第 {gameUser.currentFloor || 1} 層
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {user.username}
          </span>
          <button
            className="btn-danger"
            onClick={onLogout}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
          >
            登出
          </button>
        </div>
      </div>

      <div className="container">
        <CooldownTimer cooldown={cooldown} onExpire={() => setCooldown(0)} />

        <div className="nav-tabs">
          <button
            className={tab === "game" ? "active" : ""}
            onClick={() => setTab("game")}
          >
            遊戲
          </button>
          <button
            className={tab === "floor" ? "active" : ""}
            onClick={() => setTab("floor")}
          >
            樓層
          </button>
          <button
            className={tab === "daily" ? "active" : ""}
            onClick={() => setTab("daily")}
          >
            每日
          </button>
          <button
            className={tab === "achievement" ? "active" : ""}
            onClick={() => setTab("achievement")}
          >
            成就
          </button>
          <button
            className={tab === "inventory" ? "active" : ""}
            onClick={() => setTab("inventory")}
          >
            物品
          </button>
          <button
            className={tab === "log" ? "active" : ""}
            onClick={() => setTab("log")}
          >
            日誌
          </button>
          <button
            className={tab === "players" ? "active" : ""}
            onClick={() => setTab("players")}
          >
            名冊
          </button>
          <button
            className={tab === "tavern" ? "active" : ""}
            onClick={() => setTab("tavern")}
          >
            酒館
          </button>
          <button
            className={`${tab === "npc" ? "active" : ""}${(gameUser.hiredNpcs || []).length > 0 ? " npc-tab-badge" : ""}`}
            onClick={() => setTab("npc")}
          >
            NPC{(gameUser.hiredNpcs || []).length > 0 ? `(${gameUser.hiredNpcs.length})` : ""}
          </button>
          <button
            className={`${tab === "settlement" ? "active" : ""}${gameUser.isInDebt ? " debt-tab-badge" : ""}`}
            onClick={() => setTab("settlement")}
            style={gameUser.isInDebt ? { color: "#f87171" } : {}}
          >
            帳單{gameUser.isInDebt ? "⚠️" : ""}
          </button>
        </div>

        {tab === "game" && (
          <GamePanel
            user={gameUser}
            onAction={handleAction}
            setCooldown={setCooldown}
          />
        )}
        {tab === "floor" && (
          <FloorPanel
            user={gameUser}
            onAction={handleAction}
            bossUpdate={bossUpdate}
          />
        )}
        {tab === "daily" && (
          <DailyPanel
            user={gameUser}
            onClaim={fetchUser}
          />
        )}
        {tab === "achievement" && (
          <AchievementPanel
            user={gameUser}
            onTitleChange={handleTitleChange}
          />
        )}
        {tab === "inventory" && <InventoryPanel user={gameUser} />}
        {tab === "log" && <BattleLog logs={battleLogs} />}
        {tab === "players" && <PlayerList />}
        {tab === "tavern" && (
          <TavernPanel user={gameUser} onRefresh={fetchUser} />
        )}
        {tab === "npc" && (
          <NpcPanel user={gameUser} onRefresh={fetchUser} />
        )}
        {tab === "settlement" && (
          <SettlementPanel user={gameUser} onRefresh={fetchUser} />
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
