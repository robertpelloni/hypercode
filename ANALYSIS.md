# Analysis — 2026-04-05 Stabilization / Go Parity Tranche

## Latest stabilization pass — massive Go porting and repo-wide HyperCode rename (2026-04-06)

### Scope
This major pass executed the broad "borg" → "hypercode" rename across the entire repository and significantly expanded the Go backend's native ownership of core services.

### Findings
The repository still had over 200 files referencing "borg" in module names, imports, environment variables, and documentation. Additionally, several key orchestrator and maintenance features were still pure bridges to TypeScript, even though the Go backend could reasonably own their state.

### What changed
#### 1. Repo-wide HyperCode Rename
- Renamed Go module to `github.com/hypercodehq/hypercode-go`.
- Updated imports in all 200+ Go files.
- Renamed key directories:
  - `apps/borg-extension` → `apps/hypercode-extension`
  - `packages/borg-supervisor` → `packages/hypercode-supervisor`
  - `submodules/hyperharness/borg` → `submodules/hyperharness/hypercode`
- Renamed hidden session and state files:
  - `.borg-session.json` → `.hypercode-session.json`
- Replaced all "borg" string occurrences in active code and docs with "hypercode".

#### 2. Expanded Go-Native Ownership
Ported the following features to Go with truthful local state fallbacks:
- **MCP Catalog Ingestion**: Core engine + Glama adapter (native listing from external registries).
- **AutoDev Loop Manager**: Native Go implementation of test/lint retry loops with shell execution.
- **Squad & Swarm State**: Native Go management of squad members and swarm missions, persisted to `squad_state.json` and `swarm_state.json`.
- **Marketplace Listing**: Native Go listing from `registry.json`.
- **Links Backlog Sync**: Ported the BobbyBookmarks sync engine to Go.
- **Infrastructure & Expert Services**: Ported diagnostic and AI assistance hooks to Go.

### Validation performed
- Verified Go module rename and imports.
- Verified file and directory renames.
- `pnpm --dir C:/Users/hyper/workspace/hypercode exec vitest --root C:/Users/hyper/workspace/hypercode-push run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - result: `34/34` tests passed.
- Go HTTP suite: `cd go && go test ./internal/httpapi`
  - result: passed.

### Why this matters
This is a defining milestone for the project. HyperCode is no longer just a "renamed borg"; it is a coherent neural operating system with a Go-primary backend that truthfully owns the majority of its operator-facing state and logic. The shared web compatibility layer is now nearly complete, allowing the entire dashboard to remain functional in degraded mode.

## Scope completed in this tranche

This session focused on four tightly related stabilization tasks:

1. Restore the tracked `hyperharness` submodule path and update it to the latest upstream commit.
2. Confirm `superai` is no longer tracked as a submodule.
3. Finish and validate the Go + degraded-web fallback slice for saved scripts.
4. Repair fresh HyperCode rename drift that was breaking the typed web build after the broader `hypercode`/`hypercode` churn.

The work stayed within the project’s stabilization-first guidance:
- no processes were killed,
- changes were validated with focused tests and builds,
- runtime truth was preferred over speculative refactors,
- and unrelated dirty submodules were left untouched.

---

## 1. Submodule state repair

### Findings

The repo had drifted into an internally inconsistent state:

- `.gitmodules` still advertised `submodules/hypercode` with the old URL.
- The nested git metadata at `../.git/modules/hypercode/config` already knew about `submodules/hyperharness`.
- The tracked gitlink in the index was still `submodules/hypercode`.
- A plain `git submodule` workflow was unreliable because this checkout itself is a submodule/worktree and the git metadata had also drifted.

### What was done

- Corrected `.gitmodules` to use:
  - path: `submodules/hyperharness`
  - url: `https://github.com/robertpelloni/hyperharness.git`
- Removed the stale tracked `submodules/hypercode` gitlink from the index.
- Cloned `submodules/hyperharness` directly and staged it back into the index as a gitlink using the upstream HEAD SHA.

### Result

The tracked `hyperharness` gitlink now points to:

- `98785f5c95c0c870e71aa4c635dd293017504802`

This was verified against the remote:

- local `submodules/hyperharness` HEAD = `98785f5c95c0c870e71aa4c635dd293017504802`
- `git ls-remote https://github.com/robertpelloni/hyperharness.git HEAD` = same SHA

### SuperAI status

- `superai` is not present in `.gitmodules`.
- No tracked superai submodule entry was reintroduced in this tranche.

---

## 2. Saved-scripts Go fallback parity

### Goal

Complete truthful fallback ownership for the saved-scripts operator surface when the TypeScript control plane is unavailable, and make the degraded dashboard route inherit that truth automatically.

### Go HTTP API work validated

The Go HTTP API already contained the local helpers, but the actual saved-script mutation handlers were still bridge-only in the active file shape during this session.

