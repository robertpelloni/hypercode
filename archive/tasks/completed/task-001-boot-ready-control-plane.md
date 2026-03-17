# Task 001: Boot-Ready Control Plane

## Context
When the user runs `pnpm run dev` inside Tabby, Borg should feel like a real local control plane instead of a loose collection of services warming up at different speeds. The next high-value milestone is to make startup deterministic, truthful, and operator-friendly so the MCP router, dashboard, memory, session supervisor, and extension bridge are ready or clearly reported as pending.

## Scope
- Files:
  - `scripts/dev_tabby_ready.mjs`
  - `scripts/dev_tabby_ready_helpers.mjs`
  - `packages/core/src/routers/startupStatus.ts`
  - `packages/core/src/MCPServer.ts`
  - `packages/core/src/routers/mcpRouter.ts`
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/app/dashboard/dashboard-home-view.tsx`
  - `apps/web/src/app/dashboard/integrations/page.tsx`
  - `apps/web/src/app/dashboard/mcp/system/page.tsx`
  - focused tests adjacent to the touched files
- Tests:
  - `packages/core/src/routers/startupStatus.test.ts`
  - dashboard/system helper tests and any startup helper tests needed for the new contract

## Requirements
1. `pnpm run dev` must establish a clear Borg startup contract with a single authoritative readiness payload.
2. The readiness payload must distinguish between:
   - core bridge ready
   - web dashboard reachable
   - MCP inventory available from last known good cache
   - live MCP connections ready
   - memory/context system initialized
   - session supervisor restored
   - browser/extension bridge accepting clients
3. MCP inventory should be advertised from cached metadata immediately when available, even before all downstream binaries are live.
4. Always-on tools must be visible in the advertised tool catalog without blocking startup on full downstream hydration.
5. The dashboard home and MCP system pages must explain the difference between:
   - cached inventory ready
   - live runtime connected
   - extension bridge ready but no client connected yet
6. The startup experience must prefer non-blocking warmup over synchronous startup stalls.
7. The browser extension install surfaces should continue to show Chromium and Firefox artifact readiness directly from the dashboard.
8. The implementation must not rename executable tool IDs in a way that breaks invocation; semantic aliases remain display/advertising metadata only.

## Acceptance Criteria
- [x] Running `pnpm run dev` yields one truthful readiness contract for core, web, MCP, memory, sessions, and extension bridge
- [x] Cached MCP servers/tools are advertised before all live server connections finish warming
- [x] Dashboard startup cards explain cached-vs-live state without false alarms
- [x] Always-on tools are advertised during startup without requiring the full working set to be manually loaded first
- [x] Browser extension readiness remains visible for Chromium and Firefox bundles
- [x] Test files exist or are updated and pass
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Out of Scope
- Full MetaMCP / Claude-mem / MCP-SuperAssistant feature parity in this task
- Adding new submodules or large new reference repos
- Rewriting the whole bootstrap path around a new language/runtime
- Browser chat injection parity across all providers in one step
- Provider billing and OAuth command center work beyond what is required for startup truthfulness
- Do not create new task files
- STOP when criteria are met
