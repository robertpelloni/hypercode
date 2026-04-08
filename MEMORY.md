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

### 9. Go Sidecar Version Injection (Added 2026-04-08)
**Observation**: The Go binary had a hardcoded version `0.0.1-experimental` that was completely out of sync with the VERSION file.
**Resolution**: `go/internal/buildinfo/buildinfo.go` now uses `var Version` (not `const`) injected at build time via `-ldflags "-X internal/buildinfo.Version=$VER"`. The build script `scripts/build-go.sh` reads from the VERSION file automatically.
**Implication**: Always use `scripts/build-go.sh` or the ldflags pattern to build the Go binary. Never manually edit buildinfo.go.

### 10. Submodule Stash Pop Conflicts (Added 2026-04-08)
**Observation**: When updating submodules with `git merge origin/main` followed by `git stash pop`, merge conflicts appear in stash-applied files. Using `git checkout --ours` resolves to the merged main version, which is typically correct for our local changes.
**Implication**: When submodules have both upstream updates and local stashed changes, merge upstream first, then pop stash, then resolve conflicts keeping HEAD (the merged result).

### 11. Meta-Tool Decision System is Already Implemented (Added 2026-04-08)
**Observation**: The MCP meta-tool decision system was listed as TODO but is actually fully implemented in `packages/core/src/mcp/`. It includes:
- `NativeSessionMetaTools.ts` — 6 permanent meta-tools (search_tools, load_tool, get_tool_schema, list_loaded_tools, unload_tool, list_all_tools) plus auto_call_tool, search_published_catalog, install_published_server
- `toolSearchRanking.ts` — Multi-signal scoring (exact name, prefix, token, semantic group, tags, description, server name) with profile boosting
- `SessionToolWorkingSet.ts` — LRU + idle-first eviction with configurable caps (default 16 loaded, 8 hydrated)
- Full tRPC endpoints: getWorkingSet, getWorkingSetEvictionHistory, getToolSelectionTelemetry, searchTools
**Implication**: Do NOT re-implement. Focus on improving ranking quality, adding more profiles, and verifying the dashboard inspector shows all this data.

### 12. Package.json Sync Script Pattern (Added 2026-04-08)
**Observation**: There are 57 package.json files across the monorepo that all need version syncing. The inline Node.js script pattern (`node -e "const fs=..."`) is reliable for this.
**Implication**: Every version bump should sync all 57 files. The script excludes node_modules, .git, archive, and submodules directories.

### 13. Multi-Model Pair Programming Pattern (Added 2026-04-08)
**Observation**: For complex tasks, a single model often hallucinates or misses edge cases. A multi-model squad with rotating roles (Planner, Implementer, Tester) provides much higher reliability.
**Resolution**: Implemented `PairOrchestrator` which coordinates Claude, GPT, and Gemini in a shared chat history. It rotates roles every turn to ensure diverse perspective on the implementation.
**Implication**: Use `run_pair_session` for high-complexity structural changes.

### 14. Preemptive Tool Advertisement (Added 2026-04-08)
**Observation**: Models waste tokens and latency searching for tools. If we know they are likely to need a tool based on the topic, we should "advertise" it in the initial turn.
**Resolution**: Implemented `ToolPredictor` which uses a fast LLM turn to predict needed capabilities and preloads them into the working set before the main agent turn.
**Implication**: Preloading makes tools visible in `list_tools` without explicit model search.

### 15. Go Native Tool Execution Pattern (Added 2026-04-08)
**Observation**: Relying on the Node control plane for every tool call creates a single point of failure and higher latency.
**Resolution**: Ported core standard library and parity tools (read, write, bash, edit) to native Go in `go/internal/tools/`. The Go sidecar now implements a "Native First, Bridge Second" strategy in `handleAgentRunTool`.
**Implication**: The Go sidecar can fulfill many critical developer tasks autonomously even if the TypeScript server is restarting or unreachable.

### 16. Package Build Dependency in Monorepo (Added 2026-04-08)
**Observation**: Adding new files and exports to sub-packages (like `@hypercode/agents`) requires an explicit build of those packages before the main control plane (`@hypercode/core`) or CLI can see the changes, especially if they depend on built artifacts or have strict type checking.
**Resolution**: Run `pnpm build` in the affected sub-packages before building the consumer.
**Implication**: Automated build scripts should handle package topological sorting or ensure all dependencies are built.

### 17. Multi-Model Swarm Pattern (Added 2026-04-08)
**Observation**: For complex, multi-stage projects, a fixed implementation loop (PairOrchestrator) is sometimes too rigid. A swarm of models with specialized roles (Planner, Implementer, Tester, Critic) and a shared neural transcript provides more flexibility.
**Resolution**: Implemented `SwarmController` which manages a team of models and evaluates progress using a "Critic" model turn. The transcript acts as the shared working memory for the entire swarm.
**Implication**: Use `swarm_start_session` for goals that require multiple iterative cycles of planning and verification.

### 18. A2A Communication Broker (Added 2026-04-08)
**Observation**: Decentralized agents need a structured way to hand off tasks and share state without creating tight coupling between classes.
**Resolution**: Implemented `A2ABroker` (TS and Go) that routes typed messages (TASK_REQUEST, STATE_UPDATE, etc.) based on agent IDs. The broker includes history tracking for dashboard visibility.
**Implication**: All new autonomous agents should register with the `A2ABroker` to enable full orchestration and observability.

*Update this file whenever a major systemic pattern, recurring bug, or deep architectural quirk is discovered.*
