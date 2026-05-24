
# Idea Garden Constitution

## Core Principles

### I. Code Quality & Simplicity

The codebase MUST stay small enough that a workshop audience can read and
understand it in a single session. Concretely:

- **TypeScript is mandatory** on both `apps/web` and `apps/server`. `any` is
  forbidden in shared code; use `unknown` plus a narrowing guard at boundaries.
- **One source of truth for types.** API request/response shapes MUST be
  defined once in `packages/shared` (Zod or Fastify JSON Schema) and consumed
  by both client and server. Hand-mirrored types are forbidden.
- **No build step on the server.** Use Node 22+ with `--experimental-strip-types`
  as called out in the PRD.
- **YAGNI.** Do not add abstractions, configuration knobs, or "future-proofing"
  that the PRD does not require. Three repeated lines is better than a
  premature helper. Stretch goals (§2.7 of the PRD) are out of scope unless
  explicitly pulled in.
- **Errors surface, never silently swallow.** Every catch block either
  rethrows, logs with context, or renders a user-visible message. PRD
  acceptance criterion §2.8 ("All API errors are surfaced in the UI rather
  than silently failing") is the line in the sand.
- **The server is the source of truth for state.** Stage progression, update
  ordering, and any concurrency resolution happen server-side inside a SQLite
  transaction; the client uses returned values, never local guesses.

*Rationale:* The whole point of the workshop is that attendees can read both
Step 2 branches side-by-side and judge the difference. Cleverness, dead code,
or speculative abstractions destroy that signal.

### II. Testing Standards

Tests MUST exist where they protect the workshop's signal — namely on
`master` (the SDD baseline) and on `feature/growth-loop-sdd`. The
`feature/growth-loop-vibe` branch is intentionally exempt; its lack of
tests is part of the comparison the workshop is making.

Required coverage on `master` and the SDD branch:

- **API contract tests** for every endpoint listed in the PRD (`GET /api/ideas`,
  `POST /api/ideas`, `GET /api/ideas/:id`, `POST /api/ideas/:id/updates`).
  Each test asserts both happy path and validation-error shape.
- **Frontend unit tests are mandatory.** Every React component that owns
  behavior (not pure presentational wrappers) MUST have unit tests covering
  its rendered output and user-event flows. At minimum: the creation form
  (validation feedback, submit, reset), the idea card (stage rendering,
  relative-time label), the idea-detail modal (open/close via X / Escape /
  backdrop, timeline rendering, update-form submit), and the empty state.
  Use Vitest + React Testing Library; no snapshot-only tests — assertions
  MUST describe behavior, not DOM bytes.
- **The four bug-hunt edge cases** from PRD §W.3 MUST each have at least one
  automated test on the SDD branch:
  1. empty update note → rejected with validation error,
  2. stage-16 idea receiving an update → stage stays at 16, update persists,
  3. transactional failure mid-update → neither the update nor the stage bump
     persists,
  4. rapid double-submit → server-returned `stage` is monotonic.
- **Schemas validated at every boundary.** Inputs from the network are parsed
  through the shared schema before reaching business logic; no ad-hoc
  validation.
- **Acceptance criteria are testable.** Every checkbox in PRD §1.6 and §2.8
  MUST map to either an automated test or a documented manual-verification
  step in `quickstart.md`. Untestable acceptance criteria block merge.
- **The coding agent MUST have a way to exercise the running app.** A
  browser-driving capability — Playwright MCP server is the default; an
  equivalent (e.g., a Playwright test runner the agent can invoke via a
  shell script, or another browser-automation MCP) is acceptable — MUST be
  configured and reachable from the agent's environment before
  `/speckit-implement` runs. Without it, the agent cannot self-verify the
  UX/UI acceptance criteria in PRD §1.6 and §2.8 (e.g., "fill title →
  submit creates a card visible immediately", animation playback,
  modal-close behavior). PRs that ship UI changes without this capability
  available require explicit human verification of every affected
  acceptance criterion, and the gap MUST be called out in the PR
  description.

*Rationale:* The workshop relies on a head-to-head bug hunt (PRD §W.3). If
the SDD branch hasn't already proven those edge cases pass, the comparison
collapses into anecdote. And the agent needs hands, not just eyes — without
a way to actually click buttons in a real browser, "I implemented it" is
indistinguishable from "I think I implemented it."

### III. User Experience

The Idea Garden experience MUST feel playful and rewarding, never janky.

- **Optimistic feedback on "watering."** When the user submits an update, the
  form clears and the growth animation starts immediately. The plant image
  swap waits for the server response; on error, the animation reverses or
  yields to a clear error message.
- **No silent failures.** Every API error renders a visible, human-readable
  message in the relevant surface (modal toast, inline validation, or grid
  banner). "It just didn't work" is a P0 bug.
- **Inline validation only.** Form validation errors render next to the
  field, never as a separate modal or alert. A title-only idea is valid; an
  empty update note is not.
- **Modals are escapable three ways:** X button, Escape key, and backdrop
  click. This applies to every modal (creation form, idea detail).
- **Empty states are first-class.** The empty garden, an idea with no
  updates, and a stage-16 idea each have a designed empty/celebratory state,
  not a blank panel.
- **Animation has a hard performance budget.** The Three.js growth
  animation MUST run at 60fps on a 2020+ MacBook Air. If it cannot, fall
  back to the CSS animation rather than ship a janky 3D version. This is
  PRD §F2.4 and is non-negotiable.

*Rationale:* The product is a tiny CRUD app dressed up as a garden. The
delight IS the product. A correct-but-cold UX defeats the purpose, and a
flashy-but-broken animation undermines the workshop's credibility.

### IV. UI & Visual Design

`ui_mockup.png` is the source of visual direction, and
[`design.md`](./design.md) is the binding spec derived from it. Together
they govern the implementation.

- **`design.md` is the source of truth for tokens, components, and visual
  rules.** Any UI change — adding a component, restyling an existing one,
  introducing a new color, spacing, or typography value, or any deviation
  from the mockup — MUST be cross-checked against
  [`design.md`](./design.md) **before** the change is made. If the rule
  needed isn't in `design.md`, update `design.md` first (in the same PR or
  ahead of it); do not let the implementation drift ahead of the spec.
  Reviewers MUST verify this on every PR that touches UI.
