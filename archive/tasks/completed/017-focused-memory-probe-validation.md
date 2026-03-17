# Task: Focused Memory & Probe Validation

## Context
Recent startup, memory dashboard, MCP server-probe, and provider-fallback slices were already partially validated, but reused task terminals surfaced stale failure output that made the live status ambiguous.

## Requirements
1. Re-run the focused core validation directly for startup, cached-inventory warmup, background bootstrap, and memory pivot/timeline/cross-session helpers.
2. Re-run the focused web validation directly for the memory dashboard helpers, claude-mem status framing, MCP server-probe helpers, and dashboard startup/system surfaces.
3. Re-run the current billing fallback integration slice and `apps/web` typecheck directly to distinguish live failures from stale task-terminal noise.

## Acceptance Criteria
- [x] Focused core validation passed for `agentMemoryPivot`, `agentMemoryTimeline`, `agentMemoryConnections`, `backgroundCoreBootstrap`, `systemProcedures`, `startupStatus`, and `MCPAggregator`.
- [x] Focused web validation passed for `memory-dashboard-utils`, `claude-mem-status`, `server-probe-utils`, `system-status-helpers`, `dashboard-home-view`, `DashboardHomeClient`, and `mcp-to-dashboard`.
- [x] Direct rerun of the billing fallback integration slice passed without additional code changes.
- [x] Direct `pnpm -C packages/core exec tsc --noEmit` returned `CORE_TSC_OK`.
- [x] Direct `pnpm -C apps/web exec tsc --noEmit --pretty false` returned `WEB_TSC_OK`.
- [x] `CHANGELOG.md` updated.

## Out of Scope
- New runtime or dashboard functionality
- Repo-wide test sweeps outside the current startup/memory/MCP validation cluster
- Do not create new task files
- STOP when criteria are met
