# Borg Handoff

_Last updated: 2026-03-11_

## Latest session update — startup orchestration + boot status handoff

### What is newly in place

This worktree now contains a real boot/readiness path aimed at the user’s “run `pnpm run dev` in Tabby and have Borg actually be ready” flow.

- `scripts/dev_tabby_ready.mjs`
  - root `pnpm run dev` now acts as a readiness wrapper instead of just launching turbo and hoping for the best
  - it:
    - starts the turbo web stack
    - reuses an existing core bridge on `3001` if already alive, otherwise starts the CLI/core path on `3100`
    - polls the dashboard for `startupStatus`, MCP, memory, browser, and session readiness
    - warms those routes once the dashboard responds
    - auto-opens `/dashboard` unless `BORG_DEV_READY_OPEN_BROWSER=0`
- `packages/core/src/routers/startupStatus.ts`
  - new boot snapshot builder that exposes one structured readiness contract instead of forcing the launcher to guess from scattered probes
  - readiness now reports:
    - MCP aggregator initialization
    - config-sync completion/error state
    - persisted MCP inventory counts
    - browser service state
    - session supervisor restore state
    - extension bridge state and connected clients
- `packages/core/src/routers/systemProcedures.ts`
  - now serves `startupStatus` through tRPC using live runtime plus persisted inventory counts
- `packages/cli/src/commands/start.ts`
  - `borg start` now has a single-instance lock under the Borg data dir
  - stale lock cleanup is supported
  - stale-port reuse is supported when the port is free and the user did not explicitly override it
  - startup now delegates to `startOrchestrator(...)` with explicit `host`, `trpcPort`, `startMcp`, `startSupervisor`, and `autoDrive`
- `packages/core/src/orchestrator.ts`
  - orchestrator startup is now parameterized instead of hard-wired
  - can start tRPC on a specific port and optionally start supervisor / MCP / auto-drive
- `packages/core/src/mcp/MCPAggregator.ts`
  - tracks initialization progress (`inProgress`, `initialized`, timestamps, last error)
- `packages/core/src/McpConfigService.ts` *(consumed via runtime typing and startup snapshot)*
  - config-sync state is surfaced so readiness can distinguish “service exists” from “startup work finished”
- `packages/core/src/supervisor/SessionSupervisor.ts` *(consumed via runtime typing and startup snapshot)*
  - restore status is surfaced so the dashboard can show whether session recovery completed

### Current validation from this handoff pass

- editor diagnostics checked for:
  - `scripts/dev_tabby_ready.mjs`
  - `packages/core/src/routers/startupStatus.ts`
  - `packages/cli/src/commands/start.ts`
  - `HANDOFF.md`
  - result: **no errors found**
- task run:
  - `shell: core: typecheck-marker`
  - result: **`CORE_TSC_OK`**

### Smoke validation follow-up completed

A real root `pnpm run dev` smoke pass was run after the handoff section above was written.

What the live probes proved:

- `http://127.0.0.1:3000/api/trpc/startupStatus?input={}` returned `200`
- `http://127.0.0.1:3000/dashboard` returned `200`
- `http://127.0.0.1:3001/health` returned `200`
- `http://127.0.0.1:3100/trpc/startupStatus?input={}` returned `200`
- `http://127.0.0.1:3000/api/trpc/mcp.getStatus?input={}` reported:
  - `initialized: true`
  - `serverCount: 7`
  - `toolCount: 26`
  - `connectedCount: 0`

That smoke run exposed two boot-truthfulness gaps, both now fixed:

1. **Memory false-positive readiness**
   - live `startupStatus` was reporting:
     - `ready: true`
     - `checks.memory.ready: true`
     - `checks.memory.initialized: false`
   - fix applied:
     - `packages/core/src/routers/startupStatus.ts`
       - memory readiness now requires `isMemoryInitialized`
     - `packages/core/src/MCPServer.ts`
       - `start()` now eagerly calls `initializeMemorySystem()`
     - `packages/core/src/routers/startupStatus.test.ts`
       - regression added so startup stays pending until memory is actually initialized

