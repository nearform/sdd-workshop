# Feature Specification: Growth Loop (Idea Detail, Watering, Edit, Delete, Animation)

**Feature Branch**: `003-growth-loop`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "Click an idea to open a modal showing its title, description, status, and full history of updates; edit title/description (decoupled from growth), water the idea with a new update note that advances the plant level and plays a Three.js growth animation with a particle level-unlock burst, delete past updates, and delete the idea entirely. Fire a page-wide confetti burst on two specific transitions: the first watering on a fresh idea (Level 1 → 2) and the watering that reaches the bloom state (Level 15 → 16)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open an idea and water it to make it grow (Priority: P1)

A user clicks an idea card on the garden grid. A modal opens showing the idea's title, description, current plant image, level indicator, and the full history of updates so far. The user types a new update ("Today I sketched a logo for this idea") into the watering form and submits. The plant performs a growth animation, the plant image swaps to the next stage, the level indicator updates, and the new update appears at the top of the timeline.

**Why this priority**: This is the core loop of the entire feature. Without it, none of the surrounding affordances (edit, delete, celebration) have anywhere to live. It is also the workshop's headline demo — the visible "feel-good" moment when an idea visibly grows.

**Independent Test**: Open an existing idea from the grid, submit a watering update with a non-empty note, observe that (a) the growth animation plays, (b) the plant image advances by one stage, (c) the level indicator increments, (d) the new entry appears at the top of the timeline, and (e) the card on the grid reflects the new stage after the modal closes.

**Acceptance Scenarios**:

1. **Given** an idea at stage 3 with two prior updates, **When** the user clicks the card, **Then** the modal opens with stage 3 plant image, "Level 3" badge, and a timeline of two entries (newest first).
2. **Given** the modal is open, **When** the user types a 200-character note and submits, **Then** the form awaits server confirmation, the growth animation plays once, the plant texture swaps to stage 4, the badge updates to "Level 4", and a new entry is prepended to the timeline with the submitted note text and a "just now" timestamp.
3. **Given** the modal is open, **When** the user submits an empty (or whitespace-only) note, **Then** an inline validation error renders below the textarea ("Updates need a note"), no animation plays, no API call is made.
4. **Given** the modal has been closed after a successful update, **When** the user looks at the grid, **Then** the affected card shows the new stage image and the updated "watered Xd ago" timestamp.
5. **Given** the network is unavailable, **When** the user submits a valid update, **Then** the form text is preserved, an inline error appears below the form, the plant stays at the previous stage, and no timeline entry is added.

---

### User Story 2 - Refine an idea's title and description without disturbing its growth (Priority: P2)

After clicking into an idea, the user notices the title still says "thing for thing" and wants to rename it to "Garden journal CLI". They enter an explicit Edit mode in the modal header, change the title and description, and click Save. The header returns to read mode with the new text. No timeline entry is created, no animation plays, and the idea's stage is unchanged.

**Why this priority**: Editing is a high-value, low-friction quality-of-life affordance — ideas mature in name and description as they grow, and the user must be able to keep them tidy. It is decoupled from the growth loop to keep the metaphor clean: editing a label is not "watering."

**Independent Test**: Open an idea at any stage, enter Edit mode, change the title to a new valid value, save, observe that the new title is displayed in both the modal header and the grid card, and verify the level and timeline are unchanged.

**Acceptance Scenarios**:

1. **Given** an idea at stage 5 with five prior updates, **When** the user clicks "Edit" in the modal header, **Then** title and description become editable form fields with their current values pre-filled, "Save" and "Cancel" buttons appear, and the rest of the modal (timeline, update form, plant viewport, level badge) is unchanged.
2. **Given** the user is in Edit mode, **When** they clear the title field entirely and click Save, **Then** an inline validation error renders below the title input ("Title is required"), Save is blocked, no API call is made.
3. **Given** the user is in Edit mode, **When** they enter a title longer than 80 characters, **Then** an inline character-limit error renders below the title input and Save is blocked.
4. **Given** the user is in Edit mode with valid changes, **When** they click Save, **Then** the modal returns to read mode with the new title and description visible, the grid card reflects the new title and description on modal close, no entry is added to the timeline, the level badge is unchanged, no animation plays.
5. **Given** the user is in Edit mode with pending changes, **When** they click Cancel, **Then** the modal returns to read mode showing the original title and description, no API call is made.

