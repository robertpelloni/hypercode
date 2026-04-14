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
**Observation**: `getBorgConfigDir()` historically hardcoded `os.homedir() + '/.hypercode'`. 
**Resolution**: It now dynamically respects `process.env.BORG_CONFIG_DIR`, and falls back to checking `process.cwd()/mcp.jsonc` before defaulting to the user's home directory. This allows local repository configurations to be authoritative during development.

### 4. Binary Extraction Strategy
**Observation**: The project has aggressive plans to split into distinct daemons (`hypercoded`, `hypermcpd`, etc.).
**Implication**: DO NOT split these prematurely. Follow the modular-monolith-first rule defined in `UNIVERSAL_LLM_INSTRUCTIONS.md`. Treat the Go workspaces as experimental bridges for now.

*Update this file whenever a major systemic pattern, recurring bug, or deep architectural quirk is discovered.*
