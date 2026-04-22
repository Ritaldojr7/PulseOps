import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

const palette = ['#4ab3ff', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#22d3ee', '#a78bfa'];

export default function ErrorsPerServiceChart({ data = [] }) {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-100">Alerts per service (24h)</h3>
        <span className="text-[11px] text-ink-400">top contributors</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="service" tick={{ fill: '#9aa4c1', fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} tick={{ fill: '#9aa4c1', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
