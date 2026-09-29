import type { FastifyRequest } from 'fastify';
import { verifyToken, type AuthUser } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import type { Role } from '../lib/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export async function authenticate(req: FastifyRequest) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const claims = token ? verifyToken(token) : null;
  if (!claims) throw unauthorized('Invalid or missing token.');

  // Trust the database, not the token, for existence and role: a deleted or demoted
  // user loses access immediately instead of when their token expires.
  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, role: true },
  });
  if (!user) throw unauthorized('Account no longer exists.');
  req.user = { id: user.id, role: user.role as Role };
}

export const requireRole = (role: Role) => async (req: FastifyRequest) => {
  await authenticate(req);
  if (req.user.role !== role) throw forbidden();
};

export const requireAdmin = requireRole('ADMIN');
