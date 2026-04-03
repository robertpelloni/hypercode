# Task 003: Model Fallback & Provider Routing

## Context
Provider fallback keeps Hypercode usable when quotas or rate limits bite. It also unlocks Hypercode's own internal development loops by making model switching automatic.

## Scope
- Files: `packages/core/providers/**`, provider wiring, shared provider schemas, and dashboard state needed for quota visibility
- Tests: `packages/core/providers/__tests__/fallback-chain.test.ts`, `quota-tracker.test.ts`, `strategy.test.ts`, `auth.test.ts`

## Requirements Completed
1. Normalized the provider layer around shared auth, quota, model, and routing types.
2. Implemented registry-backed provider auth detection covering API key, OAuth, PAT, and local/no-auth providers.
3. Implemented normalized quota snapshots plus rate-limit/quota-exhaustion state transitions for dashboard consumption.
4. Implemented deterministic fallback selection with cheapest, best, and round-robin routing strategies plus task-type-aware defaults.
5. Added coverage for auth normalization, quota tracking, routing strategy ordering, and fallback after quota/rate-limit failures.

## Acceptance Criteria
- [x] At least three providers can be configured/authenticated through the normalized provider layer
- [x] Automatic fallback succeeds on quota/rate-limit errors
- [x] Routing strategy changes affect candidate ordering deterministically
- [x] Quota data is exposed for dashboard consumption
- [x] All listed test files exist and pass
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Verification
- Confirmed provider implementation in:
	- `packages/core/src/providers/ProviderRegistry.ts`
	- `packages/core/src/providers/NormalizedQuotaService.ts`
	- `packages/core/src/providers/CoreModelSelector.ts`
	- `packages/core/src/providers/types.ts`
- Verified targeted provider tests pass from the repo root:
	- `packages/core/providers/__tests__/auth.test.ts`
	- `packages/core/providers/__tests__/quota-tracker.test.ts`
	- `packages/core/providers/__tests__/strategy.test.ts`
	- `packages/core/providers/__tests__/fallback-chain.test.ts`
- Verified `get_errors` reports no errors for `packages/core`

## Notes
- The task file was still sitting in `tasks/backlog/` even though the provider routing implementation and tests were already in place.
- This archive move records that validated state so the backlog reflects actual remaining work.

## Completion
- Validated and archived on 2026-03-09 after confirming provider tests and core package health.