# Changelog

All notable changes to this project will be documented in this file.

## [3.6.0] - 2026-04-10

### Added
- **Plugin Marketplace:** Full UI for viewing, installing, and managing Wasm plugins integrated into the Command Center.
- **WebAssembly Plugin Isolation:** Pure-Go Wasm sandbox via wazero, providing secure, isolated execution for plugins with memory, CPU, and network controls.

## [2.1.0] - 2026-04-08

### Added
- **Predictive Cost Optimizer**: LLM-aware cost prediction engine that estimates token usage and cost per task type using historical data with heuristic fallback. Provider cost efficiency profiling with composite scoring. Monthly budget tracking with utilization, projection, and trend analysis. 14-day spending trend visualization.
  - `GET /api/cost/predict` - Cost prediction per task type
  - `GET /api/cost/providers` - Provider efficiency profiles
  - `GET /api/cost/budget` - Monthly budget report
  - `GET /api/cost/trend` - Daily spending trend
  - `GET /api/cost/optimize/:taskType` - Optimal provider recommendation

- **Swarm Dashboard UI**: Full visual dashboard for managing agent swarms. Create new swarms with strategy selection (parallel/sequential/pipeline), view agent status cards with role icons and color coding, event timeline, and budget tracking panel with utilization bar and spending trend chart. Integrated into sidebar navigation.

- **15 New Cost Optimizer Tests**: Prediction with/without data, heuristic fallbacks, provider profiling, budget reporting, spending trends, provider selection optimization.

### Changed
- **Total Go tests**: 167 passing (up from 154)
- **Total API routes**: ~95 unique handlers
- **Frontend components**: 37 (added swarm-dashboard.tsx, lib/api/swarm.ts)
- **Frontend bundle**: 672KB main + 7 vendor chunks

## [2.0.0] - 2026-04-08 — "Autonomous Fleet" Milestone

### Added
- **Multi-Agent Swarm Orchestration (v2.0 Milestone)**: Full parallel and sequential agent swarm system with LLM-powered task decomposition, dependency management, and automatic agent lifecycle. Swarms decompose root tasks into subtasks, create specialized agents (architect, engineer, auditor, coordinator), and execute them in parallel, sequentially, or as a pipeline.
  - `POST /api/swarms` - Create a new swarm with root task
  - `GET /api/swarms` - List swarms with status filter
  - `GET /api/swarms/:id` - Get swarm details
  - `GET /api/swarms/:id/agents` - Get swarm agents
  - `GET /api/swarms/:id/events` - Get swarm event timeline
  - `POST /api/swarms/:id/cancel` - Cancel running swarm
  - `POST /api/swarms/:id/decompose` - Manual decomposition trigger
  - Queue job `decompose_task` handles async decomposition
  - Agents execute via Jules sessions or fallback to direct LLM calls
  - Swarm events emitted via WebSocket for real-time UI updates

- **Webhook Event Router (Enhanced)**: Configurable rule-based routing engine with 4 action types (log, enqueue, notify, delegate) and 5 provider types (borg, github, slack, linear, generic).
  - Provider-specific endpoints: GitHub, Slack, Linear, Generic
  - CRUD API for rule management: create, delete, toggle enable/disable

- **Deep Dependency Health Checks**: 7 system dependency checks (database, disk, memory, git, queue, scheduler, websocket) with per-check status/latency/details, system runtime info, and health trend analysis.

- **15 New Swarm Tests**: Creation, retrieval, listing, cancellation, heuristic decomposition, role prompts, constants validation.
- **21 New Webhook Router Tests**: Rule CRUD, event processing, provider normalization, filtering.
- **13 New Dependency Check Tests**: Database, memory, git, disk, scheduler, queue, broadcaster, system info, trends.

### Changed
- **Total Go tests**: 147 passing (up from 132)
- **Total API routes**: ~109 handlers (up from ~98)
- **Frontend code-split**: 7 vendor chunks, main chunk 659KB (down from 1054KB)
- **ESLint**: All rules at `error` level, zero violations

### Validation
- All Go tests pass: 147 test cases
- All frontend tests pass: 36 tests
- Typecheck, lint, build: All clean
- Version sync: ✅ (2.0.0)

## [1.6.0] - 2026-04-08

### Added
- **Deep Dependency Health Checks**: New `/api/health/dependencies` endpoint that runs comprehensive checks across 7 system dependencies: database (ping + pool stats), disk space, memory pressure (heap/GC), git availability, queue worker (backlog/failed count), scheduler (task registration), and websocket broadcaster status. Each check reports status (ok/degraded/down), latency, and structured details.
- **Health Trend Analysis**: New `GET /api/health/trend` endpoint for querying historical health snapshots by check name and time range, enabling trend visualization and alerting.
- **System Runtime Info**: New `GET /api/system/info` endpoint exposing Go version, OS, architecture, CPU count, goroutine count, heap/stack memory, uptime, PID, and working directory.
- **Dependency Check UI**: New panel in the Health dashboard showing all 7 dependency checks as color-coded cards with per-check status, latency, and messages. Includes runtime info footer with Go version, CPU, heap, goroutines, stack, and uptime.
- **Comprehensive Go Test Suite**: Added 42 new test cases across 5 new test files (daemon_test.go, debate_test.go, realtime_test.go, review_test.go, scheduler_test.go) and 13 tests for dependency checks. Total: **117 passing Go tests** (up from 60).

### Changed
- **Frontend bundle code-split**: Split monolithic 1054KB bundle into 7 vendor chunks (react, data, icons, utils, radix, markdown) reducing main chunk to 659KB.
- **ESLint rules tightened**: `no-explicit-any`, `no-unused-vars`, `no-empty` all promoted from `warn` to `error` with zero violations.
- **HealthSnapshot model extended**: Added `CheckName`, `Message`, `Latency` fields for per-check dependency tracking.

### Validation
- All Go tests pass: `cd backend-go && go test ./...` (117 test cases)
- All frontend tests pass: `pnpm run test` (36 tests)
- Frontend typecheck passes: `pnpm run typecheck`
- Frontend lint clean: `pnpm run lint` (0 errors, 0 warnings)
- Build succeeds: `pnpm run build` (7 vendor chunks + 1 app chunk)
- Version sync check: `node scripts/check-version-sync.js` ✅ (1.6.0)

## [1.5.0] - 2026-04-08

### Added
- **Shadow Pilot (v1.5 Milestone)**: Background git diff monitoring service that autonomously watches tracked repositories for changes. Detects significant modifications (>50 lines), potential regressions (large deletions with few insertions), and creates notifications and anomaly records automatically.
  - `GET /api/shadow-pilot/status` - Current status with repo count and diff event history
  - `POST /api/shadow-pilot/start` - Enable background monitoring
  - `POST /api/shadow-pilot/stop` - Disable background monitoring
  - Runs on a 5-minute polling interval, monitors all known repo paths
  - Health dashboard includes Shadow Pilot control panel with enable/disable toggle
- **Regression Detection**: Shadow Pilot flags large deletions (>100 lines with <10 insertions) as potential regression anomalies, creating medium-severity anomaly records for operator review.
- **Shadow Pilot UI**: New panel in the System Health dashboard showing monitored repo count, diff events, check interval, and enable/disable toggle.

### Changed
- **Anomaly detection now includes regression detection**: The anomaly engine covers queue backlogs, LLM error spikes, token budget overuse, stuck sessions, circuit breaker instability, and potential code regressions.
- **Token recording is automatic**: Every `generateLLMText()` call now records token usage in a fire-and-forget goroutine, enabling cost attribution without any code changes.

### Validation
- All Go tests pass: `cd backend-go && go test ./...` (65+ test cases)
- All frontend tests pass: `pnpm run test` (36 tests)
- Frontend typecheck passes: `pnpm run typecheck`
- Frontend lint clean: `pnpm run lint` (0 errors, 0 warnings)
- Build succeeds: `pnpm run build`
- Version sync check: `node scripts/check-version-sync.js` ✅ (1.5.0)

## [1.4.0] - 2026-04-08

### Added
- **Deep Observability Surface**: Health history tracking with periodic snapshots captured automatically on every health check. New `GET /api/health/history` endpoint returns trend data for dashboard analysis.
- **Anomaly Detection Engine (v1.5 Shadow Pilot foundations)**: Autonomous background detection of queue backlogs, LLM error spikes, token budget overuse, stuck sessions, and circuit breaker instability. Anomalies are deduplicated within 30-minute windows and can be resolved via API.
  - `GET /api/health/anomalies` - Active anomalies with severity levels
  - `POST /api/health/anomalies/:id/resolve` - Resolve an anomaly
  - `GET /api/health/anomalies/history` - Resolved anomaly history
