import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAdminAuth from "./hooks/useAdminAuth.js";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Players from "./pages/Players.jsx";
import PlayerDetail from "./pages/PlayerDetail.jsx";
import ActionLogs from "./pages/ActionLogs.jsx";
import ConfigEditor from "./pages/ConfigEditor.jsx";

export default function AdminApp() {
  const { admin, loading, login, logout } = useAdminAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#1a1a2e", color: "#a0a0b0" }}>
        載入中...
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onLogin={login} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout admin={admin} onLogout={logout} />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/players" element={<Players />} />
          <Route path="/admin/players/:userId" element={<PlayerDetail />} />
          <Route path="/admin/logs" element={<ActionLogs />} />
          <Route path="/admin/config" element={<ConfigEditor />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
