# Maestro: Project Memory & Observations

- **Current State**: Phase 1 of the Go/Wails migration is complete. Legacy `shellLogs` and old IPC `runCommand` calls have been fully eradicated from the React frontend hooks (`useAgentListeners.ts`, `useInputProcessing.ts`).
- **Backend Translation**: The `go/internal/agents` package now successfully builds and exposes the `AgentDetector` via `AgentsService`. Syntax errors caused by automatic code converters on `fs.go`, `git_service.go`, and `ssh.go` have been manually corrected.
- **CLI Ecosystem**: The sheer number of supported CLI agents has massively expanded. We now maintain a unified capability map in `src/main/agents/capabilities.ts`.
- **Design Preferences**: Keep the codebase clean of dead legacy configurations (e.g. `worktreeParentPath`). Always prefer the new Zustand stores over `electron-store`.
