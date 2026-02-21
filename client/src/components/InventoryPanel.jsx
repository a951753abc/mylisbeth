import React, { useState } from "react";

export default function InventoryPanel({ user, onUserUpdate }) {
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameName, setRenameName] = useState("");
  const [renameMsg, setRenameMsg] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  const handleRename = async (weaponIndex) => {
    if (!renameName.trim() || renameBusy) return;
    setRenameBusy(true);
    setRenameMsg("");
    try {
      const res = await fetch("/api/game/rename-weapon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weaponIndex, newName: renameName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setRenameMsg(data.error);
      } else {
        setRenamingIdx(null);
        setRenameMsg("");
        if (onUserUpdate) onUserUpdate();
      }
    } catch {
      setRenameMsg("改名失敗");
    }
    setRenameBusy(false);
  };

  return (
    <div>
      {/* Items */}
      <div className="card">
        <h2>素材庫</h2>
        {!user.items || user.items.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>無素材</p>
        ) : (
          user.items.map((item, i) => (
            <div key={i} className="item-row">
              <span>
                <span
                  style={{
                    color: "var(--text-secondary)",
                    marginRight: "0.5rem",
                  }}
                >
                  #{item.index}
                </span>
                <span className="stars">[{item.levelText}]</span> {item.name}
              </span>
              <span>x{item.num}</span>
            </div>
          ))
        )}
      </div>

      {/* Weapons */}
      <div className="card">
        <h2>武器庫</h2>
        {!user.weapons || user.weapons.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>無武器</p>
        ) : (
          user.weapons.map((weapon, i) => (
            <div
              key={i}
              className="weapon-card"
              style={
                weapon.rarityColor
                  ? {
                      borderColor: weapon.rarityColor,
                      boxShadow: `0 0 8px ${weapon.rarityColor}44`,
                    }
                  : undefined
              }
            >
              {/* Rarity color bar at top */}
              {weapon.rarityColor && (
                <div
                  className="weapon-rarity-bar"
                  style={{ background: weapon.rarityColor }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginRight: "0.5rem",
                    }}
                  >
                    #{weapon.index}
                  </span>
                  <span className="weapon-name">{weapon.weaponName}</span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginLeft: "0.5rem",
                    }}
                  >
                    [{weapon.name}]
                  </span>
                  {(weapon.renameCount || 0) < 1 && renamingIdx !== weapon.index && (
                    <button
                      onClick={() => {
                        setRenamingIdx(weapon.index);
                        setRenameName(weapon.weaponName.replace(/\+\d+$/, ""));
                        setRenameMsg("");
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid #4b5563",
                        color: "#94a3b8",
                        borderRadius: "4px",
                        padding: "0.1rem 0.4rem",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        marginLeft: "0.4rem",
                      }}
                    >
                      ✏️ 改名
                    </button>
                  )}
                </span>
                {weapon.rarityLabel && (
                  <span
                    className="rarity-badge"
                    style={{
                      color: weapon.rarityColor,
                      borderColor: weapon.rarityColor,
                    }}
                  >
                    {weapon.rarityLabel}
                    {weapon.totalScore != null && (
                      <span className="rarity-score">{weapon.totalScore}</span>
                    )}
                  </span>
                )}
              </div>
              {/* Inline rename form */}
              {renamingIdx === weapon.index && (
                <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(weapon.index);
                      if (e.key === "Escape") setRenamingIdx(null);
                    }}
                    maxLength={20}
                    placeholder="輸入新名稱"
                    autoFocus
                    style={{
                      background: "#111827",
                      border: "1px solid #4b5563",
                      color: "#e2e8f0",
                      borderRadius: "4px",
                      padding: "0.25rem 0.4rem",
                      fontSize: "0.8rem",
                      width: "120px",
                    }}
                  />
                  <button
                    disabled={renameBusy || !renameName.trim()}
                    onClick={() => handleRename(weapon.index)}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      opacity: renameBusy || !renameName.trim() ? 0.5 : 1,
                    }}
                  >
                    {renameBusy ? "..." : "確定"}
                  </button>
                  <button
                    onClick={() => setRenamingIdx(null)}
                    style={{
                      background: "transparent",
                      border: "1px solid #4b5563",
                      color: "#94a3b8",
                      borderRadius: "4px",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    取消
                  </button>
                  {renameMsg && (
                    <span style={{ fontSize: "0.72rem", color: "#f87171" }}>{renameMsg}</span>
                  )}
                </div>
              )}
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="label">ATK</div>
                  <div className="value">{weapon.atk}</div>
                </div>
                <div className="stat-item">
                  <div className="label">DEF</div>
                  <div className="value">{weapon.def}</div>
                </div>
                <div className="stat-item">
                  <div className="label">AGI</div>
                  <div className="value">{weapon.agi}</div>
                </div>
                <div className="stat-item">
                  <div className="label">CRI</div>
                  <div className="value">{weapon.cri}</div>
                </div>
                <div className="stat-item">
                  <div className="label">HP</div>
                  <div className="value">{weapon.hp}</div>
                </div>
                <div className="stat-item">
                  <div className="label">耐久</div>
                  <div className="value">{weapon.durability}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sealed Weapons */}
      {user.sealedWeapons && user.sealedWeapons.length > 0 && (
        <div
          className="card"
          style={{
            borderColor: "#f59e0b",
            boxShadow: "0 0 12px rgba(245, 158, 11, 0.25)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(90deg, #f59e0b, #d97706)",
              height: "3px",
              borderRadius: "2px",
              marginBottom: "0.75rem",
            }}
          />
          <h2 style={{ color: "#f59e0b" }}>封印武器</h2>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#fbbf24",
              marginBottom: "0.5rem",
            }}
          >
            因歷史 BUG 產生的超規格武器，已被系統封印。無法使用，但可在商店高價回收。
          </p>
          {user.sealedWeapons.map((weapon) => (
            <div
              key={weapon.index}
              className="weapon-card"
              style={{
                borderColor: "#f59e0b",
                boxShadow: "0 0 8px rgba(245, 158, 11, 0.3)",
                opacity: 0.9,
              }}
            >
              <div
                className="weapon-rarity-bar"
                style={{
                  background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span>
                  <span
                    style={{
                      color: "#f59e0b",
                      fontWeight: "bold",
                      marginRight: "0.5rem",
                    }}
                  >
                    [封印]
                  </span>
                  <span className="weapon-name">
                    {weapon.weaponName}
                    {weapon.buff > 0 && `+${weapon.buff}`}
                  </span>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      marginLeft: "0.5rem",
                    }}
                  >
                    [{weapon.name}]
                  </span>
                </span>
                <span
                  className="rarity-badge"
                  style={{
                    color: weapon.rarityColor,
                    borderColor: weapon.rarityColor,
                  }}
                >
                  {weapon.rarityLabel}
                  {weapon.totalScore != null && (
                    <span className="rarity-score">{weapon.totalScore}</span>
                  )}
                </span>
              </div>
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="label">ATK</div>
                  <div className="value">{weapon.atk}</div>
                </div>
                <div className="stat-item">
                  <div className="label">DEF</div>
                  <div className="value">{weapon.def}</div>
                </div>
                <div className="stat-item">
                  <div className="label">AGI</div>
                  <div className="value">{weapon.agi}</div>
                </div>
                <div className="stat-item">
                  <div className="label">CRI</div>
                  <div className="value">{weapon.cri}</div>
                </div>
                <div className="stat-item">
                  <div className="label">HP</div>
                  <div className="value">{weapon.hp}</div>
                </div>
                <div className="stat-item">
                  <div className="label">耐久</div>
                  <div className="value">{weapon.durability}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Win records */}
      {user.wins && Object.keys(user.wins).length > 0 && (
        <div className="card">
          <h2>戰績</h2>
          {Object.entries(user.wins).map(([cat, count]) => (
            <div key={cat} className="item-row">
              <span>擊敗 {cat.replace("Win", "")}</span>
              <span>{count}</span>
            </div>
          ))}
          <div className="item-row">
            <span>死亡次數</span>
            <span>{user.lost}</span>
          </div>
        </div>
      )}
    </div>
  );
}
