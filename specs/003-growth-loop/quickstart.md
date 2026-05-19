# Phase 1 Quickstart — Growth Loop

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Data model**: [data-model.md](./data-model.md) · **Contracts**: [contracts/api.md](./contracts/api.md)
**Date**: 2026-05-12

This document tells you how to **run, exercise, and verify** the growth-loop feature end-to-end. Where an acceptance criterion is covered by automated tests, that test is named. Where it isn't, a manual step is described.

## 0. Prerequisites

- Node.js **22.6+** (the server uses `--experimental-strip-types`).
- npm 10+.
- A modern Chromium-class browser (Chrome / Edge / Firefox latest).
- The repo's `data/garden.db` is gitignored. The schema is created on first server boot (`CREATE TABLE IF NOT EXISTS`); no manual migration is needed.

## 1. Install

From the repo root:

```bash
npm install
```

This installs across all three workspaces (`apps/web`, `apps/server`, `packages/shared`). Growth-loop adds the following dependencies on first install:

- `apps/web`: `three`, `@types/three`. (The `@react-three/fiber`, `@react-three/drei`, and `react-confetti-explosion` packages were installed during earlier iterations and remain in `package.json` for lockfile stability, but the shipped code no longer imports them — the viewport uses raw `three.js` directly, and confetti is rendered by the in-house `ConfettiBurst.tsx` canvas component.)
- `apps/server`: no new runtime deps.
- `packages/shared`: no new deps.

## 2. Run

From the repo root:

```bash
npm run dev
```

This starts both the Fastify server (port 3000) and the Vite dev server (port 5173) under one process, with prefixed logs. Open `http://localhost:5173`.

## 3. Reset

To start from a known-empty garden, delete the SQLite file:

```bash
rm -f data/garden.db
```

The server will recreate it (with both `ideas` and `idea_updates` tables) on next boot.

## 4. Acceptance scenarios — how to verify each

This section maps every acceptance scenario in [spec.md](./spec.md) to either an automated test or a manual recipe. The four bug-hunt edge cases from Constitution Principle II are called out explicitly.

### User Story 1 — Open and water an idea

| Scenario | Verification |
|---|---|
| Click a card → modal opens with title, description, stage image, level badge, timeline | **Automated**: `apps/web/src/components/IdeaDetailModal.test.tsx` (renders fields from props + fetched updates) + Playwright spec `growth-loop.spec.ts → opens idea detail modal`. |
| Modal opens instantly with skeletons while updates load | **Automated**: `apps/web/src/hooks/useIdeaDetail.test.tsx` (asserts skeleton elements present during `pending` state, replaced on resolve). |
| Submit valid 200-char note → animation plays, plant advances, badge updates, entry prepended | **Automated**: server contract test (`apps/server/src/routes/ideas.test.ts → POST update happy path`) for the server side; component test (`UpdateForm.test.tsx`) for the form submit + state updates. **Manual** for the animation playback: `http://localhost:5173`, click any idea card, submit a watering, observe the 3D growth animation runs ~2 s and the plant texture swaps. |
| Submit empty note → inline validation error, no API call | **Automated**: `UpdateForm.test.tsx → rejects empty note`. Server-side **bug-hunt case 1**: `ideas.test.ts → POST update empty note returns 400`. |
| Modal closed after successful update → grid card shows new stage and "watered just now" | **Automated**: `Garden.test.tsx` exercises the full mount-modal-mutate-close-modal cycle and asserts the card re-renders. Manual: confirm in the browser. |
| Server unavailable → form preserved, inline error, plant unchanged | **Automated**: `UpdateForm.test.tsx → renders error on rejected promise`. Manual: stop the server (`Ctrl-C` the dev process), submit, observe the inline error appears and no animation plays. |

### User Story 2 — Edit title and description

| Scenario | Verification |
|---|---|
| Click "Edit" → fields become editable; rest of modal unchanged | **Automated**: `IdeaDetailModal.test.tsx → toggles into edit mode`. |
| Clear title and click Save → inline error, Save blocked, no API call | **Automated**: `EditIdeaForm.test.tsx → empty title blocks save`. Server-side: `ideas.test.ts → PATCH idea empty title returns 400`. |
| 81-char title → inline error | **Automated**: `EditIdeaForm.test.tsx → 81-char title blocks save`. |
| Save valid changes → modal returns to read mode, no timeline entry, level unchanged, no animation | **Automated**: server contract test (`ideas.test.ts → PATCH idea does not add update or change stage`) + component test (`IdeaDetailModal.test.tsx → after Save, returns to read mode with new values`). Manual: open the network panel, submit an edit, verify only one `PATCH` request is fired. |
| Click Cancel → returns to read mode with original values | **Automated**: `IdeaDetailModal.test.tsx → Cancel reverts pending edits`. |