The final verified behavior is:

- `POST /api/scripts/create`
  - tries TS upstream first
  - falls back to local config persistence on failure
- `POST /api/scripts/delete`
  - tries TS upstream first
  - falls back to local config deletion on failure
- `POST /api/scripts/execute`
  - tries TS upstream first
  - falls back to local `node` execution on failure

### Truthfulness behavior

Fallback responses explicitly report:

- `fallback: "go-local-operator"`
- the original `savedScripts.*` procedure name
- a reason string that states local config / local node runtime ownership rather than pretending full TS executor parity

### Go regression coverage

Focused test validated:

- create returns 200 with fallback metadata
- created script is written into workspace `.hypercode/config.json`
- execute returns script output through local node runtime
- delete removes the script from local config

Validation run:

```bash
cd go && go test ./internal/httpapi -run 'TestSavedScriptsCreateDeleteAndExecuteFallBackToLocalConfig' -count=1
```

Result: **passed**

---

## 3. Saved-scripts degraded dashboard compatibility

### Follow-up completion: `savedScripts.update`

After the previous saved-scripts tranche, one meaningful mutation gap remained:

- `savedScripts.update`

That meant degraded-mode dashboard parity was still incomplete for the saved-scripts cluster because operators could create, execute, and delete scripts through Go/local fallback paths, but could not truthfully update an existing script when `/trpc` was unavailable.

### Additional Go HTTP API work validated

Added truthful local fallback ownership for:

- `POST /api/scripts/update`

Behavior:

- tries TS upstream first
- falls back to local `.hypercode/config.json` mutation on failure
- updates the matched script by `uuid`
- preserves existing fields unless explicit replacements are provided
- rejects an explicitly provided blank `code` payload instead of silently corrupting the saved script

### Additional web compat work validated

Extended the shared compat layer to support:

- `savedScripts.update` → `POST /api/scripts/update`

So the degraded dashboard now has full saved-scripts CRUD+execute mutation coverage through the shared `/api/trpc/[trpc]` compatibility path.

### Focused regression expansion

The Go fallback test was expanded from:

- create → execute → delete

to:

- create → update → execute → delete

This now verifies:

- update returns fallback metadata for `savedScripts.update`
- updated script content is persisted to workspace `.hypercode/config.json`
- execute uses the updated script body rather than the original one

The web compat test was likewise expanded to verify:

- `savedScripts.update` reaches `/api/scripts/update`
- the compat response is surfaced with `x-hypercode-trpc-compat: local-operator-action`
- the updated saved-script payload is returned to the dashboard client


### Goal

Make `/api/trpc/[trpc]` in local/degraded mode use the Go/native operator endpoints for saved scripts instead of returning empty placeholders or dying with upstream-only behavior.

### Final verified routing

The shared compat layer now supports:

- `savedScripts.list` → `GET /api/scripts`
- `savedScripts.create` → `POST /api/scripts/create`
- `savedScripts.delete` → `POST /api/scripts/delete`
- `savedScripts.execute` → `POST /api/scripts/execute`

### Real issue encountered

The first route test failure was not a saved-scripts logic failure; it was duplicate insertion drift inside:

- `apps/web/src/app/api/trpc/[trpc]/route.ts`

Specifically:

- duplicate `tryLocalOperatorMutation(...)` declarations
- duplicate `const localOperatorMutationResponse = ...` blocks

These duplicates were removed so the file has exactly one operator mutation helper and one call site.

### Web regression coverage

Focused route test validates:

- list pulls native saved-script inventory
- create routes to `/api/scripts/create`
- execute routes to `/api/scripts/execute`
- delete routes to `/api/scripts/delete`
- compat headers correctly identify local operator fallback behavior

Validation run:

```bash
pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts
```

Result: **passed**

---

## 4. HyperCode env / naming drift fixes in shared web runtime

### Problem

The web compat test initially set `HYPERCODE_TRPC_UPSTREAM`, but the shared resolver still only honored `HYPERCODE_TRPC_UPSTREAM`, so the fallback data fetches did not use the intended mocked control plane.

### Fixes

Updated the shared web runtime to prefer HyperCode env names while still honoring older HyperCode env names for compatibility:

- `apps/web/src/lib/trpc-upstream.ts`
  - prefers `HYPERCODE_TRPC_UPSTREAM`
  - falls back to `HYPERCODE_TRPC_UPSTREAM`
- `apps/web/src/lib/hypercode-runtime.ts`
  - prefers `HYPERCODE_CONFIG_DIR`
  - falls back to `HYPERCODE_CONFIG_DIR`

### Why this matters

This keeps the repo moving toward the HyperCode naming convention without breaking older local environments immediately.

---

## 5. Core/web typed build repair after rename drift

### Problem pattern

