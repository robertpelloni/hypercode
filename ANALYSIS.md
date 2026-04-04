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

## Bottom line
This pass meaningfully strengthened the **Go sidecar as a truthful local fallback control plane** and improved CLI startup ergonomics:
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
- a small but real Maestro UX fix

It was validated by successful Go compilation, successful targeted Go tests for the new native surfaces, successful targeted regression tests for repaired bridge/fallback routes, a successful full Go test suite run (`go test ./...`), targeted CLI startup tests and type-checking, council/sync test coverage, and repeated successful workspace builds. The new systems are real and integrated, but several of them should still be described as **Beta** or **Experimental**, not full parity.
