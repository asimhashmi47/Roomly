import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { AppError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { roomRoutes } from './modules/rooms/routes.js';
import { bookingRoutes } from './modules/bookings/routes.js';
import { adminRoutes } from './modules/audit/routes.js';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  // Global limit is generous; login has its own stricter limit.
  await app.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === 'test' ? 100000 : 300,
    timeWindow: '1 minute',
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => i.message).join(' ');
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message } });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      return reply
        .status(429)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Too many requests. Slow down.' } });
    }
    if (status && status >= 400 && status < 500) {
      return reply
        .status(status)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Bad request.' } });
    }
    logger.error(`Unhandled error on ${req.method} ${req.url}: ${(err as Error).message}`);
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }),
  );

  app.get('/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(roomRoutes, { prefix: '/rooms' });
  await app.register(bookingRoutes, { prefix: '/bookings' });
  await app.register(adminRoutes, { prefix: '/admin' });

  return app;
}
