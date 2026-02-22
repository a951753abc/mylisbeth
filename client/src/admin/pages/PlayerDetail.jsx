import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminNpcCard from "../components/AdminNpcCard.jsx";

export default function PlayerDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Col 修改
  const [colOp, setColOp] = useState("add");
  const [colAmount, setColAmount] = useState("");

  // 素材新增
  const [newItem, setNewItem] = useState({ itemId: "", itemName: "", itemLevel: 1, delta: 1 });

  // 武器新增
  const [newWeapon, setNewWeapon] = useState({
    weaponName: "", name: "", atk: 0, def: 0, agi: 0, cri: 10, hp: 0, durability: 100,
  });

  // 聖遺物新增
  const [newRelic, setNewRelic] = useState({ id: "", name: "", nameCn: "", bossFloor: 1, effects: "" });

  // 技能定義（Admin NPC 用）
  const [skillDefs, setSkillDefs] = useState([]);
  const [weaponTypeDefs, setWeaponTypeDefs] = useState([]);

  // 展開/折疊區塊
  const [sections, setSections] = useState({ items: true, weapons: true, relics: true, npcs: true });

  const fetchPlayer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${userId}`, { credentials: "include" });
      const data = await res.json();
      setPlayer(data.player || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  useEffect(() => {
    fetch("/api/admin/players/skill-definitions", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setSkillDefs(data.skills || []);
        setWeaponTypeDefs(data.weaponTypes || []);
      })
      .catch(() => {});
  }, []);

  function toggleSection(key) {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Col ──
  async function handleColChange(e) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/col`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ operation: colOp, amount: parseInt(colAmount) }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg(`Col 已更新為 ${data.col}`);
      setColAmount("");
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  // ── Reset ──
  async function handleReset(field) {
    if (!confirm(`確定要重設 ${field}？`)) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/reset`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fields: [field] }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg(`已重設: ${data.resetFields.join(", ")}`);
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  // ── Delete Player ──
  async function handleDelete() {
    if (!confirm(`確定要刪除玩家 ${player.name}？此操作無法復原！`)) return;
    try {
      const res = await fetch(`/api/admin/players/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) navigate("/admin/players");
    } catch (err) {
      setMsg("刪除失敗");
    }
  }

  // ── Items CRUD ──
  async function handleItemDelta(item, delta) {
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemId: item.itemId,
          itemLevel: item.itemLevel,
          itemName: item.itemName,
          delta,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  async function handleAddItem(e) {
    e.preventDefault();
    setMsg("");
    if (!newItem.itemId) { setMsg("請輸入物品 ID"); return; }
    try {
      const res = await fetch(`/api/admin/players/${userId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          itemId: newItem.itemId,
          itemLevel: parseInt(newItem.itemLevel) || 1,
          itemName: newItem.itemName || newItem.itemId,
          delta: parseInt(newItem.delta) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("素材已新增");
      setNewItem({ itemId: "", itemName: "", itemLevel: 1, delta: 1 });
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  // ── Weapons CRUD ──
  async function handleRemoveWeapon(index) {
    if (!confirm("確定要移除此武器？")) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/weapons/${index}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("武器已移除");
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  async function handleAddWeapon(e) {
    e.preventDefault();
    setMsg("");
    if (!newWeapon.weaponName) { setMsg("請輸入武器名"); return; }
    try {
      const res = await fetch(`/api/admin/players/${userId}/weapons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newWeapon),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("武器已新增");
      setNewWeapon({ weaponName: "", name: "", atk: 0, def: 0, agi: 0, cri: 10, hp: 0, durability: 100 });
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  // ── Relics CRUD ──
  async function handleRemoveRelic(relicId) {
    if (!confirm("確定要移除此聖遺物？")) return;
    setMsg("");
    try {
      const res = await fetch(`/api/admin/players/${userId}/relics/${relicId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("聖遺物已移除");
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  async function handleAddRelic(e) {
    e.preventDefault();
    setMsg("");
    if (!newRelic.id || !newRelic.name) { setMsg("請輸入聖遺物 ID 和名稱"); return; }
    let effects = {};
    if (newRelic.effects) {
      try {
        effects = JSON.parse(newRelic.effects);
      } catch {
        setMsg("effects 必須是有效的 JSON（例如 {\"battleAtk\": 0.05}）");
        return;
      }
    }
    try {
      const res = await fetch(`/api/admin/players/${userId}/relics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: newRelic.id,
          name: newRelic.name,
          nameCn: newRelic.nameCn || newRelic.name,
          bossFloor: parseInt(newRelic.bossFloor) || 1,
          effects,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error); return; }
      setMsg("聖遺物已新增");
      setNewRelic({ id: "", name: "", nameCn: "", bossFloor: 1, effects: "" });
      fetchPlayer();
    } catch (err) {
      setMsg("操作失敗");
    }
  }

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;
  if (!player) return <div style={{ color: "#e94560" }}>找不到玩家</div>;

  const items = (player.itemStock || []).filter((it) => it && it.itemNum > 0);
  const weapons = player.weaponStock || [];
  const relics = player.bossRelics || [];
  const npcs = player.hiredNpcs || [];

  return (
    <div>
      <button onClick={() => navigate("/admin/players")} style={styles.backBtn}>
        &larr; 返回列表
      </button>

      <h2 style={styles.title}>
        {player.name}
        {player.title && <span style={{ color: "#e94560", fontSize: 16, marginLeft: 8 }}>[{player.title}]</span>}
      </h2>

      <div style={styles.infoGrid}>
        <InfoItem label="User ID" value={player.userId} />
        <InfoItem label="Col" value={(player.col || 0).toLocaleString()} />
        <InfoItem label="樓層" value={`${player.currentFloor}F`} />
        <InfoItem label="鍛造 Lv" value={player.forgeLevel} />
        <InfoItem label="採礦 Lv" value={player.mineLevel} />
        <InfoItem label="冒險 Lv" value={player.adventureLevel || 1} />
        <InfoItem label="戰鬥 Lv" value={player.battleLevel || 1} />
        <InfoItem label="體力" value={`${player.stamina ?? 100} / ${player.maxStamina ?? 100}`} />
        <InfoItem label="負債" value={player.isInDebt ? `${player.debt} Col (${player.debtCycleCount}/3)` : "無"} />
        <InfoItem label="武器數" value={weapons.length} />
        <InfoItem label="NPC 數" value={player.hiredNpcs?.length || 0} />
        <InfoItem label="營業狀態" value={player.businessPaused ? "暫停中" : "營業中"} />
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

      {/* ═══════ 素材庫 ═══════ */}
      <h3 style={styles.sectionHeader} onClick={() => toggleSection("items")}>
        {sections.items ? "▼" : "▶"} 素材庫（{items.length}）
      </h3>
      {sections.items && (
        <div style={styles.sectionBody}>
          {items.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>名稱</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>星級</th>
                  <th style={styles.th}>數量</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={`${item.itemId}-${item.itemLevel}-${idx}`}>
                    <td style={styles.td}>{item.itemName}</td>
                    <td style={{ ...styles.td, color: "#a0a0b0", fontSize: 11 }}>{item.itemId}</td>
                    <td style={styles.td}>{"★".repeat(item.itemLevel)}</td>
                    <td style={styles.td}>{item.itemNum}</td>
                    <td style={styles.td}>
                      <button style={styles.smallBtn} onClick={() => handleItemDelta(item, 1)}>+1</button>
                      <button style={styles.smallBtn} onClick={() => handleItemDelta(item, -1)}>-1</button>
                      <button style={styles.smallBtnDanger} onClick={() => handleItemDelta(item, -item.itemNum)}>移除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#a0a0b0", fontSize: 13 }}>無素材</div>
          )}
          <form onSubmit={handleAddItem} style={styles.addForm}>
            <input
              placeholder="itemId"
              value={newItem.itemId}
              onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
              style={{ ...styles.input, width: 140 }}
            />
            <input
              placeholder="名稱"
              value={newItem.itemName}
              onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
              style={{ ...styles.input, width: 100 }}
            />
            <input
              type="number" min="1" max="5" placeholder="星級"
              value={newItem.itemLevel}
              onChange={(e) => setNewItem({ ...newItem, itemLevel: e.target.value })}
              style={{ ...styles.input, width: 50 }}
            />
            <input
              type="number" min="1" placeholder="數量"
              value={newItem.delta}
              onChange={(e) => setNewItem({ ...newItem, delta: e.target.value })}
              style={{ ...styles.input, width: 50 }}
            />
            <button type="submit" style={styles.btn}>新增素材</button>
          </form>
        </div>
      )}

      {/* ═══════ 武器庫 ═══════ */}
      <h3 style={styles.sectionHeader} onClick={() => toggleSection("weapons")}>
        {sections.weapons ? "▼" : "▶"} 武器庫（{weapons.length}）
      </h3>
      {sections.weapons && (
        <div style={styles.sectionBody}>
          {weapons.length > 0 ? (
            <div style={styles.weaponGrid}>
              {weapons.map((w, idx) => w && (
                <div key={idx} style={styles.weaponCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ color: w.rarityColor || "#eee", fontWeight: "bold", fontSize: 14 }}>
                        {w.name || w.weaponName}
                      </span>
                      {w.buff > 0 && <span style={{ color: "#ff9800", marginLeft: 4 }}>+{w.buff}</span>}
                      <span style={{ color: "#a0a0b0", fontSize: 11, marginLeft: 8 }}>
                        ({w.weaponName}) [{w.rarityLabel || "?"}]
                      </span>
                    </div>
                    <button style={styles.smallBtnDanger} onClick={() => handleRemoveWeapon(idx)}>刪除</button>
                  </div>
                  <div style={styles.statRow}>
                    <StatBadge label="ATK" value={w.atk} />
                    <StatBadge label="DEF" value={w.def} />
                    <StatBadge label="AGI" value={w.agi} />
                    <StatBadge label="CRI" value={w.cri} />
                    <StatBadge label="HP" value={w.hp} />
                    <StatBadge label="DUR" value={w.durability} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "#a0a0b0", fontSize: 13 }}>無武器</div>
          )}
          <form onSubmit={handleAddWeapon} style={styles.addForm}>
            <input
              placeholder="武器名 (weaponName)"
              value={newWeapon.weaponName}
              onChange={(e) => setNewWeapon({ ...newWeapon, weaponName: e.target.value })}
              style={{ ...styles.input, width: 120 }}
            />
            <input
              placeholder="顯示名 (name)"
              value={newWeapon.name}
              onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
              style={{ ...styles.input, width: 100 }}
            />
            {["atk", "def", "agi", "hp"].map((stat) => (
              <input
                key={stat} type="number" placeholder={stat.toUpperCase()}
                value={newWeapon[stat]}
                onChange={(e) => setNewWeapon({ ...newWeapon, [stat]: e.target.value })}
                style={{ ...styles.input, width: 50 }}
              />
            ))}
            <input
              type="number" placeholder="CRI"
              value={newWeapon.cri}
              onChange={(e) => setNewWeapon({ ...newWeapon, cri: e.target.value })}
              style={{ ...styles.input, width: 50 }}
            />
            <input
              type="number" placeholder="耐久"
              value={newWeapon.durability}
              onChange={(e) => setNewWeapon({ ...newWeapon, durability: e.target.value })}
              style={{ ...styles.input, width: 50 }}
            />
            <button type="submit" style={styles.btn}>新增武器</button>
          </form>
        </div>
      )}

      {/* ═══════ 聖遺物 ═══════ */}
      <h3 style={styles.sectionHeader} onClick={() => toggleSection("relics")}>
        {sections.relics ? "▼" : "▶"} 聖遺物（{relics.length}）
      </h3>
      {sections.relics && (
        <div style={styles.sectionBody}>
          {relics.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>名稱</th>
                  <th style={styles.th}>中文名</th>
                  <th style={styles.th}>Boss 樓層</th>
                  <th style={styles.th}>效果</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {relics.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...styles.td, color: "#a0a0b0", fontSize: 11 }}>{r.id}</td>
                    <td style={styles.td}>{r.name}</td>
                    <td style={styles.td}>{r.nameCn}</td>
                    <td style={styles.td}>{r.bossFloor}F</td>
                    <td style={{ ...styles.td, fontSize: 11, color: "#ff9800" }}>
                      {Object.entries(r.effects || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "-"}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.smallBtnDanger} onClick={() => handleRemoveRelic(r.id)}>移除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: "#a0a0b0", fontSize: 13 }}>無聖遺物</div>
          )}
          <form onSubmit={handleAddRelic} style={styles.addForm}>
            <input
              placeholder="relicId"
              value={newRelic.id}
              onChange={(e) => setNewRelic({ ...newRelic, id: e.target.value })}
              style={{ ...styles.input, width: 120 }}
            />
            <input
              placeholder="name"
              value={newRelic.name}
              onChange={(e) => setNewRelic({ ...newRelic, name: e.target.value })}
              style={{ ...styles.input, width: 100 }}
            />
            <input
              placeholder="中文名"
              value={newRelic.nameCn}
              onChange={(e) => setNewRelic({ ...newRelic, nameCn: e.target.value })}
              style={{ ...styles.input, width: 100 }}
            />
            <input
              type="number" min="1" placeholder="樓層"
              value={newRelic.bossFloor}
              onChange={(e) => setNewRelic({ ...newRelic, bossFloor: e.target.value })}
              style={{ ...styles.input, width: 50 }}
            />
            <input
              placeholder='effects JSON'
              value={newRelic.effects}
              onChange={(e) => setNewRelic({ ...newRelic, effects: e.target.value })}
              style={{ ...styles.input, width: 180 }}
            />
            <button type="submit" style={styles.btn}>新增聖遺物</button>
          </form>
        </div>
      )}

      {/* ═══════ NPC ═══════ */}
      <h3 style={styles.sectionHeader} onClick={() => toggleSection("npcs")}>
        {sections.npcs ? "▼" : "▶"} 雇用 NPC（{npcs.length}）
      </h3>
      {sections.npcs && (
        <div style={styles.sectionBody}>
          {npcs.length > 0 ? (
            <div style={styles.weaponGrid}>
              {npcs.map((npc) => (
                <AdminNpcCard
                  key={npc.npcId}
                  npc={npc}
                  weapons={weapons}
                  userId={userId}
                  skillDefs={skillDefs}
                  weaponTypes={weaponTypeDefs}
                  onRefresh={fetchPlayer}
                  setMsg={setMsg}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: "#a0a0b0", fontSize: 13 }}>無雇用 NPC</div>
          )}
        </div>
      )}

      {/* ═══════ Col 管理 ═══════ */}
      <h3 style={styles.section}>Col 管理</h3>
      <form onSubmit={handleColChange} style={styles.form}>
        <select value={colOp} onChange={(e) => setColOp(e.target.value)} style={styles.select}>
          <option value="add">增加</option>
          <option value="subtract">扣除</option>
          <option value="set">設定為</option>
        </select>
        <input
          type="number"
          value={colAmount}
          onChange={(e) => setColAmount(e.target.value)}
          placeholder="金額"
          style={styles.input}
        />
        <button type="submit" style={styles.btn}>執行</button>
      </form>

      <h3 style={styles.section}>快速重設</h3>
      <div style={styles.resetGrid}>
        <button onClick={() => handleReset("debt")} style={styles.resetBtn}>清除負債</button>
        <button onClick={() => handleReset("stamina")} style={styles.resetBtn}>回滿體力</button>
        <button onClick={() => handleReset("cooldown")} style={styles.resetBtn}>清除冷卻</button>
        <button onClick={() => handleReset("businessPaused")} style={styles.resetBtn}>取消暫停</button>
      </div>

      <h3 style={{ ...styles.section, color: "#e94560" }}>危險操作</h3>
      <button onClick={handleDelete} style={styles.deleteBtn}>刪除玩家</button>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span style={{ color: "#a0a0b0", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#eee", fontSize: 14 }}>{value}</span>
    </div>
  );
}

function StatBadge({ label, value }) {
  return (
    <span style={styles.statBadge}>
      <span style={{ color: "#a0a0b0", fontSize: 10 }}>{label}</span>
      <span style={{ color: "#eee", fontSize: 12 }}>{value}</span>
    </span>
  );
}

const styles = {
  title: { color: "#fff", marginTop: 0, marginBottom: 20 },
  backBtn: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    fontSize: 13,
    cursor: "pointer",
    marginBottom: 16,
  },
  section: { color: "#ddd", fontSize: 15, marginTop: 24, marginBottom: 12 },
  sectionHeader: {
    color: "#ddd",
    fontSize: 15,
    marginTop: 24,
    marginBottom: 0,
    cursor: "pointer",
    userSelect: "none",
    padding: "8px 0",
  },
  sectionBody: {
    background: "#16213e",
    borderRadius: 8,
    padding: 16,
    border: "1px solid #0f3460",
    marginBottom: 4,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
    background: "#16213e",
    borderRadius: 8,
    padding: 16,
    border: "1px solid #0f3460",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  msg: {
    marginTop: 12,
    padding: "8px 12px",
    background: "#0f3460",
    borderRadius: 6,
    color: "#eee",
    fontSize: 13,
  },
  form: { display: "flex", gap: 8 },
  addForm: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, alignItems: "center" },
  select: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
  },
  input: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
    width: 120,
  },
  btn: {
    padding: "6px 16px",
    borderRadius: 6,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  resetGrid: { display: "flex", gap: 8, flexWrap: "wrap" },
  resetBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#16213e",
    color: "#ddd",
    fontSize: 13,
    cursor: "pointer",
  },
  deleteBtn: {
    padding: "8px 20px",
    borderRadius: 6,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    fontSize: 13,
    cursor: "pointer",
  },
  // 表格樣式
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "6px 8px",
    borderBottom: "1px solid #0f3460",
    color: "#a0a0b0",
    fontSize: 12,
    fontWeight: "normal",
  },
  td: {
    padding: "6px 8px",
    borderBottom: "1px solid rgba(15,52,96,0.5)",
    color: "#eee",
  },
  smallBtn: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#ddd",
    fontSize: 11,
    cursor: "pointer",
    marginRight: 4,
  },
  smallBtnDanger: {
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    fontSize: 11,
    cursor: "pointer",
  },
  // 武器卡片
  weaponGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  weaponCard: {
    background: "#1a1a2e",
    borderRadius: 6,
    padding: "8px 12px",
    border: "1px solid #0f3460",
  },
  statRow: {
    display: "flex",
    gap: 8,
    marginTop: 6,
  },
  statBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#16213e",
    borderRadius: 4,
    padding: "2px 8px",
    minWidth: 36,
  },
};
