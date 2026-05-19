---

description: "Task list for Growth Loop (idea detail modal, watering, edit, delete, animation)"
---

# Tasks: Growth Loop (Idea Detail, Watering, Edit, Delete, Animation)

**Input**: Design documents from `/specs/003-growth-loop/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Tests are **MANDATORY** for this feature per [Constitution Principle II](../../.specify/memory/constitution.md#ii-testing-standards). Every endpoint in [contracts/api.md](./contracts/api.md) gets API contract tests (happy path + at least one validation-error path), every behaviour-owning React component gets a Vitest + RTL unit test, and the **four PRD §W.3 bug-hunt edge cases** (empty note rejected, stage-16 update keeps stage at 16, transactional rollback, rapid-double-submit monotonicity) each get an explicit test inside US1.

**Organization**: Tasks are grouped by user story (P1 → P5 from [spec.md](./spec.md)) so each story can be implemented, tested, and demoed independently. The MVP is **User Story 1 only** — it delivers the headline watering loop end-to-end. US2–US5 layer on edit, bloom celebration, timeline curation, and idea deletion.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5) — only present in user-story phases.
- All file paths are repository-relative (root: `/Users/alfonsograziano/Desktop/code/sdd-workshop/`).

## Path Conventions

Same monorepo layout as the 001-foundation-homepage baseline (no new workspaces, no top-level reorganisation):

- `apps/web/` — React + Vite + TypeScript + Tailwind
- `apps/server/` — Fastify on Node 22+ with native type stripping
- `packages/shared/` — Zod schemas (single source of truth for API shapes)
- `data/garden.db` — SQLite file (gitignored)
- `assets/plants/oak/` — 16-stage PNG sprite sequence (already committed)

---

## Phase 1: Setup (Shared Infrastructure for this feature)

**Purpose**: Wire the small handful of new dependencies and config changes this feature needs. The monorepo, Tailwind theme, Vitest setup, ULID, Fastify, Zod plumbing, and CLAUDE.md pointer all already exist from `001-foundation-homepage`. No story label here per the format rules.

- [ ] T001 Add the growth-loop web dependencies to `apps/web/package.json`: runtime dep `three`; dev dep `@types/three`. (Historically this task also installed `@react-three/fiber`, `@react-three/drei`, and `react-confetti-explosion`. The R3F packages are still in `package.json` but the shipped viewport uses raw `three.js` directly; `react-confetti-explosion` has been fully replaced by `ConfettiBurst.tsx` — see Phase 11 task T088 for the canvas rewrite.) Run `npm install` from the repo root so the lockfile updates across the workspace.
- [ ] T002 Widen the CORS allowlist in `apps/server/src/app.ts` to include the new HTTP methods this feature needs: change `methods: ['GET', 'POST', 'OPTIONS']` to `methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']` (research [R13](./research.md#r13-cors-dev-origin-no-env-additions)).
- [ ] T003 [P] Update `CLAUDE.md` — confirm the pointer between the `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers references `specs/003-growth-loop/plan.md` (already done at the end of `/speckit-plan`; this task simply verifies the pointer is correct after any rebases).

**Checkpoint**: `npm install` resolves; `npm run dev` still starts both apps; `npm test` still passes on the 001 baseline suite. No behaviour change yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the cross-cutting building blocks every user story depends on — the new shared schemas, the `idea_updates` storage layer with its transactional helper, the typed client wrappers for all six endpoints, and the components/hooks that more than one story consumes (`LevelBadge`, `useIdeaDetail`). **No user-story work begins until this phase is complete.**

### Shared schemas

- [ ] T004 [P] Implement the new Zod schemas in `packages/shared/src/ideas.schema.ts` per [data-model.md §Wire shapes](./data-model.md#wire-shapes-linked-to-packagessharedsrcideasschemats):
  - `IdeaUpdateSchema` — id (26-char ULID), idea_id (26-char ULID), note (string, 1–1000), stage_after (int, 1–16), created_at (non-negative int).
  - `IdeaUpdateListSchema` — `z.array(IdeaUpdateSchema)`.
  - `NewIdeaUpdateInputSchema` — `{ note: z.string().trim().min(1).max(1000) }`. Newlines are NOT stripped by `.trim()` (only leading/trailing whitespace), so multi-line notes remain multi-line.
  - `EditIdeaInputSchema` — `{ title?: z.string().trim().min(1).max(80), description?: z.union([z.string().max(500), z.null()]) }` with a `.refine` that at least one of `title` or `description` is present.
  - `EditIdeaUpdateInputSchema` — same shape as `NewIdeaUpdateInputSchema` (just the note).
  - `IdeaDetailResponseSchema` — `{ idea: IdeaSchema, updates: IdeaUpdateListSchema }`.
  - `MutationResponseSchema` — `{ idea: IdeaSchema, prev_stage: StageSchema, update: IdeaUpdateSchema.optional() }`.
  Export inferred types via `z.infer` for each schema. Re-export everything from `packages/shared/src/index.ts`.
- [ ] T005 [P] Schema round-trip tests in `packages/shared/src/ideas.schema.test.ts` (extending the existing test file). Cover the seven new schemas: parse a known-good payload for each, then assert one rejection per invariant — empty note, 1001-char note, description > 500, title 0 or 81 chars, `EditIdeaInputSchema` with neither field present, `MutationResponseSchema` with `update` absent (delete-update / delete-idea / patch-idea shape) and present (insert/patch-update shape).

### Server storage layer

- [ ] T006 Extend `apps/server/src/db.ts` to add the `idea_updates` table, its prepared statements, and the `runUpdateMutation` transactional helper per [data-model.md §SQLite DDL](./data-model.md#sqlite-ddl-additive) and [research R3](./research.md#r3-transactional-helper-shape):
  - Add to `SCHEMA_DDL`: `CREATE TABLE IF NOT EXISTS idea_updates (... ON DELETE CASCADE ...)` and `CREATE INDEX IF NOT EXISTS idx_updates_idea_id_created ON idea_updates(idea_id, created_at DESC)`.
  - Define `IdeaUpdateRow` type matching the row shape.
  - Extend `AppDb` with the prepared statements listed in [data-model.md §Prepared statements](./data-model.md#prepared-statements-server-side): `selectIdeaById`, `selectUpdatesForIdea`, `insertUpdate`, `updateUpdateNote`, `deleteUpdate`, `updateIdeaMeta`, `recomputeIdeaStage`, `deleteIdea`.
  - Add a `runUpdateMutation<T>(ideaId: string, fn: (tx) => T): T` helper that wraps `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` around `fn` PLUS a `recomputeIdeaStage.run({ id: ideaId, updated_at: Date.now() })` call (in that order). The `tx` handle exposes the prepared statements as plain methods (no nested transactions).
  - `runUpdateMutation` returns whatever `fn` returns; the route handlers will return `{ update?, idea: selectIdeaById.get(ideaId) }` from `fn`.
- [ ] T007 [P] DDL + helper tests in `apps/server/src/db.test.ts` (extending the existing test file):
  - `openDb()` against a fresh temp file creates both tables; `PRAGMA foreign_keys` returns `1`; the composite index exists in `sqlite_master`.
  - `runUpdateMutation` runs `fn` and the recompute inside a single transaction; on exception inside `fn`, the row count in `idea_updates` is unchanged and `ideas.stage` is unchanged (rollback verified).
  - `runUpdateMutation` recomputes `ideas.stage` to `max(stage_after)` when at least one update remains, to `1` when none remain.
  - Two `runUpdateMutation` calls fired back-to-back on the same idea (no concurrent threads — just sequential calls) produce monotonic `ideas.stage`; the second sees the first's recompute.

### Client API + hook + reusable components

- [ ] T008 [P] Extend `apps/web/src/api/ideas.ts` with six new typed wrappers, each following the existing baseline pattern (fetch → check status → parse error envelope on non-2xx → parse the response schema on 2xx → throw `ApiClientError` on parse failure):
  - `getIdea(id: string): Promise<IdeaDetailResponse>` → `GET /api/ideas/:id`.
  - `patchIdea(id: string, input: EditIdeaInput): Promise<MutationResponse>` → `PATCH /api/ideas/:id`.
  - `deleteIdea(id: string): Promise<void>` → `DELETE /api/ideas/:id`. Treat 404 as success-equivalent per [contracts/api.md §DELETE /api/ideas/:id](./contracts/api.md#delete-apiideasid).
  - `addUpdate(ideaId: string, input: NewIdeaUpdateInput): Promise<MutationResponse>` → `POST /api/ideas/:id/updates`.
  - `patchUpdate(ideaId: string, updateId: string, input: EditIdeaUpdateInput): Promise<MutationResponse>` → `PATCH /api/ideas/:id/updates/:updateId`.
  - `deleteUpdate(ideaId: string, updateId: string): Promise<MutationResponse>` → `DELETE /api/ideas/:id/updates/:updateId`.
  Each wrapper validates its input locally with the corresponding `*InputSchema.parse` before fetching (mirrors the existing `createIdea`).
- [ ] T009 [P] Implement `useIdeaDetail` hook in `apps/web/src/hooks/useIdeaDetail.ts` per [research R10](./research.md#r10-skeleton-placeholders-for-modal-open): takes an `ideaId | null`; when non-null, calls `getIdea(ideaId)` once and exposes `{ status: 'idle' | 'loading' | 'ready' | 'error' | 'not_found', idea?, updates?, error? }`. On 404 (`ApiClientError.status === 404` or `error === 'idea_not_found'`), sets status to `'not_found'` so the modal can render the friendly "no longer in your garden" message.
- [ ] T010 [P] `useIdeaDetail` tests in `apps/web/src/hooks/useIdeaDetail.test.tsx`: renders skeletons (`status: 'loading'`) while the promise is in flight, resolves to `'ready'` with `idea + updates` on success, resolves to `'not_found'` on 404, resolves to `'error'` on 500. Use `vi.mock('../api/ideas.ts')` to stub `getIdea`.
- [ ] T011 [P] Implement `LevelBadge` component in `apps/web/src/components/LevelBadge.tsx`: pure presentational; renders `"Level N"` for stages 1–15 and `"Fully bloomed"` for stage 16, using the existing `badge-stage` Tailwind token classes from `design.md`. Props: `{ stage: number }`.
- [ ] T012 [P] `LevelBadge` tests in `apps/web/src/components/LevelBadge.test.tsx`: renders `"Level 1"` for stage 1, `"Level 15"` for stage 15, `"Fully bloomed"` for stage 16; applies the `badge-stage` classes consistently.

**Checkpoint**: All six API wrappers are typed and tested through their unit + schema layer. The `idea_updates` table exists on server boot. `runUpdateMutation` is covered by tests including the rollback path. `LevelBadge` and `useIdeaDetail` are ready to compose into any modal. User-story work can begin in parallel.

---

## Phase 3: User Story 1 — Open and water an idea (Priority: P1) 🎯 MVP

**Goal**: Deliver the headline slice — click a card to open the detail modal, see the timeline of past waterings, submit a new watering, watch the 3D growth animation play and the plant advance one stage.

**Independent Test**: On a fresh DB, plant a seed via the existing baseline flow. Click the resulting card. The modal opens; the timeline shows the empty state. Type `"Sketched a first version"` and submit. The growth animation plays for ~2 seconds, the plant texture swaps to stage 2, the level badge updates to "Level 2", and a timeline entry appears at the top with the submitted note. Close the modal; the grid card reflects the new stage. (Maps to spec [User Story 1 acceptance scenarios 1–5](./spec.md#user-story-1---open-an-idea-and-water-it-to-make-it-grow-priority-p1).)

### Server side — first

- [ ] T013 [US1] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `GET /api/ideas/:id` (write these FIRST; they MUST fail before T014 lands): returns `{ idea, updates: [] }` for an idea with no updates; returns `{ idea, updates: [...] }` newest-first when multiple exist; returns `404 { error: 'idea_not_found' }` for an unknown id; returns `400 { error: 'validation' }` for a malformed id (`"x"`). Each test builds a fresh app + temp SQLite per [contracts/api.md §GET /api/ideas/:id](./contracts/api.md#get-apiideasid).
- [ ] T014 [US1] Implement `GET /api/ideas/:id` in `apps/server/src/routes/ideas.ts`: registers `route({ method: 'GET', url: '/api/ideas/:id', schema: { params, response }, handler })`. Handler does `selectIdeaById.get(id)` → 404 on miss → `selectUpdatesForIdea.all(id)` → return `{ idea, updates }` parsed by `IdeaDetailResponseSchema`. Make T013 pass.
- [ ] T015 [US1] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `POST /api/ideas/:id/updates` (write FIRST; FAIL before T016):
  - Happy path on a stage-3 idea → 201, `idea.stage === 4`, `prev_stage === 3`, `update.stage_after === 4`, `Location` header set, `idea.updated_at > created_at`.
  - 404 `idea_not_found` for an unknown idea id.
  - **Bug-hunt case 1**: body `{ note: "" }` → `400 validation`; body `{ note: "   \n   " }` → `400 validation` (trim semantics); body `{ note: "a".repeat(1001) }` → `400 validation`. After each, `SELECT COUNT(*) FROM idea_updates WHERE idea_id = ?` returns the pre-call count (zero rows persisted).
  - **Bug-hunt case 2**: seed an idea at stage 16 (by inserting 16 prior updates), then POST one more → 201, `idea.stage === 16`, `prev_stage === 16`, `update.stage_after === 16`, the new row IS persisted.
  - **Bug-hunt case 3**: simulate a transaction failure (e.g., monkey-patch `db.recomputeIdeaStage.run` to throw once, or pass a stub via dependency injection) → response is 500, `SELECT COUNT(*) FROM idea_updates` is unchanged, `ideas.stage` is unchanged.
  - **Bug-hunt case 4**: two sequential `app.inject()` POSTs against the same idea → both 201, the second's `idea.stage === first.idea.stage + 1` (or both at 16 if capped). The `BEGIN IMMEDIATE` lock in `runUpdateMutation` serialises them.
- [ ] T016 [US1] Implement `POST /api/ideas/:id/updates` in `apps/server/src/routes/ideas.ts`: registers `route({ method: 'POST', url: '/api/ideas/:id/updates', schema: { params, body: NewIdeaUpdateInputSchema, response: { 201: MutationResponseSchema } }, handler })`. Handler checks the idea exists (404 if not), records `prev_stage = idea.stage`, calls `runUpdateMutation(ideaId, (tx) => { const updateRow = { id: ulid(), idea_id: ideaId, note, stage_after: Math.min((maxStageAfter ?? 0) + 1, 16), created_at: Date.now() }; tx.insertUpdate.run(updateRow); return updateRow; })`, then re-reads the idea via `selectIdeaById`, builds and returns `{ idea, prev_stage, update }`, sets `Location` header. Make T015 pass.

### Client side — components, hook, integration

- [ ] T017 [P] [US1] Extend `apps/web/src/hooks/useIdeas.ts` with an `addUpdate(ideaId, input): Promise<{ idea, update, prev_stage }>` method: calls `addUpdate(...)` from the API module; on success, replaces the corresponding idea in the cached list with `result.idea` (so the grid reflects the new stage on modal close); on error, rethrows so the form can render an inline message.
- [ ] T018 [P] [US1] Tests for `useIdeas.addUpdate` in `apps/web/src/hooks/useIdeas.test.tsx` (extending existing file): happy path replaces the idea in the cache; failure leaves the cache untouched and rejects with the original error.
- [ ] T019 [P] [US1] Implement `EmptyTimeline` component in `apps/web/src/components/EmptyTimeline.tsx`: pure presentational; renders the small centred illustration (`<PlantImage species="oak" stage={1} />` per [research R11](./research.md#r11-empty-state-copy-and-illustration-for-the-timeline)), a `headline-sm` line `"No waterings yet"`, a muted `body-sm` line `"Give this idea its first drink"`. No props beyond `className` for layout positioning.
- [ ] T020 [P] [US1] `EmptyTimeline` tests in `apps/web/src/components/EmptyTimeline.test.tsx`: renders the headline string, the muted body string, and the placeholder illustration.
- [ ] T021 [P] [US1] Implement `TimelineEntry` component in `apps/web/src/components/TimelineEntry.tsx` (US1 scope: **read-only**, no edit/delete affordances yet — those are US4): props `{ update: IdeaUpdate }`; renders the note text inside a `whitespace-pre-wrap` block, the relative timestamp from `relativeTime(update.created_at)`, and `<LevelBadge stage={update.stage_after} />`.
- [ ] T022 [P] [US1] `TimelineEntry` (US1) tests in `apps/web/src/components/TimelineEntry.test.tsx`: renders note text with preserved newlines (assert `whitespace-pre-wrap` class on the note container), renders the relative timestamp, renders the correct level badge; renders multi-line text (assert `textContent` includes the newline).
- [ ] T023 [US1] Implement `Timeline` component in `apps/web/src/components/Timeline.tsx`: props `{ updates: IdeaUpdate[] }`; if `updates.length === 0` renders `<EmptyTimeline />`, otherwise renders a `<ol>` of `<TimelineEntry>` items in the given order (caller is responsible for newest-first; the component itself does not sort). Depends on T019 + T021.
- [ ] T024 [US1] `Timeline` tests in `apps/web/src/components/Timeline.test.tsx`: renders the empty state when `updates` is empty; renders one `TimelineEntry` per update in the order received.
- [ ] T025 [P] [US1] Implement `PlantViewport` component in `apps/web/src/components/PlantViewport.tsx` (US1 scope: growth variant only, default green palette). The component renders an `<R3F.Canvas>` with an orthographic camera, a textured plane mesh (the `stage-NN.png` for the current stage), and a particle emitter. It exposes an imperative `playGrowth({ from: number, to: number, palette: 'growth' | 'bloom' }): Promise<void>` via `React.forwardRef` + `useImperativeHandle` — the promise resolves at the end of the animation (1500–2500 ms; tween parameters live as constants at the top of the file). The texture swap fires at ~60% of the animation per [research R9](./research.md#r9-plant-texture-swap-timing-inside-the-growth-animation). For US1 we only ship the `'growth'` palette case; the `'bloom'` palette code path may exist as a TODO/no-op or simply behave like `'growth'` for now (US3 fills it in).
- [ ] T026 [P] [US1] `PlantViewport` tests in `apps/web/src/components/PlantViewport.test.tsx`: use `vi.mock('@react-three/fiber', ...)` to stub `Canvas` and `useFrame`, then assert that calling `playGrowth({ from: 3, to: 4, palette: 'growth' })` resolves within the expected duration (use `vi.useFakeTimers`), advances some internal "current stage" prop on the textured plane, and resolves the returned promise. Real R3F is exercised in the manual quickstart smoke test (§5), not in unit tests.
- [ ] T027 [US1] Implement `UpdateForm` component in `apps/web/src/components/UpdateForm.tsx`: a `<form>` with a multi-line `<textarea>` (rows=3, `1–1000 char` validation via Zod-bound state), a primary submit button, an inline character counter, and an inline error region. Props: `{ onSubmit: (note: string) => Promise<void> }`. On submit: validate, set `loading: true`, disable the button, await `onSubmit`; on resolve, clear the textarea and remove any prior error; on reject, set the inline error message and keep the textarea text intact (FR-013, FR-015).
- [ ] T028 [US1] `UpdateForm` tests in `apps/web/src/components/UpdateForm.test.tsx`: empty submission renders inline validation, never calls `onSubmit`; whitespace-only submission same; 1001-char submission same; valid submission calls `onSubmit` with the trimmed note, then clears the textarea on resolve; on reject, the inline error is rendered and the textarea text is preserved; submit button is disabled while the request is in flight (no double-submit).
- [ ] T029 [US1] Implement `IdeaDetailModal` component in `apps/web/src/components/IdeaDetailModal.tsx`. **US1 scope** — header bar with idea title, idea description, close (X) button; modal body with `PlantViewport` (current stage), `LevelBadge`, the `Timeline`, the `EmptyTimeline` is consumed inside `Timeline`, and the `UpdateForm`. Three-way close (X / Escape / backdrop click). Uses `useIdeaDetail(ideaId)` to fetch detail. While `status === 'loading'`, renders skeleton placeholders for the plant viewport (rounded soft-bordered square) and timeline (three muted bars). Submit handler flow: call the parent-passed `onAddUpdate` (which threads through to `useIdeas.addUpdate`), await the `MutationResponse`, then ref-call `plantViewportRef.current.playGrowth({ from: prev_stage, to: idea.stage, palette: 'growth' })`. While that promise is pending, the modal is FULLY non-interactive (Escape / clicks / backdrop ignored; submit disabled) — implement via an `isAnimating` state that suppresses event handlers. On animation resolve, update local state with the new idea + new update so the timeline and badge re-render.
- [ ] T030 [US1] `IdeaDetailModal` (US1) tests in `apps/web/src/components/IdeaDetailModal.test.tsx`: mocks `useIdeaDetail` and `PlantViewport`; renders skeleton placeholders during the loading state; renders title + description + LevelBadge + Timeline + UpdateForm in the ready state; closes via X click (calls `onClose`); closes on Escape; closes on backdrop click; closes are **suppressed** during `isAnimating` (Escape ignored, X click ignored); submitting a valid update calls the parent `onAddUpdate`, then calls `PlantViewport.playGrowth({ from: prev, to: next, palette: 'growth' })` once.
- [ ] T031 [US1] Wire the modal into `apps/web/src/components/Garden.tsx`: add an `openIdeaId` state; pass an `onOpen(id)` callback down to each `<IdeaCard>`; when `openIdeaId` is non-null, render `<IdeaDetailModal ideaId={openIdeaId} onClose={...} onAddUpdate={ideas.addUpdate} />` alongside the grid.
- [ ] T032 [US1] Make `IdeaCard` clickable in `apps/web/src/components/IdeaCard.tsx`: wrap the card body in a `<button type="button">` (preserves accessibility) or a `<div role="button" tabIndex={0}>`; cursor-pointer; calls the `onOpen(idea.id)` prop on click and on Enter/Space keypress.
- [ ] T033 [US1] Extend `apps/web/src/components/IdeaCard.test.tsx`: clicking the card invokes `onOpen` with the idea id; pressing Enter on the focused card invokes `onOpen`; the card still renders all baseline content unchanged.
- [ ] T034 [US1] Extend `apps/web/src/components/Garden.test.tsx`: clicking a card opens the modal (asserts modal title text appears); closing the modal removes it from the DOM and leaves the grid intact; after submitting an update through the modal, the local idea in the grid reflects the new `stage` (assert the level badge text on the card after close).

**Checkpoint — MVP**: A user can plant a seed (baseline flow), click it, water it, and watch the plant grow through stages 1–15. The four bug-hunt cases pass in the server suite. The animation plays correctly and blocks input. The grid card reflects the new stage on modal close. **This is enough to demo.**

---

## Phase 4: User Story 2 — Edit title and description (Priority: P2)

**Goal**: Add an explicit Edit mode in the modal header so the user can rename an idea and refine its description without disturbing the growth loop.

**Independent Test**: With US1 working, open any idea modal. Click the header "Edit" button. The title and description become editable fields. Change them, click Save. The header returns to read mode with the new values. Refresh the page and confirm the values persist. The level badge is unchanged; the timeline is unchanged; no animation played. (Maps to spec [User Story 2 acceptance scenarios 1–5](./spec.md#user-story-2---refine-an-ideas-title-and-description-without-disturbing-its-growth-priority-p2).)

### Server side

- [ ] T035 [US2] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `PATCH /api/ideas/:id` (write FIRST; FAIL before T036): happy path with both fields → 200, `idea.title` and `idea.description` reflect the request, `idea.updated_at > created_at`, `idea.stage` unchanged, `prev_stage === idea.stage`, response has no `update` field; happy path with title only; happy path with `description: null`; 400 on empty title; 400 on 81-char title; 400 on 501-char description; 400 when both fields are absent; 404 for unknown idea id. **Invariant tests**: `SELECT COUNT(*) FROM idea_updates WHERE idea_id = ?` is unchanged after PATCH; `ideas.stage` is unchanged after PATCH.
- [ ] T036 [US2] Implement `PATCH /api/ideas/:id` in `apps/server/src/routes/ideas.ts`: registers the route with `EditIdeaInputSchema` as the body schema; handler checks the idea exists (404 if not), records `prev_stage`, runs `updateIdeaMeta.run({ id, title: input.title ?? current.title, description: input.description !== undefined ? input.description : current.description, updated_at: Date.now() })`, re-reads the idea, returns `{ idea, prev_stage }` (no `update` field). Make T035 pass.

### Client side

- [ ] T037 [P] [US2] Extend `apps/web/src/hooks/useIdeas.ts` with `editIdea(ideaId, input): Promise<{ idea, prev_stage }>`: calls the `patchIdea` API; on success, replaces the cached idea so the grid reflects the new title/description; on error, rethrows.
- [ ] T038 [P] [US2] Tests for `useIdeas.editIdea` in `apps/web/src/hooks/useIdeas.test.tsx`: happy path updates the cache; error path leaves the cache untouched.
- [ ] T039 [P] [US2] Implement `EditIdeaForm` component in `apps/web/src/components/EditIdeaForm.tsx`: takes `{ initialTitle, initialDescription, onSave: (input) => Promise<void>, onCancel: () => void }`. Renders a title `<input>` and a description `<textarea>` pre-filled with the initial values; inline validation on each field (title 1–80 required, description 0–500); Save button disabled while validation fails or while a save is in flight; Cancel calls `onCancel` without any API work; Save calls `onSave({ title, description: description || null })` and awaits it.
- [ ] T040 [US2] `EditIdeaForm` tests in `apps/web/src/components/EditIdeaForm.test.tsx`: renders pre-filled values; empty title blocks Save with inline error; 81-char title blocks Save; 501-char description blocks Save; valid Save calls `onSave` with trimmed title and `description: ""` mapped to `null`; Cancel calls `onCancel` without calling `onSave`; submit disabled while in-flight.
- [ ] T041 [US2] Extend `IdeaDetailModal` in `apps/web/src/components/IdeaDetailModal.tsx` to add an `isEditing` state. When false (default), the header shows title, description, and an `"Edit"` text button next to the close X. Clicking "Edit" sets `isEditing = true` and swaps the title+description region for `<EditIdeaForm initialTitle={...} initialDescription={...} onSave={...} onCancel={...} />`. The plant viewport, level badge, timeline, and update form remain visible and functional (editing is decoupled — FR-009). On `EditIdeaForm.onSave` success, set `isEditing = false` and update the modal's local idea with the response; on Cancel, set `isEditing = false` without an API call.
- [ ] T042 [US2] Extend `IdeaDetailModal` tests in `apps/web/src/components/IdeaDetailModal.test.tsx`: clicking "Edit" swaps to edit mode; saving valid changes returns to read mode with new values displayed (and emits no `playGrowth` call — assert the `PlantViewport` mock was not called during the save); clicking Cancel reverts cleanly; while `isEditing`, the close affordances and the update form still work (no over-locking).

**Checkpoint**: Edit flow ships. US1 still works. The grid card on modal close reflects the renamed title/description.

---

## Phase 5: User Story 3 — Reach the bloom state with confetti (Priority: P3)

**Goal**: When a watering brings an idea from stage 15 to stage 16, play the bloom-palette variant of the growth animation AND fire a one-shot page-wide confetti explosion. Subsequent waterings on a stage-16 idea play the bloom variant only.

**Independent Test**: Take any idea to stage 15 (via 14 waterings on a freshly-planted seed, or the dev helper). Submit one more watering. Observe: bloom-palette animation plays inside the plant viewport; the page fires a confetti explosion concurrently; the level badge becomes "Fully bloomed". Submit one more watering on the same idea — the bloom animation plays but the confetti does NOT re-fire. (Maps to spec [User Story 3 acceptance scenarios 1–3](./spec.md#user-story-3---reach-the-bloom-state-and-celebrate-priority-p3).)

- [ ] T043 [US3] Extend `PlantViewport` in `apps/web/src/components/PlantViewport.tsx` to implement the `'bloom'` palette variant: the same scale/wobble curves run, but the particle emitter uses gold (`colors.star`, `#E2B53C`) and primary-soft (`colors.primary-soft`, `#E7F3DD`) instead of the default green palette; when `from === to === 16`, the textured plane does not scale (stays at idle scale) but particles still emit. Reuses the existing texture-swap-at-60% rule (which is a no-op when `from === to`).
- [ ] T044 [US3] Extend `PlantViewport` tests in `apps/web/src/components/PlantViewport.test.tsx`: calling `playGrowth({ from: 15, to: 16, palette: 'bloom' })` resolves within the documented duration; calling `playGrowth({ from: 16, to: 16, palette: 'bloom' })` resolves without changing the asserted "current stage" prop on the textured plane.
- [ ] T045 [US3] Extend `IdeaDetailModal` in `apps/web/src/components/IdeaDetailModal.tsx`: mount a confetti component over the page on a successful watering when `prev_stage < 16 && idea.stage === 16`; pass the bloom palette to `playGrowth`; un-mount the confetti when its `onComplete` fires. Replace the US1 hardcoded `palette: 'growth'` with `palette: idea.stage === 16 ? 'bloom' : 'growth'`. *(Historical note: the first implementation imported `<ConfettiExplosion>` from `react-confetti-explosion`; the shipped implementation uses `ConfettiBurst.tsx` via Phase 11 / T088, with the bloom variant.)*
- [ ] T046 [US3] Extend `IdeaDetailModal` tests in `apps/web/src/components/IdeaDetailModal.test.tsx`: mock `PlantViewport`. After a watering response with `prev_stage = 15, idea.stage = 16`, the confetti element IS in the DOM (`getByTestId('confetti-canvas')`), and `playGrowth` is called with `palette: 'bloom'`. After a watering response with `prev_stage = 16, idea.stage = 16`, the confetti is NOT in the DOM, but `playGrowth` IS called with `palette: 'bloom'`.

