import { useState, useEffect, useMemo } from "react";

const CATEGORY_LABELS = {
  SYSTEM: "系統訊息",
  MINE: "挖礦",
  FORGE: "鍛造",
  UPGRADE: "強化",
  ADVENTURE: "NPC 冒險",
  SOLO_ADV: "獨自出擊",
  PVP: "PvP 決鬥",
  BOSS: "Boss 戰",
  REPAIR: "修復",
  NPC: "NPC 管理",
  STAMINA: "體力",
  ECONOMY: "經濟系統",
  EVENTS: "隨機事件",
};

export default function TextEditor() {
  const [texts, setTexts] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editPath, setEditPath] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [txtRes, defRes, ovrRes] = await Promise.all([
        fetch("/api/admin/texts", { credentials: "include" }),
        fetch("/api/admin/texts/defaults", { credentials: "include" }),
        fetch("/api/admin/texts/overrides", { credentials: "include" }),
      ]);
      const [txtData, defData, ovrData] = await Promise.all([
        txtRes.json(),
        defRes.json(),
        ovrRes.json(),
      ]);
      setTexts(txtData.texts);
      setDefaults(defData.defaults);
      setOverrides(ovrData.overrides || {});
      if (!activeTab && txtData.texts) {
        setActiveTab(Object.keys(txtData.texts)[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(path) {
    setMsg("");
    try {
      const res = await fetch("/api/admin/texts/overrides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ path, value: editValue }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg(`已更新: ${path}`);
      setEditPath(null);
      loadAll();
    } catch {
      setMsg("儲存失敗");
    }
  }

  async function handleReset(path) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/texts/overrides/${path}`, {
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
    } catch {
      setMsg("還原失敗");
    }
  }

  async function handleResetAll() {
    if (!confirm("確定要還原所有文字為預設值？")) return;
    try {
      await fetch("/api/admin/texts/reset-all", {
        method: "POST",
        credentials: "include",
      });
      setMsg("已還原所有文字");
      loadAll();
    } catch {
      setMsg("還原失敗");
    }
  }

  // 篩選：搜尋 key 或 value
  const filteredEntries = useMemo(() => {
    if (!texts || !activeTab || !texts[activeTab]) return [];
    const entries = Object.entries(texts[activeTab]);
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      ([key, val]) =>
        key.toLowerCase().includes(q) ||
        String(val).toLowerCase().includes(q),
    );
  }, [texts, activeTab, search]);

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;
  if (!texts || !defaults) return <div style={{ color: "#e94560" }}>無法載入文字資料</div>;

  const categories = Object.keys(defaults);
  const overrideCount = Object.keys(overrides).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: "#e94560", margin: 0 }}>遊戲文字</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {overrideCount > 0 && (
            <span style={{ fontSize: 12, color: "#ff9800" }}>
              {overrideCount} 項覆蓋
            </span>
          )}
          <button onClick={handleResetAll} style={styles.resetAllBtn}>全部還原預設</button>
        </div>
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

      {/* 搜尋 */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="搜尋 key 或文字內容..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {categories.map((cat) => {
          const hasOverride = Object.keys(overrides).some((k) => k.startsWith(cat + "."));
          return (
            <button
              key={cat}
              onClick={() => { setActiveTab(cat); setEditPath(null); }}
              style={{
                ...styles.tab,
                ...(activeTab === cat ? styles.tabActive : {}),
              }}
            >
              {CATEGORY_LABELS[cat] || cat}
              {hasOverride && <span style={styles.tabDot} />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={styles.card}>
        {filteredEntries.length === 0 ? (
          <div style={{ color: "#666", padding: 16, textAlign: "center" }}>
            {search ? "找不到符合的文字" : "此分類沒有文字"}
          </div>
        ) : (
          filteredEntries.map(([key, val]) => {
            const fullPath = `${activeTab}.${key}`;
            const isOverridden = fullPath in overrides;
            const defVal = defaults[activeTab]?.[key];
            const isEditing = editPath === fullPath;

            return (
              <div key={fullPath} style={styles.row}>
                <div style={styles.keyRow}>
                  <span style={styles.keyName}>{key}</span>
                  {isOverridden && <span style={styles.overrideBadge}>已覆蓋</span>}
                  {isOverridden && (
                    <button onClick={() => handleReset(fullPath)} style={styles.resetBtn}>還原</button>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ marginTop: 4 }}>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={styles.textarea}
                      rows={Math.max(2, editValue.split("\n").length + 1)}
                      autoFocus
                    />
                    <TemplateVarHint text={editValue} />
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button onClick={() => handleSave(fullPath)} style={styles.saveBtn}>儲存</button>
                      <button onClick={() => setEditPath(null)} style={styles.cancelBtn}>取消</button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.valueText,
                      color: isOverridden ? "#ff9800" : "#ddd",
                      cursor: "pointer",
                    }}
                    onClick={() => { setEditPath(fullPath); setEditValue(String(val)); }}
                  >
                    <HighlightedText text={String(val)} />
                    {isOverridden && defVal !== undefined && (
                      <div style={styles.defaultHint}>
                        預設: {String(defVal)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** 高亮顯示 {placeholder} 模板變數 */
function HighlightedText({ text }) {
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <span key={i} style={styles.templateVar}>{part}</span>
        ) : (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
        ),
      )}
    </span>
  );
}

/** 編輯區顯示可用模板變數提示 */
function TemplateVarHint({ text }) {
  const vars = [...new Set((text.match(/\{(\w+)\}/g) || []))];
  if (vars.length === 0) return null;
  return (
    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
      模板變數: {vars.map((v, i) => (
        <span key={i} style={{ ...styles.templateVar, fontSize: 11, marginRight: 4 }}>{v}</span>
      ))}
    </div>
  );
}

const styles = {
  searchInput: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#16213e",
    color: "#eee",
    fontSize: 13,
    boxSizing: "border-box",
  },
  tabBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tab: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    fontSize: 12,
    cursor: "pointer",
    position: "relative",
  },
  tabActive: {
    background: "#0f3460",
    color: "#fff",
    borderColor: "#e94560",
  },
  tabDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#ff9800",
  },
  card: {
    background: "#16213e",
    borderRadius: 8,
    border: "1px solid #0f3460",
    padding: "8px 0",
  },
  row: {
    padding: "10px 16px",
    borderBottom: "1px solid #0f3460",
  },
  keyRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  keyName: {
    fontSize: 12,
    color: "#a0a0b0",
    fontFamily: "monospace",
  },
  overrideBadge: {
    fontSize: 10,
    color: "#ff9800",
    border: "1px solid #ff9800",
    borderRadius: 3,
    padding: "1px 4px",
  },
  valueText: {
    fontSize: 13,
    lineHeight: 1.5,
  },
  defaultHint: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  templateVar: {
    background: "#2a1a4e",
    color: "#c084fc",
    padding: "1px 4px",
    borderRadius: 3,
    fontSize: 12,
    fontFamily: "monospace",
  },
  textarea: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
    fontFamily: "inherit",
    lineHeight: 1.5,
    resize: "vertical",
    boxSizing: "border-box",
  },
  saveBtn: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "none",
    background: "#4caf50",
    color: "#fff",
    fontSize: 12,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #666",
    background: "transparent",
    color: "#aaa",
    fontSize: 12,
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
    marginBottom: 12,
    padding: "8px 12px",
    background: "#0f3460",
    borderRadius: 6,
    color: "#eee",
    fontSize: 13,
  },
};
