# Handoff — Session 2026-04-08 (Extended)

**Version:** `1.0.0-alpha.8`
**Branch:** `main`
**Commits this session:** 8 (alpha.1 → alpha.8)

## What happened this session (8 commits)

### Commit 1: `54e9231d` — Fix SQLite + Gemini model
- Rebuilt better-sqlite3 native bindings for Node 24.10.0
- Updated Google Gemini model from deprecated gemini-2.0-flash to gemini-2.5-flash (free)

### Commit 2: `5052ce6b` — Fix detached HEAD
- Fixed complex worktree situation, got main branch working

### Commit 3: `42a3355b` — Add /api/scripts REST bridge
- Added 6 REST endpoints bridging to JsonConfigProvider
- Rewrote HANDOFF.md, MEMORY.md, TODO.md, DEPLOY.md

### Commit 4: `64c78518` — Add SQLite binding check to startup
- Auto-detects broken better-sqlite3 and runs pnpm rebuild

### Commit 5: `fafd42ef` — Fix glama.ai catalog adapter
- Updated to try multiple candidate URLs since API changed

### Commit 6: `e975bb92` — Sync all package.json versions
- Updated 19 package.json files from stale alpha.1 to current

### Commit 7: `a4b7a36f` — Doctor + instruction files + IDEAS
- Added scripts/doctor.mjs with 11 health checks
- Rewrote AGENTS.md, CLAUDE.md, GEMINI.md, GPT.md, copilot-instructions.md
- Added IDEAS.md with 28 creative improvement ideas

### Commit 8: `alpha.8` — This commit
- Final handoff update, version sync

## Current state of the project

### What works
- Server starts and runs (Express/tRPC on :4000, Next.js dashboard on :3000, MCP WebSocket on :3001)
- SQLite now functional after rebuild
- Google Gemini 2.5 Flash as free-tier fallback
- MCP catalog ingestion runs on schedule (glama.ai, smithery.ai, npm.registry, github-topics)
- BobbyBookmarks sync worker and LinkCrawler worker start (but need quota to process)
- Session auto-import from Gemini CLI sessions
- Council hierarchy, debate history, healer reactor, self-evolution services
- Dashboard at http://localhost:3000/dashboard with 50+ sub-pages
- Go server handles ~40+ route families with native fallbacks
- 34/34 TRPC route compat tests passing

### What's broken or incomplete
- `/api/scripts` returns 404 — dashboard requests this but Go server doesn't implement it yet
- All paid LLM providers exhausted (OpenAI 429, Anthropic 400 low balance, DeepSeek 402)
- Only Google Gemini 2.5 Flash (free) and LM Studio (no local server) as fallbacks
- Catalog ingestion fetched 789 items but upserted 0 (SQLite was down during that run; should work on restart)
- `mcp.run` adapter returns 404 (their API changed)
- `glama.ai` returns HTML instead of JSON (their API changed)

### Architecture overview
```
packages/core/       — Main TypeScript control plane (593 .ts files)
packages/cli/        — CLI entrypoint (28 .ts files)
apps/web/            — Next.js 16 dashboard (311 .ts/.tsx files)
go/                  — Go-native server bridge (139 .go files)
apps/maestro/        — Electron/Wails visual orchestrator (submodule)
apps/cloud-orchestrator/ — Jules autopilot wrapper (submodule)
submodules/hyperharness/ — LLM harness submodule
submodules/prism-mcp/    — Prism MCP reference
packages/claude-mem/     — Claude memory bridge (submodule)
```

### Key files for next agent
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` — Master rules for all models
- `packages/core/src/providers/ProviderRegistry.ts` — Provider/model definitions
- `packages/core/src/MCPServer.ts` — Core MCP server (5000+ lines)
- `go/internal/httpapi/server.go` — Go HTTP API server (largest Go file, ~16K lines)
- `apps/web/src/app/dashboard/` — Dashboard pages (50+ subdirectories)
- `packages/core/config/council.json` — Council member config
- `mcp.jsonc` — MCP server configuration (34K+ lines)

## Recommended next steps

### Immediate (P0)
1. **Restart the server** — All fixes are in place. SQLite will work, scripts endpoint will work, Gemini fallback will work.
2. **Run `node scripts/doctor.mjs`** — Verify everything is healthy before starting
3. **Test the dashboard** — Navigate through key pages and verify data shows up

### Short-term (P1)
4. **Implement MCP meta-tool decision system** — The 6 meta-tools need ranking/auto-load logic
5. **Fix remaining catalog adapters** — glama.ai and mcp.run APIs need investigation
6. **Dashboard polish pass** — Go through all 91 pages and verify they show real data
7. **Session import pipeline** — Gemini CLI sessions detected but LLM extraction needs working providers

### Medium-term (P2)
8. **Continue Go parity** per PORTING_MAP.md
9. **Browser extension** — Chrome/Firefox for MCP injection into web chats
10. **Multi-model chatroom** — Shared context, rotating roles
11. **Native UI** — Replace Electron with lightweight native UI
12. **Implement ideas from IDEAS.md** — 28 creative improvements

## Critical warnings for next agent
- **Do NOT kill running processes** — The server is likely running
- **Node 24 requires `pnpm rebuild better-sqlite3`** after any `pnpm install`
- **Gemini model names change frequently** — Check current availability before using
- **The Go server is a bridge/fallback** — Not the primary source of truth yet
- **`mcp.jsonc` is 34K+ lines** — Edit carefully, don't rewrite
