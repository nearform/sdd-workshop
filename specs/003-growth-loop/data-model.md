# Phase 1 Data Model — Growth Loop

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)
**Date**: 2026-05-12

This document describes the entities, fields, validation rules, and state transitions for the growth-loop feature. The shared Zod schemas in `packages/shared/src/ideas.schema.ts` are the binding wire contract; the SQLite DDL is the binding storage contract. Where they intersect — field names, ranges, nullability — they are kept aligned by construction (the route handlers `INSERT … VALUES (@field …)` against the Zod-parsed input).

## Entities

### `Idea` — the plant being tended

Inherits the baseline shape from `001-foundation-homepage`. This feature **does not change the column set**; only the meaning of `stage` and `updated_at` evolves.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT (ULID, 26 chars) | PRIMARY KEY | Stable for lifetime. Assigned by `POST /api/ideas`. |
| `title` | TEXT | NOT NULL; length 1–80 after trim | User-editable via `PATCH /api/ideas/:id`. |
| `description` | TEXT (nullable) | length 0–500 | User-editable via `PATCH /api/ideas/:id`. Empty string is stored as `NULL`. |
| `species` | TEXT (enum: 'oak') | NOT NULL | Immutable for lifetime. Baseline allowlist; widens with PRD update. |
| `stage` | INTEGER | NOT NULL, 1–16 | **Derived** from `idea_updates.stage_after`; persisted by the server inside every stage-altering transaction (research R1). Clients never write this directly. |
| `created_at` | INTEGER (unix ms) | NOT NULL | Immutable. |
| `updated_at` | INTEGER (unix ms) | NOT NULL | Bumped on **any** mutation of this idea or its updates: `PATCH /api/ideas/:id`, `POST/PATCH/DELETE /api/ideas/:id/updates/...`. |

**Validation rules** (enforced by `IdeaSchema` and `EditIdeaInputSchema`):
- `title.trim().length ∈ [1, 80]` — required.
- `description == null || description.length ∈ [0, 500]` — empty string equivalent to `null`.
- `species ∈ { 'oak' }` — frozen for this feature.
- `stage ∈ [1, 16]`, integer.

**State transitions for `stage`** (server-authoritative, computed inside `runUpdateMutation`):

```
After every insert/edit/delete of a row in idea_updates for this idea:
  ideas.stage = COALESCE((SELECT MAX(stage_after) FROM idea_updates WHERE idea_id = ?), 1)
```

In words: the current stage is **the maximum `stage_after` across remaining updates, or 1 if no updates exist**. Edits to a row's note text leave `stage_after` unchanged, so the recompute is a no-op for those. Inserts always bump `stage` by 1 (capped at 16). Deletes may reduce `stage` if the deleted row was the unique maximum.

### `IdeaUpdate` (a.k.a. "watering") — one entry in an idea's history

New entity introduced by this feature.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT (ULID, 26 chars) | PRIMARY KEY | Assigned by `POST /api/ideas/:id/updates`. |
| `idea_id` | TEXT | NOT NULL; FK → `ideas(id)` ON DELETE CASCADE | Cascade deletes are how `DELETE /api/ideas/:id` cleans up history (research R8). |
| `note` | TEXT | NOT NULL; length 1–1000 after trim | User-editable via `PATCH /api/ideas/:id/updates/:updateId`. Newlines preserved (rendered with `white-space: pre-wrap`). |
| `stage_after` | INTEGER | NOT NULL, 1–16 | The stage the idea reached **because of this update**. Computed at insert time; **never mutated** by an edit (FR-021). May be re-rendered as the current idea stage if it equals `max(stage_after)`. |
| `created_at` | INTEGER (unix ms) | NOT NULL | Immutable. ULID `id` is also time-ordered, so `created_at DESC, id DESC` and `id DESC` produce the same order. |

**Validation rules** (enforced by `IdeaUpdateSchema`, `NewIdeaUpdateInputSchema`, `EditIdeaUpdateInputSchema`):
- `note.trim().length ∈ [1, 1000]` — required.
- Multiline allowed (newline characters preserved).
- `stage_after ∈ [1, 16]`, integer — set by server only; clients never send it.
- `id`, `idea_id`, `created_at` — server-set; clients never send them.

**`stage_after` computation at insert time** (inside `runUpdateMutation`, before the recompute of `ideas.stage`):

```
new.stage_after = MIN(COALESCE(MAX(prior stage_after), 1) + 1, 16)
```

Equivalently: each watering advances the idea's **current stage** by exactly 1, capped at 16. The empty-set base case is **1**, not 0.

**Adopted rule (FR-016 — revised 2026-05-12)**:
- New idea, zero updates → `ideas.stage = 1` (baseline).
- First update → `stage_after = 2` → `ideas.stage = max(2) = 2`. *(The first watering bumps a fresh idea from Level 1 to Level 2.)*
- Second update → `stage_after = 3` → `ideas.stage = 3`.
- ...
- Fifteenth update → `stage_after = 16` → `ideas.stage = 16`. *(Bloomed at the fifteenth watering.)*
- Sixteenth update onward → `stage_after = 16` (capped) → `ideas.stage = 16`.

**Why the change**: The original reading ("first watering = stage 1, plant image doesn't move") confused users — the act of watering visibly produced no change. The revised rule makes "N waterings → Level N+1" the rule of thumb, which matches the way the rest of the UI talks about levels (the modal header shows `Level N`, the grid card shows `Level N`, and incrementing on every watering keeps the metaphor honest).

## Relationships

```
ideas (1) ───< (N) idea_updates
   id           idea_id (FK, CASCADE)
```

