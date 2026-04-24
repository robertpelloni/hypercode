# Project Roadmap

This roadmap outlines the major structural plans and strategic milestones for the Jules Autopilot Orchestrator. 
For granular tasks and immediate bug fixes, see `TODO.md`.

## Milestone: v1.0.0 (Current) — "Deep Autonomous Node"
* [x] **Cross-Session Historical Intelligence**: The Autopilot now monitors for COMPLETED sessions, vectorizes the final result, and saves it into the `MemoryChunk` table for dual-layer RAG.
* [x] **Borg Discovery Handshake**: Added `GET /api/manifest` endpoint, broadcasting node capabilities and version for Borg assimilation.
* [x] **Session Replay Engine**: Added `GET /api/sessions/:id/replay` to provide a high-definition timeline of a session's entire history, optimized for Borg.
* [x] **Interactive Session Replay**: Integrated a `SessionReplayDialog` component accessible via a History icon on each session card.
* [x] **Global Fleet Heartbeat**: Added a "Fleet Pulse" section to the sidebar with a real-time active job counter and a pulsing brain icon.
* [x] **Autonomous Self-Healing**: The Autopilot actively monitors for the `FAILED` state, uses the Council Supervisor to analyze the error context, and autonomously messages Jules with a recovery plan.
* [x] **Visual Cognitive Status**: Session cards feature real-time "HEALING" and "EVALUATING" badges.
* [x] **Borg Fleet Summary API**: Implemented `GET /api/fleet/summary` for providing the Borg meta-orchestrator with a high-signal JSON payload of the fleet's state.
* [x] **Autonomous Issue Conversion**: Background daemon fetches open GitHub issues, evaluates if they are "Self-Healable", and autonomously spawns new Jules sessions.
* [x] **Continuous RAG Indexing**: Periodic background job chunks and embeds the repository into SQLite for "Long-Term Memory".
* [x] **Autonomous Multi-Agent Debates**: High-risk implementation plans trigger a background debate between a Security Architect and a Senior Engineer before auto-approval.
* [x] **Queue Telemetry**: Added real-time counts of pending and processing jobs to `/api/daemon/status`.
* [x] **Version Uniformity Hardening**: Synced the canonical runtime version across the daemon manifest, header badge, CLI settings screen, shared packages, and compatibility version files.
* [x] **Developer Tooling Recovery**: Restored a working Jest harness and added an ESLint v9 flat configuration so core validation commands are operational again.
* [x] **Lint Surface Re-Expansion**: Reintroduced `components/`, `lib/`, and `server/` to the primary lint workflow using a warning-first rollout for legacy hotspots.
* [x] **Warning Backlog Reduction Pass #1**: Cut the expanded lint backlog in half by removing low-risk unused imports, unused props, and unused helpers across major app surfaces.
* [x] **Warning Backlog Reduction Pass #2**: Eliminated the remaining expanded-lint warnings by tightening types, stabilizing hook dependencies, and calibrating non-actionable refresh warnings.
* [x] **Warning Backlog Reduction Pass #3**: Replaced residual ad-hoc casts with typed webhook, websocket, queue, and client error payloads while keeping the expanded validation surface clean.
* [x] **Live Keeper Feed in Session View**: Streamed daemon `log_added` events directly into the session activity view so background Keeper actions appear without manual refresh.
* [x] **Keeper Event Detail Streaming**: Preserved session scoping and event metadata for nudges/approvals so the active session view can show richer operator context inline.
* [x] **Council Debate Lifecycle Streaming**: Added dedicated escalation/resolution daemon events so the active session feed can surface debate state changes, risk scores, and outcomes without refresh.
* [x] **Go Backend Parity Pass #2**: Ported the Go `check_session` automation path, live daemon queueing, realtime Keeper log/event bridging, and practical session actions (`approvePlan`, real nudge route) so more autonomous control-loop behavior can run outside the Bun daemon.
* [x] **Go Backend Parity Pass #3**: Ported Go-side `index_codebase` traversal and embedding ingestion so repository chunk indexing no longer depends exclusively on the TypeScript daemon.
* [x] **Go Backend Parity Pass #4**: Ported Go-side GitHub issue evaluation and autonomous session spawning so issue-driven work discovery no longer depends exclusively on the TypeScript queue path.
* [x] **Go Backend Parity Pass #5**: Ported provider-backed council debate/review into the Go session-approval path so risky plans can be debated, summarized, rescored, and approved/rejected without falling back immediately to the Bun daemon.
* [x] **Go Backend Parity Pass #6**: Ported semantic query / RAG retrieval into the Go backend, including combined code/history similarity search, a Go `/api/rag/query` route, and RAG-assisted session nudges.
* [x] **Go Backend Parity Pass #7**: Broadened Go lifecycle/detail parity with explicit indexing/issue daemon events, frontend websocket support, and richer Keeper feed metadata for Go-originated automation flows.
* [x] **Go Backend Parity Pass #8**: Added Go-side failed-session recovery/self-healing plus session patch/update support, with explicit recovery lifecycle events surfaced to the operator UI.
* [x] **Go Backend Parity Pass #9**: Closed several remaining practical Go session/API route gaps by adding direct session fetch, activity fetch, and Go-native RAG reindex endpoints.
* [x] **Go Backend Parity Pass #10**: Ported Go filesystem utility endpoints used for repository-context gathering so the client no longer depends on Bun-only `/api/fs/*` routes for that workflow.
* [x] **Go Backend Parity Pass #11**: Ported Go template CRUD routes so the frontend can manage session templates through the Go backend instead of depending on Bun-only template endpoints.
* [x] **Go Backend Parity Pass #12**: Ported Go-native review endpoints so direct code-review workflows can run through the Go backend instead of depending on Bun-only review routing.
* [x] **Go Backend Parity Pass #13**: Added Go-native import/export support and refined failed-session recovery dedupe so the settings portability flow and recovery edge cases rely less on Bun-only behavior.
* [x] **Go Backend Parity Pass #14**: Hardened Go failed-session recovery against duplicate guidance by combining session-activity and Keeper-log dedupe checks, plus explicit skip telemetry.
* [x] **Go Backend Parity Pass #15**: Ported Go-native debate execution/history/detail/delete support so the debate-management UI no longer depends on Bun-only API handling.
* [x] **Go Backend Parity Pass #16**: Expanded Go daemon orchestration parity so the Go runtime now honors Keeper cadence, discovers Jules sources, schedules issue checks, opportunistically enqueues indexing, and resolves Jules API credentials more like the Bun daemon.
* [x] **Go Backend Parity Pass #17**: Added Go-native observability foundations with `GET /metrics`, `GET /healthz`, and `GET /api/health`, plus daemon-running telemetry for health reporting.
* [x] **Go Backend Parity Pass #18**: Tightened shared Go LLM/provider helpers for review/debate/issue workflows and surfaced the new health data directly in the Fleet Intelligence UI.
* [x] **Go Backend Parity Pass #19**: Added Go static SPA serving/index fallback parity and a dedicated dashboard Health view so the Go runtime is closer to serving the full product surface directly.
* [x] **Go Backend Parity Pass #20**: Aligned Go websocket protocol behavior with the Bun daemon by emitting `connected` events and replying to `ping` frames with `pong` payloads instead of echoing arbitrary client messages.
* [x] **Go Backend Parity Pass #21**: Added request-scoped Jules auth header support and Bun-like CORS middleware in the Go runtime, improving real deployment/runtime flexibility.
* [x] **Go Backend Parity Pass #22**: Hardened Go runtime bootstrap and global error handling by loading `.env` from project root and centralizing API-oriented Fiber error responses.
* [x] **Go Backend Parity Pass #23**: Aligned Go daemon/worker lifecycle semantics with Bun more closely by coordinating startup/stop behavior, making worker lifecycle restartable, and surfacing worker-running observability.
* [x] **Go Backend Parity Pass #24**: Ported resilient degraded-mode session handling (mock/error sessions) and hardened client-side transformation compatibility so the Go runtime is safer for dashboard usage during auth/API failures.
* [x] **Go Backend Parity Pass #25**: Added Go-native scheduled task engine and graceful shutdown handling, closing more primary-runtime operational gaps and implementing initial v4.0 roadmap items.
* [x] **Go Backend Parity Pass #26**: Expanded Go webhook parity (alerts, cleanup, issue triggers) and added a Go-native CLI indexer utility.
* [x] **Go Backend Parity Pass #27**: Implemented Multi-Tenant API Keys CRUD (v3.0 Roadmap) in Go with a dedicated management UI and CLI key generator.
* [x] **Go Backend Parity Pass #28**: Completed the final script audit, removing obsolete Bun-based CLI utilities, and officially declared the Go backend as the primary runtime.
* [x] **Phase 2: Lock the Pivot**: Completely deleted the legacy `server/` directory and backend-only JS dependencies, finalizing the transition to a Go-only architecture.

