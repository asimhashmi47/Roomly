import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { bookingConflict, forbidden, notFound, validationError } from '../../lib/errors.js';
import { assertValidRange, isoDate } from '../../lib/booking-rules.js';
import { authenticate } from '../../plugins/auth.js';

const createBody = z.object({
  roomId: z.string().min(1, 'Room is required.'),
  title: z.string().trim().min(1, 'Title is required.').max(120, 'Title is too long.'),
  startTime: isoDate,
  endTime: isoDate,
});

const isConstraintError = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003';

function conflict(roomId: string, userId: string): never {
  logger.warn(`Booking conflict: room=${roomId} user=${userId}`);
  throw bookingConflict();
}

export const bookingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.post('/', async (req, reply) => {
    const body = createBody.parse(req.body);
    assertValidRange(body.startTime, body.endTime);

    const [room, user] = await Promise.all([
      prisma.room.findUnique({ where: { id: body.roomId } }),
      prisma.user.findUnique({ where: { id: req.user.id } }),
    ]);
    if (!room) throw notFound('Room');
    if (!user) throw validationError('Your account no longer exists.');

    // UX-only pre-check: a fast, friendly 409 in the common case. It is NOT what prevents
    // double booking - two requests can both pass it. The DB trigger does.
    const overlapping = () =>
      prisma.booking.findFirst({
        where: { roomId: room.id, startTime: { lt: body.endTime }, endTime: { gt: body.startTime } },
        select: { id: true },
      });
    if (await overlapping()) conflict(room.id, user.id);

    try {
      const booking = await prisma.booking.create({
        data: {
          roomId: room.id,
          title: body.title,
          startTime: body.startTime,
          endTime: body.endTime,
          createdBy: user.id,
        },
      });
      await audit({
        userId: user.id,
        action: 'BOOKING_CREATED',
        entityType: 'Booking',
        entityId: booking.id,
        details: `${room.name}: ${booking.title}`,
      });
      return reply.status(201).send({ booking });
    } catch (err) {
      // The race loser lands here: the database rejected the overlapping INSERT.
      // Prisma reports SQLite trigger aborts as a generic constraint error (P2003) without
      // the trigger name, and the room/user were verified above, so re-check the overlap
      // to tell a lost race from anything else.
      if (isConstraintError(err) && (await overlapping())) conflict(room.id, user.id);
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { room: { select: { name: true } } },
    });
    if (!booking) throw notFound('Booking');
    if (req.user.role !== 'ADMIN' && booking.createdBy !== req.user.id) throw forbidden();

    // deleteMany so a concurrent duplicate DELETE cannot throw "record not found".
    const { count } = await prisma.booking.deleteMany({ where: { id: booking.id } });
    if (count === 0) throw notFound('Booking');
    await audit({
      userId: req.user.id,
      action: 'BOOKING_DELETED',
      entityType: 'Booking',
      entityId: booking.id,
      details: `${booking.room.name}: ${booking.title}`,
    });
    return reply.status(204).send();
  });
};
