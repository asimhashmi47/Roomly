import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import type { AuditEntry, Paged } from '../lib/types';
import { fmtDateTime } from '../lib/time';
import { useFetch } from '../hooks/useFetch';
import { DataTable, Pagination } from '../components/DataTable';
import { Badge, ErrorState } from '../components/ui/Feedback';
import { inputClass } from '../components/ui/Field';

const ACTIONS = [
  'USER_CREATED',
  'USER_DELETED',
  'ROOM_CREATED',
  'ROOM_UPDATED',
  'ROOM_DELETED',
  'BOOKING_CREATED',
  'BOOKING_DELETED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
];

export function ActionBadge({ action }: { action: string }) {
  const tone = action.endsWith('FAILED') || action.endsWith('DELETED')
    ? 'danger'
    : action.endsWith('CREATED') || action.endsWith('SUCCESS')
      ? 'ok'
      : 'primary';
  return <Badge tone={tone}>{action.replace('_', ' ').toLowerCase()}</Badge>;
}

export function AuditLogs() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useFetch(
    () => api<Paged<AuditEntry>>('/admin/audit-logs', { query: { page, search: debounced, action } }),
    [page, debounced, action],
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="mt-1 text-sm text-ink-2">Who did what, newest first.</p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            aria-label="Search audit logs"
            className={`${inputClass} pl-9`}
            placeholder="Search user, entity or details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by action"
          className={`${inputClass} w-auto`}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace('_', ' ').toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            caption="Audit log entries"
            loading={loading}
            rows={data?.logs ?? []}
            rowKey={(r) => r.id}
            empty="No entries match those filters."
            columns={[
              { header: 'Time', cell: (r) => <time dateTime={r.createdAt} className="whitespace-nowrap text-ink-2">{fmtDateTime(r.createdAt)}</time> },
              { header: 'User', cell: (r) => r.userName ?? <span className="text-muted">Unknown</span> },
              { header: 'Action', cell: (r) => <ActionBadge action={r.action} /> },
              { header: 'Entity', cell: (r) => r.entityType },
              { header: 'Details', cell: (r) => <span className="text-ink-2">{r.details ?? ''}</span> },
            ]}
          />
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
