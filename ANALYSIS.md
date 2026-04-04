# HyperCode Stabilization Analysis — 2026-04-03

## Summary
This pass focused on **stabilization-first Go sidecar expansion** and a small **Maestro terminal-history UX fix**. The work stayed aligned with the current repo policy in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`: improve operator-facing reliability and truthful fallback behavior before speculative platform expansion.

## Truthfulness labels

### Stable
- `go build -buildvcs=false ./cmd/hypercode` currently succeeds.
- `pnpm run build:workspace` currently succeeds across the workspace.
- The new Go code added in this pass compiles and is wired into the Go HTTP server.
- The Maestro quick action change for clearing terminal history builds successfully as part of the workspace build.

### Beta
- The Go sidecar now exposes additional native fallback surfaces for:
  - provider auto-routing improvements
  - native workflow execution endpoints
  - native supervisor endpoints
  - native session export
  - native git submodule update orchestration
- These surfaces compile and are route-registered, but they are still young and should be treated as beta until exercised with targeted API-level tests.

### Experimental
- The native workflow engine is a lightweight DAG executor with shell-command steps. It is useful and functional, but it is not yet a full parity replacement for every workflow feature exposed by the TypeScript side.
- The native supervisor HTTP surface is functional for create/start/stop/list/status flows, but it does not yet provide the same breadth of logs/streaming/inspection semantics as the mature TS path.
- The native session export path works as a file-based exporter and manifest writer, but it is not yet a comprehensive parity layer for every external session ecosystem.
- Concurrent native git submodule updating is implemented, but it should be considered experimental because some submodule remotes in this repo are known to be brittle or unavailable.

### Vision / still blocked
- `apps/maestro-native` Qt/Wails-adjacent native ambitions remain partially blocked by the external `bobui` toolchain state, especially missing generated Qt build tooling like `moc.exe` in the current local setup.
- Full Go parity for all TypeScript orchestration surfaces is still an ongoing migration, not a completed state.

---

## Work completed in this pass

### 1. Go provider routing expansion
File: `go/internal/ai/llm.go`

Added broader native provider coverage and better fallback selection logic.

#### Implemented
- Added `GeminiProvider` using Google Generative Language API.
- Added `DeepSeekProvider` using an OpenAI-compatible endpoint.
- Added `OpenRouterProvider` using an OpenAI-compatible endpoint.
- Added `ProviderPriority` routing order with env-var-driven selection.
- Added `AutoRouteWithModel()` for model override support.
- Added `ListConfiguredProviders()` to inspect configured native providers.

#### Result
The Go sidecar is no longer limited to just Anthropic/OpenAI for native fallback routing. It can now truthfully attempt a broader set of providers when the TS control plane is unavailable.

#### Status
**Beta** — compiled and integrated, but not yet validated with live API calls in this pass.

---

### 2. Native workflow engine
Files:
- `go/internal/workflow/engine.go`
- `go/internal/workflow/builtins.go`
- `go/internal/httpapi/workflow_handlers.go`
- `go/internal/httpapi/server.go`

Implemented a lightweight native Go workflow system.

#### Implemented
- DAG-style workflow model with:
  - step dependency resolution
  - topological sorting
  - step status tracking
  - concurrent execution where dependency structure allows it
  - output passing between dependent steps
- Built-in workflows:
  - `full-build`
  - `submodule-sync`
  - `lint-test`
- New native endpoints:
  - `/api/workflows/native`
  - `/api/workflows/native/get`
  - `/api/workflows/native/run`
  - `/api/workflows/native/create`

#### Important truthfulness note
This is **not** a complete replacement for every existing TypeScript workflow surface. It is a native fallback executor for practical shell-based workflows.

#### Status
**Experimental** — compiles, route-registered, suitable for iterative expansion.

---

### 3. Native supervisor API wiring
Files:
- `go/internal/httpapi/native_supervisor_handlers.go`
- `go/internal/httpapi/server.go`

Connected the existing Go supervisor manager to first-class HTTP endpoints.

#### Implemented
- Native endpoints:
  - `/api/supervisor/native/list`
  - `/api/supervisor/native/create`
  - `/api/supervisor/native/start`
  - `/api/supervisor/native/stop`
  - `/api/supervisor/native/status`
- Server boot now initializes:
  - `supervisorManager`
  - `workflowEngine`

#### Result
The supervisor code is no longer just a library surface; it is now reachable through HTTP in the sidecar.

#### Status
**Beta** — compiles and is usable, but still narrower than the TS session/supervisor ecosystem.

---

### 4. Native session export
Files:
- `go/internal/sessionimport/exporter.go`
- `go/internal/httpapi/session_export_handlers.go`
- `go/internal/httpapi/server.go`

Expanded the exporter from a manifest stub into a practical file export flow.

#### Implemented
- Added file-based export logic that:
  - scans session candidates
  - copies source content into an export directory
  - records metadata per exported item
  - writes `export-manifest.json`
- Added native endpoint:
  - `/api/import/export-native`

#### Important truthfulness note
This exporter currently acts as a practical filesystem export/packaging path. It should not be described as universal parity for every import/export format.

#### Status
**Beta** — compiled and integrated.

---

### 5. Native git submodule orchestration fallback
Files:
- `go/internal/git/submodules.go`
- `go/internal/httpapi/git_handlers.go`

Added a native Go path for `submodule.updateAll` fallback behavior.

#### Implemented
- `ListSubmodules()` parses `git submodule status`
- `UpdateAll()`:
  - initializes submodules recursively
  - updates submodules concurrently
  - captures per-submodule result status/output
- HTTP fallback handler attempts upstream first, then executes native Go orchestration if upstream is unavailable.

#### Important truthfulness note
This is especially useful in this repo because some submodules are known to have remote inconsistencies. The code handles that with per-submodule reporting, but the surrounding ecosystem is still operationally fragile.

#### Status
**Experimental** — good fallback utility, but needs targeted runtime exercise against real remote states.

---

### 6. Maestro terminal history clear action improvement
File:
- `apps/maestro/src/renderer/components/QuickActionsModal.tsx`

#### Implemented
Updated the “Clear Terminal History” quick action so it now clears:
- legacy `shellLogs`
- terminal-tab logs when terminal tabs exist

#### Why this matters
The previous behavior only cleared the legacy log array, which could leave visible terminal-tab history intact and create confusing UX.

#### Status
**Stable** for the changed behavior within current build validation.

---

## Validation performed

### 1. Go validation
Command:
```bash
cd go && go build -buildvcs=false ./cmd/hypercode
```

Result:
- **Succeeded** with no reported compile errors after final fixes.

### 2. Workspace validation
Command:
```bash
pnpm run build:workspace
```

Result:
- **Succeeded**.
- Workspace build completed successfully.

### 3. Notable warnings still present during workspace build
These are warnings, not blockers, but they should be kept visible:
- `apps/cloud-orchestrator` warns that `pnpm.overrides` is defined below workspace root and will not take effect there.
- Maestro Vite/browser build logs include existing warnings around:
  - browser externalization of `crypto`
  - large chunk sizes
  - some dynamic/static import overlap
  - CSS minification warning around malformed CSS content already present elsewhere

These warnings predated this pass’s Go work and did **not** block successful builds.

---

## Files added or changed in this pass

### Added
- `go/internal/git/submodules.go`
- `go/internal/httpapi/git_handlers.go`
- `go/internal/httpapi/native_supervisor_handlers.go`
- `go/internal/httpapi/session_export_handlers.go`
- `go/internal/httpapi/workflow_handlers.go`
- `go/internal/workflow/engine.go`
- `go/internal/workflow/builtins.go`

### Modified
- `go/internal/ai/llm.go`
- `go/internal/httpapi/server.go`
- `go/internal/sessionimport/exporter.go`
- `apps/maestro/src/renderer/components/QuickActionsModal.tsx`
- `ANALYSIS.md`

---

## Remaining gaps / next recommended steps

### Recommended next
1. Add targeted API-level tests for the new native Go endpoints:
   - workflows
   - supervisor native routes
   - export-native
   - submodule update fallback
2. Add structured logging around workflow execution and supervisor lifecycle events.
3. Add cancellation and safer execution constraints for native workflow shell steps.
4. Improve provider routing observability so the dashboard can show which native provider path was selected and why.
5. Normalize submodule path/base extraction for Windows path edge cases if needed.
6. Continue Maestro migration away from legacy `shellLogs`; current code still intentionally retains compatibility fallbacks for sessions without terminal tabs.

### Still blocked / external dependency
- `bobui` / Qt native toolchain completion is still required before claiming successful native Qt binary compilation for `apps/maestro-native`.

---

## Follow-up stabilization pass — native endpoint regression coverage
After shipping the native workflow/supervisor/export surfaces, a follow-up pass focused on **regression coverage** and one important lifecycle fix.

### Additional fixes
- `go/internal/httpapi/workflow_handlers.go`
  - `handleNativeWorkflowRun` now detaches from the request context using `context.WithoutCancel(...)` before launching asynchronous workflow execution.
  - This fixes a real stability issue where the workflow could be canceled immediately when the HTTP request completed.
- `go/internal/httpapi/native_supervisor_handlers.go`
  - `handleNativeSupervisorStart` now detaches from the request context before starting supervised processes.
  - This fixes a real stability issue where supervised commands could be tied to the lifetime of the originating HTTP request.

### Added regression tests
- `go/internal/workflow/engine_test.go`
  - verifies dependency-output propagation across workflow steps
  - verifies dependent-step skipping when an upstream step fails
- `go/internal/httpapi/native_endpoints_test.go`
  - verifies native workflow create/list/get/run flows
  - verifies native supervisor create/list/start/status flows
  - verifies native session export endpoint writes exported artifacts and manifest

### Validation performed in the follow-up pass
Commands run:
```bash
cd go && go test ./internal/workflow -run 'TestWorkflow'
cd go && go test ./internal/httpapi -run 'TestNative(Workflow|Supervisor|SessionExport)'
cd go && go test ./internal/sessionimport -run 'Test'
cd go && go build -buildvcs=false ./cmd/hypercode
```

Results:
- all newly added targeted tests passed
- Go sidecar build passed

### Important validation note
A broader run of `go test ./internal/httpapi` initially reported several failures on bridge/fallback routes. Those failures were investigated in the next pass and a meaningful subset was fixed directly.

## Follow-up bridge/fallback repair pass
A subsequent stabilization pass fixed several **truthfulness and compatibility regressions** in extracted Go handlers.

### Additional fixes in this pass
- `go/internal/httpapi/memory_handlers.go`
  - `handleMemorySearch` now behaves as a true bridge-first handler:
    - upstream procedure: `memory.query`
    - local fallback: empty-or-real local SQLite search results with explicit fallback metadata
  - `handleMemoryContexts` now bridges to `memory.listContexts` and falls back to the local contexts registry via `.hypercode/memory/contexts.json`
  - `handleMemorySectionedStatus` now bridges to `memory.getSectionedMemoryStatus` and includes explicit fallback metadata when using local sectioned-memory status
- `go/internal/httpapi/mcp_handlers.go`
  - `handleMCPStatus` now bridges to `mcp.getStatus` and falls back to local harness summary data with lifecycle mode fields preserved
  - `handleMCPTools` now bridges to `mcp.listTools` and falls back to source-backed local tool inventory
  - `handleMCPSearchTools` now bridges to `mcp.searchTools`, preserves request payload shape (including `profile`), and falls back to local source-backed search results
  - `handleMCPRuntimeServers` now bridges to `mcp.listServers` and falls back to local runtime-server summaries
- `go/internal/httpapi/council_base_handlers.go`
  - `handleCouncilBaseDebate` now accepts both `objective` and `description` style payloads
  - upstream bridge payload now includes `description`, fixing compatibility with the existing test/route contract
  - local fallback still normalizes to a debate objective internally
- `go/internal/memorystore/search.go`
  - missing database files and missing tables now degrade to an empty result set instead of surfacing misleading internal errors for normal fallback flows

### Regression tests validated in this pass
Commands run:
```bash
cd go && go test ./internal/httpapi -run 'TestMemorySectionedStatusAndFormatsFallBackLocally|TestMemoryContextsFallsBackToLocalRegistry|TestReadOnlyMemoryRoutesFallBackLocally|TestMCPLifecycleModesFallBackToLocalState|TestCouncilBaseBridgeRoutes|TestMCPBridgeRoutes|TestMCPReadRoutesFallBackToLocalSummary|TestMCPSearchToolsFallsBackToLocalInventory|TestMemoryBridgeRoutes'
cd go && go test ./internal/httpapi -run 'Test(Native(Workflow|Supervisor|SessionExport)|MemorySectionedStatusAndFormatsFallBackLocally|MemoryContextsFallsBackToLocalRegistry|ReadOnlyMemoryRoutesFallBackLocally|MCPLifecycleModesFallBackToLocalState|CouncilBaseBridgeRoutes|MCPBridgeRoutes|MCPReadRoutesFallBackToLocalSummary|MCPSearchToolsFallsBackToLocalInventory|MemoryBridgeRoutes)'
cd go && go test ./internal/workflow ./internal/sessionimport
cd go && go build -buildvcs=false ./cmd/hypercode
```

Results:
- all targeted previously failing `httpapi` tests in scope now pass
- previously added native endpoint tests still pass
- `internal/workflow` and `internal/sessionimport` tests pass
- Go sidecar build passes

### Updated truthfulness assessment
The affected bridge/fallback routes are now more credible because they:
- preserve the existing TypeScript procedure names expected by tests and clients
- return bridge metadata consistently
- degrade to empty local results where appropriate instead of throwing avoidable internal errors

## Follow-up git fallback hardening pass
After the bridge/fallback repair work, the next stabilization pass hardened the native git submodule fallback implementation and extended regression coverage.

### Additional fixes in this pass
- `go/internal/git/submodules.go`
  - replaced brittle ad-hoc submodule status parsing with dedicated helpers:
    - `parseSubmoduleStatusLine(...)`
    - `parseSubmoduleStatusOutput(...)`
  - parsing no longer relies on slicing off the first character of a status line
  - parsed submodule paths are now sorted deterministically
  - update report details are now sorted deterministically for more stable behavior and easier testing
  - `filepathBase(...)` now handles both forward-slash and backslash style paths safely
- `go/internal/git/submodules_test.go`
  - covers status-line parsing for:
    - clean entries
    - missing entries (`-`)
    - modified entries (`+`)
    - conflicted entries (`U`)
    - malformed / blank lines
  - covers deterministic sorted output parsing
  - covers slash and backslash base-name extraction
- `go/internal/httpapi/git_native_test.go`
  - covers `/api/submodules/update-all` native fallback behavior in a real temporary git repo with no submodules
  - verifies fallback metadata and empty-report semantics (`total=0`, `successful=0`, `failed=0`)

### Validation performed in this pass
Commands run:
```bash
cd go && go test ./internal/git ./internal/httpapi -run 'Test(SubmoduleUpdateAllFallsBackToNativeGitReport)'
cd go && go test ./...
cd go && go build -buildvcs=false ./cmd/hypercode
```

Results:
- targeted git/httpapi fallback test passed
- **entire Go test suite passed**
- Go sidecar build passed

### Major milestone
At this point in the stabilization sequence:
- the repaired `httpapi` bridge/fallback surfaces are green
- the new native workflow/supervisor/export tests are green
- the native git fallback tests are green
- **`cd go && go test ./...` is green**

## Follow-up MCP and provider-routing test coverage pass
With the core Go suite green, the next stabilization pass added regression coverage around MCP inventory/ranking and native provider selection behavior.

### Additional fixes and hardening in this pass
- `go/internal/ai/llm.go`
  - extracted provider selection into a testable helper: `resolveProviderSelection()`
  - `ListConfiguredProviders()` now deduplicates alias-backed providers (notably Google via `GOOGLE_API_KEY` and `GEMINI_API_KEY`)
- `go/internal/ai/llm_test.go`
  - verifies provider priority ordering (`anthropic > google > openai > deepseek > openrouter`)
  - verifies Gemini alias resolution via `GEMINI_API_KEY`
  - verifies configured-provider listing is deduplicated
  - explicitly clears ambient workstation provider env vars inside tests to avoid false results from the local machine environment
- `go/internal/mcp/inventory_test.go`
  - verifies JSONC config loading with comment stripping
  - verifies mixed inventory loading from both:
    - config (`mcp.json`/`mcp.jsonc`)
    - SQLite database (`packages/core/metamcp.db`)
  - verifies server/tool normalization and database-source preference when DB-backed tool rows are present
- `go/internal/mcp/ranking_test.go`
  - verifies token normalization/filtering
  - verifies ranking prefers strong name matches over weaker description matches
  - verifies tags/semantic groups contribute to ranking
  - verifies empty-query ranking behaves as a stable default listing
- `go/internal/providers/routing_test.go`
  - verifies catalog entries inherit configured/authenticated status from provider snapshots
  - verifies routing summaries reflect configured providers for coding/planning task preferences

### Validation performed in this pass
Commands run:
```bash
cd go && go test ./internal/mcp ./internal/ai ./internal/providers
cd go && go test ./...
cd go && go build -buildvcs=false ./cmd/hypercode
```

Results:
- targeted MCP / AI / providers tests passed
- full Go suite remained green
- Go sidecar build passed

### Updated truthfulness assessment
This pass did not introduce large new runtime surfaces; it improved confidence and correctness around existing ones:
- MCP inventory loading behavior is now covered for both config and DB-backed sources
- MCP ranking behavior is now regression-tested
- provider selection order is now testable and less vulnerable to environment-specific ambiguity
- provider alias handling is now more truthful in configured-provider summaries

## Follow-up supervisor and exporter coverage pass
With MCP/provider behavior covered, the next stabilization pass added regression coverage for the Go supervisor and session exporter.

### Additional coverage in this pass
- `go/internal/supervisor/supervisor_test.go`
  - verifies duplicate session creation is rejected
  - verifies a short-lived supervised process reaches `stopped`
  - verifies missing sessions return an error on start
  - verifies a failing process restarts according to `MaxRestarts` and eventually reaches `failed`
  - verifies session metadata is captured correctly at creation time
  - uses short-lived commands only; no long-running process management was introduced
- `go/internal/sessionimport/exporter_test.go`
  - verifies `BuildManifest()` reflects candidate counts and timestamps
  - verifies `ExportSessions()` writes exported session files and `export-manifest.json`
  - verifies exported content matches the source content
  - verifies default export directory behavior when no output path is provided

### Validation performed in this pass
Commands run:
```bash
cd go && go test ./internal/supervisor ./internal/sessionimport
cd go && go test ./...
cd go && go build -buildvcs=false ./cmd/hypercode
```

Results:
- targeted supervisor/sessionimport tests passed
- full Go suite remained green
- Go sidecar build passed

### Updated truthfulness assessment
The Go sidecar now has meaningful test coverage across more of its critical local-runtime responsibilities:
- HTTP bridge/fallback routes
- workflow execution
- supervisor process lifecycle basics
- session export generation
- MCP inventory/ranking
- provider selection/routing summaries
- native git submodule fallback behavior

## Follow-up council/sync coverage and CLI startup resilience pass
A later stabilization pass addressed two additional areas:
1. regression coverage for the Go council debate engine and BobbyBookmarks sync
2. an operator-facing startup fix for the CLI when port `4000` is already occupied by an existing HyperCode instance

### Additional coverage and fixes in this pass
- `go/internal/orchestration/council.go`
  - introduced a test seam via package-level `autoRoute` indirection so council debate tests can run deterministically without calling live provider APIs
- `go/internal/orchestration/council_test.go`
  - verifies approved debate flow
  - verifies rejected debate flow
  - verifies architect-stage provider errors are propagated clearly
- `go/internal/sync/bobbybookmarks.go`
  - tightened response/body handling inside the pagination loop
  - explicit decode errors are now reported in `SyncReport.Errors`
  - explicit `stmt.Close()` / `tx.Commit()` error handling added for clearer failure reporting
- `go/internal/sync/bobbybookmarks_test.go`
  - verifies paginated BobbyBookmarks payloads are fetched and upserted into SQLite
  - verifies malformed JSON payloads are surfaced as sync-report errors instead of silently proceeding
- `packages/cli/src/commands/start.ts`
  - added `isHypercodeServer(host, port, fetchImpl)` health probing helper
  - `acquireSingleInstanceLock(...)` now distinguishes between:
    - a foreign process occupying the requested port
    - an already-running HyperCode instance occupying that port
  - when the port is occupied by a live HyperCode instance, startup now exits cleanly with a reuse message instead of failing hard
  - introduced `HypercodeAlreadyRunningError` to represent the non-fatal reuse case explicitly
- `packages/cli/src/commands/start.test.ts`
  - verifies occupied-port behavior still errors for non-HyperCode processes
  - verifies occupied-port behavior is treated as an already-running instance when HyperCode health checks succeed
  - verifies `isHypercodeServer(...)` detection against JSON health responses

### User-reported startup issue addressed
Observed from a real operator run:
- `start.bat` completed install/build steps
- the hub failed at the final CLI startup phase with:
  - `Port 4000 is already in use by another process`
- direct probing showed that `127.0.0.1:4000` was accepting TCP connections but returning generic Express-style `404 Cannot GET /...` responses for the initial HyperCode health probes

This revealed **two distinct occupied-port cases**:
1. the port is occupied by an existing HyperCode instance → reuse it cleanly
2. the port is occupied by a different process and the user did not explicitly request that port → automatically fall forward to the next free control-plane port instead of failing hard

The CLI now handles both cases non-destructively.

### Additional startup hardening in the follow-up pass
- `packages/cli/src/commands/start.ts`
  - `acquireSingleInstanceLock(...)` now falls forward to the next available control-plane port **during lock acquisition**, not only later during core bind retry
  - this specifically fixes the case where startup previously failed before the existing runtime fallback logic even had a chance to run
  - startup now emits a clear note when the default port was occupied and a new port is selected
- `packages/cli/src/commands/start.test.ts`
  - added regression coverage verifying that a non-HyperCode process on the default port causes automatic fallback to the next free port when the user did not explicitly request a port

### Validation performed in this pass
Commands run:
```bash
pnpm exec vitest run packages/cli/src/commands/start.test.ts
cd packages/cli && pnpm run type-check
pnpm -C packages/cli build
cd go && go test ./internal/orchestration ./internal/sync
cd go && go test ./...
pnpm run build:workspace
```

Results:
- CLI startup tests passed (`26/26` in `start.test.ts`)
- CLI type-check passed
- CLI package build passed
- council/sync tests passed
- full Go suite remained green
- workspace build remained green

### Updated truthfulness assessment
This pass improved both operator UX and native-sidecar confidence:
- startup is now more truthful when an existing HyperCode instance is already serving the requested port
- startup is also more resilient when the default port is occupied by a different process, because it can now automatically fall forward to the next free port
- council fallback logic is now testable without live model calls
- BobbyBookmarks sync error handling is stricter and now covered by tests

## Follow-up quota-default migration pass (OpenRouter Free)
A later pass responded directly to real operator logs showing two independent problems in the TypeScript runtime:

1. **Node SQLite addon fragility on Windows / Node 24**
   - `better-sqlite3` failed to load
   - this degraded DB-backed startup services such as:
     - HyperIngest / `LinkCrawlerWorker`
     - debate history initialization
     - imported session persistence
     - transcript deduplication
2. **Hosted-provider quota exhaustion**
   - OpenAI returned `429` quota errors
   - Anthropic returned `400` insufficient credit errors
   - startup/import flows were then forced through provider failover behavior

### Design decision from those logs
Quota-sensitive TypeScript services should no longer default to paid OpenAI/Anthropic models when a free OpenRouter path is available.

### Runtime changes made in this pass
- `packages/ai/src/ModelSelector.ts`
  - introduced `DEFAULT_OPENROUTER_FREE_MODEL = 'xiaomi/mimo-v2-flash:free'`
  - default worker/supervisor selection chains now prefer OpenRouter free before paid cloud providers
  - OpenRouter credential detection added to the legacy selector (`OPENROUTER_API_KEY`)
- `packages/ai/src/LLMService.ts`
  - added executable OpenRouter support using the OpenAI-compatible API surface
  - OpenRouter client is now initialized from `OPENROUTER_API_KEY`
  - optional `OPENROUTER_BASE_URL`, `OPENROUTER_HTTP_REFERER`, and `OPENROUTER_X_TITLE` support included
- `packages/core/src/providers/ProviderRegistry.ts`
  - OpenRouter is now marked executable
  - OpenRouter default model switched from `openrouter/auto` to `xiaomi/mimo-v2-flash:free`
  - OpenRouter free model added as a first-class executable, zero-cost candidate
  - OpenRouter preferred task coverage added for coding / research / general / worker

### Hardcoded quota-sensitive service defaults switched to OpenRouter free
The following direct service calls were changed from paid defaults to:
- provider: `openrouter`
- model: `xiaomi/mimo-v2-flash:free`

Changed files:
- `packages/core/src/daemons/hyperingest/LinkCrawlerWorker.ts`
- `packages/core/src/services/SessionImportService.ts`
- `packages/core/src/services/HealerService.ts`
- `packages/core/src/services/DarwinService.ts`
- `packages/core/src/services/SkillAssimilationService.ts`
- `packages/core/src/reactors/MemoryHarvestReactor.ts`
- `packages/core/src/services/PreemptiveToolAdvertiser.ts`
- `packages/core/src/suggestions/SuggestionService.ts`
- `packages/core/src/agents/swarm/SwarmOrchestrator.ts` (default model)

### Council default-path support
Basic OpenRouter support was also extended into the council supervisor path:
- `packages/core/src/orchestrator/council/types.ts`
- `packages/core/src/orchestrator/council/supervisors/index.ts`
- `packages/core/src/orchestrator/council/services/config.ts`

This does **not** mean every council policy/template is now fully OpenRouter-optimized, but it does mean the default env-driven council config can now include an OpenRouter free supervisor instead of being locked to paid-provider assumptions.

### Validation performed in this pass
Commands run:
```bash
pnpm -C packages/ai test
pnpm -C packages/core exec vitest run src/providers/CoreModelSelector.test.ts src/routers/council/index.test.ts src/services/HealerService.test.ts src/services/SessionImportService.test.ts
pnpm -C packages/ai build
pnpm -C packages/core build
pnpm -C apps/web build
pnpm run build:workspace
```

Results:
- `packages/ai` tests passed
- targeted `packages/core` tests passed
- `packages/ai` and `packages/core` builds passed
- `apps/web` build passed
- full workspace build passed

### Important validation note
A broad `packages/core` test run still has unrelated noisy/failing areas in other suites, so this migration was validated using the smallest truthful targeted set covering:
- selector behavior
- OpenRouter execution path
- council config compatibility
- direct-service regression guard (`HealerService`)
- session import unchanged behavior under mocked LLM failures

## Follow-up startup resilience fix (SQLite-unavailable session import docs)
A real operator crash later showed one remaining non-truthful startup edge:
- `SessionImportService.scanAndImport()` already degraded gracefully when imported-session SQLite persistence failed
- but the final `writeInstructionDocs()` step still called `ImportedSessionStore.listInstructionMemories()` as if SQLite were always available
- when `better-sqlite3` was missing on Windows / Node 24, startup could still abort from imported-session instruction-doc generation even though the main SQLite error text explicitly claimed the control plane could continue running

### Fix made
- `packages/core/src/services/SessionImportService.ts`
  - `writeInstructionDocs()` now catches SQLite-unavailable failures from `listInstructionMemories()`
  - logs a concise degraded-mode warning via `formatOptionalSqliteFailure(...)`
  - returns `null` for `instructionDocPath` instead of aborting startup/import execution
  - auto-import startup iterations now run through a guarded helper so failed background scans are logged instead of surfacing as unhandled async failures
  - Prism DB discovery and `llm` CLI `logs.db` discovery now also emit concise degraded-mode SQLite warnings instead of dumping full native-binding probe noise
- `packages/core/src/daemons/hyperingest/LinkCrawlerWorker.ts`
  - SQLite-unavailable backlog access now logs once concisely instead of repeatedly printing noisy stack traces
- `packages/core/src/daemons/hyperingest/BobbyBookmarksSyncWorker.ts`
  - SQLite-unavailable sync failures now log once concisely and stop the current sync pass instead of failing row-by-row opaquely

### Regression coverage added
- `packages/core/src/services/SessionImportService.test.ts`
  - added coverage for the exact failure mode where `listInstructionMemories()` throws a `better-sqlite3`-missing / SQLite-unavailable error
  - added coverage for the guarded auto-import iteration path
  - verifies:
    - import scan still succeeds
    - `instructionDocPath` is `null`
    - failed auto-import iterations are swallowed/logged instead of escaping
    - warnings remain concise and do not dump the full native-binding probe spam

### Validation performed for this fix
```bash
pnpm -C packages/core exec vitest run src/services/SessionImportService.test.ts
pnpm -C packages/core build
```

Results:
- targeted `SessionImportService` regression suite passed
- `packages/core` build passed

## Go-primary architecture mandate (new explicit direction)
The migration target is now explicit and should govern future work:
- Go should become the **primary runtime/control plane**
- every meaningful backend feature/function should be ported, translated, or forked into Go
- TypeScript should be reduced over time to only the most crucial UI/client/compatibility roles until those can also be retired where practical

To make that direction concrete instead of aspirational, two planning docs were added:
- `docs/ai/planning/GO_PRIMARY_MIGRATION_PLAN.md`
- `docs/ai/planning/GO_PARITY_MATRIX.md`

These documents define:
- the authoritative target state
- parity status buckets (`Native Go`, `Bridge-first`, `Bridge-only`, `Missing`, `TS-only critical`)
- the highest-priority blockers to a truthful Go-primary claim
- the recommended migration order:
  1. Go-primary launcher/control-plane ownership
  2. remaining TS SQLite-backed startup-service migration
  3. MCP backend write/config parity
  4. orchestration/session/council parity
  5. dashboard/backend contract migration away from TS ownership

## Follow-up launcher step (Go-primary runtime selection)
The next concrete implementation step after defining the migration plan was to make launcher/runtime selection reflect that goal.

### What changed
- `packages/cli/src/commands/start.ts`
  - added `--runtime <auto|go|node>`
  - default runtime selection is now `auto`, which **prefers Go first**
  - added explicit Go config-dir derivation for the Go control plane (`.hypercode-go` sibling by default)
  - added Go health/readiness polling using the Go `/health` / `/api/health/server` surfaces
  - added Go child-process startup via `go run ./cmd/hypercode serve ...`
  - if `--runtime auto` is used and Go startup fails, launcher now falls back truthfully to the Node compatibility runtime
  - if `--runtime go` is used, startup fails explicitly instead of silently downgrading
  - integrated dashboard startup is now **intentionally skipped in Go runtime mode** with an explicit warning, because the current web UI still depends heavily on TS/tRPC compatibility contracts
  - added truthful warnings that `--no-mcp`, `--supervisor`, and `--auto-drive` currently map to Node-startup behavior more than Go-startup behavior

### Important truthfulness note
This is a **Go-primary launcher preference**, not full Go-primary product parity.

What is true now:
- the operator can explicitly select `go`, `node`, or `auto`
- `auto` prefers the Go control plane first
- Node remains the compatibility fallback when Go startup fails
- dashboard startup is treated honestly instead of pretending the web app is already fully Go-native

What is **not** true yet:
- the web dashboard is not fully Go-backed
- all Node startup flags do not yet map 1:1 to Go startup semantics
- the overall repo should still be described as **in migration toward Go-primary**, not fully there

### Validation performed for this launcher step
```bash
pnpm -C packages/cli exec vitest run src/commands/start.test.ts
pnpm -C packages/cli run type-check
pnpm -C packages/cli build
```

Results:
- CLI start tests passed (`33/33`)
- CLI type-check passed
- CLI build passed

## Follow-up Go ingestion step (native links backlog crawler)
The next stateful migration slice targeted one of the remaining TS-only startup-critical services:
- `packages/core/src/daemons/hyperingest/LinkCrawlerWorker.ts`

### Goal
Create a native Go execution path for backlog crawling/enrichment so this surface is no longer exclusively dependent on the TypeScript runtime.

### What changed
- added `go/internal/sync/linkcrawler.go`
  - native pending-link selection from `links_backlog`
  - HTTP fetch with timeout and browser-like headers
  - lightweight HTML metadata extraction for:
    - page title
    - description
    - favicon URL
    - visible text body
  - backlog row status transitions:
    - `pending` → `running` → `done` / `failed`
  - HTTP status persistence for crawl failures
  - optional tag classification hook
  - default AI-backed tag classifier wired through Go `ai.AutoRouteWithModel(...)` using `xiaomi/mimo-v2-flash:free`
- added `go/internal/sync/linkcrawler_manager.go`
  - Go-owned background worker lifecycle for backlog crawling
  - periodic loop execution
  - run counters / last report / last error / timestamps
  - clean start/stop behavior
- added `go/internal/httpapi/server.go` routes:
  - `POST /api/links-backlog/crawl-native`
  - `GET /api/links-backlog/crawler-native/status`
  - `POST /api/links-backlog/crawler-native/start`
  - `POST /api/links-backlog/crawler-native/stop`
- Go server now auto-starts the native link crawler by default during `ListenAndServe(...)`
  - can be controlled with env:
    - `HYPERCODE_NATIVE_LINK_CRAWLER_AUTOSTART`
    - `HYPERCODE_NATIVE_LINK_CRAWLER_INTERVAL_MS`
    - `HYPERCODE_NATIVE_LINK_CRAWLER_CLASSIFY_TAGS`
- updated Go API index metadata so the new routes are discoverable
- added regression coverage:
  - `go/internal/sync/linkcrawler_test.go`
  - `go/internal/sync/linkcrawler_manager_test.go`
  - `go/internal/httpapi/server_test.go`

### Important truthfulness note
This is **not yet** full cross-runtime ownership parity with the TS background worker.

What is true now:
- Go can natively crawl and enrich pending backlog links
- Go exposes that capability via real HTTP endpoints
- the Go server now owns a native crawler background loop when the Go control plane is the active runtime
- the native path is tested

What is not true yet:
- the TS `LinkCrawlerWorker` still exists in the mixed-runtime world
- overall repo behavior is still transitional because not every operator path is Go-only yet

So this surface should still be described as **Partial Native Go**, but it is materially closer to Go ownership than before.

### Validation performed for this crawler step
```bash
gofmt -w go/internal/sync/linkcrawler.go go/internal/sync/linkcrawler_test.go go/internal/sync/linkcrawler_manager.go go/internal/sync/linkcrawler_manager_test.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/sync ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted sync/httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up Go persistence step (native imported-session store)
The next migration slice targeted another TS-owned startup-critical persistence area:
- imported-session storage
- transcript-hash dedup
- imported-session memory rows
- instruction-doc generation
- maintenance stats

