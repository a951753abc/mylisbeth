import React from "react";

export default function ProficiencyBar({ label, value, max }) {
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.15rem" }}>
        <span>{label}</span>
        <span style={{ color: "var(--text-secondary)" }}>{value} / {max}</span>
      </div>
      <div
        style={{
          height: "6px",
          background: "var(--bg-secondary)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: pct >= 80 ? "var(--gold)" : pct >= 50 ? "var(--success)" : "var(--primary)",
            borderRadius: "3px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