**Checkpoint**: The bloom celebration ships. The "first time at 16" UX feels rewarding. Subsequent stage-16 waterings do not over-celebrate.

---

## Phase 6: User Story 4 — Curate the timeline (Priority: P4)

**Goal**: Let the user edit a past update's note text and delete individual updates. Deleting the update that holds the current `max(stage_after)` causes the plant to cross-fade to the new (lower) stage; no reverse-growth animation.

**Independent Test**: Open any idea with at least three updates. Click the `(⋮)` on the latest entry → Edit. Change the note text. Save. The entry shows the new text but the same timestamp and level badge. Then click the `(⋮)` on the same entry → Delete. The entry vanishes; the plant cross-fades to the previous stage; the level badge updates. Reload the page — both changes persist. (Maps to spec [User Story 4 acceptance scenarios 1–4](./spec.md#user-story-4---curate-the-timeline-by-deleting-individual-updates-priority-p4).)

### Server side

- [ ] T047 [US4] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `PATCH /api/ideas/:id/updates/:updateId` (write FIRST; FAIL before T048): happy path → 200, note changes, `update.stage_after` unchanged, `idea.stage` unchanged, `ideas.updated_at` bumped; 400 on empty note; 400 on > 1000-char note; 404 `update_not_found` for an unknown update id; 404 `update_not_found` when the update id belongs to a different idea (path consistency check).
- [ ] T048 [US4] Implement `PATCH /api/ideas/:id/updates/:updateId` in `apps/server/src/routes/ideas.ts`: checks the update row exists AND `update.idea_id === :id` (404 if not); calls `runUpdateMutation(ideaId, (tx) => { tx.updateUpdateNote.run({ id: updateId, note: input.note }); return tx.selectUpdateById.get(updateId); })` so the standard recompute fires (no-op for note edits since `stage_after` is unchanged, but keeps `ideas.updated_at` fresh). Returns `{ idea, prev_stage: idea.stage, update }`. Make T047 pass. *(Note: this also requires adding a `selectUpdateById` prepared statement to `db.ts` — fold that minor edit into T006 if not yet present.)*
- [ ] T049 [US4] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `DELETE /api/ideas/:id/updates/:updateId` (write FIRST; FAIL before T050): delete the highest-stage update on a stage-4 idea → 200, `idea.stage === 3`, `prev_stage === 4`, response has no `update` field; delete a middle (non-max) update → `idea.stage` unchanged, `prev_stage === idea.stage`; delete the only remaining update → `idea.stage === 1`; 404 for an unknown update id; 404 when the update id belongs to a different idea.
- [ ] T050 [US4] Implement `DELETE /api/ideas/:id/updates/:updateId` in `apps/server/src/routes/ideas.ts`: checks the update exists and belongs to this idea (404 if not); records `prev_stage = idea.stage`; calls `runUpdateMutation(ideaId, (tx) => { tx.deleteUpdate.run(updateId); })`; re-reads the idea; returns `{ idea, prev_stage }` (no `update`). Make T049 pass.

### Client side

- [ ] T051 [P] [US4] Extend `apps/web/src/hooks/useIdeas.ts` with `editUpdate(ideaId, updateId, input)` and `deleteUpdate(ideaId, updateId)` methods, mirroring the existing `addUpdate` pattern (replace cached idea with response.idea; rethrow on error).
- [ ] T052 [P] [US4] Tests for `useIdeas.editUpdate` and `useIdeas.deleteUpdate` in `apps/web/src/hooks/useIdeas.test.tsx`: happy path replaces the cache; error path leaves it untouched.
- [ ] T053 [P] [US4] Implement an `EntryOverflowMenu` component in `apps/web/src/components/EntryOverflowMenu.tsx`: a small `(⋮)` icon button that opens a tiny popover with `Edit` and `Delete` items. Props: `{ onEdit: () => void, onDelete: () => void }`. Closes on outside-click and on Escape.
- [ ] T054 [P] [US4] `EntryOverflowMenu` tests in `apps/web/src/components/EntryOverflowMenu.test.tsx`: opens on trigger click; closes on outside-click; clicking Edit calls `onEdit` and closes; clicking Delete calls `onDelete` and closes.
- [ ] T055 [US4] Extend `TimelineEntry` in `apps/web/src/components/TimelineEntry.tsx`: take new props `{ onEdit: (note: string) => Promise<void>, onDelete: () => Promise<void> }`; render an `<EntryOverflowMenu>` in the top-right of the entry; clicking Edit swaps the note region into an inline `<textarea>` with Save/Cancel + 1–1000 char validation; clicking Delete calls `onDelete` immediately (no confirm) and lets the parent remove the entry.
- [ ] T056 [US4] Extend `TimelineEntry` tests in `apps/web/src/components/TimelineEntry.test.tsx`: clicking Edit shows the inline form pre-filled with the existing note; Save calls `onEdit` with the trimmed new note then collapses back to read mode; Cancel discards changes without calling `onEdit`; empty/over-length notes block Save with inline validation; clicking Delete calls `onDelete` once (no confirm prompt rendered).
- [ ] T057 [US4] Extend `IdeaDetailModal` in `apps/web/src/components/IdeaDetailModal.tsx` to thread `onEdit` and `onDelete` callbacks down through `Timeline` → `TimelineEntry`. After a successful delete that drops `idea.stage` (compare `response.prev_stage > response.idea.stage`), trigger a CSS cross-fade between two stacked `<img>` elements over the plant viewport: render the previous-stage PNG with `opacity-100` and the new-stage PNG with `opacity-0`, then in the next frame swap to `opacity-0` and `opacity-100` with a `transition-opacity duration-300`. After 300 ms remove the previous-stage image. No call to `playGrowth` is made (cross-fade is plain CSS, not 3D).
- [ ] T058 [US4] Extend `IdeaDetailModal` tests in `apps/web/src/components/IdeaDetailModal.test.tsx`: editing an entry calls `useIdeas.editUpdate` and re-renders the entry with the new note; deleting an entry calls `useIdeas.deleteUpdate` and removes the entry; deleting an entry that drops the idea's stage renders the cross-fade markup (assert the dual-`<img>` layout with the documented opacity classes) and the level badge updates after the transition; `playGrowth` is NOT called during a delete (assert the mock was not invoked).

**Checkpoint**: Timeline curation ships. The cross-fade on stage drop reads as a quiet, non-celebratory transition, matching the spec.

---

## Phase 7: User Story 5 — Permanently delete an idea (Priority: P5)

**Goal**: Add the modal-header `(⋮)` overflow menu with a "Delete idea" item, the destructive confirmation dialog, and the end-to-end flow that removes the idea + its updates and updates the grid cache.

**Independent Test**: With any idea open in the modal, click the header `(⋮)` → "Delete idea". A confirmation dialog appears with a destructive primary action. Click "Yes, delete forever". The modal closes; the card disappears from the grid; reloading the page confirms the deletion is permanent. Cancel from the dialog leaves the idea unchanged. (Maps to spec [User Story 5 acceptance scenarios 1–5](./spec.md#user-story-5---permanently-delete-an-idea-priority-p5).)

### Server side

- [ ] T059 [US5] Server contract tests in `apps/server/src/routes/ideas.test.ts` for `DELETE /api/ideas/:id` (write FIRST; FAIL before T060): happy path → 204 with no body, `SELECT COUNT(*) FROM ideas WHERE id = ?` returns 0, `SELECT COUNT(*) FROM idea_updates WHERE idea_id = ?` returns 0 (cascade); deletes an idea that has many updates → cascade verified; 404 `idea_not_found` for an unknown id.
- [ ] T060 [US5] Implement `DELETE /api/ideas/:id` in `apps/server/src/routes/ideas.ts`: checks the idea exists (404 if not); calls `deleteIdea.run(id)` (the foreign-key cascade in `idea_updates` does the rest); returns 204 with no body. Make T059 pass.

### Client side

- [ ] T061 [P] [US5] Extend `apps/web/src/hooks/useIdeas.ts` with `deleteIdea(ideaId): Promise<void>`: calls the API; on success, removes the idea from the cached list; on error, rethrows so the caller can surface the message.
- [ ] T062 [P] [US5] Tests for `useIdeas.deleteIdea` in `apps/web/src/hooks/useIdeas.test.tsx`: happy path removes the idea from the cache; error path leaves the cache untouched.
- [ ] T063 [P] [US5] Implement `OverflowMenu` component in `apps/web/src/components/OverflowMenu.tsx`: a generic `(⋮)` icon button that opens a small dropdown. Props: `{ items: { label: string; onSelect: () => void; destructive?: boolean }[] }`. Closes on outside-click and on Escape. Destructive items render with `colors.error` text.
- [ ] T064 [P] [US5] `OverflowMenu` tests in `apps/web/src/components/OverflowMenu.test.tsx`: renders the `(⋮)` trigger; opens on click; renders each item with the right label and styling (destructive items get the error-color class); clicking an item invokes its `onSelect` and closes the menu; closes on outside-click and Escape.
- [ ] T065 [P] [US5] Implement `ConfirmDeleteDialog` component in `apps/web/src/components/ConfirmDeleteDialog.tsx`: a nested dialog rendered over the modal. Props: `{ open: boolean, ideaTitle: string, onConfirm: () => Promise<void>, onCancel: () => void }`. Renders the title `"Delete \"{ideaTitle}\"?"`, a body line `"This can't be undone. All waterings will be removed too."`, a primary destructive button (`Yes, delete forever`) and a secondary Cancel button. Three-way close (Escape / backdrop / Cancel). Primary button shows a loading state while `onConfirm` is in flight.
- [ ] T066 [P] [US5] `ConfirmDeleteDialog` tests in `apps/web/src/components/ConfirmDeleteDialog.test.tsx`: closed when `open={false}`; opens when `open={true}`; clicking Cancel calls `onCancel`; clicking the destructive button calls `onConfirm` (and disables both buttons while in flight); Escape calls `onCancel`; backdrop click calls `onCancel`.
- [ ] T067 [US5] Extend `IdeaDetailModal` in `apps/web/src/components/IdeaDetailModal.tsx`: add an `<OverflowMenu items={[{ label: 'Delete idea', destructive: true, onSelect: () => setConfirmOpen(true) }]} />` in the header next to the Edit button and close X. State for `confirmOpen` controls a `<ConfirmDeleteDialog>` mounted at the end of the modal body. On confirm, call the parent-passed `onDelete(ideaId)`; on success close both the dialog and the modal; on error keep both open and surface a toast via a small error region inside the modal.
- [ ] T068 [US5] Extend `IdeaDetailModal` tests in `apps/web/src/components/IdeaDetailModal.test.tsx`: clicking `(⋮)` → "Delete idea" opens the confirm dialog; Cancel closes the dialog without calling `onDelete`; confirming calls `onDelete` and (on success) closes both the dialog and the modal; on error from `onDelete`, the modal stays open and a toast/error region is shown.
- [ ] T069 [US5] Extend `Garden.tsx` and its test in `apps/web/src/components/Garden.test.tsx`: deleting an idea via the modal removes the card from the grid on modal close; reopening the same idea is impossible (the card is gone).

**Checkpoint**: All five user stories are independently functional. The full spec is implemented.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, manual verification, and constitutional sign-off. No new behaviour lands here.

- [ ] T070 [P] Run `npm run typecheck` from the repo root and fix any TypeScript errors that have accumulated across `apps/web`, `apps/server`, and `packages/shared`.
- [ ] T071 [P] Run `npm test` from the repo root and ensure all suites pass. Fix any flakes — particularly in the `PlantViewport` tests which use `vi.useFakeTimers`, which can be sensitive to other tests' setup.
- [ ] T072 Manual verification via Playwright MCP of every acceptance scenario in [quickstart.md §4](./quickstart.md#4-acceptance-scenarios--how-to-verify-each). Walk the agent through US1–US5 in order; capture any visual regressions in the PR description.
- [ ] T073 Manual verification via Playwright MCP of the "stage-16 confetti" smoke check from [quickstart.md §5](./quickstart.md#5-manual-smoke-recipe-end-to-end), steps 8–9 specifically: water an idea from stage 1 to stage 16, observe the confetti fires on the 15→16 transition, then water once more and observe the confetti does NOT re-fire.
- [ ] T074 Manual verification of the four PRD §W.3 bug-hunt cases against the running app (most are covered by automated tests in T015, but a manual replay confirms the UI surfaces them visibly): empty-note inline error renders below the textarea; stage-16 idea keeps stage at 16 with the bloom animation; transactional failure surfaces a visible error in the modal (simulate by killing the server mid-write); rapid-double-submit is impossible because the submit button is disabled while in flight.
- [ ] T075 [P] Confirm [CLAUDE.md](../../CLAUDE.md) still points at this plan; confirm [.specify/feature.json](../../.specify/feature.json) still references `specs/003-growth-loop`. No edits expected; verification only.
- [ ] T076 Constitution compliance retrospective: walk Principles I–IV against the shipped code one last time. Re-confirm that the three Complexity Tracking entries in [plan.md §Complexity Tracking](./plan.md#complexity-tracking) are still the only deviations and that the PR description calls them out for the reviewer.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS** all user-story phases.
- **User Stories (Phases 3–7)**: All depend on Phase 2. Within each story, server contract tests (write-first, must fail) precede their implementation; client components follow once the schemas exist.
- **Polish (Phase 8)**: Depends on every user story you've decided to ship in the increment.

### User-story dependencies

The five stories are **independently testable** after Phase 2 completes, but the natural delivery order is **P1 → P2 → P3 → P4 → P5** because:

- **US1 is the MVP.** Everything else assumes the modal exists.
- **US2 (edit) and US3 (bloom)** each extend `IdeaDetailModal` but in non-conflicting regions (header vs. animation handler). They can be developed in parallel after US1.
- **US4 (timeline curation)** depends on US1's `TimelineEntry` component but not on US2 or US3.
- **US5 (delete idea)** depends only on US1's modal shell. It can be developed in parallel with US2/US3/US4.

### Within each user story

- **Server-side first**: contract tests (write-first, MUST FAIL) → route implementation → tests now pass.
- **Client-side then**: hooks → reusable components → composite components → integration into `IdeaDetailModal` / `Garden`.
- **Tests live next to the code they cover** (`*.test.tsx` / `*.test.ts` colocated). No top-level `tests/` tree.

### Parallel opportunities

- All Phase 1 tasks marked [P] can run in parallel (only T001 is sequential, since it edits the lockfile).
- All Phase 2 tasks marked [P] can run in parallel — that's most of them (`T004`, `T005`, `T007`, `T008`, `T009`, `T010`, `T011`, `T012`). The only sequential bottleneck is `T006` (extends `db.ts`), which gates `T007`'s tests.
- Within each user story phase, the [P]-marked tasks (e.g., the per-component test pairs) can run in parallel.
- Cross-story: after Phase 2 completes, US2, US3, US4, US5 can all run in parallel against the US1-shipped modal — just resolve merge conflicts in `IdeaDetailModal.tsx`.

---

## Parallel Example: Foundational (Phase 2)

```bash
# After T006 (db.ts extension) lands, fire these in parallel:
Task: "T007 [P] Tests for runUpdateMutation in apps/server/src/db.test.ts"
Task: "T008 [P] Six typed API wrappers in apps/web/src/api/ideas.ts"
Task: "T009 [P] useIdeaDetail hook in apps/web/src/hooks/useIdeaDetail.ts"
Task: "T010 [P] useIdeaDetail tests in apps/web/src/hooks/useIdeaDetail.test.tsx"
Task: "T011 [P] LevelBadge in apps/web/src/components/LevelBadge.tsx"
Task: "T012 [P] LevelBadge tests in apps/web/src/components/LevelBadge.test.tsx"

# Independently, in parallel with the above:
Task: "T004 [P] New Zod schemas in packages/shared/src/ideas.schema.ts"
Task: "T005 [P] Schema round-trip tests in packages/shared/src/ideas.schema.test.ts"
```

## Parallel Example: User Story 1 (watering loop)

```bash
# After T013–T016 (server side) land, fire these in parallel:
Task: "T017 [P] addUpdate method on useIdeas"
Task: "T019 [P] EmptyTimeline component"
Task: "T020 [P] EmptyTimeline tests"
Task: "T021 [P] TimelineEntry (US1 scope) component"
Task: "T022 [P] TimelineEntry (US1 scope) tests"
Task: "T025 [P] PlantViewport component (growth variant)"
Task: "T026 [P] PlantViewport tests"

# Then sequentially:
Task: "T023 Timeline component (depends on EmptyTimeline + TimelineEntry)"
Task: "T024 Timeline tests"
Task: "T027 UpdateForm component"
Task: "T028 UpdateForm tests"
Task: "T029 IdeaDetailModal (US1 scope)"
Task: "T030 IdeaDetailModal (US1) tests"
Task: "T031 Garden wiring + T032 IdeaCard clickable + T033, T034 tests"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 (Setup) — install dependencies, widen CORS.
2. Complete Phase 2 (Foundational) — schemas, db extension, client API, `useIdeaDetail`, `LevelBadge`.
3. Complete Phase 3 (US1) — the headline watering loop, including the four bug-hunt cases.
4. **STOP and VALIDATE**: water an idea from stage 1 to stage 15, observe the loop end-to-end. Pause before adding bloom/edit/delete.
5. The branch is demoable at this point.

### Incremental Delivery

1. After MVP: ship US2 (edit). Demoable on its own.
2. Then US3 (bloom + confetti). Visual reward.
3. Then US4 (timeline curation). Refinement.
4. Then US5 (delete idea). Housekeeping.
5. Finally Phase 8 polish.

### Parallel Team Strategy

Once Phase 2 is complete, four developers can work in parallel:

- Dev A: US1 (largest scope; finishes the MVP).
- Dev B: US2 (after `IdeaDetailModal` shell from US1 lands).
- Dev C: US3 (after `PlantViewport` and `IdeaDetailModal` shell land).
- Dev D: US4 + US5 (after the modal shell lands).

The only merge contention point is `IdeaDetailModal.tsx`, which each story extends in a different region (header vs. animation handler vs. timeline entries vs. overflow menu). Coordinate with small, focused commits.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps task to a specific user story for traceability; setup/foundational/polish tasks omit it per the format rules.
- Every server endpoint listed in [contracts/api.md](./contracts/api.md) gets at least one happy-path test and one validation-error test, plus the four bug-hunt cases under US1.
- The Three.js animation is the workshop's headline visual. Verify it on a real machine (Playwright MCP can drive but cannot see frame rates) — a janky animation is a higher-cost failure than a missed inline-validation message.
- Commit after each task or each logical group; the SDD branch's commit log is itself a teaching artifact (PRD §W.2).
- Stop at any checkpoint to demo the increment independently.

---

## Phase 9: Post-MVP UX Polish (added 2026-05-12)

**Purpose**: Land the product-owner-requested visual + layout revisions captured in [spec.md FR-035 to FR-043](./spec.md#requirements-mandatory), [plan.md Addendum](./plan.md#addendum--post-mvp-ux-polish-2026-05-12), and [research.md R14–R16](./research.md#r14-plant-viewport--procedural-threejs-vs-sprite-on-a-plane-revised-2026-05-12). No story label — these are cross-cutting modal polish, not new user stories.

- [ ] T077 Rewrite `apps/web/src/components/PlantViewport.tsx` as a **Pokémon-evolution composite**: PNG sprite at rest (same asset as `IdeaCard`); on `playGrowth({ from, to, palette })`, play the canonical three-phase animation (growth → cocoon → reveal) over ~2000–2500 ms. Use raw Three.js (no R3F) with the `HeroScene.makeSpores` recipe as the basis for the particle cocoon (additive-blended `ShaderMaterial`, gold + orange radial-gradient textures, Y-axis swirl). The Three.js plant is decorative and identical every call — the visible stage difference is conveyed by the PNG that fades in at the end. Satisfies FR-039–FR-042.
- [ ] T078 Update `apps/web/src/components/PlantViewport.test.tsx` to stub the raw three.js path (the component now mounts a canvas via `useEffect`). Keep the assertions: `playGrowth` returns a Promise that resolves within the documented duration; a `from === to` call still resolves cleanly.
- [ ] T079 Redesign `apps/web/src/components/IdeaDetailModal.tsx` to a full-page two-column shell per FR-035–FR-038: replace `max-w-[640px]` with `~95vw × ~90vh` sizing; split the body into Column 1 (title + description + level badge + plant viewport, fixed height) and Column 2 (update form on top, then timeline list, scrollable); collapse to single-column below the `md` breakpoint with the form between the level badge and the timeline. Use design.md tokens (`Fraunces` display, `Inter` body, `paper` background, hairline `border`, soft `primary-soft` accents). Apply the frontend-design skill principles for typography hierarchy, spacing rhythm, and the editorial visual language.
- [ ] T080 Mount the confetti element through a React portal at `document.body` (via `react-dom`'s `createPortal`) so it escapes the modal's stacking context. Confirm in the browser that confetti renders **above** the modal backdrop and dialog at all times. *(At this point the underlying component was still `<ConfettiExplosion>`; Phase 11 replaces it with the in-house `ConfettiBurst` canvas.)* Satisfies FR-043.
- [ ] T081 Update `apps/web/src/components/IdeaDetailModal.test.tsx` for the new layout: the textarea now appears **before** the timeline list in the DOM, the modal max-width assertion is gone, and the confetti-mount assertion stays the same (the mock confetti is captured regardless of portal target). Add one regression test that the textarea precedes the timeline list in DOM order.
- [ ] T082 Manual verification via Playwright MCP: open a fresh idea, water it once, observe (a) the modal fills the viewport, (b) the textarea + Water button sit above the list of past waterings, (c) the procedural plant grows visibly, (d) glowing particles drift around the plant continuously and intensify on growth, (e) on the 15→16 transition the confetti renders clearly **in front of** the modal and dialog. Capture a screenshot before closing.

**Checkpoint**: The growth loop now reads as a focused, full-page "tend this idea" workspace with a richly animated plant and visible confetti. The API contract, data model, shared schemas, and server transactional logic are all unchanged from Phase 7.

---

## Phase 10: Bloom-driven evolution flash + stage rule revision (added 2026-05-12)

**Purpose**: Second round of product-owner feedback after Phase 9 landed. The procedural Three.js plant looked too geometric and the "glow" particles read as flat dots; the stage progression rule felt counterintuitive ("first watering does nothing"). This phase replaces the procedural plant with a bloom-driven flash and revises FR-016. See [spec.md FR-039–FR-044 (revised) and FR-016 (revised)](./spec.md#requirements-mandatory), [plan.md Addendum items 2 & 3 (revised)](./plan.md#addendum--post-mvp-ux-polish-2026-05-12), and [research.md R14 (third revision), R17, R18](./research.md#r14-plant-viewport--bloom-driven-evolution-flash-revised-three-times-final-2026-05-12).

- [ ] T083 Rewrite `apps/web/src/components/PlantViewport.tsx` for the **third time** as a **bloom-driven evolution flash**. Drop the procedural plant entirely. Use `EffectComposer` + `UnrealBloomPass` (strength 1.65, radius 0.85, threshold 0.04). Render four concurrent layers on `playGrowth(...)`: glowing core orb (additive billboard sprite, hot-white → gold radial gradient, bell-shape scale curve), three staggered shockwave rings (`RingGeometry` + custom soft-edged shader), 720-particle radial burst (all per-particle randomness baked into `BufferAttribute`s, animated from a single `uTime` uniform), and the existing PNG cross-fade. Disable tone mapping (`NoToneMapping`) so the bright shader outputs survive into the bloom pass unclipped. Bloom palette variant tints particles brighter gold + hotter orange, and bumps the orb/ring peaks slightly. Satisfies FR-039–FR-042 (revised).
- [ ] T084 Fix the **black-canvas-over-PNG** bug: `UnrealBloomPass`'s composite writes `alpha = 1`, so the canvas paints solid black where there is no bloom. Apply two safeguards in tandem: (a) `renderer.domElement.style.mixBlendMode = 'screen'` so dark canvas pixels become a no-op against the PNG and bright bloom pixels brighten through; (b) hold the canvas at `opacity: 0` at rest and `opacity: 1` only while the animation is playing, and skip `composer.render()` when idle to save GPU. Satisfies FR-044.
- [ ] T085 Update `apps/web/src/components/PlantViewport.test.tsx` for the new viewport: bump the fake-timer advance window to ≥ `ANIMATION_DURATION_MS + buffer` (the duration is now 2400 ms). Keep the two assertions: `playGrowth` resolves within the documented duration; a `from === to` call resolves cleanly. The component still falls back to a `setTimeout`-based stub in jsdom (no WebGL), so the tests do not need to mock Three.js.
- [ ] T086 Revise the stage progression rule in `apps/server/src/routes/ideas.ts` (the `POST /api/ideas/:id/updates` handler) so the empty-set base case of `MAX(prior stage_after)` is **1** instead of **0**. The first watering on a fresh idea now produces `stage_after = 2`, the fifteenth produces `stage_after = 16`. Rule of thumb: an idea with N waterings is at `Level min(N + 1, 16)`. All existing tests pass unchanged (they read `startStage` dynamically and assert `+1`); the bloom-confetti trigger (`prev_stage < 16 && idea.stage === 16`) now fires after the 15th watering instead of the 16th. Satisfies FR-016 (revised).
- [ ] T087 Manual smoke verification in the browser (no Playwright this round): open a fresh idea, confirm the modal opens showing the PNG with no black canvas overlay; water once and confirm Level 2 appears (was Level 1 under the old rule); water 14 more times and confirm Level 16 + bloom-palette flash + confetti on the 15→16 transition.

**Checkpoint**: Final visual quality bar for the headline animation. Real bloom-driven glow, no procedural geometry, no black-rectangle compositing bug, intuitive "every watering bumps a level" feedback.

---

## Phase 11: Confetti rewrite + dual trigger (added 2026-05-12)

**Purpose**: Last round of product-owner feedback after Phase 10 landed. The bloom-confetti was still being clipped behind the modal panel, and the metaphor needed a second celebration moment for the user's *first* watering. This phase replaces `react-confetti-explosion` with an in-house canvas component and adds the first-watering trigger. See [spec.md FR-025 (revised) and FR-043 (revised)](./spec.md#requirements-mandatory), [plan.md Addendum item 1 (revised)](./plan.md#addendum--post-mvp-ux-polish-2026-05-12), and [research.md R5 (revised) and R16 (revised)](./research.md#r5-confetti-rendering--in-house-canvas-revised-2026-05-12).

- [ ] T088 Build `apps/web/src/components/ConfettiBurst.tsx`: a `<canvas>` element rendered via `createPortal` to `document.body`, fixed at `inset: 0`, `pointer-events: none`, `z-index: 2147483647`. Particles are drawn directly with the 2D context — gravity, drag, rotation, fade. Two variants exposed via `variant: 'firstWatering' | 'bloom'`, each tuning palette / particle count / duration. The component calls `onComplete` when the timeline elapses and falls back to a `setTimeout(onComplete, duration)` no-op path when `getContext('2d')` returns `null` (jsdom). Replaces all use of `react-confetti-explosion`.
- [ ] T089 Update `apps/web/src/components/IdeaDetailModal.tsx` to use `ConfettiBurst`. State goes from `confettiVisible: boolean` to `confetti: 'firstWatering' | 'bloom' | null`. The water handler sets `'bloom'` when `prev_stage < 16 && idea.stage === 16`, `'firstWatering'` when `prev_stage === 1 && idea.stage === 2`, otherwise no confetti. Remove the `react-confetti-explosion` import and the inline `ConfettiPortal` helper. Satisfies FR-025 (revised: dual trigger) and FR-043 (revised: canvas + portal).
- [ ] T090 Update `apps/web/src/components/IdeaDetailModal.test.tsx`: drop the `vi.mock('react-confetti-explosion', ...)` shim entirely. Replace all `expect(confettiSpy).toHaveBeenCalled()` assertions with `expect(screen.queryByTestId('confetti-canvas')).toBeInTheDocument()` (and the negative equivalent). Update the existing "1 → 2 watering does not fire confetti" case to "1 → 2 watering **does** fire confetti (first-watering variant)". Add one new case: "intermediate watering (e.g. 5 → 6) does NOT fire confetti".
- [ ] T091 Manual smoke verification in the browser (no Playwright): plant a fresh idea, water it once, confirm the green / gold first-watering burst appears clearly over the modal; then drive the idea to Level 15 via the API and water once more, confirm the larger full-palette bloom burst appears clearly over the modal. Confirm that an intermediate watering (e.g. Level 5 → 6) does NOT fire confetti.

**Checkpoint**: Two distinct confetti moments mark the start and end of the loop. The confetti always renders above the modal at every viewport size because the canvas is portaled to `document.body` at the maximum z-index. Zero third-party confetti dependencies.
