import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from "../hooks/useSocket";
import GamePanel from "../components/GamePanel";
import InventoryPanel from "../components/InventoryPanel";
import BattleLog from "../components/BattleLog";
import PlayerList from "../components/PlayerList";
import CooldownTimer from "../components/CooldownTimer";

export default function Game({ user, onLogout }) {
  const [gameUser, setGameUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("game");
  const [battleLogs, setBattleLogs] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const { events } = useSocket(gameUser?.userId);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me", { credentials: "include" });
      const data = await res.json();
      if (data.exists) {
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
          {
            action: "pvp:attacked",
            ...latest.data,
            time: Date.now(),
          },
        ]);
        fetchUser();
      }
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

  if (loading) {
    return <div className="loading">載入遊戲資料中...</div>;
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
      <div className="header">
        <h1>鍛造師 {gameUser.name}</h1>
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
        </div>

        {tab === "game" && (
          <GamePanel
            user={gameUser}
            onAction={handleAction}
            setCooldown={setCooldown}
          />
        )}
        {tab === "inventory" && <InventoryPanel user={gameUser} />}
        {tab === "log" && <BattleLog logs={battleLogs} />}
        {tab === "players" && <PlayerList />}
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
