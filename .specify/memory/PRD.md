# Idea Garden — Product Requirements Document

## 1. Overview

**Idea Garden** is a playful single-user web app that turns the chore of capturing ideas into the joy of tending a garden. Every idea you have is planted as a seed. The more you come back to it — refining, expanding, adding notes — the more it grows: from seed, to sprout, to sapling, to a fully-bloomed plant. Ideas you neglect wilt; ideas you nurture flourish.

The product is intentionally narrow in scope and rich in delight: a small CRUD app dressed up with metaphor, animation, and visual progression.

This PRD is also the backbone of a **workshop on Spec-Driven Development (SDD)**. The app is built in two steps, deliberately:

- **Step 1 — Foundation (built with SDD).** The repo setup, idea creation, and listing are built using the full SDD workflow. This is the baseline: it lives on `master` and gives the audience their first taste of the SDD loop on a small, well-bounded scope.
- **Step 2 — The Growth Loop, built twice.** The headline feature (clicking an idea, adding updates, the Three.js animation, stage progression) is built **twice from `master`**, on two parallel branches:
  - `feature/growth-loop-vibe` — vibe-coded: prompt the model, accept diffs, ship.
  - `feature/growth-loop-sdd` — full SDD workflow, with each commit corresponding to a step in the loop (`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`, `/speckit-implement`).

  The two branches are then compared side-by-side to surface the differences in quality, predictability, and cost.

The point of the workshop is not to ship the app — it is to feel the difference.

### Git topology

```
master ────●───────────●───────────●  (Step 1: baseline, built with SDD)
            \           \
             \           ●─●─●─●─●─●  feature/growth-loop-sdd
              \                        (one commit per SDD phase)
               \
                ●─●─●─●─●─●─●─●        feature/growth-loop-vibe
                                       (commits as the prompts land)
```

Both Step 2 branches start from the same `master` tip — same baseline, same starting point, two methods.

---

## 2. Goals & Non-goals

### Goals
- A working, locally-runnable app that demonstrates the full Idea Garden experience end-to-end.
- A codebase small enough that the entire workshop audience can read and understand it in a single session.
- A feature (Step 2) that is **rich enough to expose the gap** between vibe coding and SDD — meaning it has real domain rules, state transitions, visual polish, and edge cases.
- Two parallel implementations of the Step 2 feature to use as teaching artifacts.

### Non-goals
- Multi-user, accounts, auth, sharing, collaboration.
- Cloud deployment, hosting, CI/CD pipelines.
- Mobile responsiveness beyond "doesn't break on a laptop".
- Performance at scale — local SQLite, single user, hundreds of ideas at most.
- Accessibility certification (basic semantic HTML is enough; full WCAG audit is out of scope).
- Production-grade auth, rate limiting, observability.

---

## 3. Target User

A single developer or maker, on their own laptop, capturing the dozens of half-formed ideas that pass through their head every week. They want a low-friction place to drop ideas and a small dopamine reward for revisiting them.

For the workshop, the "user" is the audience: developers learning SDD by watching the same feature get built two different ways.

---

## 4. Personas & Stories

### Core user stories
- *As a user,* I can plant a new idea by giving it a title (and optional description) so I don't lose it.
- *As a user,* I can see all my ideas at a glance, with each idea visually represented as a plant at its current growth stage.
- *As a user,* I can click an idea to see its history of updates ("waterings").
- *As a user,* I can add an update to an idea, and watch it visually grow in response.
- *As a user,* I can tell at a glance which ideas are thriving and which are being neglected.

### Workshop-specific story
- *As a workshop attendee,* I can see the same feature implemented two ways and judge for myself which approach I'd want on a real team.

---

## 5. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Familiar, fast dev loop, ecosystem for Three.js |
| 3D / animation | Three.js (via `@react-three/fiber` + `@react-three/drei`) | The Step 2 animation is the centerpiece; R3F keeps the React mental model |
| Styling | TailwindCSS | Quick visual iteration, matches the playful mockup |
| Backend | Fastify + TypeScript | Lightweight, fast, schema-first (pairs well with SDD demo) |
| Database | SQLite (via `better-sqlite3`) | Zero-config, file-based, perfect for a single-user local app |
| Schema/validation | Zod or Fastify JSON Schema | Single source of truth between API and client types |
| Runtime | Node.js 22+ with native TypeScript (`--experimental-strip-types`) | No build step server-side; aligns with workshop narrative |
| Package manager | npm or pnpm | Either works |

### Project structure (target)
```
sdd-workshop/
├── apps/
│   ├── web/            # React + Vite frontend
│   └── server/         # Fastify backend
├── packages/
│   └── shared/         # Shared types & Zod schemas
├── data/
│   └── garden.db       # SQLite file (gitignored)
├── assets/
│   └── plants/         # 16-frame growth sprites per plant species
├── specs/              # SDD artifacts for Step 2
└── PRD.md
```