- **Tone:** garden-themed, friendly, a little whimsical. Earthy greens, soft
  shadows, generously rounded corners. No flat enterprise-blue defaults.
- **Styling:** TailwindCSS only, with the Tailwind theme configured from
  the `design.md` token block (colors, typography, spacing, rounded).
  Inline `style=` attributes are reserved for values that must be computed
  at runtime (e.g., animation transforms).
- **Plant art:** 16-stage sprite sequences per species under
  `assets/plants/<species>/stage-01.png` … `stage-16.png`. The species is
  assigned at idea creation, persisted on the row, and never changes.
- **Stage visibility:** Stage 1 ("seed") through Stage 16 ("fully bloomed")
  MUST be visible to the user — at minimum a level indicator on the card
  and a "Fully bloomed" label inside the modal at stage 16.
- **Grid:** responsive CSS grid, `auto-fit`, minimum card width ≈220px.
  Cards MUST display: plant image at current stage, full title, truncated
  description (~2 lines, ellipsis), level indicator, and a "watered Xd ago"
  relative timestamp. Favorite star is a stretch goal and may be omitted.
- **Sidebar filters and "Today's Focus" are stretch.** Step 1 ships with
  grid + creation flow only; adding the sidebar in Step 1 is scope creep
  and requires a constitution amendment or an explicit PRD update.

*Rationale:* The mockup and `design.md` exist precisely so the team
doesn't have to re-litigate "what should this look like" mid-
implementation. `design.md` carries that intent in machine-readable
tokens so both humans and AI agents converge on the same visuals; the
mockup is the picture, `design.md` is the contract. Deviating without
cause adds review churn and weakens the side-by-side comparison between
branches.

