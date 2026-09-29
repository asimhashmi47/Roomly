import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { notFound, validationError } from '../../lib/errors.js';
import { isoDate } from '../../lib/booking-rules.js';
import { authenticate, requireAdmin } from '../../plugins/auth.js';

const roomBody = z.object({
  name: z.string().trim().min(1, 'Room name is required.').max(100),
  capacity: z
    .number({ invalid_type_error: 'Capacity must be a number.' })
    .int('Capacity must be a whole number.')
    .positive('Capacity must be greater than zero.')
    .max(1000),
});

const rangeQuery = z.object({ from: isoDate, to: isoDate });

export const roomRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: authenticate }, async () => {
    const now = new Date();
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
      include: {
        bookings: {
          where: { startTime: { lte: now }, endTime: { gt: now } },
          select: { title: true, endTime: true },
        },
      },
    });
    return {
      rooms: rooms.map(({ bookings, ...room }) => ({
        ...room,
        currentBooking: bookings[0] ?? null,
      })),
    };
  });

  app.get<{ Params: { id: string } }>('/:id', { preHandler: authenticate }, async (req) => {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw notFound('Room');
    return { room };
  });

  app.get<{ Params: { id: string } }>(
    '/:id/bookings',
    { preHandler: authenticate },
    async (req) => {
      const { from, to } = rangeQuery.parse(req.query);
      if (to <= from) throw validationError('"to" must be after "from".');
      const room = await prisma.room.findUnique({ where: { id: req.params.id } });
      if (!room) throw notFound('Room');
      // Same half-open overlap rule as the DB constraint: start < to AND from < end.
      const bookings = await prisma.booking.findMany({
        where: { roomId: room.id, startTime: { lt: to }, endTime: { gt: from } },
        orderBy: { startTime: 'asc' },
        include: { user: { select: { name: true } } },
      });
      return { bookings: bookings.map(({ user, ...b }) => ({ ...b, creatorName: user.name })) };
    },
  );

  app.post('/', { preHandler: requireAdmin }, async (req, reply) => {
    const body = roomBody.parse(req.body);
    const room = await prisma.room.create({ data: body });
    await audit({
      userId: req.user.id,
      action: 'ROOM_CREATED',
      entityType: 'Room',
      entityId: room.id,
      details: `${room.name} (capacity ${room.capacity})`,
    });
    return reply.status(201).send({ room });
  });

  app.put<{ Params: { id: string } }>('/:id', { preHandler: requireAdmin }, async (req) => {
    const body = roomBody.parse(req.body);
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Room');
    const room = await prisma.room.update({ where: { id: existing.id }, data: body });
    await audit({
      userId: req.user.id,
      action: 'ROOM_UPDATED',
      entityType: 'Room',
      entityId: room.id,
      details: `${room.name} (capacity ${room.capacity})`,
    });
    return { room };
  });

  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const room = await prisma.room.findUnique({ where: { id: req.params.id } });
      if (!room) throw notFound('Room');
      await prisma.room.delete({ where: { id: room.id } });
      await audit({
        userId: req.user.id,
        action: 'ROOM_DELETED',
        entityType: 'Room',
        entityId: room.id,
        details: room.name,
      });
      return reply.status(204).send();
    },
  );
};
