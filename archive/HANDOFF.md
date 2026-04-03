# Hypercode Handoff

_Last updated: 2026-03-18_

## Current state summary

This handoff reflects a documentation-overhaul sync to current repository reality.

### What was completed in this handoff

- Rewrote canonical root planning docs to remove duplicate/stale eras and conflicting narratives.
- Normalized roadmap and TODO to one active, reality-based queue.
- Replaced stale/duplicated long-form vision and memory docs with concise current-state versions.
- Replaced the oversized historical handoff log with this canonical current snapshot.

### Files rewritten in this handoff

- `ROADMAP.md`
- `TODO.md`
- `VISION.md`
- `MEMORY.md`
- `DEPLOY.md`
- `HANDOFF.md`

## Operational truth (now)

- Core release line: `2.7.329` (`VERSION`)
- Hypercode 1.0 focus remains:
  1. MCP router
  2. provider fallback/routing
  3. session supervision
  4. truthful dashboard operations
- Major historical runtime regressions around MCP transport/import are tracked as fixed, but must stay guarded by smoke + route-shape tests.

## Latest continuation slice (2.7.325)

- Restored active task workflow by creating:
  - `tasks/active/024-startup-readiness-smoke-contract.md`
  - `tasks/active/025-mcp-dashboard-runtime-smoke-and-import.md`
  - `tasks/active/026-session-supervisor-worktree-attach.md`
- Synchronized version references by updating:
  - `VERSION` → `2.7.325`
  - `VERSION.md` → `2.7.325`
- Added changelog entry:
  - `CHANGELOG.md` `2.7.325` for task-workflow restoration + version sync

## Latest continuation slice (2.7.326)

- Hardened MCP import robustness coverage for realistic managed-server payloads in:
  - `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
- Added regression assertions for:
  - batched proxy normalization preserving mixed transport/auth/env/header fields
  - local compat bulk-import fallback with realistic payloads and typed server-detail retrieval
- Validated focused MCP compatibility suites:
  - `apps/web/src/app/api/trpc/[trpc]/route.test.ts`
  - `apps/web/tests/integration/mcp-to-dashboard.test.ts`
  - result: **12/12 passing**
- Synced version and changelog for this slice:
  - `VERSION` / `VERSION.md` -> `2.7.326`
  - `CHANGELOG.md` -> `2.7.326`

## Latest continuation slice (2.7.327)

- Advanced startup-readiness task evidence with a live smoke probe run:
  - `node scripts/verify_dev_readiness.mjs --json --soft`
  - result: `passed: true`
- Verified live readiness probes were up for:
  - web startup status
  - core bridge stream/health
  - MCP status route
  - memory status route
- Verified extension artifact readiness remained green for:
  - `apps/hypercode-extension/dist-chromium`
  - `apps/hypercode-extension/dist-firefox`
- Updated active task brief with checked smoke criterion and concrete validation log:
  - `tasks/active/024-startup-readiness-smoke-contract.md`
- Synced version/changelog for this documentation-truthfulness validation slice:
  - `VERSION` / `VERSION.md` -> `2.7.327`
  - `CHANGELOG.md` -> `2.7.327`

## Latest continuation slice (2.7.328)

- Advanced startup-readiness acceptance with focused test validation:
  - `packages/core/src/routers/startupStatus.test.ts`
  - `apps/web/src/app/dashboard/dashboard-home-view.test.tsx`
  - `apps/web/src/app/dashboard/DashboardHomeClient.test.tsx`
  - result: **52/52 passing**
- Updated `tasks/active/024-startup-readiness-smoke-contract.md` to mark:
  - startup-status/dashboard semantic consistency criterion complete
  - focused startup/readiness tests criterion complete
- Synced version/changelog for this validation slice:
  - `VERSION` / `VERSION.md` -> `2.7.328`
  - `CHANGELOG.md` -> `2.7.328`

## Latest continuation slice (2.7.329)

- Closed the remaining startup-readiness acceptance gap for zero-server/fresh-install behavior by hardening:
  - `packages/core/src/routers/startupStatus.ts`
  - zero-server installs now treat config sync as non-blocking by definition, preventing stale sync flags from causing indefinite pending.
- Added focused regression coverage in:
  - `packages/core/src/routers/startupStatus.test.ts`
  - test: `zero-server initialized boot does not get stuck pending on stale config-sync flags`
- Revalidated startup/dashboard readiness suites:
  - `packages/core/src/routers/startupStatus.test.ts`
  - `apps/web/src/app/dashboard/dashboard-home-view.test.tsx`
  - `apps/web/src/app/dashboard/DashboardHomeClient.test.tsx`
  - result: **53/53 passing**
- Updated active task brief and checked the final criterion:
  - `tasks/active/024-startup-readiness-smoke-contract.md`
- Synced version/changelog for this slice:
  - `VERSION` / `VERSION.md` -> `2.7.329`
  - `CHANGELOG.md` -> `2.7.329`

## Latest continuation slice (2.7.330–2.7.332)

- Fixed `LanceDBStore.addMemory` to sanitize metadata before writing (Arrow schema inference).
- Fixed `HealerReactor` exponential backoff + known-unrecoverable error filtering.
- Fixed `TerminalSensor` stderr buffering to prevent partial log chunk healer storms.
- Added `TerminalSensor` regression coverage for partial stderr buffering.
- Prevented zero-server fresh-install startup from getting stuck in permanent pending.
- Added `startupStatus` regression for stale zero-server config-sync flags.
- Hardened MCP import robustness for realistic managed-server payloads.
- Rewrote README for public release (HN/Reddit framing, Docker quick-start, route table).
- Untracked `chat.json`, `audit-*.jsonl` from git; extended `.gitignore`.
- Added root `.env.example`.

## Latest continuation slice (2.7.333)

- feat(web): Mission Control function-toggle matrix on main dashboard.
  - Driven by shared `SIDEBAR_SECTIONS` route catalog (~75 routes, 5 sections).
  - `localStorage`-persisted per-function toggle state with sanitization/merge on hydration.
  - "Enable all" and "Core only" preset buttons (core-only enables `CORE_DASHBOARD_NAV` 11 items).
  - Per-section bulk toggles, per-function enable checkbox, quick-launch preview strip (top 12 enabled).
  - New file: `apps/web/src/app/dashboard/mission-control-function-toggles.tsx`.
  - Modified: `dashboard-home-view.tsx` (import + render), `dashboard-home-view.test.tsx` (8 new assertions).
  - 38/38 tests passing; web TypeScript clean.

## Next recommended steps

1. Run a fresh root smoke cycle (`pnpm run dev` + dashboard MCP/session/billing critical path checks).
2. Address remaining 1.0 blockers: session supervisor attach story, provider auth/quota truthfulness.
3. Keep `tasks/active/` populated with the next 1–3 concrete blockers.
4. Continue docs discipline: update roadmap/todo/handoff/changelog in the same PR as behavior changes.

## Handoff rule

This file is the canonical short state snapshot.

Historical deep logs belong in archive/docs, not appended endlessly to root `HANDOFF.md`.
