# Hypercode Roadmap

Canonical roadmap for the current repository state as of **2026-03-18**.

This roadmap preserves the 1.0 / 1.5 / 2.0 structure while separating:

- already shipped foundations,
- partially wired capabilities,
- experimental surfaces,
- and remaining release blockers.

Historical phase-era planning is archived under `docs/archive/`.

## Implementation snapshot (now)

| Area | Current reality | Status |
|---|---|---|
| MCP router | Real aggregation, safety namespacing, server controls, telemetry, and dashboard surfaces | **Partial** |
| Provider routing | Real provider normalization, fallback chains, quota snapshots, and billing controls | **Partial** |
| Session supervisor | Real spawn/restart/persistence/logging with dashboard controls | **Partial** |
| Dashboard | Real `/dashboard` home plus MCP/session/billing/integrations/memory surfaces | **Partial** |
| Memory | Real Hypercode-native memory CRUD/search/summaries/observations plus adapter surfaces | **Partial** |
| Bridge/extension | Real bridge registration and install-surface detection; mixed extension maturity | **Early** |
| Documentation/task governance | Canonical root docs exist; task workflow requires strict upkeep | **Partial** |

## Hypercode 1.0 — Actually Works

**Release intent:** a new operator can install Hypercode, start it, open the dashboard, run real workflows, and trust what UI state means.

### 1.0 release criteria

- [x] Focused 1.0 directive in `AGENTS.md`
- [x] Real dashboard home and core control-plane routes
- [x] Session supervisor runtime with restart + persistence
- [x] Provider fallback chain and route controls
- [x] MCP aggregation with tool inventory and inspection surfaces
- [ ] Repeatable clean-start path for both `pnpm run dev` and Docker
- [ ] Stable MCP dashboard behavior under normal polling and import/edit loops
- [ ] Trustworthy supervisor worktree/attach operator story
- [ ] Provider auth/quota truthfulness sufficient for operational decisions
- [ ] Clear separation of shipped vs experimental dashboard surfaces
- [ ] Active tasks in `tasks/active/` always map to top blockers
- [ ] CI gate with relevant passing tests for release confidence
- [ ] GitHub release `v1.0.0`

### Current top blockers

1. **Startup/readiness truthfulness**
   - keep launcher, dashboard, and startup contract semantics aligned.
2. **MCP runtime stability in real runs**
   - regressions are largely fixed, but full clean-smoke verification must stay green.
3. **Session supervisor operator reliability**
   - worktree and attach behavior must be explicit and dependable.
4. **Provider trustworthiness**
   - auth state, quota windows, and fallback reasoning must remain accurate.
5. **Dashboard honesty**
   - wrapper/parity pages must be clearly marked and not confused for 1.0 core.

## Hypercode 1.5 — Remembers Things

Starts after 1.0 trust is established.

### 1.5 target outcomes

- [ ] Unified Hypercode-native memory model UX across search/timeline/provenance
- [ ] Durable ingestion pipeline visibility (status, provenance, replayability)
- [ ] Practical browser + IDE capture flows tied to memory and sessions
- [ ] Context compaction/injection that improves real operator workflows
- [ ] Stronger adapter strategy for external memory ecosystems without over-claiming parity

## Hypercode 2.0 — The Swarm Awakens

Explicitly post-1.x stabilization.

### 2.0 target outcomes

- [ ] Coherent multi-agent orchestration with safe operator controls
- [ ] Debate/council workflows that are operational, not demo-only
- [ ] Mature plugin and capability-marketplace story
- [ ] Cloud-dev integrations aligned with Hypercode control-plane principles

## Out of scope (until reprioritized)

- Full feature-parity chasing across every external ecosystem
- Broad “assimilate everything” initiatives without operator workflow proof
- Expanding experimental UI breadth faster than backend/runtime truth
