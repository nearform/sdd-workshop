# Phase 1 API Contract — Growth Loop

**Feature**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Data model**: [../data-model.md](../data-model.md)
**Date**: 2026-05-12

This contract defines the six new HTTP endpoints that ship in the growth-loop feature. All endpoints are mounted under `/api`. Request/response shapes are imported from `@idea-garden/shared` (`packages/shared`) and are not redefined here — what follows is the **wire contract** that consumers rely on plus the **error shapes** they should handle.

The two baseline endpoints (`GET /api/ideas`, `POST /api/ideas`) are documented in [`../../001-foundation-homepage/contracts/api.md`](../../001-foundation-homepage/contracts/api.md) and are **unchanged** by this feature.

## Conventions

- **Base URL (dev)**: `http://localhost:3000`
- **All bodies**: JSON (`application/json; charset=utf-8`).
- **Validation**: Inputs are parsed via the shared Zod schemas before any handler logic runs. Validation failures return `400` with the `ApiError` shape below.
- **Errors**: Every non-2xx response uses `ApiError`:
  ```json
  { "error": "<short_machine_code_or_human_message>", "details": <unknown, optional> }
  ```
- **Server-only fields**: `id`, `species`, `stage`, `created_at`, `updated_at`, `stage_after` are server-set. Clients never send them.
- **Times**: integers, **unix milliseconds** (`Date.now()`).
- **CORS**: dev origin `http://localhost:5173` is allowed for `GET, POST, PATCH, DELETE, OPTIONS` (the baseline allowlist is widened to include `PATCH` and `DELETE` for this feature).

## Endpoint summary

| Method | Path | Body | Response | Purpose |
|---|---|---|---|---|
| `GET` | `/api/ideas/:id` | — | `IdeaDetailResponse` | Open the detail modal: fetch idea + full timeline |
| `PATCH` | `/api/ideas/:id` | `EditIdeaInput` | `MutationResponse` | Edit title and/or description; does **not** change stage |
| `DELETE` | `/api/ideas/:id` | — | `204 No Content` | Permanently delete idea + cascade its updates |
| `POST` | `/api/ideas/:id/updates` | `NewIdeaUpdateInput` | `MutationResponse` | Add a new watering; recomputes stage; fires animation |
| `PATCH` | `/api/ideas/:id/updates/:updateId` | `EditIdeaUpdateInput` | `MutationResponse` | Edit an update's note; `stage_after` unchanged |
| `DELETE` | `/api/ideas/:id/updates/:updateId` | — | `MutationResponse` | Delete an update; may lower stage |

## `GET /api/ideas/:id`

Fetch a single idea and its full timeline.

### Request

- Method: `GET`
- Path: `/api/ideas/:id`
- Path params: `id` — 26-char ULID.
- Body: none.

### Responses

**`200 OK`** — body: `IdeaDetailResponse` (`IdeaDetailResponseSchema`)

```json
{
  "idea": {
    "id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
    "title": "Build an idea garden",
    "description": "A playful CRUD app dressed up as a garden.",
    "species": "oak",
    "stage": 7,
    "created_at": 1746783402123,
    "updated_at": 1746825999000
  },
  "updates": [
    {
      "id": "01K0AB...",
      "idea_id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
      "note": "Wrote the README draft.",
      "stage_after": 7,
      "created_at": 1746825999000
    },
    {
      "id": "01JZZZ...",
      "idea_id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
      "note": "Sketched the logo on paper.\nMight try a watercolor.",
      "stage_after": 6,
      "created_at": 1746812345678
    }
  ]
}
```

- `idea`: the current row as defined by `IdeaSchema`.
- `updates`: zero or more entries, **newest first** by `created_at DESC, id DESC`.
- Empty timeline returns `"updates": []`.

**`404 Not Found`** — idea does not exist:
```json
{ "error": "idea_not_found" }
```

**`400 Bad Request`** — malformed `id` (not 26 chars or non-ULID):
```json
{ "error": "validation", "details": [/* zod issues */] }
```

### Idempotency

