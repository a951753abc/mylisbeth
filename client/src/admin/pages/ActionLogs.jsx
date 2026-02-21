import { useState, useEffect, useCallback } from "react";

const ACTION_LABELS = {
  mine: "採礦",
  forge: "鍛造",
  up: "強化",
  adv: "冒險",
  pvp: "PvP",
  pvpNpc: "NPC 決鬥",
  repair: "修復",
  soloAdv: "獨自冒險",
  boss: "Boss 攻擊",
  daily: "每日獎勵",
  sell_item: "出售素材",
  sell_weapon: "出售武器",
  "npc:hire": "雇用 NPC",
  "npc:fire": "解雇 NPC",
  "npc:heal": "治療 NPC",
  "npc:mission": "派遣任務",
  "market:list_item": "掛賣素材",
  "market:list_weapon": "掛賣武器",
  "market:buy": "購買",
  "admin:modify_col": "GM:修改 Col",
  "admin:modify_item": "GM:修改物品",
  "admin:reset_fields": "GM:重設狀態",
  "admin:delete_player": "GM:刪除玩家",
  "admin:config_override": "GM:修改設定",
  "admin:config_reset": "GM:還原設定",
  "admin:config_reset_all": "GM:全部還原",
};

export default function ActionLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (userId) params.set("userId", userId);
      if (action) params.set("action", action);
      const res = await fetch(`/api/admin/logs?${params}`, { credentials: "include" });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, userId, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 style={styles.title}>操作日誌</h2>

      <form onSubmit={handleFilter} style={styles.filterBar}>
        <input
          type="text"
          placeholder="玩家 ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={styles.input}
        />
        <select value={action} onChange={(e) => setAction(e.target.value)} style={styles.select}>
          <option value="">全部動作</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" style={styles.btn}>篩選</button>
      </form>

      <div style={{ fontSize: 13, color: "#a0a0b0", marginBottom: 12 }}>
        共 {total} 筆紀錄
      </div>

      {loading ? (
        <div style={{ color: "#a0a0b0" }}>載入中...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>時間</th>
              <th style={styles.th}>玩家</th>
              <th style={styles.th}>動作</th>
              <th style={styles.th}>狀態</th>
              <th style={styles.th}>詳情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  {new Date(log.timestamp).toLocaleString("zh-TW")}
                </td>
                <td style={styles.td}>{log.playerName || log.userId}</td>
                <td style={styles.td}>
                  {ACTION_LABELS[log.action] || log.action}
                </td>
                <td style={{
                  ...styles.td,
                  color: log.success ? "#4caf50" : "#e94560",
                }}>
                  {log.success ? "成功" : "失敗"}
                </td>
                <td style={{ ...styles.td, fontSize: 11, color: "#888", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {log.error || JSON.stringify(log.details).slice(0, 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={styles.pageBtn}
          >
            上一頁
          </button>
          <span style={{ color: "#a0a0b0", fontSize: 13 }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={styles.pageBtn}
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { color: "#e94560", marginTop: 0, marginBottom: 20 },
  filterBar: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
    width: 160,
    outline: "none",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 13,
  },
  btn: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#16213e",
    borderRadius: 8,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 12,
    color: "#a0a0b0",
    borderBottom: "1px solid #0f3460",
  },
  td: {
    padding: "6px 12px",
    fontSize: 13,
    color: "#ddd",
    borderBottom: "1px solid #0f3460",
    whiteSpace: "nowrap",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    padding: "6px 14px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#a0a0b0",
    cursor: "pointer",
    fontSize: 13,
  },
};
