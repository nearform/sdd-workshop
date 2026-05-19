# Implementation Plan: Growth Loop (Idea Detail, Watering, Edit, Delete, Animation)

**Branch**: `003-growth-loop` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-growth-loop/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Wire up the **Step 2 growth loop** on top of the `001-foundation-homepage` baseline already on `master`. A click on any idea card opens a detail modal whose contents are loaded via a new `GET /api/ideas/:id` endpoint. From the modal the user can (a) read the full timeline of past "waterings", (b) submit a new watering through `POST /api/ideas/:id/updates` and watch a 3D growth animation drive the plant texture forward, (c) curate the timeline with `PATCH/DELETE /api/ideas/:id/updates/:updateId`, (d) refine the idea's metadata with `PATCH /api/ideas/:id`, and (e) remove the idea entirely with `DELETE /api/ideas/:id`. The page fires a page-wide confetti burst on exactly two milestone transitions: the **first watering** on a fresh idea (Level 1 → 2) and the **bloom** moment (Level 15 → 16). Both bursts are rendered by a small in-house canvas component (no third-party confetti library).

The stage progression rule changes from "stored cap" to **"current stage = max(stage_after across remaining updates)"**, with a floor of 1, plus an empty-set baseline of 1 (so the first watering takes a fresh idea from Level 1 to Level 2). To keep `GET /api/ideas` cheap, the server **persists** the derived stage on the `ideas.stage` column and recomputes it inside the same transaction as every update insert/edit/delete; reads never recompute. The growth animation is rendered with raw `three.js` plus `EffectComposer` + `UnrealBloomPass` for the headline "Pokémon evolution" flash (orb + shockwave rings + GPU particle burst, composited over the PNG via `mix-blend-mode: screen`). Confetti is rendered by a small in-house canvas component mounted via `createPortal` at `document.body` — no third-party confetti library.

The plan explicitly records two scope deviations from upstream documents — pulling in PRD §2.7 stretch goals (edit/delete) and waiving Constitution Principle III's animation accessibility / 60 fps CSS fallback — and justifies both in the Complexity Tracking table.

## Technical Context

