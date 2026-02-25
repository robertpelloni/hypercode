# Borg — Master TODO List (Implementor Edition)

> **Updated**: 2026-02-24 | **Version**: 2.7.22 | **Phase**: 64 (Release Readiness)
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
- [ ] **Agent & Memory Wiring**: `agentRouter.ts`, `agentMemoryRouter.ts`, `memoryRouter.ts` -> Build detailed Agent State & Memory Viewer.
- [ ] **Infrastructure & Health**: `serverHealthRouter.ts`, `logsRouter.ts`, `metricsRouter.ts` -> Build "Pulse" system telemetry view.
- [ ] **Tools & Extensions**: `marketplaceRouter.ts`, `toolSetsRouter.ts`, `browserRouter.ts`, `shellRouter.ts` -> Enhance Tools Dashboard.
- [x] **DevOps & Git**: `gitRouter.ts`, `submoduleRouter.ts`, `symbolsRouter.ts` -> Build Submodule & Git Operations Dashboard.
- [ ] **Authentication & Billing**: `apiKeysRouter.ts`, `oauthRouter.ts`, `billingRouter.ts` -> Build comprehensive Provider Auth & Billing Matrix.
- [ ] **Advanced Features**: `darwinRouter.ts` (Evolution), `expertRouter.ts`, `policiesRouter.ts`, `savedScriptsRouter.ts`, `sessionRouter.ts`.

### 3) UI TODO/hardcoded fallback cleanup
- [ ] **Resolve Director endpoint test TODO**
- [ ] **Resolve MCP namespace placeholder behavior**
- [ ] **Complete prompt variable extraction implementation**

---

## P2 — Robustness, Security, and Extension Completion

### 0) First-party marker sweep follow-through
- [ ] **Reduce remaining critical-path “for now/mock/placeholder” assumptions in first-party source**

### 1) Browser extension completion
- [ ] **Finish fuzzy text matching click action**
- [ ] **End-to-end MCP bridge validation**

### 2) Shared UI `@ts-ignore` reduction pass
- [ ] **Remove remaining `@ts-ignore` in user-facing components**

### 3) Canonical docs consistency hardening
- [ ] **Keep `ROADMAP.md`, `TODO.md`, `STATUS.md`, `HANDOFF.md`, `CHANGELOG.md` synchronized after each merged fix batch**

---

## P3 — Future Phases (Post-64)

- [x] **Phase 64: Release Readiness (v2.7.0+)** — Documentation Freeze + E2E builds verified
- [x] **Phase 65: Marketplace & Ecosystem** — MCP registry, plugin engine, skills repos
- [x] **Phase 66: AI Command Center & Dashboards** — Jules, OpenCode, Billing, Tool Detector
- [x] **Phase 67: MetaMCP Submodule Assimilation** — Git submodule + MetaMCPBridgeService
- [ ] **Phase 68: Memory System Multi-Backend** — selectable vector stores, import/export
- [ ] **Phase 69: RAG Pipeline & Context Harvesting** — document intake, chunking, embedding

---

## Release Verification Checklist (Gate)

- [ ] `pnpm run check:dev-readiness` passes in strict mode with all critical services up
- [ ] `apps/web` typecheck + build pass
- [ ] `packages/core` typecheck pass
- [ ] `pnpm run check:placeholders` passes (or equivalent placeholder scan)
- [ ] No unresolved stub/simulated critical execution paths in P0 scope
- [ ] Canonical docs + version markers are synchronized

---

*This file is intentionally execution-ordered for implementor-model handoff and should be treated as the active backlog source of truth for Phase 64+ closure.*
