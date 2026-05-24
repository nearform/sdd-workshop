# Phase 0 Research — Foundation & Homepage

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Date**: 2026-05-09

This document captures the decisions taken to resolve the open questions left by the spec and the constitution. Each decision follows the **Decision / Rationale / Alternatives** format. Items marked `N/A for Step 1` are recorded for completeness so the SDD branch (Step 2) inherits the context without rediscovery.

## R1. Plant species assignment

**Decision**: Assign a plant species at idea creation, persist it on the `ideas` row, and never change it. **For Step 1 the allowlist is exactly `['oak']`** — every idea gets `species: 'oak'`. The mechanism that picks the species (`randomSpecies()`) and the persistence column are both introduced now so a future PRD update can widen the allowlist without a schema migration.

**Rationale**:
- PRD §7 lists "random at creation, with the species stored on the row so it's stable" as the documented default for the *long-term* design.
- Spec FR-020 requires species stability for the idea's lifetime; persisting on the row honours that regardless of allowlist size.
- The Step 1 demo only ships **one species** (oak), with all 16 stage PNGs committed (per PRD §2.6, "asset pipeline is manual for the workshop"). Picking randomly from a 5-species allowlist with only one species' artwork available means ~80% of cards would fall back to a missing-asset placeholder, which kills the visual signal of design.md. Trimming the allowlist to `['oak']` keeps the storage shape forward-compatible without committing dummy art.
- Adding more species is a real PRD update, not a "while I'm here" change — it requires committing artwork and reopening the species rule.

**Alternatives considered**:
- *Ship 5 species with placeholder SVGs in Step 1.* Padding the asset folder with stand-in art to make a 5-way random selection look populated dilutes the workshop's visual signal and adds work that PRD §2.6 explicitly defers. Rejected.
- *Derived from a title hash.* Reproducible, but coupling species to title content means renaming an idea (a Step-2 stretch goal) would silently break the "species never changes" rule. Rejected.
- *Drop the `species` column entirely until Step 2.* Cheap now, expensive later — Step 2 would have to add the column with a migration, contradicting PRD §1.3 ("Adding them now avoids a migration in Step 2"). Rejected.

## R2. Idea identifier format

**Decision**: Use **ULID** (`ulid` npm package) for the `id` column.

**Rationale**:
- ULIDs are lexicographically sortable by creation time, which matches the "newest first" listing requirement (FR-012) without needing a secondary index on `created_at`.
- 26-character canonical form is URL-safe and human-comparable.
- `ulid` package is dependency-free and tiny (no Buffer-shimming gymnastics on Node 22).

**Alternatives considered**:
- *UUID v4.* Fine technically; loses the lexicographic ordering benefit and forces a `created_at DESC` index. Marginally larger surface to explain in the workshop walkthrough. Rejected on aesthetic grounds (the workshop spends two minutes less explaining "why ULID" than it would explaining "why we sort manually").
- *UUID v7.* Combines time-ordering with the UUID format, but adds another package decision and isn't yet conventional in the Node ecosystem. Deferred.
- *Auto-increment integer.* Trivial, but exposes count to the user and is harder to merge across two parallel branches in the workshop comparison. Rejected.

## R3. Creation-form surface — modal vs. inline

**Decision**: Implement the "Plant New Seed" form as a **modal**.

**Rationale**:
- `design.md` explicitly describes the "Plant New Seed" form as a modal under the Modals component, including the centered `rounded.xl` shape, max-width ~560px, and three-way close.
- PRD §F1.2 allows "modal (or inline form)"; the design document is the binding tiebreaker per Constitution Principle IV.
- Modal pairs naturally with the empty-state CTA: clicking "Plant your first seed" opens the same surface that the persistent header button uses.

**Alternatives considered**:
- *Inline form pinned above the grid.* Saves a component, but conflicts with `design.md` and creates layout reflow on the empty state. Rejected.
- *Drawer / side panel.* Overkill for a single-form interaction, and adds animation work that would slip into Step 2's territory. Rejected.

## R4. Package manager

**Decision**: **npm workspaces** at the repository root.

