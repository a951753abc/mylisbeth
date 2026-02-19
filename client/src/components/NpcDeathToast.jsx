import React, { useEffect, useState } from "react";

const QUALITY_COLOR = {
  見習: "#aaa",
  普通: "#ccc",
  優秀: "#4fc3f7",
  精銳: "#ab47bc",
  傳說: "#ffd700",
};

export default function NpcDeathToast({ events }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    if (latest.type !== "npc:death") return;

    const id = Date.now();
    const toast = { id, ...latest.data };
    setToasts((prev) => [...prev.slice(-2), toast]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
    return () => clearTimeout(timer);
  }, [events]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: "fixed", bottom: "1rem", right: "1rem", zIndex: 1000 }}>
      {toasts.map((toast) => {
        const color = QUALITY_COLOR[toast.npcQuality] || "#aaa";
        return (
          <div
            key={toast.id}
            style={{
              background: "#1f1f2e",
              border: `1px solid ${color}`,
              borderRadius: "8px",
              padding: "0.7rem 1rem",
              marginBottom: "0.5rem",
              boxShadow: `0 0 12px ${color}44`,
              color: "#e5e7eb",
              fontSize: "0.85rem",
              maxWidth: "280px",
              animation: "fadeIn 0.3s ease",
            }}
          >
            <div style={{ color, fontWeight: "bold", marginBottom: "0.2rem" }}>
              💀 NPC 陣亡通知
            </div>
            <div>
              <span style={{ color }}>{toast.npcName}</span>
              <span style={{ color: "#9ca3af" }}>（{toast.npcQuality}）</span>
            </div>
            <div style={{ color: "#9ca3af", fontSize: "0.78rem" }}>
              在 {toast.smithName} 的第 {toast.floor} 層冒險中犧牲
            </div>
          </div>
        );
      })}
    </div>
  );
}