Yes. Safe to retry.

### Tested by

- Server contract test: returns the idea + updates in newest-first order; both shapes match the response schema.
- Server contract test: idea with zero updates returns `"updates": []`.
- Server contract test: nonexistent id returns `404` with `error: "idea_not_found"`.
- Server contract test: malformed id (e.g., `"x"`) returns `400` with the validation envelope.
- Client unit test: `useIdeaDetail` hook renders skeletons while in-flight, then the real content on success, and an error surface on 404.

## `PATCH /api/ideas/:id`

Edit an idea's title and/or description. **Does not** change stage; does **not** create a timeline entry; does **not** play any animation.

### Request

- Method: `PATCH`
- Path: `/api/ideas/:id`
- Headers: `Content-Type: application/json`
- Body: `EditIdeaInput` (at least one of `title` or `description` must be present)
  ```json
  { "title": "Idea Garden (renamed)", "description": "Now with growth animation." }
  ```
  - `title` (optional): 1–80 chars after trim.
  - `description` (optional): `string|null`. `null` and `""` are equivalent and stored as `NULL`. Max 500 chars.
  - At least one of the two must be present (Zod `.refine`); a body with neither field fails validation.

### Responses

**`200 OK`** — body: `MutationResponse` (`MutationResponseSchema`)

```json
{
  "idea": { /* full updated Idea row */ },
  "prev_stage": 7
}
```

- `idea.stage` is unchanged from the previous read (an edit does not move stage).
- `prev_stage === idea.stage` for this endpoint (no stage transition); the field is present for shape consistency with `POST /:id/updates`.
- `update` is absent from the response (this is an idea-metadata edit, not a timeline mutation).

**`400 Bad Request`** — validation failed:
```json
{ "error": "validation", "details": [/* zod issues */] }
```
Possible reasons: title empty after trim; title > 80 chars; description > 500 chars; both fields missing.

**`404 Not Found`** — idea does not exist:
```json
{ "error": "idea_not_found" }
```

### Idempotency

Yes (with the same body). Safe to retry.

### Tested by

- Server contract test: happy path with both fields → idea reflects both; `updated_at` bumped.
- Server contract test: happy path with title only → only title changes; description preserved.
- Server contract test: happy path with description set to `null` → row stored as NULL; subsequent GET returns `null`.
- Server contract test: empty title → `400 validation`.
- Server contract test: 81-char title → `400 validation`.
- Server contract test: body with neither field → `400 validation`.
- Server contract test: nonexistent id → `404 idea_not_found`.
- Server contract test: editing an idea **does not** add a row to `idea_updates` and **does not** change `ideas.stage`.
- Client unit test: `EditIdeaForm` submits → modal returns to read mode with new values; on `400` the error renders inline below the offending field.

## `DELETE /api/ideas/:id`

Permanently delete an idea and all its updates (cascade).

### Request

- Method: `DELETE`
- Path: `/api/ideas/:id`
- Body: none.

### Responses

**`204 No Content`** — idea was found and deleted. No response body.

**`404 Not Found`** — idea does not exist:
```json
{ "error": "idea_not_found" }
```

### Idempotency

Idempotent **after the first successful call** (subsequent calls return 404, which the client treats as "already gone"). Safe to retry; the client must treat 404 here as success-equivalent.

### Tested by

- Server contract test: happy path → 204, `SELECT * FROM ideas WHERE id = ?` returns nothing, `SELECT * FROM idea_updates WHERE idea_id = ?` returns nothing (cascade verified).
- Server contract test: nonexistent id → `404 idea_not_found`.
- Server contract test: idea with N updates → 204, all N updates cascade-deleted in one statement.
- Client unit test: `ConfirmDeleteDialog` confirmed → `deleteIdea` is called, modal closes, card disappears from grid.
- Client unit test: on `500` the modal stays open and a toast surfaces the error.

## `POST /api/ideas/:id/updates`

Add a new watering. **Transactional**: inserts the update AND recomputes `ideas.stage` in one SQLite transaction.

### Request