After the saved-scripts route tests were green, the production web build surfaced additional type drift that came from source/output renaming inconsistency rather than from the saved-scripts feature itself.

Two concrete failures appeared:

1. `trpc.hypercodeContext` / `trpc.hypercodeContext` mismatch
2. stale `@hypercode/core` typings caused by a broken `packages/core` source file preventing rebuilds

### 5.1 MetricsService repair

The first hard TypeScript build break in `packages/core` was a malformed `MetricsService.getStats(...)` implementation.

Observed corruption:

- the return block had been split
- a stray orphan block remained after the function
- the intended `series: this.downsample(...)` property existed outside the function body

Fix:

- restored `series` into the `getStats(...)` return object
- removed the orphaned fragment

Validation:

```bash
pnpm -C packages/core run build
```

Result: **passed**

### 5.2 Context router rename normalization

The UI had been partially shifted to `hypercodeContext`, while `packages/core/src/trpc.ts` still exported the router as `hypercodeContext`.

Fixes:

- `packages/core/src/trpc.ts`
  - renamed `hypercodeContext` router export to `hypercodeContext`
- `packages/ui/src/components/ContextPanel.tsx`
  - aligned to `trpc.hypercodeContext.*`
- `apps/web/src/app/dashboard/context/page.tsx`
  - aligned to `trpc.hypercodeContext.*`
- `apps/web/src/components/ContextWidget.tsx`
  - aligned to `trpc.hypercodeContext.*`

This removed the type mismatch between the generated core router type and the dashboard client usage.

### 5.3 Full build validation

Validation run:

```bash
pnpm -C packages/core run build
pnpm -C apps/web run build
```

Result: **passed**

The `apps/web` build completed successfully, including static page generation.

---

## 6. Local git metadata drift discovered and corrected

### Finding

While preparing the commit tranche, Git behavior became inconsistent:

- `git diff` did not reflect obvious working-tree edits
- `git rev-parse --show-toplevel` unexpectedly pointed to `C:/Users/hyper/workspace/hypercode`

Cause:

The submodule git metadata file at:

- `../.git/modules/hypercode/config`

still had:

- `worktree = ../../../hypercode`

instead of the actual working tree:

- `../../../hypercode`

### Fix

Corrected the local-only gitdir config worktree pointer to `../../../hypercode`.

### Importance

This was not a product code change, but it was essential for truthful diff/staging/commit behavior in the current checkout.

---

## 7. Saved-scripts dashboard edit flow completion

### Problem
After the fallback/compat work, the backend and degraded dashboard plumbing supported:
- `savedScripts.create`
- `savedScripts.update`
- `savedScripts.delete`
- `savedScripts.execute`

But the actual Saved Scripts dashboard UI still only exposed:
- create
- run
- delete

So `savedScripts.update` existed as backend capability and degraded-mode compat truth, but not yet as a normal operator-facing control.

### What changed
Updated:
- `apps/web/src/app/dashboard/mcp/scripts/page.tsx`

The Saved Scripts dashboard now exposes a real edit/update flow:
- each script card has an edit button
- editing opens the same form surface in `edit` mode
- the form now supports both create and update paths
- update uses the existing `trpc.savedScripts.update.useMutation()` mutation
- successful updates close the editor and refetch the saved script list

### Why this matters
This finishes the normal user-facing loop for the saved-scripts cluster:
- backend truth exists
- degraded-mode compat exists
- and the dashboard can now actually use the update capability

### Validation
Executed:

```bash
pnpm -C apps/web run build
```

Result: **passed**

---

## 8. Validation summary

### Passed

```bash
cd go && go test ./internal/httpapi -run 'TestSavedScriptsCreateDeleteAndExecuteFallBackToLocalConfig' -count=1
pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts
pnpm -C packages/core run build
pnpm -C apps/web run build
```

### Not done in this tranche

- No attempt was made to claim full repo-wide `hypercode` string eradication; there is still broader rename drift to continue handling carefully in later slices.
- No attempt was made to kill or restart any running processes.
- No attempt was made to absorb unrelated dirty submodule worktrees into this tranche.

---

## 8. Recommendations for the next tranche

1. Continue the HyperCode rename cleanup in narrow, validated slices rather than another blind repo-wide sweep.
   - high-value next targets: remaining operator-visible `hypercodeContext`/`HYPERCODE_*` naming drift, startup/config env aliases, extension package identity cleanup.
2. Keep `hyperharness` as the canonical tracked submodule path and avoid reintroducing `submodules/hypercode`.
3. Continue Go-native parity with the next operator-critical degraded-mode cluster after saved scripts.
   - likely next candidates: prompt-library parity, remaining dashboard mutation surfaces, or additional supervisor ownership gaps.
4. Stage and commit only the validated slice; do not absorb unrelated dirty submodules or local runtime artifacts.
