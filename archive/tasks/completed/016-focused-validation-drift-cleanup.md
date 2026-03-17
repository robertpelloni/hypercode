# Task: Focused Validation Drift Cleanup

## Context
Recent startup, memory, and MCP probe slices were already functionally green in focused unit coverage, but the follow-up validation pass exposed a small integration-test mock drift and stale uncertainty around the current web typecheck posture.

## Requirements
1. Keep the focused dashboard fallback integration test aligned with the current `DashboardHomeClient` hook usage.
2. Re-verify the startup, memory, MCP probe, and dashboard slices with focused tests.
3. Confirm the current `apps/web` typecheck status after the validation cleanup.

## Acceptance Criteria
- [x] `apps/web/tests/integration/fallback-e2e.test.ts` no longer reaches the real tRPC hook stack during server-side render.
- [x] Focused core-side validation passed for startup status, system procedures, background bootstrap, MCP aggregator, and memory helper coverage.
- [x] Focused web-side validation passed for dashboard startup helpers, memory dashboard helpers, MCP probe helpers, and fallback integration coverage.
- [x] `pnpm -C apps/web exec tsc --noEmit --pretty false` passed after the cleanup.
- [x] `CHANGELOG.md` updated.

## Out of Scope
- New dashboard features or backend capability expansion
- Broader repo-wide test sweeps unrelated to the current startup/memory/MCP validation cluster
- Do not create new task files
- STOP when criteria are met