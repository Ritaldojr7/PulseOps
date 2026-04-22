import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

export default function AlertsOverTimeChart({ data = [] }) {
  const chartData = data.map((d) => ({
    time: typeof d.time === 'string' ? new Date(d.time).getTime() : d.time,
    count: d.count,
  }));
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-100">Alerts over time (24h)</h3>
        <span className="text-[11px] text-ink-400">per minute</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="alertsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ab3ff" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#4ab3ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#9aa4c1', fontSize: 11 }}
              tickFormatter={(t) => format(new Date(t), 'HH:mm')}
            />
            <YAxis allowDecimals={false} tick={{ fill: '#9aa4c1', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0f1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              labelFormatter={(t) => format(new Date(t), 'PPpp')}
            />
            <Area type="monotone" dataKey="count" stroke="#4ab3ff" fill="url(#alertsGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
