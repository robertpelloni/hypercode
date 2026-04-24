<<<<<<< HEAD
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
  - `hypercode foundation repomap`
- Strengthened repo-map quality with first **graph-ranking groundwork**:
  - files that reference symbols defined in other files now push ranking weight toward those defining files
  - mention-based ranking still works, but cross-file code relationships now matter too
- Routed top-level tool registration closer to the new foundation:
  - `tools.Registry` now exposes exact-name native Pi-compatible tools from `foundation/pi`
  - `agent.Agent` now registers per-tool schemas instead of one placeholder schema
  - legacy `tools/repomap.go` now delegates to `foundation/repomap`
- Added the first HyperCode/Borg adapter seam:
  - `foundation/adapters/hypercode.go` exposes assimilation status, memory context, provider status, MCP config visibility, and adjacent HyperCode repo discovery
  - `foundation/adapters/providers.go` exposes current provider/model visibility, detected providers, Ollama model discovery, and provider-route selection groundwork
  - `foundation/adapters/provider_routing.go` provides shared route-selection logic for CLI and HTTP surfaces
  - `foundation/adapters/provider_execution.go` provides shared provider execution-preparation behavior for CLI, HTTP, and provider stubs
  - `foundation/adapters/mcp_config.go` and `foundation/adapters/mcp.go` expose MCP config parsing, server discovery, tool hints, route hints, mediated tool-call preparation, and configured-server startup seams
  - `hypercode foundation adapters` now inspects that seam directly
  - `agent.Agent` now incorporates adapter-derived system context into its system prompt
- Migrated more top-level surfaces onto the foundation/adapter layer:
  - `mcp/client.go`, `mcp/manager.go`, and `mcp/config.go` now consume adapter-backed behavior
  - `cmd/foundation_http.go` provides reusable foundation-backed HTTP helpers
  - `cmd/serve.go` now exposes `/api/v1/foundation/*` endpoints and routes `/fs/read` through the foundation `read` tool
  - foundation-backed MCP HTTP helper and route surfaces now expose MCP tool listing and mediated call preparation
  - foundation-backed provider helper and route surfaces now expose provider visibility, route selection, and execution preparation
  - foundation-backed orchestration helper and route surfaces now expose plan generation
  - `hypercode foundation providers status/select/prepare` now exposes provider routing groundwork from the CLI
  - `hypercode foundation plan` now exposes orchestration planning from the CLI
  - `agents/provider_stub.go` and `agents/provider.go` now consume provider execution-preparation hints
  - `agents/director.go` and `agent/orchestrator.go` now consume `foundation/orchestration` planning primitives
  - `orchestrator/webhooks.go`, daemon sweep planning, and autodrive objective generation now consume foundation orchestration helpers
  - `tui/slash.go` now exposes foundation-backed `/plan`, `/repomap`, `/providers`, `/adapters`, and `/mcp`
  - `tui/foundation_bridge.go` now routes normal prompt and shell proposal flows through foundation-aware helpers
  - `tui/slash.go` now exposes foundation-backed `/plan` and `/repomap` slash commands
- Added deeper verification coverage:
  - snapshot-style tests for baseline tool results
  - top-level agent schema registration test
  - HyperCode/Borg adapter seam test
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
- `gofmt -w cmd/foundation.go cmd/foundation_http.go cmd/foundation_http_test.go cmd/serve.go foundation/adapters/hypercode.go foundation/adapters/hypercode_test.go foundation/adapters/providers.go foundation/adapters/providers_test.go foundation/adapters/mcp_config.go foundation/adapters/mcp.go foundation/adapters/mcp_test.go foundation/compat/types.go foundation/compat/catalog.go foundation/compat/default_catalog.go foundation/compat/catalog_test.go foundation/pi/foundation.go foundation/pi/foundation_test.go foundation/pi/runtime_types.go foundation/pi/runtime.go foundation/pi/runtime_test.go foundation/pi/session.go foundation/pi/session_test.go foundation/pi/tool_parity_test.go foundation/pi/tool_snapshot_test.go foundation/pi/tools_native.go foundation/assimilation/inventory.go foundation/assimilation/summary.go foundation/assimilation/inventory_test.go foundation/repomap/repomap.go foundation/repomap/repomap_test.go tools/registry.go tools/repomap.go tools/registry_test.go agent/agent.go agent/agent_test.go mcp/config.go mcp/client.go mcp/manager.go mcp/client_test.go mcp/manager_test.go mcp/mcphost.go mcp/mcphost_test.go orchestrator/vectors.go orchestrator/queue.go`
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
4. Expand `foundation/adapters` from visibility, route-selection, and execution-preparation seams into richer provider routing, memory, and richer MCP runtime adapters backed by HyperCode/Borg.
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
=======
# Borg Handoff

_Last updated: 2026-03-11_

## Latest session update — memory story consolidation slice

### Follow-up slice — fuzzy intent-aware cross-session links

#### What changed

- `packages/core/src/services/agentMemoryConnections.ts`
  - extended cross-session goal/objective correlation beyond exact text matches so sessions can now link when their intent anchors use similar phrasing instead of identical strings
  - added a conservative token-overlap heuristic for intent themes (for example, `Keep the memory dashboard truthful` vs `Keep memory dashboard views truthful and coherent`)
  - exact goal/objective matches still win first; fuzzy theme matches only apply when no exact session-level intent overlap exists
- `packages/core/src/services/agentMemoryConnections.test.ts`
  - added focused coverage for cross-session ranking when the related session shares the same goal/objective theme with different wording

#### Focused validation

- `get_errors` on touched helper/test files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryConnections.test.ts packages/core/src/services/agentMemoryTimeline.test.ts packages/core/src/services/agentMemoryPivot.test.ts apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - result: **passed** (`21` tests total)
- `pnpm -C apps/web exec tsc --noEmit --pretty false`
  - result: **passed**

#### Recommended next move

The next best slice inside `013-memory-story-consolidation` is still to deepen traversal beyond ranked one-hop cards, especially:

1. a backend detail endpoint for graph-style related-record traversal
2. optional timeline-day grouping inside the inspector for long same-session histories
3. richer observation-level inheritance so same-session records can expose goal/objective anchors more directly in the UI

### Follow-up slice — goal/objective pivot anchors

#### What changed

- `packages/types/src/schemas/memory.ts`
  - extended the shared `searchMemoryPivot` contract so pivots can now target `goal` and `objective` anchors in addition to `session`, `tool`, `concept`, and `file`
