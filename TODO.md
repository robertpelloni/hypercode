<<<<<<< HEAD
# TODO

_Last updated: 2026-04-08, version 1.0.0-alpha.25_

## P0 — Must do now

- [x] Fix detached HEAD on main branch
- [x] Rebuild better-sqlite3 native bindings for Node 24
- [x] Update deprecated Gemini model (2.0-flash → 2.5-flash)
- [x] Add `/api/scripts` REST bridge to fix dashboard 404s
- [x] Restart server and verify SQLite-dependent features work (BobbyBookmarks, catalog, session import)
- [x] Fix catalog ingestion — glama.ai returns HTML now, mcp.run returns 404
- [x] Verify all dashboard pages show real state after SQLite fix
- [x] Add `pnpm rebuild better-sqlite3` to startup script for Node 24 safety
- [x] Test `/api/scripts` endpoints actually return saved script data

## P1 — Should do next

- [x] Implement MCP meta-tool decision system (search_tools, load_tool with ranking/auto-load)
- [x] Add progressive tool disclosure — only expose 5-6 permanent meta-tools to models
- [x] Add tool semantic search / tool RAG for the meta-tool discovery layer
- [x] Dashboard polish: verify all 69 dashboard sub-pages show real data (In progress)
- [x] Session auto-detection/import — detect and parse sessions from all AI harnesses
- [x] Go native Skill Store
- [x] Go high-value Link Analysis (Feature Extraction)
- [x] A2A Handshake Pattern (Negotiation)
- [x] Go A2A signal auditing
- [x] ZIP-based session archiving with fact extraction
- [x] Go native Director loop
- [ ] Add remaining free-tier providers to fallback chain (OpenRouter free, Google AI Studio)
- [x] Update all submodules to latest upstream
- [x] Comprehensive tool parity aliases (Claude Code, Codex, Gemini CLI, OpenCode, Pi, Cursor, Windsurf)
- [x] Supervisor tool prediction — watch conversation, inject tool ads preemptively
- [x] Progressive skill disclosure (same architecture as tool disclosure)
- [x] Browser extension (Chrome/Firefox) manual sync and export
- [x] Multi-model chatroom — shared context between rotating models (PairOrchestrator)
- [x] A2A protocol implementation
- [x] Continue Go parity per PORTING_MAP.md (Provider, Session, Scripts, Health, Directory, HighValue, A2A, Swarm)

## P2 — Helpful but not urgent

- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
- [ ] Design how HyperCode benchmarks and ranks overlapping MCP servers and tools
- [ ] Promote the most justified package seams into standalone binaries
- [ ] Browser extension (Chrome/Firefox) for MCP injection into web chats
- [ ] Multi-model chatroom — shared context, rotating implementer/planner/tester
- [ ] Native UI to replace Electron Maestro

## Completed in recent sessions

- [x] Fixed config deletion loop (McpConfigService was wiping DB tools)
- [x] Fixed stdio loader blindspot (added .hypercode/mcp-cache.json)
- [x] Workspace config resolution (respect HYPERCODE_CONFIG_DIR env var)
- [x] Tool inventory merging (DB + JSON combined)
- [x] Universal instructions refactor (all model files → UNIVERSAL_LLM_INSTRUCTIONS.md)
- [x] Go-native handlers for council sub-systems (rotation, evolution, finetune, hooks, IDE, smartpilot)
- [x] Go-native BobbyBookmarks, LinkCrawler, expert, infrastructure, suggestions
- [x] Provider fallback chain with automatic model switching on quota errors
- [x] Saved Scripts REST API bridge in Express server

## Keep visible, but do not let it hijack the queue

- [ ] Build toward definitive internal MCP server library
- [ ] Build toward universal operator-owned control plane
- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Browser extension for MCP superassistant
- [x] Multi-model shared-context chatroom
- [ ] Native lightweight UI (no Electron)
- [x] A2A protocol implementation
- [ ] Mobile remote control of sessions

