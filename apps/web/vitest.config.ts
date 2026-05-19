import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    // Vitest's default include also matches *.spec.ts; exclude the
    // Playwright e2e specs explicitly so unit-test runs don't pick them up.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
  },
});
