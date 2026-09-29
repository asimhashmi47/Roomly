import { z } from 'zod';
import { validationError } from './errors.js';

export const MAX_BOOKING_MS = 4 * 60 * 60 * 1000;

// All timestamps are ISO-8601 strings with an explicit offset (e.g. "Z") and are
// stored as UTC `timestamptz`. The client converts to/from the user's local zone.
export const isoDate = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO-8601 date-time with timezone.' })
  .transform((s) => new Date(s));

export function assertValidRange(start: Date, end: Date, now = new Date()) {
  if (end <= start) throw validationError('End time must be after start time.');
  if (end.getTime() - start.getTime() > MAX_BOOKING_MS)
    throw validationError('Bookings can be at most 4 hours long.');
  if (start < now) throw validationError('Bookings cannot start in the past.');
}