---

### User Story 3 - Celebrate two milestone waterings (Priority: P3)

A user feels rewarded at two distinct moments: the **first time they water a brand-new idea** (Level 1 → Level 2), and the **moment they reach Level 16** for the first time. Both produce a page-wide confetti burst. The first-watering burst is smaller and uses a green / gold palette; the bloom burst is larger and uses a full festive palette and runs concurrently with the bloom-palette growth animation. Intermediate waterings (Level 2 → 3, … → 15) play the regular growth animation alone, without confetti.

**Why this priority**: The celebrations are the emotional payoff of the metaphor. Two confetti moments instead of one shape the user's narrative arc — *"I started something"* and *"I finished it"* — and visibly mark both ends of the loop. Third-priority because P1 must work before any celebration can exist.

**Independent Test**: Take a freshly-planted idea, submit one watering, observe the first-watering confetti burst + Level 2. Continue watering until Level 15, then submit one more watering, observe the bloom-palette animation, the bloom-palette confetti, and the badge "Fully bloomed". Submit another watering on the now-bloomed idea, observe the bloom animation plays again with **no** confetti.

**Acceptance Scenarios**:

1. **Given** a freshly-planted idea at Level 1 with zero updates, **When** the user submits the first valid watering, **Then** the growth-palette animation plays, a small green / gold confetti burst fires once over the modal, the level badge updates to "Level 2", and the timeline records the update with `stage_after = 2`.
2. **Given** an idea between Level 2 and Level 15, **When** the user submits a valid watering, **Then** the growth-palette animation plays and the level badge advances by one — **no** confetti fires.
3. **Given** an idea at Level 15, **When** the user submits a valid watering, **Then** the bloom-palette growth animation plays, a large full-palette confetti burst fires once, the level badge updates to "Fully bloomed", and the timeline records the update with `stage_after = 16`.
4. **Given** an idea already at Level 16, **When** the user submits a valid watering, **Then** the bloom-palette animation plays once, NO confetti fires, the plant image stays at Level 16, and the timeline records the update with `stage_after = 16`.
5. **Given** an idea at Level 16 with multiple prior bloom-stage updates, **When** the user opens the modal, **Then** the level badge shows "Fully bloomed" (not "Level 16"), and all bloom-stage updates appear in the timeline with their notes and timestamps.

---

### User Story 4 - Curate the timeline by deleting individual updates (Priority: P4)

The user reviews an idea's timeline and decides one of the early updates was a duplicate. They click the delete control on that timeline entry. The entry disappears immediately, no confirmation dialog. If that entry happened to be the one producing the idea's current maximum stage, the plant image cross-fades to the new (lower) maximum stage and the level badge updates accordingly. No reverse-growth animation plays.

**Why this priority**: This is a "curate your history" affordance — useful for serious users, but not central to the loop. Most users will rarely use it. P4 because the data-model implication (derived stage) is non-trivial but the UX is minimal.

**Independent Test**: Open an idea with at least three updates. Delete the most recent update. Observe that the entry disappears, the plant cross-fades to the next-highest stage_after, and the level badge reflects the new stage. Reopen the modal and confirm persistence.

**Acceptance Scenarios**:

1. **Given** an idea at stage 4 with four updates (stage_after = 1, 2, 3, 4), **When** the user deletes the latest update (stage_after = 4), **Then** the entry disappears from the timeline, the plant image cross-fades to stage 3, the level badge updates to "Level 3", and no growth/reverse-growth animation plays.
2. **Given** an idea at stage 4 with four updates, **When** the user deletes the second update (stage_after = 2), **Then** the entry disappears from the timeline, the plant image and level badge are unchanged (max stage_after of remaining updates is still 4).
3. **Given** an idea at stage 4 with a single remaining update (stage_after = 4), **When** the user deletes that last update, **Then** the entry disappears, the plant image cross-fades to stage 1 (seed), and the level badge updates to "Level 1".
4. **Given** any timeline entry, **When** the user clicks its edit control and modifies only the note text, **Then** Save persists the change; the timestamp and stage_after of the entry are unchanged.

