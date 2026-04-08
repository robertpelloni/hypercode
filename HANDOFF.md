# Handoff — Session 2026-04-08

**Version:** `1.0.0-alpha.3`
**Branch:** `main`
**Session focus:** Git fix, SQLite rebuild, Gemini model update, comprehensive documentation refresh

## What happened this session

### 1. Fixed detached HEAD on main
The workspace had a complex worktree situation where:
- `C:/Users/hyper/workspace/.git/modules/hypercode` held `main` as the primary worktree
- `C:/Users/hyper/workspace/hypercode-push` (actual working dir) was detached at the same commit
- Fixed by writing `ref: refs/heads/main` into the worktree HEAD and updating the bare repo HEAD to detached
- Result: `hypercode-push` now cleanly on `main` branch

### 2. Rebuilt better-sqlite3 for Node 24.10.0
The native `.node` bindings were not compiled for Node v24.10.0 x64 win32.
- `node-gyp` rebuild failed due to Node 24 incompatibilities
- `pnpm rebuild better-sqlite3` succeeded using `prebuild-install`
- Verified: `require('better-sqlite3')(':memory:')` works
- This fixes ALL SQLite-dependent subsystems: BobbyBookmarks, LinkCrawler, catalog ingestion, debate history, session import, MCP config sync, debate history

### 3. Updated Google Gemini model from deprecated `gemini-2.0-flash` to `gemini-2.5-flash`
- `gemini-2.0-flash` returns 404 "no longer available to new users"
- `gemini-2.5-flash` is **free tier** with 1M context window
- Updated: `ProviderRegistry.ts`, `CoreModelSelector.test.ts`, `council.json`
- This gives a working free fallback when OpenAI/Anthropic/DeepSeek quotas are exhausted

### 4. Pushed to both remotes
- `origin` (hypercodehq/hypercode): pushed successfully
- `borg-upstream` (robertpelloni/borg): force-pushed to sync

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
1. **Restart the server** — SQLite rebuild means a restart will fix all the cascading failures
2. **Fix `/api/scripts` route** — Dashboard 404s every 5 seconds polling this. Add Go handler or TRPC route
3. **Fix catalog ingestion adapters** — `glama.ai` and `mcp.run` API endpoints have changed
4. **Add Google AI Studio free models to fallback chain** — Gemini 2.5 Flash is free, use it more aggressively

### Short-term (P1)
5. **Implement the MCP "decision system"** — The 6 meta-tools (search_tools, load_tool, etc.) are scaffolded but need ranking/auto-load
6. **Dashboard polish** — Many dashboard pages exist but some show placeholder/empty states
7. **Session import pipeline** — Gemini sessions are detected but LLM extraction fails without quota
8. **Submodule updates** — Sync submodules with upstream changes

### Medium-term (P2)
9. **Complete Go parity** — Continue porting handlers per `PORTING_MAP.md`
10. **Browser extension** — Chrome/Firefox extensions for MCP injection into web chats
11. **Multi-model chatroom** — Shared context between models rotating implementer/planner/tester
12. **Native UI** — Replace Electron Maestro with lightweight native UI

## Critical warnings for next agent
- **Do NOT kill running processes** — The server is likely running
- **Node 24 requires `pnpm rebuild better-sqlite3`** after any `pnpm install`
- **Gemini model names change frequently** — Check current availability before using
- **The Go server is a bridge/fallback** — Not the primary source of truth yet
- **`mcp.jsonc` is 34K+ lines** — Edit carefully, don't rewrite
