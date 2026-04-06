# Handoff — Startup Provenance & Go-Primary Dashboard Truth Session

## Current status
**Version:** `1.0.0-alpha.1`

### Latest incremental pass — local Go memory interchange fallback ownership
This follow-up stayed in the same Go-primary memory lane and replaced the remaining bridge-only/stale behavior around memory interchange routes with truthful local fallback ownership.

#### What changed
- Added `go/internal/httpapi/memory_interchange_local.go` to centralize local memory interchange behavior for:
  - truthful structured format inventory
  - canonical record normalization
  - local parsing for `json`, `json-provider`, `jsonl`, `csv`, and `sectioned-memory-store`
  - local serialization back into those same supported formats
  - local import persistence into `.hypercode/memory/contexts.json`
  - local conversion between supported interchange formats
- Updated `go/internal/httpapi/server.go` so degraded local fallback now supports:
  - `GET /api/memory/interchange-formats` returning the real structured local format list instead of a stale `json`/`markdown` placeholder
  - `POST /api/memory/import` importing local memory records into `.hypercode/memory/contexts.json`
  - `POST /api/memory/convert` converting local memory payloads without `/trpc`
- Updated the built-in Go route descriptions for the interchange cluster so they now describe local fallback ownership honestly instead of sounding bridge-only.
- Updated focused Go coverage in `go/internal/httpapi/server_test.go`:
  - `TestMemorySectionedStatusAndFormatsFallBackLocally`
  - `TestMemoryImportAndConvertFallBackLocally`
- The new tests verify that local fallback now:
  - advertises the actual supported formats
  - imports canonical memory records locally
  - exposes imported records through saved-context routes
  - converts canonical JSON into sectioned-memory-store output truthfully

#### Validation performed
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/memory_interchange_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -run 'Test(MemorySectionedStatusAndFormatsFallBackLocally|MemoryExportFallsBackToLocalSnapshotAndRegistry|MemoryImportAndConvertFallBackLocally)' -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

#### Recommended next step after this pass
Keep finishing the remaining persisted-memory truth gaps in narrow slices, especially any remaining public memory routes that still act bridge-only even though the local Go runtime already has enough durable state or canonicalization helpers to answer truthfully.

### Latest incremental pass — local Go memory context save fallback ownership
This follow-up completed the obvious next saved-context gap in the Go-primary memory lane: degraded mode can now create saved contexts locally instead of only reading/querying/deleting them.

#### What changed
- Updated `go/internal/httpapi/memory_context_local.go` to add local saved-context creation helpers, including generated local ids and merged saved-context metadata.
- Updated `go/internal/httpapi/server.go` so `POST /api/memory/context/save` now:
  - still uses TypeScript `memory.saveContext` when available
  - falls back locally when `/trpc` is unavailable
  - validates `source`, `url`, and `content`
  - writes the saved entry into `.hypercode/memory/contexts.json`
  - returns a truthful `{ success: true, id }` response
- Tightened local saved-context normalization so `title`, `source`, and `url` survive more cleanly through local export/query/get fallback paths.
- Updated the built-in Go route descriptions for the saved-context cluster so they now describe local fallback ownership honestly instead of sounding bridge-only.
- Added focused coverage in `go/internal/httpapi/server_test.go`:
  - `TestMemoryContextSaveFallsBackToLocalRegistry`
- The new test verifies that a context saved in degraded mode is immediately visible to:
  - `memory.getContext`
  - `memory.listContexts`
  - `memory.query`

#### Validation performed
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/memory_context_local.go internal/httpapi/memory_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -run 'Test(MemoryContextSaveFallsBackToLocalRegistry|MemoryContextsFallsBackToLocalRegistry|ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally)' -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

#### Recommended next step after this pass
Keep finishing the remaining persisted-memory truth gaps in narrow slices, especially any public memory routes that still remain bridge-only or placeholder-shaped despite already having enough durable local state for honest fallback ownership.

### Latest incremental pass — local Go memory query/context fallback ownership
This follow-up stayed in the Go-primary memory lane and closed another truthful degraded-mode gap around saved memory contexts.

