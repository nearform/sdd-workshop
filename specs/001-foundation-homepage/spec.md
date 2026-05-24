# Feature Specification: Foundation & Homepage (Step 1 Baseline)

**Feature Branch**: `001-foundation-homepage`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Look at the PR, create a spec for the setup of everything + the base feature of creating the homepage with your ideas"

## Summary

This spec covers the **Step 1 Foundation** described in [PRD §1](../../.specify/memory/PRD.md) — the SDD-built baseline that lives on `master`. It bundles two outcomes that are inseparable for a usable first slice:

1. **Project foundation** — a runnable monorepo (web + server + shared types + local persistence) that a developer can start with one command.
2. **Homepage base feature** — a single-screen "garden" where the user sees an empty state on first visit, plants a new idea via a "Plant New Seed" action, and watches that idea appear in a card grid that persists across reloads.

Step 2 features (clicking into ideas, the watering loop, the Three.js animation, stage progression beyond stage 1) are **explicitly out of scope** and are tracked separately on `feature/growth-loop-sdd` and `feature/growth-loop-vibe`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time user plants their first seed (Priority: P1)

A user opens the app for the first time. The garden is empty, but the screen invites them to plant a seed. They click the call-to-action, fill in a title (and optionally a description), and submit. The new idea appears immediately as a card with a seed-stage plant illustration, its full title, the description (truncated to two lines), a level indicator, and a "just now" timestamp.

**Why this priority**: This is the headline value of the entire Step 1 baseline — without it there is no app and no story to tell at the start of the workshop. It is also the smallest end-to-end slice that exercises the empty state, the creation flow, the persistence layer, and the grid render in a single user journey.

**Independent Test**: Open a fresh install of the app in a browser. Verify the empty state is visible. Click "Plant New Seed", enter a title, submit, and confirm the resulting card appears in the grid with a seed image, the entered title, the entered (or absent) description, and a recent timestamp — all without needing any other feature.

**Acceptance Scenarios**:

1. **Given** a fresh database with no ideas, **When** the user loads the app, **Then** the main area shows an illustrated empty state with a clear call-to-action prompting the user to plant their first seed.
2. **Given** the empty state, **When** the user activates the "Plant New Seed" action, **Then** a focused form appears asking for a title and an optional description.
3. **Given** the form is open, **When** the user enters a valid title (1–80 characters) and submits, **Then** the form closes, a new card appears at the top of the grid with the seed image, full title, truncated description, level indicator, and a "just now" timestamp.
4. **Given** the form is open with a title-only entry (no description), **When** the user submits, **Then** the idea is created successfully and the card renders with the title and no description body.
5. **Given** the form is open, **When** the user submits without a title, **Then** the form does not close, no idea is created, and a validation message appears next to the title field explaining a title is required.
6. **Given** the form is open, **When** the user enters a title longer than 80 characters or a description longer than 500 characters, **Then** the form rejects the submission with an inline validation message and the offending field is highlighted.
7. **Given** the form is open, **When** the user dismisses it via the close control, the Escape key, or by clicking the backdrop, **Then** no idea is created and the user returns to the previous state.

---

### User Story 2 - Returning user sees their garden persist (Priority: P1)

A user who has already planted ideas closes their browser, reopens it later, and revisits the app. Their garden looks exactly as they left it: every idea they previously planted is still present, ordered with the newest at the top, and each card shows the same plant illustration, title, description, level indicator, and a timestamp that has updated to reflect the time since creation (e.g., "2h ago").

**Why this priority**: Persistence is what makes the app feel like a real garden rather than a toy. Without it, Story 1's value evaporates the moment the user reloads. It is also the second smallest independent slice — it can be tested without any creation flow if the database is pre-seeded — but in practice it composes naturally with Story 1 and shares the same priority.

**Independent Test**: With a database that already contains several ideas (created via Story 1 or pre-seeded), reload the page or relaunch the dev server. Confirm every previously-saved idea reappears in the grid, ordered newest-first, with stable plant illustrations and titles.

**Acceptance Scenarios**:

1. **Given** ideas already exist in the data store, **When** the user loads the app, **Then** every saved idea appears in the grid ordered newest-first.
2. **Given** ideas already exist, **When** the user reloads the page, **Then** the same ideas reappear in the same order with no loss of data and no duplicate cards.
3. **Given** ideas already exist, **When** the dev server is restarted, **Then** the same ideas are still present on next load (no in-memory-only state).
4. **Given** an idea that was planted some time ago, **When** the page is reloaded, **Then** the relative timestamp updates to reflect elapsed time (e.g., "just now" → "2h ago" → "3d ago").
5. **Given** the same idea is read on reload, **When** the card renders, **Then** the plant species and seed-stage illustration are identical to what was displayed at creation (the species is stable for the lifetime of the idea).

---

### User Story 3 - Developer starts the app locally with one command (Priority: P1)

A developer or workshop attendee clones the repository and runs a single documented command from the project root. The command installs dependencies (or assumes they have been installed once), starts the backend and the frontend together, and prints the URL to open. Visiting that URL in a browser shows the app, with no further setup needed (no manual database file creation, no separate terminals for client and server).

**Why this priority**: The workshop format depends on attendees being able to follow along on their own machines without 20 minutes of environment debugging. PRD §1.6 makes "`npm run dev` (or equivalent) starts both server and web with one command" an explicit acceptance criterion. It is also a P1 because Stories 1 and 2 cannot be demonstrated to anyone without it.

**Independent Test**: From a clean clone of the repository (no prior `node_modules`, no existing `data/garden.db`), follow the documented quickstart: install once, then run the single dev command. Confirm both the backend and the frontend start, the frontend URL is printed, and visiting it shows the empty state described in Story 1.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** the developer runs the documented install step followed by the documented single dev command, **Then** both the backend and the frontend start and the developer can open the app in a browser within ~30 seconds on a 2020+ laptop.
2. **Given** the app has never been run before, **When** the backend boots, **Then** the local data store is created on first boot if it does not already exist; no manual setup is required.
3. **Given** the app is running, **When** the developer creates an idea, stops the server, and starts it again, **Then** the idea is still there (Story 2 holds across restarts).
4. **Given** the project root, **When** the developer runs the same single command on macOS or Linux, **Then** the behavior is identical (no platform-specific manual steps).

---

### Edge Cases

- **Empty database on first ever run**: The data store file does not exist yet. The server creates it transparently and the user sees the empty state, not an error.
- **Title at the lower boundary (1 character)**: Accepted; idea is created.
- **Title at the upper boundary (80 characters)**: Accepted; idea is created and the full title renders in the card.
- **Title at exactly 81 characters**: Rejected with an inline validation message.
- **Description omitted entirely**: Accepted; card renders with no description region taking visible body space.
- **Description at the upper boundary (500 characters)**: Accepted; truncated to ~2 lines with ellipsis in the card.
- **Description at exactly 501 characters**: Rejected with an inline validation message.
- **Whitespace-only title**: Rejected (treated as empty after trim).
- **Special characters / emoji in title or description**: Accepted and rendered correctly (no HTML injection, no broken layout).
- **Backend unreachable when the user submits the form**: A user-visible error appears in the form area; the form remains open with the user's input intact so they can retry.
- **Backend unreachable on initial page load**: A user-visible error appears in the grid area; the page does not render an empty state that would falsely imply the garden is empty.
- **Many ideas (e.g., 200)**: The grid renders without layout breakage; no pagination is required at this scope.
- **Window resized between narrow and wide widths**: The grid reflows responsively across fixed breakpoints — 1 column on mobile, 2 columns at `sm`, 3 at `lg`, 4 at `xl` and above. Cards never exceed `max-w-sm` (384px) so a single card on a wide viewport stays at a natural size and is not stretched across the full row.
- **User clicks "Plant New Seed" twice quickly**: Only one form is shown; double-submission is prevented either by disabling the submit control after the first click or by the network layer's deduplication.
- **User reloads while the form is open**: The in-progress draft is discarded (no draft persistence in this scope); on reload the user sees the homepage as before.

## Requirements *(mandatory)*

### Functional Requirements

#### Foundation (project setup)

