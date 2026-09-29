import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin } from '../../plugins/auth.js';

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const auditQuery = pageQuery.extend({
  search: z.string().trim().max(100).optional(),
  action: z.string().max(50).optional(),
});
const logQuery = pageQuery.extend({ level: z.enum(['INFO', 'WARN', 'ERROR']).optional() });

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAdmin);

  app.get('/stats', async () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const [totalRooms, totalUsers, todaysBookings, upcomingBookings, recent] = await Promise.all([
      prisma.room.count(),
      prisma.user.count(),
      prisma.booking.count({ where: { startTime: { gte: startOfDay, lt: endOfDay } } }),
      prisma.booking.count({ where: { startTime: { gt: now } } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { user: { select: { name: true } } },
      }),
    ]);
    return {
      totalRooms,
      totalUsers,
      todaysBookings,
      upcomingBookings,
      recentActivity: recent.map(({ user, ...a }) => ({ ...a, userName: user?.name ?? null })),
    };
  });

  app.get('/audit-logs', async (req) => {
    const { page, pageSize, search, action } = auditQuery.parse(req.query);
    const where = {
      ...(action ? { action } : {}),
      ...(search
        ? {
            OR: [
              { details: { contains: search } },
              { entityType: { contains: search } },
              { user: { name: { contains: search } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true } } },
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      logs: rows.map(({ user, ...a }) => ({ ...a, userName: user?.name ?? null })),
    };
  });

  app.get('/system-logs', async (req) => {
    const { page, pageSize, level } = logQuery.parse(req.query);
    const where = level ? { level } : {};
    const [total, logs] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, logs };
  });
};
