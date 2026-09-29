import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api, ApiError, errorMessage } from '../lib/api';
import type { Booking, Room } from '../lib/types';
import {
  addDays,
  fmtDuration,
  fmtTime,
  fromInputs,
  startOfDay,
  toDateInput,
} from '../lib/time';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Field, inputClass } from './ui/Field';
import { Alert } from './ui/Feedback';

const MAX_MS = 4 * 60 * 60 * 1000;

export interface BookingDraft {
  roomId: string;
  date: string;
  start: string;
  end: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  draft: BookingDraft;
  /** Called after a successful booking, and after a 409 so the caller can refresh its schedule. */
  onChanged: () => void;
}

export function BookingModal({ open, onClose, rooms, draft, onChanged }: Props) {
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState(draft.roomId);
  const [date, setDate] = useState(draft.date);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [dayBookings, setDayBookings] = useState<Booking[] | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [touched, setTouched] = useState(false);

  // Reset to the requested draft each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setRoomId(draft.roomId);
    setDate(draft.date);
    setStart(draft.start);
    setEnd(draft.end);
    setServerError(null);
    setConflict(false);
    setTouched(false);
  }, [open, draft]);

  // Load the chosen day so availability can be previewed. This is a hint, not a reservation.
  useEffect(() => {
    if (!open || !roomId || !date) return;
    let cancelled = false;
    const from = startOfDay(new Date(`${date}T00:00:00`));
    setCheckFailed(false);
    api<{ bookings: Booking[] }>(`/rooms/${roomId}/bookings`, {
      query: { from: from.toISOString(), to: addDays(from, 1).toISOString() },
    })
      .then((r) => !cancelled && setDayBookings(r.bookings))
      .catch(() => !cancelled && (setDayBookings(null), setCheckFailed(true)));
    return () => {
      cancelled = true;
    };
  }, [open, roomId, date, refreshKey]);

  const range = useMemo(() => {
    if (!date || !start || !end) return null;
    const s = fromInputs(date, start);
    const e = fromInputs(date, end);
    return Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) ? null : { s, e };
  }, [date, start, end]);

  const errors = {
    title: !title.trim() ? 'Give the meeting a title.' : title.length > 120 ? 'Keep the title under 120 characters.' : null,
    time: !range
      ? 'Choose a date and both times.'
      : range.e <= range.s
        ? 'End time must be after start time.'
        : range.e.getTime() - range.s.getTime() > MAX_MS
          ? 'Bookings can be at most 4 hours long.'
          : range.s < new Date()
            ? 'That start time has already passed.'
            : null,
  };

  const clash = useMemo(() => {
    if (!range || errors.time || !dayBookings) return null;
    return (
      dayBookings.find(
        (b) => new Date(b.startTime) < range.e && range.s < new Date(b.endTime),
      ) ?? null
    );
  }, [range, errors.time, dayBookings]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errors.title || errors.time || !range) return;
    setSubmitting(true);
    setServerError(null);
    setConflict(false);
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          roomId,
          title: title.trim(),
          startTime: range.s.toISOString(),
          endTime: range.e.toISOString(),
        },
      });
      toast.success('Room booked', { description: `${fmtTime(range.s)} to ${fmtTime(range.e)}` });
      onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        // Lost the race: keep every field, explain, and refresh what is actually free.
        setConflict(true);
        setRefreshKey((k) => k + 1);
        onChanged();
        toast.warning('That time was just taken');
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const status = errors.time
    ? null
    : clash
      ? ('busy' as const)
      : dayBookings
        ? ('free' as const)
        : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Book a room"
      description="Pick a room and time. The server confirms availability when you book."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Meeting title" error={touched ? errors.title : null}>
          {(p) => (
            <input
              {...p}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint planning"
              maxLength={130}
              autoFocus
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room">
            {(p) => (
              <select
                {...p}
                className={inputClass}
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setConflict(false);
                }}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · seats {r.capacity}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Date">
            {(p) => (
              <input
                {...p}
                type="date"
                className={inputClass}
                value={date}
                min={toDateInput(new Date())}
                onChange={(e) => {
                  setDate(e.target.value);
                  setConflict(false);
                }}
              />
            )}
          </Field>
          <Field label="Start time">
            {(p) => (
              <input
                {...p}
                type="time"
                step={900}
                className={inputClass}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setConflict(false);
                }}
              />
            )}
          </Field>
          <Field label="End time">
            {(p) => (
              <input
                {...p}
                type="time"
                step={900}
                className={inputClass}
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setConflict(false);
                }}
              />
            )}
          </Field>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          {errors.time && (
            <p className="flex items-center gap-2 text-[13px] text-danger-ink">
              <XCircle className="size-4 shrink-0" aria-hidden />
              {errors.time}
            </p>
          )}
          {!errors.time && range && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {fmtDuration(range.e.getTime() - range.s.getTime())}
              </span>
              {status === 'free' && (
                <span className="inline-flex items-center gap-1.5 font-medium text-ok-ink">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Looks free right now
                </span>
              )}
              {status === 'busy' && clash && (
                <span className="inline-flex items-center gap-1.5 font-medium text-danger-ink">
                  <XCircle className="size-4" aria-hidden />
                  Overlaps {clash.title}, {fmtTime(clash.startTime)} to {fmtTime(clash.endTime)}
                </span>
              )}
              {checkFailed && <span>Could not check availability. You can still try to book.</span>}
            </div>
          )}

          {conflict && (
            <Alert tone="warn" title="Someone else just booked this room for that time.">
              Your details are still here. Choose another time and book again.
            </Alert>
          )}
          {serverError && <Alert tone="danger">{serverError}</Alert>}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Book room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
