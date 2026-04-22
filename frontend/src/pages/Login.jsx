import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const emailError = useMemo(() => {
    if (!touched || !email.trim()) return null;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return valid ? null : 'Enter a valid email address.';
  }, [email, touched]);

  const passwordError = useMemo(() => {
    if (!touched || !password) return null;
    return password.length >= 8 ? null : 'Password must be at least 8 characters.';
  }, [password, touched]);

  const formValid = !emailError && !passwordError && email.trim() && password;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    setBusy(true); setError(null);
    try {
      await login(email.trim().toLowerCase(), password, { remember });
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 text-ink-100">
      {/* Left hero */}
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-95"
             style={{
               background:
                 'radial-gradient(1100px 560px at 0% 0%, rgba(74,179,255,0.22), transparent 60%),' +
                 'radial-gradient(900px 500px at 110% 20%, rgba(167,139,250,0.20), transparent 55%),' +
                 'linear-gradient(180deg, #0a0f1c 0%, #0d1528 100%)',
             }} />
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center"
        >
          <div className="rounded-2xl bg-[#d9d9d9] px-4 py-2.5 ring-1 ring-black/5 shadow-sm">
            <BrandLogo variant="wordmark" className="!h-11 sm:!h-12" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-[34px] leading-[1.1] font-display font-semibold tracking-tighter2">
            Real-Time Incident Detection &amp; Alerting Platform
          </h1>
          <p className="mt-4 text-ink-300 leading-relaxed">
            Ingest events from every service, detect anomalies in real time with sliding-window
            analytics, and ship alerts to your team the instant they happen.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-ink-200">
            {[
              'Kafka-backed event pipeline',
              'Redis sliding-window anomaly detection',
              'WebSocket live dashboard',
              'JWT + Role-based access',
            ].map((t, i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex gap-2"
              >
                <span className="text-brand-300">▸</span> {t}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <div className="text-xs text-ink-500">© PulseOps</div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl pointer-events-none animate-float" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-8">
            <div className="inline-flex rounded-2xl bg-[#d9d9d9] px-4 py-2.5 ring-1 ring-black/5">
              <BrandLogo variant="wordmark" className="!h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-display font-semibold tracking-tightish">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-400">Sign in to your operations console.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">Email</label>
              <input className="input" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} />
              {emailError && <p className="mt-1 text-xs text-rose-300">{emailError}</p>}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">Password</label>
              <div className="relative">
                <input
                  className="input pr-11"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-ink-400 hover:text-ink-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1 text-xs text-rose-300">{passwordError}</p>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-ink-300 select-none">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-transparent"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Keep me signed in
              </label>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.div>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy || !formValid}
              className="btn-primary w-full"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </motion.button>
            <div className="text-xs text-ink-400 text-center">
              No account? <Link to="/register" className="text-brand-300 hover:text-brand-200">Create one</Link>
            </div>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
