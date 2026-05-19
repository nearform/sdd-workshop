# Phase 0 Research — Growth Loop

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Date**: 2026-05-12

This document captures the implementation decisions taken to resolve the open questions left by the spec and the constitution for the **growth loop** feature. Each decision follows the **Decision / Rationale / Alternatives** format. Items that were already resolved during `/speckit-specify` (in the four clarification rounds) are recorded for completeness so the plan and tasks phases can refer to them in one place.

The `001-foundation-homepage` research established baseline decisions (ULID ids, npm workspaces, Vitest, etc.). Those are not re-litigated here — only **new** or **changed** decisions are recorded.

## R1. Stage representation — derived per-request vs. persisted column

**Decision**: Keep the existing `ideas.stage` **persisted column** as the canonical current stage. Recompute it inside every stage-altering transaction (`POST /api/ideas/:id/updates`, `PATCH /api/ideas/:id/updates/:updateId`, `DELETE /api/ideas/:id/updates/:updateId`). Reads never recompute.

**Rationale**:
- The shared `IdeaSchema` already requires a numeric `stage` on the wire (`packages/shared/src/ideas.schema.ts`). The baseline `GET /api/ideas` returns one stage per row. Reverting to "derive on every read" would either break the existing schema or pay an N×M cost on every list response (subquery per row).
- The recompute is **one SQL statement** inside an already-required transaction: `UPDATE ideas SET stage = COALESCE((SELECT MAX(stage_after) FROM idea_updates WHERE idea_id = ?), 1) WHERE id = ?`. It costs essentially nothing relative to the transaction itself.
- The spec says (FR-017) that the *displayed* current stage is `max(stage_after)`. The persisted column is the materialised view of that rule — the rule still holds, it's just computed once at write time rather than repeatedly at read time. The server remains the source of truth (constitutional Principle I).
- Keeping `ideas.stage` persisted means `GET /api/ideas` (the grid list) stays unchanged from the baseline. The card's stage image renders from the same data shape it already consumes; no schema migration, no client-side merge.

**Alternatives considered**:
- *Drop `ideas.stage`; derive on read.* Cheaper writes, but every list response would need a `LEFT JOIN (SELECT idea_id, MAX(stage_after) AS stage FROM idea_updates GROUP BY idea_id)`. For ~200 ideas with ~50 updates each that is fine in absolute terms, but the schema-and-handler diff against `001-foundation-homepage` would balloon, and the shared `IdeaSchema` would have to be reshaped. Rejected.
- *Cache stage on a separate `idea_stage` table.* Pointless extra table; same correctness story as the persisted column, more moving parts. Rejected.

## R2. Update note width — 500 vs. 1000 chars

**Decision**: **1000 characters** max (after trim), with newlines preserved. PRD §F2.3 originally specified 500; the product owner widened it to 1000 during `/speckit-specify` clarification round 3.

**Rationale**:
- The product owner's stated reason: "ideas mature, and the note that describes 'today I sketched a logo' is sometimes a paragraph." 500 was felt to be too tight.
- 1000 chars still fits comfortably in one SQLite row, one network packet, and one Tailwind-styled textarea.
- The spec (FR-011) is now binding. PRD §F2.3 is superseded by the more specific spec per the Constitution governance rules ("Spec wins over older PRD prose when product owner has signed off on the change in clarification.").

**Alternatives considered**:
- *Keep 500.* Rejected by clarification answer.
- *Unbounded / `TEXT`.* No upper bound invites pathological input and grid-card-truncation pain. Rejected.

## R3. Transactional helper shape

**Decision**: Add a single helper to `apps/server/src/db.ts`:

```ts
runUpdateMutation(ideaId: string, fn: (tx: { exec: ... }) => MutationResult): MutationResult
```