**Rationale**:
- Already on every workshop attendee's machine; no install step before the demo.
- PRD §5 lists "npm or pnpm" as acceptable.
- Workspaces give us `apps/*` and `packages/*` resolution out of the box; no extra tooling.
- The two parallel Step 2 branches diverge only in implementation, not in package management — keeping the toolchain identical removes a confound from the side-by-side comparison.

**Alternatives considered**:
- *pnpm workspaces.* Faster installs and stricter dependency hoisting, but adds a "did you `corepack enable` first?" footgun for the audience. Rejected for workshop ergonomics.
- *Single-package layout (no workspaces).* Forces hand-mirrored types between client and server, violating Constitution Principle I. Rejected.

## R5. Schema / validation library

**Decision**: **Zod** as the single schema library across `packages/shared`, the server (via `fastify-type-provider-zod`), and the client (parses fetch responses through the same Zod schemas before trusting them).

**Rationale**:
- Constitution Principle I requires one source of truth for API request/response shapes; Zod gives us that plus inferred TypeScript types in one library.
- `fastify-type-provider-zod` plugs straight into Fastify and rejects malformed bodies before the handler runs (Principle II: schemas validated at every boundary).
- One mental model for both teams during the workshop comparison.

**Alternatives considered**:
- *Fastify JSON Schema directly.* Idiomatic on the server, but requires a separate type-generation step or hand-mirrored TS types on the client. Rejected for violating "one source of truth."
- *Valibot.* Smaller bundle. Less Fastify ecosystem support. Rejected — no daylight worth the loss in plug-and-play integration.

## R6. Test runner

**Decision**: **Vitest** in all three workspaces. RTL + jsdom for the web side; Fastify's `app.inject(...)` for the server side; plain Vitest for shared schema tests.

**Rationale**:
- One runner, one config style, one CLI invocation (`npm run test` at the workspace root) — keeps the demo simple.
- Vitest is the canonical choice for a Vite project; integration with `@testing-library/react` is a single import.
- Server contract tests via `app.inject` avoid spinning a network listener and let each test build the app against its own ephemeral SQLite file.

**Alternatives considered**:
- *node:test.* Built in, no dependency. But asymmetric with the web-side runner (would need two test outputs, two CLI invocations, two CI parsings). Rejected for the workshop's "one command" pitch.
- *Jest.* Heavier; ESM story is still rougher than Vitest's. Rejected.

## R7. Dev process orchestration

**Decision**: Use **`concurrently`** in the workspace-root `package.json` to fan out `npm run dev --workspace=apps/server` and `npm run dev --workspace=apps/web` from a single `npm run dev` invocation.

**Rationale**:
- Two-line config; no shell quirks to explain.
- Prefixed log output makes it obvious in the terminal which process emitted which line.
- Cross-platform (works identically on macOS and Linux), satisfying SC-008.

**Alternatives considered**:
- *`npm-run-all -p`.* Equivalent. Picked `concurrently` because of its prefixed-log default; no other reason.
- *Hand-rolled shell `&` and `wait`.* Breaks on Windows (out of scope, but would still be a footgun for any attendee on WSL). Rejected.
- *A `dev.sh` script.* Adds a second source of truth for the dev command. Rejected.

## R8. Schema-on-boot vs. migrations

**Decision**: The server runs `CREATE TABLE IF NOT EXISTS ideas (...)` (and the future `idea_updates` table on the SDD branch) on startup, inside `db.ts`. No migration tooling.

**Rationale**:
- PRD §1.4 mandates "schema is created on server boot if it doesn't exist (no migration tooling for Step 1)."
- The schema fits in 12 lines; the workshop can show it without a digression on migration frameworks.
- `IF NOT EXISTS` is idempotent and survives both fresh installs and dev-server restarts.

**Alternatives considered**:
- *`drizzle-kit`, `prisma migrate`, `knex`.* All deferred — Constitution Principle I YAGNI rule applies, and the workshop scope ends well before a second schema change.

## R9. CORS configuration

**Decision**: Register `@fastify/cors` allowing the **Vite dev origin** (`http://localhost:5173`) plus an env-overridable allow-list. No production CORS policy (production hosting is a non-goal).

**Rationale**:
- Vite serves the web bundle on a different port from Fastify; without CORS, fetch calls would fail in dev.
- An env-driven allow-list keeps the door open for a workshop attendee to point the web app at a different server port without editing code.