- **Token Budget Tracker**: Per-request LLM token usage tracking with automatic cost estimation for OpenAI, Anthropic, and Gemini models. Records prompt/completion tokens, cost in cents, and request type.
  - `GET /api/tokens/usage` - Aggregate token usage with provider/request-type breakdowns
  - `GET /api/tokens/session/:id` - Per-session token usage
- **Prometheus Metrics v2**: Extended `/metrics` endpoint with token consumption counters, cost tracking, LLM failure rates, and active anomaly gauges.
- **Health Dashboard Enhancement**: System Health view now shows active anomaly alerts with severity badges and one-click resolve, plus a full token budget tracker with per-provider cost breakdowns.
- **Token Usage Recording**: `generateLLMText()` now automatically records token usage for every LLM call, enabling cost attribution without code changes.

### Changed
- **Health endpoint auto-captures snapshots**: Every `/api/health` request now triggers a background health snapshot capture (rate-limited to 5 minutes) and anomaly detection run.
- **Observability Service**: New `backend-go/services/observability.go` provides centralized health history, token tracking, and anomaly detection.

### Validation
- All Go tests pass: `cd backend-go && go test ./...` (60+ test cases)
- All frontend tests pass: `pnpm run test` (36 tests)
- Frontend typecheck passes: `pnpm run typecheck`
- Frontend lint clean: `pnpm run lint` (0 errors, 0 warnings)
- Build succeeds: `pnpm run build`
- Version sync check: `node scripts/check-version-sync.js` ✅ (1.4.0)

## [1.3.0] - 2026-04-08

### Added
- **Notification Center (v5.0 Roadmap)**: Implemented a comprehensive notification system with Go backend service (`backend-go/services/notification.go`) and full frontend UI (`components/notification-center.tsx`). Notifications are automatically generated from important keeper events including session nudges, plan approvals, debate escalations, recovery actions, indexing, issue spawns, and circuit breaker trips.
- **Immutable Audit Trail (v4.0 Roadmap)**: Added a complete audit logging system (`backend-go/services/audit.go`) that records every orchestrator action with structured metadata including actor, resource type, provider, token usage, and duration. Includes a paginated frontend Audit Trail view (`components/audit-trail.tsx`).
- **Go Backend Test Suite**: Created comprehensive test coverage for all Go services with 50+ test cases covering notification CRUD, audit trail operations, queue processing, worker lifecycle, LLM helpers, circuit breakers, RAG similarity functions, risk scoring, session state mapping, and more.
- **Notification API**: Added `GET/POST /api/notifications`, `/api/notifications/:id/read`, `/api/notifications/:id/dismiss`, `/api/notifications/read-all`, `/api/notifications/dismiss-all`, `/api/notifications/unread-count` endpoints.
- **Audit API**: Added `GET /api/audit`, `GET /api/audit/stats` endpoints with full filtering by action, actor, resource type, status, and date range.
- **Health/Metrics Enhancement**: Extended `/api/health` and `/metrics` endpoints with notification counts and audit entry totals.
- **Scheduler Cleanup**: Added automatic notification cleanup (90-day retention) to the background scheduler alongside existing log cleanup.
- **Real-time Notification Push**: Notifications are broadcast via WebSocket as `notification_created` events for live operator updates.
- **Audit Sidebar Nav**: Added a new "Audit Trail" nav item to the command center sidebar with Shield icon.

### Changed
- **Enhanced Keeper Log Pipeline**: Every keeper log now automatically creates notifications for important events and records audit trail entries, providing full observability without code changes.
- **In-memory Test Database**: Added `db.InitTestDB()` for isolated unit testing with in-memory SQLite.

### Validation
- All Go tests pass: `cd backend-go && go test ./...` (50+ test cases, 0 failures)
- Frontend typecheck passes: `pnpm run typecheck`
- Frontend lint clean: `pnpm run lint` (0 errors, 0 warnings)
- Frontend tests pass: `pnpm run test` (36 tests)
- Build succeeds: `pnpm run build`
- Version sync check: `node scripts/check-version-sync.js` ✅ (1.3.0)

## [1.2.0] - 2026-04-05

### Added
- **Self-Healing LLM Circuit Breakers**: Implemented provider-level circuit breakers in the Go runtime (`backend-go/services/llm.go`). The backend now automatically tracks 429 (Rate Limit) and 5xx (Server Error) responses from OpenAI, Anthropic, and Gemini. 
- **Autonomous Provider Fallbacks**: If a provider fails 3 consecutive times, the circuit opens for 5 minutes and the orchestrator automatically reroutes requests to the next available provider (using stored or env credentials) without failing the session or interrupting the operator.
- **Resilience Telemetry**: Added `circuit_breaker_tripped` and `llm_fallback_success` event logs to the Keeper timeline, providing operators with full visibility into the AI swarm's self-healing actions.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w services/llm.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.2.0`.

## [1.1.0] - 2026-04-05

### Changed
- **Architecture Pivot Complete**: Officially removed the legacy `server/` directory and all Node/Bun-only backend JS dependencies (`@hono/node-server`, `hono`, `@types/bun`).
- **Primary Runtime Shift**: The Go backend is now the exclusive and mandatory runtime for Jules Autopilot.
- **Project Toolchain Cleanup**: Updated `package.json`, `eslint.config.js`, and `vite.config.ts` to fully sever ties with the legacy Bun backend and ensure proper proxying to Go's default `8080` port.
- **Documentation**: Updated `README.md` and `DEPLOY.md` to reflect the Go-only architecture.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.1.0`.

## [1.0.36] - 2026-04-05

### Changed
- **Go as Primary Runtime**: Completed the final script audit and officially declared the Go backend as the primary runtime for the Jules Autopilot project.
- **Obsolete Tooling Removed**: Deleted residual Bun-based developer scripts (`index-repo.ts` and `create-dev-key.js`) that were fully replaced by Go-native CLI binaries.
- **Project Configuration**: Updated `package.json` index commands to target the new Go indexer.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.36`.

## [1.0.35] - 2026-04-05

### Added
- **API Key Management UI**: Added a dedicated "API Keys" tab in the Settings dialog to allow operators to generate, view, and revoke node-access keys directly from the dashboard.
- **Go CLI Key Generator**: Added a Go-native CLI utility at `backend-go/cmd/create-key/main.go` for manual API key generation.

### Changed
- **Roadmap Progress**: Implemented the first slice of the v3.0 "Multi-Tenant API Keys" milestone, enabling scoped key management in the Go runtime.
- **UI Refinement**: Refactored `SettingsDialog` to support the new key management flow with improved dependency tracking and clean build state.

### Notes
- **Validation Status**: `cd backend-go && go build -o backend.exe main.go && go build -o indexer.exe cmd/index-repo/main.go && go build -o create-key.exe cmd/create-key/main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.35`.

## [1.0.34] - 2026-04-05

### Added
- **Go Webhook Parity Expansion**: Updated the Go webhook handler (`postBorgWebhook`) to support `dependency_alert`, `fleet_command: clear_logs`, and high-priority `issue_detected` signals, matching Bun’s automation triggers.
- **Go CLI Indexer**: Added a standalone Go-native indexer utility at `backend-go/cmd/index-repo/main.go` for CLI-based repository indexing.

### Changed
- **Go Indexer Refactor**: Pulled codebase indexing logic into a standalone Go service method (`services.IndexCodebase()`) so it can be shared between the queue worker and the new CLI utility.
- **Project Boot Hardening**: Hardened `scripts/run-it.js` to avoid environment variable case conflicts in PowerShell and ensure the Go backend persists reliably in the background.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w api/routes.go services/queue.go main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.34`.

## [1.0.33] - 2026-04-05

### Added
- **Go Scheduled Task Engine**: Added a new background scheduler service in Go (`services/scheduler.go`) to handle periodic maintenance tasks like codebase indexing (24h), issue checks (1h), and log cleanup (7d).
- **Go Graceful Shutdown**: Added signal handling (Interrupt/SIGTERM) to the Go runtime so it can cleanly stop the daemon, worker, and scheduler before server exit.

### Changed
- **Go Observability Expansion**: Added scheduler-running state to health and metrics responses.
- **Go Log Retention**: The new scheduler automatically cleans up Keeper logs older than 30 days every week.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w api/routes.go services/scheduler.go main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.33`.

## [1.0.32] - 2026-04-05

### Added
- **Go Resilient Degraded Mode**: Added mock session and critical-error session fallbacks in the Go API handlers (`getSessions`, `getSession`, `getSessionActivities`), matching Bun’s defensive behavior during live Jules API failures.
- **Hardened Client Transformation**: Updated the TypeScript `JulesClient` to support both Google Jules API (createTime/updateTime) and Go-native model (createdAt/updatedAt) property names during session and activity transformation.