- Method: `POST`
- Path: `/api/ideas/:id/updates`
- Headers: `Content-Type: application/json`
- Body: `NewIdeaUpdateInput`
  ```json
  { "note": "Sketched the logo on paper.\nMight try a watercolor." }
  ```
  - `note`: 1–1000 chars after trim. Newlines preserved.

### Responses

**`201 Created`** — body: `MutationResponse`

```json
{
  "idea": { /* full updated Idea row, with new stage */ },
  "prev_stage": 6,
  "update": {
    "id": "01K0AB...",
    "idea_id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
    "note": "Sketched the logo on paper.\nMight try a watercolor.",
    "stage_after": 7,
    "created_at": 1746825999000
  }
}
```

- `idea.stage` reflects the **new** stage after the recompute. Always `prev_stage ≤ idea.stage ≤ 16`. For an idea already at 16, `idea.stage === prev_stage === 16`.
- `update.stage_after === idea.stage` for inserts (the insert is always the new maximum, by definition of `MIN(MAX+1, 16)`).
- `Location: /api/ideas/:id/updates/:updateId` header set.

**`400 Bad Request`** — validation failed (empty note, > 1000 chars):
```json
{ "error": "validation", "details": [/* zod issues */] }
```

**`404 Not Found`** — idea does not exist:
```json
{ "error": "idea_not_found" }
```

**`500 Internal Server Error`** — transaction failure (e.g., disk full, SQLite I/O):
```json
{ "error": "internal_error" }
```
The transaction is rolled back; neither the update nor the stage bump persists.

### Idempotency

**No.** Each POST creates a new update with a new ULID. The client prevents duplicates by disabling the submit button while the request is in flight (FR-013).

### Tested by

- Server contract test: happy path on a stage-3 idea → `stage` becomes 4, `update.stage_after` is 4, `prev_stage` is 3.
- Server contract test: **bug-hunt case 1** — empty note `""` → `400 validation`; nothing persists.
- Server contract test: **bug-hunt case 1b** — whitespace-only note `"   \n"` → `400 validation` (trim is part of the schema).
- Server contract test: **bug-hunt case 2** — stage-16 idea receives an update → `stage` stays 16, `update.stage_after` is 16, `prev_stage === 16`, both `idea` and `update` are in the response.
- Server contract test: **bug-hunt case 3** — transactional failure (simulated by violating an invariant inside `runUpdateMutation`) → response is `500`, no rows added to `idea_updates`, `ideas.stage` unchanged.
- Server contract test: **bug-hunt case 4** — two sequential `POST` calls back-to-back → both succeed, the second one's `idea.stage` equals the first one's `+1` (monotonic). The `BEGIN IMMEDIATE` lock serialises them.
- Server contract test: nonexistent idea → `404 idea_not_found`.
- Client unit test: `UpdateForm` disables submit while request is in flight (no duplicate submits).
- Client unit test: on `400` the error renders inline below the textarea; form text preserved.
- Client unit test: on `201` with `prev_stage < 16 && idea.stage === 16` the `ConfettiBurst` component mounts with `variant: 'bloom'`; on `201` with `prev_stage === 1 && idea.stage === 2` it mounts with `variant: 'firstWatering'`; on intermediate transitions it does not mount.

## `PATCH /api/ideas/:id/updates/:updateId`

Edit the **note** of an existing update. `stage_after` and `created_at` are immutable; the recompute of `ideas.stage` is a no-op (max is unchanged), so this endpoint runs without modifying `ideas.stage`.

### Request

- Method: `PATCH`
- Path: `/api/ideas/:id/updates/:updateId`
- Headers: `Content-Type: application/json`
- Body: `EditIdeaUpdateInput`
  ```json
  { "note": "Sketched the logo on paper, with a watercolor wash." }
  ```
  - `note`: 1–1000 chars after trim.

### Responses

**`200 OK`** — body: `MutationResponse`

```json
{
  "idea": { /* full Idea row, stage unchanged, updated_at bumped */ },
  "prev_stage": 7,
  "update": {
    "id": "01K0AB...",
    "idea_id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
    "note": "Sketched the logo on paper, with a watercolor wash.",
    "stage_after": 7,
    "created_at": 1746825999000
  }
}
```

