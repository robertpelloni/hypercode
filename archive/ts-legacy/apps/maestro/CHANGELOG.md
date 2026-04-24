# Changelog

<<<<<<< HEAD
## [0.15.7] - 2026-04-12

### Added

- **Expanded CLI Roster**: Added support for ~30 new AI coding agents and CLIs including Adrenaline, Aider, Amazon Q, Amp Code, Auggie, Azure OpenAI, Code CLI, Codebuff, Codemachine, Copilot, Crush, Factory, Goose, Grok, Kilo, Kimi, Manus, Mistral, Ollama, Interpreter, Pi, Rovo, Trae, and Warp.
- **Go/TypeScript Hybrid Migration Phase 1**: Began the transition to a Wails v3 architecture. Ported agent definitions, detection logic, and SSH/File/Git backend services to native Go implementations (`/go/internal/`).

### Changed

- **Terminal Tabs Migration**: Removed legacy `shellLogs` dependencies in favor of persistent PTY-backed terminal tabs.
- **Worktree Management**: Deprecated legacy `worktreeParentPath` scanners in favor of a robust parent/child tree representation.

### Fixed

- **Legacy IPC Hooks**: Eliminated the deprecated `runCommand` handlers across the frontend to reduce terminal noise.

## [0.15.7] - 2026-04-12

### Added

- **Expanded CLI Roster**: Added support for ~30 new AI coding agents and CLIs including Adrenaline, Aider, Amazon Q, Amp Code, Auggie, Azure OpenAI, Code CLI, Codebuff, Codemachine, Copilot, Crush, Factory, Goose, Grok, Kilo, Kimi, Manus, Mistral, Ollama, Interpreter, Pi, Rovo, Trae, and Warp.
- **Go/TypeScript Hybrid Migration Phase 1**: Began the transition to a Wails v3 architecture. Ported agent definitions, detection logic, and SSH/File/Git backend services to native Go implementations (`/go/internal/`).

### Changed

- **Terminal Tabs Migration**: Removed legacy `shellLogs` dependencies in favor of persistent PTY-backed terminal tabs.
- **Worktree Management**: Deprecated legacy `worktreeParentPath` scanners in favor of a robust parent/child tree representation.

### Fixed

- **Legacy IPC Hooks**: Eliminated the deprecated `runCommand` handlers across the frontend to reduce terminal noise.
=======
## [0.15.7] - 2026-04-10

### Added

- **Agent CLI Support**: Added support for Adrenaline CLI, Amazon Q CLI, Amazon Q Developer CLI, Amp Code CLI, Auggie CLI, Azure OpenAI CLI, Code CLI, Codebuff CLI, Codemachine CLI, Copilot CLI, Crush CLI, Factory CLI, Goose CLI, Grok CLI, Kilo Code CLI, Kimi CLI, Manus CLI, Mistral Vibe CLI, Ollama CLI, Open Interpreter CLI, Pi CLI, Rovo CLI, Trae CLI, and Warp CLI in Maestro.
- **Go Support**: Ported the list of Agent IDs to Go types in `go/internal/types/agent_ids.go`.
>>>>>>> origin/jules-add-new-agents-535743983477155742

## [0.15.6] - 2026-04-01

### Added

- **Go/TypeScript Hybrid**: Initialized a Wails-based architecture to replace Electron, transitioning the backend to Go.
- **Go Backend Services**: Ported Git, PTY/Process, Storage, Filesystem, and SSH services to Go for higher performance and lower memory footprint.

### Changed

- **DevTools**: Removed unsupported devtools script injection in the production HTML template.

### Fixed

- **CSP Policy**: Relaxed Content Security Policy in development to permit local websocket and devtools connections.
- **React Components**: Fixed duplicate type declarations and incorrect import paths for `MermaidRenderer`.
- **Storage Layer**: Resolved duplicate function signatures in the OpenCode SQLite session implementation.

## [0.15.5] - 2026-03-25

### Added

- **Hypercode Assimilation**: Full integration with the Hypercode ecosystem.
- **Remote Execution**: Native support for SSH remote execution for all agent types.
- **Maestro Symphony**: New collaborative workflow engine for large-scale projects.
- **Director's Notes**: Cross-session history and AI-powered architectural synopsis.
- **HypercodeGuard**: Comprehensive security validation layer for sandboxed execution.
- **Universal LLM Instructions**: Unified instruction set for all AI agents.

### Changed

- **Zustand Migration**: Migrated application settings and stats to a centralized Zustand store.
- **Process Manager**: Refactored `spawn` to be asynchronous with built-in security gating.
- **OpenCode Storage**: Switched to SQLite-backed session management for improved reliability.
- **Markdown Rendering**: Enhanced security with DOMPurify and unified Mermaid diagram handling.

### Fixed

- **Type Safety**: Resolved extensive TypeScript errors in the main process and shared components.
- **Windows PATH Resolution**: Improved command execution logic for .cmd and .bat files.
- **SSH Escaping**: Resolved prompt corruption issues via a new stdin-based execution bypass.
- **Vite/Electron DevTools**: Suppressed connection errors and fixed missing icon warnings.
