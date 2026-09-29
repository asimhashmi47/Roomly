import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = await buildApp();
await app.listen({ port: env.PORT, host: '0.0.0.0' });
logger.info(`Server listening on port ${env.PORT}`);