#### What changed
- Added `go/internal/httpapi/memory_context_local.go` to centralize local saved-context fallback helpers for:
  - context-registry path resolution
  - persisted registry writes
  - context lookup by id
  - local registry deletion
  - registry/export-backed query results
- Updated `go/internal/httpapi/memory_handlers.go` so degraded `memory.query` now merges:
  - existing local SQLite-backed memory search results
  - persisted `.hypercode/memory/contexts.json` / local-export-backed context results
- Updated `go/internal/httpapi/server.go` so degraded local fallback now supports:
  - `GET /api/memory/context/get` returning a real local body when inline `content` exists in the saved-context registry
  - `POST /api/memory/context/delete` removing local `.hypercode/memory/contexts.json` entries instead of hard-failing
- Updated focused Go coverage in `go/internal/httpapi/server_test.go` so read-only and mutation fallback tests now seed real local saved contexts and assert:
  - generic memory query returns persisted local results
  - local context bodies are readable
  - local context deletion mutates the registry

#### Validation performed
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/memory_handlers.go internal/httpapi/memory_context_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -run 'Test(MemoryContextsFallsBackToLocalRegistry|ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally)' -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

#### Recommended next step after this pass
Keep finishing the remaining high-value persisted-memory truth gaps in similarly small slices, especially any public memory routes that still collapse to placeholders or hard failures despite already having durable local state on disk.

### Latest incremental pass — Hyperharness refresh + saved-scripts degraded-mode parity
This follow-up advanced the tracked harness submodule and completed the saved-scripts degraded-mode parity slice.

#### What changed
- Advanced tracked gitlink `submodules/hyperharness` to upstream HEAD `98785f5c95c0c870e71aa4c635dd293017504802`.
- Confirmed `superai` is not present in tracked `.gitmodules` configuration.
- Updated `go/internal/httpapi/server.go` so these routes now have truthful local Go fallback ownership when `/trpc` is unavailable:
  - `POST /api/scripts/create`
  - `POST /api/scripts/update`
  - `POST /api/scripts/delete`
  - `POST /api/scripts/execute`
- Added focused Go coverage in `go/internal/httpapi/server_test.go`:
  - `TestSavedScriptsCreateUpdateDeleteAndExecuteFallBackToLocalConfig`
- Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so the shared Next.js compat route now supports:
  - `savedScripts.list`
  - `savedScripts.create`
  - `savedScripts.update`
  - `savedScripts.delete`
  - `savedScripts.execute`
- Added focused web compat regression coverage in `apps/web/src/app/api/trpc/[trpc]/route.test.ts`.
- Repaired build drift by restoring `MetricsService.getStats().series` and keeping the typed context-router surface aligned on `hypercodeContext`.

#### Validation performed
- `cd go && go test ./internal/httpapi -run 'TestSavedScriptsCreateUpdateDeleteAndExecuteFallBackToLocalConfig' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C packages/core run build`
- `pnpm -C apps/web run build`

#### Recommended next step after this pass
Continue attacking remaining operator-facing degraded-mode gaps in narrow slices, especially remaining dashboard mutation families that can reuse existing Go `/api/*` ownership before inventing new bridges.

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


### Latest incremental pass — saved-scripts dashboard edit flow
This follow-up exposed the already-supported `savedScripts.update` path in the operator UI.

#### What changed
- Updated `apps/web/src/app/dashboard/mcp/scripts/page.tsx`.
- Added an edit control on each script card.
- Unified the create/edit form so it can submit either `savedScripts.create` or `savedScripts.update`.
- Successful updates now close the editor and refetch the script list.

#### Validation performed
- `pnpm -C apps/web run build`