### What changed
- added `go/internal/sessionimport/store.go`
  - native imported-session store over `metamcp.db`
  - ensures imported-session tables/indexes exist when accessed from Go
  - transcript-hash dedup
  - archived transcript + sidecar metadata gzip persistence
  - imported-session memory row persistence
  - native list/get/instruction-memory/maintenance APIs at the package layer
  - native instruction-doc generation/listing
- added `go/internal/httpapi/server.go` route:
  - `POST /api/sessions/imported/persist-native`
- updated existing imported-session fallback handlers to prefer the native Go store before archive-only or scan-only fallbacks:
  - `/api/sessions/imported/list`
  - `/api/sessions/imported/get`
  - `/api/sessions/imported/instruction-docs`
  - `/api/sessions/imported/maintenance-stats`
  - `/api/sessions/imported/scan` summary fallback paths now merge/prefer locally persisted imported-session records when present
- added regression coverage:
  - `go/internal/sessionimport/store_test.go`
  - expanded `go/internal/httpapi/server_test.go`

### Important truthfulness note
This is a major step toward Go ownership, but it is **not yet** full native imported-session parity.

What is true now:
- Go has a real imported-session persistence layer
- Go owns transcript-hash dedup for this native lane
- Go can persist imported-session memory rows and regenerate imported instruction docs
- Go imported-session read fallbacks now prefer persistent local state instead of dropping immediately to archive-only/scan-only summaries
- Go exposes a native write surface (`persist-native`) for imported sessions

