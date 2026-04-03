# Hypercode — Master TODO List (Implementor Edition)

> **Updated**: 2026-03-04 | **Version**: 2.7.56 | **Phase**: 95 (Swarm Git Worktree Isolation — COMPLETED)
> **Execution Order**: P0 (must close before release) → P1 (critical feature parity) → P2 (quality/polish) → P3 (future)

---

## P0 — Backend Reality Closure (Blockers)

### 1) Remove stub/simulated execution paths
- [x] **Replace simulated Saved Script execution with real runner path**
- [x] **Implement baseline OAuth token exchange flow (provider-specific)**
- [x] **Finish agent chat orchestration wiring**
- [x] **Replace Researcher stub output with model-backed synthesis**
- [x] **Remove remaining MetaMCP proxy stub branches/imports**

### 2) Hybrid Storage Migration (Postgres + JSON)
- [x] **Migrate MCP server configurations to `mcp.json`**

### 3) Type-safety debt in persistence layer
- [x] **Eliminate broad `@ts-ignore` usage in repository layer**

---

## P1 — Frontend Representation Parity (Critical UX)

### 1) Dashboard route parity with backend capability map
- [x] **Create baseline AI Tools dashboard route with live core data**
- [x] **Add Jules dashboard route and wire baseline backend access**

### 2) Router namespace coverage gap closure (OMNI-ANALYSIS RESULTS)
> **Analysis Note (2026-02-24)**: The following backend routers were audited and found to lack comprehensive or active frontend representation in `apps/web/src/`. They must be wired to dashboards or widgets to achieve full "Reality Closure".
- [x] **Agent & Memory Wiring**: `agentRouter.ts`, `agentMemoryRouter.ts`, `memoryRouter.ts` -> Build detailed Agent State & Memory Viewer.
- [x] **Infrastructure & Health**: `serverHealthRouter.ts`, `logsRouter.ts`, `metricsRouter.ts` -> Build "Pulse" system telemetry view.
- [x] **Tools & Extensions**: `marketplaceRouter.ts`, `toolSetsRouter.ts`, `browserRouter.ts`, `shellRouter.ts` -> Enhance Tools Dashboard.
- [x] **DevOps & Git**: `gitRouter.ts`, `submoduleRouter.ts`, `symbolsRouter.ts` -> Build Submodule & Git Operations Dashboard.
- [x] **Authentication & Billing**: `apiKeysRouter.ts`, `oauthRouter.ts`, `billingRouter.ts` -> Build comprehensive Provider Auth & Billing Matrix.
- [x] **Advanced Features**: `darwinRouter.ts` (Evolution), `expertRouter.ts`, `policiesRouter.ts`, `savedScriptsRouter.ts`, `sessionRouter.ts`.

### 3) UI TODO/hardcoded fallback cleanup
- [x] **Resolve Director endpoint test TODO**
- [x] **Resolve MCP namespace placeholder behavior**
- [x] **Complete prompt variable extraction implementation**

---

## P2 — Robustness, Security, and Extension Completion

### 0) First-party marker sweep follow-through
- [x] **Reduce remaining critical-path “for now/mock/placeholder” assumptions in first-party source**

### 1) Browser extension completion
- [x] **Finish fuzzy text matching click action**
- [x] **End-to-end MCP bridge validation**

### 2) Shared UI `@ts-ignore` reduction pass
- [x] **Remove remaining `@ts-ignore` in user-facing components**

### Hypercode - v2.7.56 (canonical) - Phase 95 Documentation and consistency hardening
- [x] **Keep `ROADMAP.md`, `TODO.md`, `STATUS.md`, `HANDOFF.md`, `CHANGELOG.md` synchronized after each merged fix batch**

---

## P3 — Future Phases (Post-64)

- [x] **Phase 64: Release Readiness (v2.7.0+)** — Documentation Freeze + E2E builds verified
- [x] **Phase 65: Marketplace & Ecosystem** — MCP registry, plugin engine, skills repos
- [x] **Phase 66: AI Command Center & Dashboards** — Jules, OpenCode, Billing, Tool Detector
- [x] **Phase 67: MetaMCP Submodule Assimilation** — Git submodule + MetaMCPBridgeService
- [x] **Phase 68: Bytedance DeerFlow Integration** — Super Agent harness, Python LangGraph gateway, NextJS Portal
- [x] **Phase 69: Deep Submodule Assimilation** — Natively embedded MetaMCP (proxy routing), MCP-SuperAssistant (browser extension bridge), jules-autopilot (cloud dev dashboard), and claude-mem (redundant memory pipeline) as foundational architectural pillars.
- [x] **Phase 70: Memory System Multi-Backend** — Selectable vector stores (LanceDB, ChromaDB, Pinecone), memory import/export, cross-session sync.
- [x] **Phase 71: RAG Pipeline & Context Harvesting** — Document intake, chunking strategies, embedding service abstraction.
- [x] **Phase 72: Production Hardening** — Docker production builds, health monitoring, rate limiting, auth middleware.
- [x] **Phase 73: Multi-Agent Orchestration & Swarm** — Swarm execution, multi-model debate, pair programming, consensus protocols.
- [x] **Phase 74: Frontend Type Closure & Dev Readiness** — Clean tsc across core + web, missing module stubs, tRPC v11 migration.
- [x] **Phase 75: Documentation Reality Sync & Stub Audit** — Synced DEPLOY.md, MEMORY.md, AGENTS.md to v2.7.33 reality. Stub audit: no critical P0 blockers.
- [x] **Phase 76: MetaMCP Backend Fix & Dev Readiness** — Fixed silent ESM startup hang (8 missing SQLite schema tables + tsx watch deadlock). All 4 services pass strict readiness.

---

## Release Verification Checklist (Gate)

- [x] `pnpm run check:dev-readiness` passes in strict mode with all critical services up
- [x] `apps/web` typecheck + build pass
- [x] `packages/core` typecheck pass
- [x] `pnpm run check:placeholders` passes (or equivalent placeholder scan)
- [x] No unresolved stub/simulated critical execution paths in P0 scope

---

*This file is intentionally execution-ordered for implementor-model handoff. All P0/P1/P2 items and the Release Verification Gate are now fully closed as of v2.7.35.*
