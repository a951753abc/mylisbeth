import { NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin", label: "儀表板", end: true },
  { to: "/admin/players", label: "玩家管理" },
  { to: "/admin/logs", label: "操作日誌" },
  { to: "/admin/config", label: "遊戲設定" },
  { to: "/admin/texts", label: "遊戲文字" },
];

export default function AdminLayout({ admin, onLogout }) {
  return (
    <div style={styles.wrapper}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoText}>GM 後台</span>
          <span style={styles.logoSub}>My Lisbeth</span>
        </div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.userSection}>
          <span style={styles.userName}>{admin?.username}</span>
          <button onClick={onLogout} style={styles.logoutBtn}>登出</button>
        </div>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    background: "#1a1a2e",
    color: "#eee",
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 220,
    background: "#16213e",
    borderRight: "1px solid #0f3460",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logo: {
    padding: "24px 20px 16px",
    borderBottom: "1px solid #0f3460",
    display: "flex",
    flexDirection: "column",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e94560",
  },
  logoSub: {
    fontSize: 12,
    color: "#a0a0b0",
    marginTop: 2,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "12px 0",
    flex: 1,
  },
  navLink: {
    padding: "10px 20px",
    color: "#a0a0b0",
    textDecoration: "none",
    fontSize: 14,
    transition: "all 0.15s",
  },
  navLinkActive: {
    color: "#fff",
    background: "#0f3460",
    borderLeft: "3px solid #e94560",
    paddingLeft: 17,
  },
  userSection: {
    padding: "16px 20px",
    borderTop: "1px solid #0f3460",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 13,
    color: "#a0a0b0",
  },
  logoutBtn: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid #0f3460",
    background: "transparent",
    color: "#e94560",
    fontSize: 12,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    padding: 24,
    overflow: "auto",
  },
};