**Alternatives considered**:
- *Vite proxy to forward `/api` calls to Fastify.* Cleaner in the browser DevTools network tab; loses the "two real apps talking" teaching moment. Rejected for didactic reasons.
- *Allow `*` everywhere.* Marginally simpler. Avoided so reviewers don't internalise it as a default for non-workshop projects.

## R10. Browser-driving capability for the agent

**Decision**: **Playwright MCP** (the constitution's documented default) is the agent's hands during `/speckit-implement`. The implementation plan assumes it is reachable; if it is not, the gap is called out in the PR description per Constitution Principle II.

**Rationale**:
- Constitution Principle II requires browser-driving capability for the agent and names Playwright MCP as the default.
- A real-browser drive is the only honest way to verify the UX acceptance criteria (modal escape behaviour, validation feedback positioning, "card appears immediately").

**Alternatives considered**:
- *Skip and rely solely on RTL.* RTL renders a fake DOM; it cannot verify Tailwind layout, font loading, or real focus-trap behaviour. Rejected.
- *Playwright as a test runner invoked via shell.* Acceptable per the constitution; deferred unless the MCP is unavailable.

## R11. Asset pipeline

**Decision**: Plant sprites are **manually committed PNG files** under `assets/plants/<species>/stage-NN.png`. Step 1 ships the full 16-stage oak sequence (`stage-01.png` … `stage-16.png`); only `stage-01` is rendered in Step 1, but committing all 16 lets future stage-progression work land without an asset round-trip. The web app references them via Vite's `publicDir` (project-root `assets/`), no build pipeline.

**Rationale**:
- PRD §6 / §2.6: asset pipeline is manual for the workshop.
- Avoids a sprite-builder dependency that would dilute the workshop's signal.
- Shipping all 16 frames now (rather than just stage-01) is free — they exist as a single source-of-truth grid — and removes a "remember to add the rest" follow-up.

**Alternatives considered**:
- *SVG-only seed.* Acceptable as a temporary placeholder; superseded once real PNG artwork was provided. Doesn't change the data model.
- *3D model for stage-01.* Out of scope; species-specific 3D belongs to a possible Step-2 stretch.

## R12. ID generation library

**Decision**: Use the **`ulid`** npm package on the server.

**Rationale**:
- Tiny (kilobytes), zero dependencies on modern Node.
- Works in both Node and the browser if we ever need to mint client-side IDs (we don't, in Step 1).

**Alternatives considered**:
- *`crypto.randomUUID()`* (built into Node). Already there; gives UUIDv4. Loses ULID's sort-by-creation property (see R2). Rejected.
- *Hand-rolled timestamp + random suffix.* "Three lines is better than a premature helper" cuts the other way here — the package is a single import and is read once during the workshop walkthrough. Rejected.

## R13. Tailwind major version

**Decision**: Pin **`tailwindcss@^3`** for Step 1.

**Rationale**:
- The `tailwind.config.ts` token-mapping pattern in plan.md and tasks.md (extending `theme.colors`, `theme.fontSize`, `theme.spacing`, `theme.borderRadius`) is the **v3** authoring model.
- Tailwind v4 ships a CSS-first `@theme` configuration approach that is incompatible with the v3 config layout. Picking v4 would require rewriting the design-token wiring; that's a real choice, not a free upgrade.
- v3 is mature, the docs are stable, and every workshop attendee's existing Tailwind muscle memory works.
- Step 2 has no Tailwind requirements that v3 cannot meet.

**Alternatives considered**:
- *`tailwindcss@^4`*. Worth considering for greener-field projects, but pulls in a new mental model the workshop hasn't introduced. Deferred.

## Summary — open items at the end of Phase 0

**None.** Every NEEDS CLARIFICATION raised by the technical context has a concrete decision above. The plan can proceed to Phase 1 without further input from the user.

The four open questions in [PRD §7](../../.specify/memory/PRD.md#7-open-questions) that touch Step 2 (animation library, empty-note updates, stage-16 cap visibility, and the species-from-hash alternative) are deliberately left for the SDD branch's `/speckit-clarify` round.
