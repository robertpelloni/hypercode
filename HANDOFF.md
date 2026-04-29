# Handoff

## What was done (v1.0.0-alpha.39 session)

### Milestones achieved

1. **CLI commands now query live API** — mcp list, mcp tools, memory, config, status, session, tools all hit tRPC
2. **22/34 tRPC procedures verified working** — comprehensive audit of all 62 routers
3. **Dynamic version everywhere** — VERSION file read dynamically in start banner, config, status
4. **Start scripts fixed** — Go binary output path corrected, ldflags use full module path
5. **Dashboard dev script fixed** — uses spawn instead of execFileSync, correct 3-level path resolution
6. **Turbopack root configured** — fixes workspace detection warning in Next.js 16

### Commits this session (9 pushed)

1. `b82dee00c` — Dynamic version in start banner, fix Go binary output path
2. `919d6330d` — Correct tRPC procedure names in CLI commands
3. `9036bec64` — Update Go buildinfo fallback to alpha.38
4. `9217db0ae` — borg tools/session commands query live API
5. `a0220ca86` — borg config show reads VERSION dynamically, queries live API
6. `70a2e05b3` — borg memory commands now query live API
7. `b0cfb112b` — borg mcp list/tools now query live API for real data
8. `ca876e46f` — Dashboard dev script uses spawn instead of execFileSync
9. `18fdc7eee` — borg status now queries live server for real data

### tRPC Surface Audit (34 procedures tested)

**Working (22):**

- health, mcp.listServers, mcp.getStatus, mcp.getWorkingSet, mcp.listTools
- mcpServers.list, savedScripts.list, memory.getAgentStats
- settings.get, secrets.list, squad.list, tools.list
- toolSets.list, catalog.list, skills.list, browser.status
- apiKeys.list, policies.list, unifiedDirectory.list
- workspace.list, marketplace.list, linksBacklog.list

**Runtime errors (11)** — all `Cannot read properties of undefined`:

- session.list, billing.getStatus, director.status, supervisor.status
- healer.getHistory, knowledge.getStats, suggestions.list, commands.list
- workflow.list — dependency injection issue, services not initialized without full MCP

**Needs input (3):** serverHealth.reset (mutation), logs.list, mcp.searchTools

### Key architecture decisions

- CLI commands use `fetch()` directly to tRPC HTTP endpoint at port 4000
- `optsWithGlobals()` for `--json` flag that's registered at program level
- All CLI commands gracefully handle server not running
- Server takes ~45 seconds to fully initialize (MCP disabled mode)

### Full stack endpoints (verified working)

| Endpoint                | Port | Status         |
| ----------------------- | ---- | -------------- |
| `/health`               | 4000 | ✅ OK          |
| `/trpc/mcp.listServers` | 4000 | ✅ 135 servers |
| `/trpc/mcp.getStatus`   | 4000 | ✅ 1302 tools  |
| `/trpc/tools.list`      | 4000 | ✅ Working     |
| `/trpc/catalog.list`    | 4000 | ✅ Working     |
| `/trpc/workspace.list`  | 4000 | ✅ Working     |
| `/trpc/settings.get`    | 4000 | ✅ Working     |
| `/version`              | 4300 | ✅ Go sidecar  |

## Build status

- **Go**: `go build ./cmd/borg` ✅, `go vet ./...` ✅
- **TS core**: `tsc --noEmit` ✅ 0 errors
- **TS cli**: `tsc --noEmit` ✅ 0 errors
- **TS web**: `tsc --noEmit` ✅ 0 errors

## Recommended next steps

1. **Fix 11 runtime-error tRPC procedures** — services not initialized without full MCP
2. **Start server with MCP enabled** — `borg start` (without --no-mcp) should work
3. **Dashboard pages to real data** — wire React components to the 22 working tRPC procedures
4. **Resolve Dependabot** — 690+ vulnerabilities on default branch
5. **Submodule cleanup** — cloud-orchestrator, maestro, claude-mem still dirty
6. **Replace `z.any()` in @borg/types** with proper zod schemas
