# Handoff — Startup Provenance & Go-Primary Dashboard Truth Session

## Current status
**Version:** `1.0.0-alpha.1`

### Latest incremental pass — Go-backed tool-set dashboard compatibility in degraded mode
This follow-up added native Go fallback ownership plus shared dashboard compat support for the Tool Sets dashboard cluster.

#### What changed
- Updated `go/internal/httpapi/server.go` so these routes now have native Go fallback ownership when upstream `/trpc` is unavailable:
  - `POST /api/tool-sets/create`
  - `POST /api/tool-sets/delete`
- Added focused Go coverage in `go/internal/httpapi/server_test.go`:
  - `TestToolSetsCreateAndDeleteFallBackToLocalDB`
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so the shared Next.js compat route now supports:
  - `toolSets.list`
  - `toolSets.create`
  - `toolSets.delete`
- Added focused web compat regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

#### Validation performed
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestToolSetsCreateAndDeleteFallBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue targeting remaining dashboard mutation clusters that still depend on `/trpc`, especially places where the Go backend already has durable local state and only lacks truthful fallback ownership or shared compat plumbing.

### Latest incremental pass — Go-backed policy dashboard compatibility in degraded mode
This follow-up added native Go fallback ownership plus shared dashboard compat support for the Policies dashboard cluster.

#### What changed
- Updated `go/internal/httpapi/server.go` so these routes now have native Go fallback ownership when upstream `/trpc` is unavailable:
  - `POST /api/policies/create`
  - `POST /api/policies/update`
  - `POST /api/policies/delete`
- Added focused Go coverage in `go/internal/httpapi/server_test.go`:
  - `TestPoliciesCreateUpdateAndDeleteFallBackToLocalDB`
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so the shared Next.js compat route now supports:
  - `policies.list`
  - `policies.create`
  - `policies.update`
  - `policies.delete`
- Added focused web compat regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

#### Validation performed
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestPoliciesCreateUpdateAndDeleteFallBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue targeting remaining dashboard mutation clusters that still depend on `/trpc`, especially governance/operator surfaces where Go already has durable local `metamcp.db` state and only lacks truthful fallback ownership or shared compat plumbing.

### Latest incremental pass — Go-backed tool always-on mutation compatibility for MCP dashboards
This follow-up added native Go fallback ownership plus shared dashboard compat support for `tools.setAlwaysOn`, which is used by the MCP Catalog and MCP Inspector.

#### What changed
- Updated `go/internal/httpapi/server.go` so `POST /api/tools/always-on` now has native Go fallback ownership when upstream `/trpc` is unavailable
- Added focused Go coverage in `go/internal/httpapi/server_test.go`:
  - `TestToolsAlwaysOnFallsBackToLocalDB`
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so the shared Next.js compat route now supports:
  - `tools.setAlwaysOn`
- Added focused web compat regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- Also fixed a real local fallback correctness bug so DB-backed Go tool payloads now preserve the real tool `uuid` instead of incorrectly mirroring the tool `name`

#### Validation performed
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestToolsAlwaysOnFallsBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Keep targeting remaining operator-critical dashboard mutations that still rely on `/trpc`, especially routes where the Go backend already has durable local state and only lacks truthful fallback ownership or compat-layer plumbing.

### Latest incremental pass — Go-backed operator admin write compatibility for API keys and secrets
This follow-up added native Go fallback ownership plus shared dashboard compat support for the API key and secrets admin surfaces.

#### What changed
- Updated `go/internal/httpapi/server.go` so these routes now have native Go fallback ownership instead of bridge-only behavior when upstream `/trpc` is unavailable:
  - `POST /api/api-keys/create`
  - `POST /api/api-keys/delete`
  - `POST /api/secrets/set`
  - `POST /api/secrets/delete`
- Added focused Go coverage in `go/internal/httpapi/server_test.go` for:
  - `TestSecretsSetAndDeleteFallBackToLocalDB`
  - `TestAPIKeysCreateAndDeleteFallBackToLocalDB`
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so the shared Next.js compat route now supports:
  - `secrets.list`
  - `apiKeys.create`
  - `apiKeys.delete`
  - `secrets.set`
  - `secrets.delete`
- Added focused web compat regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

#### Validation performed
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestSecretsSetAndDeleteFallBackToLocalDB|TestAPIKeysCreateAndDeleteFallBackToLocalDB|TestSecretsListFallsBackToLocalDB|TestAPIKeysGetFallsBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue targeting other operator-critical dashboard mutation clusters that still depend on `/trpc`, especially places where the Go backend already has a truthful local `/api/*` route or can cheaply gain one.

