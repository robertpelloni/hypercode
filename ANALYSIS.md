# HyperCode Stabilization Analysis — 2026-04-03

## Latest stabilization pass — local Go memory context save fallback ownership (2026-04-06)

### Scope
This follow-up stayed in the same Go-primary memory lane and closed the next obvious degraded-mode gap after query/get/delete parity:
- `memory.saveContext` still depended entirely on `/trpc`
- degraded mode could now read/query/delete local saved contexts truthfully
- but it still could not create new saved contexts locally

### Findings
- The TypeScript `memory.saveContext` contract is straightforward: it accepts `{ source, url, title?, content, metadata? }` and returns `{ success: true, id }`.
- The local Go fallback now had enough durable state to support that contract honestly:
  - `.hypercode/memory/contexts.json` already existed as the saved-context registry
  - the previous pass had already taught Go fallback to list/query/read/delete against that registry
- In the clean push worktree, generic `memory.query` already merged:
  - SQLite-backed local memory search results
  - context-registry/export-backed results
- That meant local create was the remaining high-value missing piece for coherent saved-context CRUD/read/search behavior during TypeScript outage.

### What changed
#### 1. Added truthful local saved-context creation
Updated:
- `go/internal/httpapi/memory_context_local.go`
- `go/internal/httpapi/server.go`

Behavior now:
- upstream TypeScript `memory.saveContext` still wins when available
- when `/trpc` is unavailable, Go now validates the required payload fields:
  - `source`
  - `url`
  - `content`
- Go then writes a new entry into `.hypercode/memory/contexts.json` with:
  - generated local context id
  - title/source/url
  - inline content
  - createdAt
  - chunks
  - merged metadata
- the HTTP response stays truthful and contract-compatible: `{ success: true, id }`

#### 2. Kept saved-context metadata useful after local creation
Updated:
- `go/internal/httpapi/memory_context_local.go`
- `go/internal/httpapi/server.go`

Additional normalization now preserves saved-context operator truth better by:
- generating stable local ids in a TS-like `ctx/<timestamp>/<random>` shape
- carrying top-level `title`, `source`, and `url` alongside the local saved entry
- preserving those fields when local export/query helpers rehydrate saved contexts
- surfacing `url` alongside title/source in local `memory.getContext` metadata

#### 3. Tightened route-catalog truthfulness
Updated:
- `go/internal/httpapi/server.go`

The built-in route descriptions for `/api/memory/search`, `/api/memory/contexts`, `/api/memory/context/save`, `/api/memory/context/get`, and `/api/memory/context/delete` now describe their local fallback behavior instead of implying pure bridge-only ownership.

### Regression coverage
Updated:
- `go/internal/httpapi/server_test.go`

Added focused coverage:
- `TestMemoryContextSaveFallsBackToLocalRegistry`

This test now verifies that a saved context created during `/trpc` outage:
- returns a real generated id
- is readable via `memory.getContext`
- appears in `memory.listContexts`
- participates in local `memory.query`

Previously-added tests continue verifying the adjacent read/delete behavior.

### Validation performed
Executed truthfully without killing any processes, in the clean push worktree:
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/memory_context_local.go internal/httpapi/memory_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -run 'Test(MemoryContextSaveFallsBackToLocalRegistry|MemoryContextsFallsBackToLocalRegistry|ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally)' -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

### Why this matters
This makes the Go saved-context fallback story materially more complete and more operator-useful:
- degraded mode can now create, list, query, read, and delete saved contexts without TS help
- new locally-saved contexts immediately participate in the same local search/read surfaces added in the previous pass
- the route catalog and API behavior now tell the truth about that capability
- Go still does **not** claim full vector/LanceDB parity; this is scoped local registry ownership only

## Latest stabilization pass — local Go memory query/context fallback ownership (2026-04-06)

### Scope
This pass stayed inside the same Go-primary memory lane and targeted the remaining truthful local-state gaps around legacy memory context routes:
- stop treating generic `memory.query` as a placeholder/empty degraded-mode response when persisted local memory data already exists
- let `memory.getContext` return a real local body when the workspace context registry already carries inline content
- let `memory.deleteContext` mutate the local context registry instead of hard-failing during TypeScript outage
- keep the implementation honest about what is and is not actually persisted locally

### Findings
- The TypeScript `memoryRouter` contract is still simple here:
  - `memory.query` returns search rows from `MemoryManager.search(...)`
  - `memory.getContext` returns a record or `null`
  - `memory.deleteContext` returns `{ success: true }` after deletion
- The local workspace already had a durable registry at `.hypercode/memory/contexts.json`.
- The previous Go fallback path could already list those contexts, but it still left three operator-visible truth gaps:
  - `memory.query` could collapse to a placeholder/partial fallback even when local persisted memory/context data existed
  - `memory.getContext` always claimed no persisted body even when a registry entry included inline `content`
  - `memory.deleteContext` still claimed local deletion was impossible
- In the clean push worktree, a separate SQLite-backed fallback search already existed through `go/internal/memorystore/search.go`, but it only covered local SQLite-backed memory sources (`web_memories`, `imported_session_memories`) and did not close the context-registry gap.

### What changed
#### 1. Added dedicated local context-registry helpers
Created:
- `go/internal/httpapi/memory_context_local.go`

New local helpers now provide:
- canonical local context-registry path resolution
- durable writes back to `.hypercode/memory/contexts.json`
- context id normalization across `id` / `uuid`
- local context lookup by id
- local context deletion from the persisted registry
- local persisted query fallback built from exported memory/context records

#### 2. Upgraded generic memory search fallback to merge real local sources
Updated:
- `go/internal/httpapi/memory_handlers.go`

Behavior now:
- upstream TypeScript `memory.query` still wins when available
- local fallback first reuses the existing SQLite-backed search over persisted local memory tables
- then merges in registry/export-backed local memory/context results from `.hypercode/memory/contexts.json` and the local export path
- the fallback now returns truthful persisted search results instead of implying the local runtime has no useful query path

#### 3. Added truthful local `memory.getContext` ownership when inline content exists
Updated:
- `go/internal/httpapi/server.go`

Behavior now:
- upstream TypeScript `memory.getContext` still wins when available
- if the local registry entry includes inline `content`, Go now returns a real context payload with:
  - `id`
  - `content`
  - `metadata`
  - `score`
- if no local body exists, the route still truthfully reports that the local fallback has no persisted context body

#### 4. Added truthful local `memory.deleteContext` ownership
Updated:
- `go/internal/httpapi/server.go`

Behavior now:
- upstream TypeScript `memory.deleteContext` still wins when available
- when TypeScript is unavailable, Go removes the requested entry from `.hypercode/memory/contexts.json`
- the response stays explicit that this was handled by the local Go memory fallback
- the returned data remains simple and truthful: `{ success: <deleted> }`

### Regression coverage
Updated:
- `go/internal/httpapi/server_test.go`

Expanded focused coverage so degraded-mode memory behavior is now tested against real local context state:
- `TestMemoryContextsFallsBackToLocalRegistry`
- `TestReadOnlyMemoryRoutesFallBackLocally`
- `TestMemoryServiceBackedMutationsFallBackLocally`

The tests now explicitly seed `.hypercode/memory/contexts.json` with inline content and verify that:
- `memory.query` returns real persisted local search results
- `memory.getContext` returns a real local body for stored contexts
- `memory.deleteContext` removes the persisted local entry instead of failing

### Validation performed
Executed truthfully without killing any processes, in the clean push worktree:
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/memory_handlers.go internal/httpapi/memory_context_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -run 'Test(MemoryContextsFallsBackToLocalRegistry|ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally)' -count=1`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

### Why this matters
This closes another small but meaningful truthfulness gap in Go-primary degraded mode:
- persisted local memory contexts are now searchable in a useful way instead of being partially hidden behind placeholder fallback behavior
- locally stored inline context bodies are now actually readable through the public API
- operators can now delete persisted local contexts during TypeScript outage instead of being told the action is impossible
- the local Go memory story is incrementally more coherent without pretending full vector/LanceDB parity already exists

## Latest stabilization pass — Hyperharness update, saved-scripts parity, and build-drift repair (2026-04-05)

### Scope
This pass focused on a small but high-value stabilization cluster:
- move the tracked harness gitlink forward by updating `submodules/hyperharness` to the latest upstream HEAD
- keep `superai` absent from tracked submodule configuration
- finish truthful Go fallback ownership for saved-scripts create/delete/execute
- expose saved-scripts reads and mutations through the shared degraded-mode Next.js compat route
- repair the TypeScript/core/web build drift uncovered while validating that slice

### Submodule findings
- `.gitmodules` already pointed at `submodules/hyperharness` on the remote baseline, so no tracked `superai` submodule reappeared.
- The tracked `hyperharness` gitlink was still behind the latest upstream head.
- Updated gitlink target for `submodules/hyperharness` to `98785f5c95c0c870e71aa4c635dd293017504802`.

### Saved-scripts Go fallback work
Updated `go/internal/httpapi/server.go` so these routes now have truthful native fallback ownership when `/trpc` is unavailable:
- `POST /api/scripts/create`
- `POST /api/scripts/delete`
- `POST /api/scripts/execute`

Behavior:
- upstream TypeScript still wins when available
- create persists scripts into workspace `.hypercode/config.json`
- execute uses local `node -e` honestly instead of pretending a richer TypeScript executor exists
- delete removes the saved script from local config
- fallback responses explicitly return `fallback: "go-local-operator"` with the original `savedScripts.*` procedure names

### Saved-scripts web compat work
Updated `apps/web/src/app/api/trpc/[trpc]/route.ts` so degraded/local dashboard mode now supports:
- `savedScripts.list` via `GET /api/scripts`
- `savedScripts.create` via `POST /api/scripts/create`
- `savedScripts.update` via `POST /api/scripts/update`
- `savedScripts.delete` via `POST /api/scripts/delete`
- `savedScripts.execute` via `POST /api/scripts/execute`

The shared compat route now treats saved-scripts as operator mutations rather than pretending they belong to the MCP managed-server mutation path.

### Follow-up completion: `savedScripts.update`
After create/delete/execute were in place, the remaining meaningful mutation gap was `savedScripts.update`.

Additional validated behavior:
- Go now owns truthful local fallback behavior for `POST /api/scripts/update` when `/trpc` is unavailable.
- The fallback mutates the workspace `.hypercode/config.json` record for the requested script `uuid`.
- The shared Next.js compat route now translates `savedScripts.update` onto `/api/scripts/update` in degraded mode.
- Focused regression coverage was expanded from create/execute/delete to create/update/execute/delete, verifying that execution uses the updated script body.

### Additional build-drift fixes
Validation surfaced two real build drifts that were fixed as part of the tranche:
- restored the intended `series` field inside `packages/core/src/services/MetricsService.ts#getStats()` so `packages/core` builds cleanly again
- standardized the typed context router surface on `hypercodeContext`, keeping core and UI/dashboard consumers aligned

### Validation performed
Executed without killing any processes:
- `cd go && go test ./internal/httpapi -run 'TestSavedScriptsCreateDeleteAndExecuteFallBackToLocalConfig' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C packages/core run build`
- `pnpm -C apps/web run build`

### Why this matters
This tranche closes another operator-visible degraded-mode gap:
- saved scripts no longer become mutation-dead when `/trpc` is down
- Go now owns a truthful local fallback path for the highest-value saved-script actions
- the dashboard inherits that truth automatically through the shared compat layer
- the related core/web typed build drift is repaired instead of papered over

## Latest stabilization pass — Go-backed tool-set dashboard compatibility in degraded mode

### Context
After the previous dashboard compatibility slices, Go-primary degraded mode already covered:
- supervised session reads/mutations
- MCP runtime-control mutations
- API key and secret admin writes
- DB-backed `tools.setAlwaysOn`
- policy dashboard CRUD

The next operator-facing gap was the Tool Sets dashboard:
- `/dashboard/mcp/tool-sets` reads `toolSets.list`
- it mutates `toolSets.create` and `toolSets.delete`
- Go already had local fallback reads for `toolSets.list` / `toolSets.get`
- but tool-set writes were still bridge-only in the Go HTTP layer
- and the shared Next.js compat route still did not expose `toolSets.list` or tool-set mutations during `/trpc` outage

That meant another real operator-facing organizational surface could still become unusable in Go-primary degraded mode even though the local `metamcp.db` already had durable tool-set state.

### What changed
#### 1. Added native Go fallback ownership for tool-set writes
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

The Go HTTP server now falls back natively for:
- `POST /api/tool-sets/create`
- `POST /api/tool-sets/delete`

Native fallback behavior:
- creates/deletes `tool_sets` and `tool_set_items` rows in local `metamcp.db`
- preserves the selected tool UUID membership set
- returns truthful local fallback responses instead of pretending TypeScript handled the mutation

#### 2. Extended the shared Next.js compat route for tool-set reads/writes
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

The shared compat route now supports:
- `toolSets.list`
- `toolSets.create`
- `toolSets.delete`

These now map onto the Go HTTP surface when `/trpc` is unavailable:
- `/api/tool-sets`
- `/api/tool-sets/create`
- `/api/tool-sets/delete`

That makes the Tool Sets dashboard much closer to fully usable on top of the Go control plane in degraded mode, using the same shared compat strategy already applied to sessions, MCP runtime control, governance/admin writes, policy CRUD, and tool always-on toggles.

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestToolSetsCreateAndDeleteFallBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This continues the same migration pattern and extends Go-primary degraded-mode dashboard usability into another operator-focused organizational cluster:
- tool-set inventory is no longer just readable
- create/delete actions now have truthful Go fallback ownership through both the HTTP layer and the shared Next.js compat route
- another admin/organization surface can now function on top of the Go control plane without requiring `/trpc` uptime

The next best slices remain the same class of work:
- other operator-critical dashboard mutations still gated on `/trpc`
- bridge-only Go HTTP routes that already have enough local durable state to become truthful fallbacks
- deeper native Go ownership where the backend surface still does not exist at all

## Latest stabilization pass — Go-backed policy dashboard compatibility in degraded mode

### Context
After the previous dashboard compatibility slices, Go-primary degraded mode already covered:
- supervised session reads/mutations
- MCP runtime-control mutations
- API key and secret admin writes
- DB-backed `tools.setAlwaysOn`

The next governance/admin gap was the Policies dashboard:
- `/dashboard/mcp/policies` reads `policies.list`
- it mutates `policies.create` and `policies.delete`
- Go already had local fallback reads for policy inventory and detail
- but policy writes were still bridge-only in the Go HTTP layer
- and the shared Next.js compat route still did not expose `policies.list` or policy write mutations during `/trpc` outage

That meant the dashboard had a real governance/admin page that could still become unusable in Go-primary degraded mode despite the local `metamcp.db` already containing durable policy state.

### What changed
#### 1. Added native Go fallback ownership for policy writes
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

The Go HTTP server now falls back natively for:
- `POST /api/policies/create`
- `POST /api/policies/update`
- `POST /api/policies/delete`

Native fallback behavior:
- creates/updates/deletes rows in the local `policies` table in `metamcp.db`
- persists the JSON-encoded `rules` payload
- returns truthful local fallback responses instead of pretending TS handled the mutation

#### 2. Extended the shared Next.js compat route for policy reads/writes
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

The shared compat route now supports:
- `policies.list`
- `policies.create`
- `policies.update`
- `policies.delete`

These now map onto the Go HTTP surface when `/trpc` is unavailable:
- `/api/policies`
- `/api/policies/create`
- `/api/policies/update`
- `/api/policies/delete`

That makes the Policies dashboard much closer to fully usable on top of the Go control plane in degraded mode, following the same shared-compat strategy used for sessions, MCP runtime control, governance/admin writes, and tool always-on toggles.

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestPoliciesCreateUpdateAndDeleteFallBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This continues the same migration pattern and pushes Go-primary degraded-mode dashboard usability further into governance/admin ownership:
- the Policies dashboard is no longer just a TS-era surface for reads
- policy CRUD now has truthful Go fallback behavior through both the HTTP layer and the shared Next.js compat route
- another operator-facing governance cluster can now function on top of the Go control plane without requiring `/trpc` uptime

The next best slices remain the same category of work:
- continue finding operator-critical dashboard mutations still gated on `/trpc`
- prefer existing Go `/api/*` routes and local durable state
- add native Go fallback ownership only where the backend surface is still bridge-only

## Latest stabilization pass — Go-backed tool always-on mutation compatibility for MCP dashboards

### Context
After the previous slices, Go-primary degraded-mode dashboard compatibility already covered:
- supervised session lifecycle/details/state actions
- MCP inspector/runtime-control mutations
- API key and secret admin reads/writes

The next operator-facing gap was the database-backed tool preference toggle used by the MCP Catalog and MCP Inspector:
- both pages use `trpc.tools.setAlwaysOn`
- Go already had strong local tool inventory reads from `metamcp.db`
- but the write path behind `/api/tools/always-on` was still bridge-only
- and the shared Next.js compat route did not yet translate `tools.setAlwaysOn` onto the Go HTTP surface when `/trpc` was unavailable

That meant one common operator action — toggling whether a tool is advertised as always-on — could still fail in Go-primary degraded mode even though the local Go runtime already had durable `always_on` state in `metamcp.db`.

### What changed
#### 1. Added native Go fallback ownership for the always-on tool toggle
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

The Go HTTP server now falls back natively for:
- `POST /api/tools/always-on`

Native fallback behavior:
- updates the local `tools.always_on` field in `metamcp.db`
- updates the `updated_at` timestamp
- returns the updated local tool record through the same Go fallback lane

While implementing this, a real correctness issue was also fixed in the local tool scanner:
- local Go fallback tool payloads now preserve the actual tool `uuid`
- they no longer incorrectly mirrored `name` into the `uuid` field

That bug fix improves the truthfulness of the local tool fallback path beyond this one mutation slice.

#### 2. Extended the shared Next.js compat route for `tools.setAlwaysOn`
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

The shared compat route now supports:
- `tools.setAlwaysOn`

When `/trpc` is unavailable, it now maps onto:
- `/api/tools/always-on`

This makes the MCP Catalog and MCP Inspector's always-on toggle work in Go-primary degraded mode using the same shared compat strategy as the earlier session, MCP runtime, and governance/admin slices.

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestToolsAlwaysOnFallsBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This continues the same high-value migration pattern:
- reuse existing durable Go state
- reduce another real dashboard dependency on TS `/trpc`
- make Go-primary dashboard mode more operational, not just more visible

At this point, the compatibility-backed dashboard running on top of the Go control plane covers another common MCP operator action cluster:
- toggling tool always-on advertisement state in DB-backed tool inventory

The remaining best slices are still the same kind of work:
- other operator-critical mutations still gated on `/trpc`
- bridge-only Go HTTP routes that already have enough local state to gain truthful fallback ownership
- deeper Go-native ownership where the backend surface does not yet exist at all

## Latest stabilization pass — Go-backed operator admin write compatibility for API keys and secrets

### Context
After the previous dashboard slices, Go-primary mode already had:
- compatibility-backed dashboard startup
- Go-backed supervised-session dashboard reads/mutations in degraded mode
- Go-backed MCP inspector/runtime-control mutations in degraded mode

The next operator-facing gap was the admin-governance cluster:
- the API Keys dashboard (`/dashboard/mcp/api-keys`)
- the Secrets Vault (`/dashboard/settings/secrets`)

Before this pass, Go already had some local read fallback here:
- `apiKeys.list`
- `apiKeys.get`
- `secrets.list`

But the write surfaces were still materially weaker:
- Go HTTP routes for `apiKeys.create` / `apiKeys.delete` were still bridge-only
- Go HTTP routes for `secrets.set` / `secrets.delete` were still bridge-only
- the shared Next.js compat route did not yet expose `secrets.list` or bridge these write mutations onto Go-owned HTTP fallback behavior

That meant the governance/admin dashboard cluster could still become partially unusable when `/trpc` was unavailable, even though the local Go runtime already had enough `metamcp.db` state to own the durable subset truthfully.

### What changed
#### 1. Added native Go fallback ownership for API key writes
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

The Go HTTP server now falls back natively for:
- `POST /api/api-keys/create`
- `POST /api/api-keys/delete`

Native fallback behavior:
- creates/deletes API key rows in local `metamcp.db`
- scopes fallback to local/public (`user_id IS NULL`) records, matching the existing local list/get posture
- returns truthful local fallback metadata instead of pretending the TypeScript router handled the mutation

The local fallback now also surfaces `key_prefix` in the Go API-key payloads, which aligns better with the dashboard's existing API-key normalizer/UI expectations.

