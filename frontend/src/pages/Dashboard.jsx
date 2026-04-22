import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Server } from 'lucide-react';
import OverviewCard from '../components/OverviewCard.jsx';
import AlertsOverTimeChart from '../components/AlertsOverTimeChart.jsx';
import ErrorsPerServiceChart from '../components/ErrorsPerServiceChart.jsx';
import AlertsTable from '../components/AlertsTable.jsx';
import RealTimeFeed from '../components/RealTimeFeed.jsx';
import { metricsApi } from '../services/api/metricsApi';
import { alertApi } from '../services/api/alertApi';
import { useAlertStream } from '../hooks/useAlertStream.js';
import BrandLogo from '../components/BrandLogo.jsx';

const row = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } },
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);
  const { lastAlert } = useAlertStream({ max: 10 });

  async function load() {
    try {
      const [m, r] = await Promise.all([
        metricsApi.summary(),
        alertApi.list({ size: 8 }),
      ]);
      setMetrics(m);
      setRecent(r.content || []);
    } catch (e) {
      setError('Failed to load dashboard data.');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lastAlert) return;

    setRecent((prev) => {
      const next = [lastAlert, ...prev.filter((a) => a.id !== lastAlert.id)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      return next;
    });

    const t = setTimeout(async () => {
      try {
        const m = await metricsApi.summary();
        setMetrics(m);
      } catch {
        // keep stale metrics if refresh fails
      }
    }, 500);

    return () => clearTimeout(t);
  }, [lastAlert]);

  return (
    <motion.div variants={row} initial="hidden" animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="inline-flex rounded-lg bg-ink-100/[0.07] px-2.5 py-1.5 ring-1 ring-white/[0.08]">
            <BrandLogo variant="wordmark" className="!h-7 sm:!h-8 max-w-[min(100%,240px)]" />
          </div>
          <h1 className="text-[28px] font-display font-semibold tracking-tighter2 text-ink-100 mt-3">
            Operations Overview
          </h1>
          <p className="text-sm text-ink-300/90 mt-1">Live signal across all your services.</p>
        </div>
      </motion.header>

      {error && (
        <motion.div variants={item} className="card card-pad text-sm text-rose-300 border-rose-500/30">
          {error}
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard title="Total alerts" value={fmt(metrics?.totalAlerts)} hint="lifetime" icon={Bell} accent="brand" />
        <OverviewCard title="Active alerts" value={fmt(metrics?.activeAlerts)} hint="needs attention" icon={AlertTriangle} accent="rose" />
        <OverviewCard title="Services monitored" value={fmt(metrics?.servicesMonitored)} hint={`${metrics?.unhealthyServices ?? 0} unhealthy`} icon={Server} accent="accent" />
        <OverviewCard title="Resolved" value={fmt(metrics?.resolvedAlerts)} hint="last 24h trend" icon={CheckCircle2} accent="emerald" />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <AlertsOverTimeChart data={metrics?.alertsOverTime || []} />
          <ErrorsPerServiceChart data={metrics?.errorsPerService || []} />
        </div>
        <div className="xl:col-span-1 min-h-[400px]">
          <RealTimeFeed />
        </div>
      </motion.div>

      <motion.div variants={item} className="card card-pad">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-100">Recent alerts</h3>
          <a href="/alerts" className="text-xs text-brand-300 hover:text-brand-200">View all →</a>
        </div>
        <AlertsTable alerts={recent} />
      </motion.div>
    </motion.div>
  );
}

function fmt(n) {
  if (n === undefined || n === null) return '—';
  return new Intl.NumberFormat().format(n);
}
