import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { signToken } from '../../lib/auth.js';
import { audit } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { unauthorized } from '../../lib/errors.js';
import { authenticate } from '../../plugins/auth.js';
import { toPublicUser } from '../users/routes.js';
import type { Role } from '../../lib/types.js';

const loginBody = z.object({
  email: z.string().trim().toLowerCase().email('A valid email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (req) => {
      const { email, password } = loginBody.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });
      const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) {
        logger.warn(`Failed login attempt for ${email}`);
        await audit({
          userId: user?.id,
          action: 'LOGIN_FAILED',
          entityType: 'User',
          entityId: user?.id,
          details: email,
        });
        throw unauthorized('Invalid email or password.');
      }
      await audit({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: user.id,
      });
      return { token: signToken({ id: user.id, role: user.role as Role }), user: toPublicUser(user) };
    },
  );

  app.get('/me', { preHandler: authenticate }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw unauthorized('Account no longer exists.');
    return { user: toPublicUser(user) };
  });
};
