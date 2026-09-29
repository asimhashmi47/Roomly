import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarClock, Pencil, Trash2, Users } from 'lucide-react';
import type { Room } from '../lib/types';
import { fmtTime } from '../lib/time';
import { Badge } from './ui/Feedback';
import { Button } from './ui/Button';

interface Props {
  room: Room;
  index: number;
  onBook: (room: Room) => void;
  onEdit?: (room: Room) => void;
  onDelete?: (room: Room) => void;
}

export function RoomCard({ room, index, onBook, onEdit, onDelete }: Props) {
  const busy = room.currentBooking;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: Math.min(index, 8) * 0.03 }}
      className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-shadow duration-200 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">{room.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
            <Users className="size-3.5" aria-hidden />
            Seats {room.capacity}
          </p>
        </div>
        {busy ? (
          <Badge tone="warn" dot>
            In use
          </Badge>
        ) : (
          <Badge tone="ok" dot>
            Free now
          </Badge>
        )}
      </div>

      <p className="mt-4 min-h-10 text-sm text-ink-2">
        {busy ? (
          <>
            <span className="font-medium text-ink">{busy.title}</span> until {fmtTime(busy.endTime)}
          </>
        ) : (
          'No meeting in progress.'
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/rooms/${room.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-medium whitespace-nowrap transition-colors hover:bg-sunken"
        >
          <CalendarClock className="size-4" aria-hidden />
          View schedule
        </Link>
        <Button onClick={() => onBook(room)}>Book room</Button>
        {(onEdit || onDelete) && (
          <div className="ml-auto flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(room)}
                aria-label={`Edit ${room.name}`}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(room)}
                aria-label={`Delete ${room.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}
