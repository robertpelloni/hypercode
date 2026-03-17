# Task: MCP Search Auto-Load Confidence Threshold

**Track:** B — Borg-native MCP router maturity  
**Priority:** P1 implementation slice  
**Status:** Completed (2026-03-14)

## Context

Auto-load decisions in cached ranking already exposed confidence telemetry, but operators could not control the minimum confidence required before Borg auto-loaded the top candidate. This made tuning difficult for different workflows and risk tolerance levels.

## Changes Implemented

- [x] Extended tool preference model in `packages/core/src/routers/mcp-tool-preferences.ts`:
  - added `autoLoadMinConfidence` field
  - defaulted to `0.85`
  - normalized/clamped to `0.50..0.99`
  - persisted in `settings.toolSelection`
- [x] Updated auto-load decision path in `packages/core/src/mcp/toolSearchRanking.ts`:
  - added optional `minConfidence` option to `pickAutoLoadCandidate(...)`
  - candidate is now rejected when computed confidence is below the configured threshold
- [x] Updated router wiring in `packages/core/src/routers/mcpRouter.ts`:
  - `setToolPreferences` now accepts `autoLoadMinConfidence`
  - cached ranking auto-load passes `preferences.autoLoadMinConfidence` into ranking decision
  - fallback preference shape now includes default confidence floor
- [x] Updated dashboard settings in `apps/web/src/app/dashboard/mcp/search/page.tsx`:
  - added confidence floor UI (slider + numeric input + save action)
  - ensured tool preference mutations preserve and send confidence floor
- [x] Updated inspector mutations in `apps/web/src/app/dashboard/mcp/inspector/page.tsx`:
  - always-on toggle mutations now preserve `autoLoadMinConfidence`
- [x] Updated tests:
  - `packages/core/src/routers/mcp-tool-preferences.test.ts`
  - `packages/core/src/services/config/JsonConfigProvider.test.ts`

## Validation

- [x] `pnpm exec vitest run packages/core/src/routers/mcp-tool-preferences.test.ts packages/core/src/services/config/JsonConfigProvider.test.ts`
- [x] `get_errors` for `packages/core` and `apps/web` reports no current diagnostics
- [x] `pnpm -C packages/core exec tsc --noEmit --pretty false`
- [x] `pnpm -C apps/web exec tsc --noEmit --pretty false`

## Outcome

Borg’s MCP search auto-load behavior is now tunable by operators. Teams can keep aggressive auto-loading for high-speed workflows or raise the confidence bar to reduce accidental tool loads in ambiguous searches, while retaining existing telemetry explainability.