### Latest incremental pass — Go-backed MCP dashboard mutation compatibility in web fallback mode
This follow-up taught the shared Next.js compat route to use the already-existing Go `/api/mcp/*` mutation surface for key MCP inspector/search/system actions when `/trpc` is unavailable.

#### What changed
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so local fallback now supports Go-backed MCP runtime/operator mutations for:
  - `mcp.setToolPreferences`
  - `mcp.loadTool`
  - `mcp.unloadTool`
  - `mcp.clearToolSelectionTelemetry`
  - `mcp.clearWorkingSetEvictionHistory`
  - `mcp.setLifecycleModes`
- These now map onto the existing Go endpoints under `/api/mcp/*` instead of failing only because the TypeScript `/trpc` backend is unavailable
- Added focused regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

#### Validation performed
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Keep shrinking the remaining Go-primary dashboard compatibility gap by targeting other operator-critical mutation clusters that still fail without `/trpc`, preferring existing Go `/api/*` ownership wherever it already exists.

### Latest incremental pass — Go-backed session dashboard compatibility in web fallback mode
This follow-up made the Go-primary dashboard materially more usable by teaching the local dashboard compat route to use the already-existing Go session-supervisor HTTP surface for key session reads/mutations.

#### What changed
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so local fallback now supports Go-backed session-supervisor reads for:
  - `session.get`
  - `session.logs`
  - `session.attachInfo`
  - `session.health`
- Added local compat mutation support for:
  - `session.create`
  - `session.start`
  - `session.stop`
  - `session.restart`
  - `session.executeShell`
  - `session.updateState`
  - `session.clear`
- These now target the live Go control-plane routes under `/api/sessions/supervisor/*` instead of failing just because `/trpc` is unavailable
- Added focused regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

#### Runtime truth confirmed by operator logs
The latest pasted `start.bat` evidence now also confirms the previous dashboard-startup slice is working in practice:
- Go control plane started on `4001`
- the Next.js dashboard started on `3000`
- startup now reports compatibility-backed dashboard mode truthfully instead of hard-skipping the dashboard

#### Validation performed
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue shrinking the remaining dashboard compatibility gap by porting more mutation-heavy dashboard-backed surfaces to direct Go-owned contracts, using the same shared compat-layer strategy rather than page-by-page one-offs.

### Latest incremental pass — Go-primary dashboard startup compatibility
This follow-up removed an overly pessimistic Go-primary startup limitation: the dashboard no longer has to be hard-skipped when the Go control plane is active.

#### What changed
- Updated `packages/cli/src/commands/start.ts` so `hypercode start --runtime auto|go` can now launch the Next.js dashboard against the live Go control plane instead of always skipping dashboard startup
- Kept the startup messaging truthful by explicitly labeling this as a compatibility-backed dashboard runtime, not a fully Go-native dashboard backend
- Updated `packages/cli/src/commands/start.test.ts` so the Go runtime is treated as dashboard-startup-capable and the summary text reflects the compatibility-backed nature of the web runtime
- Updated planning/docs to record that Go-primary startup can now launch the dashboard while the backend contract still remains partially compatibility-dependent

#### Runtime semantics
When Go is the selected runtime:
- the Go control plane still owns the backend/control-plane base
- the Next.js dashboard may now be started alongside it
- startup output explicitly reports compatibility-backed dashboard mode and warns that some mutation-heavy surfaces may still rely on compatibility fallbacks during the migration

#### Validation performed
- `pnpm -C packages/cli run build`
- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue shrinking the remaining Go-primary/dashboard compatibility gap by porting more mutation-heavy dashboard-backed procedures to direct Go-owned contracts so the web runtime depends less on TS-era compatibility behavior over time.

### Latest incremental pass — startup dashboard truthfulness and harness submodule maintenance
This follow-up fixed one remaining startup-truth contradiction exposed by real operator logs and completed the requested harness-submodule maintenance work.

#### What changed
- Updated `packages/cli/src/commands/start.ts` so the pre-runtime banner now says:
  - `Dashboard request: requested`
  - or `Dashboard request: disabled`
  instead of falsely asserting `Dashboard: enabled` before the runtime had resolved whether the dashboard could actually be started