- **FR-001**: The repository MUST be runnable locally with one documented command from the project root that starts both the backend and the frontend together.
- **FR-002**: The system MUST create the local data store on first boot if it does not yet exist, with no manual setup required by the user.
- **FR-003**: The repository MUST organise the codebase into clearly separated frontend, backend, and shared-types areas so that types and validation rules describing the API are defined exactly once and consumed by both sides (per Constitution Principle I, "one source of truth for types").
- **FR-004**: The system MUST validate every request entering the backend against the shared schemas before reaching business logic; ad-hoc validation paths are forbidden.
- **FR-005**: The local data store file MUST be excluded from version control and MUST live under a documented project-relative path so it is easily inspected or reset during the workshop.
- **FR-006**: The dev command MUST work identically on macOS and Linux without platform-specific manual steps.

#### Homepage (base feature)

- **FR-010**: On every page load, the system MUST fetch the full list of ideas from the backend and render the homepage from that data; the client MUST NOT keep ideas only in memory.
- **FR-011**: When the data store contains zero ideas, the homepage MUST display an illustrated empty state with a clear call-to-action prompting the user to plant their first seed.
- **FR-012**: When the data store contains one or more ideas, the homepage MUST display them as cards in a responsive grid ordered newest-first.
- **FR-013**: A persistent "Plant New Seed" action MUST be visible at the top of the homepage at all times (regardless of whether the garden is empty or populated).
- **FR-014**: Activating "Plant New Seed" MUST open a focused form requesting a **Title** (required, 1–80 characters after trim) and a **Description** (optional, 0–500 characters).
- **FR-015**: The form MUST validate fields inline (next to or below the offending field). It MUST NOT use a separate alert or modal for validation errors. (Constitution Principle III.)
- **FR-016**: The form MUST be dismissable in three ways — the explicit close control, the Escape key, and clicking the backdrop. (Constitution Principle III.)
- **FR-017**: Submitting a valid form MUST create the idea on the backend, close the form, and prepend the new card to the grid in a single user-perceived step (no manual page refresh required).
- **FR-018**: Submitting an invalid form MUST keep the form open with the user's input intact and surface the validation reason inline.
- **FR-019**: Each idea card MUST render: the plant illustration at the seed stage (stage 1), the full title, a description truncated to ~2 lines with ellipsis if present, a level indicator (showing the current stage), and a relative timestamp ("just now", "2h ago", "3d ago", etc.).
- **FR-020**: At creation, each idea MUST be assigned a stable plant species; the species MUST persist with the idea and MUST NOT change between renders, reloads, or restarts.
- **FR-021**: The data layer MUST persist ideas durably so they survive page reloads, browser restarts, and dev-server restarts.
- **FR-022**: The grid MUST be responsive with a fixed-column-count layout that scales to 4 columns on wide viewports: 1 column on mobile, 2 at `sm` (≥640px), 3 at `lg` (≥1024px), 4 at `xl` (≥1280px). Cards MUST honour a `max-w-sm` (≈384px) cap so a single card never stretches to fill a wide grid row. (Constitution Principle IV.)
- **FR-023**: Every backend error returned to the homepage MUST surface as a user-visible message in the relevant surface (form area for create errors, grid area for list errors). Silent failures are forbidden. (Constitution Principle III.)
- **FR-024**: Submitting "Plant New Seed" twice in rapid succession MUST result in at most one created idea (the second click is either prevented or de-duplicated).
- **FR-025**: The visual implementation MUST follow [`design.md`](../../.specify/memory/design.md): cream page background, white card surfaces, garden-green primary action, generous rounded corners, Inter typography at the documented sizes, and the grid composition described therein. (Constitution Principle IV.)

#### Out of scope (explicitly excluded for this feature)

- Clicking into an idea / detail modal / updates timeline / "watering" / Three.js growth animation (Step 2).
- Stage progression beyond stage 1; every idea created in this feature stays at stage 1.
- Editing or deleting ideas.
- Filtering, sorting, search, favorites, sidebar navigation, "Today's Focus" widget.
- Multi-user, accounts, authentication.
- Hosting, deployment, CI/CD.
- Mobile responsiveness beyond "doesn't break on a laptop".

