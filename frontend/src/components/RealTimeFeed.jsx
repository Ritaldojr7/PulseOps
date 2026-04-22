import { AnimatePresence, motion } from 'framer-motion';
import { useAlertStream } from '../hooks/useAlertStream';
import SeverityBadge from './SeverityBadge.jsx';
import { formatDistanceToNow } from 'date-fns';
import { Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RealTimeFeed() {
  const { connected, alerts } = useAlertStream({ max: 25 });

  return (
    <div className="card card-pad h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-100">Live alert feed</h3>
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-emerald-300">live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-ink-400" />
              <span className="text-ink-400">connecting…</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {alerts.length === 0 && (
          <div className="text-xs text-ink-400 py-12 text-center">
            Waiting for incoming alerts…
          </div>
        )}
        <AnimatePresence initial={false}>
          {alerts.map((a) => (
            <motion.div
              key={a.id + ':' + a.updatedAt}
              layout
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22 }}
            >
              <Link
                to={`/alerts/${a.id}`}
                className="block rounded-xl border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md p-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <SeverityBadge severity={a.severity} />
                  <span className="text-[11px] text-ink-400">
                    {formatDistanceToNow(new Date(a.updatedAt || a.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink-100">{a.title}</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  <span className="text-ink-200">{a.serviceName}</span>
                  {a.eventCount ? ` · ${a.eventCount} events` : ''}
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
