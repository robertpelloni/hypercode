# Task 004: Session Supervisor

## Context
Hypercode should supervise coding tools, not impersonate them. The session supervisor makes external CLI sessions reliable, resumable, and isolated.

## Scope
- Files: `packages/core/supervisor/**`, related persistence/state wiring, worktree helpers, and dashboard contracts required for session lifecycle visibility
- Tests: `packages/core/supervisor/__tests__/spawn.test.ts`, `restart.test.ts`, `health.test.ts`, `worktree.test.ts`, `session-persist.test.ts`

## Requirements Completed
1. Implemented a typed `SessionSupervisor` runtime for creating, starting, stopping, restarting, and restoring supervised CLI sessions.
2. Implemented crash detection with exponential backoff restart scheduling, restart-attempt metadata, and session health tracking.
3. Implemented session persistence to Hypercode-owned state so supervised sessions can be restored after restart.
4. Implemented attach/log contracts for operator visibility, including PID/cwd metadata and bounded stdout/stderr/system log history.
5. Implemented worktree-aware isolation for parallel sessions targeting the same repository and exposed the supervisor through session router/runtime contracts.

## Acceptance Criteria
- [x] Session start/stop/restart flows are implemented through the supervisor layer
- [x] Crash recovery is automatic and test-covered
- [x] Persisted sessions can be restored after Hypercode restart
- [x] Worktree isolation is enforced for parallel coding sessions
- [x] All listed test files exist and pass
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Verification
- Confirmed supervisor implementation in:
	- `packages/core/src/supervisor/SessionSupervisor.ts`
	- `packages/core/src/supervisor/types.ts`
	- `packages/core/src/routers/sessionRouter.ts`
	- `packages/core/src/MCPServer.ts`
	- `packages/core/src/lib/trpc-core.ts`
- Verified targeted supervisor tests pass from the repo root:
	- `packages/core/supervisor/__tests__/spawn.test.ts`
	- `packages/core/supervisor/__tests__/restart.test.ts`
	- `packages/core/supervisor/__tests__/health.test.ts`
	- `packages/core/supervisor/__tests__/worktree.test.ts`
	- `packages/core/supervisor/__tests__/session-persist.test.ts`
- Verified `pnpm -C packages/core exec tsc --noEmit` passes (`CORE_TSC_OK`)
- Verified `get_errors` reports no errors for `packages/core`

## Notes
- The backlog task was still unchecked even though the supervisor module, router exposure, test suite, and changelog entry were already in place.
- This archive move records the validated state so remaining backlog work reflects what is actually unfinished.

## Completion
- Validated and archived on 2026-03-09 after confirming supervisor tests and core typecheck/package health.