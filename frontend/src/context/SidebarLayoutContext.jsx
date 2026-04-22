import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'pulseops.sidebarCollapsed';

const SidebarLayoutContext = createContext(null);

export function SidebarLayoutProvider({ children }) {
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch { /* ignore */ }
    return false;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [collapsed]);

  const setCollapsed = useCallback((v) => setCollapsedState(!!v), []);
  const toggleSidebar = useCallback(() => setCollapsedState((c) => !c), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleSidebar,
      mobileOpen,
      openMobile,
      closeMobile,
    }),
    [collapsed, setCollapsed, toggleSidebar, mobileOpen, openMobile, closeMobile]
  );

  return (
    <SidebarLayoutContext.Provider value={value}>
      {children}
    </SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext);
  if (!ctx) {
    throw new Error('useSidebarLayout must be used within SidebarLayoutProvider');
  }
  return ctx;
}
