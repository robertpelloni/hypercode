# Task: MCP Search Profile-Aware Ranking

<<<<<<< HEAD:archive/tasks/completed/022-mcp-search-profile-aware-ranking.md
**Track:** B — Hypercode-native MCP router maturity  
=======
**Track:** B — Borg-native MCP router maturity  
>>>>>>> origin/rewrite/main-sanitized:tasks/completed/022-mcp-search-profile-aware-ranking.md
**Priority:** P1 implementation slice  
**Status:** Completed (2026-03-14)

## Context

MCP search ranking worked well for generic intent but treated all workflows the same. Operators switching between coding, browser automation, shell operations, or database tasks needed a way to bias ranking toward relevant tool families without overhauling query text.

## Changes Implemented

- [x] Added profile-aware ranking model in `packages/core/src/mcp/toolSearchRanking.ts`:
  - introduced `ToolSearchProfile` union:
    - `web-research`
    - `repo-coding`
    - `browser-automation`
    - `local-ops`
    - `database`
  - added profile keyword boost logic in scoring
  - threaded optional profile through ranking APIs
- [x] Extended telemetry schema in `packages/core/src/mcp/toolSelectionTelemetry.ts`:
  - added optional `profile` field on search events
- [x] Updated `packages/core/src/routers/mcpRouter.ts`:
  - `searchTools` now accepts optional `profile` input
  - profile is propagated through runtime/cached/live ranking flows
  - search telemetry now records selected profile
- [x] Updated `/dashboard/mcp/search` in `apps/web/src/app/dashboard/mcp/search/page.tsx`:
  - added task-profile selector chips
  - sends selected profile with search requests
  - surfaces profile in telemetry panel entries

## Validation

- [x] `pnpm -C packages/core exec tsc --noEmit`
- [x] `pnpm -C packages/core build`
- [x] `pnpm -C apps/web exec tsc --noEmit --pretty false`

## Outcome

MCP discovery can now adapt ranking to the current workflow profile while preserving existing intent search behavior. Telemetry captures the selected profile, making ranking decisions more traceable during debugging and operator review.
