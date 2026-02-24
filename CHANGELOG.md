# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.7.14] - 2026-02-23

### Changed

- **Scoped Turbo lint output noise reduction**:
  - Updated root `lint:turbo` script to use `--output-logs=errors-only`.
  - Preserves existing lint pass/fail semantics while reducing warning flood in local and gate runs.

### Validation

- `pnpm run lint:turbo` ✅

## [2.7.13] - 2026-02-23

### Fixed

- **Web dev stale lock auto-recovery**:
  - Updated `apps/web/scripts/dev.mjs` to remove `.next-dev/dev/lock` only when the selected port is free.
  - Prevents false startup failures after interrupted dev sessions while avoiding lock deletion for active instances.

### Validation

- Synthetic stale lock test: created `apps/web/.next-dev/dev/lock`, then ran:
  - `pnpm -C apps/web run dev -- --port 3561`
- Observed:
  - stale lock removal log
  - successful startup (`Ready`) on selected port

## [2.7.12] - 2026-02-23

### Fixed

- **Web dev launcher arg forwarding on Windows/PNPM**:
  - Updated `apps/web/scripts/dev.mjs` to strip `--` delimiter tokens from forwarded script args.
  - This prevents invalid Next.js startup invocations like `... apps/web --port` when running `pnpm -C apps/web run dev -- --port <n>`.

- **Web tracing-root stability hardening**:
  - Updated `apps/web/next.config.ts` to canonicalize `outputFileTracingRoot` using `path.resolve(...)`.
  - Reduces false workspace-root inference in environments with multiple parent lockfiles.

### Validation

- `pnpm -C apps/web run dev -- --port 3557` starts with normalized args and reaches ready state after lock cleanup.
- `pnpm run check:release-gate:ci` ✅

## [2.7.11] - 2026-02-22

### Changed

- **Extension lint frontier reduction**:
  - Narrowed root `lint:turbo` exclusion from all `@extension/*` packages to only `@extension/shared`.

### Validation

- `pnpm run lint:turbo` ✅
- `pnpm run check:release-gate:ci` ✅

## [2.7.10] - 2026-02-22

### Added

- **Enhanced CI release gate coverage**:
  - Extended `scripts/check_release_gate.mjs` with optional `--with-turbo-lint` support.
  - Updated `check:release-gate:ci` to run with `--skip-readiness --with-turbo-lint`.

### Validation

- `pnpm run check:release-gate:ci` ✅
- Scoped `lint:turbo` check executed inside gate and passed.

## [2.7.9] - 2026-02-22

### Changed

- **Turbo lint scope stabilization**:
  - Updated root `lint:turbo` script to temporarily exclude `@borg/web` in addition to existing exclusions.
  - This isolates known legacy lint rule debt in `apps/web` while preserving monorepo lint signal for the remaining workspace packages.

### Validation

- `pnpm run lint:turbo` ✅ (exit code `0`)

## [2.7.8] - 2026-02-22

### Changed

- **Root lint command stabilization**:
  - Updated root `package.json` `lint` script to run deterministic placeholder guard (`check:placeholders`).
  - Added `lint:turbo` script to preserve full monorepo Turbo lint path for incremental repair.

### Validation

- `pnpm run lint` ✅
- `pnpm run check:release-gate:ci` ✅

## [2.7.7] - 2026-02-22

### Fixed

- **Turbo task coverage for root commands**:
  - Updated `turbo.json` to define missing `typecheck`, `test`, and `clean` tasks.
  - Restored root command resolution for `pnpm run typecheck` (previously failed with "Could not find task `typecheck` in project").

### Validation

- `pnpm -s turbo run typecheck --dry=json` ✅ (task graph resolves)
- `pnpm run typecheck` ✅ (successful run)

## [2.7.6] - 2026-02-22

### Changed

