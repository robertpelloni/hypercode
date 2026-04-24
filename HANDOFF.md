# Handoff

## What was done
- Added a Go-native foundation bootstrap for a Pi-derived harness:
  - `foundation/pi`
  - `foundation/compat`
  - `foundation/assimilation`
  - `cmd/foundation.go`
- Extended the bootstrap into a **truthful native runtime baseline**:
  - native `read`, `write`, `edit`, `bash` handlers
  - evented runtime execution
  - JSONL-backed session persistence with create/list/load/fork
  - CLI execution and session management commands under `foundation`
- Added the first native **Aider-inspired repo map baseline**:
  - ranked source scanning
  - lightweight symbol extraction
  - deterministic `<repo_map>` output
  - `borg foundation repomap`
- Strengthened repo-map quality with first **graph-ranking groundwork**:
  - files that reference symbols defined in other files now push ranking weight toward those defining files
  - mention-based ranking still works, but cross-file code relationships now matter too
- Routed top-level tool registration closer to the new foundation:
  - `tools.Registry` now exposes exact-name native Pi-compatible tools from `foundation/pi`
  - `agent.Agent` now registers per-tool schemas instead of one placeholder schema
  - legacy `tools/repomap.go` now delegates to `foundation/repomap`
- Added the first Borg/Borg adapter seam:
  - `foundation/adapters/borg.go` exposes assimilation status, memory context, provider status, MCP config visibility, and adjacent Borg repo discovery
  - `foundation/adapters/providers.go` exposes current provider/model visibility, detected providers, Ollama model discovery, and provider-route selection groundwork
  - `foundation/adapters/provider_routing.go` provides shared route-selection logic for CLI and HTTP surfaces
  - `foundation/adapters/provider_execution.go` provides shared provider execution-preparation behavior for CLI, HTTP, and provider stubs
  - `foundation/adapters/mcp_config.go` and `foundation/adapters/mcp.go` expose MCP config parsing, server discovery, tool hints, route hints, mediated tool-call preparation, and configured-server startup seams
  - `borg foundation adapters` now inspects that seam directly
  - `agent.Agent` now incorporates adapter-derived system context into its system prompt
- Migrated more top-level surfaces onto the foundation/adapter layer:
  - `mcp/client.go`, `mcp/manager.go`, and `mcp/config.go` now consume adapter-backed behavior
  - `cmd/foundation_http.go` provides reusable foundation-backed HTTP helpers
  - `cmd/serve.go` now exposes `/api/v1/foundation/*` endpoints and routes `/fs/read` through the foundation `read` tool
  - foundation-backed MCP HTTP helper and route surfaces now expose MCP tool listing and mediated call preparation
  - foundation-backed provider helper and route surfaces now expose provider visibility, route selection, and execution preparation
  - foundation-backed orchestration helper and route surfaces now expose plan generation
  - `borg foundation providers status/select/prepare` now exposes provider routing groundwork from the CLI
  - `borg foundation plan` now exposes orchestration planning from the CLI
  - `agents/provider_stub.go` and `agents/provider.go` now consume provider execution-preparation hints
  - `agents/director.go` and `agent/orchestrator.go` now consume `foundation/orchestration` planning primitives
  - `orchestrator/webhooks.go`, daemon sweep planning, and autodrive objective generation now consume foundation orchestration helpers
  - `tui/slash.go` now exposes foundation-backed `/plan`, `/repomap`, `/providers`, `/adapters`, and `/mcp`
  - `tui/foundation_bridge.go` now routes normal prompt and shell proposal flows through foundation-aware helpers
  - `tui/slash.go` now exposes foundation-backed `/plan` and `/repomap` slash commands
- Added deeper verification coverage:
  - snapshot-style tests for baseline tool results
  - top-level agent schema registration test
  - Borg/Borg adapter seam test
  - provider adapter seam test
  - provider-route selection test
  - provider execution-preparation test
  - MCP adapter seam tests and top-level MCP package tests
  - foundation-backed HTTP helper tests
  - MCP mediation helper tests
  - orchestration planner, daemon planner, webhook planner, and migrated director/orchestrator tests
  - foundation-backed TUI slash-command tests
  - foundation-backed TUI prompt/shell helper tests
  - provider CLI smoke checks
  - foundation plan CLI smoke checks
  - TUI provider/adapter introspection smoke coverage via tests
- Added comprehensive `docs/ai/` documentation for requirements, design, planning, implementation, and testing.
- Added `docs/ai/design/upstream-toolchain-analysis.md` summarizing the imported upstream systems and assimilation strategy.
- Fixed the duplicate SQLite driver registration issue in `orchestrator/queue.go` and `orchestrator/vectors.go` by removing redundant `modernc.org/sqlite` imports.