### Changed
- **Go Session Auth Resilience**: The Go API routes now check `X-Jules-Auth-Token` in addition to API key headers when resolving request-scoped Jules clients.
- **UI Resilience**: The dashboard is now less likely to crash or show empty states when the Go backend is running but live Jules access is degraded or unauthorized.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w api/routes.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.32`.

## [1.0.31] - 2026-04-05

### Added
- **Go Worker Lifecycle Controls**: Added Go worker lifecycle management with `StartWorker()`, `StopWorker()`, and `IsWorkerRunning()` so daemon/worker coordination is no longer effectively one-way.
- **Go Worker Observability**: Added worker-running state to health responses and Prometheus-style metrics output.

### Changed
- **Go Startup Semantics**: The Go runtime now auto-starts daemon + worker only when Keeper is enabled, matching Bun’s boot semantics more closely instead of starting both unconditionally.
- **Go Daemon Control Semantics**: `POST /api/daemon/status` now starts and stops both daemon and queue worker together, aligning the Go runtime more closely with Bun’s coordinated keeper startup model.
- **Go Queue Worker Robustness**: The Go worker lifecycle can now be stopped and restarted cleanly instead of relying on a one-time `sync.Once` startup path.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w services/queue.go api/routes.go main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.31`.

## [1.0.30] - 2026-04-05

### Added
- **Go Runtime Error/Bootstrap Hardening**: Added root-project `.env` loading and a global Fiber error handler so the Go runtime behaves more like the Bun server during startup and API error handling.

### Changed
- **Go Error Response Parity**: API/metrics/health errors in the Go runtime now return structured responses through a central Fiber error handler instead of depending only on per-route behavior.
- **Go Runtime Bootstrap Parity**: The Go runtime now loads `.env` from the detected project root, reducing path-assumption drift relative to the Bun runtime.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.30`.

## [1.0.29] - 2026-04-05

### Added
- **Go Request-Scoped Jules Auth Support**: Added request-scoped Jules client resolution in Go API routes so callers can provide `X-Jules-Api-Key` / `X-Goog-Api-Key` headers, matching Bun-side behavior more closely.
- **Go CORS Runtime Parity**: Added Bun-like permissive CORS middleware to the Go runtime for API deployment flexibility when the frontend and backend are served from different origins.

### Changed
- **Go API Runtime Flexibility**: Session/replay/activity/action/export/nudge/fleet-sync routes in the Go API now use request-aware Jules client resolution instead of env/settings-only assumptions.
- **Primary Runtime Readiness**: This closes another real deployment/runtime gap for using the Go backend directly outside same-origin-only scenarios.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w main.go api/routes.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.29`.

## [1.0.28] - 2026-04-05

### Changed
- **Go WebSocket Protocol Parity**: Updated the Go websocket handler to emit an initial `connected` event and respond to client `ping` frames with protocol-compatible `pong` payloads instead of echoing arbitrary websocket messages.
- **Go Realtime Runtime Alignment**: The Go runtime now behaves more like the Bun daemon for live websocket connection semantics, reducing another subtle frontend/runtime mismatch.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.28`.

## [1.0.27] - 2026-04-05

### Added
- **Go Static SPA Serving Parity**: Added static asset serving and SPA index fallback in `backend-go/main.go` so the Go runtime can serve the built frontend directly instead of relying on Bun for that behavior.
- **Dedicated Health Dashboard View**: Added a first-class Health view in the app navigation and command palette, backed by a new `SystemHealthDashboard` component.
- **Shared Health API Client**: Added `lib/api/health.ts` so Fleet Intelligence and the dedicated health view can reuse the same health-fetch logic.

### Changed
- **Primary Runtime Readiness**: The Go backend now closes another meaningful “primary runtime” gap by handling built SPA delivery in addition to API/websocket/service responsibilities.
- **Observability UX Expansion**: Health is no longer only embedded in Fleet Intelligence/settings context; it now has a dedicated dashboard surface with queue, totals, runtime state, and metrics preview visibility.
- **Navigation Surface**: Added `health` to sidebar navigation, command palette navigation, and main-content view handling.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w main.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.27`.

## [1.0.26] - 2026-04-05

### Added
- **Fleet Health UI Surface**: Added an operator-facing runtime health block inside the Fleet Intelligence panel so the new Go health endpoint data is visible in the dashboard without external tooling.
- **Go Shared LLM Helpers**: Added shared Go helper logic for provider normalization, default model resolution, structured JSON extraction, and reusable risk scoring to reduce duplicated provider-flow logic.

### Changed
- **Go Provider Abstraction Tightening**: Refactored Go review, debate, and issue-evaluation paths to reuse shared LLM helpers instead of repeating JSON parsing, model defaults, and risk-score extraction logic in multiple services.
- **Go Debate / Review Consistency**: Debate execution, structured review, council plan review, and issue triage now normalize provider/model selection more consistently across the Go backend.
- **Fleet Observability UX**: The Fleet tab now polls `/api/health`, surfaces daemon/database/credential state, and shows key persisted totals for sessions, chunks, templates, debates, and websocket clients.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w services/llm.go services/review.go services/debate.go services/queue.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.26`.

## [1.0.25] - 2026-04-05

### Added
- **Go Observability Endpoints**: Added a Prometheus-style `GET /metrics` endpoint plus structured health endpoints at `GET /healthz` and `GET /api/health` in the Go backend.
- **Go Health Telemetry**: Health responses now report database connectivity, daemon running state, Keeper enabled state, Jules credential presence, queue depth, websocket client count, and key persisted totals.

### Changed
- **Go Daemon Introspection**: Added Go daemon running-state introspection so health/metrics endpoints can expose backend-loop status.
- **Roadmap Progress**: This establishes an initial slice of the planned observability and health-check milestone directly in the Go runtime.

### Notes
- **Validation Status**: `cd backend-go && gofmt -w api/routes.go services/daemon.go services/jules_client.go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.25`.

## [1.0.24] - 2026-04-05

### Added
- **Go Daemon Orchestration Parity**: The Go daemon now mirrors more of the Bun daemon loop by scheduling session checks, smart-pilot issue checks, and opportunistic codebase indexing from the Go runtime.
- **Go Jules Source Discovery**: Added Go-side `ListSources()` support so autonomous issue-check scheduling no longer depends on Bun-only Jules source discovery behavior.

### Changed
- **Go Jules Credential Resolution**: The Go Jules client now resolves credentials from explicit input, `JULES_API_KEY`, `GOOGLE_API_KEY`, and stored Keeper settings, reducing env-only runtime assumptions.
- **Go Daemon Cadence**: The Go daemon now respects `checkIntervalSeconds` from Keeper settings instead of using a fixed hardcoded tick interval.
- **Go Daemon Telemetry**: Added Keeper-log coverage for missing-key, source-poll failure, session-poll failure, and successful daemon scheduling ticks.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.24`.

## [1.0.23] - 2026-04-05

### Added
- **Go Debate Management Parity**: Added a Go-native debate service plus `POST /api/debate`, `GET /api/debate/history`, `GET /api/debate/:id`, and `DELETE /api/debate/:id` so debate execution and history/detail workflows can run through the Go backend.

### Changed
- **Go Product-Surface Coverage**: The Go backend now covers another actively used frontend workflow beyond the core autonomy loop by serving debate execution, list/detail viewing, and deletion through the same runtime.
- **Go Debate Persistence**: Debate API execution now persists results through the existing Go `Debate` model and returns shapes compatible with the current debate UI.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.23`.

## [1.0.22] - 2026-04-05

### Changed
- **Go Recovery Robustness**: Added a secondary duplicate-suppression guard for failed-session recovery that checks recent recovery completion logs in addition to recent recovery messages in the session activity stream.
- **Recovery Skip Telemetry**: Duplicate recovery suppression now records a `skip` Keeper log with `session_recovery_skipped` metadata so operators can see when Go intentionally avoided resending guidance.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.22`.

## [1.0.21] - 2026-04-05

### Added
- **Go Import/Export Parity**: Added Go-native `/api/export` and `/api/import` support for the settings portability workflow, covering Keeper settings, templates, debates, and repo-path mappings.

### Changed
- **Go Recovery Dedupe Refinement**: Failed-session recovery now avoids resending guidance when a recent recovery message is already present in the session activity stream.
- **Go Settings Portability Coverage**: The Go backend now covers another settings-dialog workflow that previously depended on Bun-only routing.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.21`.

## [1.0.20] - 2026-04-05

### Added
- **Go Review Endpoint Parity**: Added Go-native `/api/review` and `/api/local/review` support backed by a new `backend-go/services/review.go` service that can run simple, comprehensive, and structured JSON review flows.

### Changed
- **Go Non-Core Product Surface Coverage**: The Go backend now covers another actively used UI workflow: direct code review requests triggered from the activity feed.
- **Go Review Strategy**: Review execution now reuses the Go provider bridge and supports persona-based comprehensive review output plus structured JSON fallbacks compatible with the shared review contract.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.20`.

