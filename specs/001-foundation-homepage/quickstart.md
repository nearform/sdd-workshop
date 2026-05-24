# Quickstart — Foundation & Homepage

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Date**: 2026-05-09

This document is the developer-facing companion to the spec. It explains how to run the Step 1 baseline locally, how the workspace is laid out, and how to **manually verify** the acceptance criteria that aren't covered by the automated test suite.

## Prerequisites

- **Node.js 22.6 or newer.** Run `node --version` and confirm. The server uses `--experimental-strip-types`, which requires Node 22.6+.
- **npm 10+.** Ships with Node 22.
- **macOS or Linux.** Windows is out of scope (PRD §2 non-goals).

No global packages are required.

## First-time setup

From a fresh clone:

```sh
npm install
```

This installs every workspace's dependencies through npm workspaces. It also compiles `better-sqlite3`'s native module — that's the slow part of the install on a cold machine.

## Run the app

```sh
npm run dev
```

That single command starts:
- the **Fastify server** on `http://localhost:3000` (via `node --experimental-strip-types apps/server/src/index.ts`), and
- the **Vite dev server** on `http://localhost:5173`.

Both processes' logs are streamed to your terminal, prefixed by their workspace name. Stop them with `Ctrl+C`.

Open `http://localhost:5173` in a browser. On a fresh database you'll land on the empty state described in spec [User Story 1](./spec.md#user-story-1---first-time-user-plants-their-first-seed-priority-p1).

## Run the tests

```sh
npm test
```

Runs every workspace's Vitest suite. Targeted runs:

```sh
npm test --workspace=packages/shared    # schema round-trip tests
npm test --workspace=apps/server        # API contract tests via Fastify inject
npm test --workspace=apps/web           # React component tests via RTL + jsdom
```

Watch mode is `npm test -- --watch` in any of those.

## Workspace layout

```text
sdd-workshop/
├── package.json          # workspace root: dev/test scripts, npm workspaces
├── tsconfig.base.json    # strict TS, ES2023, moduleResolution bundler
├── data/garden.db        # SQLite — created on server boot, gitignored
├── assets/plants/        # plant sprites, one folder per species, stage-NN.png inside
├── apps/
│   ├── web/              # Vite + React + TS + Tailwind
│   └── server/           # Fastify + TS, no build step
└── packages/
    └── shared/           # Zod schemas — single source of truth for API shapes
```