---

### User Story 5 - Permanently delete an idea (Priority: P5)

The user decides an idea is no longer worth keeping. They open the modal, click the overflow menu (⋮) in the header, choose "Delete idea", confirm in the resulting dialog ("Yes, delete forever"), and the idea is gone — modal closes, the card disappears from the grid, and reloading the page confirms the deletion is permanent.

**Why this priority**: Removing ideas is a necessary safety valve, but most users will not exercise it often. The destructive nature warrants explicit confirmation. P5 because it is purely housekeeping with no daily-use relevance.

**Independent Test**: Open any idea, use the header overflow menu to choose "Delete idea", confirm in the dialog, observe that the modal closes and the card is gone. Reload the page and verify the idea does not return.

**Acceptance Scenarios**:

1. **Given** the modal is open for any idea, **When** the user clicks the header overflow (⋮) menu, **Then** a small menu appears with at least a "Delete idea" item.
2. **Given** the overflow menu is open, **When** the user clicks "Delete idea", **Then** a confirmation dialog appears with a destructive primary action and a Cancel action.
3. **Given** the confirmation dialog is open, **When** the user clicks Cancel, **Then** the dialog closes and the idea is not affected.
4. **Given** the confirmation dialog is open, **When** the user clicks the destructive action, **Then** the idea and all its updates are permanently removed, the modal closes, the card disappears from the grid, and reloading the page confirms the deletion.
5. **Given** the server returns an error on delete, **When** the destructive action is clicked, **Then** the modal stays open, the card remains, and a user-visible error message appears inside the modal.

---

### Edge Cases

- **Empty / whitespace-only note**: rejected inline with a validation message; no API call is made; the form retains focus.
- **Note longer than 1000 characters**: inline validation prevents submission; character counter or limit message is shown.
- **Update fails server-side after the user clicks Submit**: the form preserves its text, the plant stage and timeline are unchanged, an inline error message is rendered below the form. No animation plays (animation only fires after a successful server response).
- **User closes the modal mid-animation**: not possible — the modal is fully non-interactive while the growth/bloom animation plays. Clicks, Escape, and backdrop are ignored until the animation finishes.
- **Two rapid submits of the watering form**: the submit button is disabled while the request is in flight; only one update is created per submission.
- **Idea has zero updates**: the timeline section displays a friendly empty state (illustration + headline "No waterings yet" + muted body "Give this idea its first drink") above the update form.
- **Modal opens for an idea no longer on the server (e.g., concurrent delete in another tab)**: the detail fetch returns an error, the modal surfaces a friendly "This idea is no longer in your garden" message with a Close action, and the grid card is removed on close.
- **Edit Save with no actual changes**: Save still triggers an API call; no special "skip-if-unchanged" handling is required.
- **Delete update for an idea at stage 16**: if the deleted update was the only one with `stage_after = 16`, the plant cross-fades down to the next-highest stage_after; the "Fully bloomed" badge reverts to a numeric level badge.
- **Re-reaching stage 16** (after deleting the bloom-stage update, then watering back to 16): the bloom-palette confetti burst fires again on the watering that brings the idea back to 16. The first-watering burst, in contrast, only ever fires for the literal `1 → 2` transition; deleting updates back below Level 2 and then watering up again does NOT re-fire the first-watering burst, because the FR-025 trigger compares `prev_stage` and `idea.stage` on the mutation and Level 1 → Level 2 is a one-time transition per idea (the idea drops to Level 1 only when *all* updates are deleted, and a re-watering from that zero-update state is a "first watering" by definition — so in that edge case it does re-fire, which matches the metaphor).
- **Editing a timeline entry's note**: only the note text changes; the entry's timestamp and `stage_after` are preserved.

## Requirements *(mandatory)*

### Functional Requirements

**Modal — open and content**