The helper opens a `BEGIN IMMEDIATE` transaction, runs `fn` (which performs the insert/edit/delete on `idea_updates`), then runs the canonical recompute (`UPDATE ideas SET stage = COALESCE((SELECT MAX(stage_after) FROM idea_updates WHERE idea_id = ?), 1), updated_at = ? WHERE id = ?`), then commits. On any exception inside `fn` or the recompute, the transaction rolls back and the exception propagates to the route handler. The return value is the freshly-read idea row plus (where applicable) the new/edited update row.

**Rationale**:
- Centralising the recompute in one helper means **every** stage-altering route uses the same recompute SQL. Drift between routes is impossible.
- `BEGIN IMMEDIATE` (rather than the default deferred transaction) takes a write lock at transaction start, so the rapid-double-submit bug-hunt case (PRD §W.3, item 4) is handled at the SQLite level — the second concurrent transaction blocks until the first commits, then reads the recomputed stage when it runs its own recompute. Monotonic stage falls out for free.
- The helper sits in `db.ts` next to the prepared statements it uses, not in a separate "transaction module" — keeps the diff small.

**Alternatives considered**:
- *Inline the BEGIN / COMMIT in every route handler.* Possible, but duplicates the recompute SQL three times. Rejected on YAGNI grounds (the helper costs about ten lines of code and removes that duplication entirely).
- *Use SQLite triggers to recompute stage.* Less code, but the trigger fires before the route handler can read the new state, and `better-sqlite3` triggers are awkward to test. Rejected.
- *Use a separate `BEGIN` (deferred) and rely on the read-write race for ordering.* Loses the rapid-double-submit guarantee. Rejected.

## R4. 3D rendering choice — `@react-three/fiber` + `@react-three/drei` vs. raw three.js

**Decision**: **`@react-three/fiber` (R3F) + `@react-three/drei`** for the growth animation.

**Rationale**:
- PRD §5 explicitly binds this choice for the Step 2 animation; no constitutional amendment is needed.
- R3F keeps the React mental model (components, hooks) for the imperative scene, which means the rest of the team can read the animation code without context-switching to raw three.js.
- `drei` provides `OrthographicCamera`, `useTexture`, and `Plane` primitives that cover the textured-plane scene used here. We do not need its full library; we tree-shake to the three or four imports that matter.

**Alternatives considered**:
- *Raw three.js with `useEffect` wiring.* More boilerplate; loses the declarative scene description; harder to mock in component tests. Rejected.
- *2D-only animation (CSS transforms + a sprite-based particle layer).* Strongly considered. Rejected because the spec (FR-023) calls for a "scaling/morphing burst around the plant" and the product-owner-confirmed visual language is 3D. Also explicitly contradicts PRD §5.

## R5. Confetti rendering — in-house canvas (revised 2026-05-12)

**Decision (final)**: A small in-house canvas component, `apps/web/src/components/ConfettiBurst.tsx` (~150 lines). The component renders a `<canvas>` via `createPortal` to `document.body`, fixed at `inset: 0` with `pointer-events: none` and `z-index: 2147483647`. Particles are drawn directly with the 2D canvas context. Two variants are exposed via a `variant: 'firstWatering' | 'bloom'` prop; each variant tunes palette, particle count, and duration.

**The three iterations, with rationale**:
- **v1 (rejected)**: `react-confetti-explosion` mounted inside the modal's DOM subtree. The library inherited the modal's stacking context (modal backdrop has `backdrop-filter: blur(2px)`, which establishes a stacking context) and the confetti rendered behind the modal panel.
- **v2 (rejected)**: same library, this time mounted via `createPortal` to `document.body` (see R16 v2 below). The portal correctly escaped the modal's stacking context, but the library's *internal* positioning anchored particles to a small box around the component's render position. Visually the confetti still read as a localised puff, not a page-wide celebration.
- **v3 (shipped)**: the in-house canvas. Direct control over particle spawn position, velocity, gravity, drag, rotation, lifetime, fade, palette, and per-variant tuning. The canvas covers the full viewport via the portal, so particles fly anywhere on screen.