- **One-to-many**: each idea owns any number of updates (0 to thousands, though in practice ≤ ~50 per idea).
- **Cascade delete**: deleting an idea removes its updates in one statement.
- **No back-references**: `idea_updates` has no `next_update_id` / `prev_update_id` linked list. The chronological order is derived from `created_at` (and tiebroken by `id`), which is ULID-monotonic by construction.

## SQLite DDL (additive)

The baseline `ideas` table DDL (in `apps/server/src/db.ts`) is **unchanged**. The new `idea_updates` table is created on server boot with `CREATE TABLE IF NOT EXISTS`:

```sql
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
```

**Notes on the DDL**:
- `ON DELETE CASCADE` requires `PRAGMA foreign_keys = ON`, which baseline `openDb()` already sets.
- The composite index on `(idea_id, created_at DESC)` covers the timeline read query: `SELECT … FROM idea_updates WHERE idea_id = ? ORDER BY created_at DESC, id DESC`.
- No `updated_at` column on `idea_updates` — note edits are rare and we do not surface "last edited" timestamps to the user. The spec is silent on this; KISS wins.
- No CHECK on `note.trim().length` — SQLite cannot easily express trim semantics in a CHECK. The trim happens in the Zod schema before insert.

## Prepared statements (server-side)

Added to the existing `AppDb` shape in `apps/server/src/db.ts`:

```ts
type AppDb = {
  // baseline...
  selectAllIdeas: Database.Statement<unknown[], IdeaRow>;
  insertIdea: Database.Statement<[IdeaRow]>;

  // new for growth-loop
  selectIdeaById: Database.Statement<[string], IdeaRow | undefined>;
  selectUpdatesForIdea: Database.Statement<[string], IdeaUpdateRow>;
  insertUpdate: Database.Statement<[IdeaUpdateRow]>;
  updateUpdateNote: Database.Statement<{ id: string; note: string }>;
  deleteUpdate: Database.Statement<[string]>;
  updateIdeaMeta: Database.Statement<{ id: string; title: string; description: string | null; updated_at: number }>;
  recomputeIdeaStage: Database.Statement<{ id: string; updated_at: number }>;
  deleteIdea: Database.Statement<[string]>;

  // transactional helper (research R3)
  runUpdateMutation<T>(ideaId: string, fn: (tx: TxHandle) => T): T;

  close(): void;
};
```

Where:
- `recomputeIdeaStage` runs the `UPDATE ideas SET stage = COALESCE((SELECT MAX(stage_after) …), 1), updated_at = ?` statement.
- `runUpdateMutation` wraps `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` around the caller's `fn` AND a `recomputeIdeaStage(ideaId, now)` call. Throws on either failure; the route handler catches and renders a `500` (or `404` if the idea is gone).

## Wire shapes (linked to `packages/shared/src/ideas.schema.ts`)

New Zod schemas to be added next to the existing `IdeaSchema`:

| Schema | Purpose | Notes |
|---|---|---|
| `IdeaUpdateSchema` | The wire shape of an `idea_updates` row | `{ id, idea_id, note, stage_after, created_at }` |
| `IdeaUpdateListSchema` | `z.array(IdeaUpdateSchema)` | Newest-first ordering is part of the API contract; the schema itself does not enforce it. |
| `NewIdeaUpdateInputSchema` | `POST /api/ideas/:id/updates` body | `{ note: string (1–1000 trimmed) }` |
| `EditIdeaInputSchema` | `PATCH /api/ideas/:id` body | `{ title?: string (1–80 trimmed), description?: string|null (0–500) }` — both optional; at least one MUST be present (Zod `.refine`). |
| `EditIdeaUpdateInputSchema` | `PATCH /api/ideas/:id/updates/:updateId` body | `{ note: string (1–1000 trimmed) }` |
| `IdeaDetailResponseSchema` | `GET /api/ideas/:id` response | `{ idea: Idea, updates: IdeaUpdate[] }` |
| `MutationResponseSchema` | Response envelope for stage-altering mutations | `{ idea: Idea, prev_stage: number, update?: IdeaUpdate }` — `update` present on insert/edit, absent on delete-update and delete-idea. `prev_stage` is the idea's stage *before* this mutation, used by the client to detect the stage-16 transition (research R6). |

The existing `IdeaSchema` is **reused unchanged** for the idea field inside the new responses. No baseline schema is mutated.

## Invariants

1. **`stage ≥ 1` always.** Database CHECK + Zod constraint. An idea with zero updates is at stage 1.
2. **`stage ≤ 16` always.** Database CHECK + Zod constraint + clamp at insert time.
3. **`stage = max(stage_after of remaining updates)`, or `1` if none.** Maintained by `recomputeIdeaStage` inside every stage-altering transaction. Idle reads never violate it because the column is up to date by construction.
4. **An `idea_updates.idea_id` always references an existing `ideas.id`.** Foreign key constraint; orphans cannot exist.
5. **`updated_at` is monotonically non-decreasing for a given idea.** Set to `Date.now()` on every mutation; the database does not enforce monotonicity but the route handlers always use the current wall clock.
6. **`stage_after` is immutable.** Once set, only deleted-with-the-row. The PATCH-update endpoint changes only `note`.

These six invariants are the basis of the four bug-hunt edge cases on the SDD branch (PRD §W.3 / Constitution Principle II):

| Bug-hunt case | Maintained by invariant(s) |
|---|---|
| Empty update note rejected | Zod parse at the boundary (not strictly a data-model invariant, but adjacent) |
| Stage-16 idea receives update → stage stays 16 | Invariant 2 (CHECK + insert-time clamp) |
| Transactional failure mid-update → nothing persists | Invariant 3 (recompute inside same transaction as insert) |
| Rapid double-submit → server-returned stage is monotonic | Invariant 5 + the `BEGIN IMMEDIATE` lock in `runUpdateMutation` (research R3) |
