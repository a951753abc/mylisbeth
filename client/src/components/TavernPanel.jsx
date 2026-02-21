import React, { useState, useEffect } from "react";
import { QUALITY_COLOR } from "../constants/npcQuality.js";

export default function TavernPanel({ user, onRefresh }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  const [hireLimit, setHireLimit] = useState(null);
  const [currentHired, setCurrentHired] = useState(0);

  const fetchTavern = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/npc/tavern", { credentials: "include" });
      const data = await res.json();
      setNpcs(data.npcs || []);
      if (data.hireLimit != null) setHireLimit(data.hireLimit);
      if (data.currentHired != null) setCurrentHired(data.currentHired);
    } catch {
      setMessage("無法載入酒館資料");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTavern();
  }, []);

  const handleHire = async (npcId) => {
    setBusy(npcId);
    setMessage("");
    try {
      const res = await fetch("/api/npc/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ npcId }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`雇用失敗：${data.error}`);
      } else {
        setMessage(`✅ 成功雇用 ${data.npc?.name}！花費 ${data.cost} Col`);
        await fetchTavern();
        if (onRefresh) onRefresh();
      }
    } catch {
      setMessage("雇用失敗，請稍後再試");
    } finally {
      setBusy(null);
    }
  };

  const isPaused = user.businessPaused;

  if (loading) return <div className="card">載入酒館中...</div>;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>🍺 冒險者酒館</h2>
        <button
          className="btn-primary"
          style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
          onClick={fetchTavern}
        >
          重新整理
        </button>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        每 5 分鐘（1 遊戲日）刷新一次陣容
        {hireLimit != null && (
          <span style={{ marginLeft: "0.6rem", color: currentHired >= hireLimit ? "#f44336" : "var(--gold)" }}>
            ｜隊伍 {currentHired}/{hireLimit} 人
            {currentHired >= hireLimit && "（已滿）"}
          </span>
        )}
        <span style={{ marginLeft: "0.6rem" }}>
          ｜冒險 LV.{user.adventureLevel || 1}
        </span>
      </div>

      {isPaused && (
        <div className="error-msg" style={{ marginBottom: "0.5rem" }}>
          店鋪暫停營業中，無法雇用冒險者。請先恢復營業。
        </div>
      )}

      {message && (
        <div className={`${message.startsWith("✅") ? "" : "error-msg"}`} style={{ marginBottom: "0.5rem" }}>
          {message}
        </div>
      )}

      {npcs.length === 0 ? (
        <div style={{ color: "var(--text-secondary)" }}>今日沒有可雇用的冒險者</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {npcs.map((npc) => {
            const alreadyHired = (user.hiredNpcs || []).some((n) => n.npcId === npc.npcId);
            const qualityColor = QUALITY_COLOR[npc.quality] || "#ccc";
            return (
              <div
                key={npc.npcId}
                style={{
                  border: `1px solid ${qualityColor}`,
                  borderRadius: "6px",
                  padding: "0.6rem 0.8rem",
                  boxShadow: `0 0 6px ${qualityColor}33`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                }}
              >
                <div>
                  <span style={{ color: qualityColor, fontWeight: "bold", marginRight: "0.4rem" }}>
                    【{npc.quality}】
                  </span>
                  <span style={{ fontWeight: "bold" }}>{npc.name}</span>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    HP:{npc.baseStats.hp} ATK:{npc.baseStats.atk} DEF:{npc.baseStats.def} AGI:{npc.baseStats.agi}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gold)", marginTop: "0.1rem" }}>
                    雇用費 {npc.hireCost} Col｜月薪 {npc.monthlyCost || npc.weeklyCost} Col/月
                  </div>
                  {(npc.learnedSkills || []).length > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "#a855f7", marginTop: "0.15rem" }}>
                      自帶劍技：{npc.learnedSkills.length} 個
                    </div>
                  )}
                </div>
                <button
                  className="btn-success"
                  disabled={alreadyHired || busy === npc.npcId || isPaused || (hireLimit != null && currentHired >= hireLimit)}
                  onClick={() => handleHire(npc.npcId)}
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
                >
                  {alreadyHired ? "已在隊伍" : (hireLimit != null && currentHired >= hireLimit) ? "已滿員" : busy === npc.npcId ? "雇用中..." : "雇用"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