- Added an explicit runtime-resolved dashboard mode line later in startup output, e.g.:
  - `Dashboard mode: compatibility-only; skipped for Go runtime`
  - `Dashboard mode: started integrated dashboard runtime`
- Fast-forwarded `submodules/hyperharness` from `d6775ed7cb776791a3d370723bdb17d76d017495` to `37830d726a39988cdb54f073c21c1a0924dfea0b`
- Removed the tracked `submodules/superai` submodule from `.gitmodules` and the workspace checkout

#### Runtime truth confirmed by operator logs
The latest pasted `start.bat` evidence now shows current intended behavior clearly:
- repeated Go-primary runs skip `pnpm install` when startup dependencies are already ready
- the first run rebuilt only because the Go control-plane artifact was stale
- the later repeat run skipped the startup build because artifacts were current
- both runs truthfully fell forward from occupied port `4000` to `4001`
- both runs explicitly warned that integrated dashboard startup is still skipped in Go-primary mode

#### Validation performed
- `git -C submodules/hyperharness fetch origin main`
- `git -C submodules/hyperharness pull --ff-only origin main`
- `git submodule deinit -f -- submodules/superai`
- `git rm -f submodules/superai`
- `pnpm -C packages/cli run build`
- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`

#### Recommended next step after this pass
Continue shrinking the remaining Go-primary/dashboard compatibility gap so more dashboard/runtime truth can come directly from Go-owned surfaces instead of compatibility-only Node expectations.

### Latest incremental pass — worktree/isolation parity for Go fallback sessions
This follow-up gave Go fallback sessions truthful worktree allocation behavior when multiple active sessions target the same requested working directory.

#### What changed
- Added a native Go git-worktree helper in `go/internal/git/worktree.go`
- Wired `go/internal/supervisor/supervisor.go` to use that helper when `isolateWorktree` is requested and another active session already occupies the same workspace
- Wired `go/internal/httpapi/server.go` to pass the workspace root into the Go supervisor manager so the fallback path can actually create worktrees
- Added focused regression coverage in:
  - `go/internal/supervisor/supervisor_test.go`
  - `go/internal/httpapi/server_test.go`

#### Fallback semantics
When TS is unavailable, Go fallback supervised sessions now follow a truthful isolation rule similar to the TypeScript supervisor:
- first session on a workspace stays on the requested working directory
- conflicting later session with `isolateWorktree: true` gets a dedicated worktree under:
  - `.hypercode/worktrees/<session-id>`
- if worktree creation fails, the session still gets created but Go logs the limitation and does not pretend isolation succeeded

#### Validation performed
- `cd go && gofmt -w internal/git/worktree.go internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi ./internal/git -run 'TestManagerAllocatesWorktreeForConflictingSession|TestSupervisorSessionCreateFallsBackToLocalGoWorktreeIsolation|TestCreateSessionCapturesMetadata|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

#### Recommended next step after this pass
Continue deeper Go-native supervisor parity by narrowing the remaining restore/control semantics gap now that lifecycle, persistence, restore, execution-policy visibility, and worktree isolation all have native fallback ownership.

### Latest incremental pass — execution-policy parity for Go fallback sessions
This follow-up gave Go fallback sessions a truthful `executionPolicy` payload and made native `execute-shell` respect that policy instead of using only a generic shell fallback.

#### What changed
- Added persisted `executionPolicy` metadata to Go fallback supervised-session snapshots in `go/internal/supervisor/supervisor.go`
- Added execution-policy env propagation for Go fallback sessions
- Updated native `session.executeShell` fallback in `go/internal/httpapi/session_supervisor_handlers.go` to choose its shell from the session execution policy when available
- Added focused regression coverage in:
  - `go/internal/supervisor/supervisor_test.go`
  - `go/internal/httpapi/server_test.go`

#### Fallback semantics
When TS is unavailable, Go fallback sessions now surface:
- `executionProfile`
- `executionPolicy.requestedProfile`
- `executionPolicy.effectiveProfile`
- shell id/label/family/path
- support flags for PowerShell/POSIX shell availability
- human-readable policy reason

And native one-shot shell execution now follows that session policy rather than always using one generic runtime shell choice.

#### Validation performed
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi -run 'TestCreateSessionCapturesMetadata|TestManagerPersistsAndRestoresCreatedSessions|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRestoreFallsBackToLocalGoPersistence' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

#### Recommended next step after this pass
Continue deeper Go-native supervisor parity by narrowing the remaining higher-value worktree/isolation gap, since execution-policy visibility is now much closer to the TypeScript supervisor contract.

