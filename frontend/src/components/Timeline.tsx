import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import type { Booking } from '../lib/types';
import { fmtTime, isSameDay } from '../lib/time';

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;
const ROW = 64; // px per hour

interface Props {
  day: Date;
  bookings: Booking[];
  userId: string;
  isAdmin: boolean;
  onSlotClick: (hour: number) => void;
  onDelete: (booking: Booking) => void;
}

const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const label = (h: number) => `${String(h).padStart(2, '0')}:00`;

function minutesFromDayStart(iso: string, day: Date) {
  const d = new Date(iso);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), DAY_START_HOUR);
  return (d.getTime() - dayStart.getTime()) / 60000;
}

export function Timeline({ day, bookings, userId, isAdmin, onSlotClick, onDelete }: Props) {
  const now = new Date();
  const today = isSameDay(day, now);
  const totalMin = (DAY_END_HOUR - DAY_START_HOUR) * 60;
  const nowMin = today ? minutesFromDayStart(now.toISOString(), day) : -1;

  return (
    <div className="relative rounded-2xl border border-line bg-surface shadow-card">
      <ol aria-label="Hourly slots">
        {hours.map((h, i) => {
          const isPast = today && h < now.getHours();
          return (
            <li key={h} style={{ height: ROW }} className="flex">
              <div className="w-16 shrink-0 pt-2 pr-3 text-right font-mono text-xs text-muted tabular-nums">
                {label(h)}
              </div>
              <button
                onClick={() => onSlotClick(h)}
                disabled={isPast}
                aria-label={`Book ${label(h)}`}
                className={`group flex flex-1 items-start justify-end border-l border-line px-3 pt-2 text-xs font-medium text-primary-ink transition-colors duration-150 focus-visible:-outline-offset-2 ${
                  i > 0 ? 'border-t border-t-line' : ''
                } ${isPast ? 'cursor-not-allowed bg-sunken/60' : 'hover:bg-primary-soft/60'}`}
              >
                {!isPast && (
                  <span className="hidden items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:flex">
                    <Plus className="size-3.5" aria-hidden />
                    Book {label(h)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Blocks are positioned over the grid; the left gutter (w-16) stays clear. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 left-16">
        <AnimatePresence>
          {bookings.map((b) => {
            const start = Math.max(0, minutesFromDayStart(b.startTime, day));
            const end = Math.min(totalMin, minutesFromDayStart(b.endTime, day));
            if (end <= 0 || start >= totalMin) return null;
            const mine = b.createdBy === userId;
            const canDelete = mine || isAdmin;
            const height = ((end - start) / 60) * ROW;
            return (
              <motion.div
                key={b.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                style={{ top: (start / 60) * ROW + 2, height: height - 4 }}
                className={`pointer-events-auto absolute right-2 left-2 flex items-start justify-between gap-2 overflow-hidden rounded-lg border px-3 py-1.5 ${
                  mine
                    ? 'border-primary/30 bg-primary-soft text-primary-ink'
                    : 'border-accent/20 bg-accent-soft text-accent-ink'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm leading-tight font-semibold">{b.title}</p>
                  <p className="truncate text-xs opacity-90">
                    {fmtTime(b.startTime)} to {fmtTime(b.endTime)} · {mine ? 'You' : b.creatorName}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => onDelete(b)}
                    aria-label={`Cancel booking ${b.title}`}
                    className="grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-white/70"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {today && nowMin > 0 && nowMin < totalMin && (
          <div
            aria-hidden
            className="absolute right-0 left-0 z-10 flex items-center"
            style={{ top: (nowMin / 60) * ROW }}
          >
            <span className="-ml-1 size-2 rounded-full bg-danger" />
            <span className="h-px flex-1 bg-danger" />
          </div>
        )}
      </div>
    </div>
  );
}