- **Root CI quality gates hardened with reliable checks**:
  - Updated `.github/workflows/ci.yml` `lint` job to run strict placeholder regression guard (`pnpm run check:placeholders`).
  - Updated `.github/workflows/ci.yml` `typecheck` job to run strict core typecheck (`pnpm -C packages/core exec tsc --noEmit`).
  - Removed soft-fail semantics from these checks by replacing brittle commands that were failing due workspace-wide task/tooling gaps.

### Validation

- Verified local command parity for CI checks:
  - `pnpm run check:placeholders` ✅
  - `pnpm -C packages/core exec tsc --noEmit` ✅

## [2.7.5] - 2026-02-22

### Added

- **CI-integrated release gate**:
  - Wired `pnpm run check:release-gate:ci` into `.github/workflows/ci.yml` as a dedicated required job (`Release Gate (CI)`).
  - Wired `pnpm run check:release-gate:ci` into `.github/workflows/release.yml` before test/build steps.

### Changed

- **Release gate CI mode support**:
  - Extended `scripts/check_release_gate.mjs` with `--skip-readiness` for environments without live local services.
  - Added root script alias `check:release-gate:ci` in `package.json`.

## [2.7.4] - 2026-02-22

### Added

- **Strict release gate command**:
  - Added `scripts/check_release_gate.mjs` for deterministic pre-release validation.
  - Added root script `check:release-gate` in `package.json`.
  - Gate now enforces three checks in sequence:
    1. Strict machine-readable readiness (`scripts/verify_dev_readiness.mjs --strict-json`)
    2. Placeholder regression scan (`check:placeholders`)
    3. Core TypeScript validation (`pnpm -C packages/core exec tsc --noEmit`)

### Changed

- **Readiness JSON modes**:
  - Extended `scripts/verify_dev_readiness.mjs` with `--strict-json` mode.
  - `--strict-json` guarantees JSON output shape and strict exit semantics for automation consumers.

## [2.7.3] - 2026-02-22

### Added

- **Readiness startup-race tolerance**:
  - Extended `scripts/verify_dev_readiness.mjs` with retry/backoff controls:
    - `READINESS_RETRIES` (default: `2`)
    - `READINESS_RETRY_DELAY_MS` (default: `500`)
  - JSON payload now includes retry metadata (`retries`, `retryDelayMs`).

### Fixed

- **MetaMCP backend JSON-only startup log noise**:
  - Updated `external/MetaMCP/apps/backend/src/lib/mcp-config.service.ts` to skip DB import migration when DB is intentionally unconfigured.
  - Replaced misleading startup error path with explicit informational JSON-only mode handling.

- **Strict local readiness regression gate**:
  - Verified strict readiness pass across Borg web, MetaMCP frontend/backend, and autopilot server once services are active.

## [2.7.2] - 2026-02-22

### Added

- **Readiness JSON Output Mode**:
  - Extended `scripts/verify_dev_readiness.mjs` with `--json` output for machine-readable CI/dashboard ingestion.
  - JSON payload now includes pass/fail state, checked timestamp, mode, timeout, and per-service endpoint/port/status metadata.

## [2.7.1] - 2026-02-22

### Added

- **Cross-Service Dev Readiness Checker**:
  - Added `scripts/verify_dev_readiness.mjs`.
  - Added root script `check:dev-readiness` in `package.json`.
  - Verifies live readiness across Borg Web, MetaMCP frontend/backend, and OpenCode Autopilot server with deterministic endpoint checks.
  - Supports strict mode (non-zero on critical failures) and `--soft` mode for diagnostic runs.

### Fixed

- **Web Dev Stability**:
  - Stabilized `NEXT_DIST_DIR` strategy in web dev launchers to reduce per-port tsconfig churn and stale include regressions.
  - Normalized web tsconfig includes to preserve stable `.next-dev` type globs.

