# Borg Roadmap

_Last updated: 2026-03-23_

## Canonical now/next (authoritative)

This short block is the source of truth for current execution.

### Current objective
Evolve Borg into the **Ultimate Universal AI Dashboard**, bringing full feature parity with existing CLI harnesses (OpenCode, Claude Code, Aider, etc.) into a cohesive WebUI/CLI control plane with omniscient memory and intelligent fallback routing.

### Next up
- **Phase J2:** Universal IDE & Browser Extensions — deeper runtime parity, client registration, hook events.
- **Phase K1:** Smart provider fallback UX — quota-aware routing with budget controls.
- **Phase L1:** Feature parity push — WebUI with TUI/CLI parity, remote mobile access.

---

## Phase I — Omniscient Memory & RAG Ecosystem
- [x] Make `github.com/robertpelloni/bobbybookmarks` the canonical link backlog datasource for Borg, with sync into local backlog storage plus research/clustering metadata.
- [x] Pluggable Memory Subsystems (support for vector DBs, file-based, NotebookLM-style).
- [x] Automatic context harvesting, pruning, compacting, reranking, and semantic chunking.
- [x] Seamless integrations with Google Docs, Gmail, Google Drive, and local file systems.
- [x] Export/Import and autodetect of sessions and memories across environments.

## Phase J — Universal Integrations (Browser & IDE)
- [x] **Browser Extensions** (Chrome/Firefox): install surfaces, artifact detection, bridge readiness, and memory save/parse endpoints.
- [x] Browser controls: scrape web pages, intercept debug logs, read history.
- [x] **IDE Plugins** (VSCode, Cursor, Windsurf, JetBrains): VS Code extension built and packaged; core integration via TRPC services.
- [x] Provide new hook events to the IDE and automatically save sessions.
- [x] Add a non-destructive Borg MCP registration workflow and dashboard auto-launch startup path.

## Phase K — Intelligent Model Routing & Quota Fallbacks
- [x] Smart provider and model selection based on quota usage and budgets.
- [x] Automatic fallback across providers (e.g., switch across all providers of Gemini 3 Pro, then Codex 5.3, then Opus 4.6).
- [x] Management of OAuth logins (Claude Pro, ChatGPT Plus, Copilot) and API key management in a centralized secrets vault.
- [x] Usage observation, tracking of billing details, and credit balance management.

## Phase L — The Ultimate AI Coding Harness
- [x] Feature parity with all major harnesses: Amp, Auggie, Claude Code, Codebuff, Codemachine, Codex, Copilot CLI, Crush, Factory Droid, Gemini CLI, Goose, Grok Build, Kilo Code, Kimi, Mistral Vibe, OpenCode, Qwen Code, Warp, Trae.
- [x] WebUI with TUI/CLI parity, including remote access/control from mobile.
- [x] Auto-start/restart of stalled CLI instances on autopilot with council supervision.
- [x] Transfer tasks to cloud dev environments and broadcast messages across instances.

## Phase M — Advanced MCP Aggregation & Proxying
- [x] Build a universal integrated MCP directory that becomes the shared operator-facing catalog surface for installed servers, published MCP entries, BobbyBookmarks backlog links, and every planned future feature group.
- [x] Fast, lightweight MCP server startup (load last-known-good config without blocking).
- [x] MCP Traffic Inspection, Code Mode, TOON format implementation.
- [x] Tool renaming, context syntax minimization, tool call chaining, deferred binary startup (lazy load).
- [x] Specify high-value tools for permanent disclosure vs. dynamic progressive disclosure.

## Completed Phases
- **Phase A**: Initial architecture and schema.
- **Phase B**: Core verification logic (Evidence Lock).
- **Phase C**: L1/L2 memory scaffolding.
- **Phase H**: Assimilation of Auto-Orchestrator (Council Debate, Smart Pilot, Terminal PTY Harness).
- **Phase K**: Intelligent Model Routing & Quota Fallbacks (v0.90.5).