What is not true yet:
- full native scan/import parsing with the same richness as the TS `SessionImportService` is not complete
- broader retention-summary backfill/migration ownership is still partial
- the repo still contains the TS imported-session pipeline in the mixed-runtime world

### Validation performed for this imported-session step
```bash
gofmt -w go/internal/sessionimport/store.go go/internal/sessionimport/store_test.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/sessionimport ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted sessionimport/httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up Go persistence step (native debate history store)
The next stateful migration slice targeted another TS-only critical persistence lane:
- council debate history storage
- council history read/query/delete flows
- native fallback debate persistence when Go council execution is used

### What changed
- added `go/internal/orchestration/history.go`
  - native debate-history store over `metamcp.db`
  - native `council_debates` schema ensure/create path
  - record count, status, storage size
  - config/toggle state in the Go runtime
  - stats aggregation
  - list/get/delete/clear/supervisor-history operations
  - save path for native Go debate fallback results
- wired the Go server to own a native debate-history store
- updated `go/internal/httpapi/council_history_handlers.go`
  - native fallbacks for:
    - `status`
    - `getConfig`
    - `updateConfig`
    - `toggle`
    - `stats`
    - `list`
    - `get`
    - `delete`
    - `supervisorHistory`
    - `clear`
    - `initialize`
- updated `go/internal/httpapi/council_base_handlers.go`
  - native Go `council.debate` fallback now persists the resulting debate into the native Go debate-history store
- added/expanded regression coverage in `go/internal/httpapi/server_test.go`
  - council-history routes now verify native local-store fallback behavior
- full Go suite remained green after the change

### Important truthfulness note
This is a real native persistence upgrade, but not total parity yet.

What is true now:
- Go no longer needs the TS council history router for basic persisted council history reads/writes when upstream is unavailable
- native fallback debates are now saved into persistent history instead of disappearing after the response
- council history status/stats/list/get/delete/clear/supervisor-history all have a native Go fallback path

What is not true yet:
- TS and Go config semantics are not fully harmonized
- broader council orchestration/policy/config parity is still mixed
- the overall repo still has a mixed-runtime council world rather than total Go ownership

### Validation performed for this debate-history step
```bash
gofmt -w go/internal/orchestration/history.go go/internal/httpapi/council_history_handlers.go go/internal/httpapi/council_base_handlers.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/orchestration ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted orchestration/httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up Go ingestion step (native imported-session ingest)
The next migration slice moved imported-session handling beyond scan/export + persistence plumbing into a real native ingest path.