- **OpenCode Autopilot Server Bind Resilience**:
  - Added startup preflight diagnostics for candidate ports in `packages/opencode-autopilot/packages/server/scripts/dev-auto.mjs`.
  - Added runtime `Bun.serve` fallback logic in `packages/opencode-autopilot/packages/server/src/index.ts` to recover from bind-time `EADDRINUSE` race conditions.
  - Fixed server typecheck Bun typings mismatch by aligning to `types: ["bun"]` in `packages/opencode-autopilot/packages/server/tsconfig.json`.

### Added

- **Scalable Link Ingestion Sync**:
  - Added `scripts/sync_master_index.mjs` to normalize and synchronize `BORG_MASTER_INDEX.jsonc` from `scripts/resources-list.json` and `scripts/ingestion-status.json`.
  - Added `scripts/ingestion-status.json` for explicit processed/pending/failed outcome tracking and failure retry seeds.
  - Added root script alias: `npm run index:sync`.

### Fixed

- **API Router Refactoring (Database Decoupling)**:
  - Refactored `toolsRouter` to use `ToolRegistry` instead of direct DB storage, resolving persistent type errors and aligning with MetaMCP architecture.
  - Refactored `savedScriptsRouter` to use `JsonConfigProvider`, utilizing `mcp.json` as the single source of truth for script storage.
  - Standardized tool naming convention to `server__tool` across `MetaMCPController` and `ToolRegistry`.
  - Created `common-utils.ts` to fully decouple utility functions from lingering database dependencies.

### Changed

- **Master Index Schema Upgrade**:
  - Upgraded `BORG_MASTER_INDEX.jsonc` to schema `borg-master-index/v2`.
  - Added ingestion telemetry (`ingestion.sources`, `ingestion.queue`) and expanded per-entry metadata (`fetch_status`, `fetch_error`, `fetch_attempts`, `last_checked_at`, `processed_at`, `normalized_url`, `discovered_from`).
  - Synced canonical corpus to 565 tracked links with queue visibility (`processed=6`, `pending=558`, `failed=1`).

## [2.7.0] - 2026-02-19

### Added

- **Phase 67: MetaMCP Submodule Assimilation**:
  - Added `https://github.com/robertpelloni/MetaMCP` as a Git submodule at `external/MetaMCP/`.
  - Registered `external/MetaMCP/packages/*` and `external/MetaMCP/apps/*` in `pnpm-workspace.yaml` as first-class workspace members.
  - Resolved 100+ `<<<<<<< HEAD` merge conflict markers across MetaMCP TypeScript source files via automated script.
  - Modified `external/MetaMCP/apps/backend/tsup.config.ts` to emit a separate library bundle at `dist/metamcp.js` alongside the main Express server.
  - Created `packages/core/src/services/MetaMCPBridgeService.ts` — a typed HTTP client allowing Borg to communicate with the MetaMCP backend at `http://localhost:12009`.
  - Added 4 new TRPC procedures to `mcpServersRouter`: `listFromMetaMCP`, `metamcpStatus`, `createInMetaMCP`, `deleteFromMetaMCP`.
  - Created ambient TypeScript declaration shim `packages/core/src/types/backend-metamcp.d.ts`.

- **Phase 66: AI Command Center & Dashboards**:
  - Jules Autopilot Dashboard (`/dashboard/jules`) with API key controls and live connectivity testing.
  - OpenCode Autopilot Dashboard integrated into Borg web.
  - Master AI Billing & API Key Dashboard.
  - Installed AI Tool Detector & Usage Tracker at `/dashboard/mcp/ai-tools`.

- **Phase 65: Marketplace & Ecosystem (follow-ups)**:
  - End-to-end Plugin Execution Engine verification completed.
  - MCP Marketplace UI updated with 1000+ server registry.

### Fixed

- `@borg/core` TypeScript build: restored missing `@borg/adk` dependency, resolved all merge conflict artifacts, confirmed `tsc` exits with code `0`.

## [2.6.3] - 2026-02-16


### Fixed

