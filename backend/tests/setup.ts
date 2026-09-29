import 'dotenv/config';
import { execSync } from 'node:child_process';

// Tests run against a separate SQLite file because they wipe tables.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('TEST_DATABASE_URL is required to run tests (see .env.example).');
if (testUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');
}
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-thirty-two-chars';

// Idempotent: applies any missing migrations (including the overlap trigger).
execSync('npx prisma migrate deploy', { stdio: 'ignore', env: process.env });
