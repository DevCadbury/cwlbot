'use client';
import { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, setAuth, clearAuth } from '@/lib/auth';
import { apiRefreshToken, apiLogout } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);
    setLoading(false);
  }, []);

  const login = useCallback((accessToken: string, userData: any) => {
    setAuth(accessToken, userData);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await apiLogout(token);
    } catch {}
    clearAuth();
    setToken(undefined);
    setUser(null);
    router.push('/login');
  }, [token, router]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const result = await apiRefreshToken(token);
      setAuth(result.accessToken, user);
      setToken(result.accessToken);
    } catch {
      logout();
    }
  }, [token, user, logout]);

  return { token, user, loading, login, logout, refresh };
}
