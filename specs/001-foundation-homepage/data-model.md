# Phase 1 Data Model — Foundation & Homepage

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)
**Date**: 2026-05-09

The Step 1 baseline introduces exactly **one** entity: `Idea`. The schema below is also the schema that lives on `master` for the rest of the workshop — Step 2 adds an `idea_updates` table (PRD §2.4) but does **not** alter `ideas`.

## Entity: Idea

A single planted thought.

### Fields

| Field         | Type                       | Source        | Validation rule                                                                 |
|---------------|----------------------------|---------------|----------------------------------------------------------------------------------|
| `id`          | string (ULID, 26 chars)    | server        | Server-generated via `ulid()`. Opaque to the client.                             |
| `title`       | string                     | client input  | Required. Length **1–80** characters **after trimming**. Whitespace-only rejected. |
| `description` | string · null              | client input  | Optional. If provided, length **0–500** characters. `null` and empty string are equivalent and stored as `null`. |
| `species`     | string (enum)              | server        | The species allowlist for Step 1 is exactly **`['oak']`** (see R1). Even though only one species ships now, the column and enum are introduced from day one so Step 2 (or a future PRD update) can broaden the allowlist without a migration. Assigned at creation, never changes. |
| `stage`       | integer                    | server        | **1–16**. Always `1` in this feature. Step 2 is the only thing that mutates this. |
| `created_at`  | integer (unix ms)          | server        | Server-set on insert. Never mutates.                                             |
| `updated_at`  | integer (unix ms)          | server        | Server-set on insert; equals `created_at` until Step 2 starts mutating it.       |

### Relationships

None in Step 1. Step 2 adds `idea_updates.idea_id → ideas.id` with `ON DELETE CASCADE`.

### State transitions

None in Step 1. `stage` is fixed at `1`. `species` is set once and immutable. `updated_at` is written once at insert and stays equal to `created_at` until Step 2 starts updating it.

### Invariants

1. `title.trim().length` is always between 1 and 80 inclusive.
2. `description` is either `null` or a string between 0 and 500 characters inclusive.
3. `species` is always one of the values in the allowlist.
4. `stage` is always between 1 and 16 inclusive (and always exactly `1` in Step 1's writes).
5. `updated_at >= created_at` always.
6. `id` uniquely identifies an `Idea` for the lifetime of the database.

### Ordering

The homepage lists ideas **newest first**. With ULIDs, this is `ORDER BY id DESC` (lexicographic), which is equivalent to `ORDER BY created_at DESC` because of the ULID prefix. The implementation uses `ORDER BY created_at DESC, id DESC` to remain correct even if `id`s collide on the same millisecond.

## Storage — SQLite DDL

```sql
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

CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON ideas(created_at DESC);
```

The `idx_ideas_created_at_desc` index is created in Step 1 even though listing 200 rows would scan fast enough without it; keeping it now makes the Step-2 update endpoint (which mutates `updated_at` and may want to filter on it) a non-event.

The DDL above is executed by `apps/server/src/db.ts` at startup using `db.exec(...)` once. There is no migration tooling.

## Schema (Zod) — `packages/shared`

The Zod source of truth lives in `packages/shared/src/ideas.schema.ts`. Pseudocode shape (final implementation will of course be the actual TypeScript file):

```ts
// Step 1 ships with a single species. The enum is intentionally narrow so
// the allowlist can be widened later without a schema migration; see R1.
export const SpeciesSchema = z.enum(['oak']);

export const IdeaSchema = z.object({
  id: z.string().length(26),
  title: z.string().min(1).max(80),
  description: z.string().max(500).nullable(),
  species: SpeciesSchema,
  stage: z.number().int().min(1).max(16),
  created_at: z.number().int().nonnegative(),
  updated_at: z.number().int().nonnegative(),
});

export const IdeaListSchema = z.array(IdeaSchema);

export const NewIdeaInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullish().transform(v => (v && v.length > 0 ? v : null)),
});

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});

export type Idea = z.infer<typeof IdeaSchema>;
export type NewIdeaInput = z.infer<typeof NewIdeaInputSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
```

The same module is imported by:
- `apps/server/src/routes/ideas.ts` — body validation via `fastify-type-provider-zod`.
- `apps/web/src/api/ideas.ts` — parses every fetch response through `IdeaListSchema` / `IdeaSchema` before returning to React.

Hand-mirroring shapes anywhere else is forbidden by Constitution Principle I.

## Mapping requirements → fields

| Spec FR / SC | Field(s) involved |
|---|---|
| FR-014 / FR-018 — title 1–80, description ≤500, inline validation | `title`, `description` schema constraints + Zod `parse` errors mapped to inline messages |
| FR-019 — render plant at stage 1, level indicator | `species`, `stage` |
| FR-020 — species stable | `species` is `NOT NULL` and never written outside the insert path |
| FR-021 — durable persistence | the entire row in SQLite |
| FR-012 — newest first | `created_at` + ordering rule above |
| SC-003 — reload preserves 100% | `id` primary key + the persisted columns |
