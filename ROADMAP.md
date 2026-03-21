# Borg Roadmap

_Last updated: $(date +%Y-%m-%d)_

## Canonical now/next (authoritative)

This short block is the source of truth for current execution.

### Current objective
Evolve Borg into the **Ultimate Universal AI Dashboard**, bringing full feature parity with existing CLI harnesses (OpenCode, Claude Code, Aider, etc.) into a cohesive WebUI/CLI control plane with omniscient memory and intelligent fallback routing.

### Next up
- **Phase J2:** Universal IDE & Browser Extensions (intercepting web chats, automatic context harvesting).
- **Phase K:** Intelligent Model Routing & Quota Fallbacks.
- **Phase K1:** Smarter provider fallback and quota-aware routing UX.

---

## Phase I — Omniscient Memory & RAG Ecosystem
- [ ] Pluggable Memory Subsystems (support for vector DBs, file-based, NotebookLM-style).
- [ ] Automatic context harvesting, pruning, compacting, reranking, and semantic chunking.
- [ ] Seamless integrations with Google Docs, Gmail, Google Drive, and local file systems.
- [ ] Export/Import and autodetect of sessions and memories across environments.

## Phase J — Universal Integrations (Browser & IDE)
- [~] **Browser Extensions** (Chrome/Firefox): install surfaces, artifact detection, and bridge readiness are present; client registration and deeper runtime parity remain.
- [ ] Browser controls: scrape web pages, intercept debug logs, read history.
- [~] **IDE Plugins** (VSCode, Cursor, Windsurf, JetBrains): VS Code packaging/install scaffolding exists; deeper core integration remains.
- [ ] Provide new hook events to the IDE and automatically save sessions.
- [x] Add a non-destructive Borg MCP registration workflow and dashboard auto-launch startup path.

## Phase K — Intelligent Model Routing & Quota Fallbacks
- [ ] Smart provider and model selection based on quota usage and budgets.
- [ ] Automatic fallback across providers (e.g., switch across all providers of Gemini 3 Pro, then Codex 5.3, then Opus 4.6).
- [ ] Management of OAuth logins (Claude Pro, ChatGPT Plus, Copilot) and API key management in a centralized secrets vault.
- [ ] Usage observation, tracking of billing details, and credit balance management.

## Phase L — The Ultimate AI Coding Harness
- [ ] Feature parity with all major harnesses: Amp, Auggie, Claude Code, Codebuff, Codemachine, Codex, Copilot CLI, Crush, Factory Droid, Gemini CLI, Goose, Grok Build, Kilo Code, Kimi, Mistral Vibe, OpenCode, Qwen Code, Warp, Trae.
- [ ] WebUI with TUI/CLI parity, including remote access/control from mobile.
- [ ] Auto-start/restart of stalled CLI instances on autopilot with council supervision.
- [ ] Transfer tasks to cloud dev environments and broadcast messages across instances.

## Phase M — Advanced MCP Aggregation & Proxying
- [ ] Fast, lightweight MCP server startup (load last-known-good config without blocking).
- [ ] MCP Traffic Inspection, Code Mode, TOON format implementation.
- [ ] Tool renaming, context syntax minimization, tool call chaining, deferred binary startup (lazy load).
- [ ] Specify high-value tools for permanent disclosure vs. dynamic progressive disclosure.

## Completed Phases
- **Phase A**: Initial architecture and schema.
- **Phase B**: Core verification logic (Evidence Lock).
- **Phase C**: L1/L2 memory scaffolding.
- **Phase H**: Assimilation of Auto-Orchestrator (Council Debate, Smart Pilot, Terminal PTY Harness).
