import { useState } from 'react';
import { DoorOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { api, errorMessage } from '../lib/api';
import { makeDraft } from '../lib/draft';
import type { Room } from '../lib/types';
import { useFetch } from '../hooks/useFetch';
import { RoomCard } from '../components/RoomCard';
import { BookingModal, type BookingDraft } from '../components/BookingModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { Alert, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';

function RoomFormModal({
  room,
  open,
  onClose,
  onSaved,
}: {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { name, capacity: capacity === '' ? NaN : Number(capacity) };
      if (room) await api(`/rooms/${room.id}`, { method: 'PUT', body });
      else await api('/rooms', { method: 'POST', body });
      toast.success(room ? 'Room updated' : 'Room created');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={room ? 'Edit room' : 'New room'} width="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name">
          {(p) => (
            <input {...p} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          )}
        </Field>
        <Field label="Capacity" hint="Number of seats">
          {(p) => (
            <input
              {...p}
              type="number"
              min={1}
              step={1}
              className={inputClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          )}
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {room ? 'Save changes' : 'Create room'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Rooms() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data, error, loading, reload } = useFetch(() => api<{ rooms: Room[] }>('/rooms'), []);
  const [booking, setBooking] = useState<BookingDraft | null>(null);
  const [lastDraft, setLastDraft] = useState<BookingDraft | null>(null);
  const [editing, setEditing] = useState<Room | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);

  const rooms = data?.rooms ?? [];
  const openBooking = (room: Room) => {
    const d = makeDraft(room.id);
    setLastDraft(d);
    setBooking(d);
  };

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="mt-1 text-sm text-ink-2">Pick a room to see its day or book it now.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />
            New room
          </Button>
        )}
      </header>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<DoorOpen className="size-6" />}
          title="Your workspace has no meeting rooms yet."
          body={isAdmin ? 'Add the first room so people can start booking.' : 'Ask an administrator to add one.'}
          action={isAdmin ? <Button onClick={() => setEditing('new')}>New room</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((r, i) => (
            <RoomCard
              key={r.id}
              room={r}
              index={i}
              onBook={openBooking}
              onEdit={isAdmin ? setEditing : undefined}
              onDelete={isAdmin ? setDeleting : undefined}
            />
          ))}
        </ul>
      )}

      {lastDraft && (
        <BookingModal
          open={booking !== null}
          onClose={() => setBooking(null)}
          rooms={rooms}
          draft={lastDraft}
          onChanged={reload}
        />
      )}

      <RoomFormModal
        key={editing === 'new' ? 'new' : (editing?.id ?? 'none')}
        room={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? 'room'}?`}
        body="This also removes every booking for the room. It cannot be undone."
        confirmLabel="Delete room"
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/rooms/${deleting.id}`, { method: 'DELETE' });
          toast.success('Room deleted');
          reload();
        }}
      />
    </>
  );
}