2. **MCP inventory count mismatch**
   - the startup snapshot exposed `checks.mcpAggregator.serverCount` as live-connected count only, which produced `0` even while the router had `7` known/persisted servers and `26` tools
   - fix applied:
     - `packages/core/src/routers/startupStatus.ts`
       - `checks.mcpAggregator.serverCount` now reports the known inventory count (`max(live, persisted, configured)`)
       - `checks.mcpAggregator.connectedCount` now exposes the live-connected count explicitly
     - `packages/core/src/routers/startupStatus.test.ts`
       - regression added for "known inventory with zero live clients"

### Validation after the follow-up fixes

- `pnpm exec vitest run packages/core/src/routers/startupStatus.test.ts`
  - passed (`5` tests)
- `shell: core: typecheck-marker`
  - result: **`CORE_TSC_OK`**
- final live re-probe after restarting the dev stack:
  - `startupStatus.ready: true`
  - `checks.memory.ready: true`
  - `checks.memory.initialized: true`
  - `checks.mcpAggregator.serverCount: 7`
  - `checks.mcpAggregator.connectedCount: 0`

Interpretation: the startup snapshot is now materially more honest. It distinguishes "known router inventory" from "currently connected MCP clients" and no longer claims memory is ready before initialization actually completes.

### Important caution for the next model

This worktree is **very dirty** and not all modified files belong to the startup-readiness slice.

High-noise areas visible in the current worktree include:

- broad `apps/web/**` dashboard/navigation/integration edits
- broad `packages/core/**` MCP/admin/router/runtime edits
- generated or local-state files such as:
  - `mcp.json`
  - `mcp.jsonc`
  - `packages/cli/.borg-session.json`
- dirty submodules:
  - `external/MetaMCP`
  - `packages/MCP-SuperAssistant`
  - `packages/claude-mem`

Do **not** assume the whole worktree is one cohesive feature branch. Before making further edits, re-check git status/diffs and isolate the startup-readiness files from unrelated local experimentation.

### Recommended next move

The most valuable follow-up is a real end-to-end startup smoke run, not more structural editing:

1. run root `pnpm run dev`
2. confirm the launcher reaches ready state without timing out
3. confirm `/api/trpc/startupStatus` reports `ready: true`
4. confirm dashboard home and MCP system pages render the startup phases correctly
5. verify the core/CLI locking behavior when a second start is attempted

If that smoke run fails, debug from the `startupStatus` payload first instead of adding more bespoke probe logic to the launcher.

---

## Latest session update — MCP discovery truthfulness + stale-cache repair

### Follow-up fix — legacy bridge now probes the real core route names

The web-side tRPC fallback bridge had one more real bug: when falling back for legacy MCP dashboard requests, it was probing the wrong upstream procedure names.

- `apps/web/src/app/api/trpc/[trpc]/route.ts`
  - legacy MCP bridge lookup now probes top-level `mcpServers.list` before older `frontend.*` compatibility guesses
  - legacy bulk-import fallback now also includes top-level `mcpServers.bulkImport` before the old `frontend.*` aliases
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - added regression coverage proving a legacy MCP batch can recover via upstream `mcpServers.list`

### What was verified in this follow-up

- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts apps/web/tests/integration/mcp-to-dashboard.test.ts`
  - passed (`10` tests)
- live upstream probes after the patch showed:
  - `http://127.0.0.1:4000/trpc/mcpServers.list?input={}` → `404`
  - `http://127.0.0.1:3100/trpc/mcpServers.list?input={}` → connection refused until a real core process was started
  - `http://127.0.0.1:3000/api/trpc/mcpServers.list?input={}` → still `legacy-mcp-dashboard-bridge` while no core upstream was available

### Live validation with a real core process

A direct Borg core process was started on port `3100` for smoke validation.

With that live upstream available:

- `http://127.0.0.1:3100/trpc/mcpServers.list?input={}` returned live managed-server data
- `http://127.0.0.1:3100/trpc/mcp.getStatus?input={}` returned:
  - `initialized: true`
  - `serverCount: 7`
  - `toolCount: 26`
  - `connectedCount: 0`