## Milestone: v1.5 — "Shadow Pilot"
* [x] **Background Anomaly Detection:** Shadow Pilot monitors git diffs and CI failures. CI Monitor detects merge conflicts, WIP commits, large uncommitted changes, and test syntax errors. Auto-analyzes failures with LLM and enqueues fix jobs for high-severity issues. Anomalies tracked with notifications and audit entries.
  * Progress: Go backend now has autonomous anomaly detection for queue backlogs, LLM error spikes, token budget overuse, stuck sessions, and circuit breaker instability. Anomalies are displayed in the Health dashboard with severity badges and one-click resolve. Remaining work includes git diff monitoring and CI pipeline auto-fix.
* [x] **WebAssembly Plugin Isolation:** Pure-Go Wasm sandbox using wazero runtime (zero CGO). Memory ceilings, execution timeouts, controlled I/O host functions. SHA256 signature verification on plugin binaries. Full isolation with audit-tracked execution.

## Milestone: v2.0 — "Autonomous Fleet"
* [x] **Multi-Agent Collaboration:** Orchestrate parallel agent swarms working on decomposed sub-tasks with shared context via the RAG mesh and real-time coordination events. Swarms support parallel, sequential, and pipeline strategies with LLM-powered task decomposition and automatic agent lifecycle management.
* [x] **Plugin Marketplace:** Plugin registry with install-from-URL, version management, signature verification, enable/disable lifecycle, and configuration management. Full CRUD API with 8 endpoints. Plugins fetched from remote URLs with SHA256 verification.
* [x] **Predictive Cost Optimizer:** Token budget prediction engine with historical analysis, provider efficiency profiling, monthly budget tracking with utilization/projection, and optimal provider routing recommendations.

