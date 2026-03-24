# Borg Roadmap

_Last updated: 2026-03-24_

## Canonical now/next (authoritative)

This short block is the source of truth for current execution.

### Current objective
Evolve Borg into the **Ultimate Universal AI Dashboard**, bringing full feature parity with existing CLI harnesses (OpenCode, Claude Code, Aider, etc.) into a cohesive WebUI/CLI control plane with omniscient memory and intelligent fallback routing.

### Next up
- **Phase N1:** Marketplace & Mesh — activate the P2P `meshRouter`, wire `MarketplaceService` to real community data, and enable tool/skill discovery across Borg peers.
- **Phase N2:** CitationService production hardening — swap keyword scoring for LanceDB vector embeddings, add citation UI in the dashboard.
- **Phase N3:** Mobile Remote Control — React Native or Expo companion app connecting to local Borg server via WebSocket tunnels.

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
- [x] Management of OAuth logins and API key management in a centralized secrets vault.
- [x] Usage observation, tracking of billing details, and credit balance management.
- [x] Routing Hierarchy UI with drag-and-drop provider ordering.

## Phase L — The Ultimate AI Coding Harness
- [x] Feature parity with all major harnesses (11 CLI types supported).
- [x] WebUI with TUI/CLI parity, including remote access/control from mobile.
- [x] Auto-start/restart of stalled CLI instances on autopilot with council supervision.
- [x] Transfer tasks to cloud dev environments and broadcast messages across instances.

## Phase M — Advanced MCP Aggregation & Proxying
- [x] Build a universal integrated MCP directory (installed servers + published catalog + backlog links).
- [x] Fast, lightweight MCP server startup (LKG configuration).
- [x] MCP Traffic Inspection, Code Mode, TOON format implementation.
- [x] Tool renaming, context syntax minimization, tool call chaining, deferred binary startup.
- [x] Specify high-value tools for permanent disclosure vs. dynamic progressive disclosure.

## Phase N — Marketplace, Mesh & Community (Next)
- [x] Activate the `meshRouter` (currently commented out in `trpc.ts`). Enable P2P memory swarm and agent federation across Borg instances.
- [x] Wire `MarketplaceService` to real community data instead of TODO stubs for MeshService.
- [x] Implement community tool/skill/agent publishing and discovery.
- [x] Upgrade `CitationService` from keyword scoring to LanceDB vector embeddings.
- [x] React Native/Expo mobile companion app for remote monitoring/control.

## Completed Phases
- **Phase A**: Initial architecture and schema.
- **Phase B**: Core verification logic (Evidence Lock).
- **Phase C**: L1/L2 memory scaffolding.
- **Phase H**: Assimilation of Auto-Orchestrator (Council Debate, Smart Pilot, Terminal PTY Harness).
- **Phase K**: Intelligent Model Routing & Quota Fallbacks (v0.90.5).
- **Phase I–M**: All completed as of v0.99.1.
