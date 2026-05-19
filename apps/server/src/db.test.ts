import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ulid } from 'ulid';
import { openDb } from './db.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'idea-garden-db-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('openDb — schema on boot (T036)', () => {
  it('creates the SQLite file when DB_PATH does not exist yet', async () => {
    const dbPath = join(tempDir, 'fresh.db');
    expect(existsSync(dbPath)).toBe(false);
    const db = openDb(dbPath);
    try {
      expect(existsSync(dbPath)).toBe(true);
      const file = await stat(dbPath);
      expect(file.size).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  it('creates the ideas table on first boot (queryable via sqlite_master)', () => {
    const db = openDb(join(tempDir, 'fresh.db'));
    try {
      const row = db.raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ideas'")
        .get() as { name?: string } | undefined;
      expect(row?.name).toBe('ideas');
    } finally {
      db.close();
    }
  });

  it('is idempotent: opening an existing DB does not fail', () => {
    const dbPath = join(tempDir, 'fresh.db');
    const a = openDb(dbPath);
    a.close();
    const b = openDb(dbPath);
    expect(() => b.close()).not.toThrow();
  });
});

describe('openDb — durability across connections (T033, US2)', () => {
  it('preserves inserted ideas with stable species and stage across connection resets', () => {
    const dbPath = join(tempDir, 'persist.db');
    const id = ulid();
    const created_at = Date.now();

    const a = openDb(dbPath);
    a.insertIdea.run({
      id,
      title: 'persisted idea',
      description: 'survives a reopen',
      species: 'oak',
      stage: 1,
      created_at,
      updated_at: created_at,
    });
    a.close();

    const b = openDb(dbPath);
    try {
      const rows = b.selectAllIdeas.all();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id,
        title: 'persisted idea',
        description: 'survives a reopen',
        species: 'oak',
        stage: 1,
        created_at,
        updated_at: created_at,
      });
    } finally {
      b.close();
    }
  });

  it('orders multiple ideas by created_at DESC, id DESC after a connection reset', () => {
    const dbPath = join(tempDir, 'order.db');
    const a = openDb(dbPath);
    const t = Date.now();
    a.insertIdea.run({
      id: ulid(),
      title: 'first',
      description: null,
      species: 'oak',
      stage: 1,
      created_at: t,
      updated_at: t,
    });
    a.insertIdea.run({
      id: ulid(),
      title: 'second',
      description: null,
      species: 'oak',
      stage: 1,
      created_at: t + 10,
      updated_at: t + 10,
    });
    a.close();

    const b = openDb(dbPath);
    try {
      const rows = b.selectAllIdeas.all();
      expect(rows.map((r) => r.title)).toEqual(['second', 'first']);
    } finally {
      b.close();
    }
  });
});
