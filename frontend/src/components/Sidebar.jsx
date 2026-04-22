import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AlertTriangle, KeyRound, LayoutDashboard, Server, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSidebarLayout } from '../context/SidebarLayoutContext.jsx';
import BrandLogo from './BrandLogo.jsx';

const baseItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts',    label: 'Alerts',    icon: AlertTriangle },
  { to: '/services',  label: 'Services',  icon: Server },
];

const adminItems = [
  { to: '/api-keys', label: 'API Keys', icon: KeyRound },
];

const stagger = {
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.22 } },
};

function NavList({ collapsed, layoutId, onNavigate, className }) {
  const { isAdmin } = useAuth();
  const items = [...baseItems, ...(isAdmin ? adminItems : [])];

  return (
    <motion.nav
      variants={stagger}
      initial="hidden"
      animate="show"
      className={className}
    >
      {items.map(({ to, label, icon: Icon }) => (
        <motion.div variants={item} key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            title={label}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center rounded-xl text-sm transition-colors',
                collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                isActive
                  ? 'text-brand-200 bg-gradient-to-r from-brand-500/15 via-brand-500/5 to-transparent shadow-glow'
                  : 'text-ink-200 hover:bg-white/[0.04] hover:text-ink-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={layoutId}
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-brand-300 to-accent-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={clsx(
                    'w-4 h-4 shrink-0 opacity-90 group-hover:opacity-100',
                    collapsed && 'mx-auto'
                  )}
                />
                {!collapsed && <span className="font-medium truncate">{label}</span>}
              </>
            )}
          </NavLink>
        </motion.div>
      ))}
    </motion.nav>
  );
}

export default function Sidebar() {
  const { collapsed, mobileOpen, closeMobile } = useSidebarLayout();

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.aside
        className="hidden md:flex shrink-0 flex-col border-r border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 relative overflow-hidden"
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.4 }}
      >
        <span className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
        <div
          className={clsx(
            'flex h-16 items-center border-b border-white/[0.05] shrink-0',
            collapsed ? 'justify-center px-2' : 'gap-2 px-4'
          )}
        >
          {collapsed ? (
            <div className="grid place-items-center rounded-lg p-0.5 ring-1 ring-white/10" title="PulseOps">
              <BrandLogo variant="icon" className="h-8 w-8" />
            </div>
          ) : (
            <div className="min-w-0 flex-1 rounded-lg bg-ink-100/[0.06] px-2 py-1.5 ring-1 ring-white/[0.07]">
              <BrandLogo variant="wordmark" className="!h-7 w-full" />
            </div>
          )}
        </div>

        <NavList
          collapsed={collapsed}
          layoutId="sidebar-active"
          className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4"
        />

        <div
          className={clsx(
            'border-t border-white/[0.05] shrink-0',
            collapsed ? 'px-2 py-3 flex flex-col items-center justify-center' : 'px-5 py-4 flex items-center justify-between'
          )}
        >
          {collapsed ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]" title="v1.0.0" />
          ) : (
            <>
              <span className="text-[11px] text-ink-400">v1.0.0</span>
              <span className="chip-glow rounded-full px-2 py-0.5 text-[11px]">production</span>
            </>
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm"
              onClick={closeMobile}
              aria-label="Close menu"
            />
            <motion.aside
              initial={{ x: -280, opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 38 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[min(16rem,88vw)] flex flex-col border-r border-white/[0.08] bg-ink-900/95 backdrop-blur-2xl"
            >
              <div className="flex h-16 items-center justify-between gap-2 px-4 border-b border-white/[0.05]">
                <div className="min-w-0 flex-1 rounded-lg bg-ink-100/[0.06] px-2 py-1.5 ring-1 ring-white/[0.07]">
                  <BrandLogo variant="wordmark" className="!h-7 w-full" />
                </div>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="p-2 rounded-lg text-ink-300 hover:bg-white/[0.06] hover:text-ink-100"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList
                collapsed={false}
                layoutId="sidebar-active-mobile"
                onNavigate={closeMobile}
                className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
              />
              <div className="px-5 py-4 text-[11px] text-ink-400 border-t border-white/[0.05] flex items-center justify-between">
                <span>v1.0.0</span>
                <span className="chip-glow rounded-full px-2 py-0.5">production</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