**Language/Version**: TypeScript 5.6+ run on **Node.js 22.6+ with `--experimental-strip-types`** on the server; bundled by Vite for the browser.
**Primary Dependencies** (additions over the 001 baseline are starred):
- Web: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `zod`, **\* `three`**. The confetti is hand-rolled (no library), and the bloom-flash viewport uses raw `three.js` directly (the `@react-three/fiber` / `@react-three/drei` packages installed during early iterations are no longer imported by the shipped viewport — leaving them installed costs nothing and avoids lockfile churn).
- Server: `fastify`, `@fastify/cors`, `better-sqlite3`, `zod`, `fastify-type-provider-zod`, `ulid` (already in baseline; no additions).
- Shared: `zod`.
- Test: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`. Backend tests still use Fastify `inject` against a per-test SQLite file.
- Tooling: `concurrently`, `@types/better-sqlite3`, `@types/node`, **\* `@types/three`**.

**Storage**: SQLite file at `data/garden.db` (gitignored). The baseline `ideas` table is preserved as-is; a **new `idea_updates` table** is added with a `CREATE TABLE IF NOT EXISTS` on server boot. No migration tooling.
**Testing**: Vitest everywhere.
- Server: contract tests with `app.inject(...)` against per-test SQLite files. Every endpoint listed in [contracts/api.md](./contracts/api.md) gets at minimum one happy-path test and one validation-error test, plus the four bug-hunt edge cases mandated by Constitution Principle II (PRD §W.3: empty note rejected, stage-16 update keeps stage at 16, transactional failure mid-update rolls back, rapid double-submit produces monotonic stage).
- Web: Vitest + React Testing Library. Every behaviour-owning component (`IdeaDetailModal`, `UpdateForm`, `EditIdeaForm`, `Timeline`, `TimelineEntry`, `ConfirmDeleteDialog`, `PlantViewport`, `OverflowMenu`) gets a unit test covering rendered output and user-event flows.
- The Three.js scene (`PlantViewport`) detects jsdom (no WebGL) and falls back to a `setTimeout(resolve, ANIMATION_DURATION_MS)` stub of `playGrowth`; unit tests advance fake timers past the duration and assert the promise resolves. The `IdeaDetailModal` tests mock `PlantViewport` directly (`vi.mock('./PlantViewport.tsx', ...)`) to capture `playGrowth` calls without needing a real canvas.

**Target Platform**: Modern Chromium-class browsers (latest Chrome / Edge / Firefox) on macOS or Linux laptops. No mobile support beyond "doesn't break."

**Project Type**: Web monorepo, same three workspaces as the baseline (`apps/web`, `apps/server`, `packages/shared`).

**Performance Goals**: Modal interactive within 1 s of card click (SC-001); growth animation runs 1500–2500 ms total (FR-024) and never exceeds 3 s to "modal interactive again" (SC-008); edit Save round-trips in under 1 s (SC-003); delete-idea removes modal+card in under 1 s (SC-005). The constitutional 60 fps animation budget is **explicitly waived** for this feature (FR-027); see Complexity Tracking below.

**Constraints**: Single user, single laptop. Server is the source of truth for `stage`. Inputs parsed through shared Zod schemas at every network boundary. No build step server-side. All stage-altering mutations (POST update / PATCH update / DELETE update / DELETE idea) execute inside a single SQLite transaction so the `idea_updates` row and the recomputed `ideas.stage` either both persist or neither does.

**Scale/Scope**: 1 user, ~200 ideas, ~50 updates per idea worst case. This feature adds **6 endpoints** (`GET /api/ideas/:id`, `PATCH /api/ideas/:id`, `DELETE /api/ideas/:id`, `POST /api/ideas/:id/updates`, `PATCH /api/ideas/:id/updates/:updateId`, `DELETE /api/ideas/:id/updates/:updateId`), **1 SQLite table** (`idea_updates`), and ~9 new React components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The principles relevant to this feature are I, II, III, IV, plus the Tech-Stack and Workflow sections.

### Principle I — Code Quality & Simplicity

| Gate | Status | Evidence |
|---|---|---|
| TypeScript mandatory on web and server, no `any` in shared code | **PASS** | All new code lives in `apps/web` (TS) and `apps/server` (TS via type-stripping). Shared schemas remain Zod-only. |
| One source of truth for API types | **PASS** | New schemas (`IdeaUpdateSchema`, `NewIdeaUpdateInputSchema`, `EditIdeaInputSchema`, `EditIdeaUpdateInputSchema`, `IdeaDetailResponseSchema`, `MutationResponseSchema`) are added to `packages/shared` and consumed unchanged by both client and server. |
| No build step on the server | **PASS** | Server entry remains `node --experimental-strip-types apps/server/src/index.ts`. |
| YAGNI / no speculative abstractions | **PASS** | One new table, six new endpoints, all required by FR-001 through FR-034. No repository pattern, no service layer, no event bus, no extra modal abstraction beyond what the existing `NewIdeaModal` pattern already establishes. |
| Errors surface, never silently swallow | **PASS** | FR-015, FR-031, FR-034 all map to user-visible error surfaces. The modal carries two error surfaces (per-form inline error + a toast region for non-form mutations); both render on every non-2xx response. |
| Server is the source of truth for state | **PASS** | The client never computes `stage` locally. After every successful mutation it reads the returned `idea.stage` and uses it verbatim. Both confetti triggers (`prev_stage === 1 && idea.stage === 2` for first watering, `prev_stage < 16 && idea.stage === 16` for bloom) compare **server-returned values** only — no client guesswork. |

### Principle II — Testing Standards

| Gate | Status | Evidence |
|---|---|---|
| API contract tests for every endpoint, happy path and validation error | **PASS (planned)** | All six new endpoints get explicit contract tests; see [contracts/api.md](./contracts/api.md) "Tested by" lines. |
| Frontend unit tests for every behaviour-owning component | **PASS (planned)** | Every new component listed in Project Structure carries a sibling `.test.tsx` enumerated below. |
| Four bug-hunt edge cases (PRD §W.3) on the SDD branch | **PASS (planned)** | (1) empty-note rejected → server contract test on `POST /api/ideas/:id/updates`; (2) stage-16 idea receives an update → `stage` stays 16 → contract test and component test; (3) transactional failure mid-update → contract test with simulated DB failure mid-transaction; (4) rapid double-submit → server-returned `stage` is monotonic → contract test that hammers the endpoint sequentially while the client-side test verifies the submit button disables. |
| Schemas validated at every boundary | **PASS** | Fastify's Zod type provider rejects malformed bodies before the handler runs. The client also parses every response through the shared schema before trusting it. |
| Acceptance criteria are testable | **PASS** | Every checkbox in spec.md §Acceptance Scenarios and §Success Criteria maps to either a Vitest test or a Playwright manual-verification step in [quickstart.md](./quickstart.md). |
| Agent has a way to exercise the running app | **PASS (precondition)** | Playwright MCP remains the agent's hands during `/speckit-implement`. The implementation tasks include explicit Playwright-driven verification of the growth animation, confetti firing at stage 16, edit-mode, and delete-idea confirmation. |

### Principle III — User Experience

| Gate | Status | Evidence |
|---|---|---|
| Inline validation only — no separate alert/modal for form errors | **PASS** | FR-007, FR-012 — title/description/note errors render below their respective fields. The delete-idea confirmation is **not** a form error; it is a confirmation dialog, which is appropriate per design.md. |
| Modals escapable three ways (X / Escape / backdrop) | **PASS** | FR-004 — `IdeaDetailModal` and `ConfirmDeleteDialog` both honour X / Escape / backdrop. The lone exception is "while a growth animation is playing" (FR-022), which is explicitly speced. |
| No silent failures | **PASS** | FR-015, FR-031, FR-034. |
| Empty states first-class | **PASS** | FR-020 — the empty-timeline state is a designed component (`EmptyTimeline`), not a blank `<ul/>`. |
| Optimistic feedback on watering | **DEVIATION** | The spec resolved this in the opposite direction: watering submissions wait for the server response before animating (FR-013). This is a *deliberate* trade against PRD §F2.3's optimistic phrasing; it eliminates the rollback complexity and was confirmed during clarification. Captured in **Complexity Tracking row 1**. |
| Animation has a hard performance budget; CSS fallback if not 60 fps | **DEVIATION** | FR-027 explicitly waives the constitutional fallback. Captured in **Complexity Tracking row 2**. |

### Principle IV — UI & Visual Design

| Gate | Status | Evidence |
|---|---|---|
| `design.md` is the source of truth; Tailwind theme already wired from its tokens | **PASS** | No new colors, typography sizes, or spacing values are introduced. The "Fully bloomed" badge reuses `badge-stage` (per design.md). The bloom-palette variant of the animation reuses `colors.star` / `colors.primary` tokens; the confetti uses the existing palette. |
| Modals follow the modal pattern (rounded.xl, 560px max, three-way close) | **PASS** | `IdeaDetailModal` follows the same shape as `NewIdeaModal`. The detail modal is slightly taller (full timeline) but keeps the documented max-width. |
| Plant art under `assets/plants/<species>/stage-NN.png` | **PASS** | Already in place from baseline; the 3D scene loads the same PNGs as textures. |
| Stage visibility | **PASS** | "Level N" / "Fully bloomed" badge in modal header; card badge unchanged (already shipped). |
| Sidebar and "Today's Focus" deferred | **PASS** | Still deferred. |
| New components consume tokens, not magic values | **PASS** | The overflow `(⋮)` menu, the confirm-delete dialog, the timeline entries, the bloom badge — all use existing design.md tokens. |

### Tech Stack & Scope Discipline

| Gate | Status | Evidence |
|---|---|---|
| Stack matches PRD §5 | **PASS** | React + Vite + TypeScript + Tailwind on web; Fastify on Node 22+; SQLite via `better-sqlite3`; Zod shared. `@react-three/fiber` + `@react-three/drei` + `three` are explicitly listed in PRD §5 for the animation. |
| Monorepo via npm/pnpm workspaces, no Turborepo/Nx | **PASS** | npm workspaces only. |
| No PRD §2.7 stretch goals pulled in beyond what the spec authorises | **DEVIATION** | The spec authorises **edit-idea** and **delete-idea** — both listed in PRD §2.7 as stretch. The product owner explicitly requested them in this slice. Captured in **Complexity Tracking row 3**. The remaining §2.7 stretch (wilting, sidebar filters, favorites, "Today's Focus", sort) **are not** pulled in. |
| No new third-party confetti dependency | **PASS** | An earlier iteration installed `react-confetti-explosion` (a product-owner preference at the time), but its internal positioning conflicted with the modal's stacking context. The shipped implementation is a ~150-line in-house canvas component (`ConfettiBurst.tsx`), zero dependencies. |

### Workflow

| Gate | Status | Evidence |
|---|---|---|
| `master` is built with the full SDD loop | **PASS (in progress)** | `001-foundation-homepage` is the previous SDD pass. This `003-growth-loop` continues that pattern. |
| Constitution Check runs before Phase 0 and after Phase 1 | **PASS** | This section is the pre-Phase-0 check; a re-check sits at the bottom of the plan after Phase 1 is fleshed out. |

**Initial Constitution Check verdict**: **PASS with three documented deviations** (rows 1, 2, 3 in Complexity Tracking). All three are required by the product-owner-confirmed spec and have no simpler alternatives.

## Project Structure

### Documentation (this feature)

```text
specs/003-growth-loop/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md           # Wire contract for the six new endpoints
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created by /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Additions over the `001-foundation-homepage` baseline are starred. Unstarred entries already exist.

