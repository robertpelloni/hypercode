# Development TODOs (v1.0.0 -> v1.1.0)

This document tracks granular bugs, missing features, and technical debt. For epic-level milestones, see `ROADMAP.md`.

## Immediate Actions
- [x] **Submodule Dashboard Live Integration:** `SubmoduleList` now uses `useSWR` against `/api/system/submodules` with 30s refresh and manual revalidation.
- [x] **Daemon API Discovery:** Formally established `/api/manifest` for node capability discovery.
- [x] **SSE/WebSocket Log Streaming:** Injected `useDaemonEvent('log_added')` into the session activity view and surfaced a live Keeper feed for session/global daemon events without manual refresh.
- [x] **Session Event Timeline Enrichment:** Enhanced Keeper Feed event cards with color-coded event badges (debate=red, recovery=orange, nudge=blue, index=cyan, spawn=yellow), visual risk score bars, confidence meters, and styled approval status indicators.
- [x] **Dashboard Health Surface:** Added a Fleet Intelligence runtime health block that consumes `/api/health` and surfaces daemon/database/credential state plus key backend totals.
- [x] **Expanded Dashboard Health Surface:** Added a dedicated Health dashboard view with runtime status, queue/totals cards, and metrics preview.
- [x] **Deep Observability Surface:** Rich dependency health checks (7 checks: database, disk, memory, git, queue, scheduler, websocket) with per-check status/latency/details. System runtime info (Go version, CPU, heap, goroutines, uptime). Health trend analysis API for historical snapshots.
- [x] **Go Backend Parity Pass #2:** Ported the highest-value queue intelligence path (`handleCheckSession`) plus Go-side event/log bridging and real session actions so the Go backend can nudge sessions, enqueue memory sync, and conservatively auto-approve low-risk plans.
- [x] **Go Backend Parity Pass #3:** Ported `handleIndexCodebase` so Go can now walk the repo, chunk source files, request embeddings, and upsert `CodeChunk` rows without Bun.
- [x] **Go Backend Parity Pass #4:** Ported `handleCheckIssues` plus Go-side issue fetching/session spawning support so the Go backend can now discover GitHub work and open Jules sessions autonomously.
- [x] **Go Backend Parity Pass #5:** Ported provider-backed council debate/review into Go, including supervisor-provider LLM calls, debate summaries, risk rescoring, and approval/rejection feedback back into the Jules session.
- [x] **Go Backend Parity Pass #6:** Ported Go-side semantic query / RAG retrieval, added `/api/rag/query`, and wired retrieval-backed local context into Go inactivity nudges.
- [x] **Go Backend Parity Pass #7:** Added explicit Go indexing/issue lifecycle events, taught the frontend websocket layer about them, and expanded Keeper feed metadata rendering for Go-originated automation details.
- [x] **Go Backend Parity Pass #8:** Added Go-side failed-session recovery lifecycle parity plus `PATCH /api/sessions/:id` support so the Go backend can recover failed sessions and cover a broader session-control surface.
- [x] **Go Backend Parity Pass #9:** Added Go-native direct session fetch, session activity fetch, and RAG reindex routes, reducing the remaining practical route/control gap versus the Bun daemon.
- [x] **Go Backend Parity Pass #10:** Ported Go filesystem utility endpoints (`/api/fs/list`, `/api/fs/read`) so repository-context gathering has Go-native support in addition to the previously ported session/memory/control surface.
- [x] **Go Backend Parity Pass #11:** Ported Go template CRUD so another actively used non-core frontend surface now has Go-native API support.
- [x] **Go Backend Parity Pass #12:** Ported Go-native `/api/review` and `/api/local/review` support so another actively used non-core product workflow now has Go API coverage.
- [x] **Go Backend Parity Pass #13:** Added Go-native import/export support and refined recovery dedupe so failed sessions are less likely to receive repeated guidance when recovery instructions are already present.
- [x] **Go Backend Parity Pass #14:** Tightened Go recovery-state edge-case handling by adding a second duplicate-suppression signal based on recent recovery completion logs, plus explicit skip telemetry.
- [x] **Go Backend Parity Pass #15:** Ported Go-native debate execution/history/detail/delete support so another actively used product surface now has Go API coverage.
- [x] **Go Backend Parity Pass #16:** Expanded Go daemon orchestration parity so the Go runtime now honors Keeper cadence, discovers Jules sources, schedules issue checks, opportunistically enqueues indexing, and resolves Jules API credentials more like the Bun daemon.
- [x] **Go Backend Parity Pass #17:** Added Go-native observability foundations with `GET /metrics`, `GET /healthz`, and `GET /api/health`, plus daemon-running telemetry for health reporting.
- [x] **Go Backend Parity Pass #18:** Tightened shared Go LLM/provider helpers for review/debate/issue workflows and surfaced the new health data directly in the Fleet Intelligence UI.
- [x] **Go Backend Parity Pass #19:** Added Go static SPA serving/index fallback parity and a dedicated Health dashboard view so the Go runtime is closer to serving the full product surface directly.
- [x] **Go Backend Parity Pass #20:** Aligned Go websocket protocol behavior with the Bun daemon by emitting `connected` events and replying to `ping` frames with `pong` payloads instead of echoing arbitrary client messages.
- [x] **Go Backend Parity Pass #21:** Added request-scoped Jules auth header support and Bun-like CORS middleware in the Go runtime, improving real deployment/runtime flexibility.
- [x] **Go Backend Parity Pass #22:** Hardened Go runtime bootstrap and global error handling by loading `.env` from project root and centralizing API-oriented Fiber error responses.
- [x] **Go Backend Parity Pass #23:** Aligned Go daemon/worker lifecycle semantics with Bun more closely by coordinating startup/stop behavior, making worker lifecycle restartable, and surfacing worker-running observability.
- [x] **Go Backend Parity Pass #24:** Ported resilient degraded-mode session handling (mock/error sessions) and hardened client-side transformation compatibility so the Go runtime is safer for dashboard usage during auth/API failures.
- [x] **Go Backend Parity Pass #25:** Added Go-native scheduled task engine and graceful shutdown handling, closing more primary-runtime operational gaps and implementing initial v4.0 roadmap items.
- [x] **Go Backend Parity Pass #26:** Expanded Go webhook parity (alerts, cleanup, issue triggers) and added a Go-native CLI indexer utility.
- [x] **Go Backend Parity Pass #27:** Implemented Multi-Tenant API Keys CRUD (v3.0 Roadmap) in Go with a dedicated management UI and CLI key generator.
- [x] **Go Backend Parity Pass #28:** Final audit for any remaining residual Bun-only behavior (e.g. final script parity), officially declaring the Go backend as the primary runtime.
- [x] **Phase 2:** Completely deleted the `server/` directory and backend-only dependencies to formally lock the runtime pivot.
- [x] **Phase 3:** Implemented deep dependency checks, webhook event router with multi-provider support, scheduled automation CRUD, and code-split frontend bundle.
- [x] **Tooling Stabilization:** Added a working ESLint v9 flat config and aligned the Jest harness with the current Vite/Bun + shared-package runtime assumptions.
- [x] **Lint Coverage Expansion:** Extended the lint command to cover `src/`, `components/`, `lib/`, and `server/` with a staged warning-first rollout.
- [x] **Lint Warning Burn-Down:** Completed two warning burn-down passes and brought the expanded lint surface to zero warnings.
- [x] **Lint Strictness Ratchet:** Tightened `no-explicit-any`, `no-unused-vars`, and `no-empty` from `warn` to `error` with zero violations.
- [x] **Notification Center (v5.0):** Implemented unified notification hub with Go backend service and frontend UI, auto-generated from keeper events with read/dismiss state, priority levels, and real-time WebSocket push.
- [x] **Webhook Event Router (v5.0 Enhanced):** Configurable rule-based routing with 4 action types (log, enqueue, notify, delegate) and 5 providers (borg, github, slack, linear, generic) with CRUD API.
- [x] **Audit Trail (v4.0):** Implemented immutable append-only audit log in Go with structured metadata, paginated frontend view, and aggregate statistics.
- [x] **Borg Collective UI:** Implemented the "Collective Signals" feed in the Fleet tab to visualize incoming Borg signals.

## Technical Debt & Refactoring
- [x] **Auth Protocol Enforcement:** Locked down Jules Portal `AQ.A` tokens to use `x-goog-api-key` and strictly delete `Authorization` headers to prevent gateway blocks.
- [x] **Connection Pooling:** SQLite connection pool configured with WAL mode, busy timeout (5s), NORMAL synchronous, 64MB cache, foreign keys enabled. Single-writer constraint honored with MaxOpenConns(1).
- [x] **Cross-Session Memory Storage:** Implemented the `MemoryChunk` model for persistent, semantic history tracking.
- [x] **Vector Search Optimization:** Implemented two-phase approximate nearest neighbor search with dimensionality reduction (64-dim coarse filter + full cosine). Pre-computed norms, vector index service with rebuild/stats APIs, automatic index-then-fallback search path.

## Intelligence & Autonomy
- [x] **Autonomous Self-Healing:** Autopilot now detects `FAILED` sessions and enqueues recovery plans.
- [x] **Council Debate Engine:** High-risk plans now trigger background debates between persona models before approval.
- [x] **Historical Retrieval:** RAG queries now pull from both the current codebase and successful past session outcomes.