### Latest incremental pass — saved-scripts execution result visibility
This follow-up made the existing execute path operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/mcp/scripts/page.tsx`.
- Successful `savedScripts.execute` calls now populate a visible execution-result panel in the dashboard.
- The panel shows script name, success/failure state, timing, output/error text, and can be dismissed.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace because the clean push worktree has no installed Next.js toolchain)


### Latest incremental pass — Resource Library prompt inventory parity
This follow-up made prompts visible as a first-class resource in the Library dashboard.

#### What changed
- Updated `apps/web/src/app/dashboard/library/page.tsx`.
- Added a `Prompts & Templates` card and live prompt count using the existing `trpc.prompts.list` query.
- Updated the page copy so prompts are included in the library summary.


### Latest incremental pass — dashboard prompts route parity
This follow-up closed the navigation gap between the Resource Library prompt card and the actual prompt UI.

#### What changed
- Added `apps/web/src/app/dashboard/prompts/page.tsx` as a thin wrapper around `PromptLibrary`.
- The `/dashboard/prompts` route now resolves inside the dashboard shell, matching the Library card link.


### Latest incremental pass — Library nav description truthfulness
This follow-up aligned the shared navigation copy with the actual Library dashboard contents.

#### What changed
- Updated `apps/web/src/components/mcp/nav-config.ts`.
- The `Library` nav item now describes prompts alongside scripts, skills, tool sets, memory, plans, and documentation.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — infrastructure health-check result visibility
This follow-up made the existing infrastructure doctor result operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/infrastructure/page.tsx`.
- Successful or failed doctor runs now populate an inline result panel with status and output text.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — link backlog sync result visibility
This follow-up made the existing BobbyBookmarks sync result operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/links/page.tsx`.
- Successful syncs now populate an inline summary with upserted links, pages scanned, and the source base URL.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — infrastructure deploy result visibility
This follow-up made the existing deploy/apply result operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/infrastructure/page.tsx`.
- Successful or failed configuration apply runs now populate an inline result panel with status and output text.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — billing connection test result visibility
This follow-up made the existing provider connection test result operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/billing/page.tsx`.
- The latest provider connection test now renders inline with provider name, success/failure state, latency, and error text.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — registry action result visibility
This follow-up made the MCP Registry page's top-level action summaries operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/registry/page.tsx`.
- Registry sync and batch validation now populate an inline summary panel with counts and available details.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — registry detail action result visibility
This follow-up made the MCP Registry detail page's validate/install results operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/registry/[uuid]/page.tsx`.
- Single-server validation and install now populate an inline result panel with summary and key details.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — MCP settings sync result visibility
This follow-up made the existing client-config sync result operator-visible in the page itself.

#### What changed
- Updated `apps/web/src/app/dashboard/mcp/settings/page.tsx`.
- Successful client-config syncs now populate an inline summary with client name and written target path.

#### Validation performed
- `pnpm -C apps/web run build` (executed in the primary workspace)


### Latest incremental pass — Go-native persisted memory and agent-memory fallback ownership
This follow-up converted another bridge-heavy backend cluster into truthful Go-owned local behavior.

#### What changed
- Added `go/internal/httpapi/agent_memory_local.go`.
- Updated `go/internal/httpapi/server.go` so Go fallback now persists and serves real local data for:
  - `POST /api/memory/facts/add`
  - `POST /api/memory/observations/record`
  - `POST /api/memory/user-prompts/capture`
  - `POST /api/memory/session-summaries/capture`
  - `GET /api/memory/agent-search`
  - `GET /api/memory/observations/search`
  - `GET /api/memory/user-prompts/search`
  - `GET /api/memory/session-summaries/search`
  - `GET /api/agent-memory/search`
  - `GET /api/agent-memory/recent`
  - `GET /api/agent-memory/by-type`
  - `GET /api/agent-memory/by-namespace`
  - `GET /api/agent-memory/export`
  - `GET /api/agent-memory/stats`
  - `POST /api/agent-memory/add`
  - `POST /api/agent-memory/delete`
  - `POST /api/agent-memory/clear-session`
- Updated `go/internal/httpapi/server_test.go` to replace the old zero-state/uninitialized fallback assertions with persisted-local-state assertions and direct mutation coverage.

#### Validation performed
- `cd go && gofmt -w internal/httpapi/agent_memory_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'Test(ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally|AgentMemoryStatsFallsBackToPersistedState|AgentMemoryExportFallsBackToPersistedSnapshot|AgentMemoryReadRoutesFallBackToPersistedResults|AgentMemoryMutationRoutesFallBackToLocalPersistence)' -count=1`
- `cd go && go test ./internal/httpapi -count=1`