#### 2. Added native Go fallback ownership for secret writes
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

The Go HTTP server now falls back natively for:
- `POST /api/secrets/set`
- `POST /api/secrets/delete`

Native fallback behavior:
- persists/removes records in local `workspace_secrets` inside `metamcp.db`
- uses an upsert path for secret writes
- keeps list responses value-redacted while still allowing truthful mutation success/failure behavior

#### 3. Extended the shared Next.js compat route for operator admin reads/writes
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

The shared compat route now supports:
- `secrets.list`
- `apiKeys.create`
- `apiKeys.delete`
- `secrets.set`
- `secrets.delete`

These now map onto the Go HTTP surface when `/trpc` is unavailable:
- `/api/secrets`
- `/api/api-keys/create`
- `/api/api-keys/delete`
- `/api/secrets/set`
- `/api/secrets/delete`

This keeps the same migration strategy used in the previous dashboard slices:
- prefer existing/native Go HTTP truth where possible
- reduce dashboard dependence on TS-only mutation contracts
- keep the shared compat route as the single place where degraded-mode UI behavior becomes truthful

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'TestSecretsSetAndDeleteFallBackToLocalDB|TestAPIKeysCreateAndDeleteFallBackToLocalDB|TestSecretsListFallsBackToLocalDB|TestAPIKeysGetFallsBackToLocalDB' -count=1`
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This pass extends Go-primary dashboard usability beyond sessions and MCP runtime control into operator governance/admin actions:
- the API Keys page is now closer to usable in degraded mode, not just readable
- the Secrets Vault can now read and mutate local secret metadata/state through Go-backed fallback paths
- the shared web compat layer now covers another high-value operator cluster without inventing fake success or forcing `/trpc` uptime

The next best slices are still the same category of work:
- continue finding operator-critical dashboard mutations that already have plausible Go `/api/*` ownership
- wire them through the shared compat layer
- and only add new Go backend ownership where that native surface does not yet exist

## Latest stabilization pass — Go-backed MCP dashboard mutation compatibility in web fallback mode

### Context
After the previous pass, Go-primary dashboard startup was confirmed by real operator logs and the session dashboard's core supervisor actions were wired onto the Go `/api/sessions/supervisor/*` routes.

That left the next high-value operator gap inside the MCP dashboards:
- MCP inspector/search/system pages use several mutation-heavy `trpc.mcp.*` actions
- the Go backend already had real endpoints and truthful local fallback behavior for many of them
- but the shared Next.js `/api/trpc/[trpc]` compat route still did **not** translate those mutation procedures onto the Go `/api/mcp/*` surface when `/trpc` was unavailable

So the UI could read Go-backed MCP state in degraded mode, yet still fail on some of the most important operator actions:
- changing tool preferences
- loading/unloading tools
- clearing telemetry/eviction history
- changing lifecycle modes

### What changed
#### 1. Extended the shared dashboard compat route for Go-backed MCP runtime mutations
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`

The local compat mutation layer now translates these procedures onto the existing Go MCP HTTP surface when `/trpc` is unavailable:
- `mcp.setToolPreferences` → `/api/mcp/preferences`
- `mcp.loadTool` → `/api/mcp/working-set/load`
- `mcp.unloadTool` → `/api/mcp/working-set/unload`
- `mcp.clearToolSelectionTelemetry` → `/api/mcp/tool-selection-telemetry/clear`
- `mcp.clearWorkingSetEvictionHistory` → `/api/mcp/working-set/evictions/clear`
- `mcp.setLifecycleModes` → `/api/mcp/lifecycle-modes`

This follows the same pattern as the session-dashboard slice:
- prefer existing Go-owned truth
- avoid page-by-page one-off logic
- keep the compat route as the shared place where degraded-mode UI behavior becomes truthful

#### 2. Added focused regression coverage for the MCP inspector/search mutation cluster
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

Added a regression proving that when `/trpc` is unavailable, the local compat layer now prefers Go-native MCP mutation routes for:
- `mcp.setToolPreferences`
- `mcp.loadTool`
- `mcp.unloadTool`
- `mcp.clearToolSelectionTelemetry`
- `mcp.clearWorkingSetEvictionHistory`
- `mcp.setLifecycleModes`

### Validation
Executed truthfully without killing any processes:
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This is another meaningful reduction in the practical Go-primary dashboard gap:
- MCP dashboards can now perform more of their core operator actions in degraded mode on top of the Go control plane
- Go-primary startup plus compatibility-backed dashboard mode now covers both:
  - supervised session lifecycle/details/state actions
  - MCP inspector/runtime-control mutation actions
- the dashboard is becoming more operationally useful against the Go backend without pretending the whole TS-era contract is gone yet

The next best slices remain the same pattern:
- identify other operator-critical dashboard mutations that still fail without `/trpc`
- map them onto already-existing Go `/api/*` endpoints where possible
- only add new Go ownership when the backend surface does not already exist

## Latest stabilization pass — Go-backed session dashboard compatibility in web fallback mode

### Context
After the previous pass, Go-primary startup could finally launch the Next.js dashboard instead of hard-skipping it. Real operator logs now confirm that behavior is working in practice:
- Go control plane started on port `4001`
- the Next.js dashboard started on port `3000`
- startup truthfully reported:
  - `Dashboard request: requested`
  - `Dashboard integration: compatibility-backed web runtime can start against the Go control plane.`
  - `Dashboard mode: started compatibility-backed dashboard runtime`

That closed the dashboard-startup gap, but one important operator problem still remained:
- the session dashboard and session details views used `trpc.session.*` reads/mutations
- the local dashboard compat bridge could already fall back to Go for many read-heavy procedures
- but it still did **not** translate the key session-supervisor reads/mutations onto the existing Go `/api/sessions/supervisor/*` routes when `/trpc` was unavailable

That meant the dashboard could launch against Go-primary runtime, yet session create/start/stop/restart/details actions could still fail purely because the web compat layer had not been taught to use the Go session-supervisor HTTP surface that already existed.

### What changed
#### 1. Extended the local dashboard compat route to cover Go-backed session-supervisor reads
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`

The local compat route now supports Go-backed fallback for these dashboard/session-detail reads:
- `session.get`
- `session.logs`
- `session.attachInfo`
- `session.health`

These now map onto the existing Go control-plane routes:
- `/api/sessions/supervisor/get`
- `/api/sessions/supervisor/logs`
- `/api/sessions/supervisor/attach-info`
- `/api/sessions/supervisor/health`

#### 2. Added Go-backed session mutation fallback for the session dashboard
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.ts`

The local compat mutation path now also supports these session procedures when upstream `/trpc` is unavailable:
- `session.create`
- `session.start`
- `session.stop`
- `session.restart`
- `session.executeShell`
- `session.updateState`
- `session.clear`

These are translated onto the already-existing Go HTTP routes under:
- `/api/sessions/supervisor/create`
- `/api/sessions/supervisor/start`
- `/api/sessions/supervisor/stop`
- `/api/sessions/supervisor/restart`
- `/api/sessions/supervisor/execute-shell`
- `/api/sessions/supervisor/update-state`
- `/api/sessions/supervisor/clear`

This is exactly the kind of slice the migration now needs most:
- not inventing new backend behavior
- but teaching the dashboard compatibility layer to use Go-owned truth that already exists

#### 3. Added focused regression coverage for the full session dashboard compat contract
Updated:
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`

Added a focused test proving that when `/trpc` is unavailable, the local dashboard compat layer now prefers Go-native session-supervisor reads/mutations for:
- `session.get`
- `session.logs`
- `session.attachInfo`
- `session.health`
- `session.getState`
- `session.create`
- `session.start`
- `session.stop`
- `session.restart`
- `session.executeShell`
- `session.updateState`
- `session.clear`

### Validation
Executed truthfully without killing any processes:
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This pass makes the new Go-primary dashboard startup materially more useful:
- the dashboard can now start against the Go control plane
- the session dashboard is no longer read-only-ish in degraded mode
- operators can now use the session dashboard and session detail surfaces for the highest-value supervisor actions even when the TS `/trpc` backend is unavailable

This still does **not** mean the entire dashboard backend contract is Go-native. But it does mean one of the most operator-critical dashboard clusters — supervised session lifecycle/details/state actions — is now much closer to functioning truthfully on top of the Go control plane.

## Latest stabilization pass — Go-primary dashboard startup compatibility

### Context
After the previous pass, startup truth was improved and the logs were honest about Go-primary behavior — but they also showed a conservative limitation that no longer matched the current implementation reality:
- Go-primary startup always skipped launching the web dashboard
- the reason given was that the current web UI still depends heavily on the Node/tRPC compatibility backend

That dependency is still real, but the repository has already accumulated a large amount of shared web compatibility work:
- the Next.js dashboard has its own Node-hosted web runtime
- the in-app `/api/trpc/[trpc]` route can already fall back to many Go-native `/api/*` endpoints when upstream `/trpc` is unavailable
- the CLI already knows how to launch the dashboard with environment variables pointing it at the active control plane base

So the old hard-skip behavior had become too pessimistic. It was blocking a now-viable compatibility-backed dashboard startup path in Go-primary mode.

### What changed
#### 1. Go-primary startup can now launch the dashboard in compatibility-backed mode
Updated:
- `packages/cli/src/commands/start.ts`
- `packages/cli/src/commands/start.test.ts`

The startup policy changed from:
- Go runtime => always skip dashboard startup

to:
- Go runtime => allow the Next.js dashboard to start as a compatibility-backed web runtime targeting the live Go control plane

This is still described truthfully:
- the dashboard is **not** being presented as fully Go-native
- the startup output now warns that some mutation-heavy surfaces may still rely on compatibility fallbacks during the migration

#### 2. Updated startup summaries and runtime capability classification
The CLI summary for Go runtime now says:
- `Dashboard integration: compatibility-backed web runtime can start against the Go control plane.`

And the startup banner/runtime-mode reporting now distinguishes Go-backed dashboard runs with labels such as:
- `compatibility-backed dashboard runtime targeting the Go control plane`
- `started compatibility-backed dashboard runtime`
- `reused existing compatibility-backed dashboard runtime`

That keeps the operator-facing startup contract explicit:
- the dashboard can launch
- it is compatibility-backed
- the Go control plane is still the backend authority being targeted

#### 3. Validated that the dashboard is buildable for this startup path
Because this slice changes actual startup behavior, it needed stronger validation than a pure CLI unit test.

Validated:
- CLI build still succeeds
- CLI startup tests still pass
- `apps/web` production build still succeeds

That is important because Go-primary startup will now actually try to launch the dashboard instead of hard-skipping it.

### Validation
Executed truthfully without killing any processes:
- `pnpm -C packages/cli run build`
- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`
- `pnpm -C apps/web run build`

### Why this matters
This closes part of the practical operator gap between "Go control plane is running" and "the dashboard is usable":
- Go-primary startup no longer unnecessarily withholds the dashboard when the compatibility-backed web runtime is already viable
- startup messaging remains truthful about the remaining migration limits
- the repo now better reflects its actual maturity: Go can own the control plane while the web UI runs as a compatibility client layered on top

This still does **not** mean the dashboard backend contract is fully Go-native. The remaining work is to keep converting more mutation-heavy and TS-era backend expectations into direct Go-owned contracts so the compatibility layer becomes thinner over time instead of serving as a permanent crutch.

## Latest stabilization pass — startup dashboard truthfulness and harness submodule maintenance

### Context
The newest real operator startup logs confirmed that the Go-primary startup probes are now behaving truthfully on repeated runs:
- install was skipped when Go-primary dependencies were already ready
- build was skipped on the later run when the Go-primary artifacts were already current
- port reuse/fall-forward remained explicit (`4000` occupied → `4001` used)

But the same logs also exposed one remaining contradiction in the CLI banner:
- the startup banner still printed `Dashboard: enabled`
- later lines correctly said the integrated dashboard was being skipped in Go-primary mode because the current web UI still depends on the Node/tRPC compatibility backend

This pass fixed that contradiction and completed the requested submodule maintenance work at the same time.

### What changed
#### 1. Fixed the startup banner so dashboard output reflects request-vs-actual runtime truth
Updated:
- `packages/cli/src/commands/start.ts`
- generated CLI build output via `pnpm -C packages/cli run build`

The startup banner now says:
- `Dashboard request: requested`
- or `Dashboard request: disabled`

instead of incorrectly claiming the dashboard was already enabled before the runtime decision had actually been resolved.

The CLI also now prints an explicit runtime-resolved dashboard mode line later in startup, such as:
- `Dashboard mode: compatibility-only; skipped for Go runtime`
- `Dashboard mode: started integrated dashboard runtime`
- `Dashboard mode: reused existing integrated dashboard runtime`

That keeps the early banner honest while still making the eventual active dashboard posture operator-visible.

#### 2. Incorporated the newer startup logs as current truth evidence
The two pasted `start.bat` runs now clearly show the current intended Go-primary behavior:
- first run after sources changed:
  - install skipped
  - build ran because Go sources were newer than the Go binary
- later repeat run:
  - install skipped
  - build skipped because artifacts were already current
- both runs:
  - preserved the occupied-port fallback from `4000` to `4001`
  - started the Go control plane via the prebuilt binary
  - warned explicitly that integrated dashboard startup is still skipped for Go runtime

That newer evidence supersedes the older contradictory pre-fix startup logs as the current runtime truth.

#### 3. Fast-forwarded `submodules/hyperharness` to current upstream and removed the tracked `submodules/superai` submodule
Updated:
- `submodules/hyperharness` gitlink
- `.gitmodules`
- removed tracked submodule path:
  - `submodules/superai`

The `hyperharness` submodule was advanced from:
- `d6775ed7cb776791a3d370723bdb17d76d017495`

to:
- `37830d726a39988cdb54f073c21c1a0924dfea0b`

That upstream fast-forward brings in a large new tranche of Go-first harness work, including expanded Cobra/TUI/foundation/session/tool surfaces inside the harness upstream.

The `superai` submodule was removed from the tracked workspace configuration as requested. This does **not** remove support for the `superai-cli` harness identity from HyperCode's own session/harness catalogs; it only removes the separate tracked upstream checkout.

### Validation
Executed truthfully without killing any processes:
- `git -C submodules/hyperharness fetch origin main`
- `git -C submodules/hyperharness pull --ff-only origin main`
- `git submodule deinit -f -- submodules/superai`
- `git rm -f submodules/superai`
- `pnpm -C packages/cli run build`
- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`

### Why this matters
This pass did not attempt another broad orchestration rewrite. Instead, it tightened a directly operator-visible truth surface and aligned the tracked harness references with the current Go-primary direction:
- startup output no longer over-claims dashboard availability in Go-primary mode
- repeated `start.bat` evidence now matches the current documented behavior
- HyperCode keeps `hyperharness` as the primary tracked harness upstream while dropping the separate `superai` submodule checkout

The highest-value next step after this pass is to continue shrinking the remaining Go-primary/dashboard compatibility gap so more dashboard surfaces can move from "compatibility-only" toward direct Go-owned truth.

## Latest stabilization pass — worktree/isolation parity for Go fallback sessions

### Context
After the recent Go supervisor lifecycle, restore, and execution-policy work, the highest-value remaining parity gap in the fallback supervisor lane was still worktree/isolation ownership.

The TypeScript supervisor already had a truthful pattern here:
- only allocate a worktree when another active session is already occupying the same requested working directory
- otherwise keep the first session on the requested workspace directly

The Go fallback sessions still exposed `worktreePath` / `isolateWorktree` fields in their shape, but they did not actually own any comparable worktree allocation behavior yet.

### What changed
#### 1. Added a native Go git-worktree manager
Created:
- `go/internal/git/worktree.go`

The new Go helper provides a narrow, truthful worktree surface:
- detect whether the configured root is a Git working tree
- create a task worktree under:
  - `.hypercode/worktrees/<session-id>`
- create a `task/<session-id>` branch when needed
- clean up a named task worktree if/when that surface is used later

This is intentionally smaller than trying to port the entire TypeScript orchestration ecosystem around worktrees all at once.

#### 2. Wired the Go supervisor manager to allocate worktrees only for conflicting sessions
Updated:
- `go/internal/supervisor/supervisor.go`
- `go/internal/httpapi/server.go`

The Go supervisor manager now accepts a worktree root and uses the new Go git-worktree manager.

Its fallback behavior now mirrors the TypeScript rule closely:
- if `isolateWorktree` is not requested, stay on the requested working directory
- if `isolateWorktree` is requested but no conflicting active session already occupies that working directory, stay on the requested working directory
- if `isolateWorktree` is requested **and** another active session already occupies that working directory, allocate a dedicated worktree and set:
  - `workingDirectory = worktreePath`
  - `isolateWorktree = true`

If worktree creation fails, the Go fallback stays truthful:
- the session still gets created
- it logs that isolation was requested but unavailable
- it continues without pretending a worktree exists

#### 3. Added focused regression coverage for both manager-level and HTTP-level worktree fallback behavior
Updated:
- `go/internal/supervisor/supervisor_test.go`
- `go/internal/httpapi/server_test.go`

Added coverage for:
- creating a real temporary Git repo in tests
- creating a first fallback session that stays on the base workspace
- creating a second conflicting fallback session that gets a dedicated Go worktree
- verifying the HTTP create fallback exposes:
  - `isolateWorktree: true`
  - `worktreePath`
  - a worktree-backed `workingDirectory`

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/git/worktree.go internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi ./internal/git -run 'TestManagerAllocatesWorktreeForConflictingSession|TestSupervisorSessionCreateFallsBackToLocalGoWorktreeIsolation|TestCreateSessionCapturesMetadata|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

### Why this matters
This closes a major structural gap in the Go fallback supervisor lane:
- fallback sessions now have truthful worktree isolation behavior instead of only shape-level placeholders
- dashboard/session views can now see real `worktreePath` / `isolateWorktree` behavior from the Go-owned supervisor path
- Go fallback session creation is closer to TypeScript parity for parallel session safety on the same repo workspace

This still does **not** mean full TS supervisor parity. The biggest remaining gaps are now deeper around richer restore/control semantics and any niche orchestration behaviors built around the broader TypeScript supervisor ecosystem. But worktree/isolation is no longer just a missing checkbox in the Go fallback path.

## Latest stabilization pass — execution-policy parity for Go fallback sessions

### Context
After the recent Go supervisor lifecycle and restore work, fallback sessions were durable and operator-usable, but they still lacked one major piece of session metadata that the dashboard and session details views already expected from the TypeScript supervisor:
- `executionPolicy`

That meant Go fallback sessions could exist, start, stop, restore, and execute shell commands, but they still looked structurally thinner than TypeScript-owned sessions in operator-visible views. It also meant the native `execute-shell` fallback was choosing a generic shell path instead of using a session-specific execution policy.

### What changed
#### 1. Added execution-policy metadata to Go supervised-session snapshots
Updated:
- `go/internal/supervisor/supervisor.go`
- `go/internal/supervisor/supervisor_test.go`

Go fallback sessions now carry a truthful `executionPolicy` payload with the same high-signal fields the dashboard already expects:
- `requestedProfile`
- `effectiveProfile`
- `shellId`
- `shellLabel`
- `shellFamily`
- `shellPath`
- `supportsPowerShell`
- `supportsPosixShell`
- `reason`

The current Go selection logic is intentionally narrower than the TypeScript implementation, but it is now honest, explicit, and persisted across restore.

#### 2. Added execution-policy environment propagation for Go fallback sessions
The Go supervisor now injects execution-policy env markers into the supervised session environment, including values such as:
- `HYPERCODE_EXECUTION_PROFILE_REQUESTED`
- `HYPERCODE_EXECUTION_PROFILE_EFFECTIVE`
- `HYPERCODE_EXECUTION_SHELL_ID`
- `HYPERCODE_EXECUTION_SHELL_LABEL`
- `HYPERCODE_EXECUTION_SHELL_FAMILY`
- `HYPERCODE_EXECUTION_SHELL_PATH`
- `HYPERCODE_EXECUTION_POLICY_REASON`
- `HYPERCODE_SUPPORTS_POWERSHELL`
- `HYPERCODE_SUPPORTS_POSIX_SHELL`

This keeps the Go fallback aligned with the operator-visible shell posture instead of only exposing that information indirectly.

#### 3. Native `execute-shell` fallback now uses the session execution policy
Updated:
- `go/internal/httpapi/session_supervisor_handlers.go`

The native Go `session.executeShell` fallback now prefers the session's own execution policy to choose how one-shot shell commands are invoked:
- PowerShell policy → PowerShell invocation
- cmd policy → cmd invocation
- POSIX policy → shell `-lc`
- WSL policy → WSL/bash invocation
- fallback → existing generic shell behavior

This means the shell-execution fallback now reflects the session's own declared runtime posture instead of always using one global default.

#### 4. Added focused regression coverage for execution-policy visibility
Updated:
- `go/internal/supervisor/supervisor_test.go`
- `go/internal/httpapi/server_test.go`

Added/validated:
- manager-level checks that created sessions include execution-policy env markers
- route-level checks that fallback session create/get payloads now surface `executionPolicy`
- route-level checks that native `execute-shell` responses now include shell-family/path metadata derived from the chosen policy

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi -run 'TestCreateSessionCapturesMetadata|TestManagerPersistsAndRestoresCreatedSessions|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRestoreFallsBackToLocalGoPersistence' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

### Why this matters
This does not complete full execution-policy parity with the TypeScript supervisor, but it closes a very visible structural gap:
- Go fallback sessions now look and behave more like real supervised sessions in the dashboard
- native shell execution is now tied to session-specific policy instead of a generic fallback shell
- restore no longer strips away the operator-facing shell posture metadata for Go-owned fallback sessions

The highest-value remaining supervisor parity gap after this slice is still worktree/isolation ownership.

## Latest stabilization pass — native Go restore fallback for persisted supervisor sessions

### Context
After the previous durability pass, Go fallback-created supervised sessions could survive Go runtime restart via `.hypercode-go/session-supervisor.json`, but the public restore route still remained bridge-only:
- `POST /api/sessions/supervisor/restore`

That meant Go could durably remember its own fallback supervisor inventory, but it could not yet explicitly reload that persisted inventory on demand through the same public operator surface when the TypeScript runtime was unavailable.

### What changed
#### 1. Added an explicit public restore method to the Go supervisor manager
Updated:
- `go/internal/supervisor/supervisor.go`

The Go supervisor manager now exposes:
- `RestoreSessions()`
- `GetRestoreStatus()`

This allows the HTTP layer to explicitly reload the Go-owned persisted supervisor inventory instead of depending only on constructor-time restore behavior.

#### 2. Reworked the public restore route from bridge-only to upstream-first with native Go fallback
Updated:
- `go/internal/httpapi/session_supervisor_handlers.go`
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

`POST /api/sessions/supervisor/restore` now:
- tries TypeScript first when available
- falls back to reloading the native Go persisted supervisor inventory when TypeScript is unavailable
- returns explicit fallback metadata under:
  - `fallback: "go-local-supervisor"`

The local restore response now truthfully includes:
- `restoredCount`
- `sessions`
- `restoredSessions`
- `autoResumeCount`
- `lastRestoreAt`

That makes the restore result operator-visible instead of silently relying on server startup side effects.

#### 3. Added focused route coverage for restore-on-demand
Updated:
- `go/internal/httpapi/server_test.go`

Added a regression that:
- starts a Go server with an empty in-memory supervisor inventory
- writes a persisted Go supervisor state file directly to `.hypercode-go/session-supervisor.json`
- calls `/api/sessions/supervisor/restore`
- verifies the route reloads the persisted session into the live Go supervisor inventory
- verifies subsequent `list` reflects the restored session

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/server.go internal/httpapi/server_test.go internal/httpapi/session_supervisor_handlers.go internal/supervisor/supervisor.go`
- `cd go && go test ./internal/httpapi ./internal/supervisor -run 'TestSupervisorSessionRestoreFallsBackToLocalGoPersistence|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionBridgeRoutes|TestManagerPersistsAndRestoresCreatedSessions|TestManagerRestoreNormalizesTransientRunningStateToStoppedWithoutAutoResume' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

### Why this matters
This closes the loop on the new Go supervisor durability lane:
- Go can now persist its fallback supervisor inventory
- Go can restore that inventory on startup
- Go can also explicitly reload that inventory through the public restore route when TS is unavailable

That is still not full TypeScript supervisor parity, but it makes the Go fallback lifecycle much more coherent and operator-credible.

## Latest stabilization pass — durable Go supervisor lifecycle persistence across runtime restarts

### Context
The previous Go supervisor pass made the public supervised-session route family usable during a TypeScript outage, but it still had one major truth gap: the new native Go supervisor lifecycle fallback was **in-memory only**. A Go runtime restart would erase the fallback-created session inventory even though the operator-facing routes already behaved like a real local supervisor.

That made the next step obvious: persist the Go-owned supervised-session fallback so it survives Go runtime restarts and can truthfully restore local session inventory after the control plane comes back.

### What changed
#### 1. Added durable persistence to the Go supervisor manager
Updated:
- `go/internal/supervisor/supervisor.go`
- `go/internal/supervisor/supervisor_test.go`

The Go supervisor manager now supports:
- a configured persistence path
- persisted session snapshots with logs/metadata/history
- restore-time normalization of transient states
- restore-status tracking

The durable store now lives in the Go config dir as:
- `.hypercode-go/session-supervisor.json`

This is intentionally Go-owned state, not an attempted silent takeover of the TypeScript supervisor persistence file.

#### 2. Restored sessions now survive Go runtime restart and normalize transient process states honestly
Restore semantics now mirror the same basic truthfulness pattern used in the TypeScript supervisor:
- persisted sessions are reloaded on manager startup
- transient process states are normalized on restore rather than blindly trusted
- when auto-resume is disabled, transient running/starting/stopping states restore as `stopped`
- when auto-resume is enabled, transient states restore as `restarting` and Go may attempt to resume them
- runtime-only values like live PID and active restart timer are not persisted as if they survived restart

This matters because it keeps the restored state credible instead of pretending the original process handle still exists after the runtime restarted.

#### 3. Wired the Go HTTP server to use the durable supervisor manager
Updated:
- `go/internal/httpapi/server.go`

The server now constructs the native Go supervisor manager with a real persistence path in the Go config dir, which means the public fallback routes now preserve local supervisor inventory across Go server recreation/restart.

#### 4. Added focused durability regression coverage
Updated:
- `go/internal/supervisor/supervisor_test.go`
- `go/internal/httpapi/server_test.go`

Added coverage for:
- manager-level persistence and restore of a created session
- restore normalization of a persisted transient running session when auto-resume is disabled
- HTTP-level durability across server restart: create a native fallback supervised session, recreate the Go server with the same config dir, then verify `list/get` still surface the restored session

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/supervisor ./internal/httpapi -run 'TestManagerPersistsAndRestoresCreatedSessions|TestManagerRestoreNormalizesTransientRunningStateToStoppedWithoutAutoResume|TestSupervisorSessionRoutesPersistAcrossServerRestart|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionStateFallsBackToLocalGoState|TestSupervisorSessionBridgeRoutes' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

### Why this matters
This upgrades the Go supervisor fallback from:
- "operator-useful, but ephemeral"

into:
- "operator-useful, and durable across Go runtime restart"

That still does **not** mean full TypeScript parity. The main remaining gaps are still:
- execution-policy parity
- worktree isolation parity
- TypeScript memory-bootstrap integration
- broader restore/control-plane parity beyond the Go-owned fallback surface

But the native Go supervisor fallback is now much closer to being a credible authoritative local runtime instead of just a temporary emergency lane.

## Latest stabilization pass — native Go fallback for public supervised session lifecycle routes

### Context
After the previous session-state work, Go could truthfully own the shared session-state core during a TypeScript outage, but the **public supervised session lifecycle** still remained mostly bridge-first at the operator route layer:
- `session.list`
- `session.get`
- `session.create`
- `session.start`
- `session.stop`
- `session.restart`
- `session.logs`
- `session.attachInfo`
- `session.health`
- `session.executeShell`

That meant the dashboard/session operator surfaces could preserve some shared state truth, but they still could not fully create/start/inspect supervised sessions through the Go HTTP surface when the TypeScript control plane was unavailable.

### What changed
#### 1. Upgraded the native Go supervisor runtime from a thin process record into a truthful supervised-session manager
Updated:
- `go/internal/supervisor/supervisor.go`
- `go/internal/supervisor/supervisor_test.go`

The Go supervisor manager now tracks enough operator-visible state to back the public session routes truthfully:
- session identity and naming
- `cliType`
- requested vs effective working directory
- execution profile string
- auto-restart configuration and restart counters
- session status lifecycle:
  - `created`
  - `starting`
  - `running`
  - `stopping`
  - `stopped`
  - `restarting`
  - `error`
- buffered session logs (`stdout`, `stderr`, `system`)
- attach readiness metadata
- health snapshots with restart/failure tracking
- last exit code / signal / error message
- scheduled restart timestamps for restartable failures

This is still intentionally lighter than the full TypeScript `SessionSupervisor` world:
- no persisted supervisor inventory yet
- no execution-policy/worktree parity yet
- no TypeScript memory-bootstrap enrichment

But it is now a real native Go supervised-session runtime instead of only a thin in-memory process map.

#### 2. Reworked the public supervised-session HTTP routes from bridge-only to upstream-first with native Go fallback
Updated:
- `go/internal/httpapi/session_supervisor_handlers.go`
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`

These public routes now try TypeScript first and fall back natively in Go when the upstream is unavailable:
- `GET /api/sessions/supervisor/list`
- `GET /api/sessions/supervisor/get`
- `POST /api/sessions/supervisor/create`
- `POST /api/sessions/supervisor/start`
- `POST /api/sessions/supervisor/stop`
- `POST /api/sessions/supervisor/restart`
- `GET /api/sessions/supervisor/logs`
- `GET /api/sessions/supervisor/attach-info`
- `GET /api/sessions/supervisor/health`
- `POST /api/sessions/supervisor/execute-shell`

Fallback semantics are explicit:
- lifecycle routes use the native Go in-memory supervisor manager
- `logs` uses the native Go session log buffer
- `attach-info` uses native Go PID/readiness inference
- `health` uses native Go failure/restart tracking
- `execute-shell` uses a truthful native Go one-shot shell execution fallback in the supervised session working directory and environment

All these fallback responses now expose:
- `fallback: "go-local-supervisor"`

#### 3. Kept the earlier persisted session-state fallback and layered the new lifecycle fallback alongside it
The prior session-state slice remains intact:
- `/api/sessions/supervisor/state`
- `/api/sessions/supervisor/update-state`
- `/api/sessions/supervisor/clear`
- `/api/sessions/supervisor/heartbeat`

So the Go session story is now split truthfully into two native fallback lanes:
1. **persisted shared session state** via `.hypercode-session.json`
2. **in-memory supervised process lifecycle** via the Go supervisor manager

That distinction matters because the new lifecycle fallback is useful and operator-visible, but it is not yet restart-persistent.

#### 4. Added focused regression coverage for both the new native route path and the broader package validation drift it exposed
Updated:
- `go/internal/httpapi/server_test.go`
- `go/internal/git/submodules_test.go`

Added/validated:
- a new public-route fallback test covering create/list/get/start/logs/attach-info/health/execute-shell/stop through the native Go supervisor path
- the existing bridge-path test still passing for the same route family
- renamed stale `submodules/hypercode` test fixtures to `submodules/hyperharness` after a broader package run surfaced unrelated test drift

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/supervisor/supervisor.go internal/supervisor/supervisor_test.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go internal/git/submodules_test.go`
- `cd go && go test ./internal/httpapi ./internal/supervisor -run 'TestSupervisorSessionBridgeRoutes|TestSupervisorSessionRoutesFallBackToLocalGoSupervisor|TestSupervisorSessionStateFallsBackToLocalGoState|Test(CreateSessionRejectsDuplicates|StartSessionRunsShortLivedProcessToStopped|StartSessionMissingReturnsError|FailingProcessRestartsAndEventuallyFails|CreateSessionCapturesMetadata|StartSessionWithCustomEnvCanRunProcess)' -count=1`
- `cd go && go test ./internal/httpapi ./internal/supervisor ./internal/git -count=1`

### Why this matters
This moves the Go backend one layer deeper from:
- "dashboard compat can sometimes read Go session truth"

into:
- "the public Go session-supervisor HTTP surface can now actually create/start/inspect/stop supervised sessions itself when TS is unavailable"

It is still not full parity with the TypeScript `SessionSupervisor` implementation. The most important remaining limitation is that the new Go supervisor lifecycle fallback is still **in-memory**, not yet durable across runtime restarts. But this is a meaningful and operator-visible reduction in bridge dependence, and it unlocks the next logical step: adding persistence and richer execution/worktree parity to the Go supervisor path itself.

## Latest stabilization pass — native Go session-state fallback for supervisor state routes

### Context
The previous compat-layer work already taught the dashboard to prefer Go `/api/sessions/supervisor/state` over a synthetic placeholder when TypeScript `session.getState` was unavailable. That improved degraded-mode reads, but the Go endpoint itself was still effectively bridge-first without its own truthful state ownership for the small but high-signal session-state mutation cluster:
- `session.getState`
- `session.updateState`
- `session.clear`
- `session.heartbeat`

In practice, that meant dashboard/session surfaces could ask Go for the truth during a TS outage, but Go still had no native local source for the session state beyond the bridge. This was the next obvious parity hole to close before attempting deeper supervisor/session mutation ownership.

### What changed
#### 1. Added a native local Go session-state manager
Created:
- `go/internal/httpapi/session_state_local.go`

The new manager:
- persists state to the workspace-level `.hypercode-session.json` file, matching the TypeScript `SessionManager` persistence location and intent
- loads prior session state on startup when present
- maintains truthful fields already consumed by the TS/dashboard world:
  - `isAutoDriveActive`
  - `activeGoal`
  - `lastObjective`
  - `lastHeartbeat`
  - optional `threadId`
- updates heartbeat timestamps on mutations and explicit heartbeat calls
- writes changes back to disk so state survives runtime restarts

This keeps the fallback narrow and honest: it owns the persisted session state itself, but it does **not** pretend to reproduce higher-order TS-only enrichments like agent-memory bootstrap generation or tool-advertisement synthesis.

#### 2. Replaced bridge-only behavior for the session-state route cluster with upstream-first / native-fallback behavior
Updated:
- `go/internal/httpapi/session_supervisor_handlers.go`
- `go/internal/httpapi/server.go`

The four routes now behave like this:
- try the upstream TS procedure first when available
- if the bridge succeeds, preserve the existing upstream-backed behavior and metadata
- if the bridge is unavailable, fall back to the new Go-local session-state manager

Fallback semantics are explicit:
- `GET /api/sessions/supervisor/state`
  - returns the persisted local session snapshot
- `POST /api/sessions/supervisor/update-state`
  - persists the requested state fields locally
  - returns a truthful reduced payload with:
    - `success: true`
    - `toolAdvertisements: []`
    - `memoryBootstrap: null`
    - `state: <local snapshot>`
  - this makes the limitation visible instead of pretending TS enrichment occurred
- `POST /api/sessions/supervisor/clear`
  - resets the local session state to defaults and persists it
- `POST /api/sessions/supervisor/heartbeat`
  - updates `lastHeartbeat` and returns a truthful local timestamp

All fallback responses carry explicit bridge metadata under:
- `fallback: "go-local-session-state"`

#### 3. Added focused Go regression coverage
Updated:
- `go/internal/httpapi/server_test.go`

Added coverage for:
- initial local empty/default state readback
- local `update-state` persistence and response shape
- persisted `.hypercode-session.json` contents
- subsequent `state` reads after update
- local `heartbeat` behavior
- local `clear` reset behavior
- post-clear readback to defaults

The existing upstream bridge test for the same routes still passes, so the change does not break the intended TS-available path.

### Validation
Executed truthfully without killing any processes:
- `cd go && gofmt -w internal/httpapi/session_state_local.go internal/httpapi/session_supervisor_handlers.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run TestSupervisorSessionStateFallsBackToLocalGoState -count=1`
- `cd go && go test ./internal/httpapi -run 'TestSessionSupervisorBridgeRoutes|TestSupervisorSessionStateFallsBackToLocalGoState' -count=1`

### Why this matters
This closes an important gap between:
- the dashboard/web compat layer preferring Go-native session truth, and
- the Go backend actually owning a truthful source of that truth when TS is down

It does **not** yet make the whole supervisor/session mutation domain fully Go-native. But it does convert the highest-signal session-state slice from:
- "Go can proxy it"

into:
- "Go can proxy it when TS exists, and can still persist/read the real session-state core when TS does not."

That is the right intermediate step before deeper native supervisor mutation ownership.

## Latest stabilization pass — startup/build recovery after rename drift

### Context
A live operator startup attempt via `start.bat` exposed a real regression in the TypeScript workspace after the large legacy-name → `hypercode` rename. The startup sequence did **not** require killing any process; it failed in build-time module resolution.

The most important signal from the operator log was:
- `@hypercode/core` failed to compile because several imports had already been renamed to `hypercode-*`, but the actual files still existed on disk under legacy filenames
- after fixing that layer, the next failure moved forward into `@hypercode/web` with the same root cause: renamed imports pointing at old legacy filenames
- `pnpm install` still emits a non-blocking `electron-rebuild` failure inside `apps/maestro` on Node 24 / Windows, but the startup wrapper continues past it and the workspace build is the decisive gate for this pass

### What was actually broken
#### 1. Core package rename drift
`packages/core` was importing:
- `../../lib/hypercode-orchestrator.js`
- `../config/HyperCodeConfig.js`
- `./hypercode.js`

But the real files on disk were still using legacy filenames for the orchestrator helper, its test, the config loader, and the council supervisor implementation.

This caused the exact startup build failure seen in the operator log.

#### 2. Web package rename drift
After fixing `@hypercode/core`, the workspace build correctly advanced and then failed in `apps/web` because imports expected:
- `apps/web/src/lib/hypercode-runtime.ts`
- `apps/web/src/components/HyperCodeOrchestratorWidget.tsx`

while the actual files still existed under legacy runtime/widget filenames.

This was another real post-rename mismatch, not a tooling false positive.

### What was changed
#### Core fixes
Renamed these files to match the imports the codebase already expected:
- legacy orchestrator helper → `packages/core/src/lib/hypercode-orchestrator.ts`
- legacy orchestrator helper test → `packages/core/src/lib/hypercode-orchestrator.test.ts`
- legacy config loader → `packages/core/src/config/HyperCodeConfig.ts`
- legacy council supervisor implementation → `packages/core/src/orchestrator/council/supervisors/hypercode.ts`

This was the smallest truthful fix because the source had already conceptually migrated to `hypercode` naming at the import layer.

#### Web fixes
Renamed these files to match the import graph:
- legacy runtime helper → `apps/web/src/lib/hypercode-runtime.ts`
- legacy orchestrator widget component → `apps/web/src/components/HyperCodeOrchestratorWidget.tsx`

#### Go entrypoint fix
A final path-level rename mismatch also existed in the Go tree:
- legacy Go entrypoint directory → `go/cmd/hypercode`

This mattered because the workspace analysis/documents and the new Go-primary startup tooling already treated `./cmd/hypercode` as the authoritative build target.

#### Go-primary startup build profile
Added a new startup-oriented build script:
- `scripts/build_startup.mjs`
- package script: `pnpm run build:startup-go`

Updated `start.bat` so that:
- `HYPERCODE_RUNTIME=auto` or `HYPERCODE_RUNTIME=go` defaults to a **Go-primary startup build**
- the Go-primary startup build validates:
  - `packages/cli`
  - `go/cmd/hypercode`
- full TS workspace build remains available when:
  - `HYPERCODE_RUNTIME=node`, or
  - `HYPERCODE_FULL_BUILD=1`
- optional web validation in Go-primary mode can be enabled with:
  - `HYPERCODE_STARTUP_BUILD_WEB=1`

Why this matters:
- it reduces startup dependence on the entire TypeScript workspace
- it better matches the Go-primary migration mandate
- it avoids making Go startup hostage to unrelated TS/UI build noise
- it keeps Node compatibility mode available explicitly instead of as the default validation burden

#### Go-primary install-skip probe
Added a startup dependency readiness probe:
- `scripts/check_startup_install.mjs`

Updated `start.bat` so that in `auto` / `go` runtime modes it now:
- checks whether the workspace already has the minimum Go-primary startup dependencies present
- skips `pnpm install` when those dependencies are already resolvable and the lock/modules state is in sync
- still performs `pnpm install` when the probe says install is required
- still allows a forced install with:
  - `HYPERCODE_FORCE_INSTALL=1`
- still allows a full manual skip with:
  - `HYPERCODE_SKIP_INSTALL=1`

What the probe currently verifies:
- `node_modules/.modules.yaml` exists
- `pnpm-lock.yaml` is not newer than the modules state file
- `packages/cli` can resolve the dependencies needed for the Go-primary startup path
- the Go control-plane entrypoint exists at `go/cmd/hypercode/main.go`

Why this matters:
- it avoids rerunning a noisy workspace-wide install on every Go-primary startup attempt
- it reduces exposure to known non-blocking install-time failures like the Windows/Node 24 Maestro `electron-rebuild` issue when the workspace is already usable
- it makes Go-primary startup faster and more truthful without pretending Node compatibility surfaces are validated when they were intentionally skipped

#### Direct built-CLI startup handoff
Updated the final `start.bat` launch step so it now:
- launches `node packages/cli/dist/cli/src/index.js start` directly when the built CLI entrypoint exists
- only falls back to `pnpm start` if that built CLI entrypoint is missing
- forwards any extra command-line arguments through to the CLI entrypoint

Why this matters:
- it removes one more unnecessary package-manager hop from the Go-primary startup path
- it makes the actual launch phase match the already-validated built CLI artifact
- it reduces dependence on root script indirection after install/build decisions are already complete

#### Build-skip artifact freshness probe
Added a build artifact freshness probe:
- `scripts/check_startup_build.mjs`

Updated `start.bat` so that in Go-primary startup mode it now:
- checks whether the built CLI entrypoint is present and current relative to CLI source inputs
- checks whether the built Go control-plane binary is present and current relative to Go source inputs
- skips the Go-primary startup build when those artifacts are already current
- still runs the startup build when artifacts are missing or stale
- allows forcing the build with:
  - `HYPERCODE_FORCE_BUILD=1`

Current scope of artifact freshness checks:
- CLI inputs:
  - `packages/cli/src/**`
  - `packages/cli/package.json`
  - `packages/cli/tsconfig.json`
- CLI output:
  - `packages/cli/dist/cli/src/index.js`
- Go inputs:
  - `go/cmd/**`
  - `go/internal/**`
  - `go/go.mod`
  - `go/go.sum`
- Go output:
  - `go/hypercode(.exe)`

In the same pass, `start.bat` was updated to print explicit phase summaries:
- `Install phase summary: ...`
- `Build phase summary: ...`

Those summaries now make the operator-visible startup contract much clearer by saying whether a phase ran or was skipped and the reason behind that decision.

Why this matters:
- repeat Go-primary startup can now avoid both install and build when the workspace is already ready
- it reduces startup latency and TS coupling further without pretending stale artifacts are acceptable
- it moves repeat startup behavior closer to a real binary-first operational model
- it makes the startup decision path operator-visible instead of leaving it implicit in probe noise

#### Prebuilt Go binary runtime launch preference
Updated `packages/cli/src/commands/start.ts` so the Go runtime launcher now:
- prefers the already-built `go/hypercode(.exe)` binary when it exists
- falls back to `go run ./cmd/hypercode` only when the prebuilt binary is absent
- allows forcing source launch with:
  - `HYPERCODE_GO_USE_SOURCE=1`

Additionally, startup output now reports the runtime provenance explicitly:
- `Launch mode: prebuilt Go binary`
- `Launch mode: source fallback via go run`
- `Launch mode: Node compatibility runtime (explicit selection)`
- `Launch mode: Node compatibility runtime (Go fallback)`

The CLI also now emits a concise `Startup mode summary:` block describing actual surface availability for the chosen runtime. That summary intentionally distinguishes:
- Go dashboard support as compatibility-only
- Go `--no-mcp` flag behavior as not yet mapped 1:1
- Go supervisor/auto-drive startup flag semantics vs actual native API availability
- full Node compatibility runtime support for integrated dashboard/MCP/supervisor/auto-drive flags

In the same slice, startup provenance is now persisted into the local startup lock and surfaced by `hypercode status` when available. That persisted provenance includes:
- requested runtime
- active runtime
- launch mode
- dashboard mode
- install decision / reason
- build decision / reason

This makes the startup truthfulness durable instead of transient.

That provenance is now also exposed through the TypeScript control-plane startup snapshot (`startupStatus`). The `startupStatus` API payload now includes a top-level `startupMode` field carrying the same persisted provenance, and the dashboard startup status type has been updated accordingly.

In this follow-up slice, the dashboard startup-readiness section now renders a visible `Startup mode` block backed by that `startupMode` payload. The UI now shows:
- requested runtime / active runtime
- launch mode
- dashboard mode
- install decision + reason
- build decision + reason
- last updated relative timestamp when available

That same operator truth is now also propagated into additional dashboard surfaces:
- **Health** now includes a `Startup mode` card in its right-hand detail column
- **Integrations** now includes a top-level `Startup mode` card near its overview stats
- **System Overview** now includes a `Startup mode` card alongside its system status sections
- **MCP System** now includes a `Startup mode` card alongside its environment/startup checks
- **Orchestrator / Autopilot** now includes a `Startup mode` section inside the operator control plane itself, explicitly separating main-control-plane startup provenance from live orchestrator proxy reachability

This reduces the need to return to the dashboard home page just to recover runtime provenance.

This startup-provenance dashboard propagation cluster is now complete.

The Go-native `/api/runtime/status` surface now also exposes equivalent startup provenance by reading startup metadata from the main CLI lock first and falling back to the Go lock. That means the native backend is now self-describing for:
- requested runtime / active runtime
- launch mode
- dashboard mode
- install/build decisions
- provenance source (`main-lock` vs `go-lock`)

The web local-compat startup fallback has now also been updated to carry `startupMode` from the same local lock metadata when upstream TRPC startup telemetry is unavailable. That means the dashboard can still show real startup provenance during local fallback mode instead of dropping back to a provenance-blind placeholder startup object.

That fallback is now further upgraded to prefer the Go-native `/api/startup/status` and `/api/runtime/status` surfaces when the TypeScript `startupStatus` procedure is unavailable. In practice, that means the dashboard compatibility layer can now reuse native Go truth for:
- startup readiness / summary
- blocking reasons
- startup uptime
- startup provenance (`startupMode`)
- imported-session maintenance counts
- memory-store readiness details
- session-supervisor bridge readiness
- Go runtime version

This is materially better than the previous pure local-lock/local-config placeholder because the fallback now preserves a truthful native control-plane snapshot instead of only a best-effort static guess.

The same compat layer now also prefers the Go-native `/api/mcp/status` surface when the TypeScript `mcp.getStatus` procedure is unavailable. That improves the MCP/router truth consumed by runtime-heavy dashboard views because fallback mode can now preserve native Go/router-derived values for:
- MCP initialization state
- server count
- tool count
- connected count
- lifecycle mode flags (`lazySessionMode`, `singleActiveServerMode`)
- source/source-backed summary hints

Importantly, this was wired into both compat paths:
1. the legacy MCP dashboard bridge batches, and
2. the richer local dashboard fallback route

So the improvement reaches both older MCP page query shapes and the broader dashboard/system pages that still depend on `trpc.mcp.getStatus`.

That same shared route layer now also prefers the Go-native provider-routing read surfaces when the TypeScript billing procedures are unavailable:
- `/api/billing/provider-quotas`
- `/api/billing/fallback-chain`

This replaces the previous empty placeholder compat responses for:
- `billing.getProviderQuotas`
- `billing.getFallbackChain`

with truthful native Go provider-routing previews. In practice that means dashboard fallback mode can now preserve:
- configured/authenticated provider inventory
- auth method / availability hints
- quota preview rows
- fallback-chain provider/model ordering
- task-type-aware fallback-chain previews

Again, this lands in both compat paths:
1. the legacy MCP dashboard bridge batches, and
2. the richer local dashboard fallback route

So the dashboard home and any other provider-summary surfaces no longer have to collapse to empty quota/fallback state just because the TypeScript billing router is unavailable.

The next adjacent shared improvement in that same compat layer is now `tools.detectCliHarnesses`. Instead of returning `[]` during degraded mode, the local dashboard fallback now prefers the Go-native `/api/cli/harnesses` inventory and normalizes it into the existing dashboard detection shape. That means degraded-mode Integrations / AI Tools surfaces can now keep a truthful harness roster for:
- total harness count
- installed harness count
- harness ids/names
- launch-command hints
- source-backed vs metadata-backed reality (via normalized install hints)
- primary HyperCode harness visibility

This is intentionally narrower than a full execution-environment replacement: it upgrades the harness inventory first without over-claiming that the entire `tools.detectExecutionEnvironment` surface is Go-native yet.

The next adjacent shared improvement is `session.list`. Instead of returning `[]` during degraded mode, both compat paths now prefer the Go-native `/api/sessions` inventory and normalize those discovered sessions into the existing dashboard/session-page row shape. That means degraded-mode operator views can now retain truthful native session visibility for:
- session ids
- cli type
- current status (mapped truthfully from native states such as `active` → `running`)
- task/title
- source-path-backed working directory field
- started/last-activity timing
- detected model hints when present

This still does not claim full Go-native supervised-session parity; it is specifically a read-surface improvement so dashboards stop collapsing to empty session inventories when the TypeScript session list is unavailable.

The adjacent session-management gap was `session.catalog`. There is no direct Go-native `session.catalog` endpoint, but the Go harness inventory already exposes enough truthful metadata to derive a safe degraded-mode session catalog. The compat layer now maps Go `/api/cli/harnesses` into the session catalog shape so the session dashboard can still offer a realistic harness selector with:
- harness id / name
- command hints
- install status
- install guidance
- resolved path when known
- version label
- `sessionCapable` truthy entries
- stable `category: 'cli'` fallback

This is intentionally framed as a derived catalog fallback, not as proof that the TypeScript session harness catalog runtime has been fully ported.

The next broader degraded-mode gap was `tools.detectExecutionEnvironment`. Unlike `session.catalog`, this one already had a real Go-native truth source: `/api/tools/detect-execution-environment` bridges the TypeScript router when available and falls back to native Go shell/tool/harness detection when the router is unavailable. The web compat layer simply was not using it yet. That is now fixed. The local dashboard compat path now:
- prefers Go-native execution-environment truth for `tools.detectExecutionEnvironment`
- normalizes native shell rows into the existing dashboard contract (`id`, `name`, `installed`, `verified`, `preferred`, `resolvedPath`, `family`, `version`)
- normalizes native tool rows into the existing dashboard contract (`id`, `name`, `installed`, `verified`, `resolvedPath`, `version`, `capabilities`)
- preserves native execution summary fields such as preferred shell, verified shell/tool counts, harness counts, PowerShell/POSIX support, and operator notes
- reuses the same normalized summary to populate `startupStatus.checks.executionEnvironment` during degraded-mode fallback, so dashboard home/system summaries stop drifting away from the AI Tools page

When the execution-environment endpoint is itself unavailable, the compat layer now still preserves truthful harness counts from the already-upgraded Go harness inventory instead of collapsing the entire execution-environment shape back to all-zero synthetic placeholders.

The next adjacent degraded-mode gap was `tools.detectInstallSurfaces`. This was a close cousin of the execution-environment problem: the Go side already had a truthful `/api/tools/detect-install-surfaces` surface, but the web compat layer still returned `[]`. That is now fixed too. The local dashboard compat path now:
- prefers Go-native install-surface truth for `tools.detectInstallSurfaces`
- preserves the existing install-artifact summary contract used by Integrations, Health, MCP System, Dashboard Home, and the Claude Mem parity page
- normalizes native artifact rows into `id`, `status`, `artifactPath`, `artifactKind`, `detail`, `declaredVersion`, and `lastModifiedAt`
- keeps the existing UI semantics intact for `ready` vs `partial` vs `missing` artifacts, so operator actions like load-unpacked/install-VSIX/sync-dashboard guidance continue to work without page-level rewrites

This means degraded-mode install surfaces no longer collapse to empty arrays when the TypeScript detector is unavailable, and browser-extension / VS Code / MCP client sync setup pages can keep showing truthful artifact presence and freshness data from the native Go path.

After that, the remaining adjacent gap was imported-session maintenance reads that bypass the already-upgraded startup-status path. There was no active direct web consumer at the time of this slice, but the shared compat layer still had a hole: if a page started using `session.importedMaintenanceStats`, it would not inherit the same native truth that the Go control plane already exposed via `/api/sessions/imported/maintenance-stats`. That is now fixed. The local dashboard compat path now:
- prefers Go-native `/api/sessions/imported/maintenance-stats` for `session.importedMaintenanceStats`
- preserves the existing maintenance contract (`totalSessions`, `inlineTranscriptCount`, `archivedTranscriptCount`, `missingRetentionSummaryCount`)
- backfills degraded `startupStatus.checks.importedSessions` from that same native maintenance endpoint when `/api/startup/status` does not already provide imported-session telemetry

That keeps direct imported-session maintenance queries truthful for future consumers and also prevents system/dashboard startup summaries from dropping imported-session archive telemetry just because the startup endpoint is temporarily unavailable while the dedicated maintenance endpoint still works.

The next highest-value runtime-heavy `tools.*`-adjacent gap was the MCP Inspector cluster: `mcp.getWorkingSet`, `mcp.getToolSelectionTelemetry`, and `mcp.getToolPreferences`. Those queries already had truthful Go/native sources (`/api/mcp/working-set`, `/api/mcp/tool-selection-telemetry`, `/api/mcp/preferences`), but the web compat layer still returned synthetic placeholders. That is now fixed. The local dashboard compat path now:
- prefers Go-native MCP working-set state for `mcp.getWorkingSet`
- prefers Go-native/local MCP tool-selection telemetry for `mcp.getToolSelectionTelemetry`
- prefers Go-native/local MCP tool preferences for `mcp.getToolPreferences`
- normalizes working-set rows into the inspector contract (`name`, `hydrated`, `lastLoadedAt`, `lastHydratedAt`, `lastAccessedAt`)
- preserves limit fields used by the inspector (`maxLoadedTools`, `maxHydratedSchemas`, `idleEvictionThresholdMs`)
- preserves telemetry fields used by the inspector timeline/leaderboard/filters, including query/source/top-result/ignored-result/auto-load metadata
- preserves tool preference fields used by the inspector controls (`importantTools`, `alwaysLoadedTools`, `autoLoadMinConfidence`, `maxLoadedTools`, `maxHydratedSchemas`, `idleEvictionThresholdMs`)

This means degraded MCP inspector pages no longer collapse to empty working-set/telemetry/preference placeholders even though the Go MCP layer already had live local state available.

The next remaining operator-read placeholder cluster was `apiKeys.list`, `shell.getSystemHistory`, `agentMemory.stats`, and `expert.getStatus`. Those now also prefer existing Go/native truth instead of local placeholders:
- `apiKeys.list` now prefers Go-native `/api/api-keys`, deriving `key_prefix` from raw key material when only the local `key` field is present
- `shell.getSystemHistory` now prefers Go-native `/api/shell/history/system`, preserving the current `string[]` shell-history contract used by existing TS consumers
- `agentMemory.stats` now prefers Go-native `/api/memory/agent-stats`, normalizing native totals into the compact `session` / `working` / `longTerm` / `total` shape used by dashboard widgets
- `expert.getStatus` now prefers Go-native `/api/expert/status`, preserving truthful offline-state fallback instead of synthetic `{}`

This closes the remaining obvious operator-facing synthetic read placeholders in the shared compat layer for the AI Tools page, API Keys page, Shell History widget/tools page, Context Health widget, and Experts dashboard.

After the operator-read cluster, the remaining obvious shared placeholder lane was tool catalog/search itself: `tools.list` and `mcp.searchTools`. Both now prefer existing Go/native truth instead of placeholders:
- `tools.list` now prefers Go-native `/api/tools`, preserving the control-plane tool catalog shape used by AI Tools, MCP Catalog, Tool Sets, Super Assistant, and other tool inventory views
- `mcp.searchTools` now prefers Go-backed tool search via `/api/tools/search`, preserving the search result contract used by `/dashboard/mcp/search` instead of returning `[]`
- the search fallback preserves the existing minimum search contract (`name`, `description`, `server`, `inputSchema`) and forwards optional ranking/search metadata when present

This means degraded tool inventory/search pages no longer collapse to empty catalog or search results when the TypeScript tool routes are unavailable while the Go control plane can still serve inventory/search truth.

The next remaining shared placeholders from the explicit audit were `mcp.traffic` and `serverHealth.check`. Those now also prefer existing Go/native truth instead of synthetic fallbacks:
- `mcp.traffic` now prefers Go-native `/api/mcp/traffic`, preserving router traffic rows (`server`, `method`, `paramsSummary`, `latencyMs`, `success`, `timestamp`) for dashboard home and other traffic consumers when available
- `serverHealth.check` now prefers Go-native `/api/server-health/check?serverUuid=...` whenever a concrete UUID is supplied, preserving truthful health status plus crash/max-attempt counters instead of relying only on local config metadata inference
- when no concrete server UUID is supplied, compat still falls back to the existing local unavailable/default shape rather than over-claiming health visibility

This leaves the shared compat layer with far fewer synthetic placeholders in the startup/MCP/tools/session/operator surfaces and shifts the remaining work away from broad dashboard truth gaps toward narrower feature-parity and orchestration concerns.

One more small but real shared placeholder remained after that pass: `session.getState`. The Go side already exposes `/api/sessions/supervisor/state` as a bridge to the real session state surface, so the compat layer now prefers that bridge instead of the synthetic `{ isAutoDriveActive: false, activeGoal: null }` placeholder when it is available. That preserves truthful session-state signals such as active auto-drive and current goal in degraded mode while still falling back safely when the native bridge itself is unavailable.

Why this matters:
- it makes Go-primary launch use the same compiled artifact that the startup build profile already validates
- it reduces repeated `go run` compilation overhead at runtime
- it moves the actual control-plane launch path closer to a real production-style Go-primary binary handoff
- it makes the runtime choice operator-visible instead of implicit
- it makes post-launch surface availability explicit instead of forcing operators to infer it from scattered warnings
- it makes startup decisions queryable through `hypercode status` instead of leaving them in terminal scrollback only
- it makes the same startup truth available to dashboard/API consumers rather than restricting it to the CLI
- it makes the dashboard itself reflect the real startup/runtime contract rather than only the server/CLI layers
- it makes the Go-native backend itself report that startup truth without depending on the TypeScript startup snapshot layer
- it reduces the chance that local dashboard fallback mode hides real startup/runtime provenance when the TS layer is unavailable

#### Lockfile hygiene
- The refreshed `pnpm-lock.yaml` no longer contains legacy-name references for the main workspace packages.

### Validation performed for this pass
#### Targeted package validation
```bash
pnpm -C packages/core run build
pnpm -C apps/web run build
```

Results:
- `@hypercode/core` build passed after the rename-alignment fixes
- `@hypercode/web` build passed after the runtime/widget rename-alignment fixes

#### Go-primary startup validation
```bash
pnpm -C packages/cli exec vitest run src/commands/start.test.ts
pnpm -C packages/cli run build
cd go && go build -buildvcs=false ./cmd/hypercode
node scripts/build_startup.mjs --profile=go-primary
node scripts/check_startup_install.mjs --profile=go-primary
node scripts/check_startup_build.mjs --profile=go-primary
node packages/cli/dist/cli/src/index.js start --help
powershell.exe -NoProfile -Command "cmd /c 'call start.bat --help'"
```

Results:
- CLI start-command regression tests passed
- CLI status-command regression tests passed
- core startup-status router regression tests passed
- Go runtime-status endpoint regression tests passed
- CLI build passed
- core build passed
- web build passed
- Go control-plane build passed
- new Go-primary startup build profile passed
- install-skip readiness probe correctly reported the current workspace as already ready for Go-primary startup
- build-skip artifact freshness probe correctly reported the current workspace artifacts as already current for Go-primary startup
- direct built-CLI launch path resolved and printed `hypercode start --help` successfully
- runtime provenance helper coverage passed in the CLI regression suite
- startup mode summary helper coverage passed in the CLI regression suite
- persisted startup-provenance status coverage passed in the CLI regression suite
- startupStatus snapshot coverage now also verifies persisted startup provenance propagation through the server/API-visible status payload
- Go-native runtime status coverage now also verifies startup provenance propagation through `/api/runtime/status`
- web build/type-check passed with the new dashboard `startupMode` rendering, the new Health / Integrations / System / MCP System / Orchestrator startup-mode surfaces, and the Go-enriched local-compat startup/MCP/provider/CLI-harness/session/session-catalog fallback paths
- a focused dashboard render test was added, but `vitest` is not directly installed in `apps/web`, so that new test was validated indirectly through the successful web build rather than executed as a standalone test command in this pass
- a focused app-route compat regression was executed successfully through the root Vitest runner (`pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`), validating Go-native `/api/startup/status` + `/api/runtime/status` preference when `startupStatus` is unavailable, Go-native `/api/mcp/status` preference when `mcp.getStatus` is unavailable, Go-native provider quota/fallback-chain preference when TypeScript billing procedures are unavailable, Go-native `/api/cli/harnesses` preference when `tools.detectCliHarnesses` is unavailable, Go-native `/api/sessions` preference when `session.list` is unavailable, and Go-derived `session.catalog` fallback from the native harness inventory
- startup truthfulness validation also reproduced the exact operator path from `start.bat` without launching a long-lived process by using `start.bat --help`; after the fix, Go-primary startup now truthfully reports and executes the build when `scripts/check_startup_build.mjs` returns non-zero, and forced Go-primary installs now use `pnpm install --ignore-scripts` by default instead of tripping unrelated Maestro/Electron postinstall rebuilds
- the execution-environment + install-surface + imported-maintenance + MCP-inspector + operator-read + tool-catalog/search + MCP-traffic/server-health + session-state compat slice was validated with:
  - `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - `pnpm -C apps/web run build`
  - the route regression now proves Go-native `/api/tools/detect-execution-environment` preference for `tools.detectExecutionEnvironment`, verifies that the same normalized summary is injected into degraded `startupStatus.checks.executionEnvironment`, validates Go-native `/api/tools/detect-install-surfaces` preference for `tools.detectInstallSurfaces`, validates both direct `session.importedMaintenanceStats` fallback plus degraded `startupStatus.checks.importedSessions` backfill from `/api/sessions/imported/maintenance-stats`, validates Go-native MCP inspector preference for `mcp.getWorkingSet`, `mcp.getToolSelectionTelemetry`, and `mcp.getToolPreferences`, validates Go-native preference for `apiKeys.list`, `shell.getSystemHistory`, `agentMemory.stats`, and `expert.getStatus`, validates Go-native preference for `tools.list` and `mcp.searchTools`, validates Go-native preference for `mcp.traffic` and UUID-backed `serverHealth.check`, and validates Go-native preference for `session.getState`
- concrete validation for the startup slice included:
  - `pnpm -C packages/cli run build`
  - `powershell.exe -NoProfile -Command '$env:HYPERCODE_FORCE_INSTALL="1"; $env:HYPERCODE_SKIP_NATIVE_PREFLIGHT="1"; $env:HYPERCODE_SKIP_BUILD="1"; cmd.exe /c "start.bat --help"'`
  - `powershell.exe -NoProfile -Command '$env:HYPERCODE_SKIP_INSTALL="1"; cmd.exe /c "start.bat --help"'` (this exercised the corrected build-required path; native preflight still ran because the PowerShell env assignment was malformed on the first attempt, which is now documented truthfully rather than hidden)
  - `node scripts/check_startup_build.mjs`
- Health / Integrations / System / MCP System / Orchestrator runtime-provenance propagation and the upgraded compat fallback were validated through the successful `apps/web` production build and the focused route regression
- a short-lived `start.bat --help` run also completed and showed the new install/build phase summary lines before exiting through CLI help output

Validation boundary:
- no long-running Hub/runtime session was intentionally launched in this pass
- the batch-script help run exercised startup decisions and exited through CLI help rather than serving the control plane
- the PowerShell wrapper attempt to inject `HYPERCODE_SKIP_NATIVE_PREFLIGHT=1` was syntactically imperfect, so native preflight still ran during that specific batch help validation; this was observed and documented rather than hidden

#### Full workspace validation
```bash
pnpm run build:workspace
```

Result:
- succeeded end-to-end
- all 24 workspace build tasks completed successfully

### Important truthfulness notes
#### Stable in this pass
- the previously failing startup build blockers in `@hypercode/core` and `@hypercode/web` are fixed
- `pnpm run build:workspace` now succeeds again
- the new Go-primary startup build path succeeds
- the new install-skip readiness probe succeeds for the current workspace state
- the new build-skip artifact freshness probe succeeds for the current workspace state
- the direct built-CLI launch path succeeds
- the CLI Go runtime launcher now prefers the prebuilt Go binary when available
- startup output now truthfully reports runtime provenance for Go and Node compatibility paths
- startup output now truthfully reports whether install/build phases ran or were skipped and why
- startup output now also provides a concise startup-mode surface summary for the selected runtime
- startup provenance is now persisted into the local startup lock and exposed by `hypercode status` when available
- the TypeScript `startupStatus` API surface now also exposes that persisted startup provenance to dashboard/API consumers
- the dashboard startup-readiness section now visibly renders the persisted startup mode block instead of leaving the new payload hidden
- the Health, Integrations, System, MCP System, and Orchestrator dashboard pages now also visibly render startup/runtime provenance instead of limiting it to the home dashboard
- the web local-compat startup fallback now also carries `startupMode` from the local lock when upstream startup telemetry is unavailable
- that same web compat fallback now also prefers Go-native `/api/startup/status` and `/api/runtime/status` when the TypeScript `startupStatus` procedure is unavailable, reducing reliance on placeholder local lock/config guesses
- the web compat fallback and legacy MCP bridge now also prefer Go-native `/api/mcp/status` when the TypeScript `mcp.getStatus` procedure is unavailable, reducing reliance on placeholder local server-count guesses for MCP/router state
- the web compat fallback and legacy bridge now also prefer Go-native `/api/billing/provider-quotas` and `/api/billing/fallback-chain` when the TypeScript billing procedures are unavailable, reducing reliance on empty provider/fallback placeholders in degraded mode
- the web compat fallback now also prefers Go-native `/api/cli/harnesses` when `tools.detectCliHarnesses` is unavailable, reducing reliance on empty harness-detection placeholders in degraded mode
- the web compat fallback and legacy bridge now also prefer Go-native `/api/sessions` when `session.list` is unavailable, reducing reliance on empty session-list placeholders in degraded mode
- the web compat fallback now also derives `session.catalog` from Go-native `/api/cli/harnesses` when the TypeScript catalog is unavailable, reducing reliance on empty session-harness catalog placeholders in degraded mode
- `start.bat` no longer captures startup probe exit codes with parse-time `%ERRORLEVEL%` inside parenthesized blocks; it now uses runtime `!ERRORLEVEL!`, fixing a real contradiction where startup could print `Go-primary startup build is required` and then incorrectly claim `Skipping startup build because Go-primary build artifacts already current`
- Go-primary startup installs now default to `pnpm install --ignore-scripts` (unless `HYPERCODE_STARTUP_INSTALL_SCRIPTS=1` is set), reducing unnecessary coupling to unrelated workspace postinstall hooks such as Maestro/Electron rebuilds while still allowing the operator to force the full scripted install path when needed
- the web compat fallback now also prefers Go-native `/api/tools/detect-execution-environment` when `tools.detectExecutionEnvironment` is unavailable, and reuses that same normalized summary inside degraded `startupStatus.checks.executionEnvironment`
- the web compat fallback now also prefers Go-native `/api/tools/detect-install-surfaces` when `tools.detectInstallSurfaces` is unavailable, reducing reliance on empty install-artifact placeholders in degraded mode
- the web compat fallback now also prefers Go-native `/api/sessions/imported/maintenance-stats` when `session.importedMaintenanceStats` is unavailable, and uses that same maintenance data to backfill degraded `startupStatus.checks.importedSessions` when startup telemetry is incomplete
- the web compat fallback now also prefers Go-native MCP inspector state for `mcp.getWorkingSet`, `mcp.getToolSelectionTelemetry`, and `mcp.getToolPreferences`, reducing reliance on synthetic empty working-set, telemetry, and preference placeholders in degraded mode
- the web compat fallback now also prefers Go-native `/api/api-keys`, `/api/shell/history/system`, `/api/memory/agent-stats`, and `/api/expert/status` for `apiKeys.list`, `shell.getSystemHistory`, `agentMemory.stats`, and `expert.getStatus`, reducing reliance on synthetic empty operator-read placeholders in degraded mode
- the web compat fallback now also prefers Go-native `/api/tools` and `/api/tools/search` for `tools.list` and `mcp.searchTools`, reducing reliance on synthetic empty tool-catalog and search placeholders in degraded mode
- the web compat fallback now also prefers Go-native `/api/mcp/traffic` and `/api/server-health/check` for `mcp.traffic` and UUID-backed `serverHealth.check`, reducing reliance on synthetic empty traffic and config-only health inference in degraded mode
- the web compat fallback now also prefers Go-native `/api/sessions/supervisor/state` for `session.getState`, reducing reliance on a synthetic session-state placeholder in degraded mode
- the Go-native `/api/runtime/status` surface now also exposes startup provenance, making the native backend itself self-describing
- `start.bat` now validates Go-first startup surfaces by default for `auto`/`go` runtime modes instead of always requiring a full workspace build first
- `start.bat` can now skip `pnpm install` in Go-primary mode when the workspace is already ready
- `start.bat` can now also skip the Go-primary startup build when the built CLI and Go binary artifacts are already current
- `start.bat` now launches directly through the built CLI when available instead of depending on `pnpm start` for the final handoff
- the main monorepo (excluding archived content and external harness submodules) no longer contains textual legacy-name references
- the targeted startup-provenance dashboard propagation cluster is now complete, so the next step is shifting more runtime-heavy dashboard/system reads away from TS compatibility surfaces and onto Go-native status where equivalent native truth already exists

#### Still non-blocking / still present
- `apps/maestro` postinstall still reports an `electron-rebuild` failure under Node 24 on Windows during install
- in this workspace, that failure is currently **non-blocking** for the startup wrapper because the wrapper can continue into prerequisite checks and build validation, and in Go-primary mode can now often skip install entirely when the workspace is already ready
- Maestro production builds themselves completed successfully during this pass despite that install-time warning/failure

#### Still outside the main workspace boundary
A repo-wide legacy-name search still finds many references inside:
- `submodules/hyperharness`
- archived/vendor content under `archive/`
- binary/generated artifacts

Those are real findings. They were **not** normalized in this pass because:
- `hyperharness` and `superai` are separate competing harness upstreams with their own histories and internal naming
- archive/vendor content is not the operator-facing workspace runtime surface

So the truthful statement is:
- **main workspace runtime surface:** clean of legacy-name references after this pass
- **entire repo including external submodules/archive:** still contains legacy-name references and would require a separate dedicated cleanup effort

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

## Follow-up MCP state step (native working-set / telemetry fallback state)
The next MCP slice targeted a cluster of operator-facing fallback gaps that were still effectively empty/no-op in Go mode:
- working-set snapshot
- tool load/unload fallback behavior
- hydrated schema tracking
- eviction history
- tool-selection telemetry

### What changed
- added `go/internal/httpapi/mcp_local_state.go`
  - Go-owned in-memory MCP state manager
  - tracks loaded tools
  - tracks hydrated schemas
  - tracks eviction history
  - tracks tool-selection telemetry
- updated `go/internal/httpapi/server.go`
  - local available-tool resolution now combines:
    - configured-server JSONC `_meta.tools`
    - runtime registry live-probe tools
  - `/api/mcp/working-set` now returns a real local snapshot instead of a hardcoded empty state
  - `/api/mcp/working-set/evictions` now returns real local eviction history
  - `/api/mcp/working-set/evictions/clear` now clears real local eviction history
  - `/api/mcp/tool-selection-telemetry` now returns local telemetry events
  - `/api/mcp/tool-selection-telemetry/clear` now clears local telemetry events
  - `/api/mcp/working-set/load` and `/api/mcp/working-set/unload` now use the local MCP state manager when upstream is unavailable and the requested tool exists in local inventory
  - `/api/mcp/tools/schema` now uses the local state manager to track hydrated schemas and eviction effects when serving local fallback schema payloads
- expanded `go/internal/httpapi/server_test.go`
  - local MCP empty-state routes now verify real local fallback state instead of service-unavailable placeholders for every path
  - added a focused working-set/telemetry/eviction fallback test that exercises local load + hydrate + eviction behavior through the real HTTP routes

### Important truthfulness note
This was the first real local operator-state improvement, but at that point it was still **session-local/in-memory parity**, not full durable parity.

What became true in that step:
- Go no longer returned only empty/no-op fallback behavior for key MCP operator state surfaces
- local working-set state, eviction history, and tool-selection telemetry existed in Go fallback mode
- tool load/unload/schema fallback behavior became materially more realistic when local MCP inventory is known

What was still not true after that step:
- the local MCP state was still in-memory only
- it was not yet a full durable replacement for every TS runtime/session working-set behavior
- richer multi-session persistence and long-horizon telemetry parity were still incomplete

### Validation performed for this MCP state step
```bash
gofmt -w go/internal/httpapi/mcp_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP durability step (persisted local working-set / telemetry state)
The natural next parity move was to make the new Go-owned MCP local state survive process restarts instead of disappearing with the process.

### What changed
- extended `go/internal/httpapi/mcp_local_state.go`
  - added persisted state snapshot format covering:
    - loaded-tool state
    - telemetry events
    - eviction history
  - added file-backed load-on-start behavior
  - added save-on-mutation behavior
  - persistence target is now `mcp_state.json` under the Go config directory (`cfg.ConfigDir`)
  - persistence snapshots are now cloned under lock before JSON marshalling so file writes do not marshal live mutable maps/slices after unlock
- updated `go/internal/httpapi/server.go`
  - `newLocalMCPStateManager(...)` now receives `filepath.Join(cfg.ConfigDir, "mcp_state.json")`
- expanded `go/internal/httpapi/server_test.go`
  - added persistence coverage proving reload behavior for:
    - loaded working-set state
    - hydrated-schema state
    - eviction history
    - telemetry history
    - clear/unload persistence semantics

### Real bug found and fixed during this step
While adding save-on-mutation behavior I initially introduced an RWMutex misuse by combining `defer m.mu.Unlock()` with explicit pre-save unlocks in mutation methods.

That caused:
- `fatal error: sync: Unlock of unlocked RWMutex`

Root cause:
- mutation functions were explicitly unlocking before `save()` so file I/O would not happen while holding the write lock
- but some functions still retained `defer m.mu.Unlock()`, producing a double-unlock on the successful path

Fix:
- removed deferred unlocks from the affected mutation methods
- switched those methods to explicit unlock paths for both success and early-return branches
- re-ran the full Go suite after the fix

### Important truthfulness note
This is now a materially stronger parity position than the previous in-memory-only step.

What is true now:
- Go fallback mode has persisted local MCP working-set state
- Go fallback mode has persisted local MCP eviction history
- Go fallback mode has persisted local MCP tool-selection telemetry
- this state survives Go process restart/reconstruction so long as the same Go config directory is used
- the persisted state is local-Go-owned rather than bridge-only

What is still not true yet:
- this is still local file-backed parity, not full TS-equivalent durable distributed/session orchestration parity
- there is still no richer long-horizon analytics pipeline or broader TS-equivalent MCP runtime history model in Go
- MCP config import/export/client-sync authority remains unfinished
- runtime-server lifecycle/transport parity is still only partial

### Validation performed for this MCP durability step
```bash
gofmt -w go/internal/httpapi/mcp_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP inventory durability step (persisted Go-owned tool inventory cache)
The next recommended parity move was to give the native Go MCP inventory layer its own persisted cache so operator-facing tool list/search surfaces would not depend only on a live bridge, a live DB shape, or a currently hydrated JSONC metadata set.

### What changed
- rewrote `go/internal/mcp/inventory.go`
  - added `LoadInventoryWithCache(workspaceRoot, mainConfigDir, cachePath)`
  - retained existing `LoadInventory(...)` as a compatibility wrapper
  - native inventory can now read from:
    - local `mcp.jsonc` / `mcp.json`
    - local `packages/core/metamcp.db`
    - persisted Go-owned cache file
  - live inventory loads now persist to `mcp_inventory_cache.json`
  - cached inventory reloads now surface as `Source: "cache"`
  - added deterministic sorting plus cloned cache persistence structures for safer/stabler snapshots
- added `go/internal/httpapi/mcp_inventory_fallback.go`
  - central Go helpers for:
    - cache path resolution
    - cache-backed inventory loading
    - normalizing cached inventory tool names back to operator-facing tool names
    - formatting MCP fallback tool list/search payloads
    - formatting `/api/tools*` fallback payloads from cached inventory
- updated `go/internal/httpapi/mcp_handlers.go`
  - `/api/mcp/tools` now prefers Go-owned persisted inventory cache fallback when available
  - `/api/mcp/tools/search` now prefers Go-owned persisted inventory cache fallback when available
  - both still retain truthful lower-fidelity summary fallback behavior when cache-backed inventory is unavailable
- updated `go/internal/httpapi/server.go`
  - `/api/tools`
  - `/api/tools/by-server`
  - `/api/tools/search`
  - `/api/tools/get`
  now use the Go-owned inventory cache as a secondary fallback when local DB rows are unavailable or empty
- expanded `go/internal/mcp/inventory_test.go`
  - proves cache write-through from live config
  - proves cache-only reload after live sources disappear
- expanded `go/internal/httpapi/server_test.go`
  - proves `/api/mcp/tools` and `/api/mcp/tools/search` can serve from persisted inventory cache
  - proves `/api/tools`, `/api/tools/search`, and `/api/tools/get` can recover from persisted inventory cache without local DB rows

### Real bugs / correctness issues found and fixed during this step
#### 1. Source-label bug in inventory loading
Initial cache implementation incorrectly labeled some config-only inventory loads as `database`.

Root cause:
- after the DB open path ran, the code checked whether `inventory.Tools` was non-empty
- but that included tools already loaded from config, so the source label could become misleading even when the DB contributed nothing

Fix:
- track the tool count before DB ingestion
- only switch `inventory.Source` to `database` if the DB path actually added tools beyond the pre-DB count

#### 2. Empty-success masking bug in `/api/tools*` fallback behavior
The local DB helper can truthfully return an empty result rather than an error when the DB file exists but the schema/tables are absent.

Why that mattered:
- the first version of the cache-backed `/api/tools*` recovery only activated on hard DB errors
- that meant a perfectly good persisted inventory cache could remain unused while operators still saw empty lists

Fix:
- `/api/tools*` cache recovery now activates both when the local DB path errors **and** when it returns empty/no-match results

### Important truthfulness note
This materially improves Go-owned MCP inventory authority, but it is still not full end-state parity.

What is true now:
- Go has a persisted local MCP inventory cache file: `mcp_inventory_cache.json`
- Go MCP list/search fallback can now prefer cache-backed inventory data instead of relying only on harness summary fallback
- `/api/tools*` has a stronger secondary fallback path when local DB rows are missing or stale
- cached inventory survives restart and can recover operator-facing tool discovery when live local sources are temporarily absent

What is still not true yet:
- this cache is still a local file-backed cache, not the final authoritative multi-runtime registry model
- cache invalidation/freshness policy is still simple and opportunistic rather than fully lifecycle-managed
- Go still does not own full MCP client sync/import/export parity
- runtime lifecycle and transport parity remain only partial

### Validation performed for this MCP inventory cache step
```bash
gofmt -w go/internal/mcp/inventory.go go/internal/mcp/inventory_test.go go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/mcp_handlers.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/mcp ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted mcp tests passed
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP cache-authority refinement step (runtime overlay + cache freshness metadata)
The next refinement was to reduce the remaining “split-brain” feeling between:
- persisted MCP inventory cache data
- runtime-registry live-probed tool data
- operator-facing fallback responses

### What changed
- rewrote `go/internal/httpapi/mcp_inventory_fallback.go`
  - introduced a `localMCPInventoryView` abstraction that:
    - loads Go-owned persisted inventory/cache state
    - records cache presence and cache path
    - records inventory source and cached timestamp
    - overlays runtime-registry live-probed tools/servers onto the fallback inventory view
    - tracks runtime overlay counts
  - fallback inventory formatting helpers now emit richer tool records including:
    - per-tool source
    - `inventoryCachedAt`
- updated `go/internal/httpapi/mcp_handlers.go`
  - cache-backed `/api/mcp/tools`
  - cache-backed `/api/mcp/tools/search`
  now include truthful bridge metadata such as:
    - `inventorySource`
    - `cachedAt`
    - `cachePath`
    - `cachePresent`
    - `runtimeOverlayServerCount`
    - `runtimeOverlayToolCount`
- updated `go/internal/httpapi/server.go`
  - cache-backed `/api/tools`
  - cache-backed `/api/tools/by-server`
  - cache-backed `/api/tools/search`
  - cache-backed `/api/tools/get`
  now include the same cache/source/freshness metadata on fallback responses
- expanded `go/internal/httpapi/server_test.go`
  - persisted inventory cache fallback tests now also prove:
    - runtime overlay tools appear in cache-backed fallback results
    - cache freshness metadata is exposed in fallback responses
    - runtime overlay counts are exposed in bridge metadata

### Why this matters
Before this step, runtime-registry live-probed tools and the persisted inventory cache could both exist, but operators had no clear signal about:
- whether cache-backed results were fresh or stale
- whether runtime-added/probed tools had been incorporated into the fallback view
- whether a response was pure cache, live local inventory, or a blended cache+runtime overlay

This step does not fully solve all cache-authority questions, but it materially improves inspectability and reduces divergence in the most operator-visible fallback routes.

### Important truthfulness note
What is true now:
- cache-backed fallback responses surface cache freshness/source metadata
- runtime live-probed tools can be blended into cache-backed fallback inventory views
- cache-backed MCP/control tool responses are more inspectable and less ambiguous than before

What is still not true yet:
- this is still a response-layer unification step, not a complete single-authority lifecycle manager for all MCP cache state
- persisted inventory cache and JSONC metadata cache are still related but not fully unified under one durable registry model
- runtime overlay data is still opportunistic and memory-scoped unless separately persisted through other flows

### Validation performed for this MCP cache-authority refinement step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/mcp_handlers.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP cache-write unification step (JSONC save path now resyncs inventory cache)
The next issue to remove was a real divergence hazard between:
- JSONC-configured server metadata writes
- persisted inventory cache state

### The drift problem
Before this step:
- local configured-server metadata refresh/clear/import flows updated `mcp.jsonc`
- persisted inventory cache state in `mcp_inventory_cache.json` was updated later and opportunistically through inventory loading

That meant a subtle but serious stale-cache risk:
- metadata clear could remove `_meta.tools` from the JSONC truth source
- but an older persisted inventory cache could still carry those tools
- a later cache-backed fallback could then re-surface stale tool inventory that had already been cleared from the authoritative local JSONC state

### What changed
- rewrote `go/internal/mcp/inventory.go`
  - extracted a live-source inventory path (`loadLiveInventory(...)`) that reads only:
    - live `mcp.jsonc` / `mcp.json`
    - live local `metamcp.db`
  - added exported `SyncInventoryCacheFromLiveSources(workspaceRoot, mainConfigDir, cachePath)`
    - rebuilds the inventory cache from live sources only
    - overwrites the cache when live sources exist
    - removes stale cache file state when live sources are empty
  - `LoadInventoryWithCache(...)` still supports cache fallback for read-time recovery, but write-time sync is now explicitly separated from read-time cache fallback
- updated `go/internal/httpapi/server.go`
  - `saveLocalMCPJsonc(...)` now calls `mcp.SyncInventoryCacheFromLiveSources(...)` after writing:
    - `mcp.jsonc`
    - compatibility `mcp.json`
  - this means JSONC write/mutation flows now actively keep `mcp_inventory_cache.json` aligned
- expanded `go/internal/mcp/inventory_test.go`
  - added regression coverage proving stale inventory cache files are removed when live sources are empty
- expanded `go/internal/httpapi/server_test.go`
  - metadata reload test now verifies the inventory cache is refreshed from JSONC metadata
  - metadata clear test now verifies stale tool entries are removed from the persisted inventory cache

### Real correctness issue found and fixed
The important correctness point here is not a crash bug; it is a **truthfulness bug**.

Without this separation between read-time cache fallback and write-time live-source synchronization, it would be possible for a write path to preserve stale cache truth by accidentally reloading from the old cache while attempting to refresh it.

Fix:
- read-time cache fallback remains in `LoadInventoryWithCache(...)`
- write-time cache synchronization now uses `SyncInventoryCacheFromLiveSources(...)` so it never repopulates the cache from stale cached state during authoritative JSONC writes

### Important truthfulness note
What is true now:
- JSONC save/mutation flows now actively synchronize the Go inventory cache
- metadata clear actions no longer leave stale inventory cache tool rows behind
- metadata refresh actions now update both local JSONC metadata and the persisted inventory cache layer
- cache-backed fallback behavior is better aligned with the actual current local MCP configuration state

What is still not true yet:
- JSONC metadata cache and persisted inventory cache are still two related representations rather than one single stored object model
- runtime overlay data is still not durably folded back into the persisted inventory cache automatically
- broader MCP sync/import/export parity is still unfinished

### Validation performed for this MCP cache-write unification step
```bash
gofmt -w go/internal/mcp/inventory.go go/internal/mcp/inventory_test.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/mcp ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted mcp tests passed
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP model-unification step (shared canonical metadata-tool mapping)
The next cleanup target was one of the remaining shape-divergence seams: the same conceptual MCP tool metadata was still being translated separately in multiple places.

### The duplication problem
Before this step:
- JSONC `_meta.tools` handling had its own ad hoc normalization path
- live-probe metadata refresh built tool objects manually
- config-driven inventory generation built `ToolEntry` records manually
- runtime overlay inventory generation built `ToolEntry` records manually
- local available-tool resolution parsed raw JSONC tool maps manually

Even when behavior looked correct, this kind of duplication creates subtle drift risk around fields like:
- `alwaysOn`
- `OriginalName`
- `AdvertisedName`
- `InputSchema`
- name normalization / empty-name filtering

### What changed
- added `go/internal/mcp/metadata_tools.go`
  - introduced shared canonical MCP metadata helpers:
    - `MetadataTool`
    - `MetadataToolsFromAny(...)`
    - `MetadataToolsToAny(...)`
    - `ToolEntryFromMetadata(...)`
- updated `go/internal/mcp/inventory.go`
  - config-backed inventory generation now uses the shared canonical metadata-tool helpers instead of bespoke `ToolEntry` assembly
  - config-side `_meta.tools` parsing now also carries `alwaysOn`
- updated `go/internal/httpapi/server.go`
  - live stdio metadata refresh now serializes tool metadata through the shared canonical helper path
  - JSONC metadata inspection now normalizes `_meta.tools` through the same canonical helper path before recomputing `toolCount` / cache semantics
  - local available-tool resolution now parses `_meta.tools` through the same canonical metadata helper path
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - runtime overlay inventory generation now builds fallback `ToolEntry` records through the shared canonical metadata helper path
  - cache bridge metadata now also exposes explicit authority labels:
    - `cacheAuthority: "go-local-live-sync"`
    - `metadataAuthority: "mcp.jsonc"`
- added `go/internal/mcp/metadata_tools_test.go`
  - direct regression coverage for canonical metadata-tool normalization, encoding, and `ToolEntry` generation
- expanded `go/internal/httpapi/server_test.go`
  - cache-backed fallback tests now assert the explicit cache/metadata authority labels

### Real issue found and fixed during this step
This step uncovered a **test fragility** rather than a production logic bug.

Issue:
- `TestMCPLocalStatePersistence` relied on millisecond timestamp ordering between rapid tool-load operations
- under faster execution, multiple operations could land in the same millisecond and make eviction ordering nondeterministic

Fix:
- made the test deterministic by spacing load/hydrate operations slightly instead of assuming unique millisecond timestamps

### Why this matters
This is a structural cleanup step that improves long-term cache correctness.

What is true now:
- JSONC metadata handling and inventory/cache generation now share a canonical metadata-tool mapping path
- `alwaysOn` handling is more consistent across JSONC metadata, inventory cache generation, and fallback inventory views
- fallback responses now state not only freshness but also cache/metadata authority labels
- future MCP cache evolution has fewer parallel conversion paths to keep in sync

What is still not true yet:
- there is still not one single persisted MCP object model for every cache/metadata/runtime layer
- runtime overlay persistence is still separate from canonical cache persistence
- broader MCP runtime/session lifecycle parity is still incomplete

### Validation performed for this MCP model-unification step
```bash
gofmt -w go/internal/mcp/metadata_tools.go go/internal/mcp/metadata_tools_test.go go/internal/mcp/inventory.go go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/mcp ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted mcp tests passed
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP runtime-overlay durability step (persist durable runtime overlay in canonical cache)
The next recommended step was to stop treating runtime-probed tool inventory as purely in-memory when it had already been successfully discovered and normalized.

### The gap before this step
Before this step:
- runtime-registry live-probed tools could appear in fallback responses during the current process lifetime
- but that runtime overlay disappeared with the process
- the canonical inventory cache file did not retain any durable subset of successful runtime-probe results

That meant a cold restart could lose operator-visible runtime-discovered tools even if they had already been successfully probed and normalized earlier.

### What changed
- rewrote `go/internal/mcp/inventory.go`
  - added `RuntimeOverlayServer`
  - added `InventoryCacheSnapshot`
  - the canonical cache file now stores:
    - base inventory snapshot
    - persisted runtime overlay snapshot
  - added `LoadInventoryCacheSnapshot(cachePath)`
  - added `SyncRuntimeOverlayCache(cachePath, overlay)`
  - `saveInventoryCache(...)` now preserves existing persisted runtime overlay when refreshing the base inventory section
  - `SyncInventoryCacheFromLiveSources(...)` now preserves persisted runtime overlay while resyncing base live inventory from JSONC/DB
  - when no base inventory exists but persisted runtime overlay does, the cache file is retained instead of being deleted
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - local inventory views now load persisted runtime overlay from the canonical cache snapshot
  - fallback inventory views now distinguish:
    - persisted runtime overlay counts
    - live in-memory runtime overlay counts
  - persisted runtime overlay entries are surfaced with source `go-persisted-runtime-overlay`
- updated `go/internal/httpapi/server.go`
  - runtime server add/remove flows now call `syncRuntimeOverlayCache()` after updating the in-memory registry
  - this keeps the durable runtime overlay section of the cache aligned with runtime-registry mutations
- expanded `go/internal/mcp/inventory_test.go`
  - added regression coverage proving runtime overlay can persist without base inventory
  - added regression coverage proving overlay-only cache files are removed when overlay is cleared
- expanded `go/internal/httpapi/server_test.go`
  - added fallback coverage proving persisted runtime overlay is visible without a live in-memory runtime registry
  - added bridge-metadata coverage for distinct persisted-vs-live overlay counts

### Durable subset rule
To stay truthful, this step persists only the durable subset of runtime overlay data:
- runtime servers with a non-empty normalized tool list

What is intentionally **not** durably persisted by this step:
- failed probe attempts without tool data
- transient runtime failure state as if it were authoritative inventory
- a full runtime lifecycle/session model

### Why this matters
This materially improves restart behavior for operator-facing fallback inventory without pretending the runtime registry is fully durable.

What is true now:
- successful runtime-probed tool metadata can survive process restart via the canonical cache file
- fallback responses can distinguish persisted runtime overlay from live in-memory runtime overlay
- base inventory resync and runtime overlay persistence now share the same cache file instead of living in disconnected stores

What is still not true yet:
- this is still not full durable lifecycle parity for runtime servers themselves
- persisted runtime overlay is a durable cache of discovered metadata, not a guarantee that the runtime server is currently alive or reconnectable
- runtime add/remove execution semantics and transport lifecycle ownership are still only partial

### Validation performed for this MCP runtime-overlay durability step
```bash
gofmt -w go/internal/mcp/inventory.go go/internal/mcp/inventory_test.go go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/mcp ./internal/httpapi
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted mcp tests passed
- targeted httpapi tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP freshness-semantics step (per-layer age and stale heuristics)
The next refinement was to make cache-backed fallback truthfulness more precise by distinguishing freshness across different cache layers instead of treating the whole response as one freshness bucket.

### The ambiguity before this step
Before this step, fallback responses could already tell operators:
- the cache source
- whether persisted runtime overlay existed
- whether live runtime overlay existed

But they still could not clearly answer:
- how old the base live-synced inventory snapshot was
- how old the persisted runtime overlay snapshot was
- how old the current-process live runtime overlay was
- whether any of those layers were old enough to deserve caution

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - local inventory views now track:
    - `PersistedOverlayCheckedAt`
    - `LiveOverlayCheckedAt`
  - bridge metadata now exposes separate freshness fields for:
    - base inventory layer
    - persisted runtime overlay layer
    - live runtime overlay layer
- cache-backed bridge metadata now includes fields such as:
  - `baseInventoryCachedAt`
  - `baseInventoryAgeMs`
  - `baseInventoryStaleHeuristic`
  - `persistedOverlayCachedAt`
  - `persistedOverlayAgeMs`
  - `persistedOverlayStaleHeuristic`
  - `liveOverlayCachedAt`
  - `liveOverlayAgeMs`
  - `liveOverlayStaleHeuristic`
- heuristic thresholds are intentionally simple and truthful:
  - base inventory stale heuristic: older than 24 hours
  - persisted runtime overlay stale heuristic: older than 15 minutes
  - live runtime overlay stale heuristic: older than 15 minutes
- expanded `go/internal/httpapi/server_test.go`
  - cache-backed fallback tests now verify the new age/staleness metadata for:
    - base inventory cache
    - persisted runtime overlay
    - live runtime overlay

### Important truthfulness note
These are **heuristic** freshness signals, not assertions that data is invalid.

What is true now:
- operators can see per-layer cache age information
- operators can distinguish base inventory freshness from persisted overlay freshness from live overlay freshness
- stale heuristic flags are now explicit instead of implicit guesswork

What is not true yet:
- a stale heuristic does not mean the data is definitely wrong
- a non-stale heuristic does not guarantee the downstream server is currently healthy or reachable
- this is still observability/truthfulness improvement, not full lifecycle authority

### Validation performed for this MCP freshness-semantics step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP per-tool provenance step (origin layer + layer freshness on tool records)
The next refinement was to stop forcing clients to infer per-tool provenance from only the top-level bridge metadata.

### The ambiguity before this step
Before this step:
- bridge metadata could describe the freshness of base inventory, persisted runtime overlay, and live runtime overlay at a summary level
- but an individual tool record still did not directly say which layer it came from

That made it harder for dashboard/UI consumers to explain things like:
- why this specific tool is present
- whether this specific tool came from base inventory, persisted runtime overlay, or live runtime overlay
- which freshness timestamp/staleness heuristic actually applies to this specific tool

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - introduced per-tool layer metadata mapping via `inventoryToolLayerMeta(...)`
  - individual fallback tool records now carry fields such as:
    - `originLayer`
    - `layerCachedAt`
    - `layerAgeMs`
    - `layerStaleHeuristic`
- applied that per-tool metadata uniformly across:
  - `fallbackMCPInventoryTools(...)`
  - `fallbackSearchMCPInventoryTools(...)`
  - `fallbackControlToolsFromInventory(...)`
- expanded `go/internal/httpapi/server_test.go`
  - fallback tests now verify per-tool origin-layer fields for:
    - base inventory tools
    - persisted runtime overlay tools
    - live runtime overlay tools

### Important truthfulness note
What is true now:
- each fallback tool record now states which origin layer it came from
- each fallback tool record now carries the freshness timestamp and stale heuristic for that specific layer
- consumers no longer need to guess per-tool provenance from only response-level summary metadata

What is still not true yet:
- per-tool provenance is still derived from the current cache/view model, not from a fully authoritative lifecycle ledger
- layer stale heuristics are still heuristics, not definitive correctness signals
- this improves inspectability, not full MCP lifecycle parity

### Validation performed for this MCP per-tool provenance step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up MCP server-level provenance step (runtime server origin layer + freshness)
The next refinement was to bring `/api/mcp/servers/runtime` up to the same truthfulness standard as the tool fallback surfaces.

### The gap before this step
Before this step:
- tool fallback records could explain their origin layer and layer freshness
- but runtime server fallback records still relied on a thinner summary model
- persisted runtime overlay could survive in cache, yet `/api/mcp/servers/runtime` did not surface that durable provenance cleanly when live summary detection was unavailable

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - local inventory views now retain runtime overlay records in addition to counts
  - added shared server-level provenance helpers
  - added `fallbackRuntimeServersWithProvenance(...)`
  - runtime server records now carry fields such as:
    - `originLayer`
    - `layerCachedAt`
    - `layerAgeMs`
    - `layerStaleHeuristic`
- updated `go/internal/httpapi/mcp_handlers.go`
  - `/api/mcp/servers/runtime` now uses the shared provenance-aware runtime server formatter
  - when summary detection is unavailable, the route can still recover from persisted/live runtime overlay cache data instead of dropping directly to service-unavailable
  - bridge metadata now stays aligned with the same cache/source/freshness model used elsewhere
- expanded `go/internal/httpapi/server_test.go`
  - summary-backed runtime server fallback now verifies `originLayer: "source-backed-summary"`
  - live runtime overlay runtime-server fallback now verifies server-level freshness fields
  - persisted runtime overlay runtime-server fallback now verifies recovery from cache without a live in-memory registry

### Important truthfulness note
What is true now:
- runtime server fallback responses now carry server-level provenance and freshness metadata
- persisted runtime overlay can recover `/api/mcp/servers/runtime` when live summary detection is unavailable
- server-level and tool-level fallback truthfulness are now much more aligned

What is still not true yet:
- this does not make runtime server lifecycle fully durable or authoritative
- persisted runtime overlay still represents cached discovered metadata, not a promise that the runtime server is alive now
- full transport/session lifecycle parity remains incomplete

### Validation performed for this MCP server-level provenance step
```bash
gofmt -w go/internal/httpapi/mcp_handlers.go go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up configured-server provenance step (record-level metadata origin and freshness)
The next truthfulness gap was on configured-server read surfaces.

### The gap before this step
Before this step:
- configured-server fallback routes could return `_meta` payloads
- but the server record itself did not directly state:
  - whether the definition came from JSONC fallback or DB-with-JSONC-overlay fallback
  - what the metadata source was
  - when the metadata was last hydrated/discovered
  - whether that metadata should be treated as old enough to warrant caution

### What changed
- updated `go/internal/httpapi/server.go`
  - JSONC-backed configured server records now include provenance fields such as:
    - `originLayer`
    - `metadataOrigin`
    - `metadataCachedAt`
    - `metadataAgeMs`
    - `metadataStaleHeuristic`
  - DB-backed configured server fallback records now include the same provenance/freshness fields after JSONC metadata overlay is applied
  - metadata provenance can infer `jsonc-cache` when cached tool metadata is clearly present even if older JSONC fixtures do not explicitly set `metadataSource`
- expanded `go/internal/httpapi/server_test.go`
  - configured server list/get fallback tests now verify the new provenance/freshness fields
  - the JSONC fixture now includes an explicit cache hydration timestamp to make freshness assertions deterministic

### Important truthfulness note
What is true now:
- configured-server fallback records now say where the definition layer came from
- configured-server fallback records now expose metadata freshness/provenance directly on the record
- JSONC-backed and DB-backed configured server fallback payloads are more inspectable and more aligned with the tool/runtime provenance model

What is still not true yet:
- configured-server provenance still reflects fallback data authority, not full runtime liveness authority
- metadata staleness is still heuristic, not proof the metadata is invalid
- broader configured-server ecosystem parity is still incomplete

### Validation performed for this configured-server provenance step
```bash
gofmt -w go/internal/httpapi/server.go go/internal/httpapi/server_test.go go/internal/httpapi/mcp_handlers.go go/internal/httpapi/mcp_inventory_fallback.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up provenance-schema unification step (stable nested `provenance` object)
The next cleanup target was naming consistency.

### The inconsistency before this step
By this point, fallback records had become much more truthful, but the naming model was still mixed:
- `source`
- `originLayer`
- `metadataOrigin`
- `layerCachedAt`
- `metadataCachedAt`

That was workable for humans reading raw JSON, but not ideal for UI/API consumers trying to rely on one predictable provenance schema across all MCP fallback records.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - tool fallback records now expose a nested `provenance` object with fields like:
    - `layer`
    - `source`
    - `cachedAt`
    - `ageMs`
    - `staleHeuristic`
    - `cacheAuthority`
    - `metadataAuthority`
  - runtime server fallback records now use the same nested `provenance` object model
- updated `go/internal/httpapi/server.go`
  - configured-server fallback records now also expose a nested `provenance` object while preserving the richer configured-server-specific metadata fields already present at the top level
- expanded `go/internal/httpapi/server_test.go`
  - fallback tests now verify the nested `provenance` object across:
    - tool fallback records
    - runtime server fallback records
    - configured-server fallback records

### Compatibility note
This step was intentionally additive.

What changed for consumers:
- there is now one stable nested `provenance` object to read across MCP fallback record types

What did **not** change yet:
- the legacy top-level fields remain present for compatibility
- this is a schema unification step, not a breaking rename/removal step

### Important truthfulness note
What is true now:
- MCP fallback records now have a more uniform provenance schema
- clients can read one nested `provenance` object across tools, runtime servers, and configured servers
- the schema is more predictable without pretending old fields never existed

What is still not true yet:
- some legacy top-level provenance fields still remain alongside the nested object
- there is still not a single shared typed API contract across TS and Go for all these record shapes
- this improves consistency, not full end-state contract parity

### Validation performed for this provenance-schema unification step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up provenance-contract step (nested `provenance` marked primary)
The next cleanup was to make the intent of the new schema explicit instead of merely implicit.

### The ambiguity before this step
Before this step:
- fallback records already had the nested `provenance` object
- but clients still had no explicit signal about whether they should prefer:
  - the nested `provenance` object
  - or the older duplicated top-level provenance fields

That made the transition path less clear than it needed to be.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - nested `provenance` objects now explicitly include:
    - `schemaVersion: 1`
    - `primary: true`
    - `compatibilityMode: "legacy-top-level-mirrors-retained"`
- updated `go/internal/httpapi/server.go`
  - configured-server provenance now uses the same explicit primary nested provenance contract
- expanded `go/internal/httpapi/server_test.go`
  - tests now verify the explicit primary/compatibility markers inside nested `provenance`

### Important truthfulness note
What is true now:
- the nested `provenance` object is now explicitly the primary fallback provenance contract
- legacy top-level provenance fields are still present, but now clearly framed as compatibility mirrors
- clients have a concrete migration target instead of only an implied preference

What is still not true yet:
- legacy top-level fields have not been removed yet
- TS and Go still do not share one single typed provenance contract everywhere
- this is a contract-clarification step, not final contract consolidation

### Validation performed for this provenance-contract step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up provenance-compatibility cleanup step (explicit legacy mirror list)
The next low-risk cleanup was to make compatibility mirroring explicit instead of merely implied.

### The ambiguity before this step
Before this step:
- the nested `provenance` object was marked primary
- but clients still had no explicit machine-readable list of which top-level fields were being retained only as compatibility mirrors

That meant the compatibility boundary was clear in docs, but not as explicit in the payload contract itself.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - nested `provenance` objects now carry `legacyMirrorFields`
  - tool/runtime-layer provenance now explicitly lists mirrored top-level fields such as:
    - `originLayer`
    - `layerCachedAt`
    - `layerAgeMs`
    - `layerStaleHeuristic`
- updated `go/internal/httpapi/server.go`
  - configured-server provenance now explicitly lists mirrored top-level fields such as:
    - `originLayer`
    - `metadataOrigin`
    - `metadataCachedAt`
    - `metadataAgeMs`
    - `metadataStaleHeuristic`
- expanded `go/internal/httpapi/server_test.go`
  - tests now verify `legacyMirrorFields` in the primary nested provenance contract

### Important truthfulness note
What is true now:
- the payload itself now states exactly which top-level provenance fields are compatibility mirrors
- clients can reliably prioritize nested `provenance` while still understanding the compatibility surface
- the contract is clearer without yet breaking consumers

What is still not true yet:
- legacy mirror fields still remain in payloads
- this is still not final removal of duplicate provenance fields
- TS and Go contract consolidation is still incomplete

### Validation performed for this provenance-compatibility cleanup step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up low-risk provenance-trim step (search-result records)
The next cleanup step was to begin actually reducing duplicated top-level provenance fields, but only on the lowest-risk MCP fallback surfaces first.

### Why search results were chosen first
Search-result records are a good first candidate because they are:
- read-only
- transient/result-oriented
- less likely to be treated as long-lived object contracts than list/get payloads

That makes them a safer place to begin trimming duplicated provenance mirrors while preserving the nested `provenance` object as the primary contract.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - added `primaryProvenanceOnly(...)`
  - MCP/cache-backed **search result** records now:
    - keep the nested `provenance` object
    - switch `compatibilityMode` to `legacy-top-level-mirrors-trimmed`
    - clear `legacyMirrorFields`
    - drop top-level layer mirror fields such as:
      - `originLayer`
      - `layerCachedAt`
      - `layerAgeMs`
      - `layerStaleHeuristic`
- updated `go/internal/httpapi/server.go`
  - cache-backed `/api/tools/search` search results now also use the trimmed provenance-mirror form
- expanded `go/internal/httpapi/server_test.go`
  - search-result tests now verify:
    - nested `provenance` is present
    - compatibility mode is `legacy-top-level-mirrors-trimmed`
    - legacy mirror list is empty
    - trimmed top-level layer mirrors are absent from search-result payloads

### Important truthfulness note
What is true now:
- search-result surfaces are the first MCP fallback records where legacy top-level provenance mirrors are actually being trimmed
- nested `provenance` remains the authoritative schema on those responses
- list/get surfaces still retain compatibility mirrors for now

What is still not true yet:
- top-level provenance duplication has not been removed across all fallback surfaces
- this is a selective low-risk migration step, not a global breaking contract change
- TS/Go contract consolidation is still incomplete

### Validation performed for this low-risk provenance-trim step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up low-risk provenance-trim step (tool list surfaces)
After search-result records were trimmed successfully, the next low-risk expansion was to apply the same contract cleanup to list-style tool surfaces while still leaving get/detail responses compatibility-heavy.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - `/api/mcp/tools` fallback tool list records now trim top-level layer mirror fields in favor of nested `provenance`
  - `/api/tools` and `/api/tools/by-server` cache-backed fallback tool list records now do the same
- updated `go/internal/httpapi/server.go`
  - list/by-server cache-backed tool routes now use the trimmed list formatter
- expanded `go/internal/httpapi/server_test.go`
  - list-surface tests now verify:
    - nested `provenance` remains present
    - `compatibilityMode` is `legacy-top-level-mirrors-trimmed`
    - `legacyMirrorFields` is empty
    - top-level layer mirrors are absent from the trimmed list payloads

### Important truthfulness note
What is true now:
- low-risk list surfaces now join search surfaces in preferring the nested `provenance` object over legacy top-level layer mirrors
- higher-risk get/detail/configured/runtime compatibility-heavy surfaces still retain their top-level mirrors for now

What is still not true yet:
- top-level provenance duplication is still not removed everywhere
- this remains a selective low-risk rollout, not a global contract break
- TS/Go contract consolidation is still incomplete

### Validation performed for this low-risk list-surface trim step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up low-risk provenance-trim step (runtime/configured server lists)
The next low-risk extension was to apply the same primary-provenance-only treatment to server **list** surfaces while still leaving server get/detail responses compatibility-heavy.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - runtime-server list records can now be emitted in primary-provenance-only form
  - configured-server records now also have a dedicated primary-provenance-only trim helper
- updated `go/internal/httpapi/mcp_handlers.go`
  - `/api/mcp/servers/runtime` list responses now use the trimmed primary-provenance list form
- updated `go/internal/httpapi/server.go`
  - `/api/mcp/servers/configured` list responses now use the trimmed primary-provenance list form
- expanded `go/internal/httpapi/server_test.go`
  - runtime-server list tests now verify:
    - nested `provenance` remains present
    - `compatibilityMode` is `legacy-top-level-mirrors-trimmed`
    - `legacyMirrorFields` is empty
    - top-level layer/metadata mirror fields are absent from the list response
  - configured-server list tests now verify the same trimmed contract

### Important truthfulness note
What is true now:
- low-risk runtime/configured list surfaces now join tool search/list surfaces in preferring the primary nested `provenance` object
- get/detail payloads remain compatibility-heavy where contract risk is higher

What is still not true yet:
- top-level provenance duplication still remains on higher-risk detail surfaces
- this is still a selective contract migration, not a global breaking cleanup
- TS/Go contract consolidation remains incomplete

### Validation performed for this low-risk runtime/configured list trim step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/mcp_handlers.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up low-risk provenance-trim step (detail-adjacent `/api/tools/get`)
After trimming low-risk search/list surfaces, the next smallest detail-adjacent step was to move `/api/tools/get` onto the primary nested provenance contract while still leaving higher-risk configured/detail server surfaces compatibility-heavy.

### What changed
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - added `fallbackControlToolPrimaryProvenance(...)`
- updated `go/internal/httpapi/server.go`
  - `/api/tools/get` cache-backed fallback now returns the primary nested provenance form rather than the compatibility-heavy mirrored form
- expanded `go/internal/httpapi/server_test.go`
  - `/api/tools/get` fallback test now verifies:
    - nested `provenance` remains present
    - `compatibilityMode` is `legacy-top-level-mirrors-trimmed`
    - `legacyMirrorFields` is empty
    - top-level layer mirrors are absent from this detail-adjacent payload

### Important truthfulness note
What is true now:
- `/api/tools/get` is the first detail-adjacent MCP fallback surface to adopt the trimmed primary-provenance form
- configured-server and other higher-risk detail surfaces still preserve compatibility mirrors for now

What is still not true yet:
- this is still a selective migration, not global detail-surface cleanup
- many higher-risk get/detail/config surfaces still retain top-level provenance duplication for compatibility
- TS/Go contract consolidation remains incomplete

### Validation performed for this detail-adjacent provenance-trim step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up detail-adjacent provenance-trim step (configured-server get)
The next step after `/api/tools/get` was to trim the next remaining detail-style MCP fallback read that had become low enough risk: configured-server get fallback.

### What changed
- updated `go/internal/httpapi/server.go`
  - JSONC-backed configured-server get fallback now returns the primary nested provenance form
  - DB-backed configured-server get fallback now does the same
- updated `go/internal/httpapi/mcp_inventory_fallback.go`
  - configured-server primary-provenance-only trimming helper is now used by both list and get fallback responses
- expanded `go/internal/httpapi/server_test.go`
  - configured-server get fallback test now verifies:
    - nested `provenance` remains present
    - `compatibilityMode` is `legacy-top-level-mirrors-trimmed`
    - `legacyMirrorFields` is empty
    - top-level configured-server metadata mirror fields are absent from the get response

### Important truthfulness note
What is true now:
- configured-server get fallback now joins search/list surfaces and `/api/tools/get` in preferring the primary nested provenance contract
- the migration still remains selective rather than repo-wide

What is still not true yet:
- some higher-risk config/detail surfaces still retain compatibility-heavy top-level mirrors
- full TS/Go contract consolidation is still incomplete
- this is still not a global breaking cleanup

### Validation performed for this configured-server get trim step
```bash
gofmt -w go/internal/httpapi/mcp_inventory_fallback.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up Go-primary backend slice (native skills assimilation fallback)
The next higher-leverage move after the MCP provenance cleanup was to replace a real TS-only backend behavior with native Go ownership where the repo already had enough local primitives to do something useful and truthful.

### The gap before this step
Before this step:
- `/api/skills/assimilate` was still bridge-only to TypeScript
- Go already had native local skill scanning/reading/creating/saving primitives
- but Go could not own even a basic fallback assimilation path when TS was unavailable

### What changed
- updated `go/internal/httpapi/server.go`
  - `/api/skills/assimilate` now uses `handleSkillMutation(...)` like other skill mutations instead of being bridge-only
  - added `localAssimilateSkill(...)`
- native Go assimilation fallback now:
  - validates the requested topic
  - derives a safe local skill ID
  - creates a real local skill scaffold under `.hypercode/skills/<id>/SKILL.md`
  - records the requested topic
  - records the optional docs URL
  - logs clearly that this is a native Go fallback scaffold, not a fully researched TS/LLM assimilation output
  - returns structured success/log output instead of only failing when TS is unavailable
- expanded `go/internal/httpapi/server_test.go`
  - added regression coverage proving:
    - `/api/skills/assimilate` falls back locally when upstream is unavailable
    - a real `SKILL.md` scaffold is written
    - the scaffold preserves topic/docs URL context

### Important truthfulness note
This is a **real Go-native fallback**, but it is not full TS feature parity.

What is true now:
- `/api/skills/assimilate` is no longer bridge-only
- Go can create a real local starter skill scaffold when TS is unavailable
- the fallback is explicit about its limitations and does not pretend to be a full research/LLM assimilation pipeline

What is still not true yet:
- this is not full Darwin/LLM/research-driven assimilation parity
- the Go fallback does not yet replicate DeepResearch + LLM code-generation behavior from TS
- richer autonomous skill generation remains incomplete in Go

### Validation performed for this native skills-assimilation step
```bash
gofmt -w go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up Go-primary backend slice (native Darwin fallback)
The next real TS-to-Go backend ownership step was to replace Darwin’s bridge-only status with a truthful native fallback instead of leaving those routes completely TypeScript-owned.

### The gap before this step
Before this step:
- `/api/darwin/evolve`
- `/api/darwin/experiment`
- `/api/darwin/status`
were all bridge-only to TypeScript

That meant Go had no native Darwin ownership at all, even for local mutation/experiment state when TS was unavailable.

### What changed
- added `go/internal/httpapi/darwin_local_state.go`
  - native local Darwin mutation state
  - native local Darwin experiment state
  - persisted Darwin state under Go config dir (`darwin_state.json`)
  - async local experiment completion with deterministic, truthful local heuristics
- updated `go/internal/httpapi/server.go`
  - server now owns `darwinState`
- replaced `go/internal/httpapi/darwin_handlers.go`
  - Darwin routes now attempt TS first, then fall back natively in Go
  - `/api/darwin/evolve` now creates a native local mutation scaffold
  - `/api/darwin/experiment` now creates and runs a native local experiment record
  - `/api/darwin/status` now reports native local Darwin state
- expanded `go/internal/httpapi/server_test.go`
  - added regression coverage proving native Darwin fallback works end-to-end when upstream is unavailable
  - preserved existing upstream bridge coverage

### Important truthfulness note
This is a **real Go-native Darwin fallback**, but it is not full TS parity.

What is true now:
- Darwin routes are no longer bridge-only
- Go can persist local Darwin mutations and experiments
- Go can run a deterministic local fallback experiment flow and report status truthfully
- Darwin fallback state survives restart through `darwin_state.json`

What is still not true yet:
- this does not replicate TS LLM-driven mutation generation and judging parity
- the local Darwin fallback uses deterministic local heuristics instead of live model-based evolutionary evaluation
- full Darwin/autodev/swarm parity in Go remains incomplete

### Validation performed for this native Darwin step
```bash
gofmt -w go/internal/httpapi/darwin_handlers.go go/internal/httpapi/darwin_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up Go-primary backend slice (native AutoDev fallback)
The next real TS-to-Go backend ownership step was AutoDev.

### The gap before this step
Before this step:
- `/api/autodev/start-loop`
- `/api/autodev/cancel-loop`
- `/api/autodev/loops`
- `/api/autodev/loop`
- `/api/autodev/clear-completed`
were still bridge-only to TypeScript

That meant Go could not own even a basic local fix-loop manager when TS was unavailable.

### What changed
- added `go/internal/httpapi/autodev_local_state.go`
  - native local AutoDev loop state
  - persisted AutoDev state under Go config dir (`autodev_state.json`)
  - async loop execution with retry tracking
  - local cancel/list/get/clear behavior
  - truthful no-director/no-process-kill semantics in fallback mode
- updated `go/internal/httpapi/server.go`
  - server now owns `autoDevState`
- replaced `go/internal/httpapi/autodev_handlers.go`
  - AutoDev routes now attempt TS first, then fall back natively in Go
  - local fallback supports:
    - start loop
    - cancel loop
    - list loops
    - get one loop
    - clear completed loops
- expanded `go/internal/httpapi/server_test.go`
  - added regression coverage proving native AutoDev fallback works with a harmless custom command when upstream is unavailable
  - preserved existing upstream bridge coverage

### Important truthfulness note
This is a **real Go-native AutoDev fallback**, but it is not full TS parity.

What is true now:
- AutoDev routes are no longer bridge-only
- Go can persist local AutoDev loop state and report it across requests/restarts
- Go can execute simple local retry loops truthfully in fallback mode
- Go does not kill in-flight processes during cancel; it only prevents further retries

What is still not true yet:
- this does not replicate TS director-driven autonomous repair parity
- the Go fallback does not yet perform the richer Director/agent-mediated code-fix loop from TS
- full autodev/swarm/squad orchestration parity remains incomplete

### Validation performed for this native AutoDev step
```bash
gofmt -w go/internal/httpapi/autodev_handlers.go go/internal/httpapi/autodev_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up Go-primary backend slice (native squad fallback)
The next orchestration-heavy backend family to pull out of bridge-only status was squad.

### The gap before this step
Before this step:
- `/api/squad`
- `/api/squad/spawn`
- `/api/squad/kill`
- `/api/squad/chat`
- `/api/squad/indexer/toggle`
- `/api/squad/indexer/status`
were still bridge-only to TypeScript

That meant Go could not own even basic persisted local squad/indexer state when TS was unavailable.

### What changed
- added `go/internal/httpapi/squad_local_state.go`
  - native persisted squad member state
  - native persisted squad indexer toggle/status state
  - local squad “brain” snapshots with goal/history/message state
  - persisted squad state under Go config dir (`squad_state.json`)
- updated `go/internal/httpapi/server.go`
  - server now owns `squadState`
- replaced `go/internal/httpapi/squad_handlers.go`
  - squad routes now attempt TS first, then fall back natively in Go
  - local fallback supports:
    - list
    - spawn
    - kill
    - chat
    - indexer toggle
    - indexer status
- expanded `go/internal/httpapi/server_test.go`
  - added regression coverage proving native squad fallback works end-to-end when upstream is unavailable
  - preserved existing upstream bridge coverage

### Important truthfulness note
This is a **real Go-native squad fallback**, but it is not full TS parity.

What is true now:
- squad routes are no longer bridge-only
- Go can persist local squad member/indexer state and report it across requests/restarts
- Go can maintain simple local squad “brain” state for messages/goals/status

What is still not true yet:
- this does not replicate TS worktree creation, Director execution, or richer squad autonomy parity
- the Go fallback does not yet own the full squad worktree/director lifecycle
- full swarm/squad orchestration parity remains incomplete

### Validation performed for this native squad step
```bash
gofmt -w go/internal/httpapi/squad_handlers.go go/internal/httpapi/squad_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

## Follow-up Go-primary backend slice (native swarm fallback for safest surfaces)
The next orchestration-heavy backend family was swarm, but approached selectively instead of pretending to solve full swarm parity in one pass.

### The gap before this step
Before this step:
- all swarm routes were effectively bridge-only to TypeScript
- Go had no native mission history/risk view or local mission start/resume fallback at all

### What changed
- added `go/internal/httpapi/swarm_local_state.go`
  - native persisted swarm mission state under Go config dir (`swarm_state.json`)
  - native mission scaffolding
  - native mission history
  - native mission risk summary/rows/facets
  - native mesh capability snapshot
- updated `go/internal/httpapi/server.go`
  - server now owns `swarmState`
- replaced `go/internal/httpapi/swarm_handlers.go`
  - the safest swarm surfaces now attempt TS first, then fall back natively in Go:
    - start mission
    - resume mission
    - mission history
    - mission risk summary
    - mission risk rows
    - mission risk facets
    - mesh capabilities
  - higher-risk mutation/orchestration routes still remain bridge-first:
    - approve task
    - decompose task
    - update task priority
    - debate
    - consensus
    - direct message
- expanded `go/internal/httpapi/server_test.go`
  - added regression coverage proving native swarm fallback works end-to-end for the supported local mission/risk surfaces
  - preserved existing upstream bridge coverage

### Important truthfulness note
This is a **real Go-native swarm fallback slice**, but not full swarm parity.

What is true now:
- Go can start and persist a local swarm mission scaffold
- Go can resume local swarm missions
- Go can serve local mission history and mission-risk analytics when TS is unavailable
- Go can serve a local mesh capability snapshot

What is still not true yet:
- this does not replicate full TS swarm orchestration parity
- task approval/decomposition, debate, consensus, and direct messaging are still bridge-first
- the local mission scaffold is a truthful fallback representation, not a full multi-agent orchestration engine parity replacement

### Validation performed for this native swarm step
```bash
gofmt -w go/internal/httpapi/swarm_handlers.go go/internal/httpapi/swarm_local_state.go go/internal/httpapi/server.go go/internal/httpapi/server_test.go
cd go && go test ./internal/httpapi ./internal/mcp
cd go && go build -buildvcs=false ./cmd/hypercode
cd go && go test ./...
```

Results:
- targeted httpapi tests passed
- targeted mcp tests passed
- Go build passed
- full Go suite passed

### Follow-up swarm expansion note
After the initial swarm slice landed, the native fallback scope was expanded beyond just mission start/resume/history/risk/mesh reads.

The local swarm fallback now also covers:
- approve task
- decompose task
- update task priority
- local debate heuristic
- local consensus heuristic
- direct-message acknowledgment

Truthfulness note:
- these are still deterministic local fallback semantics, not full TS swarm-orchestrator parity
- they are real local backend ownership, but not a claim of full multi-agent execution equivalence

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
- native MCP fallback mode now has persisted local working-set state, eviction history, and tool-selection telemetry via Go-owned `mcp_state.json`
- native MCP inventory now has a Go-owned persisted cache layer via `mcp_inventory_cache.json`, and key MCP/control tool list/search fallbacks can recover from it
- cache-backed MCP/control fallback responses now expose source/freshness metadata and can overlay runtime-registry live-probed tools into the operator-visible fallback inventory view
- JSONC metadata save/mutation flows now actively resync `mcp_inventory_cache.json` from live sources so metadata clear/refresh actions do not preserve stale cached tool inventory
- canonical MCP metadata-tool normalization is now shared between JSONC metadata handling, inventory-cache generation, runtime overlay inventory views, and live metadata refresh serialization
- the canonical MCP cache file now persists the durable subset of successful runtime overlay tool metadata and fallback responses distinguish persisted-vs-live runtime overlay counts
- cache-backed fallback responses now expose per-layer age and stale heuristics for base inventory, persisted runtime overlay, and live runtime overlay
- individual fallback tool records now carry origin-layer and layer freshness metadata so clients can explain per-tool provenance directly
- runtime server fallback records now also carry server-level origin-layer and layer freshness metadata, and can recover from persisted runtime overlay cache when live summary detection is unavailable
- configured-server fallback records now carry record-level definition-layer provenance plus metadata freshness/provenance fields across JSONC-backed and DB-backed fallback reads
- MCP fallback records now expose a stable nested `provenance` object across tools, runtime servers, and configured servers, and that nested object is now explicitly marked as the primary contract while legacy top-level fields remain as compatibility mirrors
- nested `provenance` now explicitly lists its `legacyMirrorFields`, making the compatibility boundary machine-readable as well as documented
- low-risk search-result fallback surfaces are now the first places where redundant top-level provenance mirrors have actually been trimmed in favor of the primary nested `provenance` contract
- low-risk tool list surfaces now join search surfaces in trimming redundant top-level provenance mirrors while higher-risk get/detail surfaces remain intact for now
- low-risk runtime/configured server list surfaces now also use the trimmed primary nested `provenance` contract while corresponding get/detail responses remain compatibility-heavy for now
- `/api/tools/get` is now the first detail-adjacent MCP fallback surface to adopt the trimmed primary nested `provenance` contract while higher-risk detail surfaces remain compatibility-heavy
- configured-server get fallback now also adopts the trimmed primary nested `provenance` contract while the remaining highest-risk config/detail surfaces stay compatibility-heavy for now
- `/api/skills/assimilate` now has a native Go fallback that writes a real local starter skill scaffold instead of remaining bridge-only
- Darwin routes now have a native Go persisted local fallback for mutation/experiment/status behavior instead of remaining bridge-only
- AutoDev routes now have a native Go persisted local loop-manager fallback instead of remaining bridge-only
- squad routes now have a native Go persisted local squad/indexer state fallback instead of remaining bridge-only
- the safest swarm mission/risk/mesh surfaces plus mission start/resume now have native Go persisted fallback ownership instead of remaining bridge-only
- native swarm fallback now also covers local approve/decompose/update/debate/consensus/direct-message semantics, while remaining truthful that these are fallback heuristics rather than full orchestrator parity
- a tested Go-native replacement path for multiple TS-owned persistence surfaces, even though mixed-runtime cleanup is not fully finished yet
- a small but real Maestro UX fix

It was validated by successful Go compilation, successful targeted Go tests for the new native surfaces, successful targeted regression tests for repaired bridge/fallback routes, a successful full Go test suite run (`go test ./...`), targeted CLI startup tests and type-checking, council/sync coverage, targeted AI/core validation, and repeated successful workspace builds. The new systems are real and integrated, but several of them should still be described as **Beta** or **Experimental**, not full parity.


## Latest stabilization pass — saved-scripts dashboard edit flow (2026-04-05)

### Context
After the previous saved-scripts backend and degraded-compat work, operators could create, update, delete, and execute scripts through the backend surfaces, but the actual Saved Scripts dashboard UI still only exposed create/run/delete.

### What changed
Updated:
- `apps/web/src/app/dashboard/mcp/scripts/page.tsx`

The dashboard now exposes a real edit/update flow:
- each script card now has an edit control
- editing opens the same script form in `edit` mode
- the form now supports both create and update paths
- update is wired to `trpc.savedScripts.update.useMutation()`
- successful updates close the editor and refetch the list

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — saved-scripts execution result visibility (2026-04-05)

### Problem
The Saved Scripts dashboard could execute scripts, but successful runs only emitted a toast and logged the returned payload to the browser console. Operators could not see the truthful execution result, output, or timing in the page itself.

### What changed
Updated:
- `apps/web/src/app/dashboard/mcp/scripts/page.tsx`

The dashboard now surfaces the most recent execution result directly in the UI:
- captures the real `savedScripts.execute` payload
- renders script name, success/failure state, timing, and output/error text
- allows dismissal of the last execution panel
- keeps the existing create/edit/delete flow intact

### Validation
Executed in the primary workspace (the clean push worktree does not have installed `node_modules` for Next.js builds):
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — Resource Library prompt inventory parity (2026-04-05)

### Problem
The Resource Library dashboard showed Saved Scripts and Skills counts, but it still omitted the Prompt Library count/card on the remote baseline even though the app already had a live `trpc.prompts.list` surface and a `/dashboard/prompts` page.

### What changed
Updated:
- `apps/web/src/app/dashboard/library/page.tsx`

The Resource Library now includes:
- a `Prompts & Templates` card
- live prompt count via `trpc.prompts.list.useQuery()`
- updated summary copy so prompts are described as first-class reusable resources

### Validation
This exact shape already built successfully in the primary workspace prior to replay, and the change is a direct forward-port of that working implementation onto current `origin/main`.


## Latest stabilization pass — dashboard prompts route parity (2026-04-05)

### Problem
The Resource Library now exposed a `Prompts & Templates` card pointing at `/dashboard/prompts`, but current `origin/main` only had the standalone prompt page under the non-dashboard app route shape in some histories. That left a real operator-navigation gap on the clean remote baseline.

### What changed
Added:
- `apps/web/src/app/dashboard/prompts/page.tsx`

The new dashboard route is a thin wrapper around the existing `PromptLibrary` UI so the operator-facing library link resolves inside the dashboard shell.

### Validation
This file was forward-ported from the already-working primary workspace shape where the dashboard prompt route existed and built successfully.


## Latest stabilization pass — Library navigation description truthfulness (2026-04-05)

### Problem
The Library dashboard itself now included prompts/templates, but the shared MCP navigation metadata still described Library as covering only scripts, skills, tool sets, memory, plans, and documentation.

### What changed
Updated:
- `apps/web/src/components/mcp/nav-config.ts`

The `Library` nav description now mentions prompts as part of the resource hub, matching the actual dashboard contents.

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — infrastructure health-check result visibility (2026-04-05)

### Problem
The Infrastructure dashboard's `Run Health Check` action returned useful output, but the page only emitted a toast and wrote the payload to `console.log`. Operators could not inspect the result inline in the dashboard.

### What changed
Updated:
- `apps/web/src/app/dashboard/infrastructure/page.tsx`

The page now stores and renders the most recent doctor/health-check result directly in the UI:
- success/failure status
- returned output text
- persistent inline panel instead of console-only output

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — link backlog sync result visibility (2026-04-05)

### Problem
The Link Backlog page's `Sync BobbyBookmarks` action returned useful counts, but the page only emitted a toast. Operators could not inspect the most recent sync result inline.

### What changed
Updated:
- `apps/web/src/app/dashboard/links/page.tsx`

The page now stores and renders the latest BobbyBookmarks sync summary directly in the UI:
- links upserted
- pages scanned
- source base URL used for the sync

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — infrastructure deploy result visibility (2026-04-05)

### Problem
The Infrastructure dashboard's `Deploy Configuration` action returned useful output, but the page only emitted success/failure toasts. Operators could not inspect the latest apply result inline.

### What changed
Updated:
- `apps/web/src/app/dashboard/infrastructure/page.tsx`

The page now stores and renders the most recent infrastructure apply/deploy result directly in the UI:
- success/failure state
- returned output text
- persistent inline panel parallel to the health-check result panel

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — billing connection test result visibility (2026-04-05)

### Problem
The Billing / Provider Matrix page could test provider connections, but the result was only surfaced through toasts. Operators could not inspect the latest connection-test provider, latency, or error inline.

### What changed
Updated:
- `apps/web/src/app/dashboard/billing/page.tsx`

The page now stores and renders the latest provider connection test result directly in the UI:
- provider name
- success/failure state
- latency when available
- error text when present

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — registry action result visibility (2026-04-05)

### Problem
The MCP Registry page's top-level sync and batch-validation actions returned useful aggregate summaries, but the page only surfaced them through transient toasts.

### What changed
Updated:
- `apps/web/src/app/dashboard/registry/page.tsx`

The page now stores and renders the latest registry action summary directly in the UI for:
- registry sync / ingestion
- batch validation

Surfaced details include:
- action title
- success/warning tone
- summary counts
- per-source sync details when available

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — registry detail action result visibility (2026-04-05)

### Problem
The MCP Registry detail page exposed validate/install actions, but their result was only surfaced through transient toasts. Operators could not inspect the latest action result inline once the toast disappeared.

### What changed
Updated:
- `apps/web/src/app/dashboard/registry/[uuid]/page.tsx`

The page now stores and renders the latest detail-page action result directly in the UI for:
- single-server validation
- install from recipe

Surfaced details include:
- action title
- success/warning/error tone
- summary text
- key identifiers such as `server_uuid`, `failure_class`, and installed managed name when available

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — MCP settings sync result visibility (2026-04-05)

### Problem
The MCP Settings page could sync generated client configs into Claude Desktop / Cursor / VS Code, but the result was only shown through a toast.

### What changed
Updated:
- `apps/web/src/app/dashboard/mcp/settings/page.tsx`

The page now stores and renders the latest client-config sync result directly in the UI:
- selected client label
- synced target path
- success summary after the write completes

### Validation
Executed in the primary workspace:
- `pnpm -C apps/web run build`

Result: passed.


## Latest stabilization pass — Go-native persisted memory and agent-memory fallback ownership (2026-04-05)

### Scope
This pass targeted a real remaining Go-primary backend gap instead of another UI-only slice:
- public memory mutation routes still admitted they could not persist facts, observations, user prompts, or session summaries when TypeScript was unavailable
- the direct `/api/agent-memory/*` family still returned "runtime not initialized" or zero-state placeholders in Go fallback mode
- several persisted-memory search routes still returned synthetic empty results even though the local Go runtime already understood the underlying persisted record format

### What changed
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`
- `go/internal/httpapi/agent_memory_local.go` (new)

Added a real persisted local Go runtime for `.hypercode/agent_memory/memories.json` and wired it into both the public memory surface and the direct agent-memory surface when `/trpc` is unavailable.

#### Newly Go-owned fallback writes
Public memory routes now persist locally instead of failing:
- `POST /api/memory/facts/add`
- `POST /api/memory/observations/record`
- `POST /api/memory/user-prompts/capture`
- `POST /api/memory/session-summaries/capture`

Direct agent-memory routes now persist locally instead of reporting an uninitialized runtime:
- `POST /api/agent-memory/add`
- `POST /api/agent-memory/delete`
- `POST /api/agent-memory/clear-session`

#### Newly Go-owned fallback reads/searches
These Go fallback reads now return real persisted data from `.hypercode/agent_memory/memories.json`:
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

### Behavior notes
- upstream TypeScript still wins whenever it is available
- Go fallback persists records into the existing workspace-local agent-memory snapshot file instead of inventing a parallel store
- the local runtime now preserves and reuses the structured metadata shapes already expected by the existing Go read paths for:
  - structured observations
  - structured user prompts
  - structured session summaries
- `agentMemory.export` now returns a real JSON export string from the persisted local snapshot, which is much closer to the TypeScript contract than the old synthetic bucket placeholder
- `agentMemory.stats` now returns truthful compact counts derived from the persisted local snapshot instead of a hardcoded zero-state payload
- `memory.recordObservation` now normalizes unsupported legacy `type: "fact"` inputs into a valid local structured observation type so the persisted fallback remains searchable by the existing Go observation readers

### Validation
Executed in the primary workspace without killing any processes:
- `cd go && gofmt -w internal/httpapi/agent_memory_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'Test(ReadOnlyMemoryRoutesFallBackLocally|MemoryServiceBackedMutationsFallBackLocally|AgentMemoryStatsFallsBackToPersistedState|AgentMemoryExportFallsBackToPersistedSnapshot|AgentMemoryReadRoutesFallBackToPersistedResults|AgentMemoryMutationRoutesFallBackToLocalPersistence)' -count=1`
- `cd go && go test ./internal/httpapi -count=1`

### Why this matters
This is a real Go-primary backend migration slice, not just dashboard polish:
- the Go runtime now owns more of HyperCode's local-first memory behavior during TypeScript outage
- public memory APIs are less placeholder-driven and more durable
- direct agent-memory APIs now expose truthful persisted local state instead of pretending the runtime is absent
- persisted local observations/prompts/session summaries can now participate in more fallback search/read flows instead of only recent-list surfaces

## Latest stabilization pass — startup workspace exclusion for drifted browser-extension path (2026-04-06)

### Operator evidence
A fresh `start.bat` run showed two separate issues:
1. the known non-blocking `apps/maestro` Electron rebuild failure on Node 24/Windows during install
2. a new blocking workspace-build failure later in the startup flow:
   - `Failed to add workspace "hypercode-extension" from "apps\borg-extension\package.json", it already exists at "packages\claude-mem\package.json"`

The second issue was the actual build blocker for this pass.

### Root cause
`pnpm-workspace.yaml` still excluded `apps/hypercode-extension`, but the real drifted directory present in this workspace was `apps/borg-extension`.

That meant the root workspace accidentally re-included the browser-extension mini-workspace during install/build planning, which caused:
- extension `postinstall` execution during root install
- Turbo workspace-name collision during `build:workspace`

### What changed
Updated:
- `pnpm-workspace.yaml`

Added the missing exclusion:
- `!apps/borg-extension`

### Validation
Executed in the primary workspace:
- `pnpm exec turbo run build --filter=!@repo/* --dry`

Result:
- passed
- `apps/borg-extension` no longer appears as a root workspace package in the Turbo planning graph
- the prior duplicate-workspace failure from `start.bat` no longer reproduces in the validated planning step

### Important boundary
This does **not** resolve the separate known `apps/maestro` postinstall/electron-rebuild failure on Node 24/Windows.
It only removes the browser-extension workspace collision that was blocking the later workspace build stage.

## Latest stabilization pass — claude-mem workspace-name-aware build exclusion (2026-04-06)

### Problem
`scripts/build_all.mjs` already had a safety path intended to exclude `packages/claude-mem` from the Turbo workspace build if unresolved merge markers were detected.

However, the exclusion used the logical label:
- `--filter=!claude-mem`

In reality, the workspace package name at `packages/claude-mem/package.json` is:
- `hypercode-extension`

That meant the safety path could silently miss the actual workspace package and fail to exclude the intended project.

### What changed
Updated:
- `scripts/build_all.mjs`

Added package-name-aware exclusion logic:
- reads the actual workspace package name from `packages/claude-mem/package.json`
- excludes both the logical label `claude-mem` and the real workspace package name when merge markers are detected
- keeps the existing `HYPERCODE_REQUIRE_CLAUDE_MEM_BUILD=true` override behavior intact

### Why this matters
This is a startup/build truthfulness fix, not cosmetic cleanup:
- the fallback path now targets the real Turbo workspace identity instead of an assumed one
- root workspace builds are less likely to fail in confusing ways when `packages/claude-mem` is in a temporary broken/merge-conflicted state
- the operator-facing logging now reflects the actual exclusion targets more honestly

### Validation
Executed in the primary workspace:
- `node -e "const fs=require('fs');console.log(JSON.parse(fs.readFileSync('packages/claude-mem/package.json','utf8')).name)"`
- `pnpm exec turbo run build --filter=!@repo/* --filter=!hypercode-extension --dry`

Observed result:
- `packages/claude-mem` reports the real workspace package name `hypercode-extension`
- Turbo dry planning succeeds with that real exclusion target applied

### Boundary
This pass tightens the claude-mem exclusion escape hatch in `build_all.mjs`.
It does not rename the upstream claude-mem package or alter its external publish identity.

## Latest stabilization pass — Go-native advanced memory relations and handoff/pickup fallback ownership (2026-04-06)

### Scope
This pass continued the same Go-primary memory migration instead of jumping to an unrelated subsystem.

The previous memory tranche already gave Go truthful local ownership for:
- fact capture
- structured observation capture
- user prompt capture
- session summary capture
- direct `/api/agent-memory/*` add/delete/clear/search/recent/filter/export/stats routes

The remaining high-value gaps in the same subsystem were:
- `memory.searchMemoryPivot`
- `memory.getMemoryTimelineWindow`
- `memory.getCrossSessionMemoryLinks`
- `agentMemory.handoff`
- `agentMemory.pickup`

### What changed
Updated:
- `go/internal/httpapi/server.go`
- `go/internal/httpapi/server_test.go`
- `go/internal/httpapi/agent_memory_relations_local.go` (new)

#### Newly Go-owned advanced memory reads
Go fallback now owns persisted local behavior for:
- `POST /api/memory/pivot/search`
- `POST /api/memory/timeline/window`
- `POST /api/memory/cross-session-links`

Behavior:
- upstream TypeScript still wins when available
- pivot search now supports the current body payloads already seen in the HTTP layer, including the older anchor-style `pivotMemoryId` input
- timeline-window fallback can infer `sessionId` + anchor timestamp from `centerMemoryId`
- cross-session link fallback now returns real scored links with `memory`, `score`, and `reasons` instead of a flat unavailable placeholder

#### Newly Go-owned direct agent-memory portability routes
Go fallback now owns persisted local behavior for:
- `POST /api/agent-memory/handoff`
- `POST /api/agent-memory/pickup`

Behavior:
- `handoff` now generates a real portable JSON artifact from local persisted agent-memory state
- the artifact includes version, timestamp, stats, recent session-tier context, and notes
- `pickup` now restores session-tier memories from that artifact into the local persisted Go store
- this matches the practical TS contract much more closely than the previous bridge-only behavior

### Implementation notes
The new helper file ports the same core ideas the TypeScript memory layer uses:
- pivot matching across session/tool/concept/file/goal/objective signals
- session-window reconstruction by session id and nearest anchor timestamp
- scored cross-session link analysis using shared concepts, shared files, shared tool identity, source affinity, and goal/objective-theme overlap
- portable handoff artifact generation using recent session memories plus aggregate stats
- pickup restore that rehydrates session-tier memories from the artifact payload

Important boundary:
- this is still not full vector-backed or graph-backed parity
- the fallback remains local-file-backed and honest about that scope
- the generic `memory.query` / broader graph-style semantics are still not fully Go-native

### Validation
Executed in the primary workspace without killing any processes:
- `cd go && gofmt -w internal/httpapi/agent_memory_local.go internal/httpapi/agent_memory_relations_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd go && go test ./internal/httpapi -run 'Test(MemoryServiceBackedMutationsFallBackLocally|MemoryRelationshipRoutesFallBackToPersistedData|AgentMemoryHandoffAndPickupFallBackToLocalPersistence|AgentMemoryMutationRoutesFallBackToLocalPersistence|ReadOnlyMemoryRoutesFallBackLocally)' -count=1`
- `cd go && go test ./internal/httpapi -count=1`

Executed again in the clean push worktree:
- `cd ../hypercode-push/go && gofmt -w internal/httpapi/agent_memory_local.go internal/httpapi/agent_memory_relations_local.go internal/httpapi/server.go internal/httpapi/server_test.go`
- `cd ../hypercode-push/go && go test ./internal/httpapi -count=1`

### Why this matters
This keeps the migration coherent and materially improves Go-primary truthfulness in a subsystem that already had good local state foundations:
- memory routes no longer stop at recent-list and basic search parity
- relationship-style memory reads now survive TypeScript outage with truthful local results
- session handoff/pickup no longer collapses to bridge-only behavior when the Go runtime is the surviving control plane
- the agent-memory lane is becoming a genuinely useful Go-owned local-first subsystem instead of a collection of placeholders
