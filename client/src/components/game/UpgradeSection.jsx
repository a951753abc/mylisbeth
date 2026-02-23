import React, { useState, useCallback } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

const STAT_LABELS = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  agi: "AGI",
  cri: "CRI",
  durability: "耐久",
};

export default function UpgradeSection({ user, doAction, isDisabled, displayStamina }) {
  const [upWeapon, setUpWeapon] = useState("");
  const [upMat, setUpMat] = useState("");
  const [repairWeapon, setRepairWeapon] = useState("");
  const [repairMat, setRepairMat] = useState("");
  const [showStatBook, setShowStatBook] = useState(false);
  const [statBook, setStatBook] = useState(null);
  const [statBookLoading, setStatBookLoading] = useState(false);

  const forgeLevel = user.forgeLevel ?? 1;
  const itemOptions = (user.items || []).filter((item) => item.num > 0);

  const handleToggleStatBook = useCallback(async () => {
    if (showStatBook) {
      setShowStatBook(false);
      return;
    }
    if (!statBook) {
      setStatBookLoading(true);
      try {
        const res = await fetch("/api/game/stat-book", { credentials: "include" });
        const data = await res.json();
        if (data.error) {
          return;
        }
        setStatBook(data.entries || []);
      } catch {
        return;
      } finally {
        setStatBookLoading(false);
      }
    }
    setShowStatBook(true);
  }, [showStatBook, statBook]);

  const handleUpgrade = useCallback(async () => {
    const data = await doAction("upgrade", {
      weaponId: upWeapon,
      materialId: upMat,
    });
    // 強化成功發現新屬性時，更新本地記錄書快取
    if (data.newStatDiscovery && statBook) {
      setStatBook((prev) => {
        const exists = prev.some((e) => e.itemId === data.newStatDiscovery.itemId);
        if (exists) return prev;
        return [...prev, data.newStatDiscovery];
      });
    }
  }, [doAction, upWeapon, upMat, statBook]);

  return (
    <>
      {/* Upgrade */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>強化武器</h2>
          {forgeLevel >= 3 && (
            <button
              className="btn-secondary"
              style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
              onClick={handleToggleStatBook}
              disabled={statBookLoading}
            >
              {statBookLoading ? "載入中..." : showStatBook ? "收起記錄書" : "強化記錄書"}
            </button>
          )}
        </div>

        {/* 強化記錄書面板 */}
        {showStatBook && statBook && (
          <div style={{
            marginBottom: "0.6rem",
            padding: "0.5rem",
            background: "var(--bg-hover)",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            maxHeight: "240px",
            overflowY: "auto",
          }}>
            {statBook.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textAlign: "center" }}>
                尚未發現任何素材的強化屬性。成功強化武器後會自動記錄。
              </div>
            ) : (
              <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "0.2rem 0.3rem" }}>素材</th>
                    <th style={{ textAlign: "left", padding: "0.2rem 0.3rem" }}>強化屬性</th>
                  </tr>
                </thead>
                <tbody>
                  {statBook.map((entry) => (
                    <tr key={entry.itemId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.25rem 0.3rem" }}>{entry.itemName}</td>
                      <td style={{ padding: "0.25rem 0.3rem", fontWeight: 600, color: "var(--accent)" }}>
                        {STAT_LABELS[entry.stat] || entry.stat}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.3rem", textAlign: "right" }}>
              已發現 {statBook.length} 種
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <WeaponSelect
            weapons={user.weapons}
            value={upWeapon}
            onChange={(e) => setUpWeapon(e.target.value)}
            showName
            showAtk
            showDur
          />
          <select value={upMat} onChange={(e) => setUpMat(e.target.value)}>
            <option value="">— 選擇素材 —</option>
            {itemOptions.map((item) => (
              <option key={item.index} value={String(item.index)}>
                #{item.index} [{item.levelText}] {item.name} x{item.num}
              </option>
            ))}
          </select>
          <button
            className="btn-success"
            disabled={isDisabled || !upWeapon || !upMat}
            onClick={handleUpgrade}
          >
            強化
          </button>
        </div>
      </div>

      {/* Repair */}
      <div className="card">
        <h2>修復武器</h2>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.5rem",
          }}
        >
          <WeaponSelect
            weapons={user.weapons}
            value={repairWeapon}
            onChange={(e) => setRepairWeapon(e.target.value)}
            showAtk={false}
            showDur
          />
          <select
            value={repairMat}
            onChange={(e) => setRepairMat(e.target.value)}
          >
            <option value="">— 選擇素材 —</option>
            {itemOptions.map((item) => (
              <option key={item.index} value={String(item.index)}>
                #{item.index} [{item.levelText}] {item.name} x{item.num}
              </option>
            ))}
          </select>
          <button
            className="btn-warning"
            disabled={isDisabled || !repairWeapon || !repairMat || displayStamina < 1}
            onClick={async () => {
              const data = await doAction("repair", {
                weaponId: repairWeapon,
                materialId: repairMat,
              });
              if (!data.error) setRepairMat("");
            }}
          >
            修復
          </button>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          費用：普通 50 / 優良 100 / 稀有 200 / 史詩 400 / 傳說 800 Col，成功率 85%
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          消耗體力：1～5 點
          {displayStamina < 1 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
        </div>
      </div>
    </>
  );
}