### What changed
- added `go/internal/sessionimport/ingest.go`
  - native scan-to-store ingest for supported **file-based** imported-session artifacts
  - JSON / JSONL transcript normalization
  - transcript-hash generation
  - heuristic memory extraction
  - retention-summary generation
  - persistence into the native Go imported-session store
  - instruction-doc regeneration after ingest
  - explicit skip reporting for currently unsupported DB-backed import artifacts
- added `go/internal/httpapi/server.go` route:
  - `POST /api/sessions/imported/ingest-native`
- added/updated regression coverage:
  - `go/internal/httpapi/server_test.go`
  - ingest route now verifies successful native file-based import plus truthful skipping of DB-backed candidates that are not yet implemented natively

### Important truthfulness note
This is a meaningful ownership upgrade, but not complete imported-session parity yet.

What is true now:
- Go can scan discovered imported-session artifacts
- Go can ingest supported file-based artifacts natively
- Go can derive basic heuristic memories and regenerate imported instruction docs from that native ingest path
- Go can persist those records into the native imported-session store
- unsupported DB-backed artifacts are skipped explicitly instead of being faked as ingested

What is not true yet:
- native DB-backed import parsing for `llm-cli` / Prism-style sources is not yet implemented
- full parity with the richer TS `SessionImportService` parsing/analysis path is still incomplete