- `packages/core/src/services/AgentMemoryService.ts`
  - widened the native pivot-search input union so Borg's service contract accepts the new intent pivot kinds
- `packages/core/src/services/agentMemoryPivot.ts`
  - added direct backend matching for goal/objective anchors derived from structured prompts and session summaries
  - goal pivots match `activeGoal` plus explicit goal prompts, while objective pivots match `lastObjective` plus explicit objective prompts
  - non-session pivot behavior still pulls in same-session companion records so intent pivots return the surrounding work context rather than isolated records only
- `packages/core/src/services/agentMemoryPivot.test.ts`
  - added focused coverage for goal and objective pivot ranking
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - extended inspector pivot generation to emit `Goal pivots` and `Objective pivots` sections for prompt and summary records
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added focused coverage for prompt/summary goal-objective pivot sections

#### Focused validation

- `get_errors` on touched schema/service/dashboard helper files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryPivot.test.ts packages/core/src/services/agentMemoryConnections.test.ts packages/core/src/services/agentMemoryTimeline.test.ts apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - result: **passed** (`21` tests total)
- `pnpm -C apps/web exec tsc --noEmit --pretty false`
  - result: **passed** (`WEB_TSC_OK`)

#### Recommended next move

The next best slice inside `013-memory-story-consolidation` is to deepen traversal beyond one-hop pivots, especially:

1. a backend detail endpoint for graph-style related-record traversal
2. optional timeline-day grouping inside the inspector for long same-session histories
3. richer same-session intent inheritance for observation-level pivot chips if we want observations to surface session goals/objectives directly

### Follow-up slice — anchor-aware session window grouping

#### What changed

- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - added `groupMemoryWindowAroundAnchor(...)` to split same-session context into explicit `Earlier in session` and `Later in session` groups around the selected memory anchor
  - earlier records are ordered nearest-anchor first, while later records stay chronological from the anchor forward
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added focused coverage for anchor-aware session-window grouping
- `apps/web/src/app/dashboard/memory/page.tsx`
  - replaced the flat `Session window` list with grouped sections so the inspector now explains chronology more clearly around the selected record

#### Focused validation

- `get_errors` on touched dashboard files: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts packages/core/src/services/agentMemoryConnections.test.ts packages/core/src/services/agentMemoryTimeline.test.ts packages/core/src/services/agentMemoryPivot.test.ts`
  - result: **passed** (`18` tests total)
- `pnpm -C apps/web exec tsc --noEmit --pretty false; if ($LASTEXITCODE -eq 0) { Write-Output 'WEB_TSC_OK' } else { exit $LASTEXITCODE }`
  - result: **passed** (`WEB_TSC_OK`)

#### Recommended next move

The next best slice inside `013-memory-story-consolidation` is to deepen record traversal beyond ranked cards, especially:

1. a backend detail endpoint for graph-style related-record traversal
2. richer prompt/summary pivot actions for goal and objective anchors
3. optional timeline-day grouping inside the inspector for long same-session histories

### Follow-up slice — backend cross-session memory links

#### What changed

- `packages/types/src/schemas/memory.ts`
  - added a typed `getCrossSessionMemoryLinks` contract so the dashboard can request related records anchored to a selected memory id
- `packages/core/src/services/agentMemoryConnections.ts`
  - added a pure backend helper that finds related records from other sessions using shared concepts, files, tools, and source metadata
  - same-session records are intentionally excluded so this surface complements, rather than duplicates, the new session window
- `packages/core/src/services/agentMemoryConnections.test.ts`
  - added focused coverage for cross-session ranking and unknown-anchor behavior
- `packages/core/src/services/AgentMemoryService.ts`
  - added `getCrossSessionLinks(...)` so cross-session correlation is part of the native memory service contract
- `packages/core/src/routers/memoryRouter.ts`
  - added `getCrossSessionMemoryLinks` so the dashboard can request backend-ranked cross-session relationships directly
- `apps/web/src/app/dashboard/memory/page.tsx`
  - added a backend-backed `Cross-session links` inspector block beneath the session window
  - selected records can now surface related observations from other sessions with explicit reasons (`shared concepts`, `shared file`, `same tool`, `same source`, `other session`)

#### Focused validation

- `get_errors` on touched files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryConnections.test.ts packages/core/src/services/agentMemoryTimeline.test.ts packages/core/src/services/agentMemoryPivot.test.ts apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - result: **passed** (`17` tests total)
- `pnpm -C apps/web exec tsc --noEmit --pretty false; if ($LASTEXITCODE -eq 0) { Write-Output 'WEB_TSC_OK' } else { exit $LASTEXITCODE }`
  - result: **passed** (`WEB_TSC_OK`)

#### Recommended next move

The next best slice inside `013-memory-story-consolidation` is to deepen the record graph around prompts and summaries, especially:

1. explicit goal/objective correlation across sessions
2. anchor-aware grouping so the inspector can visually distinguish current session context vs other-session echoes
3. optional backend detail endpoints for graph-style traversal beyond the current ranked cards

#### Additional refinement landed after the initial slice

- `packages/core/src/services/agentMemoryConnections.ts`
  - cross-session correlation now inherits goal/objective signals from prompt and summary records in the same session instead of only looking at the selected record in isolation
  - this lets an observation surface related prompt/summary work from other sessions even when the observation itself does not carry explicit goal fields
- `packages/core/src/services/agentMemoryConnections.test.ts`
  - updated fixtures and expectations to cover shared goal/objective ranking across observation, prompt, and summary records

#### Additional focused validation

- `get_errors` on the updated helper/test files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryConnections.test.ts packages/core/src/services/agentMemoryTimeline.test.ts packages/core/src/services/agentMemoryPivot.test.ts apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - result: **passed** (`17` tests total)

### Follow-up slice — backend session timeline window

#### What changed

- `packages/types/src/schemas/memory.ts`
  - added a typed `getMemoryTimelineWindow` contract so the UI can request same-session context around a selected record with explicit before/after bounds
- `packages/core/src/services/agentMemoryTimeline.ts`
  - added a pure backend helper that filters by session, finds the nearest anchor record by timestamp, and returns a chronological same-session window around it
- `packages/core/src/services/agentMemoryTimeline.test.ts`
  - added focused coverage for anchor selection, chronological windowing, and unknown-session behavior
- `packages/core/src/services/AgentMemoryService.ts`
  - added `getTimelineWindow(...)` so session-window lookups are part of the service contract instead of a front-end-only heuristic
- `packages/core/src/routers/memoryRouter.ts`
  - added `getMemoryTimelineWindow` so the dashboard can request nearby same-session records directly from the backend
- `apps/web/src/app/dashboard/memory/page.tsx`
  - added a backend-backed `Session window` inspector block that shows nearby same-session records around the selected memory anchor
  - the dashboard now tracks the selected record's session id separately and invalidates the new query alongside the existing memory views

#### Focused validation

- `get_errors` on touched files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryTimeline.test.ts packages/core/src/services/agentMemoryPivot.test.ts`
  - result: **passed** (`6` tests total)
