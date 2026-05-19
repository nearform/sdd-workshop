import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Species } from '@idea-garden/shared';

// `species` is narrowed to the shared `Species` enum because the only writer
// is the typed POST handler which calls `randomSpecies()` (also typed). The
// shared response schema parses the row again before serialisation, so any
// drift would surface immediately at the boundary.
export type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  species: Species;
  stage: number;
  created_at: number;
  updated_at: number;
};

export type IdeaUpdateRow = {
  id: string;
  idea_id: string;
  note: string;
  stage_after: number;
  created_at: number;
};

export type TxHandle = {
  insertUpdate: Database.Statement<[IdeaUpdateRow]>;
  updateUpdateNote: Database.Statement<{ id: string; note: string }>;
  deleteUpdate: Database.Statement<[string]>;
  selectUpdateById: Database.Statement<[string], IdeaUpdateRow | undefined>;
  selectMaxStageAfter: Database.Statement<[string], { max_stage: number | null } | undefined>;
  selectIdeaById: Database.Statement<[string], IdeaRow | undefined>;
};

export type AppDb = {
  raw: Database.Database;
  selectAllIdeas: Database.Statement<unknown[], IdeaRow>;
  insertIdea: Database.Statement<[IdeaRow]>;
  selectIdeaById: Database.Statement<[string], IdeaRow | undefined>;
  selectUpdatesForIdea: Database.Statement<[string], IdeaUpdateRow>;
  insertUpdate: Database.Statement<[IdeaUpdateRow]>;
  updateUpdateNote: Database.Statement<{ id: string; note: string }>;
  deleteUpdate: Database.Statement<[string]>;
  selectUpdateById: Database.Statement<[string], IdeaUpdateRow | undefined>;
  selectMaxStageAfter: Database.Statement<[string], { max_stage: number | null } | undefined>;
  updateIdeaMeta: Database.Statement<{
    id: string;
    title: string;
    description: string | null;
    updated_at: number;
  }>;
  recomputeIdeaStage: Database.Statement<{ id: string; updated_at: number }>;
  deleteIdea: Database.Statement<[string]>;
  runUpdateMutation<T>(ideaId: string, fn: (tx: TxHandle) => T): T;
  close(): void;
};

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS ideas (
    id          TEXT    PRIMARY KEY,
    title       TEXT    NOT NULL,
    description TEXT,
    species     TEXT    NOT NULL,
    stage       INTEGER NOT NULL DEFAULT 1,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    CHECK (length(title) BETWEEN 1 AND 80),
    CHECK (description IS NULL OR length(description) <= 500),
    CHECK (stage BETWEEN 1 AND 16)
  );

  CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc
    ON ideas(created_at DESC);

  CREATE TABLE IF NOT EXISTS idea_updates (
    id          TEXT    PRIMARY KEY,
    idea_id     TEXT    NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    note        TEXT    NOT NULL,
    stage_after INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    CHECK (length(note) BETWEEN 1 AND 1000),
    CHECK (stage_after BETWEEN 1 AND 16)
  );

  CREATE INDEX IF NOT EXISTS idx_updates_idea_id_created
    ON idea_updates(idea_id, created_at DESC);
`;

export function openDb(dbPath: string = process.env.DB_PATH ?? 'data/garden.db'): AppDb {
  const absolute = resolve(dbPath);
  mkdirSync(dirname(absolute), { recursive: true });
  const raw = new Database(absolute);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.exec(SCHEMA_DDL);

  const selectAllIdeas = raw.prepare(
    `SELECT id, title, description, species, stage, created_at, updated_at
       FROM ideas
       ORDER BY created_at DESC, id DESC`,
  ) as Database.Statement<unknown[], IdeaRow>;

  const insertIdea = raw.prepare(
    `INSERT INTO ideas (id, title, description, species, stage, created_at, updated_at)
     VALUES (@id, @title, @description, @species, @stage, @created_at, @updated_at)`,
  ) as Database.Statement<[IdeaRow]>;

  const selectIdeaById = raw.prepare(
    `SELECT id, title, description, species, stage, created_at, updated_at
       FROM ideas
       WHERE id = ?`,
  ) as Database.Statement<[string], IdeaRow | undefined>;

  const selectUpdatesForIdea = raw.prepare(
    `SELECT id, idea_id, note, stage_after, created_at
       FROM idea_updates
       WHERE idea_id = ?
       ORDER BY created_at DESC, id DESC`,
  ) as Database.Statement<[string], IdeaUpdateRow>;

  const insertUpdate = raw.prepare(
    `INSERT INTO idea_updates (id, idea_id, note, stage_after, created_at)
     VALUES (@id, @idea_id, @note, @stage_after, @created_at)`,
  ) as Database.Statement<[IdeaUpdateRow]>;

  const updateUpdateNote = raw.prepare(
    `UPDATE idea_updates SET note = @note WHERE id = @id`,
  ) as Database.Statement<{ id: string; note: string }>;

  const deleteUpdate = raw.prepare(
    `DELETE FROM idea_updates WHERE id = ?`,
  ) as Database.Statement<[string]>;

  const selectUpdateById = raw.prepare(
    `SELECT id, idea_id, note, stage_after, created_at
       FROM idea_updates
       WHERE id = ?`,
  ) as Database.Statement<[string], IdeaUpdateRow | undefined>;

  const selectMaxStageAfter = raw.prepare(
    `SELECT MAX(stage_after) AS max_stage
       FROM idea_updates
       WHERE idea_id = ?`,
  ) as Database.Statement<[string], { max_stage: number | null } | undefined>;

  const updateIdeaMeta = raw.prepare(
    `UPDATE ideas
       SET title = @title, description = @description, updated_at = @updated_at
       WHERE id = @id`,
  ) as Database.Statement<{
    id: string;
    title: string;
    description: string | null;
    updated_at: number;
  }>;

  const recomputeIdeaStage = raw.prepare(
    `UPDATE ideas
       SET stage = COALESCE((SELECT MAX(stage_after) FROM idea_updates WHERE idea_id = @id), 1),
           updated_at = @updated_at
       WHERE id = @id`,
  ) as Database.Statement<{ id: string; updated_at: number }>;

  const deleteIdea = raw.prepare(
    `DELETE FROM ideas WHERE id = ?`,
  ) as Database.Statement<[string]>;

  const tx: TxHandle = {
    insertUpdate,
    updateUpdateNote,
    deleteUpdate,
    selectUpdateById,
    selectMaxStageAfter,
    selectIdeaById,
  };

  function runUpdateMutation<T>(ideaId: string, fn: (tx: TxHandle) => T): T {
    raw.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(tx);
      recomputeIdeaStage.run({ id: ideaId, updated_at: Date.now() });
      raw.exec('COMMIT');
      return result;
    } catch (err) {
      raw.exec('ROLLBACK');
      throw err;
    }
  }

  return {
    raw,
    selectAllIdeas,
    insertIdea,
    selectIdeaById,
    selectUpdatesForIdea,
    insertUpdate,
    updateUpdateNote,
    deleteUpdate,
    selectUpdateById,
    selectMaxStageAfter,
    updateIdeaMeta,
    recomputeIdeaStage,
    deleteIdea,
    runUpdateMutation,
    close() {
      raw.close();
    },
  };
}