- **FR-001**: System MUST open a detail modal for the clicked idea when the user clicks any idea card on the grid.
- **FR-002**: Modal MUST open instantly using grid data already in client memory (title, description, current stage), and MUST display skeleton placeholders for the timeline list and plant viewport until the server-side detail fetch resolves.
- **FR-003**: Modal MUST display, at minimum: idea title, idea description, current plant image at the idea's current stage, level badge ("Level N" for stages 1–15, "Fully bloomed" at stage 16), full timeline of updates (newest first), update form, and a header overflow (⋮) menu that contains a "Delete idea" item.
- **FR-004**: Modal MUST be closeable via an explicit X button in the header, the Escape key, and a click on the backdrop, EXCEPT while a growth or bloom animation is playing (see FR-022).
- **FR-005**: System MUST display only one detail modal at a time. To view a different idea, the user MUST close the current modal first.

**Editing — title and description (decoupled from growth)**

- **FR-006**: Modal header MUST provide an explicit "Edit" control that switches the title and description into editable form fields with the current values pre-filled, alongside "Save" and "Cancel" buttons.
- **FR-007**: While in Edit mode, the title MUST validate as 1–80 characters (non-empty after trim) and the description MUST validate as 0–500 characters. Validation errors MUST render inline below the offending field; Save MUST be blocked while validation is failing.
- **FR-008**: Clicking Save with valid input MUST persist the new values; on success, the modal returns to read mode with the new title and description visible.
- **FR-009**: Clicking Cancel MUST discard pending edits without an API call and return the modal to read mode showing the original values.
- **FR-010**: Editing title or description MUST NOT create a timeline entry, MUST NOT change the stage or level badge, and MUST NOT play any animation. Editing is decoupled from the growth loop.

**Watering — add new update**

- **FR-011**: The update form MUST require a note of 1–1000 characters after trim; newline characters (multi-line input) MUST be allowed and preserved in timeline rendering.
- **FR-012**: Submitting the update form with an invalid note (empty after trim, or over 1000 characters) MUST render an inline validation error below the textarea, MUST NOT make an API call, and MUST NOT play any animation.
- **FR-013**: Submitting a valid note MUST wait for the server response before any UI change. The submit button MUST show a loading indicator and be disabled during the request to prevent duplicate submissions.
- **FR-014**: On a successful response, the form MUST clear, the new entry MUST be prepended to the timeline, the growth/bloom animation MUST play, and the displayed level badge and plant image MUST update to the new stage.
- **FR-015**: On a failed response, the form text MUST be preserved, an inline error message MUST appear below the form, and NO animation MUST play.

**Stage progression — derived from updates**

- **FR-016**: Each update MUST persist a `stage_after` value such that the **first watering on a previously-unwatered idea produces `stage_after = 2`**, the second watering produces 3, and so on, capped at 16. Formula: `min(COALESCE(MAX(prior stage_after), 1) + 1, 16)` — equivalently, each watering increments the idea's current stage by exactly 1 (and holds at 16 once capped). The server is the source of truth. **Rule of thumb**: an idea with N waterings is at level `min(N + 1, 16)`; an unwatered idea is at Level 1.
- **FR-017**: The idea's displayed current stage MUST be `max(stage_after across remaining updates)`, with a floor of 1 (an idea with zero updates is at Level 1).
- **FR-018**: Stage 16 is a cap; updates submitted to an idea already at stage 16 still persist with `stage_after = 16` and still appear in the timeline.

**Timeline — list, edit, delete**

- **FR-019**: Timeline MUST render entries newest-first. Each entry MUST display the note text (with preserved line breaks), a relative timestamp ("just now", "2h ago", "3d ago", "May 8"), and the stage produced by that update.
- **FR-020**: When the idea has no updates, the timeline area MUST render a friendly empty state (illustration + headline line + muted body line) sitting above the update form, instead of an empty list.
- **FR-021**: Each timeline entry MUST provide an Edit control. Activating it switches the entry's note into an inline form with Save and Cancel buttons. Save persists the new note text (with the same 1–1000 character validation); the entry's timestamp and `stage_after` MUST remain unchanged. Cancel discards changes.
- **FR-022**: Each timeline entry MUST provide a Delete control. Activating it MUST immediately remove the entry without a confirmation dialog. If the deleted entry had the highest `stage_after` among the idea's updates, the idea's current stage drops to the next-highest `stage_after` (or 1 if no updates remain), the plant image cross-fades over ~300 ms to the new stage, and the level badge updates accordingly. NO reverse-growth animation plays.

**Animation — growth, bloom, confetti**