## Tech Stack & Scope Discipline

The technology choices in PRD §5 are binding for `master` and for both
Step 2 branches:

- **Frontend:** React + Vite + TypeScript, TailwindCSS, `@react-three/fiber`
  + `@react-three/drei` for the growth animation.
- **Backend:** Fastify + TypeScript on Node 22+ with native type stripping.
- **Database:** SQLite via `better-sqlite3`, file at `data/garden.db`,
  gitignored. Schema is created on server boot (no migration tooling for
  the workshop scope).
- **Shared types:** `packages/shared` is the only place where API
  request/response schemas live.
- **Monorepo layout:** npm or pnpm workspaces. Turborepo, Nx, or any other
  meta-tool is out of scope.

Scope discipline:

- The non-goals in PRD §2 (multi-user, auth, hosting, mobile responsiveness
  beyond "doesn't break on a laptop", performance at scale, WCAG audit,
  observability tooling) MUST NOT be pulled in by side-quests during
  implementation.
- Stretch goals in PRD §2.7 (wilting, sidebar filters, favorites, edit,
  delete, "Today's Focus", sort) are explicitly deferred. Implementing one
  during Step 1 or Step 2 requires a PRD update first, not a "while I'm
  here" commit.

## Development Workflow & Quality Gates

The workshop's value depends on the two Step 2 branches being honestly
comparable. The workflow rules below enforce that:

- **`master` is built with the full SDD loop.** Step 1 commits flow through
  `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks`
  → `/speckit-analyze` → `/speckit-implement`, with artifacts in
  `specs/baseline/`.
- **`feature/growth-loop-sdd` is built with the full SDD loop, one commit
  per phase**, so the git log itself is a teaching artifact (PRD §W.2).
  Cross-cherry-picking from the vibe branch is forbidden.
- **`feature/growth-loop-vibe` is intentionally unstructured.** Principles
  I–IV still describe the *target behavior* of the running app, but this
  branch is exempt from the testing requirements in Principle II and from
  the SDD workflow above. That exemption is the entire point of the
  branch.
- **Constitution Check is a gate.** Every `plan.md` produced by
  `/speckit-plan` MUST run the Constitution Check section against this
  file before Phase 0 research and again after Phase 1 design, as the
  plan template requires. Violations either get redesigned away or get
  recorded in the plan's Complexity Tracking table with a real
  justification.
- **PR review checks compliance.** Reviewers MUST verify (a) Principle
  I/III/IV apply to the running app, (b) Principle II applies to the
  branch's test suite if the branch is `master` or the SDD branch, and
  (c) any deviation is documented in the PR description.

## Governance

- **This constitution supersedes ad-hoc preferences and AI-suggested
  conventions.** When this file and a tool's default disagree, this file
  wins.
- **Amendments** are made via PR that edits this file, bumps the version
  per the rules below, updates `LAST_AMENDED_DATE`, and includes a Sync
  Impact Report (as the comment at the top of this file) listing
  affected templates and downstream artifacts.
- **Versioning policy** (semver, applied to the constitution itself):
  - **MAJOR** — a principle is removed, redefined incompatibly, or the
    governance/workflow rules change in a way that invalidates existing
    plans.
  - **MINOR** — a principle is added, or an existing principle gains a
    materially new requirement.
  - **PATCH** — clarifications, wording, typo fixes, non-semantic
    refinements.
- **Compliance review** runs at three points: at the close of Step 1, at
  the close of each Step 2 branch before the side-by-side comparison,
  and during the workshop retrospective (`WORKSHOP_NOTES.md`).
- **Runtime guidance.** `CLAUDE.md` and the active `plan.md` are the
  day-to-day operational guides; this constitution is the rule those
  documents must respect.

**Version**: 1.2.0 | **Ratified**: 2026-05-09 | **Last Amended**: 2026-05-09