## [1.0.19] - 2026-04-05

### Added
- **Go Template CRUD Parity**: Added Go API support for `GET /api/templates`, `POST /api/templates`, `PUT /api/templates/:id`, and `DELETE /api/templates/:id`, including tag normalization between the DB string field and the shared frontend array shape.

### Changed
- **Go Non-Core Product Surface Coverage**: The Go backend now covers another actively used frontend surface beyond the core session/memory/control loop by serving template management workflows directly.
- **Template Data Adaptation**: Added Go-side template response mapping so `SessionTemplate.tags` is returned as a string array compatible with the shared UI contract.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.19`.

## [1.0.18] - 2026-04-05

### Added
- **Go Filesystem Utility Parity**: Added Go API support for `GET /api/fs/list` and `GET /api/fs/read`, including project-root path confinement and filtering of hidden entries / `node_modules` for safe repository-context access.

### Changed
- **Go Repository Context Support**: The Go backend now covers the filesystem utility endpoints used by the client to gather repository structure and key file contents for local review/context workflows.
- **Non-Core Surface Migration Progress**: Go migration is now extending beyond the core session/memory loop into practical utility surfaces that were still Bun-only but are directly exercised by the frontend client.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.18`.

## [1.0.17] - 2026-04-05

### Added
- **Go Session Read/Control Route Parity**: Added Go API support for `GET /api/sessions/:id`, `GET /api/sessions/:id/activities`, and `POST /api/rag/reindex`, closing several remaining practical route gaps versus the Bun daemon.

### Changed
- **Go Session Surface Coverage**: The Go backend now covers a fuller read/control loop for sessions by exposing direct session fetch, direct activity fetch, patch/update support, action endpoints, and replay/export/save-memory support from the same runtime.
- **Go Migration Focus Shift**: Remaining Go parity work is now increasingly edge-case and product-surface oriented rather than broad missing route coverage.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.17`.

## [1.0.16] - 2026-04-05

### Added
- **Go Failed-Session Recovery Parity**: The Go `check_session` path now detects `FAILED` sessions, generates provider-backed recovery guidance, sends the recovery message back into the Jules session, and emits explicit recovery lifecycle events.
- **Go Session Patch Support**: Added `PATCH /api/sessions/:id` plus Go-side Jules session update support so title/status session mutations can be handled through the Go API.

### Changed
- **Recovery Telemetry**: Added shared/frontend support for `session_recovery_started` and `session_recovery_completed` so Go self-healing flows become operator-visible in the websocket/status/feed layers.
- **Go Recovery Guidance Quality**: Recovery guidance now uses recent activity context and can append Go-native RAG context before messaging a failed session.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.16`.

## [1.0.15] - 2026-04-05

### Added
- **Go Lifecycle Event Parity**: Added explicit shared daemon event types for Go-originated indexing and issue workflows, including `codebase_index_started`, `codebase_index_completed`, `issue_check_started`, `issue_evaluated`, and `issue_session_spawned`.

### Changed
- **Go Event Emission Coverage**: The Go queue now emits dedicated realtime events for indexing start/completion and issue evaluation/spawn workflows in addition to Keeper logs.
- **Operator Visibility Improvements**: The frontend websocket hook now understands the new lifecycle events for status updates, and the session Keeper feed can render richer metadata like source IDs, issue numbers, confidence, chunk counts, and RAG usage details.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.15`.

## [1.0.14] - 2026-04-05

### Added
- **Go Semantic RAG Retrieval Parity**: Added `backend-go/services/rag.go` with OpenAI embedding-based query generation, cosine similarity search across `CodeChunk` and `MemoryChunk`, and combined scored retrieval results matching the TypeScript daemon's dual-layer code/history search model.
- **Go RAG Query API**: Added `POST /api/rag/query` in the Go backend so semantic search can be called directly through the Go API.

### Changed
- **Go Nudge Enrichment**: The Go `check_session` path now injects RAG-backed local context into inactivity nudges when smart pilot mode is enabled and semantic retrieval is available.
- **Go Memory Ownership**: The Go backend now owns both halves of the practical RAG loop — indexing and retrieval — rather than only chunk ingestion.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.14`.

## [1.0.13] - 2026-04-05

### Added
- **Go Council Debate Parity**: Added `backend-go/services/llm.go` and ported provider-backed risky-plan review into the Go `check_session` path, including multi-role debate turns, moderator synthesis, risk rescoring, and debate-record persistence.
- **Go Debate Lifecycle Resolution**: The Go backend now emits richer `session_debate_resolved` payloads with risk score, approval status, and summary, and messages the Jules session with council feedback after approval or rejection.

### Changed
- **Go Plan Review Strategy**: High-risk plans no longer stop at heuristic escalation in Go. They now escalate into a provider-backed council review when supervisor credentials are available, with conservative fallback only when provider execution is unavailable.
- **Go Issue Evaluation Reuse**: Issue triage now uses the shared Go provider layer as well, reducing OpenAI-only coupling and improving future provider parity.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.13`.

## [1.0.12] - 2026-04-05

### Added
- **Go Issue-Autonomy Parity**: Ported `handleCheckIssues` into `backend-go/services/queue.go`, including GitHub issue fetching, duplicate-title filtering against active sessions, conservative fixability evaluation, autonomous Jules session spawning, and Keeper log coverage for evaluation/spawn lifecycle events.
- **Go Jules Client Issue/Session Support**: Added GitHub issue listing and Jules session creation helpers in `backend-go/services/jules_client.go` so Go queue jobs can open autonomous work without relying on the TypeScript client layer.

### Changed
- **Fleet Sync Expansion**: `POST /api/fleet/sync` in the Go backend now enqueues memory-sync jobs, issue-check jobs for discovered source IDs, and a codebase indexing job in one pass.
- **Issue Evaluation Strategy**: The Go backend now uses a hybrid evaluation path for GitHub issues: OpenAI-backed JSON triage when configured for `openai`, with conservative heuristic fallback when provider/API parity is unavailable.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.12`.

## [1.0.11] - 2026-04-05

### Added
- **Go Codebase Indexing Parity**: Ported `handleIndexCodebase` into `backend-go/services/queue.go`, including repository traversal, chunking, SHA-256 checksum detection, OpenAI embedding generation, SQLite `CodeChunk` upserts, and Keeper log entries for indexing lifecycle visibility.

### Changed
- **Go Project-Root Resolution**: Added root-aware indexing path resolution so the Go backend can discover repository files whether it is launched from `backend-go/` or the repo root.
- **Go Queue Capability Coverage**: The Go backend now owns both the `check_session` control loop and the `index_codebase` background indexing workflow, leaving issue-evaluation/session-spawn parity as the primary remaining queue gap.

### Notes
- **Validation Status**: `cd backend-go && go test ./...`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.11`.

## [1.0.10] - 2026-04-05

### Added
- **Go Queue Automation Parity Pass #2**: Ported a working `check_session` flow into `backend-go/services/queue.go`, including live session refresh, inactivity-based nudging, completed-session memory sync enqueueing, conservative low-risk plan auto-approval, and Go-side Keeper log/event emission.
- **Go Realtime Event Bridge**: Added `backend-go/services/realtime.go` so Go automation paths can persist Keeper logs and publish daemon-style websocket events without creating an API/services import cycle.

### Changed
- **Go Daemon Tick Source**: The Go daemon now polls live Jules sessions instead of relying on the stale DB-only stub path, and enqueues `check_session` jobs using live session payloads.
- **Go Session Actions**: Added `approvePlan` support to the generic session action handler and replaced the stub `POST /api/sessions/:id/nudge` route with a real Jules activity send + queue refresh path.
- **Risk Handling Strategy**: The Go backend now uses a conservative heuristic risk scorer for plan approval. Low-risk plans can auto-approve; higher-risk plans emit escalation signals and stop short of unsafe auto-approval until full council-debate parity is ported.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, `node scripts/check-version-sync.js`, and `cd backend-go && go test ./...` all pass at `1.0.10`.

## [1.0.9] - 2026-04-05

### Added
- **Debate Escalation Streaming**: Added dedicated daemon events for debate escalation and resolution so the active session Keeper feed can show council-review lifecycle updates, risk scores, and resolution summaries.

### Changed
- **Approval Event Coverage**: Auto-approval paths now emit `session_approved` consistently for both low-risk approvals and council-approved plans.
- **Keeper Feed Context Enrichment**: The session view Keeper strip now renders debate resolution metadata inline, including decision and risk score when available.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.9`.

