# Handoff — Startup Provenance & Go-Primary Dashboard Truth Session

## Current status
**Version:** `1.0.0-alpha.1`

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
5. Updated planning/analysis docs to record the new coverage and narrowed the next recommendation to reducing remaining TypeScript compatibility dependence where Go-native status already exists.
6. Committed and pushed:
   - `7785a9a3` — `feat: surface startup provenance in system dashboards`
   - `38b10684` — `feat: surface startup provenance in orchestrator dashboard`
   - `590d8848` — `feat: prefer go startup truth in web compat fallback`

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

All of the above passed after the Go-enriched compat-fallback patch.

### Important truthful notes
- `apps/web` still does not have a directly usable workspace-local `vitest` command for standalone page tests in this workflow, so page/UI slices were still validated through the successful production web build; however, route-level regressions can be executed truthfully through the root Vitest runner, and that path was used for `apps/web/src/app/api/trpc/[trpc]/route.test.ts` in this slice.
- No long-running processes were killed.
- Local runtime state such as `go/metamcp.db` remains intentionally uncommitted.
- There are still unrelated dirty/untracked paths in the workspace/submodules (for example `apps/cloud-orchestrator`, `apps/maestro`, `packages/claude-mem`, JetBrains plugin files, and a VSIX artifact) that were not part of this slice and were not staged.

### Recommended next steps
1. Keep reducing dashboard dependence on TypeScript compatibility reads where Go-native runtime/status surfaces already exist.
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
