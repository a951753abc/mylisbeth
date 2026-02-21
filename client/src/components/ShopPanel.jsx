import React, { useState } from "react";

export default function ShopPanel({ user, onRefresh }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState({});

  const items = user.items || [];
  const weapons = user.weapons || [];
  const sealedWeapons = user.sealedWeapons || [];

  const setQty = (index, val) => {
    setQuantities((prev) => ({ ...prev, [index]: val }));
  };

  const handleSellItem = async (itemIndex, overrideQty) => {
    const qty = overrideQty ?? (parseInt(quantities[itemIndex], 10) || 1);
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

  const handleSellSealedWeapon = async (sealedIndex, weaponName, sellPrice) => {
    if (
      !window.confirm(
        `確定要以 ${sellPrice} Col 回收封印武器「${weaponName}」？此操作無法復原。`
      )
    )
      return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/game/sell-sealed-weapon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sealedIndex }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        const achText = (data.newAchievements || [])
          .map(
            (a) =>
              `成就解鎖：${a.nameCn}${a.titleReward ? `（獲得稱號「${a.titleReward}」）` : ""}`
          )
          .join("\n");
        setMessage(data.message + (achText ? "\n" + achText : ""));
        await onRefresh();
      }
    } catch {
      setError("連線失敗");
    } finally {
      setBusy(false);
    }
  };

  const isPK = user.isPK === true;

  return (
    <div>
      <div className="card">
        <h2>收破爛商人</h2>
        {isPK && (
          <div className="error-msg" style={{ marginBottom: "0.5rem" }}>
            你是紅名玩家，城鎮商店拒絕為你服務。
          </div>
        )}
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          以隨機低價回收素材和武器。即時出售，但價格偏低。
        </p>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          素材：星級倍率 x d6 Col（★1:x1, ★2:x3, ★3:x6）<br />
          武器：稀有度倍率 x d6 Col（普通:x1, 優良:x3, 稀有:x8, 史詩:x20, 傳說:x50）
        </div>
        <div style={{ fontSize: "0.75rem", color: "#60a5fa", marginBottom: "0.5rem" }}>
          想賣更好的價格？前往「佈告板」掛賣給其他玩家！
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
                const starMult = { 1: 1, 2: 3, 3: 6 }[item.level] || 1;
                const minPrice = starMult * 1 * qty;
                const maxPrice = starMult * 6 * qty;
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
                    <td style={{ padding: "0.4rem 0.5rem", whiteSpace: "nowrap" }}>
                      <button
                        className="btn-warning"
                        disabled={busy || item.num < 1 || isPK}
                        onClick={() => handleSellItem(item.index)}
                        style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem" }}
                      >
                        回收
                      </button>
                      {item.num > 1 && (
                        <button
                          className="btn-warning"
                          disabled={busy || isPK}
                          onClick={() => handleSellItem(item.index, item.num)}
                          style={{ padding: "0.2rem 0.6rem", fontSize: "0.78rem", marginLeft: "0.3rem", opacity: 0.85 }}
                        >
                          全部
                        </button>
                      )}
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
                const rarityMultMap = { common: 1, fine: 3, rare: 8, epic: 20, legendary: 50 };
                const mult = rarityMultMap[w.rarityId] || 1;
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
                        disabled={busy || isPK}
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
      {/* 封印武器回收 */}
      {sealedWeapons.length > 0 && (
        <div
          className="card"
          style={{
            borderColor: "#f59e0b",
            boxShadow: "0 0 12px rgba(245, 158, 11, 0.25)",
          }}
        >
          <h2 style={{ color: "#f59e0b" }}>封印武器高價回收</h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "#fbbf24",
              marginBottom: "0.5rem",
            }}
          >
            封印武器可以高價回收！售價 = 總分 x 10 Col（固定價格，不受骰運影響）
          </p>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "0.3rem 0.5rem" }}>武器</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>稀有度</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>總分</th>
                <th style={{ padding: "0.3rem 0.5rem" }}>售價</th>
                <th style={{ padding: "0.3rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {sealedWeapons.map((w) => {
                const sellPrice = (w.totalScore || 0) * 10;
                return (
                  <tr
                    key={w.index}
                    style={{
                      borderTop: "1px solid rgba(245, 158, 11, 0.15)",
                    }}
                  >
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      <span style={{ color: "#f59e0b", marginRight: "0.3rem" }}>
                        [封印]
                      </span>
                      {w.weaponName}
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      {w.rarityLabel && (
                        <span style={{ color: w.rarityColor }}>
                          【{w.rarityLabel}】
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        color: "#fbbf24",
                        fontWeight: "bold",
                      }}
                    >
                      {w.totalScore}
                    </td>
                    <td
                      style={{
                        padding: "0.4rem 0.5rem",
                        color: "var(--gold)",
                        fontWeight: "bold",
                      }}
                    >
                      {sellPrice} Col
                    </td>
                    <td style={{ padding: "0.4rem 0.5rem" }}>
                      <button
                        className="btn-warning"
                        disabled={busy}
                        onClick={() =>
                          handleSellSealedWeapon(
                            w.index,
                            w.weaponName,
                            sellPrice
                          )
                        }
                        style={{
                          padding: "0.2rem 0.6rem",
                          fontSize: "0.78rem",
                        }}
                      >
                        高價回收
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
