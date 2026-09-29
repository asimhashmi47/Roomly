import type { LogLevel } from './types.js';
import { prisma } from './prisma.js';

// Console output for operators, plus a DB row so admins can browse logs in the UI.
// Persisting is best-effort: a logging failure must never break a request.
function write(level: LogLevel, message: string) {
  const line = `${new Date().toISOString()} ${level} ${message}`;
  (level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log)(line);
  if (process.env.NODE_ENV === 'test') return;
  prisma.systemLog.create({ data: { level, message } }).catch(() => undefined);
}

export const logger = {
  info: (m: string) => write('INFO', m),
  warn: (m: string) => write('WARN', m),
  error: (m: string) => write('ERROR', m),
};
