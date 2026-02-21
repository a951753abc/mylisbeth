import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const limit = 20;

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/players?${params}`, { credentials: "include" });
      const data = await res.json();
      setPlayers(data.players || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPlayers();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <h2 style={styles.title}>玩家管理</h2>

      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input
          type="text"
          placeholder="搜尋玩家名稱或 ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.btn}>搜尋</button>
      </form>

      <div style={{ fontSize: 13, color: "#a0a0b0", marginBottom: 12 }}>
        共 {total} 位玩家
      </div>

      {loading ? (
        <div style={{ color: "#a0a0b0" }}>載入中...</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>名稱</th>
              <th style={styles.th}>樓層</th>
              <th style={styles.th}>Col</th>
              <th style={styles.th}>鍛造 Lv</th>
              <th style={styles.th}>戰鬥 Lv</th>
              <th style={styles.th}>狀態</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.userId}
                style={styles.row}
                onClick={() => navigate(`/admin/players/${p.userId}`)}
              >
                <td style={styles.td}>
                  <span style={{ color: "#fff" }}>{p.name}</span>
                  {p.title && <span style={{ color: "#e94560", fontSize: 11, marginLeft: 6 }}>[{p.title}]</span>}
                </td>
                <td style={styles.td}>{p.currentFloor}F</td>
                <td style={styles.td}>{(p.col || 0).toLocaleString()}</td>
                <td style={styles.td}>{p.forgeLevel}</td>
                <td style={styles.td}>{p.battleLevel || 1}</td>
                <td style={styles.td}>
                  {p.isInDebt && <span style={{ color: "#ff9800", fontSize: 11 }}>負債 </span>}
                  {p.businessPaused && <span style={{ color: "#9e9e9e", fontSize: 11 }}>暫停 </span>}
                  {!p.isInDebt && !p.businessPaused && <span style={{ color: "#4caf50", fontSize: 11 }}>正常</span>}
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
  searchBar: { display: "flex", gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 14,
    outline: "none",
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
    padding: "8px 12px",
    fontSize: 13,
    color: "#ddd",
    borderBottom: "1px solid #0f3460",
  },
  row: { cursor: "pointer", transition: "background 0.15s" },
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
