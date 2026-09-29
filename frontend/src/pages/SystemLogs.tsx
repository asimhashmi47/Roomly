import { useState } from 'react';
import { api } from '../lib/api';
import type { Paged, SystemLogEntry } from '../lib/types';
import { fmtDateTime } from '../lib/time';
import { useFetch } from '../hooks/useFetch';
import { DataTable, Pagination } from '../components/DataTable';
import { Badge, ErrorState } from '../components/ui/Feedback';
import { inputClass } from '../components/ui/Field';

const TONE = { INFO: 'primary', WARN: 'warn', ERROR: 'danger' } as const;

export function SystemLogs() {
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch(
    () => api<Paged<SystemLogEntry>>('/admin/system-logs', { query: { page, level } }),
    [page, level],
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">System logs</h1>
        <p className="mt-1 text-sm text-ink-2">Server startup, failed sign-ins, booking conflicts and errors.</p>
      </header>

      <div className="mb-4">
        <select
          aria-label="Filter by level"
          className={`${inputClass} w-auto`}
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All levels</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            caption="System log entries"
            loading={loading}
            rows={data?.logs ?? []}
            rowKey={(r) => r.id}
            empty="No log entries yet."
            columns={[
              { header: 'Time', cell: (r) => <time dateTime={r.createdAt} className="whitespace-nowrap text-ink-2">{fmtDateTime(r.createdAt)}</time> },
              { header: 'Level', cell: (r) => <Badge tone={TONE[r.level]} dot>{r.level.toLowerCase()}</Badge> },
              { header: 'Message', cell: (r) => <span className="font-mono text-[13px]">{r.message}</span> },
            ]}
          />
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </>
  );
}
