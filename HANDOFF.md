# Handoff

## What was done (v1.0.0-alpha.39 session)

### 47 commits pushed across 5 hours of continuous development

**All CLI commands now query live tRPC API — zero placeholder output remains.**

### New commands
1. **`borg top`** — Live system monitor with auto-refresh showing TS server, MCP, Go sidecar
2. **`borg mcp search <query>`** — Fuzzy search across 135 servers by name/tags
3. **`borg mcp export`** — Export full MCP config to JSON (135 servers, 1302 tools)
4. **`borg config get/set`** — Read/write `~/.borg/config.jsonc` with dot-notation keys, auto-parses JSON values

### Major fixes
- **`borg status`**: Now queries live tRPC for health, startup status, MCP status; shows Go sidecar (running/stopped, version)
- **`borg mcp list`**: Queries `mcp.listServers` tRPC endpoint — shows 135 servers
- **`borg mcp tools`**: Queries `mcp.getStatus` — shows 1302 tools
- **`borg memory *`**: All subcommands (add/search/list/stats/add-knowledge) call real tRPC procedures
- **`borg config show`**: Reads VERSION file dynamically, no hardcoded strings
- **`borg session start`**: Tries `session.create` tRPC, falls back with helpful message
- **`borg agent list`**: Queries `squad.list` and `director.status` tRPC endpoints
- **`borg agent council`**: Queries `director.status` and `supervisor.status`
- **`borg tools list`**: Shows per-server tool breakdown from `mcp.getStatus`
- **`borg about`**: Dynamic VERSION file reading, no hardcoded strings
- **`borg dashboard --dev`**: Starts Next.js dev server on port 3000

### tRPC router hardening
- 8 routers now have graceful fallbacks returning empty arrays instead of crashing
- 62 tRPC procedures registered across 13 routers
- 12/12 smoke tests pass consistently

### Go sidecar integration
- Go sidecar confirmed working: 543 REST API routes across 26 categories
- Go→TS bridge verified: `/api/sessions`, `/api/mcp/tools`, `/api/settings`, `/api/skills` all proxy correctly
- `borg status` shows Go sidecar running state alongside TS server
- 25/25 Go test packages pass

### Full-stack smoke test
- Created `scripts/smoke-test.cjs` — 12/12 pass
- Tests TS health, startupStatus, mcp (135 servers, 1302 tools), settings, secrets, squads, skills, catalog
- Tests Go health, version, /api/index (543 routes)

### Version management
- All 25+ package.json files use `1.0.0-alpha.39`
- Zero hardcoded version strings remain in CLI code
- VERSION file is single source of truth

## Current System State

| Component | Status | Details |
|-----------|--------|---------|
| TS Server | ● Running | Port 4000, tRPC + REST |
| Go Sidecar | ● Running | Port 4300, 543 routes |
| MCP Catalog | ◐ Cached | 135 servers, 1302 tools |
| Dashboard | ○ Stopped | Port 3000 (use `borg dashboard --dev`) |
| Connected | 0 | Servers not auto-started (use `--mcp` flag) |

## What the next agent should do

### P1: Make sessions fully functional
- The `SessionSupervisor` class is not initialized when server starts with `--no-mcp`
- `session.create` tRPC procedure fails because `getSessionSupervisor()` returns undefined
- Need to initialize session supervisor independently of MCP

### P2: Connect MCP servers
- 135 servers cataloged but 0 connected — `runtimeConnected` is false for all
- Need auto-start for `always_on` servers, or `borg mcp start <server>` command
- The MCP pool manager should start when server starts

### P3: Wire dashboard to live data
- Dashboard pages show empty data because MCP isn't connected
- Home page renders DashboardHomeClient but data comes from tRPC queries
- Need to ensure Next.js tRPC client points at port 4000 (currently defaults to 3001)

### P4: Provider configuration
- `providers` shows 0 configured — need `borg provider add` command
- Should read API keys from environment or `~/.borg/config.jsonc`

### P5: Memory backends
- Memory tools call tRPC procedures but `MemoryManager` returns empty results
- Need to initialize memory store (SQLite or LanceDB) on server startup

## Key files to know
- `packages/cli/src/commands/` — All CLI command implementations
- `packages/core/src/orchestrator.ts` — Main server startup (express, tRPC, MCP)
- `packages/core/src/MCPServer.ts` — 5000+ line MCP server (pool, discovery, ranking)
- `packages/core/src/routers/` — tRPC routers (62 procedures)
- `go/internal/httpapi/` — Go sidecar HTTP handlers (543 routes)
- `scripts/smoke-test.cjs` — Full-stack verification (12/12)
- `VERSION` — Single source of truth for version
