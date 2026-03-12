# Borg Roadmap

This is the canonical, reality-based roadmap for the current repository state as of **2026-03-11**.

It preserves the three milestone structure required by `AGENTS.md`, but it now distinguishes clearly between:

- **shipped and operator-visible** work,
- **implemented but incompletely wired** work,
- **experimental or parity/audit surfaces**, and
- **work that still blocks a trustworthy Borg 1.0 release**.

Historical phase planning remains archived in `docs/archive/ROADMAP_LEGACY.md`.

## Current implementation snapshot

| Area | Reality today | Evidence basis | Release status |
|---|---|---|---|
| MCP Router | Real aggregator, traffic inspector, config sync, downstream discovery, dashboard surfaces, native/direct-mode compatibility | `packages/core/mcp/**`, `packages/core/src/routers/mcpRouter.ts`, `apps/web/src/app/dashboard/mcp/**`, router/integration tests | **Partial** — missing semantic tool search maturity, full progressive disclosure, and some runtime polish |
| Provider Routing | Real provider registry, quota snapshots, strategy selection, fallback-chain UI/editor, task-type routing | `packages/core/src/providers/**`, `packages/core/src/routers/billingRouter.ts`, `apps/web/src/app/dashboard/billing/page.tsx`, fallback tests | **Partial** — missing live usage accounting depth, stronger OAuth/PAT persistence, and richer cost analytics |
| Session Supervisor | Real supervised CLI runtime with persistence, restart/backoff, logs, dashboard creation and controls | `packages/core/src/supervisor/**`, `packages/core/src/routers/sessionRouter.ts`, `apps/web/src/app/dashboard/session/**`, supervisor tests | **Partial** — worktree runtime is not universally available, no true terminal attach/interactive bridge |
| Dashboard | Real dashboard home plus actionable MCP, session, billing, integrations, research, memory, and browser/system surfaces | `apps/web/src/app/dashboard/**`, dashboard and integration tests | **Partial** — several pages are parity shells, wrappers, or incomplete advanced workflows |
| Memory | Real Borg memory CRUD, summaries, prompt memory, observation capture, import/export adapters, claude-mem status surface | `packages/core/src/services/memory/**`, `packages/core/src/services/toolObservationMemory.ts`, `apps/web/src/app/dashboard/memory/**` | **Partial** — no full claude-mem hook/runtime parity, no complete progressive disclosure/search timeline UX |
| Extension / Bridge | Real bridge manifest, install-surface detection, browser-extension scaffolding, live client registration | `packages/core/src/bridge/**`, `apps/borg-extension/**`, `apps/web/src/app/dashboard/integrations/**` | **Early** — bridge exists, but browser/IDE parity remains far from complete |
| Docs / Task governance | Root architecture and changelog exist; archive docs are clearly marked | `ARCHITECTURE.md`, `CHANGELOG.md`, archive notes | **Incomplete** — root `TODO.md`/`HANDOFF.md` were missing and task directories are empty |

## Borg 1.0 — Actually Works

This milestone remains the release gate. Borg 1.0 is not “more dashboards”; it is the first version where a new operator can install Borg, see the control plane, run a few real workflows, and trust what the UI claims.

### 1.0 release criteria

- [x] Root `AGENTS.md` aligned to the focused Borg 1.0 directive
- [x] Legacy roadmap archived to `docs/archive/ROADMAP_LEGACY.md`
- [x] Core dashboard home, MCP, sessions, billing, and integrations surfaces are live
- [x] Session supervisor runtime exists with restart, persistence, and dashboard controls
- [x] Provider fallback chain exists with task-aware routing and editable defaults
- [x] MCP router aggregation, namespace safety, traffic inspection, and config sync exist
- [ ] `pnpm install`, `pnpm run dev`, and `docker compose up --build` must all be repeatably clean for a stranger
- [ ] MCP dashboard runtime must be stable under real local traffic
- [ ] Progressive disclosure / tool search experience must match the control-plane story
- [ ] Supervisor worktree/attach story must be operator-trustworthy end to end
- [ ] Provider auth/quota state must be truthful enough for operational decisions
- [ ] Placeholder, iframe, and parity-only dashboard surfaces must be either completed, clearly labeled experimental, or removed from primary navigation
- [ ] Canonical task files under `tasks/` must again reflect active implementation work
- [ ] 30+ relevant tests passing in CI with an honest release gate
- [ ] README quickstart must match the real startup flow and landing route
- [ ] GitHub release `v1.0.0`

### 1.0 shipped foundations

#### MCP Master Router

- [x] Aggregate multiple downstream MCP servers through Borg
- [x] Collision-safe tool naming and grouped inventory
- [x] Crash isolation and restart behavior for downstream servers
- [x] Traffic inspection and operator-visible health data
- [x] Client config sync and startup-status reporting
- [ ] Close live MCP dashboard regressions (`mcp.getStatus`/`bulkImport` POST flow) and align runtime with tests
- [ ] Finish tool-search / load / inspect / unload flow so progressive disclosure is more than a partial compatibility layer
- [ ] Decide which remaining MetaMCP-derived middleware features are genuinely in 1.0 scope versus explicitly deferred

