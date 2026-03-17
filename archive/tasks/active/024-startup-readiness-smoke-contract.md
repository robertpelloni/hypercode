# Task: Startup Readiness Smoke Contract

## Context
Borg exposes a startup/readiness contract, but release confidence requires repeatable smoke verification that launcher behavior, dashboard state, and startup API semantics stay aligned.

## Scope
- `scripts/dev_tabby_ready.mjs`
- `scripts/verify_dev_readiness.mjs`
- `packages/core/src/routers/startupStatus.ts`
- dashboard startup/system surfaces under `apps/web/src/app/dashboard/**`
- focused tests adjacent to touched files

## Requirements
1. Verify startup semantics from a clean root run (`pnpm run dev`) on Windows.
2. Ensure launcher success criteria and `startupStatus` fields match exactly.
3. Ensure dashboard startup/system cards reflect the same readiness state without contradictory wording.
4. Preserve non-blocking behavior while clearly labeling pending subsystems.
5. Add/adjust focused tests for any readiness logic updates.

## Acceptance Criteria
- [x] Clean root smoke run completes with truthful ready summary
- [x] `startupStatus` and dashboard startup cards are semantically consistent
- [x] No false-ready or permanent-pending states for zero-server/fresh-install scenarios
- [x] Focused startup/readiness tests pass
- [x] `CHANGELOG.md` updated if behavior changes

## Out of Scope
- Large architectural rewrites
- New feature surface expansion unrelated to startup truthfulness

## Latest validation evidence (2026-03-17)

- Ran: `node scripts/verify_dev_readiness.mjs --json --soft`
- Result: `passed: true`
- Key probes up:
	- dashboard startup status via web API on `3000`
	- core bridge health/stream on `3001`
	- MCP status probe via web API on `3000`
	- memory status probe via web API on `3000`
- Extension artifacts verified present:
	- `apps/borg-extension/dist-chromium`
	- `apps/borg-extension/dist-firefox`

## Focused startup/readiness tests (2026-03-17)

- Ran:
	- `pnpm exec vitest run packages/core/src/routers/startupStatus.test.ts apps/web/src/app/dashboard/dashboard-home-view.test.tsx apps/web/src/app/dashboard/DashboardHomeClient.test.tsx`
- Result:
	- **3/3 test files passing**
	- **53/53 tests passing**

## Zero-server permanent-pending regression coverage (2026-03-17)

- Hardened startup readiness contract in `packages/core/src/routers/startupStatus.ts`:
	- zero-server/fresh-install (`configured=0`, `persisted=0`) now treats config sync as non-blocking by definition.
	- avoids stale `configSync.inProgress` / `configSync.lastError` status from causing indefinite pending on empty installs.
- Added focused regression in `packages/core/src/routers/startupStatus.test.ts`:
	- `zero-server initialized boot does not get stuck pending on stale config-sync flags`
	- verifies no `mcp_config_sync_pending` blocker in zero-server initialized state even with stale status flags.
