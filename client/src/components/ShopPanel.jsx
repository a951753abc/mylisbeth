import React, { useState } from "react";

export default function ShopPanel({ user, onRefresh }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState({});

  const items = user.items || [];
  const weapons = user.weapons || [];

  const setQty = (index, val) => {
    setQuantities((prev) => ({ ...prev, [index]: val }));
  };

  const handleSellItem = async (itemIndex) => {
    const qty = parseInt(quantities[itemIndex], 10) || 1;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/game/sell-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemIndex, quantity: qty }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        const achText = (data.newAchievements || []).map((a) => `🏆 成就解鎖：${a.nameCn}${a.titleReward ? `（獲得稱號「${a.titleReward}」）` : ""}`).join("\n");
        setMessage(data.message + (achText ? "\n" + achText : ""));
        await onRefresh();
      }
    } catch {
      setError("連線失敗");
    } finally {
      setBusy(false);
    }
  };

  const handleSellWeapon = async (weaponIndex) => {
    if (!window.confirm("確定要出售此武器？此操作無法復原。")) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/game/sell-weapon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weaponIndex }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        const achText = (data.newAchievements || []).map((a) => `🏆 成就解鎖：${a.nameCn}${a.titleReward ? `（獲得稱號「${a.titleReward}」）` : ""}`).join("\n");
        setMessage(data.message + (achText ? "\n" + achText : ""));
        await onRefresh();
      }
    } catch {
      setError("連線失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>收破爛商人</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          以隨機低價回收素材和武器。不公平，但能換 Col。
        </p>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          不論素材星級或武器稀有度，一律 1~6 Col。就是這麼黑。
        </div>
        {message && (
          <div className="success-msg" style={{ marginBottom: "0.5rem", color: "#4ade80" }}>
            {message}
          </div>
        )}
        {error && <div className="error-msg" style={{ marginBottom: "0.5rem" }}>{error}</div>}
      </div>

      {/* 素材回收 */}
      <div className="card">
        <h2>素材回收</h2>
        {items.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>背包沒有素材</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "0.3rem 0.5rem" }}>素材</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>星級</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>持有</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>數量</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>預估</th>
                <th style={{ padding: "0.3rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const qty = parseInt(quantities[item.index], 10) || 1;
                const minPrice = 1 * qty;
                const maxPrice = 6 * qty;
                return (
                  <tr key={item.index} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.4rem 0.5rem" }}>{item.name}</td>
                    <td style={{ padding: "0.4rem 0.5rem", color: "var(--warning)" }}>
                      {item.levelText}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>{item.num}</td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      <input
                        type="number"
                        min="1"
                        max={item.num}
                        value={quantities[item.index] ?? 1}
                        onChange={(e) => setQty(item.index, e.target.value)}
                        style={{ width: "55px" }}
                      />
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem", color: "var(--gold)", fontSize: "0.75rem" }}>
                      {minPrice}~{maxPrice} Col
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      <button
                        className="btn-warning"
                        disabled={busy || item.num < 1}
                        onClick={() => handleSellItem(item.index)}
                        style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}
                      >
                        回收
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 武器回收 */}
      <div className="card">
        <h2>武器回收</h2>
        {weapons.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>背包沒有武器</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "0.3rem 0.5rem" }}>武器</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>稀有度</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>耐久</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>預估</th>
                <th style={{ padding: "0.3rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {weapons.map((w) => {
                const mult = 1; // 收破爛，一律 d6
                return (
                  <tr key={w.index} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.4rem 0.5rem" }}>{w.weaponName}</td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      {w.rarityLabel && (
                        <span style={{ color: w.rarityColor }}>【{w.rarityLabel}】</span>
                      )}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>{w.durability}</td>
                    <td style={{ padding: "0.4rem 0.5rem", color: "var(--gold)", fontSize: "0.75rem" }}>
                      {mult}~{mult * 6}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      <button
                        className="btn-danger"
                        disabled={busy}
                        onClick={() => handleSellWeapon(w.index)}
                        style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}
                      >
                        回收
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