### User Story 3 — Celebrate two milestone waterings

| Scenario | Verification |
|---|---|
| Fresh idea (Level 1, zero updates) + first valid watering → growth-palette animation + **first-watering confetti burst** (green / gold) + badge "Level 2" + `stage_after = 2` | **Automated server side**: `ideas.test.ts → POST update on Level-1 idea returns stage=2, prev_stage=1`. **Component side**: `IdeaDetailModal.test.tsx → fires confetti on first watering`. **Manual front-end**: plant a fresh idea and submit one watering; observe the smaller green / gold confetti burst over the modal. |
| Intermediate watering (e.g. Level 5 → 6) → growth-palette animation only, **no** confetti, badge advances by one | **Component side**: `IdeaDetailModal.test.tsx → does not fire confetti on intermediate watering`. **Manual front-end**: continue watering an idea between Level 2 and Level 14; observe the growth animation plays but the confetti does NOT fire. |
| Level-15 idea + valid update → bloom-palette animation + **bloom confetti burst** (full festive palette) + badge "Fully bloomed" + `stage_after = 16` | **Automated server side**: `ideas.test.ts → POST update on Level-15 idea returns stage=16, prev_stage=15`. **Component side**: `IdeaDetailModal.test.tsx → fires confetti on bloom`. **Manual front-end**: drive an idea to Level 15 (via the API or 14 UI waterings) then submit one more in the UI; observe the bloom-palette flash + the larger festive confetti burst. |
| Level-16 idea + valid update → bloom animation only, **no** confetti, `stage_after = 16` | **Automated server side**: **bug-hunt case 2** — `ideas.test.ts → POST update on Level-16 idea keeps stage at 16`. **Manual front-end**: continue submitting waterings on the now-bloomed idea; observe the bloom animation plays but the confetti does NOT re-fire. |
| Level-16 idea opened in modal → badge shows "Fully bloomed" | **Automated**: `LevelBadge.test.tsx → renders 'Fully bloomed' at stage 16`. |

### User Story 4 — Curate the timeline

| Scenario | Verification |
|---|---|
| Delete the latest (highest-stage) update on a stage-4 idea → entry vanishes, plant cross-fades to stage 3, badge to "Level 3", no growth animation | **Automated server side**: `ideas.test.ts → DELETE highest update lowers stage by one`. **Component side**: `Timeline.test.tsx → deletes entry and triggers cross-fade prop`. **Manual**: visual confirmation of the ~300 ms cross-fade. |
| Delete a middle (non-max) update → entry vanishes, plant/badge unchanged | **Automated**: `ideas.test.ts → DELETE middle update leaves stage unchanged`. |
| Delete the only remaining update → plant cross-fades to seed, badge to "Level 1" | **Automated**: `ideas.test.ts → DELETE last update sets stage=1`. |
| Edit an entry's note → text changes, timestamp/badge unchanged | **Automated**: `ideas.test.ts → PATCH update note preserves stage_after`. + `TimelineEntry.test.tsx → Save persists; metadata preserved`. |

### User Story 5 — Delete an idea

| Scenario | Verification |
|---|---|
| Header (⋮) menu shows "Delete idea" | **Automated**: `OverflowMenu.test.tsx → renders Delete idea item`. |
| Click "Delete idea" → confirmation dialog appears | **Automated**: `ConfirmDeleteDialog.test.tsx → opens on trigger`. |
| Cancel in dialog → dialog closes, idea unchanged | **Automated**: `ConfirmDeleteDialog.test.tsx → Cancel does nothing`. Server: no `DELETE` request fired (network mock asserted). |
| Confirm destructive action → idea+updates removed, modal closes, card disappears, reload persists | **Automated server side**: `ideas.test.ts → DELETE idea cascades to updates`. **Component side**: `Garden.test.tsx → confirm delete removes card from cache`. **Manual**: refresh the browser to confirm persistence. |
| Server returns 500 on delete → modal stays open, error in modal | **Automated**: `IdeaDetailModal.test.tsx → renders toast on delete error`. |

### Edge cases (spec §Edge Cases)