**Rationale**:
- Zero third-party dependencies — confetti math is ~80 lines and the workshop audience benefits from seeing it spelled out.
- Two variants give the spec's two confetti triggers (FR-025) visually distinct identities: smaller green / gold burst for first watering, larger full-festive palette for bloom.
- The canvas + portal pattern guarantees the burst is **always** above any modal or dialog DOM — no fighting with library-internal `z-index` or `overflow: hidden`.
- jsdom can't render canvas, so the component degrades to a `setTimeout(onComplete, duration)` no-op path in tests. The unit tests just assert the canvas element appears in the DOM with the right `data-testid` and is *not* a descendant of the dialog.

**Alternatives considered (this revision)**:
- *Keep `react-confetti-explosion`* — see v1 / v2 failure modes above. Rejected.
- *Use `canvas-confetti` (non-React).* Imperative API; would still need a React wrapper. Marginally smaller than our hand-rolled version. Rejected for the same reason as v1/v2 — we want full control over the look, and a library still constrains us.

## R6. "Just hit stage 16" detection

**Decision**: The server's `POST /api/ideas/:id/updates` response includes both `prev_stage` (the idea's stage *before* the mutation) and the updated `idea` (with the *new* stage). The client computes:
- `confettiVariant = 'bloom'` when `prev_stage < 16 && idea.stage === 16`
- `confettiVariant = 'firstWatering'` when `prev_stage === 1 && idea.stage === 2`
- otherwise no confetti

Both comparisons use only server-returned values; no client guesswork.

**Rationale**:
- Server is the source of truth for `stage`. The client never invents either number — both are authoritative.
- Encoding the "just reached 16" event as a server flag (`"event": "bloom"`) was considered but rejected: the same flag would need to fire on re-reach-after-delete (spec edge case "Re-reaching stage 16"), and the server logic for "is this transition from below 16 to 16?" is exactly the same comparison the client does. Putting it on the server adds complexity without removing it from the client.

**Alternatives considered**:
- *Server returns a `bloom: boolean` flag.* See above; rejected.
- *Client uses its own cached prev stage.* Rejected — the cached value can be stale (concurrent tab, last-second deletion); the server-returned `prev_stage` is always correct for *this* mutation.

## R7. Card refresh strategy after modal closes

**Decision**: **No refetch on modal close.** Every mutation response includes the updated idea row; `useIdeas` patches the cached list (keyed by id) immediately. On delete-idea, the entry is removed from the cache. The grid re-renders from local state; no `GET /api/ideas` is fired.

**Rationale**:
- Spec FR-032 already requires this; it is recorded here to document the *why* in one place. The mutation responses carry everything the grid needs.
- Single-user, single-laptop deployment: there is no second writer, so the local cache cannot diverge from the server except through a code bug, which the colocated tests will catch.
- The grid does refetch on **explicit** user action (manual refresh, page load); the FR-032 rule only forbids automatic refetches after a modal closes.

**Alternatives considered**:
- *Always refetch on modal close.* Cheaper to reason about, but every modal interaction would pay a full `GET /api/ideas` round-trip for no semantic benefit. Rejected.
- *Refetch only on delete-idea.* Inconsistent; if the cache is trustworthy enough for edit and watering, it is trustworthy enough for delete. Rejected.

## R8. Foreign key behaviour for `idea_updates`

**Decision**: `idea_updates.idea_id REFERENCES ideas(id) ON DELETE CASCADE`. The server enables `PRAGMA foreign_keys = ON` (already true in baseline `db.ts`). `DELETE /api/ideas/:id` issues a single `DELETE FROM ideas WHERE id = ?`; SQLite cascades the delete to `idea_updates` automatically.

**Rationale**:
- Matches the explicit DDL in PRD §2.4 (`ON DELETE CASCADE`).
- Eliminates a hand-rolled "delete updates then delete idea" two-step (which would have to be wrapped in a transaction anyway). One statement, atomic by definition.
- Cascade fires *before* the route handler returns, so there is no window where an orphaned `idea_updates` row could survive.

