import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import SeverityBadge from './SeverityBadge.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function AlertsTable({ alerts = [], compact = false }) {
  if (!alerts.length) {
    return <div className="text-sm text-ink-400 py-8 text-center">No alerts to show.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400 border-b border-white/[0.05]">
            <th className="py-2.5 px-3">Severity</th>
            <th className="py-2.5 px-3">Service</th>
            <th className="py-2.5 px-3">Title</th>
            {!compact && <th className="py-2.5 px-3">Status</th>}
            <th className="py-2.5 px-3">Events</th>
            <th className="py-2.5 px-3">When</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a, idx) => (
            <motion.tr
              key={a.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx, 8) * 0.03 }}
              className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
            >
              <td className="py-2.5 px-3"><SeverityBadge severity={a.severity} /></td>
              <td className="py-2.5 px-3 text-ink-100">{a.serviceName}</td>
              <td className="py-2.5 px-3">
                <Link to={`/alerts/${a.id}`} className="text-brand-300 hover:text-brand-200">
                  {a.title}
                </Link>
              </td>
              {!compact && <td className="py-2.5 px-3"><StatusBadge status={a.status} /></td>}
              <td className="py-2.5 px-3 text-ink-300">{a.eventCount ?? '—'}</td>
              <td className="py-2.5 px-3 text-ink-400 whitespace-nowrap" title={a.createdAt}>
                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
