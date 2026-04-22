import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authApi } from '../services/api/authApi';

const AuthContext = createContext(null);

const STORAGE_TOKEN = 'pulseops.token';
const STORAGE_USER = 'pulseops.user';
const STORAGE_REMEMBER = 'pulseops.remember';

function readAuthState() {
  const remember = localStorage.getItem(STORAGE_REMEMBER) === '1';
  const primary = remember ? localStorage : sessionStorage;
  const fallback = remember ? sessionStorage : localStorage;

  const token = primary.getItem(STORAGE_TOKEN) || fallback.getItem(STORAGE_TOKEN);
  const rawUser = primary.getItem(STORAGE_USER) || fallback.getItem(STORAGE_USER);

  return {
    remember,
    token: token || null,
    user: rawUser ? JSON.parse(rawUser) : null,
  };
}

export function AuthProvider({ children }) {
  const [initial] = useState(readAuthState);
  const [user, setUser] = useState(initial.user);
  const [token, setToken] = useState(initial.token);
  const [remember, setRemember] = useState(initial.remember);

  const persist = useCallback((auth, shouldRemember = false) => {
    const target = shouldRemember ? localStorage : sessionStorage;
    const other = shouldRemember ? sessionStorage : localStorage;

    other.removeItem(STORAGE_TOKEN);
    other.removeItem(STORAGE_USER);

    target.setItem(STORAGE_TOKEN, auth.token);
    const u = { email: auth.email, fullName: auth.fullName, roles: auth.roles, expiresAt: auth.expiresAt };
    target.setItem(STORAGE_USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_REMEMBER, shouldRemember ? '1' : '0');

    setRemember(shouldRemember);
    setToken(auth.token);
    setUser(u);
  }, []);

  const login = useCallback(async (email, password, opts = {}) => {
    const auth = await authApi.login(email, password);
    persist(auth, !!opts.remember);
    return auth;
  }, [persist]);

  const register = useCallback(async (fullName, email, password) => {
    const auth = await authApi.register(fullName, email, password);
    persist(auth, false);
    return auth;
  }, [persist]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_REMEMBER);
    setRemember(false);
    setUser(null);
    setToken(null);
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    if (!user?.expiresAt) return;
    const ms = user.expiresAt - Date.now();
    if (ms <= 0) { logout(); return; }
    const t = setTimeout(logout, ms);
    return () => clearTimeout(t);
  }, [user, logout]);

  const value = useMemo(() => ({
    user,
    token,
    remember,
    isAuthenticated: !!token,
    isAdmin: !!user?.roles?.includes('ADMIN'),
    login, register, logout,
  }), [user, token, remember, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