**Alternatives considered**:
- *Manual two-step delete inside a transaction.* Identical correctness; more code. Rejected.
- *Soft delete (`deleted_at` column).* The spec resolved this in clarification: hard delete only. Rejected.

## R9. Plant texture swap timing inside the growth animation

**Decision**: Inside the R3F scene, the textured-plane mesh swaps from `stage-NN.png` to `stage-(NN+1).png` at **~60% of the animation duration**. The swap happens inside the `useFrame` callback that drives the scale/wobble curves; it is a single `setTexture` call, no React re-render.

**Rationale**:
- 60% lands the swap at the visual peak of the scale-up curve (an ease-out-back curve peaks slightly past midway). The viewer sees the *new* plant emerge from the burst, not pop in late.
- A single `useFrame` mutation keeps the swap on the animation's render loop, not on React's reconciliation loop — no risk of a mid-animation re-render flash.
- For the bloom variant (already-stage-16 case), the same swap "fires" but with `from === to`, so it is a no-op. Same code path either way.

**Alternatives considered**:
- *Swap at 100% (end of animation).* The new plant pops in after the burst dissipates, which reads as a delayed reveal. Less satisfying. Rejected.
- *Swap at 0% (start of animation).* The growth animation then visually scales the *new* plant, not the old one transitioning into the new one. Doesn't match the metaphor. Rejected.
- *Cross-fade between two stacked textured planes.* Twice the GPU cost, marginal visual gain. Rejected.

## R10. Skeleton placeholders for modal open

**Decision**: While `GET /api/ideas/:id` is in flight, the modal renders skeletons for **(a)** the plant viewport (a soft-bordered rounded square in `colors.primary-soft`) and **(b)** the timeline (three rectangular muted bars stacked vertically). Title, description, and level badge are shown immediately using the grid's cached idea row.

**Rationale**:
- Spec FR-002 requires "skeleton placeholders for the timeline list and plant viewport." The header bits come "for free" from the grid cache; rendering skeletons there would be a regression in perceived performance.
- Three bars is a deliberately generic skeleton — we don't know how many updates the idea has, and a count-based skeleton would be misleading.
- The skeleton uses the existing `primary-soft` and `border` design tokens; no new palette.

**Alternatives considered**:
- *Skeletons for everything in the modal.* Slower-feeling open, no real benefit. Rejected.
- *Loading spinner only.* Less informative; doesn't preview the modal's structure. Rejected.

## R11. Empty-state copy and illustration for the timeline

**Decision**: When the idea has zero updates, the timeline area renders an `EmptyTimeline` component with:
- A small centred illustration (a stylised watering can over a seedling — uses the existing `assets/plants/oak/stage-01.png` as a placeholder for the implementation tasks; the artwork can be swapped without changing the component contract).
- Headline (`headline-sm`): "No waterings yet"
- Muted body (`body-sm`): "Give this idea its first drink"

Matches the spec FR-016 and FR-020 wording.

**Rationale**:
- Three lines of microcopy, one illustration, sitting above the update form — exactly the "first-class empty state" pattern that Constitution Principle III requires.
- Reuses existing assets so the implementation pass does not block on new art.

**Alternatives considered**:
- *Just an empty list with a placeholder line above the form.* Constitutionally insufficient. Rejected.

## R12. Inline edit affordance on timeline entries

**Decision**: Each `TimelineEntry` renders a small inline overflow `(⋮)` button positioned in the top-right of the entry (not the modal header). Clicking it opens a small popover with `Edit` and `Delete` actions. Clicking `Edit` swaps the entry's note text into a multiline `<textarea>` with `Save` and `Cancel` buttons (same 1–1000 char validation as new updates). Clicking `Delete` removes the entry immediately, no confirm (per spec FR-022 resolution).