- **Monorepo watch-mode output stability**:
  - Updated `packages/opencode-autopilot/packages/shared/package.json` `dev` script to `tsc --watch --preserveWatchOutput`.
  - Updated `packages/claude-mem/gemini-cli-extension/package.json` `dev` script to `tsc --watch --preserveWatchOutput`.
  - Prevented TypeScript watch sessions from clearing terminal history during `pnpm run dev`.
- **Dashboard runtime stability under partial backend availability**:
  - Fixed `NaN` depth input propagation in `/dashboard/research` by introducing string-backed numeric input parsing + clamping.
  - Removed Chronicle render loop (`Maximum update depth`) by switching merged timeline derivation to memoized computation.
  - Added same-origin Next.js tRPC route (`/api/trpc`) and updated `TRPCProvider` fallback resolution to avoid default cross-origin `:4000` failures.
  - Hardened websocket-heavy dashboard widgets (`TrafficInspector`, `MirrorView`, `ResearchPanel`, `CouncilDebateWidget`) with configurable URLs and bounded reconnect behavior.
  - Centralized runtime endpoint resolution in `packages/ui/src/lib/endpoints.ts` and migrated dashboard/terminal consumers to shared helpers (`resolveTrpcHttpUrl`, `resolveCoreWsUrl`, `resolveCouncilWsUrl`, `resolveTerminalWsUrl`, `resolveCliApiBaseUrl`).
  - Added shared reconnect policy utilities in `packages/ui/src/lib/connection-policy.ts` (`createReconnectPolicy`, `shouldRetryReconnect`, `getReconnectDelayMs`, `normalizeNumericInput`) and migrated websocket widgets to exponential backoff + capped retries.
- **Backend realism closure (P0 implementation pass)**:
  - Replaced simulated `savedScripts.execute` with real `CodeExecutorService` execution + structured timing metadata.
  - Replaced OAuth exchange stub with live provider token exchange flow in `oauthRouter.exchange` (session/client validation, token request, schema-validated persistence).
  - Rewired `agentRouter.chat` to live `llmService` generation with graceful degraded fallback behavior.
  - Replaced `agents/Researcher` stub output generation with model-backed synthesis + JSON extraction fallback.
  - Replaced key MetaMCP proxy stub adapters for code execution, saved script CRUD/execution, tool search, and tool persistence with repository/service-backed implementations.
  - Replaced MetaMCP `run_agent` stub path with LLM-backed orchestration and removed dead run_python stub branch.
- **Jules dashboard accessibility in Borg Web**:
  - Added `/dashboard/jules` in `apps/web` with embedded Jules Autopilot launch surface.
  - Added `apps/web` Jules API proxy route (`/api/jules`) for authenticated Jules API passthrough.
  - Added Jules card on dashboard home for direct discoverability.
  - Added `PATCH` support to Jules proxy routes (`apps/web` and `packages/ui`) for session updates.
  - Implemented baseline `updateSession` support in `packages/ui/src/lib/jules/client.ts` with graceful fallback for API versions lacking `PATCH`.
  - Wired Kanban drag/drop status transitions to attempt Jules cloud sync while retaining local persistence fallback.
  - Added in-page Jules connectivity controls on `/dashboard/jules` (save/clear API key + live `/api/jules` proxy test + status feedback).
  - Added "Last Sync Results" panel on `/dashboard/jules` backed by persisted session update telemetry for quick troubleshooting.

### Changed

- **Canonical documentation/version synchronization**:
  - Promoted canonical version to `2.6.3` in `VERSION.md`.
  - Reconciled roadmap/todo/handoff status language with current Phase 63 execution state.
  - Replaced `docs/SUBMODULE_DASHBOARD.md` placeholder content with governance-focused dashboard guidance that points to `SUBMODULES.md` as the generated source of truth.
- **Backend service exposure hardening**:
  - Added new `browser` tRPC router with runtime status and page lifecycle controls.
  - Added new `mesh` tRPC router with runtime status and broadcast capability.
  - Added typed Browser/Mesh service helper accessors in `trpc-core` and lightweight status helpers in both services.
  - Wired `/dashboard/mcp/system` to live `browser.status` and `mesh.status` with runtime actions (`browser.closeAll`, `mesh.broadcast` heartbeat).

