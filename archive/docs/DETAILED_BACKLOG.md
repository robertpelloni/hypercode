# Detailed Backlog (Hypercode Primary Audit)

**Last Updated:** 2026-02-13  
**Version Context:** 2.6.3 (`VERSION.md` source of truth)  
**Purpose:** Implementation-ready queue for unfinished/partial Hypercode features discovered in the primary audit.

---

## Domain Coverage Matrix (Execution Target)

| Domain | Current State | Gaps to Close |
|---|---|---|
| MCP Router/Aggregator | Router + UI exist | Full lifecycle orchestration (discovery/health/reconnect/namespace/reranking) not fully delivered end-to-end |
| Memory | Functional baseline | TODO debt in chunking/filtering/provider abstraction; stronger UI provenance/confidence needed |
| Code Intelligence | Broad foundations | Remaining placeholder/simulated paths; stronger graph/LSP UX integration needed |
| Orchestration | Director/Council/Supervisor present | Sub-agent execution path still simulated in places |
| Provider/Billing | Mostly real | Quota/reset visibility and cross-provider UX consistency |
| Browser Extension | Scaffold only | Full MCP bridge, memory capture, session export/history integration |
| Session/Cloud | Local session baseline | Cloud session lifecycle parity, transfer, broadcast, pause/resume completeness |
| Interfaces | Many pages/components | Multiple surfaces still no-op/placeholder; backend capability not always represented |
| Integration Protocols | Partial | Policy/mesh/skill-assimilation/browser services need explicit router+UI exposure strategy |
| Advanced Features | Referenced | NotebookLM/computer-use/web-search/spec workflow integration not comprehensively wired |

---

## P0 — End-to-End Critical User Flows

### 1) Complete authentication UX wiring

- **Files:**
    - `apps/web/src/components/auth/LoginForm.tsx`
    - `apps/web/src/app/signup/page.tsx`
    - `apps/web/src/app/forgot-password/page.tsx`
- **Current issue:** Submit handlers are TODO placeholders.
- **Deliverable:** Real mutations with success/error handling and navigation outcomes.
- **Acceptance criteria:**
    - [ ] Login submits to backend auth endpoint.
    - [ ] Signup persists account and returns deterministic UI state.
    - [ ] Forgot password triggers reset flow and user-facing confirmation.

### 2) Replace placeholder/no-op dashboard surfaces with real capabilities

- **Files:**
    - `apps/web/src/components/GlobalSearch.tsx`
    - `apps/web/src/components/ConfigEditor.tsx`
    - `apps/web/src/components/SystemStatus.tsx`
    - `apps/web/src/components/TestStatusWidget.tsx`
    - `apps/web/src/components/RemoteAccessCard.tsx`
    - `apps/web/src/components/GraphWidget.tsx`
- **Current issue:** Recent stabilization replaced broken router references with static placeholder UI/no-op handlers.
- **Deliverable:** Re-enable real tRPC queries/mutations with safe fallback UX only when capability is truly unavailable.
- **Acceptance criteria:**
    - [x] Search executes query and returns actionable results.
    - [x] Config editor reads/writes persisted config.
    - [x] System status/test status/remote access report live backend state.
    - [x] Graph widget file-open behavior is functional.

### 3) Fix knowledge dashboard type and state integrity

- **File:** `apps/web/src/app/dashboard/knowledge/page.tsx`
- **Current issue:** `@ts-ignore` for `trpc.expert.*`; duplicated coder state block in component body.
- **Deliverable:** Typed endpoint usage, deduplicated state logic, and stable compile-time contracts.
- **Acceptance criteria:**
    - [x] No `@ts-ignore` around `trpc.expert` interactions.
    - [x] Coder state defined once with a single source of truth.
    - [x] Page builds without hidden type bypasses.

---

## P1 — Backend Realism & Persistence

### 4) Replace simulated sub-agent execution with real model/tool path

- **File:** `packages/core/src/agents/SubAgents.ts`
- **Current issue:** Research/Code agents use delay-based simulation and TODO comments.
- **Deliverable:** Execute through model selector and available tools/services.
- **Acceptance criteria:**
    - [ ] ResearchAgent invokes real DeepResearch path.
    - [ ] CodeAgent emits real generation/editing output with traceable provider metadata.

### 5) Harden knowledge/research service implementation quality

- **Files:**
    - `packages/core/src/services/DeepResearchService.ts`
    - `packages/core/src/services/KnowledgeService.ts`
- **Current issue:** Placeholder assumptions and simplified relation handling.
- **Deliverable:** Deterministic behavior with explicit capability boundaries.
- **Acceptance criteria:**
    - [ ] Relation traversal and node retrieval behavior is documented and testable.
    - [ ] Service output indicates provenance and confidence semantics where applicable.

### 6) Persist kanban state changes to backend

- **File:** `packages/ui/src/components/kanban-board.tsx`
- **Current issue:** Drag/drop state is local-only and lost on refresh.
- **Deliverable:** Mutation-based persistence + optimistic UI + rollback.
- **Acceptance criteria:**
    - [ ] Status changes survive page reload.
    - [ ] Failed persistence visibly reverts local state.

### 6.1) Replace simulated orchestration paths with real execution contracts

- **Files:**
    - `packages/core/src/agents/SubAgents.ts`
    - `packages/core/src/agents/Researcher.ts`
    - `packages/core/src/orchestrator/SystemWorkflows.ts`
