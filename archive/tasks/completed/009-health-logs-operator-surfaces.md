# Task 009: Health, Logs & Operator Surfaces

## Context
Several backend routers (health, logs, LSP, audit, tests, context, graph, git, saved scripts) have real implementations but no proportional dashboard UI. Operators cannot see or use these capabilities.

## Scope
- Files: `apps/web/src/app/dashboard/health/page.tsx` (new or enhanced)
- Files: `apps/web/src/app/dashboard/logs/page.tsx` (new or enhanced)
- Files: `apps/web/src/app/dashboard/system/page.tsx` (new or enhanced)
- Backend: `packages/core/src/routers/serverHealthRouter.ts`, `logsRouter.ts`, `auditRouter.ts`
- Tests: Browser visual verification + API smoke tests

## Requirements
1. Health dashboard shows server uptime, resource usage, and subsystem health
2. Logs dashboard shows searchable, filterable log output
3. Audit trail is accessible for operator review
4. All surfaces are labeled with appropriate maturity level

## Acceptance Criteria
- [ ] Health page shows real server health data
- [ ] Logs page shows queryable log entries
- [ ] Audit page shows system audit trail
- [ ] Pages integrate with existing tRPC routers
- [ ] No @ts-ignore added
- [ ] CHANGELOG.md updated

## Out of Scope
- LSP/tests/graph/git/scripts surfaces (backlog)
- Do not create new task files
- STOP when criteria are met
