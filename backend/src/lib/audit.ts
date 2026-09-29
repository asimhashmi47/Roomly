import { prisma } from './prisma.js';
import { logger } from './logger.js';

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'ROOM_CREATED'
  | 'ROOM_UPDATED'
  | 'ROOM_DELETED'
  | 'BOOKING_CREATED'
  | 'BOOKING_DELETED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED';

interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: string;
}

export async function audit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
      },
    });
  } catch (err) {
    logger.error(`Failed to write audit log: ${(err as Error).message}`);
  }
}
