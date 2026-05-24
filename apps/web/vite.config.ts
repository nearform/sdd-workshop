import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Serve plant sprites from the canonical project-root location:
  //   assets/plants/<species>/stage-NN.svg  →  /plants/<species>/stage-NN.svg
  // Keeping a single source of truth (PRD §5/§6) avoids duplicating sprite files.
  publicDir: path.resolve(__dirname, '../../assets'),
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:4123',
        changeOrigin: true,
      },
    },
    fs: {
      // Allow reading the workspace root so future imports from packages/shared
      // and the assets/ folder resolve cleanly.
      allow: [path.resolve(__dirname, '../..')],
    },
  },
});
