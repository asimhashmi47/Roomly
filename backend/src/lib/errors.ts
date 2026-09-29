export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BOOKING_CONFLICT'
  | 'INTERNAL_ERROR';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BOOKING_CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.statusCode = STATUS[code];
  }
}

export const validationError = (m: string) => new AppError('VALIDATION_ERROR', m);
export const notFound = (what: string) => new AppError('NOT_FOUND', `${what} not found.`);
export const forbidden = (m = 'You do not have permission to do that.') =>
  new AppError('FORBIDDEN', m);
export const unauthorized = (m = 'Authentication required.') => new AppError('UNAUTHORIZED', m);
export const bookingConflict = () =>
  new AppError('BOOKING_CONFLICT', 'The room is already booked for the selected time.');
