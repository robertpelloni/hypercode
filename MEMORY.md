# Memory

> **CRITICAL**: Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` first.

## Ongoing Observations & Codebase Knowledge

### 1. The Great Config Split (Fixed in 1.0.0-alpha.1)
**Observation**: Historically, `mcp.jsonc` in the user directory was intended to act as the sole source of truth. However, as SQLite was introduced, a destructive cycle emerged where `McpConfigService.syncWithDatabase()` would wipe out DB tools (and their `always_on` status) if `mcp.jsonc` lacked `_meta.tools`.
**Resolution**: We completely decoupled the manual config from the database. The system now exports a unified `.hypercode/mcp-cache.json` which the lightweight `stdioLoader` reads. DB tools are no longer destroyed by an empty JSON configuration.

### 2. The `always_on` Advertising Filter
**Observation**: `getDirectModeTools()` in `MCPServer.ts` enforces an "ULTRA-STREAMLINED ADVERTISING" filter. It ONLY returns tools marked `always_on`. If no tools have this flag, it defaults to returning *only* the internal meta-tools (`search_tools`, `load_tool`, etc.).
**Implication**: This is intended behavior to keep LLM context clean. Models are expected to use `search_tools` and `load_tool` to dynamically fetch what they need.

### 3. Config Directory Resolution
**Observation**: `getHyperCodeConfigDir()` historically hardcoded `os.homedir() + '/.hypercode'`. 
**Resolution**: It now dynamically respects `process.env.HYPERCODE_CONFIG_DIR`, and falls back to checking `process.cwd()/mcp.jsonc` before defaulting to the user's home directory. This allows local repository configurations to be authoritative during development.

### 4. Binary Extraction Strategy
**Observation**: The project has aggressive plans to split into distinct daemons (`hypercoded`, `hypermcpd`, etc.).
**Implication**: DO NOT split these prematurely. Follow the modular-monolith-first rule defined in `UNIVERSAL_LLM_INSTRUCTIONS.md`. Treat the Go workspaces as experimental bridges for now.

### 5. better-sqlite3 and Node 24 (Fixed 2026-04-08)
**Observation**: `better-sqlite3@12.6.2` requires native `.node` bindings compiled for the exact Node version. Node v24.10.0 broke compatibility.
**Resolution**: `pnpm rebuild better-sqlite3` works (uses prebuild-install). `node-gyp rebuild` does NOT work on Node 24.
**Implication**: After any `pnpm install`, you MUST run `pnpm rebuild better-sqlite3` on Node 24. Add this to startup checks.

### 6. Gemini Model Names Change Frequently (Updated 2026-04-08)
**Observation**: `gemini-2.0-flash` was deprecated and returns 404. The current free-tier model is `gemini-2.5-flash`.
**Implication**: When adding Gemini models, verify current availability at https://ai.google.dev/gemini-api/docs/models. The ProviderRegistry should be updated whenever Google renames models.

### 7. Dashboard Polling Creates Noise
**Observation**: The Next.js dashboard polls multiple endpoints every 5 seconds, generating a constant stream of HTTP requests. If any endpoint returns 404 (like `/api/scripts`), it creates log spam and wasted cycles.
**Resolution**: Added REST API bridge routes in `orchestrator.ts` that serve the same data as the tRPC router, so the dashboard's native-control-plane fetch path works cleanly.

### 8. Worktree Complexity
**Observation**: The project uses git worktrees with the submodule structure at `.git/modules/hypercode`. The actual working directory (`hypercode-push`) can become detached from `main`.
**Resolution**: Manually update the worktree HEAD file to point to `refs/heads/main`. Don't try to use `git checkout main` across worktrees.

*Update this file whenever a major systemic pattern, recurring bug, or deep architectural quirk is discovered.*
