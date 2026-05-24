# SDD Workshop: Build the Growth Loop

**Idea Garden** is a small web app where every idea you capture grows like a plant — the more you come back to it, the more it flourishes. It's also the codebase you'll use today to learn **Spec-Driven Development (SDD)**: a structured workflow for working with AI coding agents that produces better results, fewer surprises, and code you'd actually want to maintain.

This workshop is 90 minutes. By the end, you'll have run the full SDD loop on a real feature, experienced what each phase produces, and — if time allows — seen the code generated from your spec.

---

## What Is This Project?

The app is called **Idea Garden**. The foundation (Step 1) is already built and lives on `master`: you can create ideas, they appear as plant cards in a grid, and everything persists across reloads.

**Your job today** is to build Step 2 — the **Growth Loop** — using the SDD workflow:

> A user clicks an idea card. A modal opens showing the idea's full history of updates. The user adds a new update ("watered the idea"), a Three.js animation plays, and the plant visually advances to its next stage.

The same feature also lives on two reference branches showing contrasting approaches:

| Branch | What it shows |
|---|---|
| `002-vibe-coded-implementation` | What you get when you describe the feature in a single high-level prompt and accept what comes back |
| `003-growth-loop` | The full SDD version — **one commit per step in the loop** — so every phase is readable in git history |

At the end of the session, look at both. The difference is the point.

---

## Why SDD Instead of Vibe Coding?

If you've used an AI coding assistant for more than a week, you've hit this: you describe what you want, the agent writes code, the code looks plausible — and then you realize it solved a subtly different problem. You go back and forth, the context window fills up, and by the time you get to something workable you've spent twice as long as you planned. The output is hard to review and harder to explain.

That experience has a structural explanation: **AI agents don't ask for clarification — they resolve ambiguity silently using patterns from their training data, not constraints from your system.** And unlike a human developer who might pause and ask "wait, what exactly do you mean here?", an agent keeps going with full confidence. The faster and more fluently it writes, the bigger the blast radius of any misalignment you left in the prompt.

This isn't a problem you solve by getting better at prompting. It's a problem you solve by removing ambiguity *before* the agent starts coding. That's what Spec-Driven Development is.

**Writing a spec is not documentation work. It's thinking work.** The moment you sit down and try to write "what does done look like for this feature?", you discover things you hadn't consciously considered — edge cases, constraints, questions that need answers from a teammate or product manager. Every ambiguity you resolve in the spec is a decision the agent can no longer get wrong. The spec is also how you know *when to stop*: without acceptance criteria, you're always one more "make it a bit better" prompt away from being done.

The economics are straightforwardly favorable. A spec that takes 20–30 minutes to write typically prevents a correction cycle that takes 2+ hours — misalignment discovered late, the back-and-forth of diagnosing what went wrong, re-explaining the intent, reviewing new output. And unlike a prompt, the spec stays in the repo: it serves the next feature, the next engineer, the next AI session that touches that code. You pay the cost once; you collect the benefit every time.

**The SDD loop has four core phases**, each producing a durable artifact:

| Phase | Command | Artifact produced |
|---|---|---|
| **Specify** | `/speckit-specify` | `spec.md` — the *what*: goal, constraints, acceptance criteria |
| **Plan** | `/speckit-plan` | `plan.md` — the *how*: technical approach, trade-offs, sequencing |
| **Tasks** | `/speckit-tasks` | `tasks.md` — dependency-ordered checklist with explicit done checks |
| **Implement** | `/speckit-implement` | Code — guided by the spec, plan, and task list |

Human review happens at the seams between phases, not inside them. Catching a misalignment in the spec costs 5 minutes. Catching it in code review costs an hour. Catching it in production costs more.

---

## What We'll Build Today

The feature you'll specify and implement is called the **Growth Loop**. Here's the full description — this is also the prompt you'll paste into `/speckit-specify` in Step 2:

> *Clicking an idea card opens a detail modal. The modal shows the idea's title, description, current plant image at its current stage, a level indicator, and a chronological timeline of all past "waterings" (newest first). Each timeline entry shows the update note and a relative timestamp. If no waterings exist yet, the timeline shows an empty state. The modal is closeable via an X button, the Escape key, or clicking the backdrop.*
>
> *From the modal, the user can water the idea by submitting an update note (required, non-empty). On submit, the app waits for the server response, then plays a Three.js growth animation — a particle burst / level-unlock effect — after which the plant image swaps to the next stage and the level indicator updates. Each watering increments the stage by 1, capped at 16. An idea already at stage 16 can still be watered: the animation plays a "bloom" celebration variant, but the image and stage stay at 16. The user can also edit the idea's title and description from the modal (inline edit mode, decoupled from the growth system — saving an edit does not advance the stage or trigger an animation). Individual past updates can be deleted from the timeline. The idea itself can be deleted entirely, which closes the modal and removes the card from the grid.*
>
> *Two special transitions trigger a page-wide confetti burst: the first watering on a brand-new idea (Level 1 → 2), and the watering that takes an idea to full bloom (Level 15 → 16). All other intermediate waterings play the growth animation alone, with no confetti. The bloom confetti uses a larger, more festive palette; the first-watering confetti is smaller and uses green and gold. Implement the confetti as an in-house canvas component — no third-party confetti library.*

The `master` branch already has everything this feature builds on: a working React + Vite frontend, a Fastify server, a SQLite database, and a project constitution that captures the tech stack, design rules, and quality standards the agent must follow.

---

## Your Reference Branches

If at any point you get stuck — commands fail, the output looks wrong, or you just want to see what a finished phase looks like — these branches are your safety net:

### `002-vibe-coded-implementation`
The vibe-coded version. One or two informal prompts, then accepting whatever the AI produced. Look at the git log, the test coverage (or lack of it), and what happens when you try the edge cases.

### `003-growth-loop`
The SDD version. **Each commit maps to exactly one main step in the loop** — spec, plan, tasks, implement. If you're stuck on a step, you can check out its tag and start from there. It's also the reference for what a well-executed output looks like at each phase.

Each step is tagged so you can jump straight to any phase:

| Tag | What it contains |
|---|---|
| `step-2-specify` | After `/speckit-specify` — `spec.md` written |
| `step-3-plan` | After `/speckit-plan` — `plan.md` written |
| `step-4-tasks` | After `/speckit-tasks` — `tasks.md` written |
| `step-5-implement` | After `/speckit-implement` — full implementation |

```bash
# See the SDD loop told in git history
git log --oneline origin/003-growth-loop

# Jump to any phase directly
git checkout step-2-specify
git checkout step-3-plan
git checkout step-4-tasks
git checkout step-5-implement
```

### Your working branch
SpecKit auto-creates this when you run `/speckit-specify`. The name will look something like `002-growth-loop` — SpecKit increments the number from the highest existing spec directory on `master` (currently just `001-foundation-homepage`), and the slug after the number is chosen by the agent based on your feature description. The exact name you see may differ slightly, and that's fine. This is where your own SDD work lands.

---

## Your Toolkit: SpecKit