### Key Entities

- **Idea**: A single planted thought. Carries a stable identifier, a title (1–80 chars), an optional description (0–500 chars), an assigned plant species (immutable for the idea's lifetime), a current growth stage (always 1 in this feature, in the range 1–16 for the future), a creation timestamp, and a last-updated timestamp. The list of ideas, ordered by creation timestamp descending, is the homepage.
- **Plant Species**: A label identifying which 16-stage sprite sequence renders an idea's plant. Assigned at idea creation, persisted with the idea, and never changes thereafter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user, starting from a fresh install with no prior context, can plant their first idea and see it appear in the garden in **under 30 seconds** of opening the app.
- **SC-002**: From a fresh clone of the repository, a developer can go from clone to a running app visible in the browser in **under 2 minutes** on a 2020+ laptop, using only the documented install + run commands.
- **SC-003**: Reloading the page after planting any number of ideas (1–200) preserves **100%** of those ideas in the same order, with no loss, duplication, or visual flicker beyond a single re-render.
- **SC-004**: **100%** of invalid form submissions (missing title, over-length title, over-length description, whitespace-only title) result in an inline validation message and zero created ideas.
- **SC-005**: **100%** of backend failures encountered by the homepage (network error, server error, validation rejection) surface to the user as a visible message in the relevant surface; zero silent failures.
- **SC-006**: With 200 ideas in the garden, the homepage initial render completes in **under 1 second** on a 2020+ laptop and the grid reflows responsively across the documented breakpoints (1/2/3/4 columns) down to a single column on mobile.
- **SC-007**: A workshop attendee unfamiliar with the codebase can read the homepage feature end-to-end (frontend grid + creation form + backend list/create endpoints + shared schema) in **under 15 minutes**, satisfying the constitution's "small enough to read in one session" rule.
- **SC-008**: The single dev command starts the app successfully on **both macOS and Linux** with no platform-specific manual steps.

## Assumptions

- **Tech stack is binding, not negotiable.** The Constitution and PRD §5 fix the stack (React + Vite + TypeScript on the web side; Fastify + TypeScript on Node 22+ with native type stripping on the server; SQLite via `better-sqlite3`; TailwindCSS; shared schemas in a workspace package). This spec deliberately stays implementation-agnostic in its language, but the technology choices are constraints inherited from the constitution rather than open questions.
- **Plant species assignment is random at creation, persisted on the row, and stable for the idea's lifetime.** PRD §7 lists this as an open question with that as the documented default; this spec adopts the default. The deterministic-from-title-hash alternative can be revisited in `/speckit-clarify` if desired.
- **`stage` and `species` columns exist in the data model from day one.** Even though stage stays at 1 throughout this feature, the columns are defined now to avoid a migration when Step 2 starts mutating them. PRD §1.3 calls this out explicitly.
- **Idea identifiers are opaque strings** (ULID or UUID; the choice is an implementation detail to be settled in `/speckit-plan`). The spec only requires that the identifier be stable and unique.
- **Plant artwork is the full 16-stage oak PNG sprite sequence** committed under `assets/plants/oak/stage-01.png` … `stage-16.png` (isometric pixel-art, acorn → mature tree). Step 1 only renders `stage-01` (the acorn) — for the empty-garden illustration and on every idea card — but the rest of the sequence is in place for Step 2's stage progression. Adding more species is an implementation-time concern, not a spec-time decision.
- **Single user, single laptop, no auth, no remote deployment.** PRD §2 non-goals are inherited verbatim.
- **The data file lives under `data/garden.db`** and is gitignored. PRD §5 and the Constitution say so.
- **The agent has access to a browser-driving capability** (Playwright MCP or equivalent) before `/speckit-implement` runs, per Constitution Principle II. UI acceptance criteria in this spec assume the agent can self-verify by clicking through the running app.
- **Hundreds-of-ideas scale is the design target**, not thousands. PRD §2 non-goals exclude performance at scale.
- **Workshop framing matters.** Code clarity and the ability of an attendee to read this slice in one session is a first-class success criterion (SC-007), not a nice-to-have.
