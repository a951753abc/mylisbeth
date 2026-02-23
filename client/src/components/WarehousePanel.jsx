import React, { useState, useEffect, useCallback } from "react";

const TH_STYLE = { padding: "0.3rem 0.5rem", color: "var(--text-secondary)", textAlign: "left" };
const TD_STYLE = { padding: "0.4rem 0.5rem" };
const ROW_BORDER = { borderTop: "1px solid rgba(255,255,255,0.05)" };
const BTN_SMALL = { padding: "0.2rem 0.6rem", fontSize: "0.78rem" };
const EMPTY_STYLE = { color: "var(--text-secondary)", fontSize: "0.85rem" };
const TABLE_STYLE = { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" };

export default function WarehousePanel({ user, onRefresh }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storeQty, setStoreQty] = useState({});
  const [retrieveQty, setRetrieveQty] = useState({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/game/warehouse", { credentials: "include" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data);
      }
    } catch {
      setError("載入倉庫資料失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const doAction = useCallback(async (endpoint, body = {}) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`/api/game/warehouse/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage(data.message);
        await fetchStatus();
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("操作失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }, [fetchStatus, onRefresh]);

  const handleBuild = useCallback(() => doAction("build"), [doAction]);

  const handleUpgrade = useCallback(() => {
    if (!window.confirm(`確定要升級倉庫嗎？需要 ${status?.upgradeCost} Col。`)) return;
    doAction("upgrade");
  }, [doAction, status?.upgradeCost]);

  const handleStoreItem = useCallback((itemIndex, qty) => {
    doAction("store-item", { itemIndex, quantity: qty });
  }, [doAction]);

  const handleRetrieveItem = useCallback((itemIndex, qty) => {
    doAction("retrieve-item", { itemIndex, quantity: qty });
  }, [doAction]);

  const handleStoreWeapon = useCallback((weaponIndex) => {
    doAction("store-weapon", { weaponIndex });
  }, [doAction]);

  const handleRetrieveWeapon = useCallback((weaponIndex) => {
    doAction("retrieve-weapon", { weaponIndex });
  }, [doAction]);

  if (loading) return <div style={EMPTY_STYLE}>載入倉庫資料中...</div>;

  // 未解鎖
  if (!status?.unlocked) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>倉庫</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          需要攻略第 {(status?.unlockFloor || 11) - 1} 層 Boss 後才能解鎖倉庫功能。
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          目前樓層：{user.currentFloor || 1}F
        </p>
      </div>
    );
  }

  // 未建置
  if (!status?.built) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
        <h2>建置倉庫</h2>
        <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
          建置一座倉庫來存放多餘的素材和武器。
        </p>
        <p style={{ fontSize: "0.9rem", color: "var(--gold)", marginBottom: "0.5rem" }}>
          費用：{status?.buildCost || 500} Col
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          初始容量：素材 {status?.baseItemCapacity ?? "?"} 種 / 武器 {status?.baseWeaponCapacity ?? "?"} 把（可用 Col 擴容）
        </p>
        {message && <div className="success-msg" style={{ marginBottom: "0.5rem", color: "#4ade80" }}>{message}</div>}
        {error && <div className="error-msg" style={{ marginBottom: "0.5rem" }}>{error}</div>}
        <button className="btn-primary" disabled={busy} onClick={handleBuild}>
          {busy ? "建置中..." : "建置倉庫"}
        </button>
      </div>
    );
  }

  // 已建置 — 主介面
  const items = user.items || [];
  const weapons = user.weapons || [];
  const whItems = status.items || [];
  const whWeapons = status.weapons || [];

  return (
    <div>
      {/* 反饋訊息 */}
      {message && <div className="success-msg" style={{ marginBottom: "0.5rem", color: "#4ade80" }}>{message}</div>}
      {error && <div className="error-msg" style={{ marginBottom: "0.5rem" }}>{error}</div>}

      {/* 倉庫概覽 */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>倉庫 Lv.{status.level}</h2>
          {status.level >= status.maxLevel
            ? <span style={{ fontSize: "0.8rem", color: "#4ade80" }}>已達最高等級</span>
            : status.upgradeCost != null && (
              <button className="btn-primary" disabled={busy} onClick={handleUpgrade} style={BTN_SMALL}>
                升級（{status.upgradeCost} Col）
              </button>
            )
          }
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          素材：{whItems.length}/{status.itemCapacity} 種 ｜ 武器：{whWeapons.length}/{status.weaponCapacity} 把
        </div>
      </div>

      {/* 倉庫素材 */}
      <div className="card">
        <h2>倉庫素材</h2>
        {whItems.length === 0 ? (
          <div style={EMPTY_STYLE}>倉庫沒有素材</div>
        ) : (
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>素材</th>
                <th style={TH_STYLE}>星級</th>
                <th style={TH_STYLE}>數量</th>
                <th style={TH_STYLE}>取出</th>
                <th style={TH_STYLE}></th>
              </tr>
            </thead>
            <tbody>
              {whItems.map((item, idx) => {
                const stars = "★".repeat(item.itemLevel);
                const qty = parseInt(retrieveQty[idx], 10) || 1;
                return (
                  <tr key={idx} style={ROW_BORDER}>
                    <td style={TD_STYLE}>{item.itemName}</td>
                    <td style={{ ...TD_STYLE, color: "var(--warning)" }}>{stars}</td>
                    <td style={TD_STYLE}>{item.itemNum}</td>
                    <td style={TD_STYLE}>
                      <input
                        type="number" min="1" max={item.itemNum}
                        value={retrieveQty[idx] ?? 1}
                        onChange={(e) => setRetrieveQty((prev) => ({ ...prev, [idx]: e.target.value }))}
                        style={{ width: "55px" }}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                      <button className="btn-primary" disabled={busy} onClick={() => handleRetrieveItem(idx, qty)} style={BTN_SMALL}>
                        取出
                      </button>
                      {item.itemNum > 1 && (
                        <button
                          className="btn-primary" disabled={busy}
                          onClick={() => handleRetrieveItem(idx, item.itemNum)}
                          style={{ ...BTN_SMALL, marginLeft: "0.3rem", opacity: 0.85 }}
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

      {/* 倉庫武器 */}
      <div className="card">
        <h2>倉庫武器</h2>
        {whWeapons.length === 0 ? (
          <div style={EMPTY_STYLE}>倉庫沒有武器</div>
        ) : (
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>武器</th>
                <th style={TH_STYLE}>ATK</th>
                <th style={TH_STYLE}>DEF</th>
                <th style={TH_STYLE}>耐久</th>
                <th style={TH_STYLE}></th>
              </tr>
            </thead>
            <tbody>
              {whWeapons.map((w, idx) => (
                <tr key={idx} style={ROW_BORDER}>
                  <td style={TD_STYLE}>
                    {w.weaponName}{w.buff > 0 ? `+${w.buff}` : ""}
                    {w.rarityLabel && (
                      <span style={{ color: w.rarityColor, marginLeft: "0.3rem", fontSize: "0.75rem" }}>
                        【{w.rarityLabel}】
                      </span>
                    )}
                  </td>
                  <td style={TD_STYLE}>{w.atk}</td>
                  <td style={TD_STYLE}>{w.def}</td>
                  <td style={TD_STYLE}>{w.durability}</td>
                  <td style={TD_STYLE}>
                    <button className="btn-primary" disabled={busy} onClick={() => handleRetrieveWeapon(idx)} style={BTN_SMALL}>
                      取出
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 身上素材（可存入） */}
      <div className="card">
        <h2>存入素材</h2>
        {items.length === 0 ? (
          <div style={EMPTY_STYLE}>背包沒有素材</div>
        ) : (
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>素材</th>
                <th style={TH_STYLE}>星級</th>
                <th style={TH_STYLE}>持有</th>
                <th style={TH_STYLE}>數量</th>
                <th style={TH_STYLE}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const qty = parseInt(storeQty[item.index], 10) || 1;
                return (
                  <tr key={item.index} style={ROW_BORDER}>
                    <td style={TD_STYLE}>{item.name}</td>
                    <td style={{ ...TD_STYLE, color: "var(--warning)" }}>{item.levelText}</td>
                    <td style={TD_STYLE}>{item.num}</td>
                    <td style={TD_STYLE}>
                      <input
                        type="number" min="1" max={item.num}
                        value={storeQty[item.index] ?? 1}
                        onChange={(e) => setStoreQty((prev) => ({ ...prev, [item.index]: e.target.value }))}
                        style={{ width: "55px" }}
                      />
                    </td>
                    <td style={{ ...TD_STYLE, whiteSpace: "nowrap" }}>
                      <button className="btn-warning" disabled={busy} onClick={() => handleStoreItem(item.index, qty)} style={BTN_SMALL}>
                        存入
                      </button>
                      {item.num > 1 && (
                        <button
                          className="btn-warning" disabled={busy}
                          onClick={() => handleStoreItem(item.index, item.num)}
                          style={{ ...BTN_SMALL, marginLeft: "0.3rem", opacity: 0.85 }}
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

      {/* 身上武器（可存入） */}
      <div className="card">
        <h2>存入武器</h2>
        {weapons.length === 0 ? (
          <div style={EMPTY_STYLE}>背包沒有武器</div>
        ) : (
          <table style={TABLE_STYLE}>
            <thead>
              <tr>
                <th style={TH_STYLE}>武器</th>
                <th style={TH_STYLE}>ATK</th>
                <th style={TH_STYLE}>DEF</th>
                <th style={TH_STYLE}>耐久</th>
                <th style={TH_STYLE}></th>
              </tr>
            </thead>
            <tbody>
              {weapons.map((w) => (
                <tr key={w.index} style={ROW_BORDER}>
                  <td style={TD_STYLE}>
                    {w.weaponName}
                    {w.rarityLabel && (
                      <span style={{ color: w.rarityColor, marginLeft: "0.3rem", fontSize: "0.75rem" }}>
                        【{w.rarityLabel}】
                      </span>
                    )}
                  </td>
                  <td style={TD_STYLE}>{w.atk}</td>
                  <td style={TD_STYLE}>{w.def}</td>
                  <td style={TD_STYLE}>{w.durability}</td>
                  <td style={TD_STYLE}>
                    <button className="btn-warning" disabled={busy} onClick={() => handleStoreWeapon(w.index)} style={BTN_SMALL}>
                      存入
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
