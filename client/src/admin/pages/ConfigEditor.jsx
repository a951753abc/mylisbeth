import { useState, useEffect } from "react";

// config.js 頂層 key 的分類標籤
const CATEGORY_LABELS = {
  MOVE_COOLDOWN: "基礎設定",
  TIME_SCALE: "基礎設定",
  NEWBIE_PROTECTION_DAYS: "基礎設定",
  SETTLEMENT: "結算系統",
  NPC: "NPC 系統",
  ENEMY_PROBABILITY: "敵人機率",
  SEALED_WEAPON: "封印武器",
  BUFF_BASE_CHANCE: "強化系統",
  BUFF_MAX: "強化系統",
  BUFF_FORGE_LEVEL_MULT: "強化系統",
  BUFF_COUNT_PENALTY: "強化系統",
  BUFF_HP_MULTIPLIER: "強化系統",
  WEAPON_DAMAGE_CHANCE: "武器損壞",
  INITIAL_ITEM_LIMIT: "基礎設定",
  INITIAL_WEAPON_LIMIT: "基礎設定",
  DISCARD: "丟棄系統",
  COL_ADVENTURE_REWARD: "經濟 - 獎勵",
  COL_PVP_WIN: "經濟 - 獎勵",
  COL_BOSS_MVP_BONUS: "經濟 - 獎勵",
  COL_BOSS_LA_BONUS: "經濟 - 獎勵",
  BOSS_TIMEOUT_MS: "Boss 系統",
  BOSS_COUNTER: "Boss 系統",
  FLOOR_MAX_EXPLORE: "樓層探索",
  COL_REPAIR_COST: "修復系統",
  REPAIR_SUCCESS_RATE: "修復系統",
  COL_ADVENTURE_FEE_RATE: "經濟 - 費用",
  COL_ADVENTURE_FEE_BASE: "經濟 - 費用",
  COL_ADVENTURE_FEE_PER_FLOOR: "經濟 - 費用",
  FLOOR_MATERIAL_GROUPS: "樓層素材",
  STAMINA: "體力系統",
  RANDOM_EVENTS: "隨機事件",
  BATTLE: "戰鬥系統",
  PVP: "PvP 系統",
  BATTLE_LEVEL: "戰鬥等級",
  ADV_LEVEL: "冒險等級",
  DEATH_CAUSES: "死亡原因",
  SHOP: "商店系統",
  MARKET: "佈告板系統",
  NPC_MISSIONS: "NPC 任務",
  SOLO_ADV: "獨自冒險",
};

