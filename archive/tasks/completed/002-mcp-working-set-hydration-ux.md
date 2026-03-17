# Task: MCP Router Progressive Disclosure — Complete Working Set Story

**Track:** B — Borg-native MCP router maturity  
**Priority:** P0 item #3 (ongoing)  
**Status:** Ready for implementation slice

## Context

From `TODO.md` item #3, the MCP router has search, load, unload, and preferences implemented in `mcpRouter.ts`, but the working-set story and schema hydration UX are still incomplete:

- `/dashboard/mcp/search/page.tsx` — functional and backed by real procedures
- `/dashboard/mcp/inspector/page.tsx` — functional with schema hydration
- The `getWorkingSet` procedure exists but working-set eviction feedback and hydration state are not prominently surfaced in operator-visible UI

## Requirements

1. Audit the current `getWorkingSet` payload shape and ensure all fields (`hydrated`, `lastLoadedAt`, `lastHydratedAt`) are clearly labeled in the inspector and search pages.
2. Add explicit "Hydrate" button to the search page for tools that are loaded but not yet hydrated (`loaded: true, hydrated: false`).
3. Add a "Pinned Always-On" section to `/dashboard/mcp/search` that clearly shows the always-on vs always-loaded distinction.
4. Verify the `searchTools` result for a large inventory (>50 tools) returns useful ranked results rather than just substring matches.

## Acceptance Criteria

- [ ] Inspector page clearly distinguishes `loaded` vs `loaded+hydrated` for each working-set tool
- [ ] Search page exposes a direct hydration action for unhydrated loaded tools
- [ ] Always-on tools are visually separated from preference-loaded tools in working-set view
- [ ] Focused search regression tests cover the `searchTools` ranking path
