import { useState, useEffect } from "react";
import useAdminSocket from "../hooks/useAdminSocket.js";
import StatCard from "../components/StatCard.jsx";

export default function Dashboard() {
  const { stats: socketStats } = useAdminSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats", { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 用 socket 推送覆蓋初始值
  const data = socketStats || stats;

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;
  if (!data) return <div style={{ color: "#a0a0b0" }}>無法取得資料</div>;

  const boss = data.boss;
  const bossHpPct = boss?.active
    ? Math.round((boss.currentHp / boss.totalHp) * 100)
    : null;

  return (
    <div>
      <h2 style={styles.title}>儀表板</h2>

      <div style={styles.grid}>
        <StatCard label="線上玩家" value={data.players?.online} />
        <StatCard label="存活玩家" value={data.players?.alive} />
        <StatCard label="死亡紀錄" value={data.players?.dead} />
        <StatCard label="當前樓層" value={`${data.floor?.current}F`} />
      </div>

      <h3 style={styles.section}>經濟概況</h3>
      <div style={styles.grid}>
        <StatCard label="流通 Col 總量" value={data.economy?.totalCol?.toLocaleString()} />
        <StatCard label="平均 Col" value={data.economy?.avgCol?.toLocaleString()} />
        <StatCard label="負債中玩家" value={data.economy?.playersInDebt} />
      </div>

      {boss?.active && (
        <>
          <h3 style={styles.section}>Boss 狀態</h3>
          <div style={styles.bossCard}>
            <div style={styles.bossInfo}>
              <span>{boss.floorNumber}F Boss</span>
              <span style={{ color: "#e94560" }}>
                HP: {boss.currentHp} / {boss.totalHp} ({bossHpPct}%)
              </span>
            </div>
            <div style={styles.hpBarBg}>
              <div style={{ ...styles.hpBarFill, width: `${bossHpPct}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              參戰者: {boss.participants?.length || 0} 人
              {boss.currentWeapon && ` | 武器: ${boss.currentWeapon}`}
            </div>
          </div>
        </>
      )}

      <h3 style={styles.section}>近期活動</h3>
      {data.recentActivity?.length > 0 ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>時間</th>
              <th style={styles.th}>玩家</th>
              <th style={styles.th}>動作</th>
              <th style={styles.th}>狀態</th>
            </tr>
          </thead>
          <tbody>
            {data.recentActivity.map((log, i) => (
              <tr key={i}>
                <td style={styles.td}>
                  {new Date(log.timestamp).toLocaleTimeString("zh-TW")}
                </td>
                <td style={styles.td}>{log.playerName || log.userId}</td>
                <td style={styles.td}>{log.action}</td>
                <td style={{ ...styles.td, color: log.success ? "#4caf50" : "#e94560" }}>
                  {log.success ? "成功" : "失敗"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ color: "#666", fontSize: 13 }}>尚無活動紀錄</div>
      )}
    </div>
  );
}

const styles = {
  title: { color: "#e94560", marginTop: 0, marginBottom: 20 },
  section: { color: "#ddd", fontSize: 16, marginTop: 28, marginBottom: 12 },
  grid: { display: "flex", gap: 16, flexWrap: "wrap" },
  bossCard: {
    background: "#16213e",
    borderRadius: 8,
    padding: "16px 20px",
    border: "1px solid #0f3460",
  },
  bossInfo: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    color: "#ddd",
    marginBottom: 8,
  },
  hpBarBg: {
    width: "100%",
    height: 12,
    background: "#0f3460",
    borderRadius: 6,
    overflow: "hidden",
  },
  hpBarFill: {
    height: "100%",
    background: "#e94560",
    borderRadius: 6,
    transition: "width 0.5s",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#16213e",
    borderRadius: 8,
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 12,
    color: "#a0a0b0",
    borderBottom: "1px solid #0f3460",
  },
  td: {
    padding: "6px 12px",
    fontSize: 13,
    color: "#ddd",
    borderBottom: "1px solid #0f3460",
  },
};