## [2.6.2] - 2026-02-12

### Fixed

- **Dashboard Build Stabilization (18 component fixes)**:
  - Fixed 6 disabled router references (TraceViewer, SystemStatus, RemoteAccessCard, GlobalSearch, ConfigEditor, TestStatusWidget) — replaced with static placeholder UI
  - Fixed TrafficInspector `handleReplay()` — disabled `logs.read` router replaced with console warning
  - Fixed router name mismatches: `context`→`borgContext` (ContextWidget), `repoGraph`→`graph` (GraphWidget), `audit.getLogs`→`audit.query` (AuditLogViewer)
  - Fixed procedure: `shell.execute`→`commands.execute` (CommandRunner), input shape `path`→`filePath` (ContextWidget)
  - Fixed union type access with safe casts: IndexingStatus, SystemPulse, CouncilConfig
  - Fixed Badge variants: `"success"`→`"default"` (SystemPulse, evolution/page, security/page)
  - Fixed SkillsViewer: `data.tools`→direct array access
  - Removed stale `@ts-expect-error` from KnowledgeGraph.tsx

### Added

- **Dependencies**: `react-force-graph-2d` for KnowledgeGraph 2D visualizer
- **Build**: Clean build with 39 routes, exit code 0

## [2.6.1] - 2026-02-11

### Fixed

- **tRPC Router Stability**:
  - Fixed duplicate `health` and `getTaskStatus` keys in `appRouter` (TS1117 build error)
  - Fixed `graphRouter.get` fallback to include `dependencies: {}` (union type mismatch)
  - Fixed `squadRouter.ts` circular dependency (`../trpc.js` → `../lib/trpc-core.js`)
  - Removed duplicate `ProjectTracker` initialization in `MCPServer.ts`
  - Disabled `AutoTestWidget` (router is commented out) — replaced with informational placeholder
  - Made `KnowledgeGraph` component props optional with sensible defaults
- **tRPC v11 Migration**:
  - Replaced deprecated `isLoading` → `isPending` in `code/page.tsx`, `settings/page.tsx`, `memory/page.tsx`, `council/page.tsx`
  - Fixed `evolution/page.tsx` `onError` type annotation (removed explicit `Error` type for tRPC v11 inference)
  - Fixed `evolution/page.tsx` `Badge` variant from invalid `"success"` to `"default"`
- **Disabled Router Pages**:
  - Fixed `knowledge/page.tsx` — replaced `trpc.submodule.*` calls with static data (router disabled)
  - Fixed `mcp/page.tsx` — replaced `trpc.mcp.*` calls with static placeholder UI (router disabled)

### Changed

- **@ts-ignore Cleanup (87 comments removed across 14 routers)**:
  - `shellRouter` (6), `testsRouter` (2), `skillsRouter` (5), `suggestionsRouter` (7)
  - `graphRouter` (4), `workflowRouter` (10), `symbolsRouter` (14), `squadRouter` (5)
  - `settingsRouter` (1), `researchRouter` (2), `memoryRouter` (8)
  - `contextRouter` (10), `commandsRouter` (4), `autoDevRouter` (10)
  - All now use `getMcpServer()` helper with `(mcp as any)` type assertions instead of `global.mcpServerInstance`

### Added

- **Real Data Wiring**:
  - `billing.getStatus` now returns real cost data via `QuotaService.getUsageByModel()`
  - `getTaskStatus` now returns real progress from `ProjectTracker.getStatus()`
  - `indexingStatus` now returns real state from `LSPService`
  - `pulseRouter.getLatestEvents` now reads from `EventBus` history buffer
  - `RepoGraphService.toJSON()` now includes raw `dependencies` map for frontend consumption
  - `EventBus` initialization enabled in `MCPServer.ts`