export default function ConfigEditor() {
  const [config, setConfig] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editPath, setEditPath] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgRes, defRes, ovrRes] = await Promise.all([
        fetch("/api/admin/config", { credentials: "include" }),
        fetch("/api/admin/config/defaults", { credentials: "include" }),
        fetch("/api/admin/config/overrides", { credentials: "include" }),
      ]);
      const [cfgData, defData, ovrData] = await Promise.all([
        cfgRes.json(),
        defRes.json(),
        ovrRes.json(),
      ]);
      setConfig(cfgData.config);
      setDefaults(defData.defaults);
      setOverrides(ovrData.overrides || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(path) {
    setMsg("");
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }

      const res = await fetch("/api/admin/config/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path, value: parsedValue }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg(`已更新: ${path}`);
      setEditPath(null);
      loadAll();
    } catch (err) {
      setMsg("儲存失敗");
    }
  }

  async function handleReset(path) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/config/overrides/${path}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error);
        return;
      }
      setMsg(`已還原: ${path}`);
      loadAll();
    } catch (err) {
      setMsg("還原失敗");
    }
  }

  async function handleResetAll() {
    if (!confirm("確定要還原所有設定為預設值？")) return;
    try {
      await fetch("/api/admin/config/reset-all", {
        method: "POST",
        credentials: "include",
      });
      setMsg("已還原所有設定");
      loadAll();
    } catch {
      setMsg("還原失敗");
    }
  }

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;
  if (!config || !defaults) return <div style={{ color: "#e94560" }}>無法載入設定</div>;

  // 將 config 按分類分組
  const grouped = {};
  for (const key of Object.keys(defaults)) {
    const cat = CATEGORY_LABELS[key] || "其他";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(key);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#e94560", margin: 0 }}>遊戲設定</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {Object.keys(overrides).length > 0 && (
            <span style={{ fontSize: 12, color: "#ff9800" }}>
              {Object.keys(overrides).length} 項覆蓋
            </span>
          )}
          <button onClick={handleResetAll} style={styles.resetAllBtn}>全部還原預設</button>
        </div>
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

      {Object.entries(grouped).map(([category, keys]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <h3 style={styles.catTitle}>{category}</h3>
          <div style={styles.catCard}>
            {keys.map((key) => {
              const val = config[key];
              const def = defaults[key];
              const isOverridden = key in overrides;
              const isObject = typeof val === "object" && val !== null;

              if (isObject) {
                return (
                  <div key={key} style={styles.fieldGroup}>
                    <div style={styles.fieldLabel}>
                      {key}
                      {isOverridden && <span style={styles.overrideBadge}>已覆蓋</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      (物件) 請使用具體路徑修改，例如: {key}.子屬性
                    </div>
                    {renderObjectFields(key, val, def, overrides, editPath, editValue, setEditPath, setEditValue, handleSave, handleReset)}
                  </div>
                );
              }

              return (
                <div key={key} style={styles.fieldRow}>
                  <div style={styles.fieldLabel}>
                    {key}
                    {isOverridden && <span style={styles.overrideBadge}>已覆蓋</span>}
                  </div>
                  <div style={styles.fieldValue}>
                    {editPath === key ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={styles.editInput}
                          autoFocus
                        />
                        <button onClick={() => handleSave(key)} style={styles.saveBtn}>儲存</button>
                        <button onClick={() => setEditPath(null)} style={styles.cancelBtn}>取消</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span
                          onClick={() => { setEditPath(key); setEditValue(JSON.stringify(val)); }}
                          style={{ cursor: "pointer", color: isOverridden ? "#ff9800" : "#eee" }}
                        >
                          {JSON.stringify(val)}
                        </span>
                        {isOverridden && (
                          <>
                            <span style={{ fontSize: 11, color: "#666" }}>
                              (預設: {JSON.stringify(def)})
                            </span>
                            <button onClick={() => handleReset(key)} style={styles.resetBtn}>還原</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderObjectFields(parentKey, val, def, overrides, editPath, editValue, setEditPath, setEditValue, handleSave, handleReset) {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return null;

  return (
    <div style={{ marginLeft: 16, marginTop: 8 }}>
      {Object.entries(val).map(([subKey, subVal]) => {
        const fullPath = `${parentKey}.${subKey}`;
        const isOverridden = fullPath in overrides;
        const defVal = def?.[subKey];

        if (typeof subVal === "object" && subVal !== null && !Array.isArray(subVal)) {
          return (
            <div key={fullPath} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#a0a0b0", marginBottom: 4 }}>{subKey}:</div>
              {renderObjectFields(fullPath, subVal, defVal, overrides, editPath, editValue, setEditPath, setEditValue, handleSave, handleReset)}
            </div>
          );
        }

        return (
          <div key={fullPath} style={styles.subFieldRow}>
            <span style={{ fontSize: 12, color: "#a0a0b0", minWidth: 160 }}>{subKey}</span>
            {editPath === fullPath ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ ...styles.editInput, width: 100 }}
                  autoFocus
                />
                <button onClick={() => handleSave(fullPath)} style={styles.saveBtn}>儲存</button>
                <button onClick={() => setEditPath(null)} style={styles.cancelBtn}>取消</button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span
                  onClick={() => { setEditPath(fullPath); setEditValue(JSON.stringify(subVal)); }}
                  style={{ cursor: "pointer", fontSize: 13, color: isOverridden ? "#ff9800" : "#ddd" }}
                >
                  {JSON.stringify(subVal)}
                </span>
                {isOverridden && (
                  <button onClick={() => handleReset(fullPath)} style={styles.resetBtn}>還原</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  catTitle: { color: "#ddd", fontSize: 15, marginBottom: 8 },
  catCard: {
    background: "#16213e",
    borderRadius: 8,
    padding: "12px 16px",
    border: "1px solid #0f3460",
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #0f3460",
  },
  fieldGroup: {
    padding: "8px 0",
    borderBottom: "1px solid #0f3460",
  },
  subFieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "3px 0",
  },
  fieldLabel: { fontSize: 13, color: "#a0a0b0" },
  fieldValue: { fontSize: 13 },
  overrideBadge: {
    marginLeft: 6,
    fontSize: 10,
    color: "#ff9800",
    border: "1px solid #ff9800",
    borderRadius: 3,
    padding: "1px 4px",
  },
  editInput: {
    padding: "3px 6px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
    width: 140,
  },
  saveBtn: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "none",
    background: "#4caf50",
    color: "#fff",
    fontSize: 11,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid #666",
    background: "transparent",
    color: "#aaa",
    fontSize: 11,
    cursor: "pointer",
  },
  resetBtn: {
    padding: "1px 6px",
    borderRadius: 3,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    fontSize: 10,
    cursor: "pointer",
  },
  resetAllBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    fontSize: 13,
    cursor: "pointer",
  },
  msg: {
    marginBottom: 16,
    padding: "8px 12px",
    background: "#0f3460",
    borderRadius: 6,
    color: "#eee",
    fontSize: 13,
  },
};
