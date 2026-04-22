import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function OverviewCard({ title, value, hint, icon: Icon, accent = 'brand' }) {
  // Colored aurora layer rendered BEHIND the glass -> visibly refracted through the blur
  const auroras = {
    brand:   'radial-gradient(120% 100% at 0% 0%, rgba(74,179,255,0.35), transparent 55%)',
    rose:    'radial-gradient(120% 100% at 0% 0%, rgba(244,63,94,0.30),  transparent 55%)',
    amber:   'radial-gradient(120% 100% at 0% 0%, rgba(245,158,11,0.28), transparent 55%)',
    emerald: 'radial-gradient(120% 100% at 0% 0%, rgba(16,185,129,0.28), transparent 55%)',
    accent:  'radial-gradient(120% 100% at 0% 0%, rgba(167,139,250,0.32),transparent 55%)',
  };
  const iconClass = {
    brand:   'text-brand-300',
    rose:    'text-rose-300',
    amber:   'text-amber-300',
    emerald: 'text-emerald-300',
    accent:  'text-accent-400',
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="card card-pad card-strong"
    >
      {/* colored aurora behind the glass */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{ background: auroras[accent] }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300/80">{title}</span>
        {Icon && <Icon className={clsx('w-5 h-5', iconClass)} />}
      </div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-3 text-3xl font-display font-semibold tracking-tightish text-ink-100"
      >
        {value}
      </motion.div>
      {hint && <div className="mt-1 text-xs text-ink-300/80">{hint}</div>}
    </motion.div>
  );
}
