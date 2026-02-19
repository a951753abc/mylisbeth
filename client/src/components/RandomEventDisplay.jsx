import React from "react";

const OUTCOME_STYLES = {
  win: {
    border: "1px solid rgba(74, 222, 128, 0.4)",
    background: "rgba(74, 222, 128, 0.08)",
    headerColor: "#4ade80",
    icon: "⚔️",
  },
  draw: {
    border: "1px solid rgba(251, 191, 36, 0.4)",
    background: "rgba(251, 191, 36, 0.08)",
    headerColor: "#fbbf24",
    icon: "⚠️",
  },
  lose: {
    border: "1px solid rgba(248, 113, 113, 0.4)",
    background: "rgba(248, 113, 113, 0.08)",
    headerColor: "#f87171",
    icon: "💀",
  },
};

export default function RandomEventDisplay({ event }) {
  if (!event) return null;

  const style = OUTCOME_STYLES[event.outcome] || OUTCOME_STYLES.lose;

  return (
    <div
      style={{
        border: style.border,
        background: style.background,
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginTop: "0.75rem",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          color: style.headerColor,
          marginBottom: "0.4rem",
          fontSize: "0.95rem",
        }}
      >
        {style.icon} {event.eventName}
      </div>

      <div style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
        {event.text}
      </div>

      {event.rewards?.col > 0 && (
        <div style={{ color: "var(--gold)", marginTop: "0.3rem" }}>
          +{event.rewards.col} Col
        </div>
      )}

      {event.losses?.col > 0 && (
        <div style={{ color: "#f87171", marginTop: "0.3rem" }}>
          -{event.losses.col} Col
        </div>
      )}

      {event.losses?.material && (
        <div style={{ color: "#f87171", fontSize: "0.85rem" }}>
          失去素材：{event.losses.material.name}
        </div>
      )}

      {event.losses?.weapon && (
        <div style={{ color: "#f87171", fontSize: "0.85rem" }}>
          失去武器：{event.losses.weapon.name}
        </div>
      )}

      {event.losses?.npcDeath && (
        <div style={{ color: "#f87171", fontWeight: "bold", fontSize: "0.85rem" }}>
          {event.losses.npcDeath.name} 陣亡
        </div>
      )}
    </div>
  );
}