## Validation completed
- `gofmt -w cmd/foundation.go cmd/foundation_http.go cmd/foundation_http_test.go cmd/serve.go foundation/adapters/borg.go foundation/adapters/borg_test.go foundation/adapters/providers.go foundation/adapters/providers_test.go foundation/adapters/mcp_config.go foundation/adapters/mcp.go foundation/adapters/mcp_test.go foundation/compat/types.go foundation/compat/catalog.go foundation/compat/default_catalog.go foundation/compat/catalog_test.go foundation/pi/foundation.go foundation/pi/foundation_test.go foundation/pi/runtime_types.go foundation/pi/runtime.go foundation/pi/runtime_test.go foundation/pi/session.go foundation/pi/session_test.go foundation/pi/tool_parity_test.go foundation/pi/tool_snapshot_test.go foundation/pi/tools_native.go foundation/assimilation/inventory.go foundation/assimilation/summary.go foundation/assimilation/inventory_test.go foundation/repomap/repomap.go foundation/repomap/repomap_test.go tools/registry.go tools/repomap.go tools/registry_test.go agent/agent.go agent/agent_test.go mcp/config.go mcp/client.go mcp/manager.go mcp/client_test.go mcp/manager_test.go mcp/mcphost.go mcp/mcphost_test.go orchestrator/vectors.go orchestrator/queue.go`
- `go test ./foundation/... ./cmd ./orchestrator ./tools ./agent ./mcp`
- `go run . foundation adapters`
- `go run . foundation tools`
- `go run . foundation inventory`
- `go run . foundation repomap --dir foundation --max-files 5`
- `go run . foundation session create --name smoke`
- `go run . foundation exec --tool write --input '{"path":"smoke.txt","content":"hello"}'`

## Important repo state notes
- The broader repository still has unrelated baseline failures under full `go test ./...`:
  - `aider/tests/fixtures/languages/go/test.go` has an unused import.
  - `mcp/mcphost_test.go` is out of sync with the host API.
- Many existing Go packages still contain placeholder or aspirational parity logic and should be migrated to the new `foundation/*` packages over time.

## Recommended next steps
1. Continue routing remaining top-level placeholder orchestration/tool surfaces onto the new `foundation/pi` runtime.
2. Expand verified result-shape and snapshot tests for `read`, `write`, `edit`, and `bash` plus CLI/HTTP smoke coverage.
3. Deepen `foundation/repomap` from graph-ranking groundwork toward fuller Aider-style graph ranking and richer edit engines.
4. Expand `foundation/adapters` from visibility, route-selection, and execution-preparation seams into richer provider routing, memory, and richer MCP runtime adapters backed by Borg/Borg.
5. Migrate TUI and orchestration code to the new truthful foundation instead of placeholder parity claims, with special attention to adapter-backed execution paths.
1. **The Config Deletion Loop**
   - **Bug**: `McpConfigService.syncWithDatabase()` was reading the user's `mcp.jsonc` file. If the file lacked cached tools under `_meta.tools` (which was the default state for many servers), it passed an empty array to `toolsRepository.syncTools()`. This caused the repository to execute a DELETE query against all 651 tools in the database, wiping out their `always_on` status.
   - **Fix**: Modified `McpConfigService.ts` to strictly prevent `syncStoredMetadataTools` from overwriting or deleting DB tools if the incoming `mcp.jsonc` array is empty.

2. **The Stdio Loader Blindspot**
   - **Bug**: The `stdioLoader.ts` script (which `pi` and other extensions connect to) was explicitly bypassing the database to remain lightweight. It only read from `mcp.jsonc`. Because the tools were only in the DB and not in `mcp.jsonc` (or were wiped), the proxy served 0 downstream tools.
   - **Fix**: We changed `syncToMcpJson` to `exportToolCache` and made it write to `.borg/mcp-cache.json`. This new unified cache merges both the SQLite database inventory and the manual `mcp.jsonc` configurations without destroying the manual file. The `stdioLoader` now reads `mcp-cache.json`.

3. **Workspace Config Resolution**
   - **Bug**: The system hardcoded `os.homedir() + '/.borg'` for the configuration directory, causing confusion when a local `mcp.jsonc` existed at the project root.
   - **Fix**: Updated `getBorgConfigDir()` in `mcpJsonConfig.ts` to respect `process.env.BORG_CONFIG_DIR`, then check for `process.cwd()/mcp.jsonc`, and finally fall back to the home directory.

4. **Tool Inventory Merging**
   - **Bug**: `getCachedToolInventory()` returned either the SQLite snapshot OR the JSON snapshot, but never both.
   - **Fix**: Rewrote the function to cleanly merge both collections, ensuring manual API-imported servers and auto-discovered DB servers coexist.

5. **Universal Instructions Refactor**
   - Rewrote `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`, and `AGENTS.md` to cleanly point back to `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`, reducing prompt bloat and ensuring architectural alignment across models.

## Next steps for the next agent
1. **Validate Stdio Loader**: Run `pi` or test the stdio proxy directly to ensure it now broadcasts the combined DB and manual tool inventory.
2. **Dashboard Review**: Check if the `always_on` toggles in the React dashboard correctly persist across server restarts now that the destructive wipe bug is gone.
3. **Continue Porting**: The Go bridge needs more direct mappings. Evaluate `PORTING_MAP.md` and continue porting features safely without violating the `UNIVERSAL_LLM_INSTRUCTIONS.md` stabilization rule.
