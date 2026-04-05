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
17. Updated planning/analysis docs to record the new coverage and narrowed the next recommendation to reducing remaining TypeScript compatibility dependence where Go-native status already exists.
18. Committed and pushed:
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

The latest execution-environment + install-surface + imported-maintenance + MCP-inspector + operator-read compat follow-up was validated with:
- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `pnpm -C apps/web run build`

### Important truthful notes
- `apps/web` still does not have a directly usable workspace-local `vitest` command for standalone page tests in this workflow, so page/UI slices were still validated through the successful production web build; however, route-level regressions can be executed truthfully through the root Vitest runner, and that path was used for `apps/web/src/app/api/trpc/[trpc]/route.test.ts` in this slice.
- No long-running processes were killed.
- Local runtime state such as `go/metamcp.db` remains intentionally uncommitted.
- There are still unrelated dirty/untracked paths in the workspace/submodules (for example `apps/cloud-orchestrator`, `apps/maestro`, `packages/claude-mem`, JetBrains plugin files, and a VSIX artifact) that were not part of this slice and were not staged.

### Recommended next steps
1. Resume the next shared dashboard compatibility reduction after the operator-read slice.
   - highest-value remaining nearby candidates: any remaining runtime-heavy read surfaces still using synthetic placeholders, especially outside the now-covered startup/MCP/tools/session/operator clusters
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
