# Go-Primary Migration Plan

## Objective
Make the Go runtime the **primary HyperCode control plane** and port **every backend feature/function** from the current TypeScript runtime into Go, leaving only the most crucial TypeScript pieces in place temporarily:
- UI clients
- compatibility bridges
- any TS-only surface that has not yet reached validated Go parity

This plan is intentionally **truthful**:
- Go is already viable for meaningful fallback and several native subsystems.
- Go is **not yet** at 100% parity.
- The target state is a **Go-authoritative backend**, with TypeScript reduced to compatibility and UI roles until fully retired where practical.

---

## Authoritative target state

### Go owns by default
The Go runtime should become authoritative for:
- startup / lifecycle / lock / control-plane port ownership
- MCP inventory, routing, runtime server mediation, and write/config flows
- provider routing and quota-aware model execution
- session import/export, persistence, deduplication, and memory extraction
- SQLite-backed persistence and maintenance flows
- background workers / ingestion daemons
- workflows, supervision, orchestration, and councils
- submodule sync / repo orchestration / automation endpoints
- SSE/event streaming used by extensions and native clients

### TypeScript remains temporarily for
- web dashboard UI
- desktop/electron UI
- any still-unported compatibility router or UI helper surface
- any specialist integration that is not yet ported and validated in Go

### End-state rule
No backend surface should remain TypeScript-owned once the Go equivalent is:
1. implemented
2. validated
3. wired into startup
4. truthful in operator-facing status/docs

---

## Current parity classification model
Each major surface should be tracked as one of:
- **Native Go** — implemented and authoritative in Go
- **Bridge-first** — Go route exists but still defers to TS first
- **Bridge-only** — Go is only a transport shim to TS
- **Missing** — no real Go surface yet
- **Retirable TS** — TS implementation can be demoted or removed once callers are switched

---

## Migration rules

### 1. No false parity claims
Do not mark a surface complete until:
- the Go implementation exists
- tests exist where practical
- the startup path can prefer Go for that surface
- docs/status reflect reality

### 2. Port stateful/fragile surfaces first
Prioritize anything currently blocked by:
- `better-sqlite3`
- Node-native addon fragility
- hosted quota failures in TS-only service paths
- startup-time background jobs that can abort or degrade operator confidence

### 3. Go-first startup wins over passive sidecar framing
The launcher should evolve from:
- `TS primary + Go fallback`

to:
- `Go primary + TS compatibility sidecar/supplement`

### 4. TypeScript must shrink, not grow
New backend logic should default to Go unless a TS implementation is strictly required to unblock UI/client behavior.

---

## Priority workstreams

## Workstream A — Startup and control-plane ownership
### Goal
Make Go the default runtime started by operator entrypoints.

### Tasks
- Add explicit runtime selection in CLI/startup (`go`, `node`, `auto`)
- Flip startup defaults to **prefer Go**
- Make lock files and port ownership Go-authoritative
- Run TS compatibility services only when required
- Keep occupied-port behavior non-destructive and truthful

### Exit criteria
- `start.bat` and `hypercode start` prefer Go by default
- default startup validation is Go-primary rather than full-TS-workspace-first
- Go owns the primary control-plane port
- TS startup becomes optional/compatibility-oriented