### Latest incremental pass — native Go restore fallback for persisted supervisor sessions
This follow-up made the public supervisor restore route truthful in degraded mode by letting Go explicitly reload its own persisted supervisor inventory when TypeScript is unavailable.

#### What changed
- Added/used a public `RestoreSessions()` method on the Go supervisor manager in `go/internal/supervisor/supervisor.go`
- Reworked `/api/sessions/supervisor/restore` in `go/internal/httpapi/session_supervisor_handlers.go` so it now behaves as upstream-first with native Go fallback instead of bridge-only
- Updated the Go API index description in `go/internal/httpapi/server.go`
- Added focused restore-route regression coverage in `go/internal/httpapi/server_test.go`

#### Fallback semantics
When TS is unavailable, `POST /api/sessions/supervisor/restore` now truthfully reloads the Go-owned persisted supervisor inventory from:
- `.hypercode-go/session-supervisor.json`

The local restore response includes:
- `restoredCount`
- `sessions`
- `restoredSessions`
- `autoResumeCount`
- `lastRestoreAt`

#### Validation performed
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go internal/httpapi/session_supervisor_handlers.go internal/supervisor/supervisor.go`
- `cd go && go test ./internal/httpapi ./internal/supervisor -run 'TestSupervisorSessionRestoreFallsBackToLocalGoPersistence|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionBridgeRoutes|TestManagerPersistsAndRestoresCreatedSessions|TestManagerRestoreNormalizesTransientRunningStateToStoppedWithoutAutoResume' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

#### Recommended next step after this pass
Continue deeper Go-native supervisor parity by narrowing the remaining higher-value gaps around execution-policy/worktree ownership and any remaining TS-only restore/control semantics.

### Latest incremental pass — durable Go supervised-session lifecycle persistence
This follow-up made the new native Go supervised-session fallback durable across Go runtime restarts instead of leaving it as an in-memory-only rescue path.

#### What changed
- Upgraded `go/internal/supervisor/supervisor.go` to persist and restore the Go-owned supervised-session fallback inventory
- Added restore-status tracking and transient-state normalization during restore
- Wired `go/internal/httpapi/server.go` to construct the Go supervisor manager with a real persistence path in the Go config dir:
  - `.hypercode-go/session-supervisor.json`
- Added focused persistence coverage in:
  - `go/internal/supervisor/supervisor_test.go`
  - `go/internal/httpapi/server_test.go`

#### Fallback semantics
When TS is unavailable, the Go supervised-session lifecycle fallback now remains durable across Go server recreation/restart:
- sessions created through the Go fallback are persisted to the Go config dir
- restored sessions survive control-plane restart
- transient runtime-only states are normalized honestly on restore instead of pretending the original process handle still exists

Important limitation is explicit in the current architecture:
- persistence is now durable for the Go-owned fallback inventory, but this still does **not** claim full TypeScript execution-policy/worktree/memory-bootstrap parity
- the Go fallback state is stored in the Go config dir, not yet as shared TS/Go supervisor authority

#### Validation performed
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi -run 'TestManagerPersistsAndRestoresCreatedSessions|TestManagerRestoreNormalizesTransientRunningStateToStoppedWithoutAutoResume|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionStateFallsBackToLocalGoState|TestSupervisorSessionBridgeRoutes' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

#### Recommended next step after this pass
Continue deeper Go-native supervisor parity by closing higher-value remaining gaps around execution-policy/worktree ownership and any remaining TS-only restore/control semantics.

### Latest incremental pass — native Go supervised-session lifecycle fallback ownership
This follow-up moved the public supervised-session lifecycle routes from bridge-only behavior into truthful upstream-first / native-Go-fallback ownership.

#### What changed
- Upgraded `go/internal/supervisor/supervisor.go` from a thin process map into a richer native supervised-session manager with:
  - session status lifecycle
  - buffered logs
  - attach readiness
  - health snapshots
  - restart/error tracking
  - one-shot shell execution support at the HTTP layer
- Reworked these public handlers in `go/internal/httpapi/session_supervisor_handlers.go` so they now behave as upstream-first with native Go fallback instead of bridge-only:
  - `/api/sessions/supervisor/list`
  - `/api/sessions/supervisor/get`
  - `/api/sessions/supervisor/create`
  - `/api/sessions/supervisor/start`
  - `/api/sessions/supervisor/stop`
  - `/api/sessions/supervisor/restart`
  - `/api/sessions/supervisor/logs`
  - `/api/sessions/supervisor/attach-info`
  - `/api/sessions/supervisor/health`
  - `/api/sessions/supervisor/execute-shell`
