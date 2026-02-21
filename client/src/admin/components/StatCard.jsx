export default function StatCard({ label, value, sub }) {
  return (
    <div style={styles.card}>
      <div style={styles.value}>{value ?? "-"}</div>
      <div style={styles.label}>{label}</div>
      {sub && <div style={styles.sub}>{sub}</div>}
    </div>
  );
}

const styles = {
  card: {
    background: "#16213e",
    borderRadius: 8,
    padding: "20px 24px",
    border: "1px solid #0f3460",
    minWidth: 140,
    textAlign: "center",
  },
  value: {
    fontSize: 28,
    fontWeight: 700,
    color: "#e94560",
  },
  label: {
    fontSize: 13,
    color: "#a0a0b0",
    marginTop: 4,
  },
  sub: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
};
