import { useState, useEffect, useCallback } from "react";

const WEAPON_TYPE_NAMES = {
  dagger: "短劍",
  rapier: "細劍",
  one_handed_sword: "單手劍",
  two_handed_sword: "雙手劍",
  curved_sword: "彎刀",
  katana: "刀",
};

const ROLE_COLORS = {
  "首領": "#e94560",
  "副首領": "#f97316",
  "毒師": "#a855f7",
  "精銳": "#3b82f6",
};

export default function LaughingCoffin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lc", { credentials: "include" });
      const json = await res.json();
      setData(json);
    } catch {
      setMsg("載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (url, body = {}) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setMsg(json.message || json.error || "完成");
      await fetchData();
    } catch {
      setMsg("操作失敗");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;

  return (
    <div>
      <h2 style={styles.title}>微笑棺木公會</h2>
      {msg && <div style={styles.msg}>{msg}</div>}

      {!data?.initialized ? (
        <NotInitialized onInit={(floor) => doAction("/api/admin/lc/initialize", { floor })} busy={busy} />
      ) : (
        <>
          <StatusSection data={data} busy={busy} doAction={doAction} />
          <MembersSection members={data.members} busy={busy} doAction={doAction} />
          <LootSection lootPool={data.lootPool} busy={busy} doAction={doAction} />
          <ConfigSection config={data.config} />
        </>
      )}
    </div>
  );
}

function NotInitialized({ onInit, busy }) {
  const [floor, setFloor] = useState(11);
  return (
    <div style={styles.card}>
      <p style={{ color: "#a0a0b0" }}>微笑棺木公會尚未初始化。</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <label style={{ color: "#ddd", fontSize: 13 }}>當前最高樓層：</label>
        <input
          type="number"
          value={floor}
          onChange={(e) => setFloor(Number(e.target.value))}
          style={styles.input}
          min={1}
        />
        <button onClick={() => onInit(floor)} disabled={busy} style={styles.btnPrimary}>
          初始化公會
        </button>
      </div>
    </div>
  );
}

function StatusSection({ data, busy, doAction }) {
  const [newFloor, setNewFloor] = useState(data.baseFloor || 1);
  const [newGrunts, setNewGrunts] = useState(data.gruntCount || 0);

  const aliveCount = data.members.filter((m) => m.alive).length;
  const deadCount = data.members.filter((m) => !m.alive).length;
  const elapsed = Date.now() - (data.lastFloorChangeAt || 0);
  const nextRotation = Math.max(0, (data.config?.rotationIntervalMs || 3600000) - elapsed);
  const nextRotationMin = Math.ceil(nextRotation / 60000);

  return (
    <div style={styles.card}>
      <h3 style={styles.sectionTitle}>公會狀態</h3>
      <div style={styles.statusGrid}>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>狀態</span>
          <span style={{ color: data.disbanded ? "#4ade80" : data.active ? "#e94560" : "#666" }}>
            {data.disbanded ? "已殲滅" : data.active ? "活躍中" : "未啟動"}
          </span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>據點樓層</span>
          <span style={{ color: "#ddd" }}>{data.baseFloor}F</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>具名成員</span>
          <span>
            <span style={{ color: "#4ade80" }}>{aliveCount} 存活</span>
            {deadCount > 0 && <span style={{ color: "#666" }}> / {deadCount} 死亡</span>}
          </span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>雜魚成員</span>
          <span style={{ color: "#ddd" }}>{data.gruntCount} 人</span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.statusLabel}>下次輪替</span>
          <span style={{ color: "#a0a0b0" }}>{nextRotationMin} 分鐘後</span>
        </div>
      </div>

      <div style={styles.actionRow}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="number" value={newFloor} onChange={(e) => setNewFloor(Number(e.target.value))} style={styles.inputSmall} min={1} />
          <button onClick={() => doAction("/api/admin/lc/set-floor", { floor: newFloor })} disabled={busy} style={styles.btnSmall}>
            設定據點
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="number" value={newGrunts} onChange={(e) => setNewGrunts(Number(e.target.value))} style={styles.inputSmall} min={0} />
          <button onClick={() => doAction("/api/admin/lc/set-grunts", { count: newGrunts })} disabled={busy} style={styles.btnSmall}>
            設定雜魚
          </button>
        </div>
        <button
          onClick={() => { if (window.confirm("確定要重置微笑棺木公會？")) doAction("/api/admin/lc/reset"); }}
          disabled={busy}
          style={styles.btnDanger}
        >
          重置公會
        </button>
      </div>
    </div>
  );
}

