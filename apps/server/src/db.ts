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

export type AppDb = {
  raw: Database.Database;
  selectAllIdeas: Database.Statement<unknown[], IdeaRow>;
  insertIdea: Database.Statement<[IdeaRow]>;
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

  return {
    raw,
    selectAllIdeas,
    insertIdea,
    close() {
      raw.close();
    },
  };
}