### Validation performed for this native ingest step
```bash
gofmt -w go/internal/sessionimport/ingest.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/sessionimport ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted sessionimport/httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up Go parser step (DB-backed imported-session parity)
The next imported-session gap was the DB-backed artifact lane:
- `llm-cli` `logs.db`
- Prism `data.db`

### What changed
- added `go/internal/sessionimport/db_ingest.go`
  - native Prism DB parsing for:
    - `session_ledger`
    - `session_handoffs`
  - native `llm-cli` DB parsing for:
    - `conversations`
    - orphan `responses`
    - `tool_calls`
    - `tool_results`
  - transcript stitching for tool call/result context
  - metadata extraction for model ids, token counts, Prism fields, and working-directory hints
- updated `go/internal/sessionimport/ingest.go`
  - DB-backed candidates are no longer blanket-skipped
  - native ingest now expands DB artifacts into one-or-more imported-session records and persists them through the Go store
- added regression coverage:
  - `go/internal/sessionimport/db_ingest_test.go`
  - expanded `go/internal/httpapi/server_test.go` to exercise `ingest-native` against a real `llm-cli` SQLite DB

### Important truthfulness note
This meaningfully improves parity, but should still be described as **partial**, not complete.

What is true now:
- Go-native imported-session ingest now supports both file-based artifacts and key DB-backed artifacts
- Go no longer has to skip `llm-cli` / Prism DB artifacts in the native ingest lane
- Go can persist those imported sessions into the native store with heuristic memories and regenerated instruction docs

What is not true yet:
- the TS parser still contains broader ecosystem-specific richness and edge-case handling
- additional niche formats and special-case extraction paths may still lag behind TS

### Validation performed for this DB-backed parser step
```bash
gofmt -w go/internal/sessionimport/db_ingest.go go/internal/sessionimport/db_ingest_test.go go/internal/sessionimport/ingest.go go/internal/httpapi/server_test.go go/internal/httpapi/server.go
cd go && go test ./internal/sessionimport ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted sessionimport/httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP authority fix (configured-server JSONC-first reads)
The next migration slice returned to MCP backend authority and fixed an important internal inconsistency in the Go fallback path.

