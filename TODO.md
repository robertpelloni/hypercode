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
- `tasks/active/` is empty.
- `tasks/backlog/` is empty.
- Implementor workflow is therefore undercut by the repo’s own docs.

**Do next**
- Seed task briefs for the top 1.0 items in this file.
- Keep each task small, testable, and scoped.

**Acceptance criteria**
- [ ] `tasks/active/` contains the next 1–3 concrete implementation tasks.
- [ ] `tasks/backlog/` reflects ordered follow-ons from this TODO.

## P2 — cleanup, coherence, and robustness

### 11) Rationalize stale documentation and route drift

**Issues found during audit**
- `README.md` still references `/dashboard/mcp` as the landing route even though recent repo memory says `/dashboard` is now the home surface.
- `docs/PROJECT_STATUS.md` and `docs/HANDOFF.md` are archive markers, not current status sources.
- Historical docs still reference older version contexts and legacy phase framing.

**Acceptance criteria**
- [ ] README startup path and landing route match current behavior.
- [ ] Canonical docs are obvious from the root.
- [ ] Archived docs remain clearly marked archive-only.

### 12) Reduce stub debt in `packages/core/src/services/stubs/`

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

### 13) Keep experimental swarm/autonomy work behind an honest boundary

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
