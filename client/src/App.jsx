import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Game from './pages/Game';

export default function App() {
  const auth = useAuth();

  if (auth.loading) {
    return <div className="loading">載入中...</div>;
  }

  if (!auth.authenticated) {
    return <Login />;
  }

  return <Game user={auth.user} onLogout={auth.logout} />;
}