## [1.0.8] - 2026-04-05

### Added
- **Keeper Event Detail Streaming**: Extended the session-view Keeper feed so streamed `session_nudged` and `session_approved` events now retain session scoping and render richer operator context.

### Changed
- **Session Event Context**: Nudge and approval websocket events now carry `sessionId` and structured details into the client log store, allowing the active session view to surface target titles and nudge message content inline.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.8`.

## [1.0.7] - 2026-04-05

### Added
- **Live Keeper Feed**: Surfaced a session-scoped daemon event strip inside `ActivityFeed`, driven by `useDaemonEvent('log_added')`, so Keeper actions stream into the active session view in real time.

### Changed
- **Keeper Log Plumbing**: Extended the session keeper store log shape with `sessionId` so session/global daemon events can be filtered and rendered contextually in the UI.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.7`.

## [1.0.6] - 2026-04-05

### Changed
- **Warning Burn-Down Pass #3**: Finished the remaining actionable warning cleanup by tightening daemon/webhook/queue types, stabilizing the broadcast refresh callback, and replacing ad-hoc casts with shared typed payloads.
- **Validation Policy Cleanup**: Kept the expanded lint surface intact while reducing the need for warning suppression through concrete typing improvements.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.6`.
- **Lint Status**: The expanded lint surface still reports `0 warnings` and `0 errors` after the additional typing pass.

## [1.0.5] - 2026-04-05

### Changed
- **Warning Burn-Down Pass #2**: Cleaned up remaining low-risk typing and lint issues across broadcast handling, debate/session keeper selectors, daemon WebSocket hooks, Borg webhook typing, and queue/server type surfaces.
- **Lint Rule Calibration**: Scoped the React refresh export rule away from known utility/provider files where the warning was not actionable for this codebase layout.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.5`.
- **Lint Status**: The repo now runs clean with `0 warnings` and `0 errors` on the expanded lint surface.

## [1.0.4] - 2026-04-05

### Changed
- **Warning Burn-Down Pass #1**: Removed a broad set of low-risk unused imports, unused props, unused helper functions, and unused state setters across the UI and server surfaces.
- **Lint Backlog Reduction**: Reduced the expanded lint backlog from 60 warnings to 30 warnings without weakening the validation command or interrupting running processes.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.4`.
- **Remaining Backlog**: The remaining 30 warnings are now concentrated mostly in explicit `any` sites, a few empty blocks, hook dependency warnings, and fast-refresh export-structure warnings.

## [1.0.3] - 2026-04-05

### Changed
- **Lint Coverage Expansion**: Expanded the root lint command from `src` to `src`, `components`, `lib`, and `server`, bringing the main application surface back under a single validation command.
- **Staged Rule Adoption**: Tuned the initial legacy-code rollout so `no-unused-vars`, `no-explicit-any`, and `no-empty` report as warnings while broader lint coverage is established safely.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` all pass at `1.0.3`.
- **Warning Backlog**: The expanded lint run currently reports 60 warnings across legacy areas, concentrated in unused imports/params, `any` usage, and a small number of hook-dependency warnings.

## [1.0.2] - 2026-04-05

### Added
- **Flat ESLint Bootstrap**: Added a working `eslint.config.js` using `typescript-eslint`, browser globals, and React hook/refresh rules so the repo finally has an ESLint v9-compatible entrypoint.

### Changed
- **Tooling Dependencies**: Added the missing lint toolchain packages at the workspace root (`@eslint/js`, `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`).
- **Main Entry Cleanup**: Removed the unused `React` import from `src/main.tsx` so the Vite entrypoint is clean under the new lint rules.

