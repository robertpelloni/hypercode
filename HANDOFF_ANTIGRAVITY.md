# Handoff: Antigravity

## Current State
- **Project**: Borg - Neural Operating System
- **Current Phase**: Phase 104: Browser Extension Env-Safe URLs (COMPLETED)
- **Version**: 2.7.64

## Recent Accomplishments
- **Phase 94**: Sub-Agent Task Routing. `MeshCoderAgent` and `MeshResearcherAgent` bid on classified tasks.
- **Phase 95**: Swarm Git Worktree Isolation. Coding tasks auto-receive isolated git worktrees via `GitWorktreeManager`, preventing file contention during parallel execution.
- **Phase 96**: Agentic Execution Telemetry. Plumbed LLM execution traces (provider/model) from `CoderAgent` and `DeepResearchService` into the `SubAgents` orchestration surface. Replaced simulated stubs in `SystemWorkflows.ts` with real `use_agent` MCP tool invocations.
- **Phase 97**: External Link Ingestion Telemetry. Developed `record-fetch-outcome.mjs` for incremental writer queues and built a dedicated UI in `dashboard/ingestion` matching the metrics from `BORG_MASTER_INDEX.jsonc`.
- **Phase 95.1 (Docs/Ops Sync)**: Canonical docs and metadata synchronized at `v2.7.56` across roadmap/todo/status/changelog/version and governance dashboard references.
- **Phase 96**: Swarm Tool Permission Boundaries. Mission-level allow/deny policy now flows through swarm routing and worker execution, with denied-tool rationale persisted in task history and emitted in telemetry.
- **Phase 97**: Swarm Tool Policy Normalization & Contract Feedback. Policies are normalized with deterministic deny precedence, and mission start responses now include effective policy + warning metadata.
- **Phase 98**: Swarm Dashboard Policy & Denial Telemetry Representation. UI now supports policy allow/deny inputs and surfaces effective policy warnings plus denied-tool events per task.
- **Phase 99**: Persistent Mission Policy Context & UI Summary. Effective policy + warnings are now persisted into mission context and surfaced in mission cards after refresh/history reload.
- **Phase 100**: Swarm Denied-Event Governance Filter & Aggregation UI. Mission cards now show denied-event totals and support denied-only task filtering for rapid audit workflows.
- **Phase 101**: Swarm Mission Risk Summary API & Dashboard Strip. Added backend risk aggregation and UI metrics panel for high-level denied-tool governance monitoring.
- **Phase 102**: Swarm Governance Severity & Top Denied Tools Analytics. Added severity scoring and top denied-tool trend visibility across missions for faster operational triage.
- **Phase 103**: Swarm Mission Risk Trend & Status Analytics. Added status breakdown and 24-hour denied-event trend analytics in API, with corresponding Missions UI governance cards/sparkline.
- **Phase 104**: Mission Risk Triage Ordering & Filtering UX. Added status filter + risk-first ordering controls and per-mission risk/24h denied badges in Missions view for faster operational triage.
- **Phase 105**: Server-Backed Mission Risk Rows for Governance Triage. Added `swarm.getMissionRiskRows` endpoint and switched Missions triage ordering/filtering to backend-derived risk rows.
- **Phase 106**: High-Risk Mission Focus Filter (Server-Enforced). Added `minRisk` filtering to mission risk rows API and a Missions UI high-risk toggle (`≥50`) backed by server query filtering.
- **Phase 107**: Configurable High-Risk Threshold Control (Server-Driven). Added threshold input + presets in Missions and wired dynamic threshold values into server-side `minRisk` filtering.
- **Phase 108**: Filter-Scoped Risk Facets Analytics. Added `swarm.getMissionRiskFacets` endpoint and UI card for filter-aware average/min/max/band risk analytics.
- **Phase 109**: Normalized Risk Band Percentages & Dominant Band Signal. Added percentage-normalized band outputs and dominant band indicator in API/UI for faster triage interpretation.
- **Phase 110**: Filter-Scoped Denied-Event Momentum Signals. Added filter-scoped 24h-vs-prior-24h denied-event trend analytics and UI momentum rendering.
- **Phase 111**: Filter-Scoped Risk Status Distribution Facets. Added filter-scoped status counts/percentages in risk facets API and corresponding Missions facets display.
- **Phase 112**: Filter-Scoped Facet Freshness Signals. Added freshness metadata in risk facets API and UI rendering for bucket/age/timestamps under active governance filters.
- **Phase 113**: Filter-Scoped Facets Health Signal. Added severity/score/reason health summary in risk facets API and corresponding Missions UI panel.
- **Phase 114**: Filter-Scoped Health Recommended Action Signal. Added API-provided health action guidance and surfaced it in the Missions facets health panel.
- **Phase 115**: Filter-Scoped Health Confidence Signal. Added filter-scoped confidence score/level in risk facets health output and surfaced confidence in the Missions health panel for operator trust calibration.
- **Phase 116**: Filter-Scoped Health Confidence Drivers. Added confidence driver explanations (`sample size`, `freshness`, `signal congestion`) in risk facets health output and surfaced these drivers in Missions for transparent confidence interpretation.
- **Phase 117**: Filter-Scoped Health Confidence Components. Added explicit confidence penalty components (`sampleSizePenalty`, `freshnessPenalty`, `signalCongestionPenalty`, `totalPenalty`) and rendered them in Missions facets for confidence-score auditability.
- **Phase 118**: Filter-Scoped Health Confidence Inputs. Added confidence scoring provenance fields (`missionCount`, `healthReasonCount`, `freshnessBucket`, `evaluatedAt`) and rendered them in Missions facets for confidence context traceability.
- **Phase 119**: Filter-Scoped Health Confidence Uncertainty Signals. Added confidence precision outputs (`uncertaintyMargin`, `scoreRange`) and rendered them in Missions facets for bounded confidence interpretation.
- **Phase 120**: Filter-Scoped Health Confidence Stability Signal. Added confidence stability output (`stable|watch|volatile`) and rendered it in Missions facets for rapid confidence-state triage.
- **Phase 121**: Filter-Scoped Health Confidence Guidance Signal. Added confidence advice output and rendered it in Missions facets for direct confidence-improvement guidance.
- **Phase 122**: Filter-Scoped Health Confidence Alert Signals. Added confidence alert outputs and rendered confidence alerts in Missions facets for explicit confidence risk warnings.
- **Phase 123**: Filter-Scoped Health Confidence Alert Level Signal. Added confidence alert-level output (`none|warn|critical`) and rendered alert-level badge in Missions facets for rapid confidence-alert severity triage.

