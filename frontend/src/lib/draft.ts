import type { BookingDraft } from '../components/BookingModal';
import { addDays, isSameDay, toDateInput } from './time';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** A sensible starting slot: the given hour on `day`, or the next free whole hour if unspecified. */
export function makeDraft(roomId: string, day = new Date(), hour?: number): BookingDraft {
  const now = new Date();
  let date = day;
  let start = hour ?? now.getHours() + 1;
  if (hour === undefined && isSameDay(day, now) && start >= 20) {
    date = addDays(day, 1);
    start = 9;
  }
  if (hour === undefined && !isSameDay(day, now)) start = 9;
  start = Math.min(Math.max(start, 7), 20);
  return { roomId, date: toDateInput(date), start: hh(start), end: hh(start + 1) };
}