- `pnpm -C apps/web exec tsc --noEmit --pretty false; if ($LASTEXITCODE -eq 0) { Write-Output 'WEB_TSC_OK' } else { exit $LASTEXITCODE }`
  - result: **passed** (`WEB_TSC_OK`)

#### Recommended next move

The next best slice inside `013-memory-story-consolidation` is to build on this backend session window and add richer relationship semantics, especially:

1. explicit cross-session correlation (for recurring concepts/files/goals across sessions)
2. anchor-aware timeline labels or grouping inside the inspector (`earlier`, `anchor`, `later` with stronger provenance)
3. deeper graph-style memory navigation beyond the current pivot + session-window model

### Follow-up slice — backend-backed memory pivots

#### What changed

- `packages/types/src/schemas/memory.ts`
  - added a typed backend pivot contract for memory searches (`session`, `tool`, `concept`, `file`)
- `packages/core/src/services/agentMemoryPivot.ts`
  - added a pure backend helper that ranks direct pivot matches and session-related companion records
  - file, concept, tool, and session pivots now resolve against Borg-native structured memory metadata instead of relying on front-end-only correlation
- `packages/core/src/services/AgentMemoryService.ts`
  - added `searchByPivot(...)` backed by the new helper so structured memory pivots are part of the service contract
- `packages/core/src/routers/memoryRouter.ts`
  - added `searchMemoryPivot` so the dashboard can request related memory records from the backend directly
- `apps/web/src/app/dashboard/memory/page.tsx`
  - wired inspector pivots to the backend query instead of only steering local search text
  - pivot result sets still respect the active search mode, and manual edits to the search box clear the active pivot state cleanly
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - updated inspector pivot actions so tool/concept/file pivots now intentionally surface related records across the native memory model instead of staying observations-only
- tests
  - added `packages/core/src/services/agentMemoryPivot.test.ts`
  - updated `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`

#### Focused validation

- `get_errors` on touched files: **clean**
- `pnpm exec vitest run packages/core/src/services/agentMemoryPivot.test.ts apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`
  - result: **passed** (`18` tests total)

#### Important caveat

I also checked broader type status after this slice, but the repo still has unrelated pre-existing failures outside the memory pivot work, including current issues under:

- `packages/core/src/routers/sessionRouter.ts`
- `packages/core/src/services/ShellService.ts`
- `packages/core/src/routers/systemProcedures.ts`
- generated Next.js `.next-dev-*` route typings
- `apps/web/src/app/dashboard/billing/page.tsx`

Those were not introduced by the pivot slice; the touched memory files themselves were diagnostics-clean and their focused tests passed.

#### Recommended next move

The next natural step inside `013-memory-story-consolidation` is to deepen backend relationships beyond current pivot matching, especially:

1. explicit cross-session correlation APIs
2. timeline/context windows around a selected record
3. claude-mem-style observation timeline/search affordances without front-end-only heuristics

### Follow-up slice — one-click inspector search pivots

#### What changed

- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - added explicit pivot-action helpers for:
    - session identifiers
    - tool names
    - concepts
    - files read / modified
  - grouped those actions into inspector-ready sections so the page can render a coherent pivot surface instead of manually reconstructing metadata chips
- `apps/web/src/app/dashboard/memory/page.tsx`
  - added a **Pivot this record** block to the memory inspector
  - selected records can now immediately re-query the dashboard from session, tool, concept, and file metadata with a single click
  - made **All Records** behave like a true aggregate view by merging generic records with observation, prompt, and session-summary results during search instead of only querying the generic memory path
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added focused coverage for pivot-section generation across session/tool/concept/file metadata

#### Focused validation

- `get_errors` on touched memory dashboard files: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`
  - result: **passed** (`15` tests total)

#### Recommended next move

The next likely win inside `013-memory-story-consolidation` is to move these pivots beyond front-end query steering and expose backend-backed relationship/search APIs, especially for:

1. file-path pivots
2. concept pivots
3. richer same-session cross-record retrieval

### Follow-up slice — related-record inspector pivots

#### What changed

- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - added relation helpers for current timeline records, including:
    - session linkage extraction
    - tool/source/concept/file overlap scoring
    - related-record ranking with stable fallback ordering
- `apps/web/src/app/dashboard/memory/page.tsx`
  - added a `Related records` block to the inspector
  - selected records can now jump directly to correlated prompts, session summaries, and observations already present in the current result set
  - relation reasons are surfaced explicitly (`same session`, `same tool`, `shared concepts`, `shared file`, etc.) instead of leaving correlation implicit
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added focused coverage for related-record ranking and relation-reason output

#### Focused validation

- `get_errors` on touched memory dashboard files: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`
  - result: **passed** (`14` tests total)

#### Recommended next move

The next likely win inside `013-memory-story-consolidation` is to move beyond client-side correlation and expose true backend-backed relationships such as:

1. search/pivot by file path
2. search/pivot by concept
3. same-session / cross-session correlation APIs

The dashboard now has coherent native record kinds, search modes, a timeline, a detail inspector, and lightweight correlation pivots using the currently loaded records.

### Follow-up slice — timeline + detail inspector

#### What changed

- `apps/web/src/app/dashboard/memory/page.tsx`
  - replaced the flat result list with a two-pane memory explorer:
    - left: day-grouped record timeline
    - right: detail inspector for the selected record
  - records now stay selectable across mode/search changes when possible, with the first available record auto-selected when context changes
  - timeline rows now emphasize time, kind, preview, score, and provenance in a scan-friendly structure instead of dumping only raw content
  - detail view now renders structured sections for observations, prompts, session summaries, and generic facts
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - added helpers for:
    - stable record keys
    - timestamp sorting
    - day-based grouping (`Today`, `Yesterday`, etc.)
    - structured detail-section derivation for the inspector
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added coverage for timeline grouping, stable record keys, and detail-section generation

#### Focused validation

- `get_errors` on touched memory dashboard files: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`
  - result: **passed** (`13` tests total)

#### Recommended next move

If continuing `013-memory-story-consolidation`, the next best slice is either:

1. timeline drill-ins that deep-link to related files/sessions/tools, or
2. explicit session/observation correlation surfaces (for example, “related observations” and “same session” pivots)

At this point the main dashboard has a coherent native memory model, search lenses, timeline grouping, and detail rendering; the next improvements should connect records together rather than merely restyling them.

### Follow-up slice — coherent search modes + record-model helpers

#### What changed

- `apps/web/src/app/dashboard/memory/page.tsx`
  - added explicit search-mode lenses for:
    - all records
    - facts
    - observations
    - prompts
    - session summaries
  - wired those modes to the correct Borg-native queries instead of relying only on the generic `searchAgentMemory` path
  - added a visible **Borg Memory Model** explainer card so operators can see how facts, structured observations, prompts, summaries, and the claude-mem adapter relate
  - improved refresh behavior after fact import/add flows by invalidating the relevant memory queries instead of refreshing only one result list
  - updated the main result rows to render coherent record titles, previews, timestamps, and provenance instead of raw content-only blobs
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - added the shared record-model helpers now used by the dashboard, including:
    - memory kind detection
    - record filtering by search mode
    - badge/title/preview derivation
    - timestamp normalization
    - provenance token assembly
    - operator-facing search-mode hints
- `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - added focused coverage for helper behavior across fact, observation, prompt, and session-summary records

#### Focused validation

- `get_errors` on:
  - `apps/web/src/app/dashboard/memory/page.tsx`
  - `apps/web/src/app/dashboard/memory/memory-dashboard-utils.ts`
  - `apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts`
  - result: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/memory-dashboard-utils.test.ts apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`
  - result: **passed** (`11` tests total)

#### Recommended next move

The next high-value step under `013-memory-story-consolidation` is now a real observation/session timeline detail workflow on `/dashboard/memory` (grouping, deep drill-in, and stronger provenance navigation), since the dashboard can finally distinguish the major Borg-native record kinds honestly.

### What changed

- `apps/web/src/app/dashboard/memory/page.tsx`
  - renamed the page posture from a generic “Agent Memory Bank” into Borg-native memory control language
  - fixed the top stat cards to use coherent tier counts (`session`, `working`, `longTerm`) instead of mismatched field names
  - added a dedicated recent **Session Summaries** panel beside observations and prompts
  - added provenance details across observations, prompts, summaries, and search results (`source`, `session`, `tool`, file counts)
  - updated the search prompt so the dashboard explicitly covers facts, observations, prompts, and summaries
- `packages/core/src/services/AgentMemoryService.ts`
  - expanded `getStats()` to emit:
    - `totalCount`
    - `sessionCount`
    - `workingCount`
    - `longTermCount`
    - `sessionSummaryCount`
  - kept the lower-level `session` / `working` / `long_term` counters too
- `apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.ts`
  - updated the parity matrix so it no longer incorrectly claims Borg has zero structured observation pipeline
  - added explicit shipped capabilities for:
    - canonical Borg observation schema
    - structured prompt + session summary capture
  - downgraded the claude-mem “compression pipeline” gap from fully missing to partial, because Borg already records heuristic structured observations with facts, concepts, files, and hashes
- `apps/web/src/app/dashboard/memory/claude-mem/page.tsx`
  - rewrote the framing from “claude-mem is the memory story” to “claude-mem is an adapter around Borg-native memory primitives”
  - changed the primary CTA to `/dashboard/memory`
  - updated the recommended next slice toward native observation search/timeline/provenance completion

### Focused validation

- `get_errors` on all touched files: **clean**
- `pnpm exec vitest run apps/web/src/app/dashboard/memory/claude-mem/claude-mem-status.test.ts`: **passed** (`6` tests)

### Important caveat

I attempted broader typecheck validation after this slice, but the repo currently has unrelated pre-existing blockers outside the memory-story changes, including:

- `packages/core/src/routers/sessionRouter.ts`
- `packages/core/src/services/ShellService.ts`
- `packages/core/src/routers/systemProcedures.ts`
- generated Next.js route typing noise under `.next-dev-*`
- syntax issues already present in `apps/web/src/app/dashboard/billing/page.tsx`

Those failures were not introduced by this memory slice; the touched memory files themselves were clean in editor diagnostics.

### Recommended next move

If continuing the memory track, the next high-value slice is to give `/dashboard/memory` a true observation-centric search/timeline detail workflow instead of only recent-card previews and generic full-text result rows.

## Latest session update — ecosystem ask consolidated, next task promoted

### What changed

- Completed the ecosystem-planning consolidation brief by moving `015-ecosystem-assimilation-consolidation.md` into `tasks/completed/`
- Promoted `013-memory-story-consolidation.md` into `tasks/active/` as the next real implementation slice
- Anchored the canonical capability-track map in one place so future tasks can reference:
  - **Track A** — boot-ready control plane
  - **Track B** — Borg-native MCP router maturity
  - **Track C** — browser extension platform
  - **Track D** — IDE / CLI / hook-based memory capture
  - **Track E** — session fabric and model/tool portability
  - **Track F** — advanced autonomy and marketplace
- Updated `ROADMAP.md` and `TODO.md` to point at the completed consolidation brief instead of leaving the large assimilation request implicit

### Why this matters

The user-facing vision still contains huge upstream parity asks. Without one Borg-owned capability map, those asks keep reappearing as infinite “assimilate everything” directives that fight the focused 1.0 roadmap.

This session turned that broad request into a stable planning boundary:

- Borg 1.0 stays focused on startup truthfulness, router maturity, supervisor trust, provider truthfulness, and dashboard honesty
- Borg 1.5 gets the browser-extension + memory-capture platform work
- Borg 2.0 keeps autonomy, marketplace, swarm babysitting, and larger operator automation behind an explicit later milestone

### Immediate next task

`tasks/active/013-memory-story-consolidation.md` is now the recommended next implementation slice.

That task is the first concrete follow-up under **Track D** and should define Borg's canonical observation model before any deeper claude-mem-style parity claims are made.

## Latest session update — live smoke continuation + CLI lock cleanup

### What was verified live

The root dev flow is currently healthy in this workspace once the dashboard hydrates.

Live probes during this continuation showed:

- `http://127.0.0.1:3000/api/trpc/startupStatus?input={}` returned ready state with:
  - `checks.memory.ready: true`
  - `checks.memory.initialized: true`
  - `checks.mcpAggregator.serverCount: 65`
  - `checks.mcpAggregator.connectedCount: 0`
  - `checks.mcpAggregator.persistedServerCount: 65`
- `http://127.0.0.1:3000/api/trpc/mcp.getStatus?input={}` reported:
  - `serverCount: 65`
  - `toolCount: 271`
- `/dashboard`
  - first paint still shows fallback values briefly
  - after hydration, the operator home reflects the live state correctly (`0/65`, `271 tools`, startup readiness ready)
- `/dashboard/mcp/system`
  - now hydrates to `Healthy` / `Ready`
  - shows `4/4 phases ready`
  - reflects the current MCP inventory counts correctly (`65 persisted servers`, `271 tools`)

Interpretation: the current regression is **not** that the dashboard stays permanently stale. The boot surfaces are hydrating correctly, though there is still an initial fallback-first render on the home page.

### Lock-path follow-up: real bug fixed

The previous handoff recommended validating single-instance startup behavior. That check exposed a real lock-cleanup bug.

Observed behavior:

- starting a second CLI instance with:
  - `pnpm -C packages/cli exec tsx src/index.ts start --port 3100 --host 127.0.0.1`
- did **not** fail at the lock layer in this session
- instead, it advanced into startup and crashed later on:
  - `Error: listen EADDRINUSE ... port 3001`
- after that fatal crash, the process left a stale `C:\Users\hyper\.borg\lock`

Important nuance:

- `scripts/dev_tabby_ready.mjs` will **reuse any already-running core bridge on port `3001`** and skip launching the CLI child entirely
- in this session, the root dev stack was healthy but was not guaranteed to have been started through the current lock-managed CLI path
- so this run did **not** conclusively prove whether the active core bridge itself was launched with a live Borg lock

What was fixed:

- `packages/cli/src/commands/start.ts`
  - added `createLockLifecycleHandlers(...)`
  - fatal startup failures now release the Borg lock before exiting
  - wired cleanup for:
    - `uncaughtException`
    - `unhandledRejection`
    - `SIGINT`
    - `SIGTERM`
    - normal process exit
- `packages/cli/src/commands/start.test.ts`
  - added regression coverage proving the lock is released when startup crashes with an uncaught exception
  - tightened the existing “live lock” test so it simulates the actual blocking condition (running process + occupied port)

### Validation for this follow-up

- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`
  - passed (`8` tests)
- `pnpm -C packages/cli exec tsc --noEmit`
  - passed after fixing current serializer drift (see below)
- `shell: core: typecheck-marker`
  - result: **`CORE_TSC_OK`**

### Serializer follow-up needed by current worktree changes

The CLI typecheck surfaced an in-flight regression from other recent work: the `always_on` field had been added to current server/tool schemas but not fully propagated through the core DB serializers.

Fixed files:

- `packages/core/src/db/serializers/mcp-servers.serializer.ts`
- `packages/core/src/db/serializers/namespaces.serializer.ts`
- `packages/core/src/db/serializers/tools.serializer.ts`

These serializers now carry `always_on` through the output model and tolerate older joined row shapes where that field may still be absent.

### Known follow-up item

The workspace task `shell: cli: test start command` is currently misconfigured:

- it runs `vitest ... --reporter=basic`
- in this workspace/Vitest version that is treated as a missing custom reporter module and fails before the tests run

Use this direct command instead until the task definition is corrected:

- `pnpm exec vitest run packages/cli/src/commands/start.test.ts`

## Latest session update — MCP discovery fix, config path, dashboard truthfulness

### What changed this session

1. **MCP Discovery: SSE + STREAMABLE_HTTP support**
   - `packages/core/src/db/repositories/mcp-servers.repo.ts` → `discoverServerTools()` now handles all 3 transport types (was STDIO-only)
   - Added 30-second timeout to prevent hanging discoveries
   - SSE/HTTP transports use `SSEClientTransport` and `StreamableHTTPClientTransport` from the MCP SDK

2. **Config path: `~/.borg/` instead of workspace root**
   - `packages/core/src/mcp/mcpJsonConfig.ts` → `getBorgConfigDir()` returns `os.homedir()/.borg`
   - `getBorgMcpJsoncPath()`, `getBorgMcpJsonPath()`, `loadBorgMcpConfig()`, `writeBorgMcpConfig()` all default to `~/.borg/`
## Current focus + recent wins

- ✅ **MCP Discovery Enhancements:** Added support for SSE and STREAMABLE_HTTP transports with a 30-second handshake timeout to prevent hangs.
- ✅ **Configuration Path Restructure:** `mcp.json` and `mcp.jsonc` have been migrated from the local project root to the global `~/.borg/` directory.
- ✅ **System Status Truthfulness:** The System Status dashboard now displays real, live data from tRPC endpoints instead of hardcoded placeholders (e.g., SQLite, Event Bus, live uptime, v0.9.0-beta).
- ✅ **Dashboard Honesty Pass (Task 008):** Restructured the UI to clearly delineate between Borg 1.0 Core features and Experimental/Parity pages.
  - Added a "Labs" dropdown to the top navigation.
  - Reorganized the multi-page sidebar navigation into "Borg 1.0 Core" and "Labs & Experimental" sections.
  - Added explicit "Labs" and "Beta" badges to in-development surfaces like the Director, Council, and Super Assistant pages.
- ✅ **Health, Logs & Operator Surfaces (Task 009):** Exposed existing backend capabilities from the `core` tRPC routers to new dedicated dashboard sections within the Borg 1.0 Core.
  - `/dashboard/health`: Displays real-time overall system status and detailed tracking per MCP Server (uptime, crash attempts, error states) with manual health-reset capabilities.
  - `/dashboard/logs`: Real-time searchable and filterable execution history powered by the `logsRouter`. Provides aggregate success/error rates, top tools, and a latency summary.
  - `/dashboard/audit`: A centralized ledger driven by `auditRouter` exposing cryptographically relevant system config changes and agent actions.
- Provider routing improvements
- Session supervisor improvements
- README quickstart update

## Previous session — startup orchestration + boot status handoff

### What is newly in place

This worktree now contains a real boot/readiness path aimed at the user’s “run `pnpm run dev` in Tabby and have Borg actually be ready” flow.

- `scripts/dev_tabby_ready.mjs`
  - root `pnpm run dev` now acts as a readiness wrapper instead of just launching turbo and hoping for the best
  - it:
    - starts the turbo web stack
    - reuses an existing core bridge on `3001` if already alive, otherwise starts the CLI/core path on `3100`
    - polls the dashboard for `startupStatus`, MCP, memory, browser, and session readiness
    - warms those routes once the dashboard responds
    - auto-opens `/dashboard` unless `BORG_DEV_READY_OPEN_BROWSER=0`
- `packages/core/src/routers/startupStatus.ts`
  - new boot snapshot builder that exposes one structured readiness contract instead of forcing the launcher to guess from scattered probes
  - readiness now reports:
    - MCP aggregator initialization
    - config-sync completion/error state
    - persisted MCP inventory counts
    - browser service state
    - session supervisor restore state
    - extension bridge state and connected clients
- `packages/core/src/routers/systemProcedures.ts`
  - now serves `startupStatus` through tRPC using live runtime plus persisted inventory counts
- `packages/cli/src/commands/start.ts`
  - `borg start` now has a single-instance lock under the Borg data dir
  - stale lock cleanup is supported
  - stale-port reuse is supported when the port is free and the user did not explicitly override it
  - startup now delegates to `startOrchestrator(...)` with explicit `host`, `trpcPort`, `startMcp`, `startSupervisor`, and `autoDrive`
- `packages/core/src/orchestrator.ts`
  - orchestrator startup is now parameterized instead of hard-wired
  - can start tRPC on a specific port and optionally start supervisor / MCP / auto-drive
- `packages/core/src/mcp/MCPAggregator.ts`
  - tracks initialization progress (`inProgress`, `initialized`, timestamps, last error)
- `packages/core/src/McpConfigService.ts` *(consumed via runtime typing and startup snapshot)*
  - config-sync state is surfaced so readiness can distinguish “service exists” from “startup work finished”
- `packages/core/src/supervisor/SessionSupervisor.ts` *(consumed via runtime typing and startup snapshot)*
  - restore status is surfaced so the dashboard can show whether session recovery completed

### Current validation from this handoff pass

- editor diagnostics checked for:
  - `scripts/dev_tabby_ready.mjs`
  - `packages/core/src/routers/startupStatus.ts`
  - `packages/cli/src/commands/start.ts`
  - `HANDOFF.md`
  - result: **no errors found**
- task run:
  - `shell: core: typecheck-marker`
  - result: **`CORE_TSC_OK`**

### Smoke validation follow-up completed

A real root `pnpm run dev` smoke pass was run after the handoff section above was written.

What the live probes proved:

- `http://127.0.0.1:3000/api/trpc/startupStatus?input={}` returned `200`
- `http://127.0.0.1:3000/dashboard` returned `200`
- `http://127.0.0.1:3001/health` returned `200`
- `http://127.0.0.1:3100/trpc/startupStatus?input={}` returned `200`
- `http://127.0.0.1:3000/api/trpc/mcp.getStatus?input={}` reported:
  - `initialized: true`
  - `serverCount: 7`
  - `toolCount: 26`
  - `connectedCount: 0`

That smoke run exposed two boot-truthfulness gaps, both now fixed:

1. **Memory false-positive readiness**
   - live `startupStatus` was reporting:
     - `ready: true`
     - `checks.memory.ready: true`
     - `checks.memory.initialized: false`
   - fix applied:
     - `packages/core/src/routers/startupStatus.ts`
       - memory readiness now requires `isMemoryInitialized`
     - `packages/core/src/MCPServer.ts`
       - `start()` now eagerly calls `initializeMemorySystem()`
     - `packages/core/src/routers/startupStatus.test.ts`
       - regression added so startup stays pending until memory is actually initialized

2. **MCP inventory count mismatch**
   - the startup snapshot exposed `checks.mcpAggregator.serverCount` as live-connected count only, which produced `0` even while the router had `7` known/persisted servers and `26` tools
   - fix applied:
     - `packages/core/src/routers/startupStatus.ts`
       - `checks.mcpAggregator.serverCount` now reports the known inventory count (`max(live, persisted, configured)`)
       - `checks.mcpAggregator.connectedCount` now exposes the live-connected count explicitly
     - `packages/core/src/routers/startupStatus.test.ts`
       - regression added for "known inventory with zero live clients"

### Validation after the follow-up fixes

- `pnpm exec vitest run packages/core/src/routers/startupStatus.test.ts`
  - passed (`5` tests)
- `shell: core: typecheck-marker`
  - result: **`CORE_TSC_OK`**
- final live re-probe after restarting the dev stack:
  - `startupStatus.ready: true`
  - `checks.memory.ready: true`
  - `checks.memory.initialized: true`
  - `checks.mcpAggregator.serverCount: 7`
  - `checks.mcpAggregator.connectedCount: 0`

Interpretation: the startup snapshot is now materially more honest. It distinguishes "known router inventory" from "currently connected MCP clients" and no longer claims memory is ready before initialization actually completes.

### Important caution for the next model

This worktree is **very dirty** and not all modified files belong to the startup-readiness slice.

High-noise areas visible in the current worktree include:

- broad `apps/web/**` dashboard/navigation/integration edits
- broad `packages/core/**` MCP/admin/router/runtime edits
- generated or local-state files such as:
  - `mcp.json`
  - `mcp.jsonc`
  - `packages/cli/.borg-session.json`
- dirty submodules:
  - `external/MetaMCP`
  - `packages/MCP-SuperAssistant`
  - `packages/claude-mem`

Do **not** assume the whole worktree is one cohesive feature branch. Before making further edits, re-check git status/diffs and isolate the startup-readiness files from unrelated local experimentation.

### Recommended next move

The most valuable follow-up is a real end-to-end startup smoke run, not more structural editing:

1. run root `pnpm run dev`
2. confirm the launcher reaches ready state without timing out
3. confirm `/api/trpc/startupStatus` reports `ready: true`
4. confirm dashboard home and MCP system pages render the startup phases correctly
5. verify the core/CLI locking behavior when a second start is attempted

If that smoke run fails, debug from the `startupStatus` payload first instead of adding more bespoke probe logic to the launcher.

---

## Latest session update — MCP discovery truthfulness + stale-cache repair

### Follow-up fix — legacy bridge now probes the real core route names

The web-side tRPC fallback bridge had one more real bug: when falling back for legacy MCP dashboard requests, it was probing the wrong upstream procedure names.

- `apps/web/src/app/api/trpc/[trpc]/route.ts`
  - legacy MCP bridge lookup now probes top-level `mcpServers.list` before older `frontend.*` compatibility guesses
  - legacy bulk-import fallback now also includes top-level `mcpServers.bulkImport` before the old `frontend.*` aliases
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - added regression coverage proving a legacy MCP batch can recover via upstream `mcpServers.list`

### What was verified in this follow-up

- `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts apps/web/tests/integration/mcp-to-dashboard.test.ts`
  - passed (`10` tests)
