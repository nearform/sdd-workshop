---

description: "Task list for Foundation & Homepage (Step 1 baseline)"
---

# Tasks: Foundation & Homepage (Step 1 Baseline)

**Input**: Design documents from `/specs/001-foundation-homepage/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [quickstart.md](./quickstart.md)

**Tests**: Tests are **MANDATORY** for this feature per [Constitution Principle II](../../.specify/memory/constitution.md#ii-testing-standards) — every endpoint listed in PRD §1.4 needs API contract tests, and every behaviour-owning React component needs a Vitest + RTL unit test. The four PRD §W.3 bug-hunt edge cases belong to Step 2 and are out of scope here.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently. All three spec stories are P1; the natural execution order is Setup → Foundational → US1 (the headline value, MVP) → US2 (persistence verification) → US3 (one-command dev verification) → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — only present in user-story phases
- All file paths are repository-relative (root: `/Users/alfonsograziano/Desktop/code/sdd-workshop/`)

## Path Conventions

The plan adopts the **monorepo layout from PRD §5**:

- `apps/web/` — Vite + React + TypeScript + Tailwind frontend
- `apps/server/` — Fastify + TypeScript on Node 22+ with native type stripping
- `packages/shared/` — Zod schemas (single source of truth for API shapes)
- `data/` — SQLite file (gitignored)
- `assets/plants/` — plant sprites

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the monorepo skeleton and the dev/test toolchain so every later task has a place to land. No story label here per the format rules.

- [x] T001 Create monorepo root in `package.json` and `tsconfig.base.json` and `.gitignore`: workspace root with `"workspaces": ["apps/*", "packages/*"]`, strict TypeScript base config (`target: ES2023`, `moduleResolution: bundler`, `strict: true`, `noUncheckedIndexedAccess: true`), and gitignore entries for `node_modules/`, `dist/`, `coverage/`, `.DS_Store`, **and `data/`** (matches the SQLite file plus `garden.db-wal` / `garden.db-shm` sidecar files produced by `journal_mode = WAL`)
- [x] T002 [P] Initialize `packages/shared` workspace: `packages/shared/package.json` (name `@idea-garden/shared`, type `module`, `zod` dep, `vitest` dev dep, `exports` map for `./*`), `packages/shared/tsconfig.json` (extends base), `packages/shared/src/index.ts` placeholder, `packages/shared/vitest.config.ts` (node env)
- [x] T003 [P] Initialize `apps/server` workspace: `apps/server/package.json` (deps `fastify`, `@fastify/cors`, `fastify-type-provider-zod`, `better-sqlite3`, `ulid`, `zod`, `@idea-garden/shared` workspace dep; dev deps `vitest`, `@types/better-sqlite3`, `@types/node`; `dev` script runs `node --experimental-strip-types --watch src/index.ts`; `start` script runs `node --experimental-strip-types src/index.ts`), `apps/server/tsconfig.json` (extends base, `noEmit: true`, `module: nodenext`), `apps/server/vitest.config.ts` (node env). Note: Vitest handles TypeScript transformation natively via Vite — no `--experimental-strip-types` flag is needed inside the Vitest config; the flag belongs only to the runtime dev/start scripts.
- [x] T004 [P] Initialize `apps/web` workspace: `apps/web/package.json` (deps `react`, `react-dom`, `zod`, `@idea-garden/shared`; dev deps `vite`, `@vitejs/plugin-react`, `typescript`, **`tailwindcss@^3`** (pin v3 — see [research.md R13](./research.md#r13-tailwind-major-version); the v3 `tailwind.config.ts` token-extension pattern in T005 does not work on v4), `postcss`, `autoprefixer`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`), `apps/web/vite.config.ts` (react plugin, dev server on `5173`), `apps/web/tsconfig.json` (extends base, `jsx: react-jsx`, `lib: [DOM, ES2023]`), `apps/web/postcss.config.js` (loads `tailwindcss` and `autoprefixer`), `apps/web/index.html`, `apps/web/src/main.tsx` placeholder
- [x] T005 Configure Tailwind theme from `design.md` tokens in `apps/web/tailwind.config.ts`: extend `theme.colors` with the full palette (`primary`, `primary-hover`, `primary-soft`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface`, `on-surface-muted`, `border`, `star`, `wilted`, `success`, `error`), extend `theme.fontFamily.sans` to `['Inter', 'system-ui', ...]`, extend `theme.fontSize` for `headline-lg/md/sm`, `body-md/sm`, `label-md`, `caption`, extend `theme.spacing` (xs/sm/md/lg/xl/2xl + card-padding/grid-gutter/card-min-width), extend `theme.borderRadius` (none/sm/md/lg/xl/full per tokens)
- [x] T006 Add root scripts in `package.json`: `"dev": "concurrently -n server,web -c blue,green \"npm run dev --workspace=apps/server\" \"npm run dev --workspace=apps/web\""`, `"test": "npm run test --workspaces --if-present"`, `"typecheck": "npm run typecheck --workspaces --if-present"`; add `concurrently` as a root dev dependency
- [x] T007 [P] Add Tailwind base styles in `apps/web/src/styles/index.css` (`@tailwind base; @tailwind components; @tailwind utilities;`, `body { @apply bg-neutral text-on-surface font-sans; }`, Inter `@font-face` declarations from a self-hosted woff2 under `apps/web/public/fonts/`); import `./styles/index.css` from `apps/web/src/main.tsx`
- [x] T008 [P] Add Vitest test setup for the web workspace at `apps/web/src/test-setup.ts` (`import '@testing-library/jest-dom/vitest';`); reference it from `apps/web/vitest.config.ts` (`test.environment: 'jsdom'`, `test.setupFiles: ['./src/test-setup.ts']`, `test.globals: true`)
- [x] T009 [P] Commit the full 16-stage oak PNG sprite sequence under `assets/plants/oak/stage-01.png` … `stage-16.png` (isometric pixel-art, acorn → mature tree with wildlife). The Step 1 species allowlist is exactly `['oak']` (see [research.md R1](./research.md#r1-plant-species-assignment) and [data-model.md](./data-model.md)), so one species is sufficient; shipping all 16 stages now is free (single source-of-truth grid) and removes a follow-up for Step 2's stage progression. Step 1 only renders `stage-01` — for the empty-garden illustration and on every idea card.

**Checkpoint**: Running `npm install` from the repo root resolves every workspace; `npm test` runs (and trivially passes — no tests yet); `npm run dev` would start both apps but they have no routes / UI yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Deliver the cross-cutting building blocks every user story depends on — the shared schemas, the server skeleton, the database, and the typed client fetch wrapper. **No user-story work begins until this phase is complete.**

- [x] T010 [P] Implement shared Zod schemas in `packages/shared/src/ideas.schema.ts` per [data-model.md](./data-model.md): `SpeciesSchema` (`z.enum(['oak'])` for Step 1 — see R1 for the deferral rationale), `IdeaSchema` (id length 26, title 1–80, description nullable max 500, species, stage 1–16, created_at and updated_at non-negative ints), `IdeaListSchema` (z.array of IdeaSchema), `NewIdeaInputSchema` (title trim min 1 max 80, description nullish max 500 transformed to null when empty), `ApiErrorSchema` (error string + optional unknown details), exported types via `z.infer`; re-export everything from `packages/shared/src/index.ts`
- [x] T011 [P] Schema round-trip tests in `packages/shared/src/ideas.schema.test.ts` using Vitest: `IdeaSchema.parse` accepts a known-good payload and rejects each invariant violation (id wrong length, title 0 / 81 chars, description 501 chars, stage 0 / 17, species not in allowlist); `NewIdeaInputSchema.parse` trims whitespace, rejects whitespace-only title, accepts title-only with description omitted, accepts empty description string and stores `null`
- [x] T012 [P] Implement species allowlist + `randomSpecies()` in `apps/server/src/species.ts`: export a frozen `SPECIES_LIST` derived from the shared `SpeciesSchema` enum (`SpeciesSchema.options`) so the two cannot drift apart, and a `randomSpecies()` that picks uniformly using `crypto.randomInt`. With Step 1's single-species allowlist, the call always returns `'oak'`, but the implementation is general and ready for the allowlist to widen later without touching callers.
- [x] T013 Implement database layer in `apps/server/src/db.ts`: `getDb()` opens `better-sqlite3` against `DB_PATH` (default `data/garden.db`), runs `CREATE TABLE IF NOT EXISTS ideas (...)` and `CREATE INDEX IF NOT EXISTS idx_ideas_created_at_desc ON ideas(created_at DESC)` per [data-model.md](./data-model.md) DDL, sets `journal_mode = WAL`, exports prepared statements `selectAllIdeas` and `insertIdea`
- [x] T014 Implement Fastify app builder in `apps/server/src/app.ts`: `buildApp()` returns a typed Fastify instance with `fastify-type-provider-zod` registered, `@fastify/cors` allowing `CORS_ORIGIN` env (default `http://localhost:5173`), an error formatter that maps `ZodError` to `{ error: 'validation', details }` with status 400 and uncaught errors to `{ error: 'internal_error' }` with status 500, and a placeholder route registration call (filled in by T018/T019)
- [x] T015 Implement server entrypoint in `apps/server/src/index.ts`: imports `buildApp` and `getDb`, listens on `HOST` (default `127.0.0.1`) and `PORT` (default `3000`), logs the bound URL, and traps `SIGINT`/`SIGTERM` for clean shutdown
- [x] T016 [P] Implement typed client fetch helpers in `apps/web/src/api/ideas.ts`: `listIdeas(): Promise<Idea[]>` fetches `${VITE_API_BASE_URL}/api/ideas` and parses through `IdeaListSchema` (throws an `ApiError`-shaped error on non-2xx or schema-mismatch); `createIdea(input: NewIdeaInput): Promise<Idea>` POSTs JSON, parses 201 through `IdeaSchema`, parses 400/500 through `ApiErrorSchema`. Reads base URL from `import.meta.env.VITE_API_BASE_URL` with a fallback of `http://localhost:3000`

**Checkpoint**: `npm run dev` starts both apps successfully; visiting `http://localhost:3000/api/ideas` returns... a 404 (no route registered yet — that lands in US1). The web app loads but renders nothing meaningful.

---

## Phase 3: User Story 1 — First-time user plants their first seed (Priority: P1) 🎯 MVP

**Goal**: Deliver the headline slice — a homepage that shows an empty state on a fresh DB, lets the user open a "Plant New Seed" modal, validates input inline, and prepends the new card to a responsive grid on success.

**Independent Test**: Open the app on a fresh DB, confirm the empty state, click the "Plant New Seed" button, enter a title (and optionally a description), submit, and verify the modal closes and a card with that title appears in the grid with a seed plant image, level indicator, and "just now" timestamp. Re-test with invalid inputs and confirm inline error feedback. (Maps to spec [User Story 1 acceptance scenarios 1–7](./spec.md#user-story-1---first-time-user-plants-their-first-seed-priority-p1).)

### Tests for User Story 1

> Constitution Principle II makes these tests mandatory. Write them first; they MUST fail before the implementation tasks below land.

- [x] T017 [US1] Server contract tests in `apps/server/src/routes/ideas.test.ts` covering [contracts/api.md](./contracts/api.md): `GET /api/ideas` returns `[]` on a fresh per-test SQLite file with status 200; `GET /api/ideas` returns inserted ideas in `created_at DESC, id DESC` order with shape matching `IdeaListSchema`; `POST /api/ideas` happy path returns 201 + `Idea`-shaped body with `stage === 1`, `species` in the allowlist, `id` 26 chars, and `created_at === updated_at`; `POST /api/ideas` validation failures return 400 with `{ error: 'validation', details: ZodIssue[] }` for: missing title, empty title, whitespace-only title, 81-char title, 501-char description, body not an object; **`POST /api/ideas` round-trip preservation: a body with a title containing emoji (e.g. `"🌱 idea"`) and special characters (e.g. `"<script>alert(1)</script>"`) is accepted and the 201 response carries the same characters byte-for-byte (covers the spec edge case "Special characters / emoji in title or description")**. Each test builds a fresh app via `buildApp()` against a temp SQLite file, uses Fastify's `app.inject(...)`, and tears the file down on completion.
- [x] T018 [P] [US1] Component test for `<NewIdeaModal>` in `apps/web/src/components/NewIdeaModal.test.tsx` using Vitest + RTL + `@testing-library/user-event`: renders title and description fields; valid submit invokes the `onCreate` callback with the trimmed title; missing title shows an inline error next to the title field and does NOT call `onCreate`; over-length title and over-length description each show inline errors; pressing Escape calls `onClose`; clicking the X control calls `onClose`; clicking the backdrop calls `onClose`; clicking inside the modal body does NOT call `onClose`; submit button is disabled while a submission is in flight (FR-024)
- [x] T019 [P] [US1] Component test for `<IdeaCard>` in `apps/web/src/components/IdeaCard.test.tsx`: renders the full title, the truncated description (CSS line-clamp asserted via class), the `Level 1` stage badge using `badge-stage` styling, the relative timestamp text from a fixed `created_at` ("just now" within 60s), and the `<PlantImage>` for the idea's species; **renders a title containing `<script>alert(1)</script>` and emoji (e.g. `"🌱"`) as plain text without injecting any new DOM nodes (assert no `<script>` element appears in the rendered output and the literal characters are present in the title element's `textContent`) — covers the spec edge case "Special characters / emoji ... no HTML injection, no broken layout"**
- [x] T020 [P] [US1] Component test for `<EmptyGarden>` in `apps/web/src/components/EmptyGarden.test.tsx`: renders the illustration, a `headline-sm` line ("Your garden is empty"), a `body-sm` muted line, and a primary "Plant your first seed" CTA whose click invokes the `onPlant` callback
- [x] T021 [P] [US1] Util test for `relativeTime` in `apps/web/src/lib/relativeTime.test.ts`: returns `"just now"` under 60s, `Nm ago` for minutes, `Nh ago` for hours, `Nd ago` for days, with stable behaviour at boundaries (59s, 60s, 59m, 60m, 23h, 24h)

### Implementation for User Story 1

- [x] T022 [P] [US1] Implement `relativeTime(now: number, then: number): string` in `apps/web/src/lib/relativeTime.ts` per the boundaries in T021
- [x] T023 [P] [US1] Implement `<PlantImage species stage>` in `apps/web/src/components/PlantImage.tsx`: renders an `<img>` pointing at `/plants/<species>/stage-<NN>.png` (Vite serves `assets/` via `publicDir`), with descriptive `alt` text
- [x] T024 [P] [US1] Implement `<EmptyGarden onPlant>` in `apps/web/src/components/EmptyGarden.tsx`: centered illustration (the stage-01 acorn from `/plants/oak/stage-01.png`) + headline-sm + muted body-sm + primary CTA, all per [design.md](../../.specify/memory/design.md) Empty States section
- [x] T025 [P] [US1] Implement `<IdeaCard idea>` in `apps/web/src/components/IdeaCard.tsx`: white surface, hairline border, soft shadow, `rounded.lg`, `card-padding`; composition top-to-bottom is PlantImage / headline-sm title / body-sm description (`line-clamp-2`) / metadata row with `badge-stage` "Level N" + caption "watered Xd ago" using `relativeTime`
- [x] T026 [P] [US1] Implement `<Header onPlantSeed>` in `apps/web/src/components/Header.tsx`: page title (`headline-lg` "My Garden") on the left, persistent primary "Plant New Seed" button on the right (always visible regardless of grid state — FR-013)
- [x] T027 [P] [US1] Implement `<NewIdeaModal open onClose onCreate>` in `apps/web/src/components/NewIdeaModal.tsx`: `rounded.xl` modal, max-width 560px, headline-md title, controlled `title` and `description` inputs validated through `NewIdeaInputSchema` on submit, inline `colors.error` messages below each invalid field, three-way close (X / Escape / backdrop), focus-trap inside the modal while open, primary "Plant" button disabled while `isSubmitting`
- [x] T028 [US1] Implement `GET /api/ideas` and `POST /api/ideas` handlers in `apps/server/src/routes/ideas.ts` and register them from `app.ts`: GET returns `selectAllIdeas.all()` (ordered newest first by the SQLite index); POST validates body via the Zod type provider with `NewIdeaInputSchema`, mints `ulid()`, calls `randomSpecies()`, computes `Date.now()` for both timestamps, inserts via the prepared `insertIdea` statement, sets `Location: /api/ideas/{id}`, returns 201 with the full `Idea` row. Both responses are typed against the shared schemas.
- [x] T029 [US1] Implement `useIdeas()` hook in `apps/web/src/hooks/useIdeas.ts`: on mount, calls `listIdeas()` and stores `{ status: 'idle' | 'loading' | 'ready' | 'error', ideas, error }`; exposes `createIdea(input)` that **optimistically prepends** a temp idea, awaits server response, replaces the temp on success, rolls back on failure and surfaces the error; exposes `refresh()` for explicit re-fetch
- [x] T030 [US1] Implement `<Garden>` in `apps/web/src/components/Garden.tsx`: consumes `useIdeas`; renders the error banner above the grid when `status === 'error'`, the `<EmptyGarden>` when `status === 'ready'` and the list is empty, otherwise a CSS-grid (`grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-grid-gutter`) of `<IdeaCard>` items
- [x] T031 [US1] Implement `<App>` in `apps/web/src/App.tsx`: composes `<Header>` + `<Garden>` + `<NewIdeaModal>`; owns modal-open state; passes `onCreate` from `useIdeas` into the modal so a successful submit closes the modal and prepends the card; mount via `apps/web/src/main.tsx`
- [x] T032 [US1] App-level integration test in `apps/web/src/App.test.tsx`: with a mocked `fetch` returning `[]`, the app shows the empty state; clicking the header "Plant New Seed" opens the modal; submitting a valid form prepends the card and closes the modal; with a 400 mock, the modal stays open and the inline validation surfaces; with a 500 mock on initial load, the grid area shows an error banner (no false empty state — FR-023, edge case "Backend unreachable on initial page load")

**Checkpoint**: User Story 1 is fully functional and independently testable. Demonstrate by deleting `data/garden.db`, running `npm run dev`, planting an idea, and watching it land in the grid. All [spec acceptance scenarios for User Story 1](./spec.md#user-story-1---first-time-user-plants-their-first-seed-priority-p1) pass.

---

## Phase 4: User Story 2 — Returning user sees their garden persist (Priority: P1)

**Goal**: Prove that ideas survive page reloads, browser restarts, and dev-server restarts, and that relative timestamps update correctly on re-render.

**Independent Test**: Pre-seed the data store with several ideas, reload the page (or restart the dev server), and confirm every idea reappears in newest-first order with stable plant illustrations and updated relative timestamps. (Maps to [spec User Story 2 acceptance scenarios 1–5](./spec.md#user-story-2---returning-user-sees-their-garden-persist-priority-p1).)

### Tests for User Story 2

- [x] T033 [P] [US2] Persistence contract test in `apps/server/src/db.test.ts`: insert ideas via the prepared statement, **close** the `better-sqlite3` connection, open a new connection on the same `DB_PATH`, and assert all rows reappear with the same `id`, `title`, `species`, `stage`, `created_at`, `updated_at`. Verifies durability (FR-021) and stable species/stage (FR-020) across connection resets.
- [x] T034 [P] [US2] `useIdeas` re-fetch test in `apps/web/src/hooks/useIdeas.test.ts`: with a mocked `fetch` returning a fixed list, calling `refresh()` re-fetches and replaces the in-memory list; the returned items match the mock byte-for-byte after parsing through `IdeaListSchema`

### Implementation for User Story 2

> No code changes are required to satisfy this story — the persistence layer (T013), the GET handler (T028), and `useIdeas` (T029) already deliver the behaviour. T033 and T034 verify the existing contract.

- [x] T035 [US2] Playwright (or manual) verification scripted in `quickstart.md` step 4 (already documented): create one or more ideas, reload the page, confirm each idea is still visible with the same plant illustration and an updated relative timestamp; record the run in the PR description per Constitution Principle II

**Checkpoint**: User Story 2 is fully testable. Run `T033` + `T034` automated, then walk through the Playwright/manual flow above. The `master` baseline now persists ideas durably.

---

## Phase 5: User Story 3 — Developer starts the app locally with one command (Priority: P1)

**Goal**: Confirm the developer experience promised by the spec — `npm install` followed by `npm run dev` starts both apps, the SQLite file is created on first boot, and the same flow works on macOS and Linux.

**Independent Test**: From a fresh clone with no `node_modules` and no `data/garden.db`, run the documented install + dev command and confirm both server and web URLs are reachable and the empty state renders. (Maps to [spec User Story 3 acceptance scenarios 1–4](./spec.md#user-story-3---developer-starts-the-app-locally-with-one-command-priority-p1).)

### Tests / Verification for User Story 3

> The test surface here is mostly behavioural — the `package.json` scripts and the schema-on-boot logic are already covered structurally by Phases 1 and 2. The tasks below are the explicit verifications.

- [x] T036 [US3] Schema-on-boot test in `apps/server/src/db.test.ts` (alongside T033): point `getDb()` at a temp `DB_PATH` that does **not** yet exist; assert the file is created on first call and the `ideas` table exists by querying `sqlite_master`
- [x] T037 [US3] One-command-dev verification script in `quickstart.md` step 1 (already documented): from a clean clone, `npm install && npm run dev`, observe both `http://localhost:3000` and `http://localhost:5173` are reachable within 30 seconds; record evidence in the PR description
- [ ] T038 [US3] Cross-platform verification: run `T037` on macOS **and** Linux, confirm identical behaviour with no platform-specific manual steps (SC-008); document any divergences in `quickstart.md` Troubleshooting

**Checkpoint**: User Story 3 is verified. The workshop demo's "everyone follows along" promise holds.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Tie everything together — full-suite green, manual verification of the spec acceptance criteria that aren't fully covered by automated tests, and documentation hygiene.

- [x] T039 [P] Run the full workspace test suite via `npm test` from the repo root and confirm every Vitest project is green (server contract tests, shared schema tests, web component tests)
- [x] T040 [P] Run the full workspace typecheck via `npm run typecheck` (per-workspace `tsc --noEmit`) and confirm zero errors across `apps/web`, `apps/server`, `packages/shared`
- [x] T041 Walk the [quickstart.md](./quickstart.md) "Manual verification — acceptance criteria" checklist 1–16 end-to-end against the running app (Playwright MCP for the agent; human verification in the PR description if MCP unavailable per Constitution Principle II)
- [x] T042 [P] Verify `.gitignore` excludes `data/` (specifically `data/*.db` and `data/*.db-*` for WAL/SHM files), `node_modules/`, `dist/`, `coverage/`, `.DS_Store`; confirm `git status` is clean after a `npm run dev` round-trip
- [x] T043 Sync `CLAUDE.md` and `quickstart.md` if any drift was introduced during implementation (e.g., environment variable defaults, route paths); the SPECKIT-block in `CLAUDE.md` must still link this plan
- [x] T044 Constitution compliance pass: re-read [constitution.md](../../.specify/memory/constitution.md) Principles I–IV and confirm each gate in [plan.md → Constitution Check](./plan.md#constitution-check) still holds after implementation; record any deviations in the PR description per the Workflow section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies, can start immediately. T001 must land before T002–T004 because workspaces resolve through the root `package.json`.
- **Foundational (Phase 2)**: depends on Setup completion. Within Phase 2: T010 must complete before T014 and T016 (both import shared schemas); T013 must complete before T015 (server entrypoint opens DB); T012 has no dependencies inside Phase 2.
- **User Story 1 (Phase 3)**: depends on Foundational completion. T017 depends on T013 + T014 (it builds the app + DB) but is otherwise independent. T028 depends on T010 + T013 + T014. The frontend tasks (T022–T027) depend only on T002 + T004 + T005 + T010 (shared schemas exist for the modal's validation). T029 depends on T016. T031 depends on T026 + T027 + T030. T032 depends on T031.
- **User Story 2 (Phase 4)**: depends on Foundational completion + the GET handler from T028. T033 depends on T013. T034 depends on T029. T035 depends on US1 being demonstrable.
- **User Story 3 (Phase 5)**: depends on Setup + Foundational. T036 depends on T013. T037–T038 depend on US1 being demonstrable (so the empty state is visible on a fresh install).
- **Polish (Phase N)**: depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: independent of US2 and US3. Drives the bulk of the implementation work.
- **US2 (P1)**: depends on US1's GET handler and `useIdeas` hook to verify behaviour, but the persistence story itself is satisfied by Phase 2 work.
- **US3 (P1)**: largely satisfied by Phase 1 + Phase 2 task completion; verification waits for US1 to provide a visible end-to-end experience.

### Within Each User Story

- Tests (T017–T021 for US1, T033–T034 for US2, T036 for US3) MUST be written and FAIL before the matching implementation tasks land.
- Schemas (Phase 2) before any code that consumes them.
- Server handlers (T028) before the web hooks that call them (T029).
- Components (T022–T027) before the screens that compose them (T030–T031).
- Composed screen (T031) before the integration test that drives it (T032).

### Parallel Opportunities

- **Setup**: T002, T003, T004 can run in parallel after T001; T007, T008, T009 can run in parallel any time after T004.
- **Foundational**: T010, T011, T012, T016 are all `[P]`. T013 → T015 is sequential. T014 depends on T010 only.
- **US1 tests**: T018, T019, T020, T021 all touch different files and are `[P]`. T017 is its own server test file.
- **US1 components**: T022, T023, T024, T025, T026, T027 all live in different files and are `[P]`.
- **US2 tests**: T033 and T034 are independent (different workspaces) and `[P]`.

---

## Parallel Example: User Story 1

```bash
# After Phase 2 foundation lands, kick off all five US1 test tasks in parallel
# (T017 lives on the server, T018–T021 on the web — different files, no shared deps):
Task T017: server contract tests in apps/server/src/routes/ideas.test.ts
Task T018: NewIdeaModal component test in apps/web/src/components/NewIdeaModal.test.tsx
Task T019: IdeaCard component test in apps/web/src/components/IdeaCard.test.tsx
Task T020: EmptyGarden component test in apps/web/src/components/EmptyGarden.test.tsx
Task T021: relativeTime util test in apps/web/src/lib/relativeTime.test.ts

# Once tests are red, fan out the component implementation tasks in parallel:
Task T022: relativeTime util in apps/web/src/lib/relativeTime.ts
Task T023: PlantImage component in apps/web/src/components/PlantImage.tsx
Task T024: EmptyGarden component in apps/web/src/components/EmptyGarden.tsx
Task T025: IdeaCard component in apps/web/src/components/IdeaCard.tsx
Task T026: Header component in apps/web/src/components/Header.tsx
Task T027: NewIdeaModal component in apps/web/src/components/NewIdeaModal.tsx

# Server handlers and the integration glue are sequential:
Task T028: GET + POST /api/ideas in apps/server/src/routes/ideas.ts
Task T029: useIdeas hook in apps/web/src/hooks/useIdeas.ts (depends on T016)
Task T030: Garden in apps/web/src/components/Garden.tsx (depends on T029 + components)
Task T031: App in apps/web/src/App.tsx (depends on T026, T027, T030)
Task T032: App.test.tsx integration suite (depends on T031)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks every story).
3. Complete Phase 3: User Story 1 (the headline value).
4. **STOP and VALIDATE**: walk the [quickstart.md](./quickstart.md) manual checklist for the US1-related steps (1–10).
5. Demo if ready — this is the moment the workshop audience sees the SDD-built baseline run for the first time.

### Incremental Delivery

1. Setup + Foundational → foundation ready (`npm run dev` starts both apps; both 404 on real routes).
2. Add US1 → independently testable → demo MVP.
3. Add US2 → independently testable → demo persistence.
4. Add US3 → independently verified → demo "single command, two platforms."
5. Polish → close the constitution gates.

### Parallel Team Strategy

With multiple developers (or multiple agents):

1. Together: complete Phase 1 + Phase 2.
2. Once foundation lands:
   - Developer A: US1 server side (T017, T028).
   - Developer B: US1 web components (T018–T027).
   - Developer C: US1 integration glue (T029–T032 — depends on A and B).
3. After US1 lands: US2 (T033–T035) and US3 (T036–T038) can run in parallel.

---

## Notes

- `[P]` tasks live in different files with no incomplete dependency overlap.
- `[Story]` labels enable traceability back to [spec.md](./spec.md) user stories.
- Tests are mandatory per Constitution Principle II (NOT optional in this project).
- Verify each test fails before implementing the production code that satisfies it.
- Commit after each task or logical group; the workshop relies on `git log master` reading as a narrative.
- Stop at any checkpoint to validate independently against the spec.
- Avoid: cross-story dependencies that break independence, vague tasks, same-file conflicts marked `[P]`.