- Kept the prior persisted session-state fallback for:
  - `/api/sessions/supervisor/state`
  - `/api/sessions/supervisor/update-state`
  - `/api/sessions/supervisor/clear`
  - `/api/sessions/supervisor/heartbeat`
- Updated API index descriptions in `go/internal/httpapi/server.go` to reflect upstream-first / native-fallback truth instead of bridge-only wording
- Added focused regression coverage in `go/internal/httpapi/server_test.go`
- Fixed stale renamed-submodule test fixtures in:
  - `go/internal/httpapi/server_test.go`
  - `go/internal/git/submodules_test.go`

#### Fallback semantics
When TS is unavailable, Go now truthfully owns an in-memory supervised-session runtime for the public operator route family:
- lifecycle routes create/start/stop/restart native Go sessions
- `logs` returns native buffered logs
- `attach-info` returns native readiness/PID metadata
- `health` returns native restart/failure tracking
- `execute-shell` runs a truthful native one-shot shell command in the session working directory/environment

Important limitation is explicit in the current architecture:
- this new lifecycle fallback is **in-memory**, not yet restart-persistent
- it does **not** yet claim TypeScript execution-policy/worktree/memory-bootstrap parity

#### Validation performed
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go internal/git/submodules_test.go`
- `cd go && go test ./internal/httpapi ./internal/supervisor -run 'TestSupervisorSessionBridgeRoutes|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionStateFallsBackToLocalGoState|Test(CreateSessionRejectsDuplicates|StartSessionRunsShortLivedProcessToStopped|StartSessionMissingReturnsError|FailingProcessRestartsAndEventuallyFails|CreateSessionCapturesMetadata|StartSessionWithCustomEnvCanRunProcess)' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

#### Recommended next step after this pass
Continue deeper Go-native supervisor ownership by making the new Go supervised-session lifecycle fallback durable across runtime restarts and then narrowing the remaining TS-only gaps around execution-policy/worktree parity.

### Latest incremental pass — native Go session-state fallback ownership
This follow-up moved one supervisor/session slice from bridge-only behavior into truthful native fallback ownership.

#### What changed
- Added `go/internal/httpapi/session_state_local.go`
- Wired `go/internal/httpapi/server.go` to own a native local session-state manager backed by workspace `.hypercode-session.json`
- Reworked these handlers in `go/internal/httpapi/session_supervisor_handlers.go` so they now behave as upstream-first with native fallback instead of bridge-only:
  - `/api/sessions/supervisor/state`
  - `/api/sessions/supervisor/update-state`
  - `/api/sessions/supervisor/clear`
  - `/api/sessions/supervisor/heartbeat`
- Added focused regression coverage in `go/internal/httpapi/server_test.go`

#### Fallback semantics
When TS is unavailable, Go now truthfully owns the persisted session-state core:
- `state` returns the local snapshot
- `update-state` persists `isAutoDriveActive`, `activeGoal`, `lastObjective`, optional `threadId`, and refreshes `lastHeartbeat`
- `clear` resets the snapshot
- `heartbeat` refreshes the timestamp

Important limitation is explicit in the fallback response shape:
- `toolAdvertisements: []`
- `memoryBootstrap: null`

So the Go fallback does **not** pretend TS memory/bootstrap enrichment happened.

#### Validation performed
- `cd go && gofmt -w internal/httpapi/session_state_local.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run TestSupervisorSessionStateFallsBackToLocalGoState -count=1`
- `cd go && go test ./internal/httpapi -run 'TestSessionSupervisorBridgeRoutes|TestSupervisorSessionStateFallsBackToLocalGoState' -count=1`

#### Recommended next step after this pass
Continue deeper Go-native session/supervisor ownership beyond state-only persistence, especially higher-value mutation flows that still depend on TS bridge semantics.

### What this session completed
1. Propagated persisted startup/runtime provenance across the remaining high-signal dashboard system views:
   - `/dashboard/system`
   - `/dashboard/mcp/system`
   - `/dashboard/orchestrator` (via `apps/web/src/app/dashboard/autopilot/page.tsx`, since `orchestrator/page.tsx` is only a re-export)
2. Confirmed the startup-provenance dashboard propagation cluster is now complete across:
   - dashboard home
   - health
   - integrations
   - system
   - mcp/system
   - orchestrator/autopilot
   - local web fallback status
