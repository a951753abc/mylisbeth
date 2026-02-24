import React, { useState, useEffect, useCallback } from "react";

const CARD_STYLE = { marginBottom: "0.8rem" };
const ROLE_COLORS = {
  "首領": "#ef4444",
  "副首領": "#f97316",
  "毒師": "#a855f7",
  "精銳": "#3b82f6",
};
const DEAD_STYLE = { opacity: 0.4, textDecoration: "line-through" };
const ALIVE_DOT = { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#4ade80", marginRight: "0.3rem" };
const DEAD_DOT = { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#6b7280", marginRight: "0.3rem" };

export default function LCGuildPanel({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/game/lc-status", { credentials: "include" });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch {
      setError("載入微笑棺木資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) return <div className="card" style={CARD_STYLE}>載入中...</div>;
  if (error) return <div className="card error-msg" style={CARD_STYLE}>{error}</div>;
  if (!data || !data.active) {
    return (
      <div className="card" style={CARD_STYLE}>
        <h3>微笑棺木</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          尚未偵測到微笑棺木公會的活動跡象。
        </p>
      </div>
    );
  }

  if (data.disbanded) {
    return (
      <div className="card" style={CARD_STYLE}>
        <h3>微笑棺木</h3>
        <div style={{ color: "#4ade80", fontWeight: "bold", marginBottom: "0.5rem" }}>
          公會已被殲滅
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          微笑棺木的所有成員都已被擊敗。艾恩葛朗特恢復了和平。
        </p>
        <MemberRoster members={data.members} />
      </div>
    );
  }

  const aliveNamed = data.members.filter((m) => m.alive).length;
  const deadNamed = data.members.filter((m) => !m.alive).length;

  return (
    <div>
      {/* 概覽 — 只顯示情報等級的資訊 */}
      <div className="card" style={CARD_STYLE}>
        <h3>微笑棺木</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          根據情報網收集的消息，以下是目前已知的微笑棺木成員狀況。
        </p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>具名成員：</span>
            <span style={{ color: "#4ade80" }}>{aliveNamed} 存活</span>
            {deadNamed > 0 && <span style={{ color: "#6b7280" }}> / {deadNamed} 已擊殺</span>}
          </div>
        </div>
      </div>

      {/* 成員名冊 — 只有名字和角色 */}
      <div className="card" style={CARD_STYLE}>
        <h3>成員名冊</h3>
        <MemberRoster members={data.members} />
      </div>
    </div>
  );
}

function MemberRoster({ members }) {
  if (!members || members.length === 0) {
    return <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>無成員資料</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {members.map((m) => (
        <MemberCard key={m.id} member={m} />
      ))}
    </div>
  );
}

function MemberCard({ member }) {
  const isAlive = member.alive;
  const roleColor = ROLE_COLORS[member.role] || "#9ca3af";

  return (
    <div
      style={{
        padding: "0.5rem 0.6rem",
        background: "var(--bg-hover)",
        borderRadius: "6px",
        borderLeft: `3px solid ${isAlive ? roleColor : "#4b5563"}`,
        ...(isAlive ? {} : { opacity: 0.5 }),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={isAlive ? ALIVE_DOT : DEAD_DOT} />
        <strong style={isAlive ? {} : DEAD_STYLE}>{member.nameCn}</strong>
        <span style={{ fontSize: "0.7rem", color: roleColor, marginLeft: "0.2rem" }}>
          [{member.role}]
        </span>
      </div>

      {!isAlive && member.killedAt && (
        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.2rem" }}>
          已被擊殺
        </div>
      )}
    </div>
  );
}