See [plan.md → Project Structure](./plan.md#project-structure) for the file-level breakdown.

## Reset the database

The data file lives at `data/garden.db` and is gitignored. To reset:

```sh
rm data/garden.db
```

The next time the server boots it will recreate the file and the schema. There is no migration tooling — the schema is created on first boot via `CREATE TABLE IF NOT EXISTS`.

## Configuration

Environment variables (with defaults):

| Var            | Default                  | Purpose                                               |
|----------------|--------------------------|-------------------------------------------------------|
| `PORT`         | `3000`                   | Fastify listen port.                                  |
| `HOST`         | `127.0.0.1`              | Fastify listen host.                                  |
| `DB_PATH`      | `data/garden.db`         | SQLite file path (relative to repo root).             |
| `CORS_ORIGIN`  | `http://localhost:5173`  | Allowed CORS origin for the dev web app.              |

The web app reads `VITE_API_BASE_URL` (default `http://localhost:3000`) for fetch targets.

## Manual verification — acceptance criteria

The Vitest suites cover most of the spec's acceptance scenarios in isolation. The following checks are **end-to-end**, exercising the running app in a browser. The `/speckit.implement` step runs them via Playwright MCP; this list mirrors what a human reviewer would walk through.

### From PRD §1.6 / spec.md

1. **Single dev command.** `npm run dev` starts both server and web; the terminal prints two URLs and the web URL is reachable in the browser.
2. **Empty state on a fresh DB.** With `data/garden.db` deleted, run the app and confirm the homepage shows the illustrated empty state with the "Plant your first seed" CTA.
3. **Plant New Seed → card visible immediately.** Click the header's "Plant New Seed" button, enter a title (e.g., "Build an idea garden"), submit, and confirm the modal closes and a card with that title appears at the top of the grid.
4. **Persistence on reload.** With at least one card visible, hit refresh; the card is still there, with its plant illustration and timestamp updated to "just now" / "1m ago".
5. **Title-only idea is valid.** Open the modal, enter a title, leave the description blank, submit; the card renders without a description body.
6. **Empty-title validation.** Open the modal, leave the title empty, submit; the modal stays open and a validation message renders inline beside the title field. No card is created.

### From spec.md edge cases

7. **Title boundaries.** Enter exactly 80 characters in the title — accepted. Enter 81 — rejected inline.
8. **Description boundaries.** Enter exactly 500 characters in the description — accepted, truncated to 2 lines in the card. Enter 501 — rejected inline.
9. **Whitespace-only title.** Enter `"   "` — rejected inline.
10. **Three-way modal close.** Open the modal, press `Esc` — modal closes, no idea created. Open again, click the X — same. Open again, click the backdrop — same.
11. **Server unreachable on submit.** Stop the server (`Ctrl+C` only the Fastify process), open the modal, submit a valid idea — the modal stays open, the user's input remains, and a visible error message appears in the form area. No silent failure.
12. **Server unreachable on initial load.** Stop the server, refresh the page — a visible error message appears in the grid area. The page does **not** show the empty state (which would falsely imply the garden is empty).
13. **Many ideas (~200).** Use the API directly (or repeat step 3) to create ~200 ideas; reload; the grid renders without layout breakage and the initial render completes in under 1 second.
14. **Responsive grid.** Resize the browser window from full-width to ~250px; the grid reflows from many columns down to one without manual breakpoint tuning.
15. **Double-click "Plant New Seed".** Click the submit button twice in rapid succession; only one idea is created (the submit control is disabled after the first click until the response arrives).
16. **Cross-platform.** Run steps 1–4 on macOS and on Linux; behavior is identical with no platform-specific manual steps.

### Reset between checks

If you want a known-good state between runs:
```sh
rm data/garden.db && npm run dev
```

## Mapping to the spec

- Steps 1–6 cover [PRD §1.6 acceptance criteria](../../.specify/memory/PRD.md#16-acceptance-criteria) verbatim.
- Steps 7–16 cover the edge cases in [spec.md → Edge Cases](./spec.md#edge-cases).
- Steps 1, 4, 11, 12, 16 are the four scenarios that must be human-verified during the workshop demo (the rest have automated equivalents).

## Troubleshooting

- **`better-sqlite3` install fails.** You're probably on Node < 22.6 or are missing a C++ toolchain. Install Xcode CLT on macOS (`xcode-select --install`) or `build-essential` on Debian/Ubuntu, then `npm rebuild better-sqlite3`.
- **CORS errors in the browser DevTools console.** The server's `CORS_ORIGIN` doesn't match the Vite origin. Restart the server with `CORS_ORIGIN=http://localhost:5173 npm run dev`, or update the env default in `apps/server/src/app.ts`.
- **Empty state shows but ideas aren't persisting on reload.** You may have two server instances racing on the same DB file. Confirm only one Fastify process is listening on port 3000 (`lsof -i :3000`).
- **Curl can't reach `http://127.0.0.1:5173` even though the browser works.** Vite binds to `localhost`, which Node 17+ may resolve to `::1` (IPv6) ahead of `127.0.0.1`. Use `http://localhost:5173/` for parity with what the browser sees.
- **Browser shows "We couldn't load your garden: Failed to fetch."** Port 3000 is held by another process (very commonly a Next.js dev server). The Fastify server binds to the IPv6 dual-stack wildcard `::` so this surfaces as `EADDRINUSE: address already in use :::3000` in the terminal. Either free the port (`lsof -i :3000` to find the offender) or override the port for both apps:
  ```sh
  PORT=3030 VITE_API_BASE_URL=http://localhost:3030 npm run dev
  ```
  The `dev` script forwards `PORT` to the server and `VITE_API_BASE_URL` to the web client; both must change together so the browser hits the new server URL.

## Implementation notes (Step 1)

These are pragmatic deviations from the strict letter of `tasks.md` that do not affect the constitution's binding requirements. Calling them out so reviewers don't re-litigate:

- **Inter typography is loaded from Google Fonts CDN** in `apps/web/index.html`, not from self-hosted woff2 files under `apps/web/public/fonts/`. Constitution Principle IV requires Inter at the documented sizes — both delivery mechanisms satisfy that. Self-hosting is a future hardening step, not a Step 1 blocker.
- **Plant artwork is the full 16-stage oak PNG sprite sequence** at `assets/plants/oak/stage-01.png` … `stage-16.png` (isometric pixel-art, acorn → mature tree), served by Vite's `publicDir` pointed at the project-root `assets/` folder. The Step 1 species allowlist is exactly `['oak']` (research.md R1, data-model.md). The empty-garden illustration and every Step 1 idea card both render `stage-01.png` (the freshly planted acorn).
- **Vite's `publicDir` is overridden** to `path.resolve(__dirname, '../../assets')` so plant sprites stay in their canonical PRD location instead of being duplicated under `apps/web/public/`. URLs are `/plants/<species>/stage-NN.png`.