#### Model Fallback & Provider Routing

- [x] Provider auth-state and quota snapshot normalization
- [x] Ranked fallback-chain inspection for multiple task types
- [x] Dashboard editing for default strategy and task overrides
- [x] Fallback test coverage for exhaustion/rate-limit flow
- [ ] Improve live quota/cost fidelity and reset-time truthfulness
- [ ] Harden OAuth/PAT flows and operator error reporting
- [ ] Expand provider status UI from “available/authenticated” into “safe to route production work”

#### Session Supervisor

- [x] Spawn external CLI sessions from the dashboard
- [x] Auto-restart with bounded backoff
- [x] Persist and restore supervised session state
- [x] Expose logs, health, restart countdown, and launch metadata
- [ ] Make worktree isolation reliable in the real runtime, not just the interface/tests
- [ ] Add true terminal attach or an explicit supported alternative
- [ ] Tighten session failure semantics and operator recovery workflow

#### Operator Dashboard

- [x] Overview/home panel composed from real router, provider, and session state
- [x] MCP pages for system, inspector, catalog, policy, AI tools, and integrations
- [x] Sessions and billing pages with actionable controls
- [x] Research, browser, and memory surfaces backed by real procedures
- [ ] Reduce “fake breadth”: parity/status pages and wrappers should not read like shipped feature completion
- [ ] Promote currently orphaned backend capabilities with genuine UI where they matter most (health, logs, LSP, audit, tests)
- [ ] Keep the primary dashboard focused on the Borg 1.0 control plane rather than every experimental subsystem

### 1.0 blockers that still matter most

1. **Startup/readiness truthfulness** — Borg now has `startupStatus`, but the root boot flow still needs deterministic, end-to-end verification.
2. **MCP dashboard runtime stability** — recent local evidence still showed `POST /api/trpc/mcp.getStatus?batch=1` returning `405` and `mcpServers.bulkImport` returning `400`; source/tests suggest this should work, so runtime alignment remains a blocker.
3. **Task-system drift** — `tasks/active/` and `tasks/backlog/` are empty, which breaks the documented workflow for implementor agents.
4. **Dashboard honesty** — several pages remain wrappers, parity matrices, or aspirational shells that overstate readiness.

## Borg 1.5 — Remembers Things

This milestone starts only after Borg 1.0 is trustworthy. Several 1.5 ingredients already exist in partial form, but they are not yet a coherent product.

### 1.5 target outcomes

- [ ] Borg-native memory model with one clearly supported long-term backend
- [ ] Basic RAG ingestion, chunking, embedding, and retrieval with an operator-visible ingest lifecycle
- [ ] Browser-extension export, capture, bridge telemetry, and install workflow that operators can actually use
- [ ] Context compaction and harvesting tied to real session/tool execution flows
- [ ] Five CLI tool adapters with clean supervised-session ergonomics: Aider, Claude Code, OpenCode, Codex, Gemini CLI

### 1.5 current reality

- **Partially present now:** memory CRUD, summaries, observation capture, import/export, RAG ingestion hooks, browser-extension scaffolding, integration-hub setup discovery.
- **Still missing:** claude-mem hook parity, typed observation compression pipeline, progressive context injection, transcript compression, mature browser/IDE adapters, and a focused memory UX that matches the backend model.

### 1.5 likely first tasks

- Build a Borg-native observation model and search UX instead of treating claude-mem parity as a marketing page.
- Turn browser/IDE bridge registration into actual two-way workflows: capture, replay, history, memory, and controls.
- Consolidate memory/RAG ingestion status, queue state, and provenance into one operator story.

## Borg 2.0 — The Swarm Awakens

This remains explicitly post-1.x. The repository contains substantial swarm/council/debate/autonomy material already, but much of it is either experimental, partially surfaced, or broader than the 1.0 promise.

### 2.0 target outcomes

- [ ] Multi-agent orchestration via Director/Council/Swarm flows that are coherent and operator-safe
- [ ] Multi-model debate and consensus workflows that are more than isolated demos
- [ ] Memory multi-backend plugin system
- [ ] Cloud-dev integration story (Jules, Devin, related tooling) that fits Borg’s control-plane model
- [ ] Revisit Go supervisor extraction only if Node.js supervision proves insufficient in production use
- [ ] Re-enable focused swarm work from the old 81–95 lineage only after 1.x stabilization
- [ ] Mobile dashboard only if the core control plane justifies it

### 2.0 reality check

- The repository already contains swarm, council, autopilot, cloud-dev, marketplace, browser, and parity pages.
- Many of those surfaces are **not** release-grade Borg 1.0 commitments.
- The correct move is to preserve them, label them honestly, and re-sequence them behind the four 1.0 features.

## Out of scope until the roadmap says otherwise

- P2P mesh as a primary near-term product track
- Feature parity with every external tool simultaneously
- Recursive scraping / assimilation drives as delivery strategy
- Analytics-about-analytics detours
- Expanding parity dashboards faster than backend truth

