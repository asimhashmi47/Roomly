import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      aria-hidden
      className={`rounded-lg bg-sunken ${className}`}
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-ink">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-2xl border border-danger/20 bg-danger-soft px-6 py-10 text-center"
    >
      <AlertTriangle className="mb-3 size-6 text-danger-ink" aria-hidden />
      <p className="max-w-sm text-sm text-danger-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}

const tones = {
  neutral: 'bg-sunken text-ink-2',
  primary: 'bg-primary-soft text-primary-ink',
  accent: 'bg-accent-soft text-accent-ink',
  ok: 'bg-ok-soft text-ok-ink',
  warn: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
} as const;

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: keyof typeof tones;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Alert({
  tone,
  title,
  children,
}: {
  tone: 'warn' | 'danger' | 'ok';
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'ok' ? 'status' : 'alert'}
      className={`rounded-lg border px-3.5 py-3 text-sm ${
        tone === 'danger'
          ? 'border-danger/20 bg-danger-soft text-danger-ink'
          : tone === 'warn'
            ? 'border-warn/40 bg-warn-soft text-warn-ink'
            : 'border-ok/25 bg-ok-soft text-ok-ink'
      }`}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