### Antigravity Backlog Completion Sprint (2026-03-06)
- **Backlog Phase 98**: Environment-Safe Endpoint Strategy. Replaced all hardcoded `localhost` references in `swarm/page.tsx`, `autopilot/page.tsx`, `infrastructure/page.tsx`, and `DirectorConfig.tsx` with env vars. Created `apps/web/.env.example`.
- **Backlog Phase 99**: Knowledge Dashboard Type Integrity. Removed `ExpertTrpc` type hack and `as unknown as` cast. Fixed implicit `any` lint.
- **Backlog Phase 100**: Service Exposure Audit. Wired orphaned `ragRouter` into `appRouter`. Checked off backlog Items 8, 9, 9.1.
- **Backlog Phase 101**: Documentation Governance. Synced `STATUS.md` to v2.7.60. Added archival headers to `HANDOFF_LOG.md`.
- **Backlog Phase 102**: Placeholder Regression Checks. Created `scripts/check-placeholders.mjs` CI scanner.
- **Backlog Phase 103**: Extension Parity Matrix. Created `docs/EXTENSION_PARITY_MATRIX.md` with 30+ capabilities mapped.
- **Backlog Phase 104**: Browser Extension Env-Safe URLs. Replaced hardcoded `localhost:3001` with configurable `chrome.storage.sync` keys.
- **Result**: All 12 DETAILED_BACKLOG items (P0-P3) are now checked off.

## Next Steps
- Continue Extension Parity Milestone 2 (Cross-Surface Intelligence).
- Address placeholder scanner findings (171 critical markers for tracked reduction).
- Continue roadmap implementation for Borg.

## Technical Notes
- **Verification**: The P2P Mesh architecture is fully operational inside a single process via `globalMeshBus` fallback, but is designed for multi-node distribution via `redis`. Tests should use this architecture.
- Follow the universal LLM instructions. Always bump versions in `VERSION`, `VERSION.md`, and `CHANGELOG.md`.