## Decision heuristic

When in doubt, choose the task that makes HyperCode:
## Current objective

Make borg feel trustworthy in daily operator use.

## P0 — Must do now

- [ ] Fix recurring extension and runtime errors (storage access, SSE or subscription failures)
- [ ] Finish the highest-value dashboard truth pass
- [ ] Verify critical routes show real state, not reassuring fiction
- [ ] Reduce startup and port mismatch confusion
- [ ] Harden published MCP catalog ingestion against stale registry endpoints and misleading error handling
- [ ] Align `README.md`, `ROADMAP.md`, `TODO.md`, and `VISION.md` around one release story
- [ ] Verify first-run and recovery flows are reproducible
- [ ] Tighten docs so public claims match implementation

## P1 — Should do next

- [x] Add targeted regression coverage for provider fallback, session recovery, and discovery failures
- [x] Improve session attach and restart clarity
- [ ] Deepen `borg` assimilation beyond harness registration once the upstream submodule exposes real runtime entrypoints
- [x] Improve memory provenance and retrieval debugging
- [x] Improve MCP import and export error reporting
- [x] Improve provider fallback history and quota clarity
- [x] Improve first-run empty states and setup guidance
- [x] Improve MCP health and validation reporting
- [x] Define package seams for `borgd`, `borgmcpd`, `borgmemd`, `borgingest`, and `borgharnessborgharnessd` before extracting binaries
- [x] Reduce duplicated orchestration logic across CLI, web, desktop, and sidecar surfaces so daemon ownership is clearer
- [x] Continue Go truth-parity work only where the sidecar can read the same SQLite tables, config files, session artifacts, or deterministic local defaults without pretending to own live orchestration state
- [x] Keep documenting which Go routes are truthful local fallbacks versus bridge-only passthroughs so operator expectations stay honest

## P2 — Helpful but not urgent

- [x] Publish clearer reliability and latency baselines
- [x] Improve benchmark and diagnostics visibility
- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
- [x] Design the internal MCP server library pipeline: ingestion from public lists, dedupe, provenance, and refresh rules
- [ ] Design how borg benchmarks and ranks overlapping MCP servers and tools over time
- [ ] Promote the most justified package seams into standalone binaries only after contracts and ownership are stable

## Keep visible, but do not let it hijack the queue

- [ ] Build toward a definitive internal library of MCP servers so the model can eventually reach any relevant MCP tool through borg
- [ ] Build toward a universal operator-owned control plane spanning any model, any provider, any session, and any relevant tool
- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Marketplace or community ideas
- [ ] Mobile or desktop parity expansion
- [ ] Rust acceleration work
- [ ] 3D visualization work
- [ ] Economy or payment concepts

## Decision heuristic

When in doubt, choose the task that makes borg:
1. more reliable,
2. more understandable,
3. more inspectable,
4. more honest.
=======
# Borg TODO

_Last updated: 2026-03-11_

This file is the canonical implementation queue distilled from the current repository state, source audit, changelog history, repo memories, and live diagnostics. It is intentionally ordered. Finish items from the top unless a blocker or dependency says otherwise.

## What this audit covered

Evidence used for this queue:

- root docs: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`
- backlog/archive docs: `docs/DETAILED_BACKLOG.md`, `docs/PROJECT_STATUS.md`, `docs/HANDOFF.md`
- repository memories under `/memories/repo/`
- source scans across `packages/core/**`, `apps/web/**`, `apps/borg-extension/**`
- dashboard/runtime audits for live, partial, and placeholder surfaces
- diagnostics showing no current editor errors in `apps/web` or `packages/core`
- latest runtime stabilization work for dashboard readiness, tRPC transport, and MCP bulk import compatibility

## P0 — release-blocking Borg 1.0 work

### 1) Make startup orchestration deterministic and operator-truthful

**Why this is first**
- The product promise starts with `pnpm run dev` and `docker compose up --build`.
- Borg now exposes `startupStatus`, but the boot story is still fragile and spread across CLI, dashboard, core, and extension bridge assumptions.

**Evidence**
- `packages/core/src/routers/systemProcedures.ts`
- `scripts/dev_tabby_ready.mjs`
- repo memories: `web-route-validation.md`, `dashboard-mvp-validation.md`

**Do next**
- Verify the complete boot contract from CLI start → core ready → router initialized → cached inventory ready → session restore complete → extension bridge listener ready.
- Decide which signals are mandatory for “ready” versus optional for a fresh install.
- Make the dashboard, launcher, and docs use the same readiness definition.

**Acceptance criteria**
- [ ] `pnpm run dev` reports one canonical readiness contract.
- [ ] `/dashboard` reflects the same boot state as the launcher.
- [ ] Fresh installs with zero MCP servers do not appear “stuck booting”.
- [ ] Startup regressions have focused tests.

### 2) Fix MCP dashboard runtime regressions before doing more feature work

**Status**
- Major regressions from the last runtime investigation were fixed on 2026-03-11.
- Keep this item open only until a fresh root-level smoke run confirms the full dev path behaves correctly end to end.

**Fixed failures from recent session**
- `POST /api/trpc/mcp.getStatus?batch=1` → fixed by removing forced POST query transport in `TRPCProvider`
- `POST /api/trpc/mcpServers.bulkImport?batch=1` → fixed by de-batching/normalizing the proxied bulk import request

**Evidence**
- `apps/web/src/utils/TRPCProvider.tsx`
- `apps/web/src/utils/TRPCProvider.test.tsx`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `apps/web/src/app/dashboard/mcp/page.tsx`
- `apps/web/tests/integration/mcp-to-dashboard.test.ts`
- `apps/web/src/app/dashboard/cloud-dev/page.tsx`
- `scripts/dev_tabby_ready.mjs`

**Do next**
- Run a clean root-level smoke test and verify the browser console stays quiet during normal MCP dashboard polling.
- Re-verify bulk import using a realistic operator config sample, not just the minimal replay payload.
- Keep route/integration coverage aligned with the exact request shapes used by the dashboard.

**Acceptance criteria**
- [ ] MCP dashboard no longer floods the browser with 405s during a fresh end-to-end dev run.
- [ ] Bulk import accepts realistic `mcpServers` JSON from real operator configs.
- [ ] Route/integration tests cover the exact failing request shape.
- [ ] Dashboard import and polling work on Windows dev setup.

### 3) Finish the MCP router’s actual control-plane story

**Current reality**
- Aggregation, traffic inspection, config sync, and direct-mode compatibility are real.
- Progressive disclosure and tool-search semantics remain incomplete or split across compatibility layers.

**Evidence**
- `packages/core/mcp/**`
- `packages/core/src/services/metamcp-session-working-set.service.ts`
- `packages/core/src/services/stubs/tool-search.service.stub.ts`
- `apps/web/src/app/dashboard/mcp/search/page.tsx`
- `apps/web/src/app/dashboard/mcp/inspector/page.tsx`

**Do next**
- Replace stubbed/search-placeholder behavior with one canonical Borg-native tool search and loading pipeline.
- Finish the load/unload/schema hydration working-set story.
- Decide which MetaMCP-style middleware features are truly in 1.0 scope and explicitly defer the rest.

**Acceptance criteria**
- [ ] Operators can search, load, inspect, and unload tools predictably.
- [ ] Tool search ranking is useful on large inventories.
- [ ] Working-set state and schema hydration are clearly visible in the UI.
- [ ] Remaining proxy-only behavior is documented and intentional.

### 4) Complete the session supervisor operator loop

**Current reality**
- Spawning, restart/backoff, persistence, and dashboard controls are real.
- Worktree isolation is not guaranteed in all runtime paths, and there is no true terminal attach workflow.

**Evidence**
- `packages/core/src/supervisor/SessionSupervisor.ts`
- `packages/core/src/supervisor/cliHarnessCatalog.ts`
- `packages/core/src/routers/sessionRouter.ts`
- `apps/web/src/app/dashboard/session/**`
- repo memory: `session-supervisor-validation.md`

**Do next**
- Close the gap between the `WorktreeManagerLike` contract and real runtime availability.
- Decide whether “terminal attach” means real I/O passthrough, a buffered shell bridge, or explicit non-goal.
- Improve session failure/recovery UX so operators know when Borg will or will not auto-restart.

**Acceptance criteria**
- [ ] Worktree-enabled sessions are reliable in practice, not just tests.
- [ ] Operators can attach to or otherwise interact with a supervised session without guessing.
- [ ] Dashboard clearly distinguishes manual-restart sessions from auto-restart sessions.

### 5) Make provider routing trustworthy enough for real operators

**Current reality**
- Auth normalization, quota snapshots, fallback-chain inspection, and routing controls exist.
- Live cost/quota fidelity and auth persistence depth still lag behind the UI ambition.

**Evidence**
- `packages/core/src/providers/**`
- `packages/core/src/routers/billingRouter.ts`
- `apps/web/src/app/dashboard/billing/page.tsx`

**Do next**
- Improve live quota tracking and reset-time semantics.
- Harden OAuth/PAT token persistence and refresh behavior.
- Reduce dashboard optimism where backend truth is still shallow.

**Acceptance criteria**
- [ ] Billing/provider UI no longer overstates accuracy.
- [ ] Fallback decisions are explainable from operator-visible data.
- [ ] Provider auth failures have actionable remediation paths.

### 6) Remove or clearly demote fake breadth in the dashboard

**Why this matters**
- Borg currently looks wider than it really is.
- That creates handoff confusion and weakens the 1.0 story.

**Highest-risk surfaces**
- `apps/web/src/app/dashboard/super-assistant/page.tsx` — parity shell, not shipped feature completion
- `apps/web/src/app/dashboard/autopilot/page.tsx` — iframe wrapper, not integrated control plane
- `apps/web/src/app/dashboard/webui/page.tsx` — iframe wrapper, mostly external embed
- `apps/web/src/app/dashboard/agents/page.tsx` — minimal shell relative to feature promise
- `apps/web/src/app/dashboard/workflows/page.tsx` — partial framework, incomplete execution UX
- `apps/web/src/app/dashboard/swarm/page.tsx` — real depth, but incomplete operator finish

**Acceptance criteria**
- [ ] Primary navigation distinguishes shipped, experimental, and parity/audit surfaces.
- [ ] Pages that are only wrappers or status docs do not read like completed products.
- [ ] Borg 1.0 surfaces are immediately obvious to a first-time operator.

## P1 — implemented backend, incomplete UI or incomplete productization

### 7) Promote important backend services that currently lack strong UI

**Candidates identified in this audit**
- `packages/core/src/routers/serverHealthRouter.ts`
- `packages/core/src/routers/logsRouter.ts`
- `packages/core/src/routers/lspRouter.ts`
- `packages/core/src/routers/auditRouter.ts`
- `packages/core/src/routers/testsRouter.ts`
- `packages/core/src/routers/contextRouter.ts`
- `packages/core/src/routers/graphRouter.ts`
- `packages/core/src/routers/gitRouter.ts`
- `packages/core/src/routers/savedScriptsRouter.ts`

**Do next**
- Pick a small set that materially improves the 1.0 control plane: health, logs, LSP/symbols, and tests are the strongest candidates.
- For everything else, either add a real UI or explicitly mark it internal/experimental.

**Acceptance criteria**
- [ ] No major production-intended router is effectively invisible to operators.
- [ ] Hidden/internal services are documented as such.

### 8) Consolidate the memory story around what Borg actually does today

**Current reality**
- Borg has memory CRUD, summaries, prompts, observations, import/export, and a claude-mem parity/status page.
- Borg does not yet have the full claude-mem hook/search/context/runtime stack.

**Evidence**
- `packages/core/src/services/memory/**`
- `packages/core/src/services/toolObservationMemory.ts`
- `packages/core/src/services/sessionSummaryMemory.ts`
- `apps/web/src/app/dashboard/memory/**`
- `apps/web/src/app/dashboard/memory/claude-mem/**`

**Do next**
- Define the canonical Borg-native observation schema.
- Decide whether claude-mem remains an adapter, a migration source, or a long-term runtime dependency.
- Unify memory UI around search, summaries, prompts, observations, and ingestion provenance.

**Acceptance criteria**
- [ ] Memory dashboard reflects one coherent model.
- [ ] Claimed parity gaps are either scheduled or clearly deferred.
- [ ] Search, import/export, and observation capture are understandable from one place.

### 9) Finish the browser/IDE bridge as a real product surface

**Current reality**
- Install artifact detection and bridge registration are real.
- Browser extension and IDE integrations remain partial, with broad parity aspirations and narrow delivered workflows.

**Evidence**
- `packages/core/src/bridge/bridge-manifest.ts`
- `apps/borg-extension/**`
- `apps/extension/**`
- `apps/vscode/**`
- `apps/web/src/app/dashboard/integrations/**`

**Do next**
- Pick the minimum viable supported bridge flows for 1.5: connect, report capabilities, capture context, send memory, show live status.
- Avoid claiming MCP-SuperAssistant/claude-mem parity until workflow parity is real.

**Acceptance criteria**
- [ ] One browser extension workflow and one IDE workflow are end-to-end reliable.
- [ ] Integration Hub status reflects actual runnable state, not just artifact presence.

### 10) Rebuild the task-file discipline promised by `AGENTS.md`

**Current reality**
- `tasks/active/` is still too thin relative to the amount of in-flight work.
- `tasks/backlog/` is seeded again, but large ecosystem parity asks still need to be decomposed into implementation-sized tasks.
- Implementor workflow is still undercut when major asks live only in chat history instead of task files.

**Do next**
- Seed task briefs for the top 1.0 items in this file.
- Keep each task small, testable, and scoped.

**Acceptance criteria**
- [ ] `tasks/active/` contains the next 1–3 concrete implementation tasks.
- [ ] `tasks/backlog/` reflects ordered follow-ons from this TODO.

### 11) Consolidate external-parity asks into staged Borg capability tracks

**Why this matters**
- The repo has accumulated overlapping asks around MetaMCP, Claude-mem, MCP-SuperAssistant, Jules-Autopilot, browser extensions, IDE hooks, and session-manager portability.
- Without a single consolidation brief, those asks keep reappearing as “assimilate everything” instead of small Borg-native work slices.

**Current canonical brief**
- `tasks/completed/015-ecosystem-assimilation-consolidation.md`
- Use its Track A-F capability map when writing or promoting follow-up implementation tasks.

**Evidence**
- `tasks/completed/015-ecosystem-assimilation-consolidation.md`
- `AGENTS.md`
- `ROADMAP.md`
- `HANDOFF.md`

**Do next**
- Use the new consolidation brief to carve the next real tasks under these tracks only:
	- boot-ready control plane
	- Borg-native MCP router maturity
	- browser extension platform
	- IDE / CLI / hook-based memory capture
	- portable tool+model session fabric
- Reject future parity work that cannot be mapped to one of those tracks and a concrete operator workflow.

**Acceptance criteria**
- [ ] New implementation tasks reference a consolidation track instead of restating full upstream parity demands.
- [ ] Borg 1.0 work stays distinct from 1.5 memory/extension work and 2.0 autonomy work.

## P2 — cleanup, coherence, and robustness

### 12) Rationalize stale documentation and route drift

**Issues found during audit**
- `README.md` still references `/dashboard/mcp` as the landing route even though recent repo memory says `/dashboard` is now the home surface.
- `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md` are archive markers, not current status sources.
- Historical docs still reference older version contexts and legacy phase framing.

**Acceptance criteria**
- [ ] README startup path and landing route match current behavior.
- [ ] Canonical docs are obvious from the root.
- [ ] Archived docs remain clearly marked archive-only.

### 13) Reduce stub debt in `packages/core/src/services/stubs/`

**Current stub files**
- `packages/core/src/services/stubs/agent.service.stub.ts`
- `packages/core/src/services/stubs/code-executor.service.stub.ts`
- `packages/core/src/services/stubs/policy.service.stub.ts`
- `packages/core/src/services/stubs/saved-script.service.stub.ts`
- `packages/core/src/services/stubs/tool-search.service.stub.ts`
- `packages/core/src/services/stubs/tools.impl.stub.ts`
- `packages/core/src/services/stubs/toon.serializer.stub.ts`

**Acceptance criteria**
- [ ] Each stub is either deleted, implemented, or explicitly documented as compatibility-only.
- [ ] No stub silently backs a UI that appears production-ready.

### 14) Keep experimental swarm/autonomy work behind an honest boundary

**Why**
- The repo contains real swarm and council depth, but Borg 1.0 should not depend on it.

**Acceptance criteria**
- [ ] Experimental orchestration features remain available without distorting the 1.0 control-plane narrative.
- [ ] Swarm/council/autopilot work resumes only after top 1.0 blockers are under control.

## Suggested implementation order

1. Startup orchestration contract
2. MCP dashboard runtime fix (`405`/`400`)
3. MCP router search / progressive disclosure completion
4. Session supervisor worktree + attach closure
5. Provider routing truthfulness pass
6. Dashboard honesty / placeholder reduction
7. Health/logs/LSP/tests UI exposure
8. Memory model consolidation
9. Bridge workflow completion
10. Task-file restoration and doc cleanup






# TODO.md — Borg Task List

> Version: 1.0.0-alpha.1
> Updated: 2026-07-15
> Priority: 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low

---

## Phase 1: Foundation (Borg 1.0-alpha) — CURRENT

### Ring 0: The Heartbeat
- [ ] 🔴 Create `VERSION` file (single source of truth)
- [ ] 🔴 Set up monorepo structure (Go core + TS dashboard)
- [ ] 🔴 Implement `borg start` / `borg stop` / `borg status` CLI
- [ ] 🔴 Go daemon: starts, stays alive, exposes HTTP + WebSocket API
- [ ] 🔴 Dashboard shell: opens in browser, shows version and uptime
- [ ] 🔴 Can start ONE coding session and stream its logs to dashboard
- [ ] 🟠 Initialize CHANGELOG.md, AGENTS.md, MEMORY.md, HANDOFF.md
- [ ] 🟠 Git commit/push protocol established and documented

### Ring 1: MCP Router
- [ ] 🔴 Aggregate 3+ MCP servers behind one stdio endpoint
- [ ] 🔴 Implement 6 permanent meta-tools (search, load, unload, schema, list, run_code)
- [ ] 🔴 Tool namespace collision detection and resolution
- [ ] 🔴 Tool enable/disable per server and per tool
- [ ] 🟠 Health checks with auto-restart for crashed MCP servers
- [ ] 🟠 Deferred binary startup (index metadata without spawning)
- [ ] 🟠 Dashboard: MCP server status page with tool list
- [ ] 🟡 TOON format for compact tool descriptions
- [ ] 🟡 Traffic inspection: log JSON-RPC calls

### Ring 2: Provider Router
- [ ] 🔴 API key management (encrypted local store)
- [ ] 🔴 Fallback chain configuration (JSONC)
- [ ] 🔴 Quota tracking with pre-emptive switching at 95%
- [ ] 🔴 Circuit breaker for 429/529 errors with backoff
- [ ] 🟠 Health check protocol (latency + error rate scoring)
- [ ] 🟠 Dashboard: per-provider cost, quota remaining, fallback activity
- [ ] 🟡 Task-type specific routing strategies
- [ ] 🟡 Cost optimization mode

### Ring 3: Session Supervisor
- [ ] 🔴 Multi-session management (start/stop/restart N sessions)
- [ ] 🔴 Process isolation (one session = one child process)
- [ ] 🔴 Crash detection and automatic restart
- [ ] 🟠 Checkpoint creation (git commit + conversation serialize)
- [ ] 🟠 Checkpoint restore (rehydrate conversation + worktree)
- [ ] 🟠 Model handoff on provider failure
- [ ] 🟠 Dashboard: session management page
- [ ] 🟡 Worktree isolation per session
- [ ] 🟡 Configurable restart policies (always, N-times, never)

### Ring 4: Council
- [ ] 🟠 Idle detection (configurable timeout, default 120s)
- [ ] 🟠 Cheerleader mode (rotate through bump prompts)
- [ ] 🟠 Message injection into managed sessions
- [ ] 🟡 Informed supervisor mode (flash model reads TODO/ROADMAP)
- [ ] 🟡 Dashboard: council controls and intervention log

### Ring 5: Progressive Tool Disclosure
- [ ] 🟠 Semantic tool search (vector similarity)
- [ ] 🟠 Confidence-based auto-load (silent above 0.85)
- [ ] 🟠 LRU eviction (soft cap 16, hard cap 24, active binaries ~4)
- [ ] 🟡 Tool profiles for common workflows (coding, research, ops)
- [ ] 🟡 Tool reranking based on usage patterns

---

## Phase 2: Memory & Context (Borg 1.5)

- [ ] 🟠 Memory plugin system (file-based, vector DB, graph)
- [ ] 🟠 Automatic context harvesting from sessions
- [ ] 🟠 Import/export memories across formats
- [ ] 🟡 RAG with document intake, chunking, semantic search
- [ ] 🟡 Context compaction and pruning
- [ ] 🟡 Session history search and archive
- [ ] ⚪ Browser extension: memory capture from web pages
- [ ] ⚪ Browser extension: MCP injection into web chat interfaces

---

## Phase 3: Orchestration (Borg 2.0)

- [ ] 🟡 Multi-model council (expert panel mode with debate)
- [ ] 🟡 Architect-implementer-reviewer agent workflows
- [ ] 🟡 Cloud dev session management (Jules, Copilot Cloud)
- [ ] ⚪ IDE extensions (VS Code, Cursor, Windsurf)
- [ ] ⚪ Mobile remote control
- [ ] ⚪ Skill library and prompt management
- [ ] ⚪ Provider OAuth management (Claude Max, AI Plus, Copilot)
- [ ] ⚪ Agent2Agent protocol support
- [ ] ⚪ Feature parity with referenced CLI tools

---

## Documentation Tasks
- [ ] 🔴 Write AGENTS.md (universal LLM instructions)
- [ ] 🔴 Write DEPLOY.md (installation and startup)
- [ ] 🔴 Write ARCHITECTURE.md (system design diagrams)
- [ ] 🟠 Write MCP_ROUTER_SPEC.md
- [ ] 🟠 Write COUNCIL_SPEC.md
- [ ] 🟠 Write PROVIDER_ROUTER_SPEC.md
- [ ] 🟡 Document all submodules in SUBMODULES.md
- [ ] 🟡 Create API.md for dashboard WebSocket/REST endpoints

---

## Bugs / Known Issues
- [ ] (None yet — project is pre-alpha)

---

## Design Rules (Do Not Violate)
1. Session is the primitive. Everything orbits sessions.
2. Models see ≤6 meta-tools. Everything else is progressive disclosure.
3. Failures must be recoverable. Sessions survive crashes.
4. Dashboard tells stories, not raw telemetry.
5. Useful to a stranger in under five minutes.
>>>>>>> origin/rewrite/main-sanitized
