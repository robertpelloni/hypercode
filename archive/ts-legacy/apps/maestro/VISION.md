# VISION: Maestro

## Ultimate Goal

Maestro is designed to be the ultimate, insanely great, pass-through interface and orchestration layer for **all** AI providers and local coding agents. The grand vision is to transcend the constraints of an Electron app and provide a robust, lightning-fast Go-based backend (via Wails v3) with multiple native UI frontends.

### Key Pillars

1. **Universal Agent Support**: Out-of-the-box integration for Claude Code, Gemini CLI, Copilot, Aider, OpenCode, and ~30 other CLIs. If it can be run in a terminal, it can be orchestrated in Maestro.
2. **True Parallel Development**: Through Git Worktrees and Auto Run Playbooks, Maestro enables parallel, multi-agent development spanning multiple isolated branches without merge conflicts.
3. **High Performance**: Transitioning from a Node.js/Electron IPC backend to a native Go implementation ensures minimal memory overhead and snappy PTY responsiveness, even with dozens of agents running simultaneously.
4. **Platform Agnosticism**: While the current frontend is web/React-based, the architectural separation created by the Go port will pave the way for completely native frontends (macOS Swift, Windows C#/.NET).