- **FR-023**: A growth animation MUST play after a successful watering. It is a single combined sequence: the current plant image is rendered as a textured plane inside a 3D scene that scales/wobbles/glows; particles emit around the plant; the plant texture swaps to the new stage at the peak of the sequence; particles continue and fade out.
- **FR-024**: The full combined sequence MUST run for 1500–2500 ms total. The animation is non-interruptible by user input (see FR-026).
- **FR-025**: The page MUST fire a one-shot page-wide confetti burst on exactly two transitions, and on no others:
  1. **First-watering burst** — when `prev_stage === 1 && idea.stage === 2` (the user's first watering on a fresh idea). Smaller burst, green / gold-toned palette. Celebrates the user starting the loop.
  2. **Bloom burst** — when `prev_stage < 16 && idea.stage === 16` (the watering that brings the idea to Level 16 for the first time). Larger, full-festive-palette burst, concurrent with the bloom-palette growth animation.
  Intermediate waterings (e.g. 5 → 6) MUST NOT fire confetti. Subsequent waterings on a bloomed idea play the bloom-palette animation only — no confetti. After deleting the bloom update and watering back up to 16, the bloom burst MUST fire again (per-mutation comparison; see Edge Cases).
- **FR-026**: While the growth or bloom animation is playing, the modal MUST be fully non-interactive: clicks, keyboard input (including Escape), and the submit button MUST be ignored or disabled. The modal becomes interactive again only after the animation completes.
- **FR-027**: The growth and bloom animations MUST always play on successful waterings, regardless of the user agent's `prefers-reduced-motion` setting. There is no CSS-only or reduced-motion fallback for this feature (see Assumptions for the constitutional deviation this represents).

**Deletion — entire idea**

- **FR-028**: The modal header overflow (⋮) menu MUST include a "Delete idea" item.
- **FR-029**: Selecting "Delete idea" MUST open a confirmation dialog with a clearly destructive primary action label (e.g., "Yes, delete forever") and a Cancel option. The dialog MUST be escapable via Cancel, Escape, and backdrop click.
- **FR-030**: Confirming the destructive action MUST permanently remove the idea and ALL its updates. On success the modal closes and the card disappears from the grid.
- **FR-031**: If the deletion fails server-side, the modal MUST stay open, the card MUST remain in the grid, and a user-visible error message MUST appear inside the modal.

**Grid synchronization**

- **FR-032**: After any successful mutation inside the modal (edit title/description, add update, edit update, delete update, delete idea), the grid MUST reflect the change from local state using values returned by the server. The system MUST NOT trigger a full refetch of `/api/ideas` after the modal closes.
- **FR-033**: The card on the grid MUST always reflect the idea's current stage image, current title (truncated as before), and the relative timestamp of the most recent watering (or creation if no updates exist).

**Errors — never silent**

- **FR-034**: Every server error encountered during any mutation in the modal MUST be surfaced visibly to the user inside the modal — either inline below the offending form, or as a toast/banner inside the modal — never silently swallowed.

**Modal layout — full-page two-column shell**

- **FR-035**: The detail modal MUST occupy approximately the full viewport on desktop (≥ ~`md` breakpoint), i.e. ~95% of the viewport width and ~90% of the viewport height with a small visible backdrop margin. The legacy `max-w-[640px]` constraint is removed.
- **FR-036**: On viewports at or above the `md` breakpoint (768 px), the modal body MUST render as a **two-column layout**:
  - **Column 1 (left, identity & visual)**: idea title, description, the level badge, and the plant viewport (which hosts the Three.js growth animation when one plays). This column is the visual hero and does not scroll independently — content fits within the column height.
  - **Column 2 (right, history & input)**: the update form first, then the timeline list of past waterings beneath it. This column is independently scrollable when the timeline grows past the visible area.
- **FR-037**: Below the `md` breakpoint, the two columns MUST collapse into a single column in this stacking order: title + description → plant viewport → level badge → update form → timeline list. The single-column shell scrolls as a whole.
- **FR-038**: The update form MUST appear **above** the timeline list (in both two-column and one-column layouts). The empty-state illustration (FR-020) still renders in the timeline region; when the list is empty it sits below the form rather than above it.

**Plant viewport — bloom-driven evolution flash**

- **FR-039**: When no animation is playing (idle state), the plant viewport MUST display the species' stage PNG sprite (the same asset used by `IdeaCard` from `assets/plants/<species>/stage-NN.png`). The Three.js canvas MUST be hidden at rest — only the PNG, the rounded card frame, and the gradient background are visible.
- **FR-040**: On a successful watering, the viewport MUST play a **single canonical** "evolution flash" animation (the same animation regardless of `from` and `to` stages) over ~2000–2500 ms. The animation is rendered through `EffectComposer` with `UnrealBloomPass` so that bright pixels actually glow rather than render as flat dots. Composed of these concurrent visual layers:
  1. **Glowing core orb**: a billboard sprite at center with a hot-white core fading through gold to transparent (additive-blended radial gradient). Scales up in a bell envelope to a peak around ~35 % of the animation, then fades.
  2. **Shockwave rings**: three concentric ring meshes (`RingGeometry` + custom shader) staggered in time, each expanding outward from center while fading. Color drifts from gold to warm orange across the three rings.
  3. **Radial particle burst**: ~720 GPU-driven particles (`BufferGeometry` with per-particle angle / tilt / speed / lifespan / color-mix baked as attributes) shooting outward from center with a slight upward bias and very subtle gravity. Each particle blooms because the fragment shader writes hot-white-tinted color above the bloom threshold.
  4. **PNG cross-fade**: the from-PNG fades out (~28–60 %) and the to-PNG fades in (~62–95 %), so the cocoon dominates the middle of the animation and the new stage emerges from the glow.
- **FR-041**: The 3D layers (orb, rings, particles) are **decorative and constant** — their geometry and timing do not depend on `from` or `to` stage. The visible difference between stages is conveyed entirely by the PNG sprite revealed at the end. (The Pokémon-evolution metaphor: original → glow → new form.)
- **FR-042**: For the **bloom palette** variant (FR-025), the particle palette shifts to a brighter gold + hotter orange mix, the orb peaks larger (~10 vs ~8.5 units), and the shockwave rings expand further (~7.5 vs ~6 units). The animation timing, phase structure, and PNG cross-fade are otherwise identical to the growth palette.

**Confetti — z-order**

- **FR-043**: The page-wide confetti burst (FR-025) MUST render visibly **above** the detail modal, its backdrop, and any nested dialog (e.g. delete-confirm) at all times. It MUST NOT be clipped by, or stack below, any modal or dialog DOM. Implementation requirements: a `<canvas>` element mounted via `createPortal` to `document.body`, sized to the full viewport (`position: fixed; inset: 0`), `pointer-events: none`, with a maximum CSS `z-index` (effectively `2147483647`). Particles MUST be drawn directly into the canvas with the 2D context — no third-party confetti library, so the project doesn't inherit any library-internal stacking or positioning behaviour. The canvas un-mounts itself when its animation completes.

**Bloom canvas compositing**

- **FR-044**: The Three.js renderer's canvas MUST composite with the PNG behind it as an **additive overlay** — its dark pixels MUST NOT paint as solid black over the PNG. Implementation MUST use `mix-blend-mode: screen` (or `plus-lighter`) on the canvas element, so that the bloom output reads as light glowing on top of the artwork rather than as an opaque rectangle. The canvas is additionally toggled to `opacity: 0` at rest and `opacity: 1` only while the animation is playing, and `composer.render()` is skipped while idle.

### Key Entities

- **Idea**: The plant being tended. Has a stable identifier, a user-provided title (1–80 chars) and optional description (0–500 chars), an immutable species (assigned at creation), a derived current stage (1–16, computed from its updates), a creation timestamp, and a last-modified timestamp (updated on any mutation, including editing title/description, adding/editing/deleting updates, but NOT on read).
- **IdeaUpdate** (a.k.a. "watering"): A user-authored entry in an idea's history. Has a stable identifier, a foreign key to the idea, a note (1–1000 chars, multi-line), a `stage_after` value (1–16) recording the stage the idea reached because of this update, and a creation timestamp. The note text may be edited; the `stage_after` and creation timestamp are immutable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open an idea's detail modal, read its title/description/timeline, and dismiss it (without making changes) in under 10 seconds on a local-machine setup. Skeleton placeholders disappear and full content is visible within 1 second of the card click.
- **SC-002**: For valid watering submissions on a healthy server, the growth animation plays, the displayed stage advances by one (or stays at 16 with the bloom variant), and the new entry appears at the top of the timeline in 95%+ of attempts.
- **SC-003**: Edit-then-Save returns the modal to read mode with the new title and description visible in under 1 second on a local-machine setup. The grid card reflects the new title/description on modal close.
- **SC-004**: Watering a fresh idea (Level 1 → 2) produces a single first-watering confetti burst; watering an idea from Level 15 → 16 produces a single bloom-palette confetti burst concurrent with the bloom growth animation. Each is observable end-to-end with no manual intervention. No confetti fires on intermediate transitions (Level 2 → 3 through Level 14 → 15).
- **SC-005**: Confirming the delete-idea dialog removes the modal and the corresponding grid card from view in under 1 second on a local-machine setup. Reloading the page confirms the deletion is permanent.
- **SC-006**: Deleting the update that produced the highest `stage_after` causes the plant image to cross-fade to the new (lower) max stage and the level badge to update within 500 ms. Reloading the page persists the new derived stage.
- **SC-007**: 100% of server errors encountered during any mutation (edit, add update, edit update, delete update, delete idea) result in a user-visible error message inside the modal — zero silent failures.
- **SC-008**: After any successful mutation the modal becomes interactive again within 3 seconds of submit (a hard ceiling that includes the full animation duration and server roundtrip on a local-machine setup).

## Assumptions

- The Step 1 baseline (`001-foundation-homepage`) is already merged on `master`: the grid, idea creation flow, persistence layer, and shared schema package exist. This feature builds on that foundation; it does not re-spec the grid or creation flow.
- The species is fixed per idea at creation and never changes. The plant illustration sequence (`stage-01.png` … `stage-16.png`) per species is the visual asset both the static plant image and the Three.js textured-plane scene consume.
- The product is single-user, single-laptop. No multi-user concurrency, no auth, no rate limiting, no observability — out of scope (PRD §2 non-goals).
- The grid card click target is currently inert (no detail modal exists in Step 1). This feature wires up that interaction.
- The animation accessibility and 60-fps CSS-fallback rules in Constitution Principle III are explicitly waived for this feature by product owner direction. The 3D growth animation always plays; `prefers-reduced-motion` is not honored; there is no CSS fallback. This is a known constitutional deviation that the planning phase (`/speckit-plan`) Constitution Check will need to record and justify in its Complexity Tracking table.
- The page-wide confetti is implemented in-house as a small canvas component (no third-party library). An earlier iteration used `react-confetti-explosion`, but the library's internal positioning fought with the modal's stacking context even when mounted via portal; the canvas approach is simpler, has zero dependencies, and gives us full control over the z-order, palette, particle count, and duration per variant. The canvas approach is binding for the spec.
- Editing past timeline entries is restricted to the note text only. The `stage_after` and creation timestamp of an entry are not user-editable.
- Deleting timeline entries does NOT play a reverse-growth animation. A plain cross-fade is sufficient even when the deletion lowers the current stage.
- Pulling in "edit idea" and "delete idea" into this feature is a deliberate scope addition relative to PRD §2.7, which originally listed both as stretch goals. The product owner has explicitly requested them as part of this slice; the planning phase is expected to address the PRD/constitution alignment in its Constitution Check.

## Out of Scope

- Wilting (stages decreasing automatically due to neglect over time). Deferred per PRD §2.7.
- Sidebar filters (Growing / Wilted / Just Seeds / Favorites). Deferred.
- Favorites / star toggle. Deferred.
- "Today's Focus" widget. Deferred.
- Sort options for the grid. Deferred.
- Inline next/previous navigation between ideas inside the modal. The modal is one-idea-at-a-time; switching requires closing.
- Deep-linking individual ideas via URL (e.g., `/ideas/:id`). The detail modal is a transient UI overlay, not a route.
- Animation accessibility fallback (CSS-only growth) and `prefers-reduced-motion` handling. Explicitly waived for this feature.
- Server-side concurrency resolution for multi-user races. Single-user assumption holds; the server still performs each mutation in a single transaction.
