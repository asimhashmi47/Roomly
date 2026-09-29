import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { makeDraft } from '../lib/draft';
import type { Booking, Room } from '../lib/types';
import { addDays, fmtDay, fmtTime, isSameDay, startOfDay } from '../lib/time';
import { useFetch } from '../hooks/useFetch';
import { Timeline } from '../components/Timeline';
import { BookingModal, type BookingDraft } from '../components/BookingModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { ErrorState, Skeleton } from '../components/ui/Feedback';

export function RoomSchedule() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const room = useFetch(async () => (await api<{ room: Room }>(`/rooms/${id}`)).room, [id]);
  const rooms = useFetch(async () => (await api<{ rooms: Room[] }>('/rooms')).rooms, []);
  const schedule = useFetch(
    async () =>
      (
        await api<{ bookings: Booking[] }>(`/rooms/${id}/bookings`, {
          query: { from: day.toISOString(), to: addDays(day, 1).toISOString() },
        })
      ).bookings,
    [id, day.getTime()],
  );

  const isToday = isSameDay(day, new Date());
  const bookings = schedule.data ?? [];

  if (room.error) {
    return (
      <>
        <BackLink />
        <ErrorState message={room.error} onRetry={room.reload} />
      </>
    );
  }

  return (
    <>
      <BackLink />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {room.data ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">{room.data.name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
                <Users className="size-3.5" aria-hidden />
                Seats {room.data.capacity}
              </p>
            </>
          ) : (
            <Skeleton className="h-12 w-48" />
          )}
        </div>
        <Button onClick={() => setDraft(makeDraft(id, day))} disabled={!room.data || !rooms.data}>
          <Plus className="size-4" aria-hidden />
          Book room
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day">
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setDay(addDays(day, 1))} aria-label="Next day">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setDay(startOfDay(new Date()))} disabled={isToday}>
          Today
        </Button>
        <h2 className="ml-2 text-base font-semibold" aria-live="polite">
          {fmtDay(day)}
        </h2>
      </div>

      {schedule.error ? (
        <ErrorState message="Unable to load the schedule. Please try again." onRetry={schedule.reload} />
      ) : schedule.loading && !schedule.data ? (
        <Skeleton className="h-[52rem] rounded-2xl" />
      ) : (
        <>
          <Timeline
            day={day}
            bookings={bookings}
            userId={user?.id ?? ''}
            isAdmin={user?.role === 'ADMIN'}
            onSlotClick={(h) => setDraft(makeDraft(id, day, h))}
            onDelete={setCancelling}
          />
          {bookings.length === 0 && (
            <p className="mt-3 text-sm text-ink-2">Nothing booked this day. Click any hour to reserve it.</p>
          )}
        </>
      )}

      {draft && rooms.data && (
        <BookingModal
          open
          onClose={() => setDraft(null)}
          rooms={rooms.data}
          draft={draft}
          onChanged={schedule.reload}
        />
      )}

      <ConfirmDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancel this booking?"
        body={
          cancelling
            ? `${cancelling.title}, ${fmtTime(cancelling.startTime)} to ${fmtTime(cancelling.endTime)}. The slot becomes free for others.`
            : ''
        }
        confirmLabel="Cancel booking"
        onConfirm={async () => {
          if (!cancelling) return;
          await api(`/bookings/${cancelling.id}`, { method: 'DELETE' });
          toast.success('Booking cancelled');
          schedule.reload();
        }}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      to="/rooms"
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
    >
      <ChevronLeft className="size-4" aria-hidden />
      All rooms
    </Link>
  );
}
