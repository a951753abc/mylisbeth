import React, { useState, useCallback } from "react";

const MAX_MATERIALS = 4;
const MIN_MATERIALS = 2;

export default function ForgeSection({ user, doAction, isDisabled, displayStamina }) {
  const [matSlots, setMatSlots] = useState(["", ""]);

  const slotCount = matSlots.length;

  // 計算每個欄位的可選素材（扣除其他欄位已佔用的數量）
  const getAvailableItems = useCallback(
    (slotIndex) => {
      const usedCounts = {};
      for (let i = 0; i < matSlots.length; i++) {
        if (i !== slotIndex && matSlots[i] !== "") {
          usedCounts[matSlots[i]] = (usedCounts[matSlots[i]] || 0) + 1;
        }
      }

      return (user.items || []).filter((item) => {
        if (item.num <= 0) return false;
        const key = String(item.index);
        const used = usedCounts[key] || 0;
        return item.num > used;
      });
    },
    [matSlots, user.items],
  );

  const getDisplayNum = useCallback(
    (item, slotIndex) => {
      const key = String(item.index);
      let used = 0;
      for (let i = 0; i < matSlots.length; i++) {
        if (i !== slotIndex && matSlots[i] === key) used++;
      }
      return item.num - used;
    },
    [matSlots],
  );

  const handleSlotChange = useCallback((index, value) => {
    setMatSlots((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleAddSlot = useCallback(() => {
    setMatSlots((prev) => (prev.length < MAX_MATERIALS ? [...prev, ""] : prev));
  }, []);

  const handleRemoveSlot = useCallback((index) => {
    setMatSlots((prev) => {
      if (prev.length <= MIN_MATERIALS) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const allSelected = matSlots.every((s) => s !== "");
  const extraStaminaCost = Math.max(0, (slotCount - 2) * 2);
  const minStamina = 3 + extraStaminaCost;
  const maxStamina = 8 + extraStaminaCost;

  return (
    <div className="card">
      <h2>鍛造武器</h2>
      {user.isInDebt && (
        <div className="error-msg" style={{ marginBottom: "0.4rem" }}>
          ⚠️ 負債中，鍛造功能已鎖定！請先至「帳單」tab 還清負債。
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.5rem",
          alignItems: "center",
        }}
      >
        {matSlots.map((val, i) => {
          const available = getAvailableItems(i);
          return (
            <div key={i} style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              <select
                value={val}
                onChange={(e) => handleSlotChange(i, e.target.value)}
              >
                <option value="">— 素材{i + 1} —</option>
                {available.map((item) => {
                  const displayNum = getDisplayNum(item, i);
                  return (
                    <option key={item.index} value={String(item.index)}>
                      #{item.index} [{item.levelText}] {item.name} x{displayNum}
                    </option>
                  );
                })}
              </select>
              {i >= MIN_MATERIALS && (
                <button
                  style={{
                    padding: "0.15rem 0.4rem",
                    fontSize: "0.75rem",
                    background: "var(--danger)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleRemoveSlot(i)}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {slotCount < MAX_MATERIALS && (
          <button
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={handleAddSlot}
          >
            + 追加素材
          </button>
        )}
        <button
          className="btn-warning"
          disabled={isDisabled || !allSelected || displayStamina < minStamina}
          onClick={() =>
            doAction("forge", {
              materials: matSlots,
            })
          }
        >
          鍛造
        </button>
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
        消耗體力：{minStamina}～{maxStamina} 點
        {slotCount > 2 && (
          <span style={{ color: "#a855f7", marginLeft: "0.3rem" }}>
            (+{extraStaminaCost} 追加素材)
          </span>
        )}
        {displayStamina < minStamina && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
      </div>
    </div>
  );
}
