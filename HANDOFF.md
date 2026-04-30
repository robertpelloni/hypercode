# Handoff

## What was done (v1.0.0-alpha.40 session)

### 75 commits pushed across 6+ hours of continuous development

**Every CLI command now queries live tRPC API. Zero placeholder output remains.**

### New features
1. **`borg top`** — Live system monitor with auto-refresh (TS server, MCP, top 5 servers, Go sidecar)
2. **`borg health`** — Detailed subsystem readiness check (8 subsystems, blocking reasons, execution environment)
3. **`borg config get/set`** — Read/write `~/.borg/config.jsonc` with dot-notation keys, auto-parses JSON values
4. **`borg provider list`** — Auto-detects 8 providers from environment variables (OpenAI, Anthropic, Google, etc.)
5. **`borg mcp inspect <name>`** — Detailed server info from tRPC API (tools, tags, transport)
6. **`borg mcp connect-all`** — Batch connect up to 20 MCP servers at once
7. **`borg mcp sync`** — Detects installed AI tools (Claude Desktop, Cursor, VS Code) at their config paths
8. **`borg mcp add/remove/restart/traffic`** — All now call real tRPC endpoints
9. **`mcp.connectServer/disconnectServer`** — New tRPC mutations for connecting MCP servers on demand

### Critical fixes
- **Dashboard tRPC proxy**: Fixed port 3001 → 4000. Dashboard now correctly proxies to TS server.
- **Lightweight MCP init**: When `--no-mcp` is used, MCPServer is still instantiated (without tool discovery) so tRPC routers have their dependencies.
- **MCP inventory readiness**: Database with 135 servers now counts as "inventory known" even without aggregator init.
- **`borg session start`**: Tries real `session.create` tRPC procedure, shows helpful message when supervisor not initialized.
- **`borg start`**: Now shows detected providers from environment on startup.

### Test infrastructure
- `scripts/smoke-test.cjs` — 12/12 pass (TS + Go sidecar endpoints)
- `scripts/test-cli.cjs` — 19/19 pass (all CLI commands verified)
- Total: **31/31 tests pass**

### Documentation
- Added 4 new observations to `MEMORY.md` (#20-#23)
- Updated `HANDOFF.md` with comprehensive session summary
- Updated `CHANGELOG.md` for v1.0.0-alpha.40
- Corrected Go sidecar route count in README (543, not 388)

## Current System State

| Component | Status | Details |
|-----------|--------|---------|
| TS Server | ● Running | Port 4000, 129+ min uptime |
| Go Sidecar | ● Running | Port 4300, 543 routes across 26 categories |
| MCP Catalog | ◐ Cached | 135 servers, 1302 tools, 0 connected |
| Dashboard | ○ Stopped | Port 3000 (tRPC proxy now fixed to 4000) |
| Providers | ● Detected | 8 from environment vars |
| Subsystems | 2/8 ready | claudeMem + executionEnvironment |
| AI Tools | 3 detected | Claude Desktop, Cursor, VS Code |

## What the next agent should do

### P1: Connect MCP servers
- `mcp.connectServer` tRPC mutation is implemented but needs MCP to be initialized
- With lightweight MCP init, next `borg start --no-mcp` will have the MCPServer instance
- Then `borg mcp connect-all` should work to connect servers
- Alternatively, start with full MCP: `borg start` (without --no-mcp)

### P2: Wire dashboard to live data
- Dashboard tRPC proxy is fixed (port 4000)
- Start dashboard: `borg dashboard --dev` or `pnpm -C apps/web dev`
- Pages should now show real MCP data through the proxy
- Some pages may still have stub return values in `apps/web/src/lib/`

### P3: Session supervisor
- `session.create` tRPC procedure exists but `SessionSupervisor` may not be fully initialized
- With lightweight MCP init, the supervisor instance is created but sessions aren't restored
- Need to test: `borg session start ./my-project` after restart

### P4: Memory backends
- Memory tools call tRPC procedures but `MemoryManager` returns empty results
- Need to initialize SQLite memory store on server startup
- `MemoryManager` is created in MCPServer constructor but not initialized

### P5: Provider configuration
- 8 providers detected from env vars but not "configured" in borg settings
- `borg provider add <name> --api-key <key>` should write to config.jsonc
- Provider routing/fallback is implemented in core but not wired to CLI

## Key files to know
- `packages/cli/src/commands/` — All 15+ CLI command implementations (ALL use real API)
- `packages/core/src/orchestrator.ts` — Main server startup (express, tRPC, lightweight MCP init)
- `packages/core/src/MCPServer.ts` — 5000+ line MCP server (pool, discovery, ranking)
- `packages/core/src/routers/mcpRouter.ts` — MCP tRPC router (connectServer, getStatus, etc.)
- `packages/core/src/routers/startupStatus.ts` — Health check logic (8 subsystems)
- `go/internal/httpapi/` — Go sidecar HTTP handlers (543 routes)
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — Dashboard tRPC proxy (now port 4000)
- `scripts/smoke-test.cjs` — Full-stack verification (12/12)
- `scripts/test-cli.cjs` — CLI integration test (19/19)
- `VERSION` — Single source of truth for version (1.0.0-alpha.40)