The monorepo is deliberately simple — npm/pnpm workspaces, no Turborepo, no Nx.

---

## 6. Visual Design

The mockup at [ui_mockup.png](ui_mockup.png) is the source of truth for the UI direction. Key elements:

- **Layout:** Left sidebar with filters (All Ideas, Growing, Wilted, Just Seeds, Favorites) + a "Today's Focus" callout. Main area is a card grid.
- **Cards:** Each card shows the plant illustration, title, truncated description, level indicator, and "watered Xd ago" timestamp. A star marks favorites.
- **Tone:** Friendly, garden-themed, a little whimsical. Earthy greens, soft shadows, rounded corners.
- **Plant art:** 16-stage sprite sequences per plant species. The species is fixed per idea (assigned at creation, e.g., randomly or based on hashed title). Stage 1 = seed; stage 16 = fully bloomed.

Sidebar filters and the "Today's Focus" widget are **stretch goals** — Step 1 only requires the grid + creation flow.

---

# Step 1 — Foundation (Built with SDD on `master`)

> **Workshop framing:** Step 1 is the audience's **first exposure to the SDD loop**. The presenter walks through `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` on a deliberately small scope, so the mechanics are visible without the audience drowning in domain complexity. The output lands on `master` and becomes the shared starting point for both Step 2 branches.

## 1.1 Scope

Step 1 delivers a usable app where the user can:
1. See an empty garden state on first load.
2. Create a new idea via a "Plant New Seed" button.
3. See the new idea appear in the grid as a seed image.
4. Persist ideas across reloads.

That's it. No clicking into ideas, no updates, no animation. Those belong to Step 2.

## 1.2 Functional requirements

### F1.1 — Empty state
- On first visit (no ideas in DB), the main area shows an illustrated empty state with a clear CTA: "Plant your first seed".

### F1.2 — Create idea
- A "Plant New Seed" button is visible in the top-right of the header at all times.
- Clicking it opens a modal (or inline form) with:
  - **Title** (required, 1–80 chars)
  - **Description** (optional, ≤ 500 chars)
- Submitting the form:
  - POSTs to `/api/ideas`.
  - Closes the form.
  - Inserts the new card at the top of the grid.
- Validation errors are shown inline. A title-only idea is valid.

### F1.3 — List ideas
- On page load, GET `/api/ideas` returns all ideas, newest first.
- Each card renders:
  - Plant image at **stage 1 (seed)**.
  - Title (full).
  - Description, truncated to ~2 lines with ellipsis.
  - Created-at timestamp ("just now", "2h ago", etc.).
- The grid is responsive (CSS grid, auto-fit, min card width ~220px).

### F1.4 — Persistence
- Ideas are stored in SQLite. The DB file lives in `data/garden.db`.
- The schema is created on server boot if it doesn't exist (no migration tooling for Step 1).

## 1.3 Data model (Step 1)

```sql
CREATE TABLE ideas (
  id           TEXT PRIMARY KEY,           -- ULID or UUID
  title        TEXT NOT NULL,
  description  TEXT,
  species      TEXT NOT NULL,              -- e.g. 'oak', 'sunflower' — picks the sprite set
  stage        INTEGER NOT NULL DEFAULT 1, -- 1..16; always 1 in Step 1
  created_at   INTEGER NOT NULL,           -- unix ms
  updated_at   INTEGER NOT NULL
);
```

> `species` and `stage` are introduced in Step 1 even though Step 1 never changes `stage`. Adding them now avoids a migration in Step 2.

