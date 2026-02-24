import React, { useState } from "react";

const HEAL_BAR_BG = {
  height: "4px",
  background: "#333",
  borderRadius: "2px",
  flex: 1,
  minWidth: "3rem",
};

function condColor(cond) {
  if (cond >= 70) return "#4caf50";
  if (cond >= 40) return "#ff9800";
  if (cond >= 10) return "#f44336";
  return "#888";
}

export default function NpcQuickHeal({ npc, onHealed }) {
  const [busy, setBusy] = useState(null);
  const [healError, setHealError] = useState(null);

  if (!npc) return null;

  const cond = npc.condition ?? 100;
  const onMission = !!npc.mission;
  const isFull = cond >= 100;

  if (isFull || onMission) return null;

  const doHeal = async (healType) => {
    setBusy(healType);
    setHealError(null);
    try {
      const res = await fetch("/api/npc/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ npcId: npc.npcId, healType }),
      });
      const data = await res.json();
      if (data.error) {
        setHealError(data.error);
      } else if (onHealed) {
        onHealed();
      }
    } catch {
      setHealError("治療失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      fontSize: "0.75rem",
      marginTop: "0.3rem",
      flexWrap: "wrap",
    }}>
      <span style={{ color: condColor(cond) }}>❤️ {cond}%</span>
      <div style={HEAL_BAR_BG}>
        <div style={{
          height: "100%",
          width: `${cond}%`,
          background: condColor(cond),
          borderRadius: "2px",
          transition: "width 0.3s",
        }} />
      </div>
      <button
        className="btn-primary"
        style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}
        disabled={!!busy}
        onClick={() => doHeal("quick")}
      >
        {busy === "quick" ? "..." : "快速治療 50Col"}
      </button>
      <button
        className="btn-success"
        style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem" }}
        disabled={!!busy}
        onClick={() => doHeal("full")}
      >
        {busy === "full" ? "..." : "完全治療 200Col"}
      </button>
      {healError && <span style={{ color: "#f44336", fontSize: "0.7rem" }}>{healError}</span>}
    </div>
  );
}
