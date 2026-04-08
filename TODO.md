# TODO

_Last updated: 2026-04-08, version 1.0.0-alpha.13_

## P0 — Must do now

- [x] Fix detached HEAD on main branch
- [x] Rebuild better-sqlite3 native bindings for Node 24
- [x] Update deprecated Gemini model (2.0-flash → 2.5-flash)
- [x] Add `/api/scripts` REST bridge to fix dashboard 404s
- [x] Restart server and verify SQLite-dependent features work (BobbyBookmarks, catalog, session import)
- [x] Fix catalog ingestion — glama.ai returns HTML now, mcp.run returns 404
- [ ] Verify all dashboard pages show real state after SQLite fix (in progress)
- [x] Add `pnpm rebuild better-sqlite3` to startup script for Node 24 safety
- [x] Test `/api/scripts` endpoints actually return saved script data

## P1 — Should do next

- [x] Implement MCP meta-tool decision system (search_tools, load_tool with ranking/auto-load)
- [x] Add progressive tool disclosure — only expose 5-6 permanent meta-tools to models
- [x] Add tool semantic search / tool RAG for the meta-tool discovery layer
- [ ] Dashboard polish: verify all 69 dashboard sub-pages show real data
- [x] Session auto-detection/import — detect and parse sessions from all AI harnesses
- [ ] Add remaining free-tier providers to fallback chain (OpenRouter free, Google AI Studio)
- [x] Update all submodules to latest upstream
- [x] Comprehensive tool parity aliases (Claude Code, Codex, Gemini CLI, OpenCode, Pi, Cursor, Windsurf)
- [x] Supervisor tool prediction — watch conversation, inject tool ads preemptively
- [x] Progressive skill disclosure (same architecture as tool disclosure)
- [x] Browser extension (Chrome/Firefox) manual sync and export
- [x] Multi-model chatroom — shared context between rotating models (PairOrchestrator)
- [ ] A2A protocol implementation
- [x] Continue Go parity per PORTING_MAP.md (Provider, Session, Scripts, Health, Directory)

## P2 — Helpful but not urgent

- [ ] Reduce duplicate or low-value dashboard surfaces
- [ ] Improve tool search and working-set ergonomics
- [ ] Design how HyperCode benchmarks and ranks overlapping MCP servers and tools
- [ ] Promote the most justified package seams into standalone binaries
- [ ] Browser extension (Chrome/Firefox) for MCP injection into web chats
- [ ] Multi-model chatroom — shared context, rotating implementer/planner/tester
- [ ] Native UI to replace Electron Maestro

## Completed in recent sessions

- [x] Fixed config deletion loop (McpConfigService was wiping DB tools)
- [x] Fixed stdio loader blindspot (added .hypercode/mcp-cache.json)
- [x] Workspace config resolution (respect HYPERCODE_CONFIG_DIR env var)
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
- [ ] Multi-model shared-context chatroom
- [ ] Native lightweight UI (no Electron)
- [ ] A2A protocol implementation
- [ ] Mobile remote control of sessions

## Decision heuristic

When in doubt, choose the task that makes HyperCode:
1. more reliable,
2. more understandable,
3. more inspectable,
4. more honest.