- live upstream probes after the patch showed:
  - `http://127.0.0.1:4000/trpc/mcpServers.list?input={}` → `404`
  - `http://127.0.0.1:3100/trpc/mcpServers.list?input={}` → connection refused until a real core process was started
  - `http://127.0.0.1:3000/api/trpc/mcpServers.list?input={}` → still `legacy-mcp-dashboard-bridge` while no core upstream was available

### Live validation with a real core process

A direct Borg core process was started on port `3100` for smoke validation.

With that live upstream available:

- `http://127.0.0.1:3100/trpc/mcpServers.list?input={}` returned live managed-server data
- `http://127.0.0.1:3100/trpc/mcp.getStatus?input={}` returned:
  - `initialized: true`
  - `serverCount: 7`
  - `toolCount: 26`
  - `connectedCount: 0`
- `http://127.0.0.1:3000/api/trpc/mcpServers.list?input={}` stopped returning compat headers and proxied the live upstream data instead
- `http://127.0.0.1:3000/api/trpc/mcp.getStatus?input={}` also proxied live upstream status (`serverCount: 7`, `toolCount: 26`)

Interpretation: the remaining “64 ready / 0 tools / local compat” behavior was not just stale dashboard state. It was also a runtime condition where the web app had no live Borg core upstream. Once a real core was available on `3100`, the dashboard proxy returned genuine MCP telemetry again.

The newest work closed a real MCP discovery defect and then wired the operator-side repair flow into the dashboard.

### Root cause fixed

The system was not failing binary discovery loudly enough.

- `packages/core/src/mcp/StdioClient.ts`
  - `listTools()` previously swallowed `tools/list` failures and returned `[]`
  - now supports strict behavior via `listTools({ throwOnError: true })`
- `packages/core/src/db/repositories/mcp-servers.repo.ts`
  - binary discovery now calls `client.listTools({ throwOnError: true })`
  - failed discovery is recorded as failure instead of fake-success zero-tool metadata
- `packages/core/src/mcp/serverMetadataCache.ts`
  - empty `ready` metadata caches are no longer considered reusable
- `packages/core/test/mcpDiscoveryFailureHandling.test.ts`
  - added regression coverage for strict discovery failure propagation and empty ready-cache rejection

### Dashboard repair flow added

The dashboard now treats `ready + 0 tools` as stale rather than healthy-looking success.

- `apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.ts`
  - added stale ready-cache detection
  - added `staleReadyCount` and `repairableCount` to the fleet summary model
  - bulk unresolved repair targeting now includes stale `ready` zero-tool entries
- `apps/web/src/app/dashboard/mcp/page.tsx`
  - added fleet summary visibility for stale ready caches
  - changed the bulk action to **Repair stale / unresolved**
  - added per-server stale-cache warning UI
  - added a prominent per-card **Repair cache** action for stale ready entries
  - kept force rediscovery available in secondary actions
- `apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.test.ts`
  - added regression coverage for stale ready detection and repair targeting

### What was verified

- `pnpm exec vitest run packages/core/test/mcpJsonConfig.test.ts packages/core/test/mcpDiscoveryFailureHandling.test.ts`
  - passed (`5` tests)
- `pnpm exec vitest run apps/web/src/app/dashboard/mcp/mcp-dashboard-utils.test.ts`
  - passed (`8` tests)
- editor diagnostics on all touched backend and dashboard files were clean
- live dashboard check at `http://127.0.0.1:3000/dashboard/mcp`
  - confirmed presence of:
    - **Repair stale / unresolved**
    - **Stale ready**
    - **Repairable**

### Live smoke follow-up

A manual smoke pass was run against the live MCP dashboard after the UI patch landed.

- observed state before repair:
  - `Configured servers: 64`
  - `Aggregated tools: 0`
  - `Ready: 64`
  - `Stale ready: 64`
  - `Repairable: 64`
  - `Local compat: 64`
- triggered **Repair cache** for `borg-supervisor`
- result:
  - the action executed and refreshed `Last binary load`
  - server health remained `ready`
  - metadata source remained `local-binary`
  - cached tools remained `0`
  - the fleet remained in `Local compat` fallback mode

Interpretation: the dashboard repair wiring is functioning, but in this workspace the deeper blocker is that Borg is still surfacing config-backed local compat records instead of yielding live discovered tool telemetry. The next debugging target is therefore the runtime/core path behind local compat fallback rather than the dashboard action itself.

### Important operational note

Existing stale metadata already written to `mcp.jsonc` is not magically fixed by the backend patch alone. The new dashboard actions are the intended operator path to refresh those cached entries.

### Known unrelated workspace noise

A broader `apps/web` build path still surfaced pre-existing issues outside this change set, including:

- unresolved alias/module errors in other app areas on one build attempt
- a Next.js suspense/prerender issue on `/dashboard/mcp/logs`

Those were not introduced by this MCP discovery/dashboard work.

### Best next move

Use the new MCP dashboard repair flow against any existing `ready` / zero-tool servers, then do one end-to-end smoke pass of:

1. start dev
2. open `/dashboard/mcp`
3. repair a stale server entry
4. confirm tools appear in the aggregated catalog

In the current workspace, step 4 is still failing because the fleet remains in local compat fallback after repair. Debug that runtime path next.

## Previous session update — dashboard/runtime stabilization

The most recent implementation session closed the MCP dashboard runtime regressions that were previously called out here as unresolved.

### What was fixed

- `scripts/dev_tabby_ready.mjs`
  - improved startup readiness detection so the root dev launcher recognizes a live dashboard more reliably during Next.js cold starts
- `scripts/dev_tabby_ready_helpers.mjs`
  - added `isHttpProbeResponsive(...)` so any real HTTP response counts as proof that the web server exists
- `scripts/dev_tabby_ready_helpers.test.ts`
  - added readiness helper regression coverage
- `apps/web/src/utils/TRPCProvider.tsx`
  - removed the forced `methodOverride: 'POST'` from the batched tRPC client, which was causing dashboard query `405 Method Not Allowed` failures
- `apps/web/src/utils/TRPCProvider.test.tsx`
  - added a regression test to keep the query transport aligned
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
  - fixed proxied `mcpServers.bulkImport` handling by normalizing batched payloads to the plain array expected upstream and stripping the upstream `batch` query for that mutation
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - added regression coverage for the bulk import proxy normalization
- `apps/web/src/app/dashboard/cloud-dev/page.tsx`
  - added safe storage wrappers to avoid restricted-context `localStorage` failures

### What was verified

