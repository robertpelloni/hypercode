# Maestro Handoff Document

## Session Summary

**Date**: April 10, 2026
**Version**: 0.15.7

During this session, Maestro was expanded to support a massive roster of CLI agents and further transitioned into a **Go/TypeScript Hybrid** application using Wails v3. The legacy Electron backend is actively being deprecated.

### Completed Work:

1.  **Agent CLI Roster Expansion**: Added support for 24 new CLI agents (Adrenaline CLI, Amazon Q CLI, etc.) in `src/shared/agentIds.ts`, `src/shared/agentMetadata.ts`, and `src/shared/agentConstants.ts`.
2.  **Go Translation**: Ported the list of Agent IDs to Go types in `go/internal/types/agent_ids.go`.
3.  **Documentation Updates**: Bumped version to 0.15.7 across `package.json`, `VERSION`, `VERSION.md`, `CHANGELOG.md`. Added the new agents to `ROADMAP.md` and `TODO.md`.

### Outstanding Tasks for Next Agent:

The next AI model (e.g., Claude Opus 4.6 or GPT Codex 5.3) should pick up the following tasks from `TODO.md`:

1.  **Agent CLI Roster Expansion**: Build out parsers, capabilities, and storage handlers for the newly introduced CLI agents. Make sure UI options reflect the newly added tools.
2.  **Terminal Tabs Migration**: Remove legacy `shellLogs` dependencies in `useInputProcessing.ts`, `useAgentListeners.ts`, and `useInterruptHandler.ts`. This is a critical technical debt item blocking the full transition to persistent PTY-backed terminal tabs.
3.  **Session Model Refactoring**: Finalize the 'parent/child' model for sessions and worktrees in `useWorktreeHandlers.ts`.

### Project State Notes:

- The Go backend is located in `/go`. The frontend remains in `/src/renderer`.
- All persistent state should be routed through `go/internal/persistence` rather than `localStorage` or `electron-store`.
- Submodules are currently empty, but the structure is prepped for future plugin expansion.
