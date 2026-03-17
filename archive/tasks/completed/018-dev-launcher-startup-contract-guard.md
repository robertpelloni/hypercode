# Task: Dev Launcher Startup Contract Guard

## Context
`pnpm run dev` can reuse an already-running Borg core bridge on port `3001`. That saves time, but it also means the launcher can accidentally attach to an older control-plane instance whose `startupStatus` payload predates the current readiness contract and then incorrectly report the stack as ready.

## Requirements
1. The dev launcher must not report ready unless the live `startupStatus` payload exposes the current readiness-contract fields.
2. If the launcher reuses an older bridge that serves an outdated startup contract, it must surface a concrete waiting reason instead of a false-ready summary.
3. Focused regression coverage must lock the compatibility guard and waiting-reason behavior.

## Acceptance Criteria
- [x] `scripts/dev_tabby_ready.mjs` now gates ready-state reporting on a compatibility check for the live `startupStatus` contract.
- [x] `scripts/dev_tabby_ready_helpers.mjs` exposes a reusable compatibility predicate and adds a dedicated waiting reason for startup-contract drift.
- [x] `pnpm exec vitest run scripts/dev_tabby_ready_helpers.test.ts` passes with coverage for older payload rejection and current payload acceptance.
- [x] A live `pnpm run dev` sanity check now warns when an older reused core bridge serves a stale startup contract instead of claiming the stack is ready.

## Out of Scope
- Automatically killing and replacing an existing stale core bridge process
- Broader startup-contract schema redesign beyond the launcher guard
- Do not create new task files
- STOP when criteria are met