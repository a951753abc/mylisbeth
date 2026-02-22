import React, { useState, useCallback } from "react";

const BUDGET_OPTIONS = [
  { value: 0, label: "1 次" },
  { value: 6, label: "6 體力" },
  { value: 12, label: "12 體力" },
  { value: 18, label: "18 體力" },
  { value: 24, label: "24 體力" },
  { value: 30, label: "30 體力" },
  { value: -1, label: "全部體力" },
];

const PERK_LEVELS = {
  continuous: 2,
  precise: 4,
  radar: 6,
  bulkSell: 8,
  masterEye: 10,
};

export default function MineSection({ doAction, isDisabled, busy, cooldownActive, displayStamina, mineLevel }) {
  const [staminaBudget, setStaminaBudget] = useState(0);
  const [autoSell1Star, setAutoSell1Star] = useState(false);
  const [autoSell2Star, setAutoSell2Star] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const canContinuous = mineLevel >= PERK_LEVELS.continuous;
  const canPrecise = mineLevel >= PERK_LEVELS.precise;
  const canRadar = mineLevel >= PERK_LEVELS.radar;
  const canBulkSell = mineLevel >= PERK_LEVELS.bulkSell;

  const handleMine = useCallback(() => {
    const body = {};
    if (canContinuous && staminaBudget !== 0) {
      body.staminaBudget = staminaBudget === -1 ? Math.floor(displayStamina) : staminaBudget;
    }
    if (canPrecise && autoSell1Star) body.autoSell1Star = true;
    if (canBulkSell && autoSell2Star) body.autoSell2Star = true;
    doAction("mine", body);
  }, [doAction, canContinuous, canPrecise, canBulkSell, staminaBudget, autoSell1Star, autoSell2Star, displayStamina]);

  const fetchPreview = useCallback(async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/game/mine/preview", { credentials: "include" });
      const data = await res.json();
      if (data.error) {
        setPreview(null);
        setShowPreview(false);
      } else {
        setPreview(data);
        setShowPreview(true);
      }
    } catch {
      setPreview(null);
      setShowPreview(false);
    }
    setPreviewLoading(false);
  }, [showPreview]);

  return (
    <div className="card">
      <h2>挖礦</h2>

      {/* 連續挖礦 LV2：體力預算下拉 */}
      {canContinuous && (
        <div style={{ marginBottom: "0.4rem" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            連續挖礦：
            <select
              value={staminaBudget}
              onChange={(e) => setStaminaBudget(Number(e.target.value))}
              style={{ marginLeft: "0.3rem", fontSize: "0.8rem" }}
            >
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* 挖礦按鈕 */}
      <button
        className="btn-primary"
        disabled={isDisabled || displayStamina < 1}
        onClick={handleMine}
      >
        {busy ? "挖礦中..." : cooldownActive ? "冷卻中..." : "開始挖礦"}
      </button>

      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
        消耗體力：1～6 點{canContinuous && staminaBudget !== 0 && (
          <span style={{ color: "var(--gold)", marginLeft: "0.3rem" }}>
            （預算：{staminaBudget === -1 ? `${Math.floor(displayStamina)} 全部` : `${staminaBudget} 點`}）
          </span>
        )}
        {displayStamina < 1 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
      </div>

      {/* 精準挖礦 LV4：自動售 ★1 */}
      {canPrecise && (
        <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", marginTop: "0.4rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoSell1Star}
            onChange={(e) => setAutoSell1Star(e.target.checked)}
          />
          <span>精準挖礦：自動出售 ★ 素材</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>（LV4）</span>
        </label>
      )}

      {/* 批量出售 LV8：自動售 ★2 */}
      {canBulkSell && (
        <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem", marginTop: "0.2rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={autoSell2Star}
            onChange={(e) => setAutoSell2Star(e.target.checked)}
          />
          <span>批量出售：自動出售 ★★ 素材</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>（LV8）</span>
        </label>
      )}

      {/* 礦脈探測 LV6 */}
      {canRadar && (
        <div style={{ marginTop: "0.5rem" }}>
          <button
            className="btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
            onClick={fetchPreview}
            disabled={previewLoading}
          >
            {previewLoading ? "載入中..." : showPreview ? "收合礦脈情報" : "查看礦脈情報"}
          </button>

          {showPreview && preview && (
            <div style={{
              marginTop: "0.4rem",
              padding: "0.5rem",
              background: "var(--bg-secondary)",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              fontSize: "0.75rem",
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "0.3rem" }}>
                第 {preview.floor} 層礦脈（LV.{preview.mineLevel}）
              </div>
              <div style={{ display: "flex", gap: "0.8rem", marginBottom: "0.4rem" }}>
                <span>★★★ <strong style={{ color: "#f59e0b" }}>{preview.starRates.star3}%</strong></span>
                <span>★★ <strong style={{ color: "#3b82f6" }}>{preview.starRates.star2}%</strong></span>
                <span>★ <strong>{preview.starRates.star1}%</strong></span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                {preview.pool.map((item) => (
                  <span
                    key={item.itemId}
                    style={{
                      padding: "0.1rem 0.4rem",
                      borderRadius: "3px",
                      background: item.floorItem ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                      border: item.floorItem ? "1px solid rgba(59,130,246,0.3)" : "1px solid var(--border)",
                      fontSize: "0.7rem",
                    }}
                  >
                    {item.name}{item.floorItem ? " ✦" : ""}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                ✦ = 樓層限定素材
              </div>
            </div>
          )}
        </div>
      )}

      {/* 等級功能提示 */}
      {mineLevel < PERK_LEVELS.masterEye && (
        <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          {mineLevel < PERK_LEVELS.continuous && <div>LV{PERK_LEVELS.continuous} 解鎖：連續挖礦</div>}
          {mineLevel < PERK_LEVELS.precise && mineLevel >= PERK_LEVELS.continuous && <div>LV{PERK_LEVELS.precise} 解鎖：精準挖礦</div>}
          {mineLevel < PERK_LEVELS.radar && mineLevel >= PERK_LEVELS.precise && <div>LV{PERK_LEVELS.radar} 解鎖：礦脈探測</div>}
          {mineLevel < PERK_LEVELS.bulkSell && mineLevel >= PERK_LEVELS.radar && <div>LV{PERK_LEVELS.bulkSell} 解鎖：批量出售</div>}
          {mineLevel < PERK_LEVELS.masterEye && mineLevel >= PERK_LEVELS.bulkSell && <div>LV{PERK_LEVELS.masterEye} 解鎖：大師之眼</div>}
        </div>
      )}
    </div>
  );
}
