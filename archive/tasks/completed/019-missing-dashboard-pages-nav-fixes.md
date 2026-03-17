# Task: Missing Dashboard Pages and Nav Fixes

**Track:** A — Boot-ready control plane / Operator surface completeness  
**Priority:** P1 — Implemented backend, missing UI surface  
**Status:** In Progress

## Context

Several nav items in the Borg sidebar pointed to routes that returned 404 because no page files existed:
- `/dashboard/command` – backed by `commands` tRPC namespace
- `/dashboard/chronicle` – backed by `git` tRPC namespace
- `/dashboard/library` – Resource hub with no backend router needed
- `/dashboard/context` – backed by `borgContext` tRPC namespace (new nav item added)

Additionally, `/dashboard/session` was not linked from `CORE_DASHBOARD_NAV` even though it is a P0 operator surface.

## Work Completed

- [x] Created `apps/web/src/app/dashboard/command/page.tsx` — Command REPL with live command list, slash-command execution, arrow-key history, and output display
- [x] Created `apps/web/src/app/dashboard/chronicle/page.tsx` — Git commit log viewer with configurable history limit and working-tree status panel
- [x] Created `apps/web/src/app/dashboard/library/page.tsx` — Resource library hub linking to scripts, skills, tool sets, memory, plans, manual, chronicle, and architecture pages with live item counts
- [x] Created `apps/web/src/app/dashboard/context/page.tsx` — Context manager with add/remove file controls, file list, and assembled context prompt viewer with copy button
- [x] Updated `apps/web/src/components/mcp/nav-config.ts`:
  - Added "Sessions" to `CORE_DASHBOARD_NAV` pointing to `/dashboard/session`
  - Added "Context Manager" to `LABS_DASHBOARD_NAV` pointing to `/dashboard/context`
  - Added descriptions for `Command`, `Symbols`, `Code` nav items
  - Added "Chronicle" and "Library" to `LABS_DASHBOARD_NAV` with descriptions
- [x] Full `apps/web` typecheck passes (0 errors)

## Acceptance Criteria

- [x] No 404s for nav items pointing to `command`, `chronicle`, `library`
- [x] Context Manager page provides real add/remove/clear/prompt operations via `borgContext` tRPC
- [x] Chronicle shows real git log and working-tree status via `git` tRPC
- [x] Command REPL shows available slash commands and executes them via `commands` tRPC
- [x] Sessions is reachable from the `Borg 1.0 Core` sidebar section
- [x] TypeScript clean