### Problem
Go already had native configured-server **mutation** fallbacks backed by local `mcp.jsonc`, but configured-server **read** fallbacks still preferred `metamcp.db` rows plus JSONC metadata overlay.

That meant the local source of truth for configured-server reads and writes did not match, which is the wrong shape for a Go-primary MCP config lane.

### What changed
- updated `go/internal/httpapi/server.go`
  - `/api/mcp/servers/configured` now prefers native JSONC-backed configured-server reads first
  - `/api/mcp/servers/get` now prefers native JSONC-backed configured-server reads first
  - local DB fallback remains available as a legacy secondary fallback when JSONC does not provide the configured server
- added `localConfiguredMCPServerByUUID(...)`
- updated MCP configured-server tests so they verify:
  - local JSONC is authoritative when present
  - DB remains secondary fallback behavior

### Important truthfulness note
This does **not** mean full MCP parity is complete.

What is true now:
- native configured-server create/update/delete already existed
- native configured-server read fallback now uses the same local source of truth (JSONC) as those writes
- Go MCP configured-server CRUD is materially more coherent than before

What is not true yet:
- full runtime mutation, telemetry, and metadata refresh parity is still incomplete
- some MCP admin/config surfaces remain bridge-heavy or placeholder-like

### Validation performed for this MCP authority step
```bash
gofmt -w go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP metadata step (truthful JSONC metadata inspection)
After aligning configured-server read/write authority around JSONC, the next improvement targeted the stale placeholder behavior in native metadata refresh/cache endpoints.

### What changed
- `go/internal/httpapi/server.go`
  - native configured-server metadata reload now performs a truthful local JSONC inspection/cache normalization pass instead of only stamping a generic placeholder state
  - cached tool metadata is preserved and normalized when present
  - transport/type hints are derived from the configured server entry
  - metadata source now differentiates between:
    - `jsonc-cache`
    - `jsonc-derived`
    - `cleared`
  - `reloadDecision` now distinguishes cache-backed inspection from cleared-cache state instead of always returning `go-local-placeholder`
- `go/internal/httpapi/server_test.go`
  - updated metadata refresh/cache tests to verify the new truthful semantics

### Important truthfulness note
This is better than the previous placeholder path, but it is still **not** a full binary/tool discovery refresh parity implementation.

What is true now:
- native metadata reload no longer pretends the same thing happened in every case
- if cached tools exist in JSONC metadata, Go reports that honestly
- if no cache exists, Go now says it only inspected local JSONC/config state and did not perform full binary probing
- clear-cache behavior is explicitly represented as a cleared local metadata state

What is not true yet:
- native Go metadata refresh still does not perform full downstream binary execution + tool discovery parity
- real tool schema/tool-count refresh from live server process probing remains incomplete in Go

### Validation performed for this metadata step
```bash
gofmt -w go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP live probe step (native stdio tools/list refresh)
The next MCP slice moved metadata refresh beyond JSONC/cache inspection into a real live probe path where practical.

