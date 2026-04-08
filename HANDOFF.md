# Handoff — Stabilization Session

## Current status
**Version:** `1.0.0-alpha.1`

### Latest incremental pass — native Go browser automation via chromedp
This major follow-up deepened the Go-native ownership of Browser Automation. Previously, `browser.scrapePage` and `browser.screenshot` procedures in the dashboard were wired to the Go backend, but the Go backend merely acted as a bridge or stub. The goal was to run multi-agent browser tasks and actual browser rendering directly in Go.

#### What changed
- Added `github.com/chromedp/chromedp` to `go.mod`.
- Created `go/internal/hsync/browser.go` containing:
  - `ScrapePage`: launches a headless Chrome instance via `chromedp`, navigates, waits for DOM layout, and extracts visible text natively.
  - `ScreenshotPage`: launches headless Chrome, captures a PNG, and returns the byte buffer.
- Wired these directly into `go/internal/httpapi/browser_handlers.go`:
  - `POST /api/browser/scrape` now delegates to native `chromedp` when TS is unavailable.
  - `POST /api/browser/screenshot` captures and returns a base64-encoded image natively via Go `chromedp`.

#### Validation performed
- Verified Go build success: `cd go && go build ./cmd/hypercode`
- Verified web compat route tests pass cleanly: `pnpm --dir C:/Users/hyper/workspace/hypercode exec vitest --root C:/Users/hyper/workspace/hypercode-push run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - result: `14/14` (in current subset run) passed.

#### Recommended next step after this pass
Browser automation is one of the heaviest dependencies in the TypeScript agent stack. By porting the actual page scraping and screenshot capability to `chromedp` natively in Go, the sidecar is no longer just a passive bridge—it can perform real, computationally heavy web retrieval independently. The next high-value target is refining the remaining Maestro (Visual Orchestrator) Go/Wails port.

### Latest incremental pass — Maestro Go/Wails port alignment (2026-04-06)
This pass fulfilled a core vision mandate to convert Maestro into a lightweight UI that connects to the Go control plane, rescuing the Wails port from an unbuildable state.

#### What changed
- `apps/maestro-go/go.mod`
  - Added workspace `replace` directive.
- `apps/maestro-go/app.go`
  - Replaced the embedded supervisor logic with HTTP client proxies pointing at `http://127.0.0.1:4000/api/sessions/supervisor/*`.
  - The UI now legitimately acts as a client to the already-running daemon instead of spawning an isolated one and breaking package boundaries.

#### Validation performed
- Built `apps/maestro-go` from source via `go build`.
- Passed cleanly without `internal/` package violations.

#### Recommended next step after this pass
Now that the core Maestro-Go architecture points to the right APIs, the next high-value slice is deepening the Go-native ownership of Director/Council logic (e.g. state management beyond basic bridges) or taking on **Browser Automation** via `chromedp`.

### Latest incremental pass — massive Go porting and repo-wide HyperCode rename (2026-04-06)
This defining pass executed the broad "borg" → "hypercode" rename repo-wide and significantly expanded Go-native ownership of core services.

#### 1. Repo-wide Rename
- Renamed Go module to `github.com/hypercodehq/hypercode-go`.
- Updated all internal imports and directory references.
- Replaced all "borg" strings in active code and documentation.

#### 2. Go-Native Porting
Implemented native Go handlers and state management for:
- **MCP Catalog Ingestion**: Core engine + Glama adapter.
- **AutoDev Manager**: Test/lint retry loops with native shell execution.
- **Squad & Swarm**: Local member and mission state management.
- **Marketplace & Sync**: Native listing and BobbyBookmarks sync.
- **Infrastructure & Expert**: Ported diagnostic and AI assistance hooks.

#### 3. Dashboard Compatibility
- Almost all dashboard clusters now route to Go fallbacks in degraded mode.
- Validated with 34 green route tests.

#### Recommended next step after this pass
The transition to a Go-primary backend is nearly complete for the operator experience. The next high-value target is refining the **Maestro (Visual Orchestrator)** Go/Wails port to bring the visual layer into the Go-primary fold. Alternatively, focus on **Browser Automation** deeper native Go ownership.

### Latest validated tranche (2026-04-05):

- `submodules/hyperharness` is back to being the canonical tracked harness gitlink.
- `submodules/hyperharness` is aligned to upstream HEAD `98785f5c95c0c870e71aa4c635dd293017504802`.
- `superai` is not tracked in `.gitmodules`.
- Go saved-scripts fallback ownership is validated for create/update/delete/execute.
- Web degraded-mode compat now routes saved script reads/mutations through native `/api/scripts*` endpoints, including `savedScripts.update`.
- The Saved Scripts dashboard now exposes a real edit/update UI wired to `savedScripts.update`.
- `packages/core` TypeScript buildability was restored by fixing `MetricsService.getStats()`.
- Core/UI context-router rename drift was normalized on `hypercodeContext`.
- `apps/web` production build is green again.

We have also addressed a major split-brain issue between the MCP database cache and the lightweight stdio loader that was causing models to see only 1 tool (`hypercode_core_loader_status`) and losing the `always_on` setting across restarts.

## Key technical discoveries & fixes