**Rationale**:
- The `(⋮)` overflow pattern is already used in the modal header for delete-idea (see Project Structure in plan.md). Reusing the same affordance keeps the visual language consistent.
- The inline form swap matches the EditIdeaForm pattern: explicit Save/Cancel rather than auto-save-on-blur. Same mental model for editing the idea metadata and editing a timeline entry.
- No confirmation on delete-update is per the spec resolution; rationale was "lowest friction, since stage progression is monotonic in display via cross-fade — deletion is recoverable in the workflow even if not in the database (the user can immediately add a new watering with the same note)."

**Alternatives considered**:
- *Edit-in-place (click the note text to edit).* Friendly, but conflicts with the explicit-edit-mode pattern adopted for the idea metadata. Inconsistency for no functional gain. Rejected.
- *Confirm dialog on delete-update.* Adds friction; spec resolved against it. Rejected.

## R13. CORS, dev origin, no env additions

**Decision**: No CORS changes from baseline. The existing `apps/server/src/app.ts` already allows the Vite dev origin (`http://localhost:5173`). The new `PATCH` and `DELETE` HTTP methods are added to the CORS allowlist.

**Rationale**:
- The baseline currently allowlists only `GET, POST, OPTIONS`. The new endpoints use `PATCH` and `DELETE`, so the allowlist needs widening.
- One-line config change. No new env vars.

**Alternatives considered**:
- *Allow `*` methods.* Marginal convenience, slightly looser security posture. Rejected on YAGNI / least-privilege grounds — we know exactly which methods we need.

## R14. Plant viewport — bloom-driven evolution flash (revised three times, final 2026-05-12)

**Decision (final, third revision)**: Drop the procedurally generated plant entirely. The viewport composes two layers:
1. A **PNG sprite layer** that, in the idle state, shows the current stage's PNG (the same asset used by `IdeaCard`). It is the canonical "what does the plant look like" surface.
2. A **bloom-driven Three.js overlay** that is hidden at rest (`opacity: 0`, `composer.render()` skipped) and reveals (`opacity: 1`) only while a `playGrowth(...)` call is in flight.

The Three.js overlay renders, through `EffectComposer` with `UnrealBloomPass`, four concurrent layers:
- **Glowing core orb** — billboard sprite, hot-white center → gold edge, additive-blended radial gradient.
- **Three staggered shockwave rings** — `RingGeometry` with a custom soft-edged shader; each ring expands outward and fades.
- **GPU-driven radial particle burst** — 720 particles with all per-particle randomness baked into `BufferAttribute`s (`aAngle`, `aTilt`, `aSpeed`, `aLifespan`, `aOffset`, `aSize`, `aColorMix`); the vertex shader does the radial expansion from a single `uTime` uniform, and the fragment shader writes gold/orange/white-tinted color hot enough to clear the bloom threshold.
- **PNG cross-fade** — from-PNG fades out (~28–60 %), to-PNG fades in (~62–95 %); the bloom-dominant middle is where the cocoon "hides" the transformation.

Tone mapping is disabled (`NoToneMapping`) so the shader's bright outputs survive into the bloom pass without being clipped to LDR.

**The three iterations, with rationale**:
- **v1 (rejected)**: each stage's PNG on a textured plane with an ease-out-back scale curve. Visually flat — no real glow, no dramatic transition.
- **v2 (rejected)**: per-stage procedurally generated branching plant (cylinders + icosahedron leaves) using the proven `HeroScene` pattern. Richer, but at low stages the plant was a bare twig and at high stages stages 14/15/16 looked identical. The flat-shaded geometric aesthetic also clashed with the editorial visual language.
- **v3 (shipped)**: the bloom-driven flash above. Drops the procedural geometry entirely. The "magic" comes from real post-processing bloom, not from polygon count.

