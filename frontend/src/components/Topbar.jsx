import { LogOut, Menu, PanelLeft, ShieldCheck, User2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { useSidebarLayout } from '../context/SidebarLayoutContext.jsx';

export default function Topbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const isMd = useMediaQuery('(min-width: 768px)');
  const { collapsed, toggleSidebar, openMobile } = useSidebarLayout();

  return (
    <header className="h-16 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 sticky top-0 z-20">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isMd ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:inline-flex p-2 rounded-lg text-ink-300 hover:bg-white/[0.06] hover:text-ink-100 shrink-0"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openMobile}
              className="md:hidden p-2 rounded-lg text-ink-300 hover:bg-white/[0.06] hover:text-ink-100 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-w-0"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">PulseOps</div>
            <div className="text-sm text-ink-200 font-display tracking-tightish truncate">
              Real-Time Incident Detection &amp; Alerting
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex items-center gap-3"
        >
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200">
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            ) : (
              <User2 className="w-4 h-4 text-ink-300" />
            )}
            <span className="font-medium">{user?.fullName}</span>
            <span className="text-ink-400">· {user?.email}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="btn-ghost"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </motion.div>
      </div>
    </header>
  );
}
