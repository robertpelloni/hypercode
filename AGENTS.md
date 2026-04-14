<<<<<<< HEAD
# AGENTS — Borg Contributor & Agent Guide

**Mandatory reading first:** `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`

## Core rule

Borg is in a **stabilization-first** phase. Default work should improve reliability, truthfulness, type safety, observability, and operator usefulness. Do not expand scope unless explicitly requested or directly required to fix a real blocker.

## Working principle

Build the future **through convergence, not chaos**.

The project has ambitious long-range ideas, but current contributions should strengthen the operator-facing core:
- MCP control plane quality
- provider routing correctness
- session supervision usability
- memory and context continuity
- observability and diagnostics

## Priority order

1. Fix broken or misleading behavior
2. Improve runtime stability
3. Improve dashboard truthfulness
4. Improve MCP, session, provider, and memory usability
5. Reduce documentation drift
6. Add narrowly justified features only if explicitly requested

## Read before making changes

Review these files before editing code or docs:
- `README.md`
- `VISION.md`
- `ROADMAP.md`
- `TODO.md`
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`

If docs and code disagree, prefer reality and update the docs.

## Scope control

### Allowed by default
- bug fixes
- type and test hardening
- observability improvements
- docs accuracy improvements
- UX clarity improvements on existing surfaces

### Requires explicit approval
- new dashboard areas
- new routers or services without a blocking need
- speculative platform expansion
- broad architectural rewrites

## Truthfulness policy

Every major feature or surface should be described as one of:
- **Stable**
- **Beta**
- **Experimental**
- **Vision**

Do not present scaffolding, mocks, or partial integrations as complete.

## What good contributions look like

- tighten an existing workflow
- fix runtime or type errors
- improve first-run or recovery UX
- make status reporting more truthful
- reduce misleading documentation
- improve test coverage around real failure modes

## What to avoid by default

- shipping new conceptual layers just to feel ambitious
- adding new operator surfaces that are not fully wired
- overstating implementation maturity
- letting documentation outrun the code
- hiding unstable behavior behind confident language

## Repo-specific rules

- Use **pnpm v10**.
- In `apps/web`, import shared components from `@borg/ui`.
- After backend changes in `packages/core`, verify relevant type and build flows.
- Prefer type-safe fixes over escape hatches.
- Treat extension bridges, tool execution, and config ingestion as high-risk surfaces.

## Recommended binary topology

Treat the long-term borg runtime as a **small family of focused binaries**, not one giant process and not a fully exploded microservice graph.

### Core naming

- `borg` — operator CLI
- `borgd` — primary control-plane daemon
- `borg-web` — web GUI client
- `borg-native` — native GUI client
- `hyperharness` — harness CLI
- `hyperharnessd` — harness runtime daemon
- `hypermcpd` — MCP router / aggregator daemon
- `hypermcp-indexer` — MCP scrape / probe / metadata worker
- `hypermemd` — long-running memory/session/resource daemon
- `hyperingest` — batch/session/bookmark/import worker

### Ownership boundaries

- **Servers/daemons own state** and long-running coordination.
- **CLIs and GUIs are clients** of those servers, not alternate places to duplicate orchestration logic.
- **Workers own batch or background jobs**, not interactive operator flows.

### Responsibility map

- `borgd`
  - owns top-level orchestration, operator state, routing policy, supervision, and system health/status surfaces
- `borg`
  - is the operator-facing CLI that talks to `borgd`
- `borg-web` and `borg-native`
  - are GUI clients for the same control-plane APIs and should not become independent orchestration backends
- `hyperharnessd`
  - owns model execution loops, tool-call execution flow, harness-local session runtime, and harness isolation concerns
- `hyperharness`
  - is the direct CLI/operator entrypoint for harness-specific tasks when a narrower surface than `borg` is useful
- `hypermcpd`
  - owns MCP server registry, routing, connection lifecycle, tool inventory exposure, and runtime tool mediation
- `hypermcp-indexer`
  - owns MCP scraping, probing, metadata caching, schema capture, and offline inventory refresh jobs
- `hypermemd`
  - owns long-running memory state, session context persistence, resource coordination, and memory-serving APIs
- `hyperingest`
  - owns batch imports such as bookmarks, session discovery/import, prompt-library ingestion, and other background normalization/indexing jobs

### Recommended rollout order

Do **not** split everything at once. Prefer this extraction order:

1. Keep `borg` and `borgd` as the primary operator pair.
2. Extract `hypermcpd` when MCP routing/probing/cache lifecycle clearly needs its own uptime or crash boundary.
3. Extract `hypermemd` and/or `hyperingest` when background ingestion, session processing, or memory persistence starts competing with operator latency.
4. Extract `hyperharnessd` when harness execution needs its own resource envelope or failure isolation.

### Default architectural guidance

- Prefer a **modular monolith first** with shared packages and stable contracts.
- Split binaries only when there is a clear need for separate lifecycle, scaling, crash isolation, privilege boundaries, or deployment targets.
- Avoid premature process boundaries; they add config, orchestration, debugging, and contract-drift cost before they add enough value.
- When describing future architecture, present this as the **recommended direction**, not as already completed reality unless the binaries actually exist.

## Validation baseline

Run targeted verification for the area you change. At minimum, prefer:

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

If a check cannot run, document why.

## Documentation rules

If behavior changes, update the relevant docs in the same change:
- `README.md`
- `ROADMAP.md`
- `TODO.md`
- `CHANGELOG.md`
- `AGENTS.md` if contributor rules changed

## Current interpretation of success

Borg succeeds by becoming:
- more reliable,
- more understandable,
- more inspectable,
- and more useful as a local control plane.

Ambition is welcome. Overclaiming is not.

## 🏛️ The Triad of Orchestrators

Borg operates with three primary orchestrator interfaces, designed to distribute workload across local, desktop, and cloud environments:

1. **cli-orchestrator (CLI)**:
   - The native local terminal interface, historically surfaced under Borg's older standalone orchestrator branding, bridging stdio MCP servers and foundational agentic workflows.
   - Borg now tracks `submodules/borg` as the primary external CLI harness assimilation lane for this interface. The upstream exposes a Go/Cobra CLI with a TUI REPL, `pipe` command, and a Borg-aware adapter package, but the integration should still be described as **Experimental** until the runtime contract is deeper than metadata and launch scaffolding.
2. **electron-orchestrator (Desktop)**:
   - A cross-platform Electron application (submoduled from `robertpelloni/maestro`) built for hacking parallel projects. 
   - **Capabilities**: Unattended Auto Run playbooks, Git Worktrees, Group Chat moderation, and visual context management.
3. **cloud-orchestrator**:
   - A high-performance "Lean Core" web stack (Bun, Hono, React 19 SPA) running natively on `port 8080`.
   - **Role**: Coordinates remote autonomous models (Jules, Spark, Copilot Cloud, Codex Cloud, Claude Cloud, etc.) with real-time WebSocket telemetry and persistent task queueing.

At present, `electron-orchestrator` and `cli-orchestrator` should not be described as having 100% feature parity. The desktop surface has broader operator workflows today, while the CLI surface remains the cleaner control-plane foundation and the active Go-port target.

Additionally, Borg leverages the **BobbyBookmarks** ecosystem (`data/bobbybookmarks`)—a Python-driven data ingestion pipeline offering advanced deduplication and autonomous deep research capabilities.


# cli-orchestrator: System Prompts & Execution Rules

You are the core routing engine for the Borg operating system. Your primary function is to orchestrate multi-agent workflows and manage communication with local Model Context Protocol (MCP) servers operating over `stdio`.

## Core Routing Directives

* **Strict JSON-RPC 2.0 Enforcement:** All communication with local MCP servers must strictly adhere to the JSON-RPC 2.0 specification. Do not output conversational text when a tool call is required.
* **State & Transport Persistence:** You are communicating via standard input/output streams (`stdio`). You must wait for the server to return a `result` or `error` object before assuming a task is complete. Do not prematurely close the transport loop.
* **Payload Accuracy:** When invoking a tool on a local server, ensure your `arguments` payload matches the server's predefined JSON schema exactly. No missing keys, no hallucinated parameters.
* **Graceful Failures:** If an MCP server returns an error via `stderr` or fails to respond within the timeout window, log the failure state immediately. Do not attempt to guess or hallucinate the tool's output.
=======
# AGENTS — HyperCode Contributor & Agent Guide

> **CRITICAL: ALL AGENTS MUST READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` BEFORE PROCEEDING.**

This file serves as a reference point for multi-agent workflows (Claude -> Gemini -> GPT) and human operators orchestrating autonomous sessions.

## 1. Multi-Agent Workflows

1. **Handoffs:** Agents communicate primarily through `HANDOFF.md`. When your turn finishes, document exactly what you did, what failed, and what the next agent must do.
2. **Specializations:**
   - **Gemini:** Speed, recursive scripts, massive context processing, repo maintenance.
   - **Claude:** Deep implementation, UI/UX perfection, documentation, styling.
   - **GPT:** Architecture, systemic debugging, strict type enforcement.
3. **Iteration Cycle:** Read -> Strategize -> Execute -> Validate -> Commit -> Handoff. Never stop the party.

## 2. Universal Protocol

- Every session begins by verifying the current project version (`VERSION` file) and ensuring it matches across `package.json`, `CHANGELOG.md`, and dashboard UI displays.
- All major updates to dependencies or architecture must be noted in `CHANGELOG.md` and `HANDOFF.md`.
- Read the instructions located in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` for specific rules regarding truthfulness, scope, and validation.

*For model-specific quirks, refer to `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md`.*
>>>>>>> main
