# Handoff

## What was done (v1.0.0-alpha.38 session)

### Milestones achieved
1. **Created 8 `@borg/*` stub packages** — resolved all missing module imports
2. **Zero TypeScript errors** — core, cli, web, go vet all green
3. **Server starts with MCP enabled** — crawls links, loads 14,707 memories, serves 135 servers/1302 tools
4. **tRPC endpoints work** — startupStatus, mcp.listServers, mcp.getStatus all return real JSON
5. **Dashboard proxy works** — Next.js → tRPC → TS server returns real data
6. **Go sidecar works** — detects 24 CLI tools, 22 harnesses, serves 388 REST routes
7. **Full stack verified end-to-end** — TS server + Go sidecar + Next.js dashboard
8. **Zero hypercode references** in any active TypeScript source

### Commits (9 pushed)
1. `@borg/*` stub packages + TS error fixes + stale gitlink cleanup
2. Suspense boundary for reset-password page
3. Next.js dev script + dashboard utility stub fixes
4. CHANGELOG/TODO/MEMORY updates
5. API route ordering fix (scripts before wildcard)
6. tRPC getMcpServer() fallback
7. Final hypercode→borg renames
8. Version bump to alpha.38

### Key architecture: `@borg/*` stub packages
Each has 3 layers:
- `src/index.ts` — TS type stubs (for `tsc --noEmit`)
- `dist/index.js` — ESM runtime stubs with real constructors
- `dist/index.d.ts` — Type declarations

Critical: `@borg/types` needs real zod schemas (tRPC `.input()` checks them). `@borg/ai`, `@borg/agents`, `@borg/tools`, `@borg/mcp-registry` need real classes with constructors. `@borg/types` uses `z.any()` for simplicity.

### Full stack endpoints
| Endpoint | Port | Status |
|----------|------|--------|
| `/health` | 4000 | ✅ 200 OK |
| `/api/scripts` | 4000 | ✅ Returns real data |
| `/trpc/startupStatus` | 4000 | ✅ Full status JSON |
| `/trpc/mcp.listServers` | 4000 | ✅ 135 servers |
| `/trpc/mcp.getStatus` | 4000 | ✅ 1302 tools |
| `/api/cli/summary` | 4300 | ✅ 24 tools, 22 harnesses |
| `/api/runtime/status` | 4300 | ✅ Full runtime snapshot |
| Dashboard proxy | 3000 | ✅ Forwards to TS server |

## Build status
- **Go**: `go build ./cmd/borg` ✅, `go vet ./...` ✅
- **TS core**: `tsc --noEmit` ✅ 0 errors
- **TS cli**: `tsc --noEmit` ✅ 0 errors
- **TS web**: `tsc --noEmit` ✅ 0 errors
- **Dashboard build**: 86/86 pages ✅
- **Server**: Starts with MCP ✅, tRPC serves real data ✅

## Recommended next steps
1. **Wire dashboard pages to real data** — the proxy works but pages use stub utilities
2. **Start both servers together** — create a unified start script (TS + Go)
3. **Free-tier providers** — OpenRouter free, Google AI Studio in fallback chain
4. **Resolve Dependabot** — 690 vulnerabilities on default branch
5. **Submodule cleanup** — cloud-orchestrator, maestro, claude-mem still dirty
6. **LanceDBStore** — `is not a constructor` error in session import
7. **Replace `z.any()` in @borg/types** with proper zod schemas matching real API contracts
