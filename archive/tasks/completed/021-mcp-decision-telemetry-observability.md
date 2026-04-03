# Task: MCP Decision Telemetry Observability

**Track:** B — Hypercode-native MCP router maturity  
**Priority:** P1 implementation slice  
**Status:** Completed (2026-03-14)

## Context

Hypercode search/load behavior already emitted telemetry, but did not expose enough decision detail to debug model/tool routing quality. Operators could see *what* happened, but not *how confident* the decision path was or the latency impact.

## Changes Implemented

- [x] Extended auto-load decision model in `toolSearchRanking.ts`:
  - `confidence`
  - `scoreGap`
  - `topScore`
  - `secondScore`
- [x] Extended telemetry event schema in `toolSelectionTelemetry.ts`:
  - `latencyMs`
  - `topScore`
  - `scoreGap`
  - `autoLoadReason`
  - `autoLoadConfidence`
- [x] Updated `mcpRouter.searchTools` telemetry capture:
  - search latency across runtime/cached/live search paths
  - top-score + score-gap capture
  - auto-load confidence/reason propagation when auto-load is selected
- [x] Updated `mcpRouter` action telemetry for:
  - `loadTool` latency
  - `unloadTool` latency
  - `getToolSchema` (hydrate) latency
- [x] Updated `/dashboard/mcp/search` telemetry panel UI to render:
  - top score
  - score gap
  - confidence percentage
  - auto-load reason
  - latency in milliseconds

## Validation

- [x] `pnpm -C packages/core exec tsc --noEmit --pretty false`
- [x] `pnpm -C apps/web exec tsc --noEmit --pretty false`

## Outcome

Routing is now substantially more explainable: operators can quickly identify whether poor outcomes stem from ranking confidence, small score deltas (ambiguity), or latency penalties.