- **Current issue:** Simulated/stub execution remains in critical orchestration paths.
- **Deliverable:** ModelSelector + tool-driven execution with telemetry and deterministic error semantics.
- **Acceptance criteria:**
    - [ ] No simulated result payloads in production orchestration path.
    - [ ] Execution traces include provider/model/tool metadata.

### 6.2) Scale external link ingestion with queue telemetry

- **Files:**
    - `scripts/sync_master_index.mjs`
    - `scripts/resources-list.json`
    - `scripts/ingestion-status.json`
    - `HYPERCODE_MASTER_INDEX.jsonc`
- **Current issue:** Corpus growth outpaced manual index updates; queue state (processed/pending/failed) lacked canonical tracking.
- **Deliverable:** Deterministic synchronization pipeline with per-entry ingestion status and queue metrics.
- **Acceptance criteria:**
    - [x] Canonical index synchronization script exists and runs from repo root.
    - [x] `HYPERCODE_MASTER_INDEX` includes queue telemetry fields and per-entry fetch status metadata.
    - [x] Known fetch failures can be persisted independently of manual edits.
    - [x] Incremental fetch outcome writer appends live status updates automatically.
    - [x] Dashboard surface renders ingestion queue and retry actions.

---

## P2 — Technical Debt with Delivery Impact

### 7) Environment-safe tRPC endpoint strategy

- **File:** `apps/web/src/utils/TRPCProvider.tsx`
- **Current issue:** Hardcoded endpoint `http://localhost:4000/trpc`.
- **Deliverable:** Env-driven URL resolution supporting local/dev/prod.
- **Acceptance criteria:**
    - [x] No hardcoded localhost endpoint in production path.
    - [x] Clear fallback and validation error messaging.

### 8) Core service debt cleanup pass

- **Files:**
    - `packages/core/src/services/MemoryManager.ts`
    - `packages/core/src/services/ProjectTracker.ts`
    - `packages/core/src/installer/AutoConfig.ts`
- **Current issue:** TODO/stubbed behavior in memory chunking/filtering, tracker parsing heuristics, and autoconfig portability.
- **Deliverable:** Reduced TODO surface plus tests for refactored behavior.
- **Acceptance criteria:**
    - [x] TODO markers replaced with implemented behavior or explicit issue IDs.
    - [x] Unit coverage added/updated for newly hardened paths.

### 9) Router modularization and consistency

- **Files:**
    - `packages/core/src/trpc.ts`
    - `packages/core/src/routers/expertRouter.ts`
- **Current issue:** Router aggregation file remains oversized; expert router style diverges from modern patterns.
- **Deliverable:** Extract inline routers and normalize import/singleton conventions.
- **Acceptance criteria:**
    - [x] `trpc.ts` reduced to composition layer.
    - [x] Expert router follows current project conventions.

### 9.1) Service exposure audit (backend capability vs UI representation)

- **Files/Areas:**
    - `packages/core/src/services/MeshService.ts`
    - `packages/core/src/services/SkillAssimilationService.ts`
    - `packages/core/src/services/PolicyService.ts`
    - `packages/core/src/services/BrowserService.ts`
- **Current issue:** Implemented capability exists without complete router/UI representation or explicit archival decision.
- **Deliverable:** For each service, either:
    1) fully expose via router + dashboard, or
    2) mark as intentionally internal/experimental with documentation and gating.
- **Acceptance criteria:**
    - [x] No “orphaned” production-intended service remains undocumented/unrouted.
    - [x] UI reflects enabled capability set (with labels/tooltips/feature-state clarity).

---

## P3 — Documentation & Release Discipline

### 10) Single-source operational documentation

- **Files:**
    - `STATUS.md`
    - `ROADMAP.md`
    - `handoff.md`
    - `docs/PROJECT_STATUS.md`
    - `docs/HANDOFF.md`
- **Current issue:** Version/status drift across parallel docs.
- **Deliverable:** Canon + archival labeling for non-canonical files.
- **Acceptance criteria:**
    - [x] All active docs agree on current version and phase.
    - [x] Legacy docs explicitly labeled archival with references to canonical files.

### 11) Add placeholder regression checks

- **Scope:** `apps/web` and `packages/core`
- **Current issue:** Placeholder/no-op behavior can silently re-enter production during quick stabilization cycles.
- **Deliverable:** CI script/checklist that flags known placeholder patterns.
- **Acceptance criteria:**
    - [x] Release process blocks on unresolved critical placeholder markers.

### 12) Extension surfaces parity plan

- **Files/Areas:**
    - `apps/extension/src/*`
    - `packages/vscode/*`
- **Current issue:** Browser extension appears scaffold-level; VS Code extension compiles but requires parity map against roadmap commitments.
- **Deliverable:** Capability matrix + minimum viable parity milestones across dashboard, VS Code observer, and browser extension.
- **Acceptance criteria:**
    - [x] Documented parity matrix checked into docs.
    - [x] Each extension capability tagged as shipped/partial/not started with owner task links.

---

## Recommended Execution Order

1. P0 auth + dashboard critical wiring
2. P0 knowledge typing/state cleanup
3. P1 sub-agent realism + kanban persistence
4. P2 endpoint/debt/modularization cleanup
5. P3 documentation governance + regression guardrails
