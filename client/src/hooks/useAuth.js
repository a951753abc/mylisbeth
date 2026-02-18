import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [auth, setAuth] = useState({ loading: true, authenticated: false, user: null });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      setAuth({ loading: false, authenticated: data.authenticated, user: data.user || null });
    } catch {
      setAuth({ loading: false, authenticated: false, user: null });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setAuth({ loading: false, authenticated: false, user: null });
  };

  return { ...auth, logout, refresh: checkAuth };
}
