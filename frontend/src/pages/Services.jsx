import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { serviceApi } from '../services/api/serviceApi';
import { Activity, CircleAlert, CircleCheck, RefreshCw, Server } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const grid = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const cell = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      setServices(await serviceApi.list());
    } catch (e) {
      setError('Failed to load services.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tighter2 text-ink-100">Services</h1>
          <p className="text-sm text-ink-300/90 mt-1">Health and error rates across your fleet.</p>
        </div>
        <button onClick={load} className="btn-ghost"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </header>

      {error && <div className="card card-pad text-sm text-rose-300 border-rose-500/30">{error}</div>}

      {loading && services.length === 0 ? (
        <div className="text-sm text-ink-400">Loading…</div>
      ) : services.length === 0 ? (
        <div className="card card-pad text-sm text-ink-400">
          No services registered yet. Send an event to <code>/api/events</code> to register one.
        </div>
      ) : (
        <motion.div
          variants={grid}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {services.map((s) => (
            <motion.div
              key={s.id}
              variants={cell}
              whileHover={{ y: -2 }}
              className="card card-pad relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center ring-1 ring-inset ${
                    s.healthy
                      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20'
                      : 'bg-rose-500/10 text-rose-300 ring-rose-400/20'
                  }`}>
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink-100">{s.name}</div>
                    <div className="text-[11px] text-ink-400">{s.environment || 'production'}</div>
                  </div>
                </div>
                {s.healthy ? (
                  <span className="badge bg-emerald-500/10 text-emerald-300 ring-emerald-400/20">
                    <CircleCheck className="w-3 h-3" /> healthy
                  </span>
                ) : (
                  <span className="badge bg-rose-500/10 text-rose-300 ring-rose-400/25 animate-pulseSoft">
                    <CircleAlert className="w-3 h-3" /> degraded
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Stat label="Errors (15m)" value={s.errorCountLast15m ?? 0} />
                <Stat label="Err / min" value={(s.errorRatePerMin ?? 0).toFixed(2)} />
              </div>

              <div className="mt-4 flex items-center gap-2 text-[11px] text-ink-400">
                <Activity className="w-3 h-3" />
                {s.lastSeenAt
                  ? `seen ${formatDistanceToNow(new Date(s.lastSeenAt), { addSuffix: true })}`
                  : 'never seen'}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-md px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className="text-base font-display font-semibold tracking-tightish text-ink-100">{value}</div>
    </div>
  );
}