```text
sdd-workshop/
├── apps/
│   ├── web/
│   │   ├── package.json                      # *adds three, @types/three (and historically @react-three/fiber + drei + react-confetti-explosion, kept in package.json but no longer imported by shipped code)
│   │   └── src/
│   │       ├── api/
│   │       │   └── ideas.ts                  # *extended: getIdea, patchIdea, deleteIdea, addUpdate, patchUpdate, deleteUpdate
│   │       ├── components/
│   │       │   ├── Garden.tsx                # *extended: wires card click to open IdeaDetailModal; deletes use returned idea to update local list
│   │       │   ├── IdeaCard.tsx              # *minor: clickable wrapper, no behaviour change
│   │       │   ├── IdeaDetailModal.tsx       # *new: top-level modal: header + plant viewport + meta + timeline + update form + overflow menu
│   │       │   ├── EditIdeaForm.tsx          # *new: inline form swapped in when Edit clicked; title (1-80) + description (0-500) with inline validation
│   │       │   ├── UpdateForm.tsx            # *new: textarea (1-1000 chars, multiline) + submit; awaits server, surfaces error inline
│   │       │   ├── Timeline.tsx              # *new: ordered list of TimelineEntry, newest first; empty-state slot
│   │       │   ├── TimelineEntry.tsx         # *new: one entry with note (preserved newlines) + relative timestamp + stage badge + inline edit/delete
│   │       │   ├── EmptyTimeline.tsx         # *new: illustration + "No waterings yet" + "Give this idea its first drink"
│   │       │   ├── PlantViewport.tsx         # *new: <Canvas> with a TexturedPlane mesh + ParticleBurst; exposes imperative `playGrowth({ from, to, palette })`
│   │       │   ├── OverflowMenu.tsx          # *new: (⋮) button + small dropdown; positioned in modal header
│   │       │   ├── ConfirmDeleteDialog.tsx   # *new: nested dialog over modal; "Yes, delete forever" + Cancel
│   │       │   ├── LevelBadge.tsx            # *new: renders "Level N" or "Fully bloomed" using badge-stage token
│   │       │   └── ConfettiBurst.tsx         # *new: canvas-based confetti rendered via createPortal at document.body; two variants ('firstWatering', 'bloom')
│   │       ├── hooks/
│   │       │   ├── useIdeas.ts               # *extended: editIdea, deleteIdea, addUpdate, editUpdate, deleteUpdate — all update local state from server response
│   │       │   └── useIdeaDetail.ts          # *new: fetches GET /api/ideas/:id when modal opens; handles skeletons + 404
│   │       └── lib/
│   │           └── relativeTime.ts           # unchanged, reused for timeline entries
│   └── server/
│       └── src/
│           ├── app.ts                        # *minor: still registers the same routes module (no top-level change)
│           ├── db.ts                         # *extended: adds idea_updates DDL + prepared statements + a runUpdateMutation transactional helper
│           └── routes/
│               └── ideas.ts                  # *extended: adds GET /:id, PATCH /:id, DELETE /:id, POST /:id/updates, PATCH /:id/updates/:updateId, DELETE /:id/updates/:updateId
└── packages/
    └── shared/
        └── src/
            ├── ideas.schema.ts               # *extended: IdeaUpdateSchema, NewIdeaUpdateInputSchema, EditIdeaInputSchema, EditIdeaUpdateInputSchema, IdeaDetailResponseSchema, MutationResponseSchema
            └── index.ts                      # *re-exports the new schemas

# Tests are colocated next to the file they cover.
# - apps/web/src/components/*.test.tsx        — every new component above gets one
# - apps/web/src/hooks/useIdeaDetail.test.tsx — fetch + skeleton + 404 paths
# - apps/server/src/routes/ideas.test.ts      — extended to cover the six new endpoints + the four bug-hunt edge cases
# - apps/server/src/db.test.ts                — covers the idea_updates DDL and the runUpdateMutation transactional helper
# - packages/shared/src/ideas.schema.test.ts  — covers the new schemas' parse round-trips
```

