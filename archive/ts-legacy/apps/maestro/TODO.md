# Maestro TODO & Issue Tracker

## Short-Term Tasks & Bug Fixes

### Unfinished Migrations & Technical Debt

- [ ] **Agent CLI Roster Expansion**: Build out parsers, capabilities, and storage handlers for the newly introduced CLI agents (Adrenaline CLI, Amazon Q CLI, etc.). Make sure UI options reflect the newly added tools.
- [ ] **Terminal Tabs Migration**: Remove legacy `shellLogs` dependencies in `useInputProcessing.ts`, `useAgentListeners.ts`, and `useInterruptHandler.ts`. Complete the shift to persistent PTY-backed terminal tabs.
- [ ] **Session Model Refactoring**: Finalize the 'parent/child' model for sessions and worktrees in `useWorktreeHandlers.ts` and clean up `src/renderer/types/index.ts`.
- [ ] **Legacy IPC Handlers**: Deprecate legacy process spawning handlers in `src/main/ipc/handlers/process.ts` in favor of `process:spawnTerminalTab`.
- [ ] **Group Chat Polish**: Dynamically resolve the moderator agent type in `useGroupChatHandlers.ts` instead of hardcoding it.

### Mobile & Web Interface

- [x] **Zero-Config PWA**: Implemented Progressive Web App registration for the mobile web interface, enabling "Add to Home Screen" and offline fallback capabilities.

### Testing & QA

- [ ] **Investigate Skipped Tests**: There are still ~70 skipped tests in the Vitest suite. Analyze and re-enable or deprecate these tests.
- [x] **E2E Playwright Coverage**: Expand E2E tests for the new Auto Run drag-and-drop batch processing UI.

### Blocked / External Dependencies

- [ ] **Fix CI/CD Shell Executions**: `run_shell_command` via `npm run test` is being denied by policy in headless/AI environments. This requires a change to the `policies/maestro.toml` file in the extension host.

### UI / UX Polish

- [x] **Visual Command Orchestrator**: Built a ReactFlow-based prototype timeline for visualizing concurrent agent tasks.
- [x] **Theme Refinement**: Audit all 12 themes (Dracula, Monokai, Nord, etc.) for correct contrast ratios.
- [x] **Mobile Interface**: Fix minor layout shifting on iOS Safari when the on-screen keyboard appears.
- [x] **Markdown Rendering**: Enhance markdown renderer to support mermaid.js diagrams natively.

### Backend / Core

- [x] **OpenCode v1.2+ Edge Cases**: Added 5s timeout for SQLite session storage.
- [x] **SSH Remote Execution**: Added automatic reconnection logic (up to 3 retries).
- [x] **Memory Leaks**: Profile the `ProcessManager` when running 10+ concurrent PTY sessions.

### Documentation

- [x] Migrate inline code documentation into the centralized `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` format.
- [x] Standardize all agent documentation (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`, etc.) to reference the universal instructions.
