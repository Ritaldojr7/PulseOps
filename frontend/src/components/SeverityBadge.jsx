import clsx from 'clsx';

const map = {
  INFO: 'badge-info',
  WARNING: 'badge-warning',
  ERROR: 'badge-error',
  CRITICAL: 'badge-critical',
};

export default function SeverityBadge({ severity }) {
  return <span className={clsx(map[severity] || 'badge bg-slate-700 text-slate-200')}>{severity}</span>;
}