3. Upgraded the web tRPC compatibility layer so `startupStatus` now prefers the Go-native `/api/startup/status` and `/api/runtime/status` surfaces when the TypeScript startup-status procedure is unavailable. This means dashboard fallback mode now preserves native Go startup readiness, blocking reasons, uptime, memory/import counts, supervisor-bridge readiness, runtime version, and startup provenance instead of only local lock/config guesses.
4. Added focused regression coverage for that compat-path upgrade in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`, and validated it through the root Vitest runner plus a full `apps/web` production build.
5. Upgraded the same web compat layer to prefer Go-native `/api/mcp/status` when the TypeScript `mcp.getStatus` procedure is unavailable. This applies to both the legacy MCP bridge batches and the richer local dashboard fallback path, so dashboard/system/MCP views now preserve native Go MCP/router truth for initialization state, counts, and lifecycle flags during TS outage/degraded mode.
6. Upgraded the same web compat layer again to prefer Go-native `/api/billing/provider-quotas` and `/api/billing/fallback-chain` when the TypeScript billing procedures are unavailable. This replaces empty degraded-mode provider/fallback placeholders with native Go provider-routing previews in both the legacy bridge path and the richer local dashboard fallback path.
7. Upgraded the local dashboard compat path to prefer Go-native `/api/cli/harnesses` for `tools.detectCliHarnesses` when the TypeScript harness-detection procedure is unavailable. This replaces empty degraded-mode harness detections with native Go harness inventory for integration/operator views without overstating full execution-environment parity.
8. Upgraded both compat paths to prefer Go-native `/api/sessions` for `session.list` when the TypeScript session-list procedure is unavailable. This replaces empty degraded-mode session inventories with native Go-discovered session rows, improving dashboard-home and session/operator visibility without claiming full supervised-session mutation parity.
9. Upgraded the local dashboard compat path to derive `session.catalog` from Go-native `/api/cli/harnesses` when the TypeScript session catalog is unavailable. This preserves a truthful harness selector for session creation in degraded mode without pretending the full TypeScript catalog runtime has been ported.
10. Fixed `start.bat` Go-primary truthfulness after a real operator run exposed contradictory phase messaging. The bug was parse-time `%ERRORLEVEL%` capture inside parenthesized blocks, which could print `build required` and then still skip the build. The script now uses runtime `!ERRORLEVEL!` for both install/build probes.
11. Reduced Go-primary install coupling to unrelated workspace postinstall hooks by defaulting startup installs to `pnpm install --ignore-scripts` unless `HYPERCODE_STARTUP_INSTALL_SCRIPTS=1` is set. This keeps Go-primary startup from tripping Maestro/Electron rebuild failures when only dependency graph readiness is needed.
12. Upgraded the local dashboard compat path to prefer Go-native `/api/tools/detect-execution-environment` for `tools.detectExecutionEnvironment` when the TypeScript procedure is unavailable. The compat layer now normalizes native shell/tool posture into the existing AI Tools/dashboard contract and reuses the same summary inside degraded `startupStatus.checks.executionEnvironment` so dashboard-home/system summaries no longer drift away from the AI Tools page.
13. Upgraded the local dashboard compat path to prefer Go-native `/api/tools/detect-install-surfaces` for `tools.detectInstallSurfaces` when the TypeScript procedure is unavailable. This preserves truthful install-artifact summaries for browser extensions, VS Code packaging, and MCP client sync instead of collapsing those pages to empty arrays in degraded mode.
14. Upgraded the local dashboard compat path to prefer Go-native `/api/sessions/imported/maintenance-stats` for `session.importedMaintenanceStats` when the TypeScript procedure is unavailable, and to backfill degraded `startupStatus.checks.importedSessions` from that same native maintenance endpoint when startup telemetry omits imported-session archive counters.
15. Upgraded the local dashboard compat path to prefer Go-native MCP inspector state for `mcp.getWorkingSet`, `mcp.getToolSelectionTelemetry`, and `mcp.getToolPreferences` when the TypeScript procedures are unavailable. This preserves working-set rows, tool-selection telemetry, and tool-preference controls for the MCP Inspector instead of falling back to synthetic placeholders.
16. Upgraded the local dashboard compat path to prefer Go-native `/api/api-keys`, `/api/shell/history/system`, `/api/memory/agent-stats`, and `/api/expert/status` for `apiKeys.list`, `shell.getSystemHistory`, `agentMemory.stats`, and `expert.getStatus` when the TypeScript procedures are unavailable. This preserves operator-facing API key metadata, shell-history lines, compact memory stats, and expert status instead of synthetic placeholders.
17. Upgraded the shared compat path to prefer Go-native `/api/tools` and `/api/tools/search` for `tools.list` and `mcp.searchTools` when the TypeScript procedures are unavailable. This preserves tool inventory and tool search results for catalog/search pages instead of falling back to synthetic empty placeholders.
18. Upgraded the shared compat path to prefer Go-native `/api/mcp/traffic` and `/api/server-health/check` for `mcp.traffic` and UUID-backed `serverHealth.check` when the TypeScript procedures are unavailable. This preserves router traffic rows and truthful server health counters instead of synthetic empty traffic and config-only health inference.
19. Upgraded the shared compat path to prefer Go-native `/api/sessions/supervisor/state` for `session.getState` when the TypeScript procedure is unavailable. This preserves truthful session-state signals like active auto-drive and current goal instead of a synthetic placeholder.
20. Updated planning/analysis docs to record the new coverage and narrowed the next recommendation to reducing remaining TypeScript compatibility dependence where Go-native status already exists.
21. Committed and pushed:
   - `7785a9a3` — `feat: surface startup provenance in system dashboards`
   - `38b10684` — `feat: surface startup provenance in orchestrator dashboard`
   - `590d8848` — `feat: prefer go startup truth in web compat fallback`
   - `58d7b124` — `feat: prefer go mcp status in web compat fallback`
   - `94c45e3f` — `feat: prefer go provider status in web compat fallback`
   - `d01ff222` — `feat: prefer go cli harnesses in web compat fallback`
   - `744d94f9` — `feat: prefer go sessions in web compat fallback`
   - `772c6afd` — `feat: prefer go session catalog in web compat fallback`
   - `7e0a3409` — `fix: make go startup phase checks truthful`
   - `23f308fb` — `feat: prefer go execution environment in web compat fallback`
   - `50c9fb47` — `feat: prefer go install surfaces in web compat fallback`
   - `ce47464e` — `feat: prefer go imported maintenance in web compat fallback`
   - `a5a50a33` — `feat: prefer go mcp inspector state in web compat fallback`
   - `87f601eb` — `feat: prefer go operator reads in web compat fallback`
   - `1f1b85e9` — `feat: prefer go tool catalog in web compat fallback`
   - `a187362e` — `feat: prefer go mcp traffic in web compat fallback`
   - `df19636a` — `feat: prefer go session state in web compat fallback`

### Files changed in this slice
- `apps/web/src/app/dashboard/system/page.tsx`
- `apps/web/src/app/dashboard/mcp/system/page.tsx`
- `apps/web/src/app/dashboard/autopilot/page.tsx`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `docs/ai/planning/GO_PRIMARY_MIGRATION_PLAN.md`
- `ANALYSIS.md`
- `HANDOFF.md`

### Validation performed
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`
- `pnpm -C packages/core exec vitest run src/routers/startupStatus.test.ts`
- `pnpm -C packages/cli exec vitest run src/commands/start.test.ts src/commands/status.test.ts`

