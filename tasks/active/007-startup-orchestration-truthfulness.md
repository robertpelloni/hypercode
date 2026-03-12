# Task 007: Startup Orchestration Truthfulness

## Context
The product promise starts with `pnpm run dev` and `docker compose up --build`. Borg now exposes `startupStatus`, but the boot story must be deterministic and verifiable end-to-end.

## Scope
- Files: `scripts/dev_tabby_ready.mjs`, `packages/core/src/routers/startupStatus.ts`, `packages/core/src/routers/systemProcedures.ts`, `packages/cli/src/commands/start.ts`
- Tests: `packages/core/src/routers/startupStatus.test.ts`

## Requirements
1. `pnpm run dev` reports one canonical readiness contract
2. `/dashboard` reflects the same boot state as the launcher
3. Fresh installs with zero MCP servers do not appear "stuck booting"
4. Startup regressions have focused tests

## Acceptance Criteria
- [ ] `startupStatus` API returns consistent, truthful data
- [ ] Dashboard home matches launcher readiness state
- [ ] Zero-server fresh installs boot cleanly
- [ ] 5+ startup tests pass
- [ ] No @ts-ignore added
- [ ] CHANGELOG.md updated

## Out of Scope
- Adding new subsystems to the boot contract
- Do not create new task files
- STOP when criteria are met
