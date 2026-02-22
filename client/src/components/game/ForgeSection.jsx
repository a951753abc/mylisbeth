import React, { useState, useCallback } from "react";

const MAX_MATERIALS = 4;
const MIN_MATERIALS = 2;

export default function ForgeSection({ user, doAction, isDisabled, displayStamina, forgeLevel }) {
  const [matSlots, setMatSlots] = useState(["", ""]);
  const [recipes, setRecipes] = useState(null);
  const [showRecipes, setShowRecipes] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeFilter, setRecipeFilter] = useState("");

  const slotCount = matSlots.length;
  const level = forgeLevel ?? 1;

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

  const handleToggleRecipes = useCallback(async () => {
    if (showRecipes) {
      setShowRecipes(false);
      return;
    }
    if (!recipes) {
      setRecipeLoading(true);
      try {
        const res = await fetch("/api/game/recipes", { credentials: "include" });
        const data = await res.json();
        if (data.error) {
          setRecipes([]);
        } else {
          setRecipes(data.recipes || []);
        }
      } catch {
        setRecipes([]);
      } finally {
        setRecipeLoading(false);
      }
    }
    setShowRecipes(true);
  }, [showRecipes, recipes]);

  const allSelected = matSlots.every((s) => s !== "");
  const extraStaminaCost = Math.max(0, (slotCount - 2) * 2);
  const minStamina = 3 + extraStaminaCost;
  const maxStamina = 8 + extraStaminaCost;

  const filteredRecipes = recipes
    ? recipes.filter((r) => {
        if (!recipeFilter) return true;
        const q = recipeFilter.toLowerCase();
        return (
          r.weaponName.toLowerCase().includes(q) ||
          r.forge1Name.toLowerCase().includes(q) ||
          r.forge2Name.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>鍛造武器</h2>
        {level >= 2 && (
          <button
            className="btn-secondary"
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
            onClick={handleToggleRecipes}
            disabled={recipeLoading}
          >
            {recipeLoading ? "載入中..." : showRecipes ? "收起配方書" : "配方書"}
          </button>
        )}
      </div>
      {user.isInDebt && (
        <div className="error-msg" style={{ marginBottom: "0.4rem" }}>
          ⚠️ 負債中，鍛造功能已鎖定！請先至「帳單」tab 還清負債。
        </div>
      )}

      {/* 配方書面板 */}
      {showRecipes && recipes && (
        <div style={{
          marginBottom: "0.6rem",
          padding: "0.5rem",
          background: "var(--bg-hover)",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          maxHeight: "280px",
          overflowY: "auto",
        }}>
          <input
            type="text"
            placeholder="搜尋武器或素材名稱..."
            value={recipeFilter}
            onChange={(e) => setRecipeFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "0.3rem 0.5rem",
              marginBottom: "0.4rem",
              borderRadius: "4px",
              border: "1px solid var(--border)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.8rem",
              boxSizing: "border-box",
            }}
          />
          {filteredRecipes.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", textAlign: "center" }}>
              {recipeFilter ? "沒有符合的配方" : "尚無配方資料"}
            </div>
          ) : (
            <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "0.2rem 0.3rem" }}>武器</th>
                  <th style={{ textAlign: "left", padding: "0.2rem 0.3rem" }}>素材 1</th>
                  <th style={{ textAlign: "left", padding: "0.2rem 0.3rem" }}>素材 2</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.25rem 0.3rem", fontWeight: 600 }}>{r.weaponName}</td>
                    <td style={{ padding: "0.25rem 0.3rem" }}>{r.forge1Name}</td>
                    <td style={{ padding: "0.25rem 0.3rem" }}>{r.forge2Name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.3rem", textAlign: "right" }}>
            共 {filteredRecipes.length} 筆{recipeFilter ? "（篩選中）" : ""}
          </div>
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
          onClick={async () => {
            const data = await doAction("forge", {
              materials: matSlots,
            });
            if (!data.error) setMatSlots(["", ""]);
          }}
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