Those passed for the startup-status compat slice. Subsequent focused `mcp.getStatus`, provider-routing, CLI-harness, session-list, and session-catalog compat upgrades in the same route layer were also validated with:
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`
- `pnpm -C packages/core exec vitest run src/routers/startupStatus.test.ts`
- `pnpm -C packages/cli exec vitest run src/commands/start.test.ts src/commands/status.test.ts`

The latest startup-truthfulness follow-up was validated separately with:
- `pnpm -C packages/cli run build`
- `powershell.exe -NoProfile -Command '$env:HYPERCODE_FORCE_INSTALL="1"; $env:HYPERCODE_SKIP_NATIVE_PREFLIGHT="1"; $env:HYPERCODE_SKIP_BUILD="1"; cmd.exe /c "start.bat --help"'`
- `powershell.exe -NoProfile -Command '$env:HYPERCODE_SKIP_INSTALL="1"; cmd.exe /c "start.bat --help"'` (this exercised the corrected build-required path; the first attempt to suppress native preflight used malformed PowerShell env syntax and is intentionally documented as such)
- `node scripts/check_startup_build.mjs`

The latest execution-environment + install-surface + imported-maintenance + MCP-inspector + operator-read + tool-catalog/search + MCP-traffic/server-health + session-state compat follow-up was validated with:
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Important truthful notes
- `apps/web` still does not have a directly usable workspace-local `vitest` command for standalone page tests in this workflow, so page/UI slices were still validated through the successful production web build; however, route-level regressions can be executed truthfully through the root Vitest runner, and that path was used for `apps/web/src/app/api/trpc/[trpc]/route.test.ts` in this slice.
- No long-running processes were killed.
- Local runtime state such as `go/metamcp.db` remains intentionally uncommitted.
- There are still unrelated dirty/untracked paths in the workspace/submodules (for example `apps/cloud-orchestrator`, `apps/maestro`, `packages/claude-mem`, JetBrains plugin files, and a VSIX artifact) that were not part of this slice and were not staged.

### Recommended next steps
1. Resume the next shared dashboard compatibility reduction after the session-state slice.
   - highest-value remaining nearby candidates: any remaining runtime-heavy read surfaces still using synthetic placeholders outside the now-covered startup/MCP/tools/session/operator clusters, especially page-specific helpers or lower-value empty-state fallbacks that no longer have obvious native endpoints
2. Deepen Go-native orchestration parity beyond current truthful fallbacks, especially:
   - Darwin parity
   - AutoDev director-loop parity
   - richer swarm execution parity
3. Resolve blocked native desktop items when dependencies are available:
   - `apps/maestro-native` Qt tooling (`moc.exe`, Qt6Qml)
   - `apps/maestro-go/go.mod` module/replace resolution

---

# Handoff — Stabilization Session

## Current status
**Version:** `1.0.0-alpha.1`

We have addressed a major split-brain issue between the MCP database cache and the lightweight stdio loader that was causing models to see only 1 tool (`hypercode_core_loader_status`) and losing the `always_on` setting across restarts.

## Key technical discoveries & fixes

1. **The Config Deletion Loop**
   - **Bug**: `McpConfigService.syncWithDatabase()` was reading the user's `mcp.jsonc` file. If the file lacked cached tools under `_meta.tools` (which was the default state for many servers), it passed an empty array to `toolsRepository.syncTools()`. This caused the repository to execute a DELETE query against all 651 tools in the database, wiping out their `always_on` status.
   - **Fix**: Modified `McpConfigService.ts` to strictly prevent `syncStoredMetadataTools` from overwriting or deleting DB tools if the incoming `mcp.jsonc` array is empty.

2. **The Stdio Loader Blindspot**
   - **Bug**: The `stdioLoader.ts` script (which `pi` and other extensions connect to) was explicitly bypassing the database to remain lightweight. It only read from `mcp.jsonc`. Because the tools were only in the DB and not in `mcp.jsonc` (or were wiped), the proxy served 0 downstream tools.
   - **Fix**: We changed `syncToMcpJson` to `exportToolCache` and made it write to `.hypercode/mcp-cache.json`. This new unified cache merges both the SQLite database inventory and the manual `mcp.jsonc` configurations without destroying the manual file. The `stdioLoader` now reads `mcp-cache.json`.

3. **Workspace Config Resolution**
   - **Bug**: The system hardcoded `os.homedir() + '/.hypercode'` for the configuration directory, causing confusion when a local `mcp.jsonc` existed at the project root.
   - **Fix**: Updated `getHypercodeConfigDir()` in `mcpJsonConfig.ts` to respect `process.env.HYPERCODE_CONFIG_DIR`, then check for `process.cwd()/mcp.jsonc`, and finally fall back to the home directory.

4. **Tool Inventory Merging**
   - **Bug**: `getCachedToolInventory()` returned either the SQLite snapshot OR the JSON snapshot, but never both.
   - **Fix**: Rewrote the function to cleanly merge both collections, ensuring manual API-imported servers and auto-discovered DB servers coexist.

5. **Universal Instructions Refactor**
   - Rewrote `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`, and `AGENTS.md` to cleanly point back to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`, reducing prompt bloat and ensuring architectural alignment across models.

## Next steps for the next agent
1. **Validate Stdio Loader**: Run `pi` or test the stdio proxy directly to ensure it now broadcasts the combined DB and manual tool inventory.
2. **Dashboard Review**: Check if the `always_on` toggles in the React dashboard correctly persist across server restarts now that the destructive wipe bug is gone.
3. **Continue Porting**: The Go bridge needs more direct mappings. Evaluate `PORTING_MAP.md` and continue porting features safely without violating the `UNIVERSAL_LLM_INSTRUCTIONS.md` stabilization rule.