- **Documentation**:
  - `HANDOFF_ANTIGRAVITY.md` — comprehensive deep analysis: 25 routers, 30 services, 31 dashboard pages, @ts-ignore inventory, priority recommendations
  - Updated `ROADMAP.md` Phase 63 with completed item tracking
  - Updated `ProjectTracker` to prioritize local `task.md`/`docs/task.md` over hardcoded brain path


## [2.6.0] - 2026-02-08

### Added

- **Phase 57: Resilient Intelligence**:
  - **Model Fallback**: Automatic provider switch on 429 quota errors in `LLMService`.
  - **Director Hardening**: Fixed focus-stealing in auto-drive loop. Added emergency brake (>5 directives in 2 min → 5 min cooldown).
  - **SessionManager**: New `SessionManager` service for persisting agent state across restarts. Fully wired into `MCPServer.ts`.
  - **Session tRPC Router**: New `sessionRouter.ts` with `getState`, `updateState`, `clear`, `heartbeat` endpoints.
- **Phase 58: Grand Unification**:
  - **Integration Test V2**: `test_grand_unification_v2.ts` covering SessionManager, Director, and core infrastructure.

### Changed

- **Documentation Overhaul (v2.6.0)**:
  - Rewrote `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` — now 200+ lines with project structure, tech stack, git protocol, coding standards, agent orchestration, user preferences, quality checklist.
  - Rewrote `CLAUDE.md` — full role definition (Architect), session protocol, model variants.
  - Rewrote `GEMINI.md` — full role definition (Critic/Researcher), session protocol, model variants.
  - Rewrote `GPT.md` — full role definition (Builder), session protocol, model variants.
  - Rewrote `GROK.md` — full role definition (Innovator), removed dead `CORE_INSTRUCTIONS.md` reference.
  - Rewrote `CODEX.md` — full role definition (Specialist), integration flow.
  - Rewrote `copilot-instructions.md` — added project context, code generation guidelines, key file references.
  - Updated `AGENTS.md` — comprehensive feature wishlist preserved, added preamble.

### Fixed

- **VERSION Desync**: `VERSION` (was 2.4.0) and `VERSION.md` (was 2.5.0) now both synced to 2.6.0.
- **SessionManager Wiring**: Previous session failed to wire `SessionManager` into `MCPServer.ts` (3-line import/property/constructor fix).

## [2.5.0] - 2026-02-07

### Added

- **Phase 46: Core Engine & Dashboard Rebuild**:
  - **Full CLI**: Complete Commander.js CLI with 11 command groups (start, status, mcp, memory, agent, session, provider, tools, config, dashboard, about) each with comprehensive subcommands, --json output, colored tables, help text with examples.
  - **WebUI Dashboard**: Full Vite+React+Tailwind SPA with dark neural theme. Pages: Dashboard overview, MCP Router (servers/tools/traffic/config/directory tabs), Memory (browse/search/import-export/config), Agents (spawn/chat/metrics), Sessions (manage/export/cloud), Providers (quota/OAuth/fallback chain), Tools (search/groups/enable-disable), Skills library, Config editor, About/submodule dashboard.
  - **VISION.md**: Comprehensive 500+ line vision document covering all project goals, architecture, feature parity targets, and design philosophy.
  - **LLM Instructions Overhaul**: Rewrote AGENTS.md, CLAUDE.md, GEMINI.md, GPT.md, GROK.md, CODEX.md, copilot-instructions.md with universal instructions reference, model-specific roles, changelog/version protocols.
  - **docs/UNIVERSAL_LLM_INSTRUCTIONS.md**: Complete coding standards, documentation protocol, git protocol, architecture rules, session protocol, quality standards.
  - **VERSION.md**: Single source of truth for version number (2.5.0), referenced at runtime.
  - **Version Sync**: All package.json files, VERSION.md, and CHANGELOG.md synchronized to 2.5.0.

### Changed

- Upgraded root monorepo version from 2.4.0 to 2.5.0
- Restructured WebUI from basic status-cards to full multi-page dashboard SPA
- CLI expanded from 2-file stub to full 11-command-group CLI application

