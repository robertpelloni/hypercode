# Handoff — Stabilization Session

## Current status
**Version:** `1.0.0-alpha.1`

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