- `http://127.0.0.1:3000/api/trpc/mcpServers.list?input={}` stopped returning compat headers and proxied the live upstream data instead
- `http://127.0.0.1:3000/api/trpc/mcp.getStatus?input={}` also proxied live upstream status (`serverCount: 7`, `toolCount: 26`)

Interpretation: the remaining “64 ready / 0 tools / local compat” behavior was not just stale dashboard state. It was also a runtime condition where the web app had no live Borg core upstream. Once a real core was available on `3100`, the dashboard proxy returned genuine MCP telemetry again.

The newest work closed a real MCP discovery defect and then wired the operator-side repair flow into the dashboard.

### Root cause fixed

The system was not failing binary discovery loudly enough.

- `packages/core/src/mcp/StdioClient.ts`
  - `listTools()` previously swallowed `tools/list` failures and returned `[]`
  - now supports strict behavior via `listTools({ throwOnError: true })`
- `packages/core/src/db/repositories/mcp-servers.repo.ts`
  - binary discovery now calls `client.listTools({ throwOnError: true })`
  - failed discovery is recorded as failure instead of fake-success zero-tool metadata
- `packages/core/src/mcp/serverMetadataCache.ts`
  - empty `ready` metadata caches are no longer considered reusable
- `packages/core/test/mcpDiscoveryFailureHandling.test.ts`
  - added regression coverage for strict discovery failure propagation and empty ready-cache rejection

### Dashboard repair flow added

The dashboard now treats `ready + 0 tools` as stale rather than healthy-looking success.

- `apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.ts`
  - added stale ready-cache detection
  - added `staleReadyCount` and `repairableCount` to the fleet summary model
  - bulk unresolved repair targeting now includes stale `ready` zero-tool entries
- `apps/web/src/app/dashboard/mcp/page.tsx`
  - added fleet summary visibility for stale ready caches
  - changed the bulk action to **Repair stale / unresolved**
  - added per-server stale-cache warning UI
  - added a prominent per-card **Repair cache** action for stale ready entries
  - kept force rediscovery available in secondary actions
- `apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.test.ts`
  - added regression coverage for stale ready detection and repair targeting

### What was verified

- `pnpm exec vitest run packages/core/test/mcpJsonConfig.test.ts packages/core/test/mcpDiscoveryFailureHandling.test.ts`
  - passed (`5` tests)
- `pnpm exec vitest run apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.test.ts`
  - passed (`8` tests)
- editor diagnostics on all touched backend and dashboard files were clean
- live dashboard check at `http://127.0.0.1:3000/dashboard/mcp`
  - confirmed presence of:
    - **Repair stale / unresolved**
    - **Stale ready**
    - **Repairable**

### Live smoke follow-up

A manual smoke pass was run against the live MCP dashboard after the UI patch landed.

- observed state before repair:
  - `Configured servers: 64`
  - `Aggregated tools: 0`
  - `Ready: 64`
  - `Stale ready: 64`
  - `Repairable: 64`
  - `Local compat: 64`
- triggered **Repair cache** for `borg-supervisor`
- result:
  - the action executed and refreshed `Last binary load`
  - server health remained `ready`
  - metadata source remained `local-binary`
  - cached tools remained `0`
  - the fleet remained in `Local compat` fallback mode

Interpretation: the dashboard repair wiring is functioning, but in this workspace the deeper blocker is that Borg is still surfacing config-backed local compat records instead of yielding live discovered tool telemetry. The next debugging target is therefore the runtime/core path behind local compat fallback rather than the dashboard action itself.

### Important operational note

Existing stale metadata already written to `mcp.jsonc` is not magically fixed by the backend patch alone. The new dashboard actions are the intended operator path to refresh those cached entries.

### Known unrelated workspace noise

A broader `apps/web` build path still surfaced pre-existing issues outside this change set, including:

- unresolved alias/module errors in other app areas on one build attempt
- a Next.js suspense/prerender issue on `/dashboard/mcp/logs`

Those were not introduced by this MCP discovery/dashboard work.

### Best next move

Use the new MCP dashboard repair flow against any existing `ready` / zero-tool servers, then do one end-to-end smoke pass of:

1. start dev
2. open `/dashboard/mcp`
3. repair a stale server entry
4. confirm tools appear in the aggregated catalog

In the current workspace, step 4 is still failing because the fleet remains in local compat fallback after repair. Debug that runtime path next.

## Previous session update — dashboard/runtime stabilization

The most recent implementation session closed the MCP dashboard runtime regressions that were previously called out here as unresolved.

### What was fixed

- `scripts/dev_tabby_ready.mjs`
  - improved startup readiness detection so the root dev launcher recognizes a live dashboard more reliably during Next.js cold starts
- `scripts/dev_tabby_ready_helpers.mjs`
  - added `isHttpProbeResponsive(...)` so any real HTTP response counts as proof that the web server exists
- `scripts/dev_tabby_ready_helpers.test.ts`
  - added readiness helper regression coverage
- `apps/web/src/utils/TRPCProvider.tsx`
  - removed the forced `methodOverride: 'POST'` from the batched tRPC client, which was causing dashboard query `405 Method Not Allowed` failures
- `apps/web/src/utils/TRPCProvider.test.tsx`
  - added a regression test to keep the query transport aligned
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
  - fixed proxied `mcpServers.bulkImport` handling by normalizing batched payloads to the plain array expected upstream and stripping the upstream `batch` query for that mutation
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - added regression coverage for the bulk import proxy normalization
- `apps/web/src/app/dashboard/cloud-dev/page.tsx`
  - added safe storage wrappers to avoid restricted-context `localStorage` failures

### What was verified

- focused route/provider/runtime tests passed for the touched dashboard transport code
- live replay of `POST /api/trpc/mcpServers.bulkImport?batch=1` returned `200 OK`
- temporary imported MCP server cleanup succeeded through the fixed route path
- current diagnostics on all touched files were clean
- `pnpm -C apps/web build --webpack` completed successfully in this workspace

### Practical status after the fix

- the previously documented MCP dashboard `405` query flood is resolved
- the previously documented `mcpServers.bulkImport` `400` is resolved
- startup/readiness reporting is more truthful, though a fresh end-to-end smoke run is still the next best confidence check

## What I did

I performed a repo-wide status audit focused on the current Borg 1.0 directive from `AGENTS.md`, then updated the canonical planning docs to match the codebase as it exists today.

### Sources reviewed