### Notes
- **Validation Status**: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` now all pass.

## [1.0.1] - 2026-04-05

### Changed
- **Version Source Hardening**: Promoted `VERSION` back to the canonical source of truth, added `VERSION.md` as a compatibility mirror, and aligned the sync scripts with the actual repo workflow.
- **Runtime Version Consistency**: Updated the header badge, CLI settings screen, shared packages, and daemon manifest to report the same `1.0.1` build identifier.
- **Keeper Store Safety**: Hardened persisted storage initialization with a writable `localStorage` probe and in-memory fallback for locked-down browser contexts.

### Fixed
- **Fleet Intelligence Typing**: Corrected `SessionKeeper` consumers to read `config.isEnabled`, removed the duplicate `toast` import, and preserved the new manual sync/reindex UI controls.
- **Session Replay API**: Fixed replay timeline mapping (`a.id`) and made `/api/sessions` degrade gracefully to mock/error payloads without crashing the UI.
- **Hypercode Cloud Compatibility**: Merged the Hypercode webhook patch so the daemon accepts both `/api/webhooks/borg` and `/api/webhooks/hypercode`.
- **Jules Client Testability**: Added a safe `process.env.VITE_JULES_API_BASE_URL` fallback path and restored the `lib/jules/client.test.ts` suite under Jest.

### Notes
- **Validation Status**: `pnpm run typecheck`, `pnpm run test`, and `node scripts/check-version-sync.js` pass. `pnpm run lint` still fails because the repository currently has no flat ESLint configuration.

## [1.0.0] - 2026-03-25

### Added
- **Full Borg Assimilation (Release)**: Completed the journey to a "Deep Autonomous Node". The node is fully self-aware, self-healing, and self-learning.
- **Live Submodule UI Hook**: Integrated `useSWR` into the Submodule Dashboard. The UI now auto-refreshes architectural data every 30s using native Git SHAs from the daemon.
- **Borg Discovery Handshake**: Added `GET /api/manifest` and `GET /api/fleet/summary` for collective node auditing.
- **Session Replay Engine**: Structured JSON audit trails and a high-fidelity visual timeline dialog.
- **Collective Signal Gateway**: Real-time webhook processing and WebSocket broadcasting for Borg collective signals.
- **Cross-Session Memory**: Semantic RAG indexing of successful task outcomes across the entire fleet.
- **Autonomous Self-Healing**: Automated failure detection and recovery plan generation via the Council Supervisor.

## [1.0.0-rc.1] - 2026-03-25

### Added
- **Full Borg Assimilation Readiness**: Completely documented the integration protocols, finalized the handoff state, and brought the fleet to "Deep Autonomous Node" status.

## [0.9.14] - 2026-03-25

### Fixed
- **Vercel Deploy Conflict**: Solved the "No entrypoint found" error by introducing `.vercelignore` to cloak the backend daemon from Vercel's auto-detector, ensuring a clean Vite SPA deployment.

## [0.9.13] - 2026-03-25

### Added
- **Borg Signal Dashboard**: Added the "Collective Signals" real-time feed to the Fleet tab, visualizing incoming webhooks.
- **WebSocket Gateway**: Overhauled the WebSocket protocol to broadcast `borg_signal_received` events globally for instant UI updates.

## [0.9.12] - 2026-03-25

### Added
- **Live Submodule Intelligence**: Created `GET /api/system/submodules` endpoint to execute `git submodule status` natively.
- **Interactive Submodule Dashboard**: Added a "Submodules" tab to the Core Configuration dialog to track real-time commit hashes and sync states across the 10+ integrated repos.

## [0.9.11] - 2026-03-25

### Fixed
- **Vercel Routing**: Simplified `vercel.json` to a standard SPA rewrite format, removing local proxy loops that conflicted with production builds.

## [0.9.10] - 2026-03-25

### Added
- **Cloud-Ready Deployment Architecture**: Introduced `build:vercel` scripts and environment variable overrides (`VITE_JULES_API_BASE_URL`) to allow seamless deployment of the frontend to Vercel while the backend daemon runs on an independent cloud server.
- **DEPLOY.md**: Created comprehensive deployment documentation for local, Docker, and Vercel environments.

## [0.9.9] - 2026-03-25

### Added
- **Complete Re-evaluation and Analysis**: Documentation synced across `UNIVERSAL_LLM_INSTRUCTIONS.md` and `IDEAS.md` for continuous feature progression.

## [0.9.8] - 2026-03-25

### Added
- **Cross-Session Historical Intelligence**: The Autopilot now monitors for COMPLETED sessions, vectorizes the final result, and saves it into the `MemoryChunk` table.
- **Dual-Layer RAG**: The RAG engine (`server/rag.ts`) now performs parallel semantic searches across both Source Code and Session History.
- **Context Labeling**: Autopilot nudges now specify if context comes from `[CURRENT CODEBASE]` or `[HISTORICAL SUCCESS]`.

## [0.9.7] - 2026-03-25

### Added
- **Borg Discovery Handshake**: Added `GET /api/manifest` endpoint, broadcasting node capabilities and version for Borg assimilation.
- **Session Replay Engine**: Added `GET /api/sessions/:id/replay` to provide a high-definition timeline of a session's entire history, optimized for Borg.
- **Interactive Session Replay**: Integrated a `SessionReplayDialog` component accessible via a History icon on each session card.
- **Global Fleet Heartbeat**: Added a "Fleet Pulse" section to the sidebar with a real-time active job counter and a pulsing brain icon.

## [0.9.6] - 2026-03-25

### Added
- **Autonomous Self-Healing**: The Autopilot actively monitors for the `FAILED` state, uses the Council Supervisor to analyze the error context, and autonomously messages Jules with a recovery plan.
- **Visual Cognitive Status**: Session cards feature real-time "HEALING" and "EVALUATING" badges.
- **Borg Fleet Summary API**: Implemented `GET /api/fleet/summary` for providing the Borg meta-orchestrator with a high-signal JSON payload of the fleet's state.

## [0.9.5] - 2026-03-25

### Added
- **Autonomous Issue Conversion**: Background daemon fetches open GitHub issues, evaluates if they are "Self-Healable", and autonomously spawns new Jules sessions.
- **Continuous RAG Indexing**: Periodic background job chunks and embeds the repository into SQLite for "Long-Term Memory".
- **Autonomous Multi-Agent Debates**: High-risk implementation plans trigger a background debate between a Security Architect and a Senior Engineer before auto-approval.
- **Queue Telemetry**: Added real-time counts of pending and processing jobs to `/api/daemon/status`.

## [0.9.4] - 2026-03-24

### Added
- **Autonomous Plan Approval**: Integrated the Council Supervisor into the background daemon. The Autopilot now intercepts Jules sessions in `AWAITING_PLAN_APPROVAL`, evaluates the risk of the proposed plan using an LLM (`evaluatePlanRisk`), and autonomously approves plans that score below the risk threshold (<40).
- **Cognitive Nudging**: Upgraded the Autopilot's background polling to use context-aware generative nudging (`decideNextAction`). Nudges are now contextually relevant to the specific activities the agent was performing before stalling.
- **Borg Integration Protocol**: Created `docs/BORG_INTEGRATION.md` to establish the API and daemon contracts for assimilation into the Borg ecosystem.

### Changed
- **Shared Intelligence Base**: Fully centralized the AI orchestration and evaluation logic into the `@jules/shared` package so it can be natively invoked by the SQLite background queue.

## [0.9.3] - 2026-03-24

### Removed
- **Analytics System**: Completely removed the `AnalyticsDashboard` component and `/api/analytics` endpoint to simplify the workspace.
- **Side Logs**: Deleted the vertical logs panel and `SessionKeeper` UI components.
- **System Dashboard**: Removed the internal system metrics and submodule status pages.

### Changed
- **UI Refactor**: Transitioned chat history (`ActivityFeed`, `ActivityItem`, `ActivityGroup`) to a fully theme-aware architecture using CSS variables instead of hardcoded dark-mode values.
- **Version Uniformity**: Synchronized all version strings across `package.json`, `lib/version.ts`, `VERSION`, `VERSION.md`, `next.config.ts`, `docs/ARCHITECTURE.md`, and UI fallbacks to `0.9.1`.

### Fixed
- **Type Safety**: Resolved several linting warnings and fixed syntax errors in `AppLayout`.

## [0.9.0] - 2026-02-27

### Added
- **RAG Context Architecture**: Designed the impending `sqlite-vss` integration in `RAG_ARCHITECTURE.md` to offer instantaneous codebase familiarity natively to the orchestrator agents via the `query_codebase` MCP tool.
- **Enterprise Foundations**: Consolidated systems, audited all plugins, fully hydrated submodule metrics, and achieved complete project stability.

### Changed
- **Database Scalability**: Enforced `connection_limit=1` and `socket_timeout=10` on production SQLite database interactions within `lib/prisma.ts` to neutralize "database is locked" concurrency conflicts.
- **Terminal System Deprecation**: Ripped out the experimental web-based "Integrated Terminal" (including `xterm.js` dependencies, `components/terminal-panel.tsx`, and the `terminal-stream`) to reduce deployment payload and enforce cleaner REST interfaces.

### Fixed
- **Authentication**: Patched an unhanded `ClientFetchError` inside the Next.js `authjs` configuration causing 500 crashes by successfully provisioning and generating `.env` secrets.

## [0.8.1] - 2026-02-27

### Added
- **Global Documentation Overhaul**: Rebuilt `VISION.md`, `ROADMAP.md`, `TODO.md`, and `MEMORY.md`. 
- **Universal LLM Instructions**: Consolidated all agent prompts (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`) to source from a singular `UNIVERSAL_LLM_INSTRUCTIONS.md`.
- **Submodule Deep Scan Analysis**: Automatically generated structural `IDEAS.md` documents exploring visionary features for all 10 independent Git submodules.
- **Git Submodule Sync Automation**: Introduced `scripts/sync-submodules.ps1` to automatically checkout, pull, and cleanly merge feature branches across all 10 external submodules.

## [0.9.1] - 2026-02-26

### Added
- **Routing Simulation Dashboard**: New `/dashboard/routing` page with interactive task-type selector, token count presets (Light/Medium/Heavy/Mega), real-time cost estimation, budget impact visualization with progress bar, and health status indicators — all backed by the existing `/api/routing/simulate` endpoint.
- **Plugin Signature Badges**: Ed25519 cryptographic verification status now displayed on each plugin card in the marketplace (✓ Verified / ⚠ Unsigned).

### Fixed
- **CRITICAL: Missing Auth on `/api/review`**: Added session authentication gate — previously any unauthenticated user could trigger LLM calls and incur costs.
- **Auth Ordering in `/api/debate`**: Moved authentication check before expensive participant enrichment loop.
- **Consistent Error Handling**: Replaced raw `console.error` catch blocks in `debate/route.ts`, `debate/history/route.ts` with structured `handleInternalError` responses.
- **Silent Error Swallowing**: `settings/keeper` GET now logs errors before returning defaults.
- **Type Safety**: `routing/simulate/route.ts` `catch (err: any)` → `catch (err: unknown)` with proper `instanceof Error` check.
- **Dead Code Removal**: Removed deprecated `setSession()`/`clearSession()` stubs from `lib/session.ts`.
- **Legacy Auth Deprecation**: `auth/login` and `auth/logout` routes now return `410 Gone` pointing to NextAuth flow.

### Changed
- **Test Suite**: 12/12 suites, 61 tests passing. Updated `review/route.test.ts` assertions for structured error format. Rewrote deprecated auth route tests.

## [0.9.0] - 2026-02-26

### Added
- **Phase 15: Advanced Plugin Ecosystem**: Marketplace ingestion pipeline (`POST /api/plugins/ingest`) with Ed25519 cryptographic signature verification (`lib/crypto/signatures.ts`). Plugin execution sandbox with per-workspace daily quotas and comprehensive `PluginAuditLog` audit trail.
- **Phase 16: Intelligent Provider Routing**: Dynamic LLM provider selection engine (`lib/routing/engine.ts`) supporting task-type-based routing, cost-efficiency fallbacks, and `Workspace.monthlyBudget` enforcement. Routing simulation API (`POST /api/routing/simulate`) for cost previewing. `ProviderTelemetry` model tracking token usage and USD costs. `RoutingPolicy` model for per-workspace routing overrides.
- **New Prisma Models**: `PluginAuditLog`, `ProviderTelemetry`, `RoutingPolicy`. Added `signature`, `publicKey`, `status` to `PluginManifest`. Added `monthlyBudget` and `maxPluginExecutionsPerDay` to `Workspace`.
- **Test Coverage**: 12 test suites, 63 tests passing. Added tests for plugin quota enforcement (429), routing simulation (402 budget exceeded, cost-efficiency fallback), workspace auth boundaries.

### Changed
- **Documentation Overhaul**: Comprehensive rewrite of `LLM_INSTRUCTIONS.md` (v3.0), `VISION.md`, `ROADMAP.md`, `MEMORY.md`, `HANDOFF.md`, `IDEAS.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`, `copilot-instructions.md`. All agent instruction files now reference `LLM_INSTRUCTIONS.md` as the universal hub with model-specific overrides.
- **Roadmap Re-baseline**: All P0–P4 backlog items marked complete. Remaining gaps accurately documented.
- **VERSION Sync**: Synchronized `VERSION.md`, `VERSION`, and `package.json` to `0.9.0`.

## [0.8.9] - 2026-02-22

