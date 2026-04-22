import { useEffect, useRef, useState } from 'react';
import AlertsTable from '../components/AlertsTable.jsx';
import { alertApi } from '../services/api/alertApi';
import { ChevronLeft, ChevronRight, Filter, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAlertStream } from '../hooks/useAlertStream.js';

const SEVERITIES = ['', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const STATUSES   = ['', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];

export default function Alerts() {
  const [page, setPage] = useState(0);
  const [size] = useState(15);
  const [service, setService] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(false);
  const { connected, lastAlert } = useAlertStream({ max: 1 });
  const processedKeyRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const params = { page, size };
      if (service) params.service = service;
      if (severity) params.severity = severity;
      if (status) params.status = status;
      const res = await alertApi.list(params);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, severity, status]);

  useEffect(() => {
    if (!lastAlert) return;
    const key = `${lastAlert.id}:${lastAlert.updatedAt ?? lastAlert.createdAt ?? ''}:${lastAlert.status ?? ''}:${lastAlert.eventCount ?? ''}`;
    if (processedKeyRef.current === key) return;
    processedKeyRef.current = key;

    setData((prev) => {
      const current = prev.content || [];
      const existingIndex = current.findIndex((a) => a.id === lastAlert.id);
      const matches = matchesFilters(lastAlert, { service, severity, status });

      // Keep pagination behavior stable for non-first pages.
      if (page > 0 && existingIndex === -1) {
        return prev;
      }

      let nextRows = [...current];
      let totalElements = prev.totalElements;

      if (existingIndex >= 0) {
        if (matches) {
          nextRows[existingIndex] = lastAlert;
          nextRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
          nextRows.splice(existingIndex, 1);
          totalElements = Math.max(0, totalElements - 1);
        }
      } else if (matches && page === 0) {
        nextRows = [lastAlert, ...nextRows]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, size);
        totalElements += 1;
      }

      return { ...prev, content: nextRows, totalElements };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAlert, page, size, service, severity, status]);

  function applyFilters(e) {
    e?.preventDefault();
    setPage(0);
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-display font-semibold tracking-tighter2 text-ink-100">Alerts</h1>
          <p className="text-sm text-ink-300/90 mt-1">Filter, triage, and resolve incidents.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {connected ? (
              <>
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
          <button onClick={load} className="btn-ghost"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </header>

      <form onSubmit={applyFilters} className="card card-pad grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">Service</label>
          <input className="input" placeholder="e.g. checkout-service"
            value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">Severity</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s || 'all'} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s || 'all'} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        <button className="btn-primary"><Filter className="w-4 h-4" /> Apply</button>
      </form>

      <div className="card card-pad">
        {loading ? (
          <div className="text-sm text-ink-400 py-8 text-center">Loading…</div>
        ) : (
          <AlertsTable alerts={data.content} />
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-ink-400">
          <div>
            Showing {data.content.length} of {data.totalElements} · Page {data.number + 1} / {Math.max(1, data.totalPages)}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= data.totalPages} className="btn-ghost">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function matchesFilters(alert, filters) {
  const serviceMatch = !filters.service
    || (alert.serviceName || '').toLowerCase().includes(filters.service.toLowerCase().trim());
  const severityMatch = !filters.severity || alert.severity === filters.severity;
  const statusMatch = !filters.status || alert.status === filters.status;
  return serviceMatch && severityMatch && statusMatch;
}
