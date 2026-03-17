# Task: MCP Dashboard Runtime Smoke and Import Robustness

## Context
MCP transport/import regressions were previously fixed, but this path remains a release-sensitive area and must be continuously validated against real request shapes.

## Scope
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- `apps/web/src/utils/TRPCProvider.tsx`
- `apps/web/tests/integration/mcp-to-dashboard.test.ts`
- MCP dashboard import/polling UI paths under `apps/web/src/app/dashboard/mcp/**`

## Requirements
1. Re-run clean MCP dashboard smoke checks for polling, status, and import/edit flow.
2. Confirm route compatibility logic handles dashboard request shapes exactly (including batch/proxy variants).
3. Validate realistic managed-server import payloads, not only minimal examples.
4. Keep regression tests aligned to live dashboard behavior.
5. Ensure Windows local dev behavior remains stable.

## Acceptance Criteria
- [ ] No recurring 405/400 class regressions in MCP dashboard normal flow
- [ ] Realistic `mcpServers` import payloads succeed in smoke validation
- [ ] Route and integration tests cover failing shapes seen in practice
- [ ] `CHANGELOG.md` updated for behavioral changes

## Out of Scope
- Full redesign of MCP dashboard information architecture
- New MCP feature domains unrelated to runtime stability
