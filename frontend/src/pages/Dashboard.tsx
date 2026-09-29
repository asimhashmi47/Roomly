import { CalendarCheck, CalendarClock, DoorOpen, Users } from 'lucide-react';
import { api } from '../lib/api';
import type { Stats } from '../lib/types';
import { fmtDateTime } from '../lib/time';
import { useFetch } from '../hooks/useFetch';
import { ErrorState, Skeleton } from '../components/ui/Feedback';
import { ActionBadge } from './AuditLogs';

const cards = [
  { key: 'totalRooms', label: 'Total rooms', icon: DoorOpen, tone: 'bg-primary-soft text-primary-ink' },
  { key: 'todaysBookings', label: "Today's bookings", icon: CalendarCheck, tone: 'bg-ok-soft text-ok-ink' },
  { key: 'upcomingBookings', label: 'Upcoming bookings', icon: CalendarClock, tone: 'bg-accent-soft text-accent-ink' },
  { key: 'totalUsers', label: 'Total users', icon: Users, tone: 'bg-warn-soft text-warn-ink' },
] as const;

export function Dashboard() {
  const { data, error, loading, reload } = useFetch(() => api<Stats>('/admin/stats'), []);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-2">A quick read on rooms, bookings and people.</p>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ key, label, icon: Icon, tone }) => (
              <div key={key} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">
                    {loading && !data ? <Skeleton className="mt-1 h-7 w-12" /> : data?.[key]}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <section className="mt-8" aria-labelledby="activity">
            <h2 id="activity" className="mb-3 text-base font-semibold">
              Recent activity
            </h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
              {loading && !data
                ? [0, 1, 2].map((i) => (
                    <li key={i} className="p-4">
                      <Skeleton className="h-4 w-2/3" />
                    </li>
                  ))
                : data?.recentActivity.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                      <ActionBadge action={a.action} />
                      <span className="min-w-0 flex-1 truncate text-ink-2">
                        <span className="font-medium text-ink">{a.userName ?? 'Unknown'}</span>
                        {a.details ? ` · ${a.details}` : ''}
                      </span>
                      <time className="text-xs text-muted" dateTime={a.createdAt}>
                        {fmtDateTime(a.createdAt)}
                      </time>
                    </li>
                  ))}
              {data?.recentActivity.length === 0 && (
                <li className="p-6 text-center text-sm text-ink-2">Activity will appear here as people use the app.</li>
              )}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