- root docs: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`, `VERSION`
- backlog/archive docs: `docs/DETAILED_BACKLOG.md`, `docs/PROJECT_STATUS.md`, `docs/HANDOFF.md`
- repo memories:
  - `/memories/repo/dashboard-mvp-validation.md`
  - `/memories/repo/session-supervisor-validation.md`
  - `/memories/repo/web-route-validation.md`
- source inventories and audits across:
  - `packages/core/**`
  - `apps/web/**`
  - `apps/borg-extension/**`
- focused read-only audits for:
  - implemented capabilities vs. stubs
  - dashboard real pages vs. parity/placeholder shells
  - backend routers/services that lack proportional UI representation
- diagnostics:
  - `get_errors` on `apps/web` and `packages/core` returned no active editor errors at audit time

## Files updated in this session

- `ROADMAP.md`
  - replaced the high-level milestone-only text with a reality-based roadmap
  - added a current implementation snapshot and explicit 1.0 blockers
- `TODO.md`
  - created a new canonical, ordered implementation queue at the repo root
- `HANDOFF.md`
  - created this handoff with evidence, findings, and next steps
- `CHANGELOG.md`
  - updated to record the documentation reality-sync pass

## High-confidence findings

### 1) Borg has more real 1.0 infrastructure than the old roadmap admitted

These areas are genuinely implemented enough to count as partial/shipped foundations:

- MCP router / aggregator
- provider routing / fallback chain
- session supervisor
- dashboard home + MCP + sessions + billing + integrations
- memory CRUD/summaries/import-export foundations
- startup readiness contract (`startupStatus`)

### 2) The repo still overstates product breadth

A meaningful portion of the dashboard is not a finished product surface, even when the UI looks polished.

The most important examples:

- `apps/web/src/app/dashboard/super-assistant/page.tsx` — parity/status shell, not full adapter implementation
- `apps/web/src/app/dashboard/autopilot/page.tsx` — iframe wrapper
- `apps/web/src/app/dashboard/webui/page.tsx` — iframe wrapper
- `apps/web/src/app/dashboard/agents/page.tsx` — minimal shell relative to implied ambition
- `apps/web/src/app/dashboard/workflows/page.tsx` — framework present, UX incomplete

### 3) The task workflow documented in `AGENTS.md` is currently broken in practice

- `tasks/active/` is empty
- `tasks/backlog/` is empty

This means implementor agents do not have a canonical work queue unless they infer one from other docs.

### 4) Several backend capabilities are real but not well represented in the UI

The strongest examples found during this audit:

- `packages/core/src/routers/serverHealthRouter.ts`
- `packages/core/src/routers/logsRouter.ts`
- `packages/core/src/routers/lspRouter.ts`
- `packages/core/src/routers/auditRouter.ts`
- `packages/core/src/routers/testsRouter.ts`
- `packages/core/src/routers/contextRouter.ts`
- `packages/core/src/routers/graphRouter.ts`
- `packages/core/src/routers/gitRouter.ts`
- `packages/core/src/routers/savedScriptsRouter.ts`

These should either receive real operator surfaces or be explicitly documented as internal/experimental.

### 5) Memory is real, but claude-mem parity is not

Borg already has:

- memory save/search/list flows
- summaries and prompt memory
- observation capture primitives
- import/export adapters
- a dedicated `claude-mem` parity/status surface

Borg still does **not** have full claude-mem parity for:

- hook lifecycle capture
- progressive disclosure context injection
- transcript compression
- full observation/search/timeline runtime story

The current docs should continue to be careful about this.

## Previously critical issue now resolved

The runtime issue previously tracked here is no longer open:

- `POST /api/trpc/mcp.getStatus?batch=1` no longer fails due to forced POST query transport
- `POST /api/trpc/mcpServers.bulkImport?batch=1` no longer fails due to batched proxy body mismatch

Most relevant files for future maintenance:

- `apps/web/src/utils/TRPCProvider.tsx`
- `apps/web/src/utils/TRPCProvider.test.tsx`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `apps/web/tests/integration/mcp-to-dashboard.test.ts`
- `scripts/dev_tabby_ready.mjs`
- `scripts/dev_tabby_ready_helpers.mjs`
- `scripts/dev_tabby_ready_helpers.test.ts`

## Validation performed during this session

### Diagnostics
- `apps/web` editor diagnostics: clean
- `packages/core` editor diagnostics: clean

### Documentation sanity
- root `HANDOFF.md` did not exist before this session
- root `TODO.md` did not exist before this session
- root `ROADMAP.md` was high-level and no longer reflected the actual breadth of shipped/partial work

## Recommended next implementor moves

1. Run a fresh full root smoke test for the dev flow:
  - `pnpm run dev`
  - confirm launcher readiness, dashboard load, polling, and MCP import flow together
2. Re-seed `tasks/active/` with small briefs for the next 1–3 items.
3. Keep the dashboard honest:
   - either demote parity/iframe pages from the main 1.0 story
   - or finish the smallest subset that materially improves Borg 1.0
4. After the smoke run, choose one of these as the next 1.0 polish pass:
   - session supervisor worktree + attach
   - provider-routing truthfulness
   - health/logs/LSP/tests operator surfaces
5. Consider cleaning ignored/generated workspace churn before relying on git status for future handoffs; the repo currently has heavy dev/build artifact noise.

## Notes for cross-model review

This handoff is designed to be compared against audits from Gemini, Claude, and Codex.

The strongest cross-check areas are:

- whether they agree that Borg 1.0 is already partially real and mainly suffering from product honesty and runtime-alignment issues
- whether they identify the same high-priority mismatch between backend capability and dashboard representation
- whether they agree that the recently fixed MCP dashboard POST compat regression should stay covered by tests and smoke validation
- whether they also flag the empty `tasks/` workflow as a governance failure