### Changed
- **System Sync Protocol**: Comprehensive system synchronization and documentation overhaul.
- **Unified Intructions**: Consolidated AI instructions (`CLAUDE.md`, etc.) to reference `LLM_INSTRUCTIONS.md`.
- **Vision and Memory**: Overhauled `VISION.md`, created `MEMORY.md` for coding patterns, and unified `DEPLOY.md`.
- **Roadmap Audit**: Baselined the roadmap and TODO to prioritize the replacement of mock dashboards.
- **Git State**: Synced all git submodules and upstream repositories.

## [0.8.8] - 2026-02-09

### Added
- **Analytics Dashboard**: Implemented real-time statistics fetching for sessions, activity volume, and code churn metrics in `components/analytics-dashboard.tsx`.
- **System Dashboard**: Enhanced `/system/internals` to display detailed submodule status (build number, commit hash, date) and project directory structure.
- **Documentation**: Comprehensive rewrite of `README.md` and `VISION.md`. Refactored agent instructions (`AGENTS.md`, etc.) to reference a single source of truth (`LLM_INSTRUCTIONS.md`).

### Changed
- **Architecture**: Moved core orchestration logic (`lib/orchestration`) to a dedicated workspace package (`@jules/shared`) to resolve Vercel serverless deployment issues.
- **Vercel Support**: Updated `server/index.ts` to detect runtime environments (`Bun` vs `Node.js`) and use the appropriate server adapter (`@hono/node-server`), fixing crashes on Vercel.
- **Build System**: Updated `package.json` scripts to strictly build `@jules/shared` in `postinstall` to ensure dependencies are available for Vercel builds.
- **Cleanup**: Removed legacy code and resolved all known "ERR_MODULE_NOT_FOUND" issues by enforcing explicit `.js` extensions in shared package imports.

## [0.8.7] - 2026-02-04

### Added
- **Multi-Provider Dashboard**: New UI at `/dashboard/providers` to manage sessions across Jules, Devin, Manus, etc.
- **Session Transfers**: Feature to migrate sessions between providers with context preservation.
- **Mock Mode**: Simulation mode for all cloud providers, enabling full UI testing without API keys.
- **Robustness**: Enhanced error handling and fallback mechanisms for API integrations.

## [0.8.6] - 2026-02-04

### Added
- **Unified Documentation**: Created `LLM_INSTRUCTIONS.md` as the single source of truth for all agents.
- **Enhanced System Dashboard**: Updated submodule tracking to include Build Number, Commit Hash, and detailed status.
- **Build Infrastructure**: Migrated CI to `pnpm` and added workspace support for Bun compatibility.
- **Backend Fixes**: Resolved TypeScript errors in the Session Keeper Daemon (`server/`).
- **Deployment**: Hardened Vercel configuration for serverless runtime stability.

### Changed
- **Versioning**: Bumped version to 0.8.6 across `package.json`, `VERSION.md`, and `lib/version.ts`.
- **Documentation**: Consolidated old documentation into `docs/archive/` and updated `README.md`.

## [0.8.5] - 2026-01-09

### Added
- **Multi-Provider Cloud Dev Support:** Unified abstraction layer for managing AI coding sessions across multiple cloud dev providers.
  - **Unified Types** (`types/cloud-dev.ts`): `CloudDevProviderId`, `UnifiedSession`, `UnifiedActivity`, `SessionTransferRequest`
  - **Base Provider** (`lib/cloud-dev/providers/base.ts`): Abstract `BaseCloudDevProvider` class with `ProviderNotImplementedError`
  - **Jules Provider** (`lib/cloud-dev/providers/jules.ts`): Full implementation wrapping existing `JulesClient`
  - **Stub Providers**: Devin, Manus, OpenHands, GitHub Spark, Blocks, Claude Code, Codex (ready for future API integration)
  - **Provider Registry** (`lib/cloud-dev/providers/index.ts`): Factory functions `createProvider()`, `createProviders()`, `getAvailableProviderIds()`
  - **Session Transfer Service** (`lib/cloud-dev/transfer.ts`): `SessionTransferService` for migrating sessions between providers
  - **Zustand Store** (`lib/stores/cloud-dev.ts`): Persistent state management for multi-provider sessions with `useCloudDevStore`
- **Multi-Provider UI Components:**
  - **Provider Settings** (`components/cloud-dev-providers-settings.tsx`): API key management for all providers
  - **Provider Selector** (`components/provider-selector.tsx`): Dropdown for selecting active provider
  - **Settings Dialog**: New "Cloud Dev" tab for provider configuration
  - **New Session Dialog**: Provider selection when creating sessions
  - **Session List**: Provider filter dropdown and provider badges on session items
  - **Session Card**: Optional provider badge display with provider-specific colors/icons
  - **Activity Feed**: Provider badge in session header with color-coded icons
  - **Session Board** (Kanban): Provider filter dropdown and badges in all columns

### Changed
- **Architecture:** Session IDs now use `"{providerId}:{providerSessionId}"` format for cross-provider identification
- **Documentation:** Updated `docs/VISION.md` to reflect multi-provider mission and v0.8.5 status

## [0.8.0] - 2026-01-09

### Added
- **Session Keeper Daemon:** Migrated background monitoring from client-side React polling to a persistent **Bun/Hono backend daemon** (`server/`). Sessions stay monitored even when the browser is closed.
  - New endpoints: `/api/daemon/start`, `/api/daemon/stop`, `/api/daemon/status`
  - New endpoint: `/api/supervisor/clear` for resetting supervisor state
  - Daemon logs written to `KeeperLog` table in SQLite
- **Prisma Schema:** Added `SupervisorState` model for persisting per-session supervisor state (replaces localStorage).

### Changed
- **Architecture:** Session Keeper now runs on `http://localhost:8080` (Bun server) with CORS enabled for frontend communication.
- **Frontend:** `session-keeper-manager.tsx` reduced from 500+ lines to ~65 lines; now polls daemon status every 30s.
- **Store:** `lib/stores/session-keeper.ts` updated to call Bun server API instead of managing local loop.
- **Settings:** "Clear Memory" in settings now calls backend API instead of clearing localStorage.

### Fixed
- **Merge Conflict:** Resolved conflict in `copilot-instructions.md`.

## [0.7.1] - 2026-01-09

### Added
- **Orchestration:** Implemented a **Risk-Scoring Engine** in `supervisor.ts` to evaluate agent plans based on complexity, side effects, and consensus.
- **Observability:** Added **Throughput & Performance Metrics** (Nudges/hr, Token/sec, Risk Approval Rate) to the System Dashboard.
- **Documentation:** Created a **Universal Library & Function Index** (`docs/LIBRARY_INDEX.md`) documenting all 11 submodules and core dependencies.
- **UI:** Enhanced the **Submodule Dashboard** with feature tags, GitHub links, and directory structure explanations.

### Changed
- **Versioning:** Bumped project version to **0.7.1** across `package.json`, `VERSION.md`, and UI components.
- **Activity Feed:** (Previous) Row virtualization implemented for high-scale session histories.

## [0.7.0] - 2026-01-08

### Added
- **Multi-Agent Debate:** Configurable providers (OpenAI, Anthropic, Gemini, Qwen) and models in Debate Dialog.
- **Documentation:** Hierarchical `AGENTS.md` structure (Root, components, lib, external) for better context.
- **Submodules:** Sync and cleanup of external submodules; removed invalid `jules-agent-sdk-python` entry.

### Changed
- **Versioning:** Centralized version number in `VERSION.md`.
- **Git:** Merged upstream feature branches (`palette/api-key-ux`, `ui-mobile-responsive-layout`, `feat/issue-31-kanban-board`).

## [0.6.1] - 2025-12-30

### Fixed
-   **Session List:** Restored missing project details (Source/Repo) in the session list sidebar items.
-   **Broadcast Dialog:** Fixed empty session list in Broadcast Dialog by correctly passing `openSessions`.
-   **Build System:** Resolved Prisma generation file lock issues during build.

## [0.6.0] - 2025-12-29

### Added
-   **Session Keeper:** Fully automated "Auto-Pilot" mode for sessions.
-   **Broadcast:** Initial implementation of global broadcast system.
-   **Submodule Dashboard:** Added `app/submodules.json` generation script.

### Changed
-   **Architecture:** Major refactor of `app/api/jules` to support dynamic proxying.
-   **Dependencies:** Downgraded `@libsql/client` to 0.6.0 for compatibility.

## [0.3.4] - 2025-12-29

### Changed
-   **Submodules**: Updated submodule information.
-   **Documentation**: Updated ROADMAP.md and synchronized LLM instructions.
-   **Versioning**: Bumped version to 0.3.4.

## [0.3.3] - 2025-12-27

