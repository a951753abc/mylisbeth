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
const SKILL_TAG = {
  display: "inline-block",
  padding: "0.1rem 0.35rem",
  borderRadius: "3px",
  fontSize: "0.7rem",
  marginRight: "0.25rem",
  marginBottom: "0.15rem",
  background: "rgba(139, 92, 246, 0.15)",
  border: "1px solid rgba(139, 92, 246, 0.3)",
  color: "#c4b5fd",
};
const WEAPON_TAG = {
  display: "inline-block",
  padding: "0.1rem 0.35rem",
  borderRadius: "3px",
  fontSize: "0.7rem",
  background: "rgba(251, 191, 36, 0.12)",
  border: "1px solid rgba(251, 191, 36, 0.3)",
  color: "#fbbf24",
};

const WEAPON_TYPE_NAMES = {
  dagger: "短劍",
  rapier: "細劍",
  one_handed_sword: "單手劍",
  two_handed_sword: "雙手劍",
  curved_sword: "彎刀",
  katana: "刀",
};

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
      {/* 概覽 */}
      <div className="card" style={CARD_STYLE}>
        <h3>微笑棺木</h3>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>據點樓層：</span>
            <strong>{data.baseFloor}F</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>具名成員：</span>
            <span style={{ color: "#4ade80" }}>{aliveNamed} 存活</span>
            {deadNamed > 0 && <span style={{ color: "#6b7280" }}> / {deadNamed} 已擊殺</span>}
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>雜魚成員：</span>
            <strong>{data.gruntCount}</strong> 人
          </div>
        </div>
        {data.lootPool && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            贓物池：{data.lootPool.col > 0 ? `${data.lootPool.col.toLocaleString()} Col` : "0 Col"}
            {data.lootPool.materialCount > 0 && ` / ${data.lootPool.materialCount} 素材`}
            {data.lootPool.weaponCount > 0 && ` / ${data.lootPool.weaponCount} 武器`}
          </div>
        )}
      </div>

      {/* 成員名冊 */}
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
        <span style={isAlive ? ALIVE_DOT : DEAD_DOT} />
        <strong style={isAlive ? {} : DEAD_STYLE}>{member.nameCn}</strong>
        <span style={{ fontSize: "0.7rem", color: roleColor, marginLeft: "0.2rem" }}>
          [{member.role}]
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
        <span style={WEAPON_TAG}>
          {member.weaponName} ({WEAPON_TYPE_NAMES[member.weaponType] || member.weaponType})
        </span>
      </div>

      {member.skillNames && member.skillNames.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.15rem" }}>
          {member.skillNames.map((name, i) => (
            <span key={i} style={SKILL_TAG}>{name}</span>
          ))}
        </div>
      )}

      {!isAlive && member.killedAt && (
        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.2rem" }}>
          已被擊殺
        </div>
      )}
    </div>
  );
}
