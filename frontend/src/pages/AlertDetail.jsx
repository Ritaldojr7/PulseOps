import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { alertApi } from '../services/api/alertApi';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ArrowLeft, Check, CheckCheck, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext.jsx';
import { useAlertStream } from '../hooks/useAlertStream.js';

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { lastAlert } = useAlertStream({ max: 1 });

  async function load() {
    try {
      setAlert(await alertApi.get(id));
    } catch (e) {
      setError('Failed to load alert.');
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!lastAlert || !id) return;
    if (lastAlert.id === id) {
      setAlert(lastAlert);
      setError(null);
    }
  }, [lastAlert, id]);

  async function ack() {
    setBusy(true);
    try { setAlert(await alertApi.acknowledge(id)); } finally { setBusy(false); }
  }
  async function resolve() {
    setBusy(true);
    try { setAlert(await alertApi.resolve(id)); } finally { setBusy(false); }
  }

  if (error) return <div className="card card-pad text-rose-300">{error}</div>;
  if (!alert) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card card-pad">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{alert.title}</h1>
            <div className="mt-1 text-sm text-slate-400">
              <Link to="/services" className="text-brand-300 hover:text-brand-200">{alert.serviceName}</Link>
              {' · '}
              <span>{alert.eventCount ?? 0} events</span>
            </div>
          </div>
          <div className="flex gap-2">
            {alert.status === 'ACTIVE' && (
              <button onClick={ack} disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Acknowledge
              </button>
            )}
            {isAdmin && alert.status !== 'RESOLVED' && (
              <button onClick={resolve} disabled={busy} className="btn-ghost border border-slate-700">
                <CheckCheck className="w-4 h-4" /> Resolve
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-300 whitespace-pre-wrap">{alert.description}</p>

        <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <KV label="Created" value={format(new Date(alert.createdAt), 'PPpp')} />
          <KV label="Updated" value={format(new Date(alert.updatedAt), 'PPpp')} />
          <KV label="Fingerprint" value={alert.fingerprint || '—'} mono />
          <KV label="Acknowledged by" value={alert.acknowledgedBy || '—'} />
        </dl>
      </div>

      <div className="card card-pad">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Timeline</h3>
        <ol className="space-y-4 border-l border-slate-800 pl-4">
          <Step time={alert.createdAt} title="Alert created" desc={`Severity: ${alert.severity}`} dot="bg-rose-500" />
          {alert.status !== 'ACTIVE' && (
            <Step time={alert.updatedAt} title={`Alert ${alert.status.toLowerCase()}`}
                  desc={alert.acknowledgedBy ? `By ${alert.acknowledgedBy}` : ''}
                  dot={alert.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-amber-500'} />
          )}
        </ol>
      </div>
    </div>
  );
}

function KV({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 text-slate-200 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</dd>
    </div>
  );
}

function Step({ time, title, desc, dot }) {
  return (
    <li className="relative">
      <span className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full ${dot} ring-4 ring-slate-950`} />
      <div className="text-xs text-slate-500">{format(new Date(time), 'PPpp')}</div>
      <div className="text-sm text-slate-200 font-medium">{title}</div>
      {desc && <div className="text-xs text-slate-400">{desc}</div>}
    </li>
  );
}
