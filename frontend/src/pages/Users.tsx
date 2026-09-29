import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import type { Role, User } from '../lib/types';
import { fmtDateTime } from '../lib/time';
import { useFetch } from '../hooks/useFetch';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Alert, Badge, ErrorState } from '../components/ui/Feedback';

function CreateUserModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' as Role });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/users', { method: 'POST', body: form });
      toast.success('User created');
      setForm({ name: '', email: '', password: '', role: 'USER' });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create user" width="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name">
          {(p) => <input {...p} className={inputClass} value={form.name} onChange={set('name')} autoFocus />}
        </Field>
        <Field label="Email">
          {(p) => <input {...p} type="email" className={inputClass} value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" hint="At least 8 characters">
          {(p) => (
            <input {...p} type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={set('password')} />
          )}
        </Field>
        <Field label="Role">
          {(p) => (
            <select {...p} className={inputClass} value={form.role} onChange={set('role')}>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
          )}
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Users() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useFetch(() => api<{ users: User[] }>('/users'), []);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-ink-2">Everyone who can sign in.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          Create user
        </Button>
      </header>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          caption="Users"
          loading={loading}
          rows={data?.users ?? []}
          rowKey={(u) => u.id}
          empty="No users yet."
          columns={[
            { header: 'Name', cell: (u) => <span className="font-medium">{u.name}</span> },
            { header: 'Email', cell: (u) => <span className="text-ink-2">{u.email}</span> },
            { header: 'Role', cell: (u) => <Badge tone={u.role === 'ADMIN' ? 'accent' : 'neutral'}>{u.role === 'ADMIN' ? 'Admin' : 'User'}</Badge> },
            { header: 'Created', cell: (u) => <span className="whitespace-nowrap text-ink-2">{fmtDateTime(u.createdAt)}</span> },
            {
              header: 'Actions',
              className: 'text-right',
              cell: (u) =>
                u.id === me?.id ? (
                  <span className="text-xs text-muted">You</span>
                ) : (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${u.name}`} onClick={() => setDeleting(u)}>
                    <Trash2 className="size-4" />
                  </Button>
                ),
            },
          ]}
        />
      )}

      <CreateUserModal open={creating} onClose={() => setCreating(false)} onSaved={reload} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'user'}?`}
        body="Their bookings are removed too. This cannot be undone."
        confirmLabel="Delete user"
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/users/${deleting.id}`, { method: 'DELETE' });
          toast.success('User deleted');
          reload();
        }}
      />
    </>
  );
}