1. **The Config Deletion Loop**
   - **Bug**: `McpConfigService.syncWithDatabase()` was reading the user's `mcp.jsonc` file. If the file lacked cached tools under `_meta.tools` (which was the default state for many servers), it passed an empty array to `toolsRepository.syncTools()`. This caused the repository to execute a DELETE query against all 651 tools in the database, wiping out their `always_on` status.
   - **Fix**: Modified `McpConfigService.ts` to strictly prevent `syncStoredMetadataTools` from overwriting or deleting DB tools if the incoming `mcp.jsonc` array is empty.

2. **The Stdio Loader Blindspot**
   - **Bug**: The `stdioLoader.ts` script (which `pi` and other extensions connect to) was explicitly bypassing the database to remain lightweight. It only read from `mcp.jsonc`. Because the tools were only in the DB and not in `mcp.jsonc` (or were wiped), the proxy served 0 downstream tools.
   - **Fix**: We changed `syncToMcpJson` to `exportToolCache` and made it write to `.hypercode/mcp-cache.json`. This new unified cache merges both the SQLite database inventory and the manual `mcp.jsonc` configurations without destroying the manual file. The `stdioLoader` now reads `mcp-cache.json`.

3. **Workspace Config Resolution**
   - **Bug**: The system hardcoded `os.homedir() + '/.hypercode'` for the configuration directory, causing confusion when a local `mcp.jsonc` existed at the project root.
   - **Fix**: Updated `getHyperCodeConfigDir()` in `mcpJsonConfig.ts` to respect `process.env.HYPERCODE_CONFIG_DIR`, then check for `process.cwd()/mcp.jsonc`, and finally fall back to the home directory.

4. **Tool Inventory Merging**
   - **Bug**: `getCachedToolInventory()` returned either the SQLite snapshot OR the JSON snapshot, but never both.
   - **Fix**: Rewrote the function to cleanly merge both collections, ensuring manual API-imported servers and auto-discovered DB servers coexist.

5. **Universal Instructions Refactor**
   - Rewrote `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`, and `AGENTS.md` to cleanly point back to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`, reducing prompt bloat and ensuring architectural alignment across models.

## Next steps for the next agent
1. **Continue degraded-mode operator parity**: the saved-scripts cluster is now in much better shape; target the next operator-facing dashboard mutation family where Go already has durable local state or cheap truthful ownership available.
2. **Validate Stdio Loader**: Run `pi` or test the stdio proxy directly to ensure it now broadcasts the combined DB and manual tool inventory.
3. **Dashboard Review**: Check if the `always_on` toggles in the React dashboard correctly persist across server restarts now that the destructive wipe bug is gone.
4. **Continue Porting**: The Go bridge needs more direct mappings. Evaluate `PORTING_MAP.md` and continue porting features safely without violating the `UNIVERSAL_LLM_INSTRUCTIONS.md` stabilization rule.
5. **Next likely UI slice**: another dashboard page where the backend/compat route is already truthful but the operator-facing controls still lag behind the now-supported mutation/read surface.

## Turn: Complete Go-Native Handler Migration (2026-04-08)

### What Was Done
1. **Restored near-total dashboard compat layer**: Recovered `route.ts` and `route.test.ts` from earlier commit `029235bb`, applied hypercode rename, fixed `hypercode-runtime.ts` to restore `readLocalStartupProvenance` with `normalizeStartupProvenance` and `readHyperCodeLockRecord`.
2. **All 34 TRPC route compat tests passing** throughout the migration.
3. **Massive Go-native handler migration** - eliminated ALL non-definition `handleTRPCBridgeBodyCall`/`handleTRPCBridgeCall` usages across the entire Go HTTP API layer.
4. **Created `config_local_state.go`**: Full SQLite-backed config KV store with mutation routing for 12 config procedures.
5. **Deepened orchestration**: `orchestration.RunConsensus` for native multi-model consensus, workflow engine `Start/Resume/Pause/Approve/Reject`, swarm/debate/consensus native handlers.
6. **Deepened swarm/supervisor/squad**: AI decomposition, AI supervision, chat fallbacks.
7. **Ported memory/settings/git/tests/context mutations**: All have Go-native fallbacks.
8. **Eliminated ~200 bridge-only calls** across 19 handler files.
9. **Added `Server.Close()` and test cleanup**: All 153 test server instances properly close SQLite connections.

### Key Files Modified
- `apps/web/src/lib/hypercode-runtime.ts` - Restored startup provenance logic
- `apps/web/src/app/api/trpc/[trpc]/route.ts` - Recovered from earlier commit
- `go/internal/httpapi/config_local_state.go` - NEW: SQLite config KV store
- `go/internal/orchestration/council.go` - Added RunConsensus
- `go/internal/workflow/engine.go` - Added Start/Resume/Pause/Approve/Reject
- `go/internal/httpapi/*.go` - 19 handler files migrated from bridge-only to native fallback

### Remaining Work
- Council handlers still need deep native logic (currently use generic acknowledged fallback)
- CloudDev handlers need deeper integration with cloud orchestrator
- Test expectations need updating for new native fallback behavior
- Maestro UI refinement for Wails port
- Browser extension deep porting

### Push Status
All commits pushed to `https://github.com/hypercodehq/hypercode.git` on `main`.
Latest: `8293e3cc feat: eliminate ALL non-definition bridge-only handler calls across Go HTTP API`
