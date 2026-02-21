import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function PlayerDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Col 修改
  const [colOp, setColOp] = useState("add");
  const [colAmount, setColAmount] = useState("");

  useEffect(() => {
    fetchPlayer();
  }, [userId]);

  async function fetchPlayer() {
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
  }

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

  if (loading) return <div style={{ color: "#a0a0b0" }}>載入中...</div>;
  if (!player) return <div style={{ color: "#e94560" }}>找不到玩家</div>;

  return (
    <div>
      <button onClick={() => navigate("/admin/players")} style={styles.backBtn}>
        ← 返回列表
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
        <InfoItem label="武器數" value={player.weaponStock?.length || 0} />
        <InfoItem label="NPC 數" value={player.hiredNpcs?.length || 0} />
        <InfoItem label="營業狀態" value={player.businessPaused ? "暫停中" : "營業中"} />
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}

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
};
