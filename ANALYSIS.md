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
A broader run of `go test ./internal/httpapi` still reports **pre-existing unrelated failures** in other fallback/bridge tests. Those failures were not introduced by this pass, and this pass was therefore validated using the smallest truthful targeted test set for the new code.

## Bottom line
This pass meaningfully strengthened the **Go sidecar as a truthful local fallback control plane**:
- broader provider routing
- native workflows
- native supervisor endpoints
- native export
- native submodule update orchestration
- detached async execution for workflow/supervisor request lifecycles
- regression tests for the new native surfaces
- a small but real Maestro UX fix

It was validated by successful Go compilation, successful targeted Go tests for the new native surfaces, and the previously successful full workspace build. The new systems are real and integrated, but several of them should still be described as **Beta** or **Experimental**, not full parity.