function MembersSection({ members, busy, doAction }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.sectionTitle}>成員名冊</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>狀態</th>
            <th style={styles.th}>名稱</th>
            <th style={styles.th}>職務</th>
            <th style={styles.th}>武器</th>
            <th style={styles.th}>劍技</th>
            <th style={styles.th}>擊殺者</th>
            <th style={styles.th}>擊殺時間</th>
            <th style={styles.th}>操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={m.alive ? {} : { opacity: 0.5 }}>
              <td style={styles.td}>
                <span style={{
                  display: "inline-block",
                  width: 8, height: 8, borderRadius: "50%",
                  background: m.alive ? "#4ade80" : "#666",
                }} />
              </td>
              <td style={{ ...styles.td, fontWeight: 600 }}>{m.nameCn}</td>
              <td style={{ ...styles.td, color: ROLE_COLORS[m.role] || "#a0a0b0" }}>{m.role}</td>
              <td style={styles.td}>
                <span style={{ fontSize: 12, color: "#fbbf24" }}>{m.weaponName}</span>
                <span style={{ fontSize: 11, color: "#666", marginLeft: 4 }}>
                  ({WEAPON_TYPE_NAMES[m.weaponType] || m.weaponType})
                </span>
              </td>
              <td style={styles.td}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {(m.skillNames || []).map((name, i) => (
                    <span key={i} style={styles.skillTag}>{name}</span>
                  ))}
                </div>
              </td>
              <td style={{ ...styles.td, fontSize: 12, color: "#a0a0b0" }}>
                {m.killedBy || "-"}
              </td>
              <td style={{ ...styles.td, fontSize: 12, color: "#a0a0b0" }}>
                {m.killedAt ? new Date(m.killedAt).toLocaleString("zh-TW") : "-"}
              </td>
              <td style={styles.td}>
                {!m.alive && (
                  <button
                    onClick={() => doAction(`/api/admin/lc/revive/${m.id}`)}
                    disabled={busy}
                    style={styles.btnTiny}
                  >
                    復活
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LootSection({ lootPool, busy, doAction }) {
  const hasLoot = lootPool.col > 0 || lootPool.materials.length > 0 || lootPool.weapons.length > 0;

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={styles.sectionTitle}>贓物池</h3>
        {hasLoot && (
          <button
            onClick={() => { if (window.confirm("確定清空贓物池？")) doAction("/api/admin/lc/clear-loot"); }}
            disabled={busy}
            style={styles.btnTiny}
          >
            清空
          </button>
        )}
      </div>

      <div style={{ fontSize: 13, color: "#ddd", marginBottom: 8 }}>
        Col: <span style={{ color: "#fbbf24" }}>{(lootPool.col || 0).toLocaleString()}</span>
      </div>

      {lootPool.materials.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#a0a0b0", marginBottom: 4 }}>素材 ({lootPool.materials.length})</div>
          {lootPool.materials.map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: "#4ade80" }}>
              [{m.itemLevel || "?"}] {m.itemName || m.itemId}
            </div>
          ))}
        </div>
      )}

      {lootPool.weapons.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "#a0a0b0", marginBottom: 4 }}>武器 ({lootPool.weapons.length})</div>
          {lootPool.weapons.map((w, i) => (
            <div key={i} style={{ fontSize: 12, color: "#a78bfa" }}>
              {w.weaponName} (ATK {w.atk} / DEF {w.def} / AGI {w.agi})
            </div>
          ))}
        </div>
      )}

      {!hasLoot && (
        <div style={{ fontSize: 12, color: "#666" }}>贓物池為空</div>
      )}
    </div>
  );
}

function ConfigSection({ config }) {
  if (!config) return null;
  return (
    <div style={styles.card}>
      <h3 style={styles.sectionTitle}>設定值</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
        <ConfigItem label="啟動樓層" value={`${config.activationFloor}F`} />
        <ConfigItem label="輪替間隔" value={`${Math.round(config.rotationIntervalMs / 60000)} 分鐘`} />
        <ConfigItem label="襲擊機率" value={`${config.ambushChance}%`} />
        <ConfigItem label="據點發現機率" value={`${config.encounterChance}%`} />
        <ConfigItem label="初始雜魚數" value={config.initialGruntCount} />
      </div>
    </div>
  );
}

function ConfigItem({ label, value }) {
  return (
    <div>
      <span style={{ color: "#a0a0b0" }}>{label}：</span>
      <span style={{ color: "#ddd" }}>{value}</span>
    </div>
  );
}

const styles = {
  title: { color: "#e94560", marginTop: 0, marginBottom: 20 },
  msg: {
    padding: "8px 12px",
    marginBottom: 16,
    borderRadius: 6,
    background: "#16213e",
    border: "1px solid #0f3460",
    color: "#fbbf24",
    fontSize: 13,
  },
  card: {
    background: "#16213e",
    borderRadius: 8,
    padding: "16px 20px",
    border: "1px solid #0f3460",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#ddd",
    fontSize: 15,
    marginTop: 0,
    marginBottom: 12,
  },
  statusGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 16,
  },
  statusItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontSize: 13,
  },
  statusLabel: {
    color: "#a0a0b0",
    fontSize: 11,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 12,
    borderTop: "1px solid #0f3460",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    color: "#a0a0b0",
    fontSize: 11,
    borderBottom: "1px solid #0f3460",
  },
  td: {
    padding: "6px 10px",
    color: "#ddd",
    borderBottom: "1px solid #0f3460",
  },
  skillTag: {
    display: "inline-block",
    padding: "1px 5px",
    borderRadius: 3,
    fontSize: 10,
    background: "rgba(139, 92, 246, 0.15)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    color: "#c4b5fd",
  },
  input: {
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#ddd",
    fontSize: 13,
    width: 60,
  },
  inputSmall: {
    padding: "3px 6px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#ddd",
    fontSize: 12,
    width: 50,
  },
  btnPrimary: {
    padding: "5px 14px",
    borderRadius: 4,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  btnSmall: {
    padding: "3px 10px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "#0f3460",
    color: "#ddd",
    fontSize: 12,
    cursor: "pointer",
  },
  btnDanger: {
    padding: "3px 10px",
    borderRadius: 4,
    border: "1px solid #e94560",
    background: "transparent",
    color: "#e94560",
    fontSize: 12,
    cursor: "pointer",
  },
  btnTiny: {
    padding: "2px 8px",
    borderRadius: 3,
    border: "1px solid #0f3460",
    background: "#0f3460",
    color: "#ddd",
    fontSize: 11,
    cursor: "pointer",
  },
};