- `prev_stage === idea.stage` (no transition).
- `update.stage_after` unchanged from before the edit.

**`400 Bad Request`** — validation failed:
```json
{ "error": "validation", "details": [/* zod issues */] }
```

**`404 Not Found`** — idea OR update does not exist:
```json
{ "error": "update_not_found" }
```
(`update_not_found` is used because the path includes both ids; the resource being addressed is the update.)

### Idempotency

Yes (with the same body). Safe to retry.

### Tested by

- Server contract test: happy path → note changes, `stage_after` unchanged, `ideas.stage` unchanged, `ideas.updated_at` bumped.
- Server contract test: empty note → `400 validation`.
- Server contract test: nonexistent update id → `404 update_not_found`.
- Server contract test: update id that belongs to a different idea → `404 update_not_found` (path consistency check).
- Client unit test: `TimelineEntry` edit-mode → Save persists; entry re-renders with new note and the **original** timestamp/badge.

## `DELETE /api/ideas/:id/updates/:updateId`

Delete an update. **Transactional**: removes the row AND recomputes `ideas.stage` (which may drop if the deleted row had the unique maximum `stage_after`).

### Request

- Method: `DELETE`
- Path: `/api/ideas/:id/updates/:updateId`
- Body: none.

### Responses

**`200 OK`** — body: `MutationResponse`

```json
{
  "idea": { /* full Idea row, possibly with lower stage */ },
  "prev_stage": 7
}
```

- `idea.stage` is the recomputed maximum (or 1 if no updates remain).
- `prev_stage` is the idea's stage **before** the deletion.
- `update` is **absent** from the response (the resource is gone).

**`404 Not Found`** — idea OR update does not exist:
```json
{ "error": "update_not_found" }
```

**`500 Internal Server Error`** — transaction failure:
```json
{ "error": "internal_error" }
```

### Idempotency

Idempotent after the first successful call (subsequent calls return 404).

### Tested by

- Server contract test: delete the highest-stage update on a stage-4 idea → `idea.stage` becomes 3, `prev_stage` is 4.
- Server contract test: delete the only remaining update → `idea.stage` becomes 1, `prev_stage` is whatever it was.
- Server contract test: delete a middle update (not the max) → `idea.stage` unchanged, `prev_stage === idea.stage`.
- Server contract test: nonexistent update id → `404 update_not_found`.
- Server contract test: transaction failure inside `runUpdateMutation` → `500`, neither the delete nor the recompute persists.
- Client unit test: `TimelineEntry` delete → entry removed; plant viewport cross-fades if `idea.stage` dropped; level badge updates.

## Error envelope reference

All non-2xx responses use this shape:

```ts
type ApiError = {
  error: string;
  details?: unknown;
};
```

Known `error` values for this feature:

| Code | Meaning | Returned by |
|---|---|---|
| `validation` | Body or path param failed Zod parsing | All endpoints with body or non-trivial path |
| `idea_not_found` | The `:id` path param does not match an existing idea | All endpoints with `:id` |
| `update_not_found` | The `:updateId` does not exist (or belongs to a different idea) | The two endpoints with `:updateId` |
| `internal_error` | Server-side failure (transaction rollback, DB I/O, etc.) | All endpoints, last-resort |

## Client-side consumption

The client uses one centralized `apps/web/src/api/ideas.ts` module (extending the existing baseline). Each new function:

- Constructs the request (URL, method, headers, body).
- On non-2xx: parses the body through `ApiErrorSchema` and throws `ApiClientError(status, error, details)`.
- On 2xx: parses the body through the corresponding response schema (`IdeaDetailResponseSchema` or `MutationResponseSchema`). A parse failure throws `ApiClientError(500, 'Malformed response from server', flattened)`.

This means **every** client mutation either resolves with a fully-typed, schema-validated payload, or rejects with a structured error — exactly the boundary contract the constitution requires.
