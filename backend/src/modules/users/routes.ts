import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { Prisma, type User } from '@prisma/client';
import type { Role } from '../../lib/types.js';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../lib/audit.js';
import { notFound, validationError } from '../../lib/errors.js';
import { requireAdmin } from '../../plugins/auth.js';

// Never return passwordHash.
export const toPublicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role as Role,
  createdAt: u.createdAt,
});

const createBody = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(100),
  email: z.string().trim().toLowerCase().email('A valid email is required.'),
  // bcrypt only uses the first 72 bytes.
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  role: z.enum(['ADMIN', 'USER']),
});

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAdmin);

  app.get('/', async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return { users: users.map(toPublicUser) };
  });

  app.post('/', async (req, reply) => {
    const body = createBody.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      const user = await prisma.user.create({
        data: { name: body.name, email: body.email, role: body.role, passwordHash },
      });
      await audit({
        userId: req.user.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: `${user.email} (${user.role})`,
      });
      return reply.status(201).send({ user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw validationError('A user with that email already exists.');
      }
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    if (req.params.id === req.user.id) throw validationError('You cannot delete your own account.');
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('User');
    await prisma.user.delete({ where: { id: user.id } });
    await audit({
      userId: req.user.id,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: user.id,
      details: user.email,
    });
    return reply.status(204).send();
  });
};