## Milestone: v3.0 — "Neural Autonomy"
* [x] **Observability & Health Checks:** Prometheus-compatible `/metrics` endpoint, structured health checks for 7 dependencies (database, disk, memory, git, queue, scheduler, websocket), trend analysis API, system runtime info, and a dedicated Health dashboard with dependency check cards, anomaly alerts, token budget tracker, and Shadow Pilot control panel.
* [x] **Self-Healing Circuit Breakers:** Provider-level circuit breakers automatically reroute to fallback models when error rates (5xx, 429) spike, with configurable thresholds and recovery windows in the Go runtime.
* [x] **Multi-Tenant API Keys:** Added scoped API key generation and revocation in the Go runtime with a dedicated management UI.

## Milestone: v4.0 — "Cognitive Core"
* [x] **Audit Trail & Compliance Logging:** Immutable, append-only audit log of every orchestrator action with structured metadata, searchable via API and dashboard.
* [x] **Session Replay & Time Travel:** Record full session activity timelines and replay them step-by-step in the dashboard for debugging and review.
* [x] **Scheduled Automation Engine:** Added a Go-native cron-based task scheduler that enqueues background maintenance jobs (indexing, issue checks, log cleanup).

## Milestone: v5.0 — "Sovereign Intelligence"
* [x] **Webhook Event Router:** Configurable inbound webhook router with rule-based routing engine supporting 4 action types (log, enqueue, notify, delegate) and 5 providers (Slack, GitHub, Linear, Borg, Generic) with full CRUD management API.
* [x] **Session Templates & Presets:** Reusable session configuration templates with pre-filled prompts, repos, and settings — launchable from the dashboard with one click.
* [x] **Notification Center:** Unified notification hub aggregating alerts from CI fixes, swarm completions, circuit breaker trips, and scheduled job results with read/dismiss state.
