import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

// Use non-default ports so the test does not collide with whatever the
// developer happens to have running locally (e.g. a Next.js dev server on
// port 3000 — a real conflict that surfaced during this implementation).
const SERVER_PORT = process.env.E2E_SERVER_PORT ?? '3030';
const WEB_PORT = process.env.E2E_WEB_PORT ?? '5273';
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const DB_PATH = path.join(repoRoot, 'data', 'e2e-garden.db');

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `node --experimental-strip-types ../server/src/index.ts`,
      cwd: path.resolve(__dirname, '../server'),
      url: `${SERVER_URL}/api/ideas`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PORT: SERVER_PORT,
        HOST: '::',
        DB_PATH,
        CORS_ORIGIN: WEB_URL,
      },
    },
    {
      command: `vite --port ${WEB_PORT} --strictPort`,
      cwd: __dirname,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_BASE_URL: SERVER_URL,
      },
    },
  ],
});