## 1.4 API (Step 1)

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/ideas` | — | `Idea[]` (newest first) |
| `POST` | `/api/ideas` | `{ title, description? }` | `Idea` (201) |

All endpoints validate input with a shared schema. Errors return `{ error: string, details?: ... }` with appropriate status codes.

## 1.5 Out of scope for Step 1
- Editing or deleting ideas.
- Filtering, sorting, search, favorites, sidebar.
- Clicking into an idea (no detail view).
- Any animation beyond default CSS transitions.

## 1.6 Acceptance criteria
- [ ] `npm run dev` (or equivalent) starts both server and web with one command.
- [ ] Visiting the app on a fresh DB shows the empty state.
- [ ] "Plant New Seed" → fill title → submit creates a card visible immediately.
- [ ] Reloading the page preserves all ideas.
- [ ] Creating an idea with no title shows a validation error and does not insert.

---

# Step 2 — The Growth Loop (SDD Showcase)

> **Workshop framing:** This is the feature built **twice** — once vibe-coded, once SDD-driven — to make the contrast between the two approaches concrete. Everything below is the *requirements* for the feature, agnostic to which method is used to build it.

## 2.1 The feature in one sentence

Clicking an idea opens a detail modal where the user can read past updates and add a new one; adding an update plays a Three.js growth animation and advances the idea's plant by one stage.

## 2.2 User flow

1. User clicks an idea card.
2. A modal opens showing:
   - Idea title and description.
   - Current plant image at its current stage.
   - A timeline of past updates (newest first), each with a note and timestamp.
   - A "Water this idea" form (textarea + submit).
3. User types an update note and submits.
4. Optimistically:
   - The form clears.
   - A Three.js animation plays in a viewport above/around the plant image: a "growth burst" — the seed/plant model scales, leaves unfurl, sparkles, etc.
   - When the animation finishes (~1.5–2.5s), the plant image swaps to the next stage.
   - The new update appears at the top of the timeline.
5. If the idea is already at stage 16, the user can still add updates (the idea keeps blooming in tone, not in image), and the animation is a "celebration" variant rather than a growth one.
6. Closing the modal returns to the grid, where the card now reflects the new stage.

## 2.3 Functional requirements

### F2.1 — Idea detail modal
- Triggered by clicking a card.
- Closeable via X button, Escape, or backdrop click.
- Content:
  - Header: title (editable inline? — **no, out of scope**), favorite toggle (**stretch**).
  - Plant viewport (3D canvas): renders the current plant. Reuses sprite/3D asset for the species.
  - Description block (full, not truncated).
  - Updates timeline.
  - "Water this idea" form.

### F2.2 — Updates timeline
- Lists all updates for the idea, newest first.
- Each entry: note text, relative timestamp, the stage the idea reached *because of* this update.
- Empty state ("No waterings yet — give this idea its first drink") if none.

### F2.3 — Add update ("water the idea")
- Form fields:
  - **Note** (required, 1–500 chars).
- Submitting:
  - POSTs to `/api/ideas/:id/updates`.
  - Server inserts the update, increments `stage` (capped at 16), updates `updated_at`, returns the updated idea + new update.
  - Client plays the growth animation, then updates the displayed stage.
- Concurrency: if two updates race, the server is the source of truth for `stage` — the client uses what the server returns, not a local increment.

### F2.4 — Growth animation
- Implemented with `@react-three/fiber`.
- Plays for 1500–2500 ms.
- Variants:
  - **Growth** (stages 1→16): scaling/morphing burst around the plant.
  - **Bloom** (already at stage 16): celebratory particles, no stage change.
- Animation must not block subsequent interactions; user can dismiss with Escape.
- Performance budget: should run at 60fps on a 2020+ MacBook Air. If it can't, fall back to a CSS-only animation rather than ship something janky.

### F2.5 — Stage progression rules
- New idea → stage 1.
- Each update → `stage = min(stage + 1, 16)`.
- Stage 16 ideas remain at 16 forever; their updates still count and appear in the timeline.
- "Wilting" (stage going *down* due to neglect) is **stretch** — see §2.7.

### F2.6 — Card reflects new stage
- After closing the modal, the card image on the grid matches the new stage (re-fetch or use returned idea to update local state).

## 2.4 Data model (Step 2 additions)

```sql
CREATE TABLE idea_updates (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  stage_after INTEGER NOT NULL,           -- the stage this update produced
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_updates_idea_id_created ON idea_updates(idea_id, created_at DESC);
```

The `ideas.stage` and `ideas.updated_at` columns are mutated by the update endpoint.

## 2.5 API (Step 2 additions)

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/ideas/:id` | — | `{ idea: Idea, updates: Update[] }` |
| `POST` | `/api/ideas/:id/updates` | `{ note }` | `{ idea: Idea, update: Update }` |

The POST is **transactional**: insert update + increment stage in one SQLite transaction. If either fails, neither persists.

## 2.6 Assets

- 16 PNG (or WebP) frames per plant species, named `assets/plants/<species>/stage-01.png` … `stage-16.png`.
- For the Three.js animation, a single shared particle/sparkle effect is enough — species-specific 3D models are out of scope.
- Asset pipeline is manual for the workshop (drop files into the folder).

## 2.7 Stretch goals (explicitly *not* required to ship Step 2)
- Wilting: ideas not watered in N days lose a stage.
- Sidebar filters (Growing / Wilted / Just Seeds / Favorites).
- Favorites (star toggle).
- Editing title/description.
- Deleting ideas.
- "Today's Focus" widget.
- Sort options.

These exist in the mockup but are deliberately deferred — they would dilute the workshop's focus on the growth loop.

## 2.8 Acceptance criteria
- [ ] Clicking a card opens the modal with the correct idea and its updates.
- [ ] Submitting an update with empty text shows a validation error.
- [ ] Submitting a valid update plays the animation, swaps the plant image to the next stage, and prepends the entry to the timeline.
- [ ] An idea at stage 16 can still receive updates; the image stays at stage 16; the bloom variant of the animation plays.
- [ ] The card on the grid reflects the new stage after the modal closes.
- [ ] Refreshing mid-flow does not corrupt state (server is source of truth).
- [ ] All API errors are surfaced in the UI rather than silently failing.

---

# Workshop Methodology — Step 2 Built Twice from `master`

This section describes how Step 2 is **delivered in the workshop**, which is the actual point of the project. Step 1 (built with SDD on `master`) has already given the audience the SDD vocabulary; Step 2 is where they see what that vocabulary buys them, by watching the same feature built two ways from the same starting tip.

## W.0 Starting state

- `master` contains the Step 1 baseline, built with the full SDD loop.
- Both Step 2 branches are cut from the same `master` commit.
- Each branch is developed independently — no cherry-picking between them — so the comparison is honest.

## W.1 Branch A — `feature/growth-loop-vibe` (Vibe Coding)

- Cut from `master`.
- The presenter opens a fresh chat with their AI tool of choice.
- They paste a short, informal description of the feature ("clicking an idea opens a modal where you can add updates and the plant grows…").
- They iteratively prompt their way to a working implementation.
- No spec is written. No plan is written. Tasks are not enumerated.
- Commits land as the prompts land — messy, organic, real.

**What the audience watches for:**
- Time to first working prototype.
- Number of prompts and corrections needed.
- Edge cases the model misses (what happens at stage 16? what if two updates race? what if the note is empty?).
- Whether the resulting code is one anyone would want to maintain.

## W.2 Branch B — `feature/growth-loop-sdd` (Spec-Driven Development)

- Cut from the same `master` commit.
- The presenter rebuilds the same feature using the SDD workflow.
- **One commit per SDD phase**, so the git log itself becomes a teaching artifact:

  | Commit | Phase | Artifact produced |
  |---|---|---|
  | 1 | `/speckit-specify` | `specs/growth-loop/spec.md` — the *what* |
  | 2 | `/speckit-clarify` | resolved ambiguities folded back into `spec.md` |
  | 3 | `/speckit-plan` | `specs/growth-loop/plan.md` — the *how* |
  | 4 | `/speckit-tasks` | `specs/growth-loop/tasks.md` — dependency-ordered checklist |
  | 5 | `/speckit-analyze` | cross-artifact consistency report; fixes applied |
  | 6+ | `/speckit-implement` | code, tests — possibly one commit per task group |

  This way `git log feature/growth-loop-sdd` reads as a narrative of the SDD loop, and any commit can be checked out to show the audience exactly what was on the page at that moment.

**What the audience watches for:**
- Up-front cost (the spec/plan/tasks pass takes longer before any code exists).
- Hand-off quality: a different person — or a different agent — could pick up the tasks list and run with it.
- Edge cases: are they caught in `/speckit-clarify` rather than in production?
- Final code: is it more boring, more predictable, easier to review?

## W.3 Side-by-side comparison

After both branches exist, the presenter walks through:
- `git log` of each branch — the SDD branch tells a story; the vibe branch tells what happened.
- A diff of file structure (does SDD produce a cleaner shape?).
- The tests that exist in each (does SDD produce more, fewer, or different tests?).
- A bug hunt: each implementation is given the same 3–4 edge-case inputs (empty note, stage-16 idea, network failure mid-update, rapid double-click). The audience scores which one survives.
- A maintenance task: "now add wilting" — and discusses which branch they'd rather start from.

## W.4 Deliverables for the workshop
- `master` with the Step 1 baseline and its `specs/baseline/` folder.
- Both Step 2 branches pushed and runnable from the same `master` tip.
- The `specs/growth-loop/` folder fully populated on the SDD branch.
- A short retrospective doc (`WORKSHOP_NOTES.md`) capturing the contrasts the audience surfaced.

---

## 7. Open Questions

- **Plant species assignment:** random at creation, or derived from the title hash? *Default: random, with the species stored on the row so it's stable.*
- **Animation library:** stick with `@react-three/fiber`, or simpler 2D Lottie? *Default: R3F — the workshop wants the "wow" factor.*
- **Empty-note updates:** allowed or not? *Default: not allowed; an update must say something.*
- **Stage 16 cap visible to the user?** *Default: yes — show "Fully bloomed" in the modal, but updates still post.*

These are **resolved during `/speckit-clarify`** in Round 2 of the workshop, deliberately leaving them open here so the SDD pass has something real to chew on.

---

## 8. Success Criteria for the Project Overall

The project is successful if, at the end of the workshop:
1. Both branches run locally and exhibit the same feature behavior.
2. The audience can articulate at least three concrete differences between the two implementations.
3. At least one attendee says some version of "I see why I'd write a spec next time."

That's the whole point.
