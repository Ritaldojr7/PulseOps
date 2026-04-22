import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Ban, Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { apiKeyApi } from '../services/api/apiKeyApi';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null);
  const [copyFlash, setCopyFlash] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      setKeys(await apiKeyApi.list());
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true); setError(null);
    try {
      const created = await apiKeyApi.create(newKeyName.trim());
      setJustCreated(created);
      setNewKeyName('');
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id) {
    if (!confirm('Revoke this key? Machines using it will stop authenticating immediately.')) return;
    try {
      await apiKeyApi.revoke(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to revoke key.');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this key permanently? This cannot be undone.')) return;
    try {
      await apiKeyApi.delete(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete key.');
    }
  }

  function copySecret() {
    if (!justCreated?.secret) return;
    navigator.clipboard.writeText(justCreated.secret);
    setCopyFlash(true);
    setTimeout(() => setCopyFlash(false), 1500);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-sm text-slate-400">
            Use these for machine-to-machine event ingestion (<code>X-API-Key</code> header on <code>POST /api/events</code>).
          </p>
        </div>
        <button onClick={load} className="btn-ghost"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </header>

      {error && (
        <div className="card card-pad text-sm text-rose-300 border-rose-500/30">{error}</div>
      )}

      {justCreated && (
        <div className="card card-pad border-emerald-500/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-emerald-300 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-300">Copy this key now — it will not be shown again.</div>
                <div className="text-xs text-slate-400 mt-1">
                  Name: <span className="text-slate-200">{justCreated.name}</span> · Prefix: <span className="text-slate-200">{justCreated.prefix}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setJustCreated(null)} className="btn-ghost" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 font-mono text-xs break-all rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100">
              {justCreated.secret}
            </code>
            <button onClick={copySecret} className="btn-primary">
              <Copy className="w-4 h-4" /> {copyFlash ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="mt-4 text-[11px] text-slate-400 whitespace-pre-wrap bg-slate-950/60 rounded-lg border border-slate-800 p-3 font-mono">
curl -X POST http://localhost:8080/api/events \
  -H "X-API-Key: {justCreated.secret}" \
  -H "Content-Type: application/json" \
  -d '{'{'}"serviceName":"my-service","type":"ERROR","severity":"ERROR","message":"Example"{'}'}'
          </pre>
        </div>
      )}

      <form onSubmit={createKey} className="card card-pad grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">New key name</label>
          <input className="input" placeholder="e.g. checkout-service-agent"
                 value={newKeyName}
                 onChange={(e) => setNewKeyName(e.target.value)}
                 maxLength={120} />
        </div>
        <button type="submit" className="btn-primary" disabled={creating || !newKeyName.trim()}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create key
        </button>
      </form>

      <div className="card card-pad">
        {loading ? (
          <div className="text-sm text-slate-500 py-8 text-center">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">No API keys yet. Create one above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Prefix</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Created</th>
                  <th className="py-2 px-3">Last used</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-200">{k.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-400">pulseops_{k.prefix}…</td>
                    <td className="py-2 px-3">
                      {k.revoked
                        ? <span className="badge bg-rose-500/15 text-rose-300">revoked</span>
                        : <span className="badge bg-emerald-500/15 text-emerald-300">active</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {!k.revoked && (
                        <button onClick={() => revoke(k.id)} className="btn-ghost" title="Revoke">
                          <Ban className="w-4 h-4" /> Revoke
                        </button>
                      )}
                      <button onClick={() => remove(k.id)} className="btn-ghost text-rose-300 hover:bg-rose-500/10" title="Delete">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
