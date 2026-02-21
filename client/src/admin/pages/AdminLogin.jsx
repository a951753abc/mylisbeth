import { useState } from "react";

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>GM 管理後台</h1>
        <p style={styles.subtitle}>My Lisbeth</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="帳號"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="current-password"
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#1a1a2e",
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: "#16213e",
    borderRadius: 12,
    padding: "40px 36px",
    width: 360,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    border: "1px solid #0f3460",
  },
  title: {
    color: "#e94560",
    textAlign: "center",
    margin: "0 0 4px",
    fontSize: 24,
  },
  subtitle: {
    color: "#a0a0b0",
    textAlign: "center",
    margin: "0 0 28px",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  input: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "1px solid #0f3460",
    background: "#1a1a2e",
    color: "#eee",
    fontSize: 14,
    outline: "none",
  },
  error: {
    color: "#e94560",
    fontSize: 13,
    textAlign: "center",
  },
  button: {
    padding: "10px 0",
    borderRadius: 6,
    border: "none",
    background: "#e94560",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
};
