import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Tests share one database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
