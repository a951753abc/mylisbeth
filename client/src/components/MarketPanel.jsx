import React, { useState, useEffect, useCallback } from "react";

const TABS = [
  { id: "browse", label: "瀏覽" },
  { id: "sell", label: "掛賣" },
  { id: "mine", label: "我的掛賣" },
];

export default function MarketPanel({ user, onRefresh }) {
  const [tab, setTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filterType, setFilterType] = useState("");

  // 掛賣表單
  const [sellType, setSellType] = useState("material");
  const [selectedItem, setSelectedItem] = useState("");
  const [sellQty, setSellQty] = useState(1);
  const [sellPrice, setSellPrice] = useState("");
  const [selectedWeapon, setSelectedWeapon] = useState("");
  const [weaponPrice, setWeaponPrice] = useState("");

  const items = user.items || [];
  const weapons = user.weapons || [];

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterType ? `/api/market/listings?type=${filterType}` : "/api/market/listings";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setError("載入失敗");
    }
    setLoading(false);
  }, [filterType]);

  const fetchMyListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market/my-listings", { credentials: "include" });
      const data = await res.json();
      setMyListings(data.listings || []);
    } catch {
      setError("載入失敗");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "browse") fetchListings();
    if (tab === "mine") fetchMyListings();
  }, [tab, fetchListings, fetchMyListings]);

  const handleBuy = async (listingId) => {
    if (!window.confirm("確定購買？")) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage(`購買成功！花費 ${data.listing?.totalPrice?.toLocaleString() || ""} Col`);
        await fetchListings();
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("購買失敗");
    }
    setBusy(false);
  };

  const handleCancel = async (listingId) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/market/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage("已下架，物品已歸還（手續費不退）");
        await fetchMyListings();
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("下架失敗");
    }
    setBusy(false);
  };

  const handleListItem = async () => {
    const idx = parseInt(selectedItem, 10);
    const qty = parseInt(sellQty, 10);
    const price = parseInt(sellPrice, 10);
    if (isNaN(idx) || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      return setError("請填寫完整");
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/market/list-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemIndex: idx, quantity: qty, pricePerUnit: price }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage(`上架成功！手續費 ${data.fee} Col`);
        setSelectedItem("");
        setSellQty(1);
        setSellPrice("");
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("上架失敗");
    }
    setBusy(false);
  };

  const handleListWeapon = async () => {
    const idx = parseInt(selectedWeapon, 10);
    const price = parseInt(weaponPrice, 10);
    if (isNaN(idx) || isNaN(price) || price <= 0) {
      return setError("請填寫完整");
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/market/list-weapon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ weaponIndex: idx, totalPrice: price }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMessage(`上架成功！手續費 ${data.fee} Col`);
        setSelectedWeapon("");
        setWeaponPrice("");
        if (onRefresh) await onRefresh();
      }
    } catch {
      setError("上架失敗");
    }
    setBusy(false);
  };

  const isPK = user.isPK === true;
  const totalPrice = parseInt(sellPrice, 10) * parseInt(sellQty, 10) || 0;
  const estimatedFee = Math.max(1, Math.floor(totalPrice * 0.02));
  const wprice = parseInt(weaponPrice, 10) || 0;
  const weaponFee = Math.max(1, Math.floor(wprice * 0.02));

  return (
    <div>
      <div className="card">
        <h2>佈告板</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "btn-primary" : ""}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
              onClick={() => { setTab(t.id); setMessage(""); setError(""); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {isPK && (
          <div className="error-msg" style={{ marginBottom: "0.5rem" }}>
            你是紅名玩家，無法使用佈告板交易。
          </div>
        )}
        {message && <div style={{ color: "#4ade80", marginBottom: "0.5rem", fontSize: "0.85rem" }}>{message}</div>}
        {error && <div className="error-msg" style={{ marginBottom: "0.5rem" }}>{error}</div>}
      </div>

      {/* 瀏覽 */}
      {tab === "browse" && (
        <div className="card">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>篩選：</span>
            <select
              style={{ fontSize: "0.8rem" }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">全部</option>
              <option value="material">素材</option>
              <option value="weapon">武器</option>
            </select>
            <button
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
              onClick={fetchListings}
            >
              重新整理
            </button>
          </div>

          {loading ? (
            <div style={{ color: "var(--text-secondary)" }}>載入中...</div>
          ) : listings.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>目前沒有上架商品</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {listings.map((l) => (
                <div
                  key={l.listingId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.4rem 0.6rem",
                    background: "var(--card-bg)",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    {l.type === "material" ? (
                      <span>
                        {l.itemData.itemName}
                        <span style={{ color: "var(--warning)", marginLeft: "0.3rem" }}>
                          {"★".repeat(l.itemData.itemLevel || 1)}
                        </span>
                        <span style={{ color: "var(--text-secondary)", marginLeft: "0.3rem" }}>
                          x{l.itemData.quantity}
                        </span>
                      </span>
                    ) : (
                      <span>
                        {l.weaponData.rarityLabel && (
                          <span style={{ marginRight: "0.3rem" }}>【{l.weaponData.rarityLabel}】</span>
                        )}
                        {l.weaponData.weaponName}
                      </span>
                    )}
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                      by {l.sellerName}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--gold)", fontWeight: "bold" }}>{l.totalPrice} Col</span>
                    <button
                      className="btn-success"
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                      disabled={busy || l.sellerId === user.userId || isPK}
                      onClick={() => handleBuy(l.listingId)}
                    >
                      {l.sellerId === user.userId ? "自己" : "購買"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 掛賣 */}
      {tab === "sell" && (
        <div className="card">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <button
              className={sellType === "material" ? "btn-primary" : ""}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
              onClick={() => setSellType("material")}
            >
              素材
            </button>
            <button
              className={sellType === "weapon" ? "btn-primary" : ""}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}
              onClick={() => setSellType("weapon")}
            >
              武器
            </button>
          </div>

          {sellType === "material" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <select
                style={{ fontSize: "0.85rem" }}
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="">選擇素材</option>
                {items.map((item) => (
                  <option key={item.index} value={String(item.index)}>
                    {item.name} {"★".repeat(item.level || 1)} (x{item.num})
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <label style={{ fontSize: "0.8rem" }}>數量：</label>
                <input
                  type="number"
                  min="1"
                  value={sellQty}
                  onChange={(e) => setSellQty(e.target.value)}
                  style={{ width: "60px" }}
                />
                <label style={{ fontSize: "0.8rem" }}>單價：</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Col/個"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  style={{ width: "80px" }}
                />
              </div>
              {totalPrice > 0 && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  總價：{totalPrice} Col ｜ 手續費：~{estimatedFee} Col
                </div>
              )}
              <button
                className="btn-success"
                disabled={busy || !selectedItem || totalPrice <= 0 || isPK}
                onClick={handleListItem}
                style={{ alignSelf: "flex-start" }}
              >
                {busy ? "上架中..." : "確認上架"}
              </button>
            </div>
          )}

          {sellType === "weapon" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <select
                style={{ fontSize: "0.85rem" }}
                value={selectedWeapon}
                onChange={(e) => setSelectedWeapon(e.target.value)}
              >
                <option value="">選擇武器</option>
                {weapons.map((w) => (
                  <option key={w.index} value={String(w.index)}>
                    #{w.index} {w.rarityLabel ? `【${w.rarityLabel}】` : ""}{w.weaponName}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <label style={{ fontSize: "0.8rem" }}>售價：</label>
                <input
                  type="number"
                  min="1"
                  placeholder="總價 Col"
                  value={weaponPrice}
                  onChange={(e) => setWeaponPrice(e.target.value)}
                  style={{ width: "100px" }}
                />
              </div>
              {wprice > 0 && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  手續費：~{weaponFee} Col
                </div>
              )}
              <button
                className="btn-success"
                disabled={busy || !selectedWeapon || wprice <= 0 || isPK}
                onClick={handleListWeapon}
                style={{ alignSelf: "flex-start" }}
              >
                {busy ? "上架中..." : "確認上架"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 我的掛賣 */}
      {tab === "mine" && (
        <div className="card">
          <button
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", marginBottom: "0.5rem" }}
            onClick={fetchMyListings}
          >
            重新整理
          </button>

          {loading ? (
            <div style={{ color: "var(--text-secondary)" }}>載入中...</div>
          ) : myListings.length === 0 ? (
            <div style={{ color: "var(--text-secondary)" }}>沒有掛賣中的商品</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {myListings.map((l) => {
                const statusLabels = { active: "上架中", sold: "已售出", cancelled: "已下架", expired: "已過期" };
                const statusColors = { active: "#4ade80", sold: "#60a5fa", cancelled: "#9ca3af", expired: "#f87171" };
                return (
                  <div
                    key={l.listingId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.4rem 0.6rem",
                      background: "var(--card-bg)",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      {l.type === "material" ? (
                        <span>{l.itemData.itemName} x{l.itemData.quantity}</span>
                      ) : (
                        <span>
                          {l.weaponData?.rarityLabel && `【${l.weaponData.rarityLabel}】`}
                          {l.weaponData?.weaponName}
                        </span>
                      )}
                      <span style={{ color: "var(--gold)", marginLeft: "0.4rem" }}>{l.totalPrice} Col</span>
                      <span style={{ color: statusColors[l.status] || "#ccc", marginLeft: "0.4rem", fontSize: "0.75rem" }}>
                        [{statusLabels[l.status] || l.status}]
                      </span>
                    </div>
                    {l.status === "active" && (
                      <button
                        className="btn-danger"
                        style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                        disabled={busy}
                        onClick={() => handleCancel(l.listingId)}
                      >
                        下架
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
