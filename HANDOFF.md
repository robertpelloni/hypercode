# Handoff — Session 2026-04-08 (Extended)

**Version:** `1.0.0-alpha.16`
**Branch:** `main`
**Commits this session:** 24 (alpha.8 → alpha.16)

## Session Summary

### Phase 10: Swarm Orchestration & Final Renaming (commits 23-24)
- Implemented `SwarmController` to manage a team of models (Claude, GPT, Gemini, Qwen) with shared context and rotating roles.
- Added `swarm_start_session` MCP tool to trigger multi-model swarm collaboration.
- Renamed `borg.config.json` to `hypercode.config.json`.
- Completed the rename of `borg` adapter to `hypercode` adapter in `submodules/hyperharness` and removed redundant files.
- Pushed all updates to remotes.

## Current state of the project

### What works
- ✅ Server builds and runs (Express/tRPC on :4000, Next.js dashboard on :3000, MCP WebSocket on :3001)
- ✅ SQLite functional after better-sqlite3 rebuild for Node 24
- ✅ Local LLM Priority: Utility calls (worker tasks) prefer local LM Studio with Gemma-4 Aggressive.
- ✅ Multi-Model Swarm: `SwarmController` handles coordination between a model team (Claude, GPT, Gemini, Qwen).
- ✅ Agent-to-Agent (A2A): Central `A2ABroker` (TS/Go) handles message routing between agents.
- ✅ A2A Dashboard: Live message traffic and registered agents visible in Agent Command Center.
- ✅ Go Sidecar Monitoring: Native `ConversationMonitor` loop running `ToolPredictor` autonomously.
- ✅ BobbyBookmarks: Syncs from both SQLite DB and `bookmarks.txt` with deduplication.
- ✅ Go Native Tools: Go sidecar executes Claude Code, Codex, and OpenCode tools natively.

### What's broken or incomplete
- All paid LLM providers have exhausted quotas (OpenAI 429, Anthropic 400, DeepSeek 402)
- glama.ai returns HTML (adapter has fallback URLs but may still fail)
- mcp.run adapter returns 404 (their API changed)
- Dashboard has 69 pages — not all verified to show real data
- A2A protocol needs more agents to be natively converted to use the broker.

### Architecture overview
```
hypercode/
├── VERSION                    # Single source of truth (1.0.0-alpha.16)
├── packages/core/             # Main TypeScript control plane
│   ├── src/services/A2ABroker.ts # Central message router (TS)
├── packages/agents/           # Agent orchestration logic
│   ├── src/orchestration/SwarmController.ts # Multi-model team (NEW)
├── packages/adk/              # Agent Development Kit
│   ├── src/Agent2Agent.ts     # Protocol definitions (NEW)
├── go/                        # Go-native server bridge
│   ├── internal/orchestration/a2a_broker.go # Native broker (NEW)
│   └── internal/supervisor/monitor.go       # Predictor loop (NEW)
├── apps/web/                  # Next.js dashboard
│   ├── src/components/agents/A2AMessageCenter.tsx # Dashboard UI (NEW)
└── bin/hypercode.exe          # Compiled Go binary
```

## Submodule status
- All submodules synced and pushed to robertpelloni remotes.

## Recommendations for next agent

### Immediate (P0)
1. Start the server and test `swarm_start_session` tool from the inspector.
2. Verify A2A message traffic in the dashboard during a swarm session.

### High priority (P1)
1. **Agent Integration** — Convert `GeminiAgent`, `ClaudeAgent`, etc. to natively use the `A2ABroker` for all communication.
2. **Dashboard Polish** — Go through the 69 pages and ensure real data is flowing to each.
3. **Provider Expansion** — Add OpenRouter free models and Google AI Studio free tier to the fallback chain.

### Medium priority (P2)
1. Port the `SwarmController` logic to Go.
2. Implement an A2A WebSocket bridge for remote agent orchestration.
