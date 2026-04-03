# Task 005: Dashboard MVP

## Context

Hypercode needs one operator-facing page that surfaces router health, provider fallback posture, and supervised session activity quickly enough for first-time users to understand the system within a minute.

## Scope

- Files: `apps/web/**`, plus supporting backend contracts already wired through the existing tRPC dashboard surface
- Tests: `apps/web/tests/integration/mcp-to-dashboard.test.ts`, `apps/web/tests/integration/fallback-e2e.test.ts`, `apps/web/tests/integration/session-lifecycle.test.ts`

## Requirements Completed

1. The dashboard home surface provides the four Hypercode 1.0 panels: Overview, MCP Router, Sessions, and Providers.
2. The dashboard reads live backend data through the existing tRPC contracts instead of placeholder-only widgets.
3. The UI exposes quota posture, session state, server health, and recent traffic from the same dashboard home flow.
4. The initial `/dashboard` path remains understandable for first-time operators.

## Acceptance Criteria

- [x] The four v1 dashboard panels exist and are wired to real backend data
- [x] Operators can inspect server health, provider quota state, and session lifecycle from the UI
- [x] Integration coverage exists for the dashboard-facing system flows listed in scope
- [x] No placeholder-only widgets are added without live backing data
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Verification

- Verified the live `/dashboard` implementation in `apps/web/src/app/dashboard/page.tsx`, `DashboardHomeClient.tsx`, and `dashboard-home-view.tsx`.
- Verified the dashboard reads live data from `trpc.mcp.getStatus`, `trpc.mcp.listServers`, `trpc.mcp.traffic`, `trpc.billing.getProviderQuotas`, `trpc.billing.getFallbackChain`, and `trpc.session.list`.
- Added integration coverage under `apps/web/tests/integration/` for:
  - MCP router compatibility and dashboard posture (`mcp-to-dashboard.test.ts`)
  - provider quota/fallback wiring (`fallback-e2e.test.ts`)
  - supervised session action wiring and dashboard refresh behavior (`session-lifecycle.test.ts`)
- Re-ran the focused dashboard suite successfully:
  - `pnpm exec vitest run apps/web/src/app/api/trpc/[trpc]/route.test.ts apps/web/src/app/dashboard/dashboard-home-view.test.tsx apps/web/src/app/dashboard/DashboardHomeClient.test.tsx apps/web/tests/integration/mcp-to-dashboard.test.ts apps/web/tests/integration/fallback-e2e.test.ts apps/web/tests/integration/session-lifecycle.test.ts`
- Re-verified the production web build succeeds with `WEB_BUILD_OK` from `pnpm -C apps/web build --webpack`.

## Notes

- This task was largely implemented before review, but it was still missing the task-shaped integration coverage called out in the backlog entry.
- The backlog entry has been retired now that the dashboard MVP implementation and verification evidence are aligned.

Completed on 2026-03-09.