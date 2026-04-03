# Task: MCP Search Hydration UX + Working-Set Grouping

**Track:** B — Hypercode-native MCP router maturity  
**Priority:** P1 implementation slice  
**Status:** Completed (2026-03-14)

## Context

`/dashboard/mcp/search` already supported search, load/unload, and telemetry, but did not expose schema hydration directly and conflated server always-on tools with user keep-warm preferences.

## Changes Implemented

- [x] Added `Hydrate schema` action on search result cards (enabled only when loaded and not already hydrated)
- [x] Added `Hydrate` action in working-set cards for loaded metadata-only tools
- [x] Added `mcp.listTools` snapshot usage in search page to infer advertised server always-on tool names
- [x] Split loaded working-set display into explicit sections:
  - `Server always-on`
  - `Keep warm profile`
  - `Dynamic loaded`
- [x] Updated badges in search results to distinguish:
  - `server always-on` (advertised by server/runtime)
  - `keep warm profile` (user preference from tool selection settings)
- [x] Ensured load/unload/hydrate actions invalidate working set + search + telemetry for immediate UI consistency

## Validation

- [x] `pnpm -C apps/web exec tsc --noEmit --pretty false`

## Notes

No dedicated MCP search page tests currently exist in `apps/web/src/app/dashboard/mcp/search`; this slice is currently validated by typecheck and existing runtime panel behavior.
