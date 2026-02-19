import React, { useState } from "react";

const QUALITY_COLOR = {
  見習: "#aaa",
  普通: "#ccc",
  優秀: "#4fc3f7",
  精銳: "#ab47bc",
  傳說: "#ffd700",
};

function conditionColor(cond) {
  if (cond >= 70) return "#4caf50";
  if (cond >= 40) return "#ff9800";
  if (cond >= 10) return "#f44336";
  return "#888";
}

export default function NpcPanel({ user, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");

  const npcs = user.hiredNpcs || [];
  const weapons = user.weapons || [];

  const doAction = async (url, body, successMsg) => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setMessage(`❌ ${data.error}`);
      } else {
        setMessage(successMsg);
        if (onRefresh) onRefresh();
      }
    } catch {
      setMessage("❌ 操作失敗，請稍後再試");
    }
  };

  const handleFire = async (npcId, npcName) => {
    if (!confirm(`確定要解雇 ${npcName} 嗎？`)) return;
    setBusy(`fire_${npcId}`);
    await doAction("/api/npc/fire", { npcId }, `✅ ${npcName} 已解雇`);
    setBusy(null);
  };

  const handleHeal = async (npcId, healType) => {
    setBusy(`heal_${npcId}_${healType}`);
    const cost = healType === "full" ? 200 : 50;
    await doAction("/api/npc/heal", { npcId, healType }, `✅ 治療完成（花費 ${cost} Col）`);
    setBusy(null);
  };

  const handleEquip = async (npcId, weaponIndex) => {
    setBusy(`equip_${npcId}`);
    const idx = weaponIndex === "" ? null : parseInt(weaponIndex, 10);
    await doAction("/api/npc/equip", { npcId, weaponIndex: idx }, "✅ 裝備更新完成");
    setBusy(null);
  };

  if (npcs.length === 0) {
    return (
      <div className="card">
        <h2>⚔️ 我的冒險者</h2>
        <div style={{ color: "var(--text-secondary)" }}>
          目前隊伍為空，前往「酒館」雇用冒險者吧！
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>⚔️ 我的冒險者</h2>

      {message && (
        <div className={message.startsWith("❌") ? "error-msg" : ""} style={{ marginBottom: "0.5rem" }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        {npcs.map((npc) => {
          const qualityColor = QUALITY_COLOR[npc.quality] || "#ccc";
          const cond = npc.condition ?? 100;
          const equippedWeapon = npc.equippedWeaponIndex != null
            ? weapons.find((w) => String(w.index) === String(npc.equippedWeaponIndex))
            : null;

          return (
            <div
              key={npc.npcId}
              style={{
                border: `1px solid ${qualityColor}`,
                borderRadius: "6px",
                padding: "0.7rem 0.9rem",
                boxShadow: `0 0 6px ${qualityColor}22`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.3rem" }}>
                <div>
                  <span style={{ color: qualityColor, fontWeight: "bold" }}>【{npc.quality}】</span>
                  <span style={{ fontWeight: "bold", marginLeft: "0.3rem" }}>{npc.name}</span>
                  <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem", fontSize: "0.8rem" }}>
                    LV.{npc.level}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `heal_${npc.npcId}_quick` || cond >= 100}
                    onClick={() => handleHeal(npc.npcId, "quick")}
                  >
                    快速治療 (50 Col)
                  </button>
                  <button
                    className="btn-success"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `heal_${npc.npcId}_full` || cond >= 100}
                    onClick={() => handleHeal(npc.npcId, "full")}
                  >
                    完全治療 (200 Col)
                  </button>
                  <button
                    className="btn-danger"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={busy === `fire_${npc.npcId}`}
                    onClick={() => handleFire(npc.npcId, npc.name)}
                  >
                    解雇
                  </button>
                </div>
              </div>

              {/* 體力條 */}
              <div style={{ marginTop: "0.4rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>
                  體力：{cond}%
                  {cond < 10 && <span style={{ color: "#f44336", marginLeft: "0.4rem" }}>⚠️ 無法出戰</span>}
                  {cond >= 10 && cond < 40 && <span style={{ color: "#ff9800", marginLeft: "0.4rem" }}>體力虛弱（素質×0.4）</span>}
                  {cond >= 40 && cond < 70 && <span style={{ color: "#ff9800", marginLeft: "0.4rem" }}>體力不足（素質×0.7）</span>}
                </div>
                <div style={{ height: "6px", background: "var(--card-bg)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${cond}%`,
                      background: conditionColor(cond),
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>

              {/* 素質 */}
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                HP:{npc.baseStats.hp} ATK:{npc.baseStats.atk} DEF:{npc.baseStats.def} AGI:{npc.baseStats.agi}
                ｜週薪：{npc.weeklyCost} Col
              </div>

              {/* 裝備武器選擇 */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.4rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>裝備武器：</span>
                <select
                  style={{ fontSize: "0.75rem" }}
                  value={npc.equippedWeaponIndex != null ? String(npc.equippedWeaponIndex) : ""}
                  onChange={(e) => handleEquip(npc.npcId, e.target.value)}
                  disabled={busy === `equip_${npc.npcId}`}
                >
                  <option value="">— 無裝備 —</option>
                  {weapons.map((w) => (
                    <option key={w.index} value={String(w.index)}>
                      #{w.index} {w.rarityLabel ? `【${w.rarityLabel}】` : ""}{w.weaponName}
                    </option>
                  ))}
                </select>
                {equippedWeapon && (
                  <span style={{ fontSize: "0.75rem", color: "var(--gold)" }}>
                    ATK:{equippedWeapon.atk} 耐久:{equippedWeapon.durability}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