### What changed
- `go/internal/httpapi/server.go`
  - native metadata reload now attempts a live stdio MCP `tools/list` probe when the configured server is:
    - local / command-backed
    - `STDIO`
    - not explicitly cache-only mode
  - successful live probe now produces metadata like:
    - `metadataSource: live-probe`
    - real `toolCount`
    - real `tools` payload
    - `lastSuccessfulBinaryLoadAt`
    - `reloadDecision: go-local-live-stdio`
  - probe failures now degrade truthfully back to JSONC/cache inspection semantics with explicit error state instead of pretending success
- `go/internal/mcp/client.go`
  - fixed child process env handling so stdio MCP child processes inherit the current environment and remain viable on Windows
  - switched outbound JSON-RPC request ids to strings so response correlation is robust instead of depending on mixed int/float interface behavior
- `go/internal/httpapi/server_test.go`
  - added a live stdio probe regression test using a local shell/powershell helper process that responds to `tools/list`

### Important truthfulness note
This is a real step forward, but still not universal MCP live discovery parity.

What is true now:
- Go can perform live stdio `tools/list` refresh for probeable configured servers
- successful probe results are persisted back into JSONC metadata
- Go no longer relies only on cached/derived metadata for every refresh attempt

What is not true yet:
- live discovery parity across non-stdio transports is still incomplete
- richer multi-step MCP initialization/probing semantics are still partial
- some MCP admin/operator surfaces remain mixed or bridge-heavy