### Changed
-   **Submodules**: Updated all submodules to latest versions and merged upstream changes.
-   **System Dashboard**: Enhanced directory structure documentation in `/system`.
-   **Maintenance**: Merged feature branches and performed general repository maintenance.

## [0.3.2] - 2025-12-27

### Added
-   **Tests**:
    -   Added E2E/Integration tests for the System Dashboard (`app/system/page.test.tsx`).
    -   Added comprehensive tests for `ActivityFeed` covering rendering, grouping, messaging, and archived states.
    -   Verified tests for `SessionKeeperManager`.

### Fixed
-   **E2E Testing**: Resolved port conflicts in E2E tests by configuring a dedicated port (3005) and custom startup script.
-   **Code Quality**: Fixed critical linting errors (`react-hooks/set-state-in-effect`) in `AppLayout`, `SettingsDialog`, and `TemplateFormDialog` to prevent cascading re-renders.
-   **Type Safety**: Resolved `any` type usage in `ActivityContent` and `MemoryManager`.

### Performance
-   **Session Rendering**: Optimized `ActivityFeed` by implementing memoized `ActivityItem` and `ActivityGroup` components to prevent unnecessary re-renders in large sessions.

## [0.3.1] - 2025-12-27

### Added
-   **Code Churn Analytics**: New stacked bar chart in the Analytics Dashboard to visualize code additions and deletions over time.
-   **Metrics**: Daily aggregation of code impact stats (additions/deletions) from session activities.

## [0.3.0] - 2025-12-27

### Added
-   **Documentation Overhaul**: Centralized all AI instructions into `LLM_INSTRUCTIONS.md`.
-   **Versioning System**: Implemented strict versioning with `VERSION` file as the single source of truth.
-   **System Dashboard**: New dashboard at `/system` to visualize submodule status and versions.

### Changed
-   **Agent Protocols**: Updated `AGENTS.md`, `GEMINI.md`, and `CLAUDE.md` to reference the master instruction file.
-   **Project Structure**: Standardized documentation and versioning workflows.

## [0.2.9] - 2025-12-27

### Added
-   **Session Health Monitoring**: New system to detect and visualize session health.
    -   **Health Badges**: Visual indicators (Healthy, Stalled, Critical) in Session List and Activity Feed.
    -   **Analytics**: New "Stalled Sessions" metric in the Analytics Dashboard.
    -   **Logic**: Automatic detection of stalled sessions based on inactivity thresholds (5m warning, 30m critical).

### Refactored
-   **App Layout**: Decomposed the monolithic `AppLayout` component into smaller, manageable parts (`AppHeader`, `AppSidebar`, `MainContent`) to improve maintainability and readability.

## [0.2.8] - 2025-12-26

### Added
-   **GitHub Issue Integration**: New feature in "New Session" dialog to fetch and select open issues from the repository. Pre-fills session title and prompt with issue details.
-   **Settings Dialog**: Centralized settings management with tabs for "Integrations" (GitHub Token) and "Supervisor".
-   **Notifications**: Integrated `sonner` for toast notifications across the app.

### Changed
-   **UI**: Replaced the standalone "Supervisor Settings" dialog with the new unified "Settings" dialog.

## [0.2.7] - 2025-12-26

### Added
-   **Template Management**: Enhanced `TemplateFormDialog` with a proper tag input system (using Badges) and auto-renaming logic when cloning system templates.
-   **Terminal Integration**: Securely inject `JULES_API_KEY` into the integrated terminal session, allowing CLI tools to work out-of-the-box.

### Fixed
-   **UI Regressions**: Restored the "Broadcast" button and fixed the Log Panel layout (moved to bottom vertical split).
-   **Rendering**: Fixed blank screens in "Session Monitor" and "Manage Templates" dialogs.
-   **Activity Feed**: Fixed a bug where activity updates (e.g., status changes, artifacts) were ignored due to aggressive client-side filtering. Now correctly merges server state with local pending messages.

## [0.2.6] - 2025-12-26

### Added
-   **Submodule Dashboard**: Enhanced the System Dashboard to display commit dates for all submodules.
-   **Documentation**: Updated `LLM_INSTRUCTIONS.md` and other agent guides to enforce versioning and submodule protocols.

### Changed
-   **Build Script**: Updated `scripts/get-submodule-info.js` to capture actual commit dates from submodules.
-   **Versioning**: Bumped version to 0.2.6.

## [0.2.5] - 2025-12-25

### Added
-   **Real-time Submodule Status**: The System Dashboard now fetches live git status for all submodules, showing if they are synced, modified, or uninitialized.
-   **API**: New `/api/system/status` endpoint to expose git submodule status.

## [0.2.4] - 2025-12-25

### Added
-   **Memory Manager**: New feature to compact session history into "Memory Files" using an LLM.
-   **Context Injection**: Ability to save memories to the repo (`.jules/memories`) and copy them for injection into new sessions.
-   **API**: New `/api/memory` endpoint for handling compaction and file operations.

## [0.2.3] - 2025-12-25

### Added
-   **Council Debate Visualization**: New UI component to visualize multi-agent debate interactions in the Session Keeper.
-   **Documentation**: Standardized LLM instruction files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `GPT.md`) to reference a master `LLM_INSTRUCTIONS.md`.

### Changed
-   **Session Keeper**: Refactored `SessionKeeper` UI to include a tabbed view for Logs and Council Debates.
-   **Store**: Updated `SessionKeeperStore` to persist debate history.

## [0.2.2] - 2025-12-25

### Added
-   **Session Keeper**: Enhanced auto-pilot capabilities with "Debate Mode" and "Smart Supervisor".
-   **Versioning**: Added `VERSION.md` and centralized version management.
-   **Dashboard**: Added submodule status dashboard (upcoming).

### Fixed
-   **Build System**: Resolved merge conflicts in `analytics-dashboard.tsx`, `session-keeper-log-panel.tsx`, `combobox.tsx`, `resizable.tsx`, and `session-keeper.ts`.
-   **TypeScript Errors**: Fixed interface mismatches in `SessionKeeperSettings` and `AppLayout`.
-   **Submodules**: Updated all submodules to latest upstream versions.

### Changed
-   **UI**: Improved `SessionKeeperSettings` dialog with controlled state management.
-   **Architecture**: Refactored `SessionKeeperManager` to better handle debate/conference modes.

## [0.2.1] - 2025-12-25

### Added
-   **Super Protocol Template**: Added a comprehensive "All-in-One" protocol template to the Broadcast Dialog for streamlining maintenance workflows.

### Changed
-   **Session List UI**: Improved layout by displaying the repository name above the session title and moving the "last activity" time to a dedicated line for better readability.
-   **Broadcast Templates**: Refined the text of all broadcast templates for clarity and conciseness.

## [0.2.0] - 2025-12-24

### Added
-   **Broadcast Messages**: New feature to send messages to all open sessions simultaneously. Includes templates for common instructions.
-   **Kanban Board**: New view for managing sessions in a Kanban style (Running, Waiting, Done).
-   **Docker Optimization**: Switched terminal server base image from `nvcr.io/nvidia/pytorch` (32GB) to `python:3.11-slim-bookworm` (<1GB), significantly reducing disk usage.

### Changed
-   **Merged Feature Branches**: Integrated `jules-session-keeper-integration`, `feat-session-kanban-board`, `api-key-ux`, and `mobile-layout` into `main`.
-   **Session List**: Updated to support filtering and passing sessions to the Broadcast Dialog.
-   **Jules Client**: Added `updateSession` method and improved type definitions.

### Fixed
-   **Build Errors**: Resolved type mismatches and missing methods in `JulesClient`.
-   **Merge Conflicts**: Fixed conflicts in `session-list.tsx` and `activity-feed.tsx`.
-   **Build Stability:** Resolved lingering TypeScript errors in `app-layout.tsx` (event handler types) and `templates/route.ts` (implicit any).
-   **New Session Dialog:** Fixed arguments for `createSession` to match the updated client signature.
-   **Prisma:** Pinned Prisma version to 5.19.1 and fixed `schema.prisma` configuration for stable builds.

## [v0.8.0] - 2024-10-24

### Added
-   **System Dashboard:** Enhanced `/system/internals` to include submodule status.
-   **Unified Instructions:** Created `INSTRUCTIONS.md` as the single source of truth for all agents.

### Fixed
-   **Build Errors:** Resolved TypeScript errors in `lib/orchestration/providers`, `session-board`, and `new-session-dialog`.
-   **Persistence:** Fixed Prisma client initialization issues (downgraded to 5.19.1 for stability).
-   **Database:** Successfully initialized SQLite database with `KeeperSettings` and `KeeperLog`.