**Rationale**:
- The product-owner-requested model is "like evolving a Pokémon": original → glow / particles → new form. The magic of that effect is **lighting**, not geometry — and `UnrealBloomPass` is the cheapest, most reliable way to produce real glow in Three.js.
- Reusing the PNG sprites for both grid thumbnails and modal idle frames keeps the visual language tight.
- Baking per-particle randomness into `BufferAttribute`s and animating from a single `uTime` uniform means 720 particles cost essentially the same as 1 — all work is on the GPU.
- Staggered shockwave rings + a hot-white core sprite + bloomed particles together produce a "shockwave + halo + glitter" feel that reads as triumphant even on lower-end machines.

**Alternatives considered (this revision)**:
- *Keep the procedural plant and just add bloom on top of it.* Tried in v2. The plant geometry was the wrong shape for the cocoon moment — its silhouette competed with the bloom rather than blending into it. Rejected.
- *Pure CSS effect (radial gradients + animated divs).* Tempting, but the bloom luminance accumulation across many overlapping additive points is exactly what `UnrealBloomPass` does well; mimicking it in pure CSS with blur filters looks washed-out and runs slowly.
- *Three.js without post-processing, more particles.* Tried (v1.5, never shipped). 1500 particles without bloom still read as "specks", not "glow". The luminance threshold + multi-mip blur of `UnrealBloomPass` is the missing ingredient.

## R15. Modal layout — full-page two-column shell (added 2026-05-12)

**Decision**: The detail modal occupies ~95vw × ~90vh on desktop. The body uses a two-column layout at `md+`: Column 1 (left, fixed) holds title/description/level badge/plant viewport; Column 2 (right, scrollable) holds the update form (top) and timeline (below). Below `md`, the layout collapses to one stacked column with the update form between the level badge and the timeline.

**Rationale**:
- The 640-px-max single-column variant pushed the timeline below the fold for any meaningful history, which made "what did I do last time" the user's most expensive action — they had to scroll past the form and viewport every time.
- Putting the form **above** the list (FR-038) directly surfaces the next-step affordance. The "what's the next watering?" cursor is where the user's intent already is — re-reading older entries is the rarer task and can earn the scroll.
- A near-full-page panel reads like a focused workspace (a "tend this idea" room) rather than a pop-up. The grid context behind the backdrop is faint but visible, so the user retains a sense of place.
- Two columns scale the viewport to its full real estate without making the plant viewport square take over the whole screen.

**Alternatives considered**:
- *Tabbed UI (Read / Edit / Water tabs).* Hides affordances; rejected — the workshop's narrative is "one focused screen per idea."
- *Sticky update form pinned to the bottom of a single-column modal.* Works on mobile but reads as a chat dock on desktop, conflicting with the editorial visual language. Rejected at desktop sizes; the responsive single-column variant keeps the form mid-flow rather than dock-pinned.

## R16. Confetti canvas rendered via portal (revised 2026-05-12)