- focused route/provider/runtime tests passed for the touched dashboard transport code
- live replay of `POST /api/trpc/mcpServers.bulkImport?batch=1` returned `200 OK`
- temporary imported MCP server cleanup succeeded through the fixed route path
- current diagnostics on all touched files were clean
- `pnpm -C apps/web build --webpack` completed successfully in this workspace

### Practical status after the fix

- the previously documented MCP dashboard `405` query flood is resolved
- the previously documented `mcpServers.bulkImport` `400` is resolved
- startup/readiness reporting is more truthful, though a fresh end-to-end smoke run is still the next best confidence check

## What I did

I performed a repo-wide status audit focused on the current Borg 1.0 directive from `AGENTS.md`, then updated the canonical planning docs to match the codebase as it exists today.

### Sources reviewed

- root docs: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`, `VERSION`
- backlog/archive docs: `docs/DETAILED_BACKLOG.md`, `docs/PROJECT_STATUS.md`, `docs/HANDOFF.md`
- repo memories:
  - `/memories/repo/dashboard-mvp-validation.md`
  - `/memories/repo/session-supervisor-validation.md`
  - `/memories/repo/web-route-validation.md`
- source inventories and audits across:
  - `packages/core/**`
  - `apps/web/**`
  - `apps/borg-extension/**`
- focused read-only audits for:
  - implemented capabilities vs. stubs
  - dashboard real pages vs. parity/placeholder shells
  - backend routers/services that lack proportional UI representation
- diagnostics:
  - `get_errors` on `apps/web` and `packages/core` returned no active editor errors at audit time

## Files updated in this session

- `ROADMAP.md`
  - replaced the high-level milestone-only text with a reality-based roadmap
  - added a current implementation snapshot and explicit 1.0 blockers
- `TODO.md`
  - created a new canonical, ordered implementation queue at the repo root
- `HANDOFF.md`
  - created this handoff with evidence, findings, and next steps
- `CHANGELOG.md`
  - updated to record the documentation reality-sync pass

## High-confidence findings

### 1) Borg has more real 1.0 infrastructure than the old roadmap admitted

These areas are genuinely implemented enough to count as partial/shipped foundations:

- MCP router / aggregator
- provider routing / fallback chain
- session supervisor
- dashboard home + MCP + sessions + billing + integrations
- memory CRUD/summaries/import-export foundations
- startup readiness contract (`startupStatus`)

### 2) The repo still overstates product breadth

A meaningful portion of the dashboard is not a finished product surface, even when the UI looks polished.

The most important examples:

- `apps/web/src/app/dashboard/super-assistant/page.tsx` — parity/status shell, not full adapter implementation
- `apps/web/src/app/dashboard/autopilot/page.tsx` — iframe wrapper
- `apps/web/src/app/dashboard/webui/page.tsx` — iframe wrapper
- `apps/web/src/app/dashboard/agents/page.tsx` — minimal shell relative to implied ambition
- `apps/web/src/app/dashboard/workflows/page.tsx` — framework present, UX incomplete

### 3) The task workflow documented in `AGENTS.md` is currently broken in practice

- `tasks/active/` is empty
- `tasks/backlog/` is empty

This means implementor agents do not have a canonical work queue unless they infer one from other docs.

### 4) Several backend capabilities are real but not well represented in the UI

The strongest examples found during this audit:

- `packages/core/src/routers/serverHealthRouter.ts`
- `packages/core/src/routers/logsRouter.ts`
- `packages/core/src/routers/lspRouter.ts`
- `packages/core/src/routers/auditRouter.ts`
- `packages/core/src/routers/testsRouter.ts`
- `packages/core/src/routers/contextRouter.ts`
- `packages/core/src/routers/graphRouter.ts`
- `packages/core/src/routers/gitRouter.ts`
- `packages/core/src/routers/savedScriptsRouter.ts`

These should either receive real operator surfaces or be explicitly documented as internal/experimental.

### 5) Memory is real, but claude-mem parity is not

Borg already has:

- memory save/search/list flows
- summaries and prompt memory
- observation capture primitives
- import/export adapters
- a dedicated `claude-mem` parity/status surface

Borg still does **not** have full claude-mem parity for:

- hook lifecycle capture
- progressive disclosure context injection
- transcript compression
- full observation/search/timeline runtime story

The current docs should continue to be careful about this.

## Previously critical issue now resolved

The runtime issue previously tracked here is no longer open:

- `POST /api/trpc/mcp.getStatus?batch=1` no longer fails due to forced POST query transport
- `POST /api/trpc/mcpServers.bulkImport?batch=1` no longer fails due to batched proxy body mismatch

Most relevant files for future maintenance:

- `apps/web/src/utils/TRPCProvider.tsx`
- `apps/web/src/utils/TRPCProvider.test.tsx`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `apps/web/tests/integration/mcp-to-dashboard.test.ts`
- `scripts/dev_tabby_ready.mjs`
- `scripts/dev_tabby_ready_helpers.mjs`
- `scripts/dev_tabby_ready_helpers.test.ts`

## Validation performed during this session

### Diagnostics
- `apps/web` editor diagnostics: clean
- `packages/core` editor diagnostics: clean

### Documentation sanity
- root `HANDOFF.md` did not exist before this session
- root `TODO.md` did not exist before this session
- root `ROADMAP.md` was high-level and no longer reflected the actual breadth of shipped/partial work

## Recommended next implementor moves

1. Run a fresh full root smoke test for the dev flow:
  - `pnpm run dev`
  - confirm launcher readiness, dashboard load, polling, and MCP import flow together
2. Re-seed `tasks/active/` with small briefs for the next 1–3 items.
3. Keep the dashboard honest:
   - either demote parity/iframe pages from the main 1.0 story
   - or finish the smallest subset that materially improves Borg 1.0
4. After the smoke run, choose one of these as the next 1.0 polish pass:
   - session supervisor worktree + attach
   - provider-routing truthfulness
   - health/logs/LSP/tests operator surfaces
5. Consider cleaning ignored/generated workspace churn before relying on git status for future handoffs; the repo currently has heavy dev/build artifact noise.

## Notes for cross-model review

This handoff is designed to be compared against audits from Gemini, Claude, and Codex.

The strongest cross-check areas are:

- whether they agree that Borg 1.0 is already partially real and mainly suffering from product honesty and runtime-alignment issues
- whether they identify the same high-priority mismatch between backend capability and dashboard representation
- whether they agree that the recently fixed MCP dashboard POST compat regression should stay covered by tests and smoke validation
- whether they also flag the empty `tasks/` workflow as a governance failure
>>>>>>> origin/rewrite/main-sanitized
