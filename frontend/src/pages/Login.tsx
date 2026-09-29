import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Alert } from '../components/ui/Feedback';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-white shadow-card">
              <CalendarDays className="size-5" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight">Roomly</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-ink-2">Book a meeting room in a few seconds.</p>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate>
            <Field label="Email">
              {(p) => (
                <input
                  {...p}
                  type="email"
                  autoComplete="username"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>
            {error && <Alert tone="danger">{error}</Alert>}
            <Button type="submit" loading={busy} className="mt-1 w-full">
              Sign in
            </Button>
          </form>
        </motion.div>
      </div>

      <aside
        aria-hidden
        className="hidden flex-col justify-center bg-primary-soft px-16 lg:flex"
      >
        <p className="max-w-md text-3xl leading-tight font-semibold tracking-tight text-primary-ink">
          See what is free. Book it. Get on with your day.
        </p>
        <div className="mt-10 max-w-md rounded-2xl border border-line bg-surface p-4 shadow-pop">
          {[
            ['09:00', 'Sprint planning', 'primary'],
            ['10:00', 'Design review', 'accent'],
            ['11:00', 'Free', 'free'],
          ].map(([t, label, tone]) => (
            <div key={t} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
              <span className="w-12 font-mono text-xs text-muted">{t}</span>
              <span
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                  tone === 'primary'
                    ? 'bg-primary-soft text-primary-ink'
                    : tone === 'accent'
                      ? 'bg-accent-soft text-accent-ink'
                      : 'border border-dashed border-line-strong text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