**Decision (final)**: The `<canvas>` element inside `ConfettiBurst` (see R5) is rendered into a `document.body`-mounted React portal (using `react-dom`'s `createPortal`) rather than as a child of the modal's DOM subtree. The portal element has `position: fixed; inset: 0; pointer-events: none; z-index: 2147483647`.

**Rationale**:
- The modal's backdrop uses `backdrop-filter: blur(2px)`, which establishes a stacking context. Mounting the confetti inside that subtree means even a high local `z-index` cannot escape the parent context — particles get painted behind the modal panel.
- A portal at `document.body` puts the confetti as a sibling of the React root with no constraining ancestor. `position: fixed; z-index: 2147483647` then behaves as intended in every browser we target.
- `createPortal` is part of `react-dom`, which is already a project dependency. No new package needed.
- The canvas itself owns its lifecycle: it allocates particles on mount, runs its rAF loop, calls `onComplete` when the timeline elapses, and is then unmounted by the parent — so the portal cost is paid only while a burst is actually visible.

**Alternatives considered**:
- *Bump z-index further without the portal.* Doesn't help; the issue is stacking-context isolation, not numeric order. Rejected.
- *Reorganise the modal's DOM so it doesn't create a stacking context.* Fragile — any future CSS change (a new `transform`, `filter`, `isolation`, etc.) could regress it. Rejected.
- *Render the canvas inline inside the modal with overflow: visible.* Doesn't escape the parent's `transform`/`filter` stacking context. Rejected.

## R17. Bloom canvas compositing — `mix-blend-mode: screen` (added 2026-05-12)

**Decision**: The Three.js renderer's `domElement` is styled with `mix-blend-mode: screen` so its output composes additively with the PNG behind it. The canvas is also held at `opacity: 0` at rest and `opacity: 1` only while the animation is playing, and `composer.render()` is skipped while idle.

**Rationale**:
- `UnrealBloomPass` writes `alpha = 1` in its composite step (the final `gl_FragColor = vec4(result, 1.0)` in its composite shader). With `renderer.alpha = true` and a fully-transparent clear, the canvas would *still* end up opaque-black wherever there is no bloom — because the bloom pass's final composite paints solid pixels.
- `mix-blend-mode: screen` is the CSS compositor's "lighten with `1 - (1 - dst)(1 - src)`" rule. Pure-black source pixels are a no-op (the bg shows through); bright bloomed source pixels brighten the bg through the additive-like formula. This is exactly the behaviour we want for a glow overlay.
- `plus-lighter` is even more accurate (pure additive) but support is narrower; `screen` works in every target browser without a fallback path.
- Keeping the canvas at `opacity: 0` at rest and skipping the composer's render call removes a per-frame GPU cost when the animation isn't playing. A user staring at the modal at rest pays nothing.

**Alternatives considered**:
- *Patch `UnrealBloomPass.compositeMaterial`'s fragment shader to preserve alpha.* Works in principle, but couples the app to a private detail of the post-processing library and would regress on every Three.js upgrade. Rejected.
- *Render with a clear color matching the PNG card background.* Would mask the black, but only at exactly one bg color; the modal's gradient background would still produce a visible seam. Rejected.
- *Use an opaque dark scene background and let bloom shine through.* Aesthetically the wrong direction — the modal is on a `paper` ivory background; a dark scene insert breaks the editorial visual language. Rejected.

## R18. Stage progression rule — N waterings → Level N+1 (revised 2026-05-12)

**Decision (revised)**: The `stage_after` formula's empty-set base case is **1** rather than 0:

```
new.stage_after = MIN(COALESCE(MAX(prior stage_after), 1) + 1, 16)
```

So the **first** watering on a fresh idea produces `stage_after = 2`, the **fifteenth** produces `stage_after = 16`, and any subsequent watering on a bloomed idea persists as `stage_after = 16` (cap).

**Rationale**:
- Under the original rule (base case 0), the first watering produced `stage_after = 1`, which meant the plant image did not visibly change. Users reported the first watering "did nothing" — a confusing first-run experience for the headline interaction of the app.
- Under the revised rule, **every watering visibly advances the level**, up to the bloom cap. The rule of thumb is "N waterings → Level N+1, capped at 16."
- One-line implementation change in the route handler (`?? 0` → `?? 1`); the SQL recompute is unchanged because it already uses `COALESCE(MAX(stage_after), 1)` for the idea's `stage` field.
- All existing tests pass unchanged: they read `startStage` dynamically from the server and assert `+1`, not absolute values.
- The bloom-confetti trigger (`prev_stage < 16 && idea.stage === 16`) works identically — it now fires after the 15th watering instead of the 16th. The first-watering confetti trigger (`prev_stage === 1 && idea.stage === 2`) now fires after the **first** watering instead of the second.

**Alternatives considered**:
- *Keep the original rule and rename "Level" to something less literal* (e.g., "Sprout count"). Rejected — the existing badge copy ("Level N", "Fully bloomed") is canonical in `LevelBadge` and matches the workshop's pitch deck.
- *Make the first watering a no-op explicitly* (don't persist a row). Rejected — every watering should produce a timeline entry; that's a hard product rule.