#### Recommended next step after this pass
Continue the same Go-primary backend migration pattern on remaining bridge-heavy local-first data surfaces, especially where Go already has durable on-disk state but some routes still return synthetic empties or explicit "runtime unavailable" placeholders.

### Latest incremental pass — startup workspace exclusion for drifted browser-extension path
This follow-up addressed the concrete startup/build failure shown in fresh `start.bat` operator logs.

#### What changed
- Updated `pnpm-workspace.yaml` to exclude `apps/borg-extension` in addition to the existing `apps/hypercode-extension` exclusion.
- This prevents the drifted browser-extension mini-workspace from being pulled into root pnpm/turbo planning during normal HyperCode startup.

#### Why it mattered
Fresh `start.bat` logs showed the workspace build failing with:
- `Failed to add workspace "hypercode-extension" from "apps\borg-extension\package.json", it already exists at "packages\claude-mem\package.json"`

That failure was separate from the already-known Maestro Electron rebuild issue.

#### Validation performed
Executed in the primary workspace:
- `pnpm exec turbo run build --filter=!@repo/* --dry`

Result: passed.

#### Recommended next step after this pass
Keep working through startup/build drift revealed by real operator logs, especially package-identity drift and remaining Node-24/Windows non-blocking install noise.

### Latest incremental pass — claude-mem workspace-name-aware build exclusion
This follow-up fixed a real startup/build guardrail bug in `scripts/build_all.mjs`.

#### What changed
- Updated `scripts/build_all.mjs` so the claude-mem merge-marker exclusion path now reads the actual workspace package name from `packages/claude-mem/package.json`.
- When that safety path triggers, it now excludes both:
  - `claude-mem`
  - the real workspace package name (currently `hypercode-extension`)
- Preserved the existing `HYPERCODE_REQUIRE_CLAUDE_MEM_BUILD=true` override path.

#### Why it mattered
The previous safety path assumed the workspace package name was `claude-mem`, but the actual package name is `hypercode-extension`.
That meant the intended Turbo exclusion could silently miss the real workspace package during a broken/merge-conflicted claude-mem state.

#### Validation performed
Executed in the primary workspace:
- `node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync('packages/claude-mem/package.json','utf8')).name)"`
- `pnpm exec turbo run build --filter=!@repo/* --filter=!hypercode-extension --dry`

#### Recommended next step after this pass
Continue tightening startup/build truth around real workspace/package identities surfaced by operator logs, especially where old logical labels no longer match current pnpm/Turbo reality.

### Latest incremental pass — Go-native advanced memory relations and handoff/pickup fallback ownership
This follow-up continued the same Go-primary memory migration and closed the next meaningful backend gap inside that subsystem.

#### What changed
- Added `go/internal/httpapi/agent_memory_relations_local.go`.
- Updated `go/internal/httpapi/server.go` so Go fallback now owns persisted local behavior for:
  - `POST /api/memory/pivot/search`
  - `POST /api/memory/timeline/window`
  - `POST /api/memory/cross-session-links`
  - `POST /api/agent-memory/handoff`
  - `POST /api/agent-memory/pickup`
- Updated `go/internal/httpapi/server_test.go` so the old placeholder-only expectations are replaced with truthful local ownership checks, plus focused regression coverage for:
  - inferred pivot search from anchor memory
  - timeline reconstruction from anchor memory
  - scored cross-session links
  - local handoff artifact generation
  - local pickup restore back into session-tier memory

#### Validation performed
- `cd go && gofmt -w internal/httpapi/agent_memory_local.go internal/httpapi/agent_memory_relations_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'Test(MemoryServiceBackedMutationsFallBackLocally|MemoryRelationshipRoutesFallBackToPersistedData|AgentMemoryHandoffAndPickupFallBackToLocalPersistence|AgentMemoryMutationRoutesFallBackToLocalPersistence|ReadOnlyMemoryRoutesFallBackLocally)' -count=1`
- `cd go && go test ./internal/httpapi -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

#### Recommended next step after this pass
Stay inside the same Go-primary backend lane and continue shrinking the remaining TypeScript-only seams that still sit on top of durable local state, especially where the Go runtime already has the data but some public routes still return synthetic empties or bridge-only behavior.
