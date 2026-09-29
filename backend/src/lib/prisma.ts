import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// env.DATABASE_URL adds connection_limit=1 for SQLite so writes queue in-process
// instead of failing with "database is locked".
export const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
