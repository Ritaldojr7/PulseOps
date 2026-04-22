import clsx from 'clsx';

const map = {
  ACTIVE: 'badge-active',
  ACKNOWLEDGED: 'badge-ack',
  RESOLVED: 'badge-resolved',
};

export default function StatusBadge({ status }) {
  return <span className={clsx(map[status] || 'badge bg-slate-700 text-slate-200')}>{status}</span>;
}