### Validation performed for this live probe step
```bash
gofmt -w go/internal/mcp/client.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi/mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP runtime mutation step (native runtime registry)
The next MCP slice targeted the gap between config mutation and runtime mutation.

### Problem
Go already had local configured-server config mutation fallbacks, but runtime add/remove/list fallback behavior was still shallow:
- runtime add/remove mostly looked like config-adjacent wrappers
- runtime list fallback did not reflect a native Go-owned registry of added runtime servers

### What changed
- added `go/internal/httpapi/mcp_runtime_registry.go`
  - native in-memory runtime server registry
  - best-effort runtime probe state for added stdio servers
  - stored fields include runtime connectivity, tool count, tool inventory status, last check time, and last error
- updated `go/internal/httpapi/server.go`
  - server now owns a `runtimeServers` registry
  - `/api/mcp/runtime-servers/add` now:
    - persists configured server fallback state
    - best-effort probes the added runtime server
    - records native runtime server state in the Go registry
  - `/api/mcp/runtime-servers/remove` now:
    - removes both configured-server fallback state and native runtime registry state
- updated `go/internal/httpapi/mcp_handlers.go`
  - `/api/mcp/servers/runtime` fallback now includes the native Go runtime registry snapshot alongside the existing local runtime summary

### Important truthfulness note
This is a meaningful runtime mutation upgrade, but still not complete runtime lifecycle parity.

What is true now:
- Go fallback mode has a real runtime server registry for add/remove/list
- runtime mutation is no longer only config-shaped
- added runtime servers can carry native best-effort probe results in the Go lane

What is not true yet:
- runtime servers are not managed with full persistent lifecycle parity across all transports
- there is still no full native equivalent of every TS runtime orchestration behavior

### Validation performed for this runtime mutation step
```bash
gofmt -w go/internal/httpapi/mcp_runtime_registry.go go/internal/httpapi/mcp_handlers.go go/internal/httpapi/server.go
cd go && go test ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Bottom line
This pass meaningfully strengthened the **Go-primary migration path** and improved TypeScript survivability while the migration continues:
- broader provider routing
- native workflows
- native supervisor endpoints
- native export
- native submodule update orchestration
- detached async execution for workflow/supervisor request lifecycles
- regression tests for the new native surfaces
- repaired bridge-first behavior for key memory/MCP/council routes
- graceful empty-result fallback for missing local memory DB state
- hardened native git submodule parsing and fallback reporting
- regression coverage for MCP inventory/ranking and provider selection behavior
- regression coverage for supervisor lifecycle basics and session export generation
- regression coverage for council debate orchestration and BobbyBookmarks sync
- deduplicated provider alias reporting for configured native providers
- truthful CLI startup reuse when HyperCode is already running on port 4000
- OpenRouter free as the new default for quota-sensitive TS services
- session-import startup no longer aborts when imported instruction docs hit SQLite-unavailable state
- auto-import background failures now degrade truthfully instead of risking unhandled async startup noise
- concise once-per-surface SQLite degraded-mode logging for more startup-time ingestion paths
- explicit Go-primary migration planning artifacts
- Go-primary runtime selection in the CLI launcher (`auto|go|node`, with auto preferring Go)
- truthful dashboard skipping/warnings when Go runtime is selected but TS/tRPC compatibility is still required for the current web UI
- native Go links backlog crawling/enrichment API surface
- Go-owned links backlog crawler background lifecycle in the Go server
- native imported-session persistence, dedup, memory-row storage, docs generation, and maintenance stats in Go
- Go read fallbacks for imported sessions now prefer persistent local state before archive-only/scan-only degradation
- native Go debate-history persistence plus native council-history read/write fallbacks
- native fallback council debates now persist into Go history instead of being transient-only
- native file-based imported-session ingest in Go with heuristic memory extraction and instruction-doc regeneration
- native DB-backed imported-session parsing in Go for `llm-cli` and Prism artifacts
- MCP configured-server reads and writes now share JSONC as the native local authority in Go fallback mode
- native MCP metadata refresh/cache endpoints now use truthful JSONC inspection semantics instead of a generic placeholder-only state
- native MCP stdio metadata refresh can now perform live `tools/list` probing for probeable configured servers
- native MCP runtime add/remove/list fallback now uses a real Go runtime registry instead of only config-shaped behavior
- a tested Go-native replacement path for multiple TS-owned persistence surfaces, even though mixed-runtime cleanup is not fully finished yet
- a small but real Maestro UX fix

It was validated by successful Go compilation, successful targeted Go tests for the new native surfaces, successful targeted regression tests for repaired bridge/fallback routes, a successful full Go test suite run (`go test ./...`), targeted CLI startup tests and type-checking, council/sync coverage, targeted AI/core validation, and repeated successful workspace builds. The new systems are real and integrated, but several of them should still be described as **Beta** or **Experimental**, not full parity.