**Structure Decision**: Continue with the **baseline monorepo layout** verbatim. No new workspaces; no new top-level directories. Components, hooks, and routes are *added* to the existing folders rather than reorganised, so the diff against `001-foundation-homepage` stays small and the workshop's side-by-side comparison remains legible. The single most architecturally interesting change is **`apps/server/src/db.ts` gaining a `runUpdateMutation` helper** that wraps the "insert/edit/delete an update AND recompute `ideas.stage`" pair into one transaction — this is where the constitution's "server is the source of truth for state" rule earns its keep.

## Complexity Tracking

> Three documented deviations. Each is required by the spec and has no simpler alternative that still satisfies the spec.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| **No optimistic UI on watering**, against PRD §F2.3 phrasing ("the form clears and the growth animation starts immediately") | The spec (FR-013) resolved this in clarification: watering submissions wait for the server response before animating. The product owner accepted the small perceived-latency cost in exchange for eliminating the "animation played but server rejected" rollback case, which is the gnarliest UX failure mode in the optimistic flow. | An optimistic-then-reverse animation was the PRD's original intent. Rejected because (a) the rollback case is the worst-feeling state in the app — animating *backwards* on error is visibly worse than waiting a beat for the network; (b) implementing reverse-tweening doubles the R3F state machine for a single UX corner; (c) on a single-user local SQLite app the round-trip is single-digit milliseconds — the "optimistic" gain is mostly theoretical. The spec is the binding authority over PRD per the Constitution governance rules. |
| **No CSS fallback for the growth animation; `prefers-reduced-motion` not honoured**, against Constitution Principle III ("Animation has a hard performance budget. The Three.js growth animation MUST run at 60fps on a 2020+ MacBook Air. If it cannot, fall back to the CSS animation rather than ship a janky 3D version. This is PRD §F2.4 and is non-negotiable.") | The spec (FR-027) explicitly waives this rule by product-owner direction. The animation is the workshop's headline visual; the product owner judged that a CSS fallback dilutes the demo. | The constitutional fallback was rejected for this feature only. We accept that on a sufficiently slow device the animation may drop frames; the modal's "fully blocking" mode (FR-022) at least guarantees the user cannot interact with a half-frozen UI. This deviation is **feature-scoped**, not a constitutional amendment — Constitution Principle III continues to bind any future feature unless re-negotiated. |
| **Pulling PRD §2.7 stretch goals (edit-idea, delete-idea) into Step 2**, against PRD §2.7 ("These exist in the mockup but are deliberately deferred — they would dilute the workshop's focus on the growth loop.") and Constitution Tech Stack & Scope Discipline ("The non-goals in PRD §2 … MUST NOT be pulled in by side-quests during implementation."). | The product-owner-confirmed spec (User Stories 2 and 5) requires both. Editing-decoupled-from-watering also keeps the data-model honest: without an Edit affordance, the only way for a user to fix a typo would be to delete-and-recreate the idea, which has no narrative value. | Shipping the growth loop *without* edit/delete was the simpler alternative. Rejected because (a) the product owner judged that a real growth-loop demo needs the ability to fix typos and remove dead ideas, otherwise the workshop audience asks "what about edit?" within the first minute; (b) implementing edit/delete cleanly as part of the original modal is dramatically cheaper than retrofitting them later; (c) the two affordances add **no** behavioural overlap with the watering loop — they are orthogonal mutations that share only the modal shell. The remaining §2.7 stretch (wilting, sidebar filters, favorites, "Today's Focus", sort) **stay deferred**. |