| Edge case | Verification |
|---|---|
| Empty / whitespace-only note | **Bug-hunt case 1**, covered above. |
| Note over 1000 chars | `UpdateForm.test.tsx → blocks > 1000 chars`. Server: `ideas.test.ts → POST update too-long note returns 400`. |
| Update fails server-side after submit | Covered under User Story 1. |
| Modal closed mid-animation | **Automated**: `IdeaDetailModal.test.tsx → ignores Escape while animating`. |
| Rapid double-submit | **Bug-hunt case 4**: `ideas.test.ts → two POSTs back-to-back produce monotonic stage`. Client: `UpdateForm.test.tsx → submit disabled while pending`. |
| Idea with zero updates | `EmptyTimeline.test.tsx` + `IdeaDetailModal.test.tsx → renders EmptyTimeline when no updates`. |
| Modal opens for missing idea | `useIdeaDetail.test.tsx → renders friendly 'no longer in garden' on 404`. |
| Edit Save with no actual changes | Allowed; no special handling. Server contract test covers the no-op write path. |
| Delete update for stage-16 idea | `ideas.test.ts → DELETE bloom-stage update reverts badge` covers the recompute. |
| Re-reaching stage 16 | **Manual**: delete the bloom update, observe badge reverts; add a new watering that crosses 15 → 16, observe the bloom confetti burst fires again (the prev-stage comparison is per-mutation, so the second crossing of 16 also triggers). |
| Editing a timeline entry's note | Covered under User Story 4. |

### The four bug-hunt edge cases (PRD §W.3, Constitution Principle II)

| # | Case | Test location |
|---|---|---|
| 1 | Empty update note rejected | `apps/server/src/routes/ideas.test.ts → POST /api/ideas/:id/updates with empty note returns 400` |
| 2 | Stage-16 idea receiving update → stage stays at 16, update persists | `apps/server/src/routes/ideas.test.ts → POST /api/ideas/:id/updates on stage-16 idea` |
| 3 | Transactional failure mid-update → neither update nor stage bump persists | `apps/server/src/routes/ideas.test.ts → POST /api/ideas/:id/updates transaction rollback` (uses a stub that throws inside `runUpdateMutation`) |
| 4 | Rapid double-submit → server-returned stage is monotonic | `apps/server/src/routes/ideas.test.ts → two sequential POSTs produce monotonic stages` (relies on `BEGIN IMMEDIATE` serialisation) |

## 5. Manual smoke recipe (end-to-end)

For a clean visual walkthrough — useful right before the workshop:

```bash
rm -f data/garden.db
npm run dev
```

1. Open `http://localhost:5173`. Empty garden state appears.
2. Click **Plant New Seed**, fill `"Workshop demo idea"`, submit. Card appears as a seedling at Level 1.
3. Click the card. Modal opens; skeletons flash for ~50ms then resolve to "No waterings yet" empty state.
4. Type `"Sketched a first version"`, submit. The evolution flash plays (~2.4s), the plant advances to Level 2, the level badge updates, the timeline gets one entry, and the **first-watering confetti burst** (green / gold palette) fires once over the modal.
5. Click the entry's `(⋮)` → Edit → change to `"Sketched two versions"` → Save. Entry shows new text, same timestamp.
6. Click the entry's `(⋮)` → Delete. Entry vanishes, plant cross-fades back to Level 1.
7. Click the modal header `(⋮)` → Edit. Change the title. Save. Modal returns to read mode with new title.
8. Submit 14 more waterings to reach Level 16. On the watering that crosses Level 15 → 16, observe the bloom-palette evolution flash + the **bloom confetti burst** (full festive palette). On intermediate waterings (Levels 3 through 15), observe NO confetti.
9. Submit one more watering on the Level-16 idea. Observe the bloom-palette animation plays again, but **no** confetti.
10. Click modal header `(⋮)` → Delete idea → confirm. Modal closes, card disappears. Refresh — card stays gone.

If any of these steps mismatch the expected behaviour, the feature is not ready to merge.

## 6. Run the test suites

From the repo root:

```bash
npm test
```

This runs Vitest across all three workspaces. Expect (at minimum):

- `apps/server/src/routes/ideas.test.ts` — at least 20 contract tests (the four bug-hunt cases + the per-endpoint suite documented in [contracts/api.md](./contracts/api.md)).
- `apps/server/src/db.test.ts` — covers the `idea_updates` DDL and the `runUpdateMutation` helper (including rollback).
- `apps/web/src/components/*.test.tsx` — one test file per new component.
- `apps/web/src/hooks/useIdeaDetail.test.tsx` — fetch + skeleton + 404 paths.
- `packages/shared/src/ideas.schema.test.ts` — schema parse round-trips for the new schemas.

The full suite should pass before merging. Any failure is a blocker.