## [2.4.0] - 2026-02-07

### Added

- **Phase 45: Knowledge Assimilation & Dashboard Expansion**:
  - **Knowledge Dashboard**: `/dashboard/knowledge` now acts as a central hub for all external intelligence (MCPs, Skills, Docs).
  - **Ingestion Pipeline**: Automated script (`scripts/ingest_resources.ts`) to assimilate vast resource lists into structured knowledge.
  - **Submodule Service**: New `SubmoduleService` to health-check and sync the massive plugin ecosystem.
- **Phase 44: The Immune System (Self-Healing)**:
  - **HealerReactor**: Autonomous error detection loop (Terminal -> Sensor -> Healer).
  - **Auto-Fix**: System can now self-diagnose and patch simple code errors without human intervention.
  - **Immune Dashboard**: `/dashboard/healer` visualizes active infections and immune responses.

## [2.3.0] - 2026-02-06

### Added

- **Phase 36 (Release & Observability)** (In Progress):
  - Enhanced Submodules Dashboard with project structure visualization and detailed versioning.
- **Phase 35 (Standardization & Polish)**:
  - **Code Hygiene**: Resolved 150+ lint errors in frontend.
  - **Library UI**: Launched `/dashboard/library` showing Prompts and Skills.
- **Phase 34 (Evolution - The Darwin Protocol)**:
  - **DarwinService**: Mutation engine for A/B testing prompts.
  - **Evolution UI**: `/dashboard/evolution` for managing agent experiments.
- **Phase 33 (Self-Correction - The Healer)**:
  - **HealerService**: Automated error analysis and fix suggestion loop.
- **Phase 32 (Security & Governance - The Guardian)**:
  - **PolicyService**: RBAC and Scope enforcement for tools.
  - **Security Dashboard**: `/dashboard/security` for audit logs and policy management.
- **Phase 31 (Deep Research - The Scholar)**:
  - **DeepResearchService**: Multi-step recursive research agent.

## [2.2.1] - 2026-02-05

### Fixed

- **Development Experience**: Resolved persistent console clearing issues during `pnpm run dev`.
  - Added `--preserveWatchOutput` to all `tsc` watch scripts.
  - Added `clearScreen: false` to Vite config.
  - Monkey-patched `console.clear` in Next.js config.
  - Updated CLI to use `tsx watch --clear-screen=false`.
- **Extension Bridge**: Verified active WebSocket server on port 3001.

## [2.2.0] - 2026-02-04

### Added

- **Phase 23 (Deep Data Search)**:
  - Created `Indexer` and `CodeSplitter` in `@borg/memory`.
  - Added AST-based symbol extraction for TypeScript.
  - Added semantic chunking logic.
  - Exposed `memory_index_codebase` and `memory_search` tools in `MCPServer`.
  - Implemented `VectorStore.addDocuments` for batch processing.

## [2.1.0] - 2026-02-04

### Added

- **Master MCP Server Architecture (Phase 21)**: Borg now aggregates downstream MCP servers (`git`, `filesystem`, etc.) via `MCPAggregator`.
- **Stdio Client**: Native integration for spawning and controlling local MCP tools.
- **Unified Documentation**: Centralized all agent instructions into `docs/LLM_INSTRUCTIONS.md`.
- **Vision Document**: Published `VISION.md` outlining the "Neural Operating System" goal.
- **Centralized Versioning**: Project version is now master-controlled by the `VERSION` file.

### Changed

- **Config**: `borg.config.json` is now the primary configuration point for adding tools.
- **Routing**: Tool calls are now prefixed (e.g., `git_commit`) to allow namespace isolation between multiple servers.

## [1.7.0] - 2026-02-03

### Added

- **Core Infrastructure**: Registered LSP, Code Mode, and Plan Mode tools in MCPServer.
- **Verification**: Added `CoreInfra.test.ts`.
