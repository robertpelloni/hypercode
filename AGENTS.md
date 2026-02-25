# Agent Instructions — Borg Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

This file serves as the entry point for all autonomous agents working on the Borg project.

## Quick Links
- **Universal Rules**: [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md)
- **Vision**: [`VISION.md`](VISION.md)
- **Roadmap**: [`ROADMAP.md`](ROADMAP.md)
- **Architecture**: [`docs/DESIGN.md`](docs/DESIGN.md)
- **Submodules**: [`docs/SUBMODULE_DASHBOARD.md`](docs/SUBMODULE_DASHBOARD.md)
- **Changelog**: [`CHANGELOG.md`](CHANGELOG.md)
- **Version**: [`VERSION.md`](VERSION.md) (Current: v2.7.21)
- **Handoff**: [`HANDOFF_ANTIGRAVITY.md`](HANDOFF_ANTIGRAVITY.md)

## Agent Roles
| File | Model | Role |
|------|-------|------|
| [`CLAUDE.md`](CLAUDE.md) | Claude Opus/Sonnet | Architect — System design, refactoring, type safety |
| [`GEMINI.md`](GEMINI.md) | Gemini Pro/Flash | Critic/Researcher — Cross-file analysis, deep research |
| [`GPT.md`](GPT.md) | GPT-4o / o3 | Builder — Reliable implementation, debugging |
| [`GROK.md`](GROK.md) | Grok-4 | Innovator — Creative solutions, edge cases |
| [`CODEX.md`](CODEX.md) | GPT-5-Codex | Specialist — Complex algorithms, security |
| [`copilot-instructions.md`](copilot-instructions.md) | Copilot | Inline — Real-time code completion |
| [`ANTIGRAVITY.md`](ANTIGRAVITY.md) | Antigravity | Orchestrator — System management & coordination |

## Session Protocol
1. **Read** `HANDOFF_ANTIGRAVITY.md` for context from previous sessions.
2. **Read** `ROADMAP.md` to understand current phase.
3. **Verify** build state: `npx tsc --noEmit` in `packages/core`.
4. **Execute** assigned task autonomously.
5. **Comment Everything**: Always comment the reason behind the code, what it does, and why it's there.
6. **Document & Version**: YOU MUST increment the version number in the `VERSION` file on every build/session, and document the changes with the new version number in `CHANGELOG.md`. Ensure the version bump is referenced in your commit message.
7. **Ship** — `git commit && git push` after each feature.
8. **Handoff** — Update `HANDOFF_ANTIGRAVITY.md` at session end.

## Core Protocols
1. **Autonomy**: Solve problems independently. Don't ask unless architecturally ambiguous.
2. **Verification**: Always run `tsc --noEmit` before committing.
3. **Documentation**: Update Changelog and Roadmap with every feature.
4. **Self-Correction (The Healer)**: If a tool fails, analyze the error and attempt a fix.
5. **Evolution (The Darwin Protocol)**: Experiment with prompt variations if results are suboptimal.
6. **Continuous Shipping**: Commit and push regularly. Do NOT wait for permission.

---

## Feature Wishlist (The Assimilation Queue)

The following features MUST be EXTREMELY WELL IMPLEMENTED and EXTREMELY WELL REPRESENTED by the UI, CLI, TUI, and documentation, including UI labeling and tooltips:

### MCP Router / Aggregator
- Master MCP server that aggregates many MCP servers into one unified interface
- MCP session lifecycle: auto-start, restart, keep-alive, heartbeat, timeout
- Single-instance serving multiple clients without duplication
- Latency measurement and health monitoring per server
- Namespace grouping for servers and tools
- Enable/disable individual tools and servers
- MCP traffic inspection with real-time JSON-RPC viewer
- Tool call chaining and workflow composition
- TOON format for context-saving tool descriptions
- Code mode (tools as executable functions)
- Tool automatic renaming (minimize context tokens)
- Tool reranking (by relevance, frequency, semantic similarity)
- Tool semantic search / tool RAG
- Progressive tool disclosure (lazy loading)
- Context inspector (see what's in the context window)
- MCP directory with ratings and categories
- Automatic MCP install from npm/pip/GitHub
- Environment variable and secrets management per server
- MCP client config auto-detection and auto-writing
- Import/export MCP configs (JSON/JSONC)
- Auto-detect all MCP configs on system
- Save sets of configs, wipe all, set all to preset

### Memory System
- Short-term, medium-term, long-term, episodic, semantic, procedural memory
- Context pruning, session pruning, memory pruning, reranking
- Import/export sessions and memories
- Auto-detect existing sessions/memories
- Automatically add memories about specified topics
- Memory dashboard (like Supermemory console)
- Session summarization and compaction

### Code Intelligence
- Code execution sandbox (Docker/WASM)
- Code indexing and semantic understanding
- Semantic code search (vector + ripgrep hybrid)
- LSP server integration (TypeScript, Python, Rust)
- AST visualization (graph view)
- Code chunking strategies (fixed, semantic, code-aware)
- RAG pipeline: intake documents, OCR, summarize

### Agent Orchestration
- Supervisor, council, autopilot
- Multi-model debate and consensus
- Share context between models
- Multiple models pair programming
- Architect-implementer pattern
- Subagents with timeouts, multiple models
- Skills, skill conversion, skill improvement
- Prompt library, system prompts, templates, jailbreaks
- Personas and customizable agent behavior
- Subagent definitions and collections

### Provider & Billing
- Intelligent model selection based on credits/free tier/subscription
- Provider fallback chains (try all providers of Model X, then Model Y)
- Plan with model X, implement with model Y
- Usage, billing, dashboard, credits, API vs auth
- Track reset dates and quotas

### Browser Extension
- Store memory from browsing
- browser-use automation
- Console/debug log capture
- MCP SuperAssistant integration
- Connect MCP to browser chat interfaces
- Connect universal memory to browser chat
- Export browser sessions and memory
- Browser history integration

### Session & Cloud Management
- Manage cloud dev sessions (Jules, Devin, Codex)
- Manage local CLI sessions
- Connect dashboard to CLI sessions
- Multi-session dashboard
- Remember repo folders and workspaces
- Auto-start previous sessions
- Pause/resume all sessions
- Import/export cloud dev memory
- Transfer tasks between local and cloud
- Broadcast messages to all sessions
- Remote/mobile management
- Web terminal (like OpenCode web UI)
- CLI activity log

### Interfaces
- CLI with commander.js (11 command groups)
- WebUI dashboard (Next.js + Vite+React)
- No TUI, only WebUI and multi-session dashboard
- Mobile-responsive for remote management

### Integration Protocols
- Plugins, CLI SDK, AI SDK, A2A SDK, MCP SDK, ACP SDK, Agent SDK
- Proxy: stdio as remote, remote as stdio, SSE as streaming-HTTP
- OAuth and bearer token management
- .env file expansion and management
- Harness CLI as MCP

### Advanced Features
- NotebookLM integration / open-source functionality
- Computer-use automation
- Web search integration
- Beads issue tracking
- Specs/SpecKit/BMAD task management
- Superpowers framework