### Progress note
- `start.bat` now defaults to a Go-primary startup build profile for `auto`/`go` runtime modes: it validates the Go control plane and CLI without requiring a full workspace build first
- `start.bat` now also probes whether Go-primary startup dependencies are already present and can skip `pnpm install` when the current workspace is already ready
- `start.bat` now also probes whether the Go-primary startup build artifacts are already current and can skip the startup build step for repeat launches
- `start.bat` now prints explicit install/build phase summaries so operators can see whether each phase ran or was skipped and why
- `start.bat` now exports those install/build decisions to the CLI runtime so startup provenance can be persisted and queried later
- `start.bat` now launches through the built CLI entrypoint directly instead of relying on `pnpm start` for the final handoff path
- the CLI Go runtime launcher now prefers the prebuilt `go/hypercode(.exe)` binary and only falls back to `go run ./cmd/hypercode` when the binary is absent or source launch is explicitly forced
- startup output now reports whether Go is running via the prebuilt binary, via source fallback, or whether Node compatibility runtime is active due to explicit selection or Go fallback
- the CLI now also prints a concise startup mode summary block describing which surfaces are actually active/compatibility-only in the chosen runtime
- `hypercode status` now exposes persisted startup provenance from the local startup lock when available
- the TypeScript `startupStatus` API surface now also exposes that persisted startup provenance, making the same truth available to dashboard and API consumers
- the dashboard startup-readiness UI now renders a visible `Startup mode` section backed by that persisted/API-visible provenance
- the dashboard Health, Integrations, System, MCP System, and Orchestrator pages now also surface startup/runtime provenance so operators can see launch truth across the major runtime views
- the web local-compat startup fallback now also carries `startupMode` from the local lock, reducing dependence on a live TS startup snapshot for this runtime truth
- the web tRPC compat layer now prefers Go-native `/api/startup/status` and `/api/runtime/status` when the TypeScript `startupStatus` procedure is unavailable, so dashboard startup truth degrades to native Go state instead of only local lock/config guesses
- the web tRPC compat layer now also prefers Go-native `/api/mcp/status` when the TypeScript `mcp.getStatus` procedure is unavailable, improving dashboard MCP/system/router truth across both legacy MCP bridge batches and richer local dashboard fallback mode
- the Go-native `/api/runtime/status` surface now also exposes startup provenance, making the native backend self-describing rather than depending on the TS compatibility surface for that truth
- this dashboard propagation cluster is now complete; the next focus is reducing remaining TS compatibility dependence by switching more runtime-heavy dashboard/system reads onto Go-native truth where equivalent native surfaces already exist
- explicit Node compatibility mode still uses the full workspace build path and still defaults to a full install/build posture
- full builds remain available via `HYPERCODE_FULL_BUILD=1`

---

## Workstream B — SQLite/stateful service migration
### Goal
Remove backend dependency on TS `better-sqlite3` for critical runtime behavior.

### Highest-priority surfaces
- Link crawler / HyperIngest backlog processing
- imported session persistence and maintenance
- transcript deduplication and retention maintenance
- debate history persistence
- any startup-time service that still touches TS SQLite directly

### Exit criteria
- startup no longer depends on TS SQLite bindings for core control-plane behavior
- Go `modernc.org/sqlite` path is authoritative for stateful backend services

---

## Workstream C — MCP full parity in Go
### Goal
Make Go the authoritative MCP backend.

### Remaining parity targets
- configured server CRUD
- runtime mutation flows
- metadata refresh / cache persistence
- telemetry / call history / health persistence
- config import/export and client sync surfaces
- tool preference / working-set mutation surfaces

### Exit criteria
- all MCP read/write surfaces are available natively in Go
- TS MCP routers become optional compatibility layers only

---

## Workstream D — Providers, quotas, and model execution
### Goal
Make Go authoritative for provider execution and routing.

### Tasks
- complete quota/routing parity in Go
- ensure OpenRouter free defaults are mirrored in Go-first execution paths
- move background/service LLM work behind Go routing
- remove TS-only paid-default fallback behavior

### Exit criteria
- provider routing decisions originate in Go
- TS provider execution is no longer authoritative

---

## Workstream E — Sessions, supervision, council, workflows
### Goal
Port orchestration-heavy backend features fully to Go.

### Targets
- session lifecycle parity
- supervisor/task lifecycle parity
- council debate history + orchestration parity
- workflow definition/execution/history parity
- session export/import parity

### Exit criteria
- Go owns orchestration and persistence
- TS becomes UI/client presentation only for these surfaces

---

## Workstream F — Dashboard/client transition
### Goal
Keep UI usable while backend ownership shifts to Go.

### Tasks
- identify which dashboard routes still require TS tRPC contracts
- replace those dependencies with Go HTTP/API contracts
- keep TS UI packages where necessary, but point them at Go-owned APIs

### Exit criteria
- the web dashboard can operate primarily against Go APIs
- TS backend routers are no longer required for normal operator workflows

---

## Concrete near-term execution order
1. Build and maintain a truthful TS→Go parity matrix for all major surfaces
2. Make launcher/runtime selection Go-first
3. Port remaining TS SQLite-backed startup services to Go
4. Finish MCP write/config parity in Go
5. Finish session/supervisor/orchestration parity in Go
6. Move dashboard/backend dependencies from TS routers to Go APIs
7. Retire or demote TS backend ownership surface-by-surface

---

## Immediate next implementation slice
The next coding slice after this plan should be:
1. add a parity matrix doc for backend surfaces
2. add Go-primary launcher/runtime selection
3. continue eliminating TS SQLite ownership from startup-time services

---

## Success definition
The migration is successful when:
- the default HyperCode startup path runs Go first
- all major backend surfaces are native in Go
- TypeScript is reduced to crucial UI/compatibility roles only
- removing TS backend ownership does not reduce operator-visible functionality
- docs and status surfaces truthfully describe Go as the primary runtime
