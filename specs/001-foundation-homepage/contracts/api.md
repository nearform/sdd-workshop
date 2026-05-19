# Phase 1 API Contract — Foundation & Homepage

**Feature**: [../spec.md](../spec.md) · **Plan**: [../plan.md](../plan.md) · **Data model**: [../data-model.md](../data-model.md)
**Date**: 2026-05-09

This contract defines the two HTTP endpoints that ship in Step 1. Both endpoints are mounted under `/api`. Request/response shapes are imported from `@idea-garden/shared` (`packages/shared`) and are not redefined here — what follows is the **wire contract** that consumers can rely on plus the **error shapes** they should handle.

The remaining endpoints in [PRD §2.5](../../../.specify/memory/PRD.md#25-api-step-2-additions) (`GET /api/ideas/:id`, `POST /api/ideas/:id/updates`) belong to Step 2 and are out of scope for this feature.

## Conventions

- **Base URL (dev)**: `http://localhost:3000`
- **All bodies**: JSON (`application/json; charset=utf-8`).
- **Validation**: Inputs are parsed via the shared Zod schemas before any handler logic runs. Validation failures return `400` with the `ApiError` shape below.
- **Errors**: Every non-2xx response is shaped as `ApiError`:
  ```json
  { "error": "<short_machine_code_or_human_message>", "details": <unknown, optional> }
  ```
- **Server-only fields**: `id`, `species`, `stage`, `created_at`, `updated_at` are server-set. The client never sends them.
- **Times**: integers, **unix milliseconds** (`Date.now()`).

## `GET /api/ideas`

Lists every idea in the garden, newest first.

### Request

- Method: `GET`
- Path: `/api/ideas`
- Headers: none required.
- Query parameters: none.
- Body: none.

### Responses

**`200 OK`**

```json
[
  {
    "id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
    "title": "Build an idea garden",
    "description": "A playful CRUD app dressed up as a garden.",
    "species": "oak",
    "stage": 1,
    "created_at": 1746783402123,
    "updated_at": 1746783402123
  }
]
```

- Body type: `Idea[]` (`IdeaListSchema`).
- Empty garden: returns `[]` with `200`. The empty-state UI is the **client's** responsibility (FR-011).
- Order: newest first by `created_at DESC, id DESC`.

**`500 Internal Server Error`**

```json
{ "error": "internal_error" }
```

Returned only if the database read genuinely fails. The handler logs the underlying error server-side; the client surfaces a user-visible message in the grid area (FR-023).

### Idempotency

Yes. Safe to retry. No state change.

### Tested by

- Server contract test: returns `[]` on a fresh DB.
- Server contract test: returns inserted ideas in newest-first order, with all fields present and matching `IdeaListSchema`.
- Server contract test: a SQLite read failure (simulated by closing the DB handle) produces `500` with the `ApiError` shape.
- Client integration test: `apps/web/src/api/ideas.ts` parses the response through `IdeaListSchema` and rejects malformed payloads.

## `POST /api/ideas`

Creates a new idea.

### Request

- Method: `POST`
- Path: `/api/ideas`
- Headers: `Content-Type: application/json`
- Body: `NewIdeaInput`
  ```json
  { "title": "Build an idea garden", "description": "A playful CRUD app." }
  ```
  - `title`: string, **1–80** characters after trimming. Required.
  - `description`: string, **0–500** characters. Optional. `null`, `undefined`, and empty string are equivalent and stored as `null`.

### Responses

**`201 Created`**

```json
{
  "id": "01J9YX0G6Q1A8C5XKHQ2N3R7VB",
  "title": "Build an idea garden",
  "description": "A playful CRUD app.",
  "species": "oak",
  "stage": 1,
  "created_at": 1746783402123,
  "updated_at": 1746783402123
}
```

- Body type: `Idea` (`IdeaSchema`).
- Server fills `id` (ULID), `species` (random from the allowlist), `stage` (`1`), `created_at`, `updated_at` (both equal to insert time).
- `title` is **stored after trim**. The client receives the trimmed value back.
- `Location` header: `/api/ideas/{id}` (set for completeness; no client currently follows it because the detail endpoint ships in Step 2).

**`400 Bad Request`** — validation failure

```json
{
  "error": "validation",
  "details": [
    { "path": ["title"], "message": "String must contain at least 1 character(s)" }
  ]
}
```

Triggered by:
- Missing `title`.
- `title.trim()` length outside 1–80.
- `description` length over 500.
- Body not valid JSON or not an object.

The `details` shape mirrors Zod's `ZodIssue[]` for inline-mapping by the client form.

**`500 Internal Server Error`**

```json
{ "error": "internal_error" }
```

Database insert failures only.

### Idempotency

**Not idempotent** — each successful `POST` creates a new row with a new `id`. The client guards against double-submit at the UI layer (FR-024) by disabling the submit control until the response arrives.

### Tested by

- Server contract test: happy path returns `201` with a body matching `IdeaSchema`, with `stage === 1` and a known-allowlist `species`.
- Server contract test: body with empty title returns `400` and the `details` array contains a Zod issue for `["title"]`.
- Server contract test: body with `title.length === 81` returns `400`.
- Server contract test: body with `description.length === 501` returns `400`.
- Server contract test: body with whitespace-only title (e.g., `"   "`) returns `400` (post-trim length is 0).
- Client component test (`<NewIdeaModal>`): a `400` response with a `details` array surfaces the message inline beside the offending field (FR-015).
- Client integration test: a `201` response prepends a card to the grid and closes the modal (FR-017).

## CORS

In development, the server allows the Vite origin (`http://localhost:5173` by default; configurable via `CORS_ORIGIN` env var) and the methods `GET, POST, OPTIONS`. There is no production CORS policy because production hosting is out of scope.

## Error catalog (shared with the client)

| `error` code     | HTTP | Surface                          |
|------------------|------|----------------------------------|
| `validation`     | 400  | Inline beside the offending form field. |
| `internal_error` | 500  | Banner / toast in the relevant grid or form area. |

The client never assumes "no error means success." It branches on HTTP status, then parses the body through `IdeaSchema` / `IdeaListSchema` (success) or `ApiErrorSchema` (failure). A response that matches neither schema is treated as `internal_error` and surfaced visibly (FR-023, SC-005).
