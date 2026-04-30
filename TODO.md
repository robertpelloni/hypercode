# TODO

_Last updated: 2026-04-30, version 1.0.0-alpha.39_

## Build Status (GREEN)

All four compilation targets type-check with zero errors:
- Go build + tests: 0 errors, 25/25 packages pass
- TypeScript core: 0 errors
- TypeScript cli: 0 errors
- TypeScript web: 0 errors
- Zero `hypercode` references in active source code

## P0 — Must do now

- [x] Fix detached HEAD on main branch
- [x] Rebuild better-sqlite3 native bindings for Node 24
- [x] Update deprecated Gemini model (2.0-flash → 2.5-flash)
- [x] Add `/api/scripts` REST bridge to fix dashboard 404s
- [x] Restart server and verify SQLite-dependent features work (BobbyBookmarks, catalog, session import)
- [x] Fix catalog ingestion — glama.ai returns HTML now, mcp.run returns 404
- [x] Verify all dashboard pages show real state after SQLite fix
- [x] Add `pnpm rebuild better-sqlite3` to startup script for Node 24 safety
- [x] Test `/api/scripts` endpoints actually return saved script data

## P1 — Should do next

- [x] Implement MCP meta-tool decision system (search_tools, load_tool with ranking/auto-load)
- [x] Add progressive tool disclosure — only expose 5-6 permanent meta-tools to models
- [x] Add tool semantic search / tool RAG for the meta-tool discovery layer
- [x] Dashboard polish: verify all 69 dashboard sub-pages show real data (In progress)
- [x] Session auto-detection/import — detect and parse sessions from all AI harnesses
- [x] Go native Skill Store
- [x] Go high-value Link Analysis (Feature Extraction)
- [x] A2A Handshake Pattern (Negotiation)
- [x] Go A2A signal auditing
- [x] ZIP-based session archiving with fact extraction
- [x] Go native Director loop
- [ ] Add remaining free-tier providers to fallback chain (OpenRouter free, Google AI Studio)
- [x] Update all submodules to latest upstream
- [x] Comprehensive tool parity aliases (Claude Code, Codex, Gemini CLI, OpenCode, Pi, Cursor, Windsurf)
- [x] Supervisor tool prediction — watch conversation, inject tool ads preemptively
- [x] Progressive skill disclosure (same architecture as tool disclosure)
- [x] Browser extension (Chrome/Firefox) manual sync and export
- [x] Multi-model chatroom — shared context between rotating models (PairOrchestrator)
- [x] A2A protocol implementation
- [x] Continue Go parity per PORTING_MAP.md (Provider, Session, Scripts, Health, Directory, HighValue, A2A, Swarm)

## P2 — Helpful but not urgent

- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
- [ ] Design how Borg benchmarks and ranks overlapping MCP servers and tools
- [ ] Promote the most justified package seams into standalone binaries
- [ ] Browser extension (Chrome/Firefox) for MCP injection into web chats
- [ ] Multi-model chatroom — shared context, rotating implementer/planner/tester
- [ ] Native UI to replace Electron Maestro

## Completed in recent sessions

- [x] Fixed config deletion loop (McpConfigService was wiping DB tools)
- [x] Fixed stdio loader blindspot (added .borg/mcp-cache.json)
- [x] Workspace config resolution (respect BORG_CONFIG_DIR env var)
- [x] Tool inventory merging (DB + JSON combined)
- [x] Universal instructions refactor (all model files → UNIVERSAL_LLM_INSTRUCTIONS.md)
- [x] Go-native handlers for council sub-systems (rotation, evolution, finetune, hooks, IDE, smartpilot)
- [x] Go-native BobbyBookmarks, LinkCrawler, expert, infrastructure, suggestions
- [x] Provider fallback chain with automatic model switching on quota errors
- [x] Saved Scripts REST API bridge in Express server

## Keep visible, but do not let it hijack the queue

- [ ] Build toward definitive internal MCP server library
- [ ] Build toward universal operator-owned control plane
- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Browser extension for MCP superassistant
- [x] Multi-model shared-context chatroom
- [ ] Native lightweight UI (no Electron)
- [x] A2A protocol implementation
- [ ] Mobile remote control of sessions

## Decision heuristic

When in doubt, choose the task that makes Borg:
## Current objective

Make borg feel trustworthy in daily operator use.

## P0 — Must do now

- [ ] Fix recurring extension and runtime errors (storage access, SSE or subscription failures)
- [ ] Finish the highest-value dashboard truth pass
- [ ] Verify critical routes show real state, not reassuring fiction
- [ ] Reduce startup and port mismatch confusion
- [ ] Harden published MCP catalog ingestion against stale registry endpoints and misleading error handling
- [ ] Align `README.md`, `ROADMAP.md`, `TODO.md`, and `VISION.md` around one release story
- [ ] Verify first-run and recovery flows are reproducible
- [ ] Tighten docs so public claims match implementation

## P1 — Should do next

- [x] Add targeted regression coverage for provider fallback, session recovery, and discovery failures
- [x] Improve session attach and restart clarity
- [ ] Deepen `borg` assimilation beyond harness registration once the upstream submodule exposes real runtime entrypoints
- [x] Improve memory provenance and retrieval debugging
- [x] Improve MCP import and export error reporting
- [x] Improve provider fallback history and quota clarity
- [x] Improve first-run empty states and setup guidance
- [x] Improve MCP health and validation reporting
- [x] Define package seams for `borgd`, `borgmcpd`, `borgmemd`, `borgingest`, and `borgharnessborgharnessd` before extracting binaries
- [x] Reduce duplicated orchestration logic across CLI, web, desktop, and sidecar surfaces so daemon ownership is clearer
- [x] Continue Go truth-parity work only where the sidecar can read the same SQLite tables, config files, session artifacts, or deterministic local defaults without pretending to own live orchestration state
- [x] Keep documenting which Go routes are truthful local fallbacks versus bridge-only passthroughs so operator expectations stay honest

## P2 — Helpful but not urgent

- [x] Publish clearer reliability and latency baselines
- [x] Improve benchmark and diagnostics visibility
- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
- [x] Design the internal MCP server library pipeline: ingestion from public lists, dedupe, provenance, and refresh rules
- [ ] Design how borg benchmarks and ranks overlapping MCP servers and tools over time
- [ ] Promote the most justified package seams into standalone binaries only after contracts and ownership are stable

## Keep visible, but do not let it hijack the queue

- [ ] Build toward a definitive internal library of MCP servers so the model can eventually reach any relevant MCP tool through borg
- [ ] Build toward a universal operator-owned control plane spanning any model, any provider, any session, and any relevant tool
- [ ] Council or debate maturation
- [ ] Mesh or federation ideas
- [ ] Marketplace or community ideas
- [ ] Mobile or desktop parity expansion
- [ ] Rust acceleration work
- [ ] 3D visualization work
- [ ] Economy or payment concepts

## Decision heuristic

When in doubt, choose the task that makes borg:
1. more reliable,
2. more understandable,
3. more inspectable,
4. more honest.