**[SpecKit](https://github.com/github/spec-kit)** is a set of AI agent skills that package the SDD workflow into slash commands. Each command is a carefully crafted meta-prompt that tells your AI assistant exactly how to produce the next artifact — reading the codebase for context, applying reasonable defaults, and writing structured output to the right file.

You'll use these four commands today:

```
/speckit-specify    →  generates spec.md
/speckit-plan       →  generates plan.md
/speckit-tasks      →  generates tasks.md
/speckit-implement  →  writes the code
```

SpecKit works with any AI assistant that supports slash commands: Claude Code, Copilot, Cursor, Windsurf, or similar. Installing it is an interactive step — the SpecKit CLI asks which coding agent you're using and wires the slash commands into the right place for that tool. See **Step 0** below for the install commands.

---

## Additional Tools in This Repo

Beyond SpecKit, the workshop environment includes two categories of extra tooling that the AI agent can use during implementation.

### Playwright MCP Server

A [Playwright](https://playwright.dev/) MCP server is configured in this project. When active, it lets the AI agent:

- **Navigate and interact** with the running app at `localhost:5173` without you having to describe what's on screen
- **Take screenshots** so the agent can see the current UI state and catch visual regressions after its own changes
- **Assert UI behavior** end-to-end — filling forms, clicking buttons, checking that animations complete — rather than relying purely on unit tests

This is particularly useful during `/speckit-implement`: instead of trusting that "the code looks right", the agent can open the browser, exercise the feature, and confirm the acceptance criteria are met visually.

### Agent Skills

The environment also ships with two skill packs the agent can call as slash commands:

| Skill | What it does |
|---|---|
| **`threejs-*` skills** | A skill pack for Three.js work — geometry, shaders, lighting, animation, post-processing, loaders, and interaction. When the agent needs to write or refine the growth animation, these skills provide deep Three.js context so the output follows best practices rather than pattern-matched guesses. |
| **`frontend-design`** | An Anthropic-authored skill for UI and frontend design decisions — layout, spacing, component structure, accessibility, and visual polish. Useful when you want the agent to reason carefully about how something should look and feel, not just whether it compiles. |

These skills are **not bundled in the repo** — pre-installing them for a specific agent would break the workshop for anyone using a different tool. You install them yourself in Step 0, and the installer asks which coding agent to target. Once installed, the agent will invoke them automatically when it recognises a matching task.

---

## Running the App

Before diving into the SDD loop, take a minute to see what you're building on top of.

```bash
# From the repo root
npm install          # install all workspaces (if not already done)
npm run dev          # starts server (port 4123) + frontend (port 5173)
```

Open [http://localhost:5173](http://localhost:5173). You should see the Idea Garden with a grid of cards (or an empty-state CTA if the database is fresh).

**To reset to a clean state at any point:**
```bash
npm run clean   # deletes data/garden.db; the server recreates the schema on next boot
```

> The server uses Node 22+ with `--experimental-strip-types` (no build step). If startup fails, check your Node version: `node --version` — it must be 22.6 or higher.

---

## Step-by-Step: The SDD Loop

> **Session hygiene**: between major steps, start a **fresh AI assistant session**. This keeps context windows clean, reduces cost, and avoids the model getting confused by accumulated back-and-forth. The instruction to do this is marked with a 🔄 throughout.

---

### Step 0: Prerequisites

Before starting, confirm you have:

- [ ] **Node.js 22.6 or newer** (`node --version`). The server uses `--experimental-strip-types` to run TypeScript without a build step, which requires Node 22.6+. Anything older will fail to boot.
- [ ] Repo cloned locally
- [ ] `npm install` run from the repo root
- [ ] Your AI assistant of choice running (Claude Code, Copilot, Cursor, Windsurf, etc.)
- [ ] `npm run dev` works and the app opens at localhost:5173

> **Using nvm?** The repo ships an [`.nvmrc`](.nvmrc) pinned to `lts/*`, so from the repo root you can just run `nvm use` (or `nvm install` if you don't have an LTS version yet) to land on a compatible Node — the current LTS comfortably satisfies the 22.6+ requirement.

Then install the two pieces of tooling the workshop relies on. Both installers are **interactive** and will ask which coding agent you're using — pick the one you'll be working with for the session.

**1. Install SpecKit**

Before installing, **check that SpecKit supports your AI agent** — see the official compatibility matrix at [github.github.io/spec-kit/reference/integrations.html](https://github.github.io/spec-kit/reference/integrations.html). If your agent isn't on the list, you'll need to switch to a supported one for the workshop.

SpecKit is distributed as a Python CLI installed via [`uv`](https://docs.astral.sh/uv/). You'll need `uv` (and the Python toolchain it manages) available on your machine — see the [uv install guide](https://docs.astral.sh/uv/getting-started/installation/) if you don't have it yet.

Then install the `specify` CLI and initialise it inside this repo:

```bash
# Install the CLI globally as a uv tool
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.8.13

# From the repo root, wire SpecKit into this project
specify init .
```

`specify init` is interactive — it asks which coding agent you're using and drops the `/speckit-*` slash commands into the right place for that tool. Full docs: [github.com/github/spec-kit](https://github.com/github/spec-kit).

**2. Install the agent skills**

The workshop also uses the `threejs-*` skill pack and Anthropic's `frontend-design` skill (see [Agent Skills](#agent-skills) below for what they do). They're **not pre-installed in this repo** because pre-installing them would bind the workshop to one specific agent.

```bash
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/cloudai-x/threejs-skills
```

When the installer asks which coding agent to configure, pick the same one you chose for SpecKit.

> **Why install instead of bundle?** Different agents read skills from different places (`.claude/skills`, Cursor rules, Copilot instructions, etc.). A pre-committed `.claude/` folder would silently do nothing for anyone using Cursor, and vice versa. Letting each participant install for their own agent keeps the workshop tool-agnostic.

---

### Step 1: Start From `master`

Make sure you're on `master` — this has the baseline app plus the project constitution, PRD, and design system that the AI will use as context throughout.

```bash
git checkout master
git pull origin master          # make sure you have the latest
```

> **Don't create a branch manually.** `/speckit-specify` will automatically create a feature branch for you (via a `before_specify` hook).

---

### Step 2: Specify — Generate `spec.md`

🔄 **Start a fresh AI session for this step.**

This is where you write the spec. `/speckit-specify` takes your feature description, makes informed guesses for anything unspecified, and writes `spec.md` directly — no upfront interview. If it hits something genuinely ambiguous with no reasonable default, it may pause and ask you up to 3 targeted clarifying questions (presented as a structured table with options); most of the time with a detailed description like the one below, it writes the spec without stopping.

**Paste this into your AI assistant:**

```
/speckit-specify Clicking an idea card opens a detail modal. The modal shows the idea's title, description, current plant image at its current stage, a level indicator, and a chronological timeline of all past "waterings" (newest first). Each timeline entry shows the update note and a relative timestamp. If no waterings exist yet, the timeline shows an empty state. The modal is closeable via an X button, the Escape key, or clicking the backdrop.

From the modal, the user can water the idea by submitting an update note (required, non-empty). On submit, the app waits for the server response, then plays a Three.js growth animation — a particle burst / level-unlock effect — after which the plant image swaps to the next stage and the level indicator updates. Each watering increments the stage by 1, capped at 16. An idea already at stage 16 can still be watered: the animation plays a "bloom" celebration variant, but the image and stage stay at 16. The user can also edit the idea's title and description from the modal (inline edit mode, decoupled from the growth system — saving an edit does not advance the stage or trigger an animation). Individual past updates can be deleted from the timeline. The idea itself can be deleted entirely, which closes the modal and removes the card from the grid.

Two special transitions trigger a page-wide confetti burst: the first watering on a brand-new idea (Level 1 → 2), and the watering that takes an idea to full bloom (Level 15 → 16). All other intermediate waterings play the growth animation alone, with no confetti. The bloom confetti uses a larger, more festive palette; the first-watering confetti is smaller and uses green and gold. Implement the confetti as an in-house canvas component — no third-party confetti library.
```

**What to expect**: The AI generates the spec immediately. It will write the spec to something like `specs/002-growth-loop/spec.md` — SpecKit auto-increments the number from existing directories on `master` (currently just `001-foundation-homepage`), and the agent picks the slug from your feature description. The exact folder name you end up with may differ; look in `specs/` to see what was actually created.

**What a good spec.md contains:**
- User scenarios with acceptance criteria (organized by priority)
- Functional requirements — testable, no implementation details
- Success criteria — measurable, user-facing outcomes
- Assumptions and explicit non-goals

**If the command doesn't run**: Check that SpecKit is installed correctly for your AI Assistant of choice.

> [!IMPORTANT]
> ### 🛑 Mandatory review before continuing
>
> **Open `spec.md` and read it in full.** This is the only phase where you can catch a misalignment for free — before any code or technical decisions exist. Ask yourself:
> - Does the goal statement match your intent?
> - Are the acceptance criteria testable and unambiguous?
> - Are the non-goals explicit? Is anything missing from scope?
>
> **If something is wrong or incomplete**, fix it now. You have two options:
> - **Edit the file directly** — `spec.md` is plain text; change it yourself.
> - **Prompt the agent** — stay in the same session and ask it to revise a specific section: *"The acceptance criteria for watering a stage-16 idea are missing — add them."*
>
> Do not move to Step 3 until you're satisfied with the spec. Everything downstream is built on it.

---

🔄 **Start a fresh AI session before Step 3.**

---

### Step 3: Plan — Generate `plan.md`

```
/speckit-plan
```

> **How the agent knows which spec to use**: when `/speckit-specify` ran, it wrote the active feature path to `.specify/feature.json`. Every subsequent command (`/speckit-plan`, `/speckit-tasks`, `/speckit-implement`) reads that file automatically — you don't need to pass the spec path. If for any reason auto-detection fails, the fallback is your branch name prefix (e.g. `002-growth-loop` → `specs/002-growth-loop/`).

The agent reads `spec.md` and explores the existing codebase — file structure, existing endpoints, shared types, test setup — then produces a technical plan: which files to change, which patterns to follow, what trade-offs were considered, and in what order to implement things.

**What to expect**: A `plan.md` file covering:
- Technical approach (data model changes, new endpoints, new components)
- Trade-off decisions (why one approach over another)
- Files affected
- Sequencing (what must happen before what)

**If the plan references files that don't exist**: That's a sign the agent misread the codebase. Point it to the correct structure in the same session: *"The server entry is at apps/server/src/index.ts, not src/server.ts."*

> [!IMPORTANT]
> ### 🛑 Mandatory review before continuing
>
> **Open `plan.md` and read it before moving on.** This is still words on a page — the cheapest correction point after the spec. Ask yourself:
> - Does it respect the existing tech stack? (React, Fastify, SQLite, Zod — no new infrastructure)
> - Does the sequencing make sense? (Database changes before endpoints before frontend)
> - Are there missing pieces? (A new endpoint with no corresponding frontend component?)
>
> **If something is wrong**, fix it now:
> - **Edit the file directly** — rewrite the affected section yourself.
> - **Prompt the agent** — ask it to revise in the same session: *"The plan adds a new library for animations but the constitution says no new dependencies without approval — remove it."*
>
> Do not move to Step 4 until the plan reflects what you actually want built.

---

🔄 **Start a fresh AI session before Step 4.**

---

### Step 4: Tasks — Generate `tasks.md`

```
/speckit-tasks
```

The agent breaks the plan into individually executable, independently verifiable tasks. Each task has an explicit **done check** — a concrete, testable condition that tells you (and the agent) when it's complete.

**What to expect**: A `tasks.md` organized as: **Setup → Foundational → one phase per user story (P1, P2, P3...) → Polish**. Each task is small enough to implement in one pass, with a done check that references a specific test or observable behavior.

**If tasks seem too large or vague**: Ask the agent in the same session to split a specific task or to make a done check more concrete.

> [!IMPORTANT]
> ### 🛑 Mandatory review before continuing
>
> **Read through `tasks.md` before handing it to the implementation agent.** Once `/speckit-implement` starts, it will follow these tasks literally. Ask yourself:
> - Are there "mega-tasks"? If a done check uses the word "and" three or more times, the task should be split.
> - Does the ordering reflect real dependencies? (You can't write a frontend form for an endpoint that doesn't exist yet.)
> - Is every done check concrete and testable — something you could verify yourself?
>
> **If something is wrong**, fix it now:
> - **Edit the file directly** — rewrite or split the task yourself.
> - **Prompt the agent** — ask it to revise in the same session: *"Task 3 is too large — split it into separate subtasks for the API endpoint and the frontend component."*
>
> This is the last gate before code gets written. A vague task produces vague code.

---

🔄 **Start a fresh AI session before Step 5.**

---

### Step 5: Implement — `speckit-implement`

```
/speckit-implement
```

The agent reads spec, plan, and tasks — then writes the code. It works task by task, checking off each done check as it goes.

**What to expect**: File edits landing one task at a time. The agent runs the type-checker and any relevant tests after each change and iterates if something fails.

**This step can take a while.** For a feature this size (new endpoints, new React components, tests, a Three.js animation), expect 15–30 minutes of agent time if it runs cleanly. In a 90-minute workshop, start this step at the 60-minute mark at the latest.

**What to watch for**:
- The agent marking tasks complete in `tasks.md` as it goes (`- [ ]` → `- [x]`)
- Tests passing after each phase
- Any stop condition the agent hits (it will tell you when it needs input)

**If the agent gets stuck in a loop on the same failing test**: Interrupt it. Read the error message yourself and point it to the right fix — often it's a missing import, a wrong file path, or a test assertion that needs updating.

**If you run out of time**: That's fine. Check out the finished implementation tag to see what a complete run looks like. The value of the workshop isn't finishing — it's experiencing the loop up to this point.

```bash
# See the finished SDD implementation
git checkout step-5-implement
```


## Troubleshooting

**`npm run dev` fails**
- Check Node version: `node --version` — must be 22.6+
- Try `npm install` from the repo root if `node_modules` is missing or stale
- Port conflicts: Fastify defaults to 4123, Vite to 5173. If either is already taken, override with env vars instead of killing whatever else is running:
  ```
  PORT=4124 VITE_API_BASE_URL=http://localhost:4124 npm run dev
  ```

**SpecKit commands not found**
- Verify SpecKit is installed: run `/help` in your AI assistant and look for speckit commands in the list
- If using Claude Code: check that the SpecKit skill set is present in `.claude/` or your global skills directory
- If using another tool: follow the SpecKit installation guide at [github.com/github/spec-kit](https://github.com/github/spec-kit)

**The AI generates a spec/plan that seems off or incomplete**
- Don't accept and move on — stay in the session and ask for revisions
- If the output is very wrong, try re-running the command with more context: add a sentence or two about what the existing code already handles
- Check that `master` has `.specify/memory/constitution.md`, `PRD.md`, and `design.md` — SpecKit relies on these for context

**`/speckit-implement` gets stuck or loops**
- Interrupt the agent (Ctrl-C or your tool's stop gesture)
- Read the error message and give the agent a specific nudge: *"The failing test is in apps/server — the endpoint returns 200 but the test expects 201"*
- If a task has been failing for 3+ iterations, check out the equivalent commit on `003-sdd-growth-feature` to see how it was resolved there

**The app shows a blank screen or network errors**
- Make sure both server and frontend are running (`npm run dev` starts both)
- Check the server logs in the terminal — Fastify prints startup errors clearly
- If the database is in a bad state: run `npm run clean` and restart

---

## Quick Reference

```bash
# 1. Setup (branch is auto-created by /speckit-specify)
git checkout master && git pull origin master

# 2. Run the app
npm run dev          # http://localhost:5173

# 3. The SDD loop (one fresh session per step)
/speckit-specify <prompt>
/speckit-plan
/speckit-tasks
/speckit-implement

# 4. Reset database
npm run clean

# 5. See the SDD reference steps
git checkout step-2-specify     # after specify
git checkout step-3-plan        # after plan
git checkout step-4-tasks       # after tasks
git checkout step-5-implement   # finished implementation

# 6. See the vibe-coded reference
git checkout origin/002-vibe-coded-implementation -- .
```

---

*We'll be in the room. If something's broken or unclear, just ask.*