## Phase 0 — Outline & Research

See [research.md](./research.md). The questions resolved there were:

1. **Stage representation: derived per-request vs. persisted column.** → **Persisted column, recomputed inside every stage-altering transaction.** Cheap reads; the existing `IdeaSchema` requires `stage` on the wire.
2. **Update note width — 500 vs. 1000 chars.** → **1000 chars** to match the spec (FR-011).
3. **Transactional helper shape.** → **One `runUpdateMutation(db, ideaId, fn)` helper** in `db.ts` that wraps a callback in a `BEGIN IMMEDIATE` transaction and recomputes `ideas.stage` from `idea_updates`.
4. **3D rendering choice — `@react-three/fiber` vs. raw three.js.** → **Raw three.js**, after three viewport iterations. The R3F + drei packages were installed and used for the v1 textured-plane viewport, but the shipped v3 ("bloom-driven evolution flash") uses raw three.js with `EffectComposer` + `UnrealBloomPass` directly. R3F remains in `package.json` but is no longer imported by shipped code.
5. **Confetti rendering — third-party library vs. in-house canvas.** → **In-house canvas component** (`ConfettiBurst.tsx`, ~150 lines). An earlier iteration installed `react-confetti-explosion` but its internal positioning conflicted with the modal's stacking context; canvas + portal gives full control over z-order, palette, particle count, and per-variant duration.
6. **How does the client know it just hit stage 16?** → **Compare server-returned `prev_stage` to `new_stage`** in the watering response (the server returns both).
7. **Card refresh strategy after modal closes.** → **Local state, no refetch** (FR-032 in the spec). The mutation responses carry the updated idea row; `useIdeas` patches the cached list.
8. **Hashing the relationship between idea and idea_updates.** → **Foreign key with `ON DELETE CASCADE`.** `DELETE /api/ideas/:id` does the cascade in one statement.
9. **Plant texture swap timing inside the animation.** → **At ~60% of the animation duration** (between the from-PNG fade-out and the to-PNG fade-in), inside the raw-three.js render loop; the bloom-driven viewport handles this as a CSS `opacity` cross-fade on two stacked `<img>` elements layered behind the canvas. See R14 (third revision).

