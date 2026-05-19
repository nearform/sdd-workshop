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

describe('openDb — idea_updates DDL (T007, US-growth-loop)', () => {
  it('creates the idea_updates table on first boot', () => {
    const db = openDb(join(tempDir, 'fresh.db'));
    try {
      const row = db.raw
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'idea_updates'")
        .get() as { name?: string } | undefined;
      expect(row?.name).toBe('idea_updates');
    } finally {
      db.close();
    }
  });

  it('enables PRAGMA foreign_keys = ON', () => {
    const db = openDb(join(tempDir, 'fresh.db'));
    try {
      const row = db.raw.pragma('foreign_keys', { simple: true });
      expect(row).toBe(1);
    } finally {
      db.close();
    }
  });

  it('creates the composite (idea_id, created_at DESC) index', () => {
    const db = openDb(join(tempDir, 'fresh.db'));
    try {
      const row = db.raw
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_updates_idea_id_created'",
        )
        .get() as { name?: string } | undefined;
      expect(row?.name).toBe('idx_updates_idea_id_created');
    } finally {
      db.close();
    }
  });

  it('cascades delete from ideas to idea_updates', () => {
    const db = openDb(join(tempDir, 'cascade.db'));
    try {
      const ideaId = ulid();
      const now = Date.now();
      db.insertIdea.run({
        id: ideaId,
        title: 'cascaded idea',
        description: null,
        species: 'oak',
        stage: 1,
        created_at: now,
        updated_at: now,
      });
      db.insertUpdate.run({
        id: ulid(),
        idea_id: ideaId,
        note: 'a watering',
        stage_after: 2,
        created_at: now,
      });
      db.insertUpdate.run({
        id: ulid(),
        idea_id: ideaId,
        note: 'another',
        stage_after: 3,
        created_at: now + 1,
      });
      expect(db.selectUpdatesForIdea.all(ideaId)).toHaveLength(2);

      db.deleteIdea.run(ideaId);
      expect(db.selectUpdatesForIdea.all(ideaId)).toHaveLength(0);
      expect(db.selectIdeaById.get(ideaId)).toBeUndefined();
    } finally {
      db.close();
    }
  });
});

describe('runUpdateMutation transactional helper (T007)', () => {
  function seedIdea(db: ReturnType<typeof openDb>): string {
    const id = ulid();
    const now = Date.now();
    db.insertIdea.run({
      id,
      title: 'seeded',
      description: null,
      species: 'oak',
      stage: 1,
      created_at: now,
      updated_at: now,
    });
    return id;
  }

  it('runs fn and recomputes stage inside a single transaction', () => {
    const db = openDb(join(tempDir, 'tx.db'));
    try {
      const ideaId = seedIdea(db);
      const now = Date.now();
      db.runUpdateMutation(ideaId, (tx) => {
        tx.insertUpdate.run({
          id: ulid(),
          idea_id: ideaId,
          note: 'first',
          stage_after: 1,
          created_at: now,
        });
        tx.insertUpdate.run({
          id: ulid(),
          idea_id: ideaId,
          note: 'second',
          stage_after: 2,
          created_at: now + 1,
        });
      });
      expect(db.selectIdeaById.get(ideaId)?.stage).toBe(2);
      expect(db.selectUpdatesForIdea.all(ideaId)).toHaveLength(2);
    } finally {
      db.close();
    }
  });

  it('rolls back when fn throws — neither the update nor the stage change persists', () => {
    const db = openDb(join(tempDir, 'rollback.db'));
    try {
      const ideaId = seedIdea(db);
      const initialStage = db.selectIdeaById.get(ideaId)?.stage;
      const initialCount = db.selectUpdatesForIdea.all(ideaId).length;

      expect(() =>
        db.runUpdateMutation(ideaId, (tx) => {
          tx.insertUpdate.run({
            id: ulid(),
            idea_id: ideaId,
            note: 'should be rolled back',
            stage_after: 5,
            created_at: Date.now(),
          });
          throw new Error('boom');
        }),
      ).toThrow('boom');

      expect(db.selectUpdatesForIdea.all(ideaId).length).toBe(initialCount);
      expect(db.selectIdeaById.get(ideaId)?.stage).toBe(initialStage);
    } finally {
      db.close();
    }
  });

  it('recomputes stage to 1 when no updates remain after a delete', () => {
    const db = openDb(join(tempDir, 'empty-recompute.db'));
    try {
      const ideaId = seedIdea(db);
      const upId = ulid();
      db.runUpdateMutation(ideaId, (tx) => {
        tx.insertUpdate.run({
          id: upId,
          idea_id: ideaId,
          note: 'first',
          stage_after: 4,
          created_at: Date.now(),
        });
      });
      expect(db.selectIdeaById.get(ideaId)?.stage).toBe(4);

      db.runUpdateMutation(ideaId, (tx) => {
        tx.deleteUpdate.run(upId);
      });
      expect(db.selectIdeaById.get(ideaId)?.stage).toBe(1);
    } finally {
      db.close();
    }
  });

  it('two sequential mutations produce monotonic stage (BEGIN IMMEDIATE serialises)', () => {
    const db = openDb(join(tempDir, 'sequential.db'));
    try {
      const ideaId = seedIdea(db);

      const firstStage = db.runUpdateMutation(ideaId, (tx) => {
        const max = tx.selectMaxStageAfter.get(ideaId)?.max_stage ?? 0;
        const next = Math.min(max + 1, 16);
        tx.insertUpdate.run({
          id: ulid(),
          idea_id: ideaId,
          note: 'a',
          stage_after: next,
          created_at: Date.now(),
        });
        return next;
      });

      const secondStage = db.runUpdateMutation(ideaId, (tx) => {
        const max = tx.selectMaxStageAfter.get(ideaId)?.max_stage ?? 0;
        const next = Math.min(max + 1, 16);
        tx.insertUpdate.run({
          id: ulid(),
          idea_id: ideaId,
          note: 'b',
          stage_after: next,
          created_at: Date.now() + 1,
        });
        return next;
      });

      expect(secondStage).toBe(firstStage + 1);
      expect(db.selectIdeaById.get(ideaId)?.stage).toBe(secondStage);
    } finally {
      db.close();
    }
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
