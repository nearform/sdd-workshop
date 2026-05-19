import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const dbPath = path.join(repoRoot, 'data', 'e2e-garden.db');

export default async function globalSetup() {
  // Delete the e2e SQLite file (and its WAL/SHM sidecars) before the run
  // so the empty-state and persistence assertions start from a known state.
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
}
