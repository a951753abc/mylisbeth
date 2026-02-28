import React, { useState, useCallback } from "react";
import WeaponSelect from "../WeaponSelect.jsx";

const MAX_MATERIALS = 4;
const MIN_MATERIALS = 2;
const SYNTHESIS_LEVEL = 5;

const TYPE_LABELS = {
  one_handed_sword: "片手劍", two_handed_sword: "両手劍", two_handed_axe: "両手斧",
  mace: "戰鎚", katana: "刀", curved_sword: "曲劍", rapier: "細劍",
  dagger: "短劍", spear: "槍", bow: "弓", shield: "盾",
};

export default function ForgeSection({ user, doAction, isDisabled, displayStamina, forgeLevel }) {
  const [matSlots, setMatSlots] = useState(["", ""]);
  const [recipes, setRecipes] = useState(null);
  const [recipeProgress, setRecipeProgress] = useState(null); // { discovered, total }
  const [showRecipes, setShowRecipes] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeFilter, setRecipeFilter] = useState("");

  // 武器合成 state
  const [synWeapon1, setSynWeapon1] = useState("");
  const [synWeapon2, setSynWeapon2] = useState("");
  const [synTargetType, setSynTargetType] = useState("");

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
          return; // 載入失敗，保持 recipes=null 讓下次點擊可重試
        }
        setRecipes(data.recipes || []);
        if (data.total != null) {
          setRecipeProgress({ discovered: data.discovered ?? 0, total: data.total });
        }
      } catch {
        return; // 網路錯誤，保持 recipes=null 讓下次點擊可重試
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
                {filteredRecipes.map((r) => (
                  <tr key={`${r.forge1}-${r.forge2}`} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.25rem 0.3rem", fontWeight: 600 }}>{r.weaponName}</td>
                    <td style={{ padding: "0.25rem 0.3rem" }}>{r.forge1Name}</td>
                    <td style={{ padding: "0.25rem 0.3rem" }}>{r.forge2Name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.3rem", textAlign: "right" }}>
            {recipeFilter ? `${filteredRecipes.length} 筆符合` : ""}
            {recipeProgress && (
              <span style={{ marginLeft: recipeFilter ? "0.5rem" : 0 }}>
                已發現 {recipeProgress.discovered} / {recipeProgress.total} 種配方
              </span>
            )}
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
            if (!data.error) {
              setMatSlots(["", ""]);
              setRecipes(null); // 清除快取，下次開配方書重新載入
              setRecipeProgress(null);
            }
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

      {/* 武器合成區塊（鍛造 Lv5 解鎖） */}
      {level >= SYNTHESIS_LEVEL && (
        <SynthesisPanel
          weapons={user.weapons || []}
          synWeapon1={synWeapon1}
          synWeapon2={synWeapon2}
          synTargetType={synTargetType}
          setSynWeapon1={setSynWeapon1}
          setSynWeapon2={setSynWeapon2}
          setSynTargetType={setSynTargetType}
          isDisabled={isDisabled}
          displayStamina={displayStamina}
          doAction={doAction}
        />
      )}
    </div>
  );
}

function SynthesisPanel({
  weapons, synWeapon1, synWeapon2, synTargetType,
  setSynWeapon1, setSynWeapon2, setSynTargetType,
  isDisabled, displayStamina, doAction,
}) {
  const w1 = weapons.find((w) => String(w.index) === synWeapon1);
  const w2 = weapons.find((w) => String(w.index) === synWeapon2);

  // 可選的目標類型（兩把武器的 type 去重）
  const typeOptions = [];
  if (w1) typeOptions.push(w1.type);
  if (w2 && (!w1 || w2.type !== w1.type)) typeOptions.push(w2.type);

  // 自動選取目標類型
  const effectiveTarget = synTargetType && typeOptions.includes(synTargetType)
    ? synTargetType
    : typeOptions[0] || "";

  const bothSelected = synWeapon1 !== "" && synWeapon2 !== "" && synWeapon1 !== synWeapon2;
  const canSynthesize = bothSelected && effectiveTarget && displayStamina >= 13;

  // 過濾掉另一把已選的武器
  const weapons1 = weapons.filter((w) => String(w.index) !== synWeapon2);
  const weapons2 = weapons.filter((w) => String(w.index) !== synWeapon1);

  return (
    <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border)" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>武器合成</h3>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        融合兩把武器的素質，產出一把 +0 新武器。強化歸零但基礎數值更強。
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", minWidth: "4rem" }}>武器 1：</span>
          <WeaponSelect
            weapons={weapons1}
            value={synWeapon1}
            onChange={(e) => { setSynWeapon1(e.target.value); setSynTargetType(""); }}
            placeholder="— 選擇武器 —"
            showName
            showType
            showDur
          />
        </div>
        <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", minWidth: "4rem" }}>武器 2：</span>
          <WeaponSelect
            weapons={weapons2}
            value={synWeapon2}
            onChange={(e) => { setSynWeapon2(e.target.value); setSynTargetType(""); }}
            placeholder="— 選擇武器 —"
            showName
            showType
            showDur
          />
        </div>

        {bothSelected && typeOptions.length > 1 && (
          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", minWidth: "4rem" }}>類型：</span>
            <select
              value={effectiveTarget}
              onChange={(e) => setSynTargetType(e.target.value)}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
        )}

        {bothSelected && w1 && w2 && (
          <div style={{
            fontSize: "0.75rem",
            padding: "0.4rem 0.6rem",
            background: "var(--bg-hover)",
            borderRadius: "6px",
            border: "1px solid var(--border)",
          }}>
            <div style={{ marginBottom: "0.2rem", fontWeight: 600 }}>合成預覽</div>
            <div>素材 1：ATK {w1.atk} / DEF {w1.def} / AGI {w1.agi} / HP {w1.hp || 0} / CRI {w1.cri} (+{w1.buff || 0})</div>
            <div>素材 2：ATK {w2.atk} / DEF {w2.def} / AGI {w2.agi} / HP {w2.hp || 0} / CRI {w2.cri} (+{w2.buff || 0})</div>
            <div style={{ color: "#a855f7", marginTop: "0.2rem" }}>
              合成世代：第 {Math.max(w1.fusionGen || 0, w2.fusionGen || 0) + 1} 代
              {" | "}目標類型：{TYPE_LABELS[effectiveTarget] || effectiveTarget}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          className="btn-warning"
          disabled={isDisabled || !canSynthesize}
          onClick={async () => {
            const data = await doAction("synthesize", {
              weaponIndex1: synWeapon1,
              weaponIndex2: synWeapon2,
              targetType: effectiveTarget,
            });
            if (!data.error) {
              setSynWeapon1("");
              setSynWeapon2("");
              setSynTargetType("");
            }
          }}
        >
          合成
        </button>
        {synWeapon1 === synWeapon2 && synWeapon1 !== "" && (
          <span style={{ fontSize: "0.75rem", color: "#f87171" }}>不能選擇同一把武器</span>
        )}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
        消耗體力：13～18 點
        {displayStamina < 13 && <span style={{ color: "#f87171", marginLeft: "0.4rem" }}>體力不足！</span>}
      </div>
    </div>
  );
}