**Output**: [research.md](./research.md) with all open decisions resolved.

## Phase 1 — Design & Contracts

**Prerequisites**: research.md complete (above).

1. **Entities** — see [data-model.md](./data-model.md). Two entities (`Idea` re-described, `IdeaUpdate` new), one new table, state-transition rules for `stage`, and the SQLite DDL for `idea_updates`.
2. **Contracts** — see [contracts/api.md](./contracts/api.md). Six new endpoints documented with request/response/error shapes, all referencing the shared Zod schemas.
3. **Quickstart** — see [quickstart.md](./quickstart.md). Single-command dev workflow (unchanged), manual-verification recipes for every acceptance scenario in the spec, plus smoke checks for both confetti triggers (first-watering burst on Level 1 → 2; bloom burst on Level 15 → 16).
4. **Agent context** — `CLAUDE.md` is updated to point at this plan between the `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers so downstream `/speckit-tasks` and `/speckit-implement` runs read the latest plan.

### Post-Phase-1 Constitution Re-Check

After fleshing out the data model, contracts, and quickstart, re-evaluating each gate:

- **Principle I**: still **PASS**. Every new wire shape lives in `packages/shared`; no hand-mirrored types. The `IdeaDetailResponseSchema` is the single source for both the GET endpoint's response and the `useIdeaDetail` hook's parsed payload.
- **Principle II**: still **PASS**. The contracts document explicitly enumerates the four bug-hunt edge cases under "Tested by" lines on the relevant endpoints. The quickstart maps each spec acceptance scenario to either a Vitest assertion or a manual Playwright check.
- **Principle III**: still **PASS-with-deviations** (rows 1 and 2 in Complexity Tracking). No new deviations introduced by the design phase.
- **Principle IV**: still **PASS**. The data-model and contracts add no UI surface; component composition in Project Structure stays inside design.md tokens.
- **Tech Stack & Scope Discipline**: still **PASS-with-deviation** (row 3). No new dependencies beyond the four listed under Primary Dependencies.
- **Workflow**: on track for one commit per SDD phase.

**Post-design Constitution Check verdict**: **PASS with three pre-existing documented deviations.** No new complexity to track.

## Phase 2 — Tasks (handled by `/speckit-tasks`, not this command)

`/speckit-plan` stops here. The next command, `/speckit-tasks`, will read this plan and the Phase-1 artifacts and produce a dependency-ordered `tasks.md`.

## Addendum — Post-MVP UX Polish (2026-05-12)

After the first end-to-end pass shipped, the product owner asked for the following revisions, which are now binding and reflected in the spec (FR-035 to FR-043) and `tasks.md` (T077–T082):

1. **Confetti rendering & z-order (FR-025 + FR-043, revised again)**. The confetti went through three iterations:
   - **v1 (rejected)**: `react-confetti-explosion` rendered inside the modal's DOM subtree. The library inherited the modal's stacking context and clipped behind the panel.
   - **v2 (rejected)**: same library, this time mounted via `createPortal` at `document.body` with `z-index: 2147483647`. The portal escaped the modal's stacking context, but the library's *internal* positioning constrained particles to a small box around its anchor — the visual still didn't read as "page-wide".
   - **v3 (shipped)**: a small in-house canvas component, `ConfettiBurst.tsx` (~150 lines). A `<canvas>` is mounted via `createPortal` at `document.body` at `position: fixed; inset: 0` with the same max z-index, then particles are drawn directly to it with the 2D context. Two variants (`'firstWatering'`, `'bloom'`) tune palette / count / duration. Zero third-party dependencies; full control over z-order and the visual.
   - The trigger logic in the modal now sets the variant: `'bloom'` when `prev_stage < 16 && idea.stage === 16`, `'firstWatering'` when `prev_stage === 1 && idea.stage === 2`, otherwise no confetti.

2. **Bloom-driven evolution flash (FR-039–FR-042 + FR-044, final)**. The viewport went through three iterations:
   - **v1**: each stage's PNG sprite on a textured plane with an ease-out-back scale curve. Mechanically correct but visually flat.
   - **v2**: per-stage procedurally generated branching plant. Richer, but at low stages it was a bare twig and at high stages stages 14 vs 15 vs 16 were visually indistinguishable. The geometric/low-poly aesthetic also clashed with the editorial visual language.
   - **v3 (shipped)**: a **bloom-driven evolution flash** — no procedural geometry at all. The idle viewport just shows the stage PNG. On `playGrowth(...)`, the Three.js canvas reveals (opacity 0 → 1) and plays a single canonical animation composed of:
     - **Glowing core orb** — a billboard sprite at center with a hot-white core fading through gold to transparent. Bell-shape scale to a ~8.5-unit peak around 35 % of the animation.
     - **Three staggered shockwave rings** — `RingGeometry` + a custom shader producing a thin bright ring with soft edge falloff. Each ring expands outward and fades; the three are staggered by ~12 % of total duration.
     - **GPU-driven particle burst** — 720 particles with `BufferGeometry` attributes (`aAngle`, `aTilt`, `aSpeed`, `aLifespan`, `aOffset`, `aSize`, `aColorMix`) baked at construction time. The vertex shader computes per-frame radial expansion from a single `uTime` uniform; the fragment shader writes gold/orange/white-tinted color above the bloom threshold so every particle blooms.
     - **PNG cross-fade** — the from-PNG fades out 28–60 %, the to-PNG fades in 62–95 %. The bloomed orb + rings + particles dominate the middle and the new stage emerges from the glow.
   - **Real glow via post-processing**: an `EffectComposer` runs `RenderPass` → `UnrealBloomPass` (strength 1.65, radius 0.85, threshold 0.04). Tone mapping is disabled (`NoToneMapping`) so the shader's bright outputs survive into the bloom pass unclipped.
   - **Black-canvas fix (FR-044)**: `UnrealBloomPass` writes `alpha = 1` in its composite step, so the canvas would otherwise paint a solid black rectangle over the PNG. Two safeguards in tandem: (a) `renderer.domElement.style.mixBlendMode = 'screen'`, which makes dark pixels a no-op against the PNG behind and bright pixels brighten through additively; (b) the canvas is held at `opacity: 0` at rest, brought to `opacity: 1` only while animating, and `composer.render()` is skipped while idle to save the GPU.
   - **Bloom palette variant** (stage 16 transitions): brighter gold + hotter orange particle palette, larger orb peak (~10 vs ~8.5 units), wider ring expansion (~7.5 vs ~6 units). Timing and phase structure are unchanged.
   - **PNG canonical**: the 16-stage PNGs in `assets/plants/oak/` remain the source of truth for both grid thumbnails AND modal idle/reveal frames. The `playGrowth({ from, to, palette })` imperative API is unchanged across all three iterations, so the modal's call site never moved.

3. **Stage progression rule (FR-016, revised 2026-05-12)**. The first iteration adopted "first watering = stage 1" (empty-set baseline of 0 in the `min(MAX + 1, 16)` formula), which kept the algebra clean but produced a counterintuitive UX: the first watering visibly produced no change. The revised rule is **"N waterings → Level N+1, capped at 16"** — empty-set baseline of 1 in the same formula. First watering takes a fresh idea from Level 1 to Level 2. Implementation is a one-line change in `apps/server/src/routes/ideas.ts` (`?? 0` → `?? 1`); existing tests pass unchanged because they read `startStage` dynamically and assert `+1`. Stage 16 is reached at the 15th watering rather than the 16th; the bloom-confetti trigger (`prev_stage < 16 && idea.stage === 16`) works identically.

3. **Full-page two-column modal (FR-035–FR-038)**. The first implementation used a 640-px-max single-column modal that scrolled as a whole. The redesign:
   - Replaces `max-w-[640px]` with `~95vw × ~90vh` sizing for a near-full-page panel on desktop.
   - At `md+` (≥ 768 px), splits the body into **two columns**: Column 1 (identity + plant viewport + level badge, non-scrolling) and Column 2 (update form on top, timeline list below, independently scrollable).
   - Below `md`, collapses to a single column with the order: title → description → plant viewport → level badge → update form → timeline.
   - **Repositions the update form above the timeline** in both layouts (FR-038). The "next step" affordance is now at the top of the reading flow, not hidden at the bottom of a long history list.
   - Used the project's `frontend-design` skill principles for typography hierarchy, spacing rhythm, and the editorial visual language already established by the landing page (`Fraunces` italic display, `Inter` body, `paper` ivory background, soft amber/primary blooms, hairline `border` token).

These three revisions are **UX-only**. They do not alter the API contract, the data model, the shared schemas, or the server-side stage-recompute transactional logic. The Constitution Check verdicts are unchanged; no new deviations were introduced (and no existing deviations were removed).
