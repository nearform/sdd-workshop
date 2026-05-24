# Implementation Plan: Foundation & Homepage (Step 1 Baseline)

**Branch**: `001-foundation-homepage` | **Date**: 2026-05-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-foundation-homepage/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Stand up the **Step 1 baseline on `master`** for the Idea Garden workshop: a runnable monorepo whose homepage shows an empty state on first visit, lets the user plant a new idea via a modal form, and renders ideas as a responsive grid of cards backed by durable local storage. The constitution and [PRD §5](../../.specify/memory/PRD.md#5-tech-stack) bind the stack: a TypeScript monorepo with **Vite + React + Tailwind** on the web, **Fastify on Node 22+ with native type stripping** on the server, **SQLite via `better-sqlite3`** for persistence, and a **shared Zod schema package** as the single source of truth for API request/response shapes. One workspace dev script (`npm run dev`) starts both apps; one workspace test script runs the Vitest suites.

The plan deliberately defers anything that belongs to Step 2 — modal-based idea detail, the watering loop, stage progression beyond stage 1, the Three.js animation. Stage and species columns are nevertheless created in the schema from day one (PRD §1.3) so Step 2 needs no migration.

## Technical Context

**Language/Version**: TypeScript 5.6+ run on **Node.js 22.6+ with `--experimental-strip-types`** on the server (no build step server-side); transpiled by Vite for the browser bundle.
**Primary Dependencies**:
- Web: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `zod`.
- Server: `fastify`, `@fastify/cors`, `better-sqlite3`, `zod`, `fastify-type-provider-zod`, `ulid`.
- Shared: `zod` (single source for API request/response schemas).
- Test: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `supertest` (or Fastify's `inject`) for API contract tests.
- Tooling: `concurrently` (or `npm-run-all`) to fan out the dev script; `typescript` (only for the web app's `tsc --noEmit` typecheck and editor support); `@types/better-sqlite3`, `@types/node`.
**Storage**: SQLite file at `data/garden.db` (gitignored). Schema is created on server boot if absent; no migration tooling.
**Testing**: Vitest everywhere. Backend uses Fastify's in-process `app.inject(...)` for contract tests over a per-test SQLite file. Frontend uses Vitest + React Testing Library + jsdom. Playwright MCP (or equivalent browser-driving capability) is the agent's "hands" during `/speckit.implement` to self-verify the UX acceptance criteria from spec.md.
**Target Platform**: Modern Chromium-class browsers (latest Chrome / Edge / Firefox) on macOS or Linux laptops. No mobile support beyond "doesn't break".
**Project Type**: **Web monorepo** with three workspaces — `apps/web`, `apps/server`, `packages/shared` — orchestrated by **npm workspaces** (no Turborepo, no Nx).
**Performance Goals**: Homepage initial render under 1s with 200 ideas (SC-006); interactive within 30s of opening the app (SC-001); cold dev start under 2 minutes from clone (SC-002). The 60fps animation budget belongs to Step 2 and is out of scope here.
**Constraints**: Single user, single laptop, hundreds of ideas. No auth, no rate limiting, no observability tooling. No build step server-side. The server is the source of truth for state; the client never invents stage values. All inputs are parsed through the shared Zod schemas at the network boundary.
**Scale/Scope**: 1 user, ~200 ideas. Step 1 ships **two endpoints** (`GET /api/ideas`, `POST /api/ideas`); the remaining two endpoints in PRD §1.4/§2.5 belong to Step 2. ~10 React components, ~3 server modules, ~1 SQLite table.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The relevant principles for this feature are I, II, III, IV, plus the Tech-Stack and Workflow sections. The animation budget in III and the testing requirements specific to Step 2 (the four bug-hunt edge cases in II) **do not apply** to Step 1.

### Principle I — Code Quality & Simplicity

| Gate | Status | Evidence |
|---|---|---|
| TypeScript mandatory on web and server, no `any` in shared code | **PASS** | `apps/web` and `apps/server` are both TypeScript-only; shared schemas in `packages/shared` are Zod (so types are inferred, not hand-written). |
| One source of truth for API types | **PASS** | All request/response schemas live in `packages/shared` as Zod schemas; client and server import them. No mirrored types. |
| No build step on the server | **PASS** | Server runs via `node --experimental-strip-types apps/server/src/index.ts`. |
| YAGNI / no speculative abstractions | **PASS** | Two endpoints, one table, ~10 components. Stage and species columns are added now per PRD §1.3 (not speculative — they are explicit Step 1 requirements). No repository pattern, no service layer, no DI container. |
| Errors surface, never silently swallow | **PASS** | Constitution reflected in FR-023/SC-005. Client surfaces backend errors to the relevant UI surface; server returns `{ error, details? }` with appropriate status. |
| Server is the source of truth for state | **PASS** | Even though stage stays 1 in this feature, the contract is "client uses what the server returns." The shared schema's response types are the only shape the client trusts. |

### Principle II — Testing Standards

| Gate | Status | Evidence |
|---|---|---|
| API contract tests for every Step 1 endpoint, both happy path and validation error | **PASS (planned)** | `GET /api/ideas` and `POST /api/ideas` each get contract tests via Fastify's `inject` against a per-test SQLite file. `tasks.md` will list them explicitly. |
| Frontend unit tests for every behaviour-owning component | **PASS (planned)** | Vitest + RTL covers the creation form (validation, submit, reset, dismissal), the idea card (stage rendering, relative timestamp), the empty state, and the App page (list fetch, error surface, optimistic prepend). No snapshot-only tests. |
| Bug-hunt edge cases (PRD §W.3) | **N/A for Step 1** | Those four cases concern the watering loop and live on the SDD branch's Step 2 spec, not here. |
| Schemas validated at every boundary | **PASS** | Fastify's Zod type provider rejects malformed bodies before the handler runs. The client also parses GET responses through the same shared schema before trusting them. |
| Acceptance criteria are testable | **PASS** | Every checkbox in PRD §1.6 maps to either a Vitest test (creation, persistence on reload) or to a quickstart.md manual-verification step (the dev command). |
| Agent has a way to exercise the running app | **PASS (precondition)** | Playwright MCP is the default. The `/speckit.implement` task list will include explicit Playwright-driven verification of the homepage acceptance scenarios. If the MCP is unavailable at implementation time, the gap will be called out in the PR description per Principle II. |

### Principle III — User Experience

| Gate | Status | Evidence |
|---|---|---|
| Inline validation only — no separate alert/modal for form errors | **PASS** | FR-015 / spec acceptance scenario 5–6 / form component design (see Phase 1 below). |
| Modals escapable three ways (X / Escape / backdrop) | **PASS** | FR-016. The `<NewIdeaModal>` component listens for Escape, closes on backdrop click, and renders an explicit close control. |
| No silent failures | **PASS** | FR-023 / SC-005. Both error surfaces (form area for create errors, grid area for list errors) are explicit in the design. |
| Empty states first-class | **PASS** | FR-011 — the empty garden has a designed illustration, headline, body line, and primary CTA, not a blank panel. |
| Optimistic feedback / animation perf budget | **N/A for Step 1** | The watering optimistic flow and the 60fps animation budget are Step 2 concerns. |

### Principle IV — UI & Visual Design

| Gate | Status | Evidence |
|---|---|---|
| `design.md` is the source of truth; Tailwind theme configured from its tokens | **PASS** | The Tailwind config consumes the colors, typography sizes, spacing scale, and rounded values defined in [design.md](../../.specify/memory/design.md). Inline `style=` is reserved for runtime-computed values (none in Step 1). |
| Tone, palette, rounded corners, Inter typography | **PASS** | All cards/modals/buttons use `design.md` tokens. Page background uses `colors.neutral` (cream); cards use `colors.surface` (white); primary action uses `colors.primary`. Inter is the only typeface. |
| Plant art available under `assets/plants/<species>/stage-NN.png` | **PASS** | The full 16-stage oak sprite sequence (`stage-01.png` … `stage-16.png`) is committed under `assets/plants/oak/`. Step 1 only renders `stage-01`, but the rest are in place for future stage-progression work. |
| Stage visibility on cards | **PASS** | The card metadata row shows a `Level 1` badge using the `badge-stage` token. |
| Responsive grid scales to 4 columns; cards capped so a single card never stretches | **PASS** | FR-022 maps to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` with a `max-w-sm` cap on each card (`justify-self-start` so the cap is honoured inside its grid track). |
| Sidebar and "Today's Focus" deferred | **PASS** | Step 1 ships header + grid + creation flow only; sidebar is explicitly deferred. |

### Tech Stack & Scope Discipline

| Gate | Status | Evidence |
|---|---|---|
| Stack matches PRD §5 | **PASS** | React + Vite + TypeScript on web; Fastify + TypeScript on Node 22+ with native stripping; SQLite via `better-sqlite3`; Tailwind; shared Zod schemas. |
| Monorepo via npm/pnpm workspaces, no Turborepo/Nx | **PASS** | npm workspaces only. |
| No PRD §2.7 stretch goals pulled in | **PASS** | No filtering, favorites, sidebar, "Today's Focus", edit, or delete in this slice. |

### Workflow

| Gate | Status | Evidence |
|---|---|---|
| `master` is built with the full SDD loop | **PASS (in progress)** | `/speckit.specify` produced `spec.md`; this `/speckit.plan` is producing `plan.md` + Phase-1 artifacts. `/speckit.tasks`, `/speckit.analyze`, and `/speckit.implement` follow. |
| Constitution Check runs against this file before Phase 0 and after Phase 1 | **PASS** | This section is the pre-Phase-0 check; it is re-run at the bottom of the plan after Phase 1 is fleshed out. |

**Initial Constitution Check verdict: PASS, no violations to track.** No `Complexity Tracking` entries are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-homepage/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.md           # REST contract for GET /api/ideas, POST /api/ideas
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created by /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
sdd-workshop/
├── package.json                       # workspace root: dev/test scripts, npm workspaces
├── package-lock.json
├── tsconfig.base.json                 # shared compiler options (target ES2023, moduleResolution bundler, strict)
├── .gitignore                         # ignores data/, node_modules/, dist/, .DS_Store
├── data/                              # SQLite file lives here; gitignored
│   └── garden.db                      # created on server boot
├── assets/
│   └── plants/
│       └── oak/                       # Step 1 species allowlist is exactly ['oak']
│           ├── stage-01.png           # acorn — rendered for empty garden + every Step 1 card
│           ├── stage-02.png           # sprout
│           ├── ...                    # full 16-stage isometric pixel-art sequence
│           └── stage-16.png           # mature tree with wildlife
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts         # consumes design.md tokens
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── public/
│   │   └── src/
│   │       ├── main.tsx               # React root
│   │       ├── App.tsx                # composes Header + Garden
│   │       ├── api/
│   │       │   └── ideas.ts           # fetch wrappers; parses through @idea-garden/shared
│   │       ├── components/
│   │       │   ├── Header.tsx
│   │       │   ├── Garden.tsx         # grid + empty-state + error surface
│   │       │   ├── IdeaCard.tsx
│   │       │   ├── EmptyGarden.tsx
│   │       │   ├── NewIdeaModal.tsx   # the creation form
│   │       │   └── PlantImage.tsx     # renders <species>/stage-NN.png
│   │       ├── hooks/
│   │       │   └── useIdeas.ts        # list + create state, optimistic prepend
│   │       ├── lib/
│   │       │   └── relativeTime.ts    # "just now" / "2h ago" / "3d ago"
│   │       ├── styles/
│   │       │   └── index.css          # Tailwind directives + Inter @font-face
│   │       └── test-setup.ts          # vitest + @testing-library/jest-dom
│   └── server/
│       ├── package.json
│       ├── tsconfig.json              # noEmit; types-only — server runs via --experimental-strip-types
│       └── src/
│           ├── index.ts               # entrypoint: build app, listen on PORT (default 3000)
│           ├── app.ts                 # buildApp(): Fastify instance with cors, zod type provider, routes
│           ├── db.ts                  # better-sqlite3 connection, schema-on-boot, helpers
│           ├── routes/
│           │   └── ideas.ts           # GET / POST handlers
│           └── species.ts             # randomSpecies(): picks from a fixed allowlist
└── packages/
    └── shared/
        ├── package.json               # name: "@idea-garden/shared"
        ├── tsconfig.json
        └── src/
            ├── index.ts               # re-exports
            └── ideas.schema.ts        # IdeaSchema, NewIdeaInputSchema, ApiErrorSchema, IdeaListSchema

# Test colocation:
# - apps/web/src/**/*.test.tsx       (Vitest + RTL)
# - apps/server/src/**/*.test.ts     (Vitest + Fastify inject)
# - packages/shared/src/**/*.test.ts (Vitest, schema parse round-trips)
```

**Structure Decision**: Adopt the **monorepo layout from PRD §5** verbatim, with the three workspaces wired through npm workspaces. This satisfies Constitution Principle I ("one source of truth for types" — `packages/shared`) and the workshop's "small enough to read in one session" rule. Tests are **colocated** with the code they cover rather than gathered into a top-level `tests/` tree, because (a) it keeps each workspace self-contained, (b) Vitest's default discovery picks them up with no extra config, and (c) it matches the PRD's emphasis on every reader being able to find a component's tests next to its definition.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The Constitution Check above passes on every gate that applies to Step 1. This table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 — Outline & Research

See [research.md](./research.md). The questions resolved there were:

1. **Plant species: random vs. derived from title hash.** → **Random at creation, persisted on the row.** PRD §7 default; matches "stable for the idea's lifetime" requirement.
2. **Idea identifier format: ULID vs. UUID.** → **ULID.** Lexicographic sort matches creation order; `ulid` package is tiny.
3. **Creation form surface: modal vs. inline.** → **Modal.** `design.md` describes the "Plant New Seed" form as a modal with the standard three-way escape; PRD §F1.2 allows either.
4. **Package manager: npm vs. pnpm.** → **npm workspaces.** Lower entry barrier for workshop attendees; PRD §5 lists either as acceptable.
5. **Schema library: Zod vs. Fastify JSON Schema.** → **Zod.** Single library across web, server, and shared; gives us inferred TypeScript types for free.
6. **Test runner: Vitest vs. node:test.** → **Vitest** in all three workspaces. One runner, one config style, RTL plugs straight in.
7. **Process orchestration: `concurrently` vs. native solution.** → **`concurrently`.** Two-line config in the workspace-root `package.json`, prints both processes' logs prefixed.
8. **Where to put schema-on-boot.** → **`db.ts` runs `CREATE TABLE IF NOT EXISTS` at startup.** No migration tooling per PRD §1.4.
9. **CORS in dev.** → **`@fastify/cors` allowing the Vite dev origin** (`http://localhost:5173` by default). Production hosting is out of scope, so a strict prod policy is deferred.

**Output**: `research.md` with all NEEDS CLARIFICATION resolved.

## Phase 1 — Design & Contracts

**Prerequisites**: `research.md` complete (above).

1. **Entities** — see [data-model.md](./data-model.md). One entity (`Idea`) with explicit field types, validation rules, and the SQLite DDL. No state transitions in Step 1 (stage is fixed at 1).
2. **Contracts** — see [contracts/api.md](./contracts/api.md). The two Step 1 endpoints (`GET /api/ideas`, `POST /api/ideas`) with request/response/error shapes referencing the shared Zod schemas.
3. **Quickstart** — see [quickstart.md](./quickstart.md). Single-command dev workflow, manual-verification steps for the acceptance criteria that aren't covered by automated tests.
4. **Agent context** — `CLAUDE.md` is updated to point at this plan between the `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers so downstream `/speckit.tasks` and `/speckit.implement` runs read the latest plan.

### Post-Phase-1 Constitution Re-Check

After fleshing out the data model, contracts, and quickstart, re-evaluating each gate:

- **Principle I**: still **PASS**. Schemas are still single-sourced in `packages/shared`; the API contract has no hand-mirrored types; `data-model.md` defines the same `Idea` shape that `IdeaSchema` exports.
- **Principle II**: still **PASS**. The API contract describes both happy-path and validation-error responses for each endpoint, so contract tests have explicit shapes to assert. The quickstart enumerates manual checks that map 1:1 to PRD §1.6.
- **Principle III**: still **PASS**. The contract specifies that errors come back with `{ error, details? }` so the client always has something user-visible to surface. The modal contract in the component tree confirms the three-way close.
- **Principle IV**: still **PASS**. The Tailwind config plan consumes `design.md` tokens directly. No new colors, no new typography sizes were introduced by the design phase.
- **Tech Stack**: still **PASS**. No additional production dependencies beyond what Technical Context lists.
- **Workflow**: on track for one commit per SDD phase.

**Post-design Constitution Check verdict: PASS.** No new complexity to track.

## Phase 2 — Tasks (handled by `/speckit.tasks`, not this command)

`/speckit.plan` stops here. The next command, `/speckit.tasks`, will read this plan and the Phase-1 artifacts and produce a dependency-ordered `tasks.md`.
