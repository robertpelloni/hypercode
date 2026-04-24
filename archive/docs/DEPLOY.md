# Deploy — HyperCode Local Development

_Last updated: 2026-04-08, version 1.0.0-alpha.4_

## Prerequisites

- **Node.js** v24.x (tested on v24.10.0)
- **pnpm** v10.x
- **Go** 1.23+ (for Go-native handlers)
- **Python** 3.12+ (for some tooling scripts)
- **Git** with submodule support
- **Windows** 10/11 (primary dev platform; Linux/macOS should work)

## Quick Start

```bash
# 1. Clone with submodules
git clone --recurse-submodules https://github.com/hypercodehq/hypercode.git
cd hypercode

# 2. Install dependencies
pnpm install

# 3. CRITICAL: Rebuild native bindings for Node 24
pnpm rebuild better-sqlite3

# 4. Build CLI entrypoint (Go-primary startup)
pnpm run build:startup-go

# 5. Start the server
# Windows:
.\start.bat
# Linux/macOS:
./start.sh
```

## What starts

1. **HyperCode Core** (Node.js) on `http://0.0.0.0:4000`
   - tRPC API at `/trpc`
   - REST API at `/api/*`
   - Health check at `/health`
2. **MCP WebSocket Bridge** on `ws://localhost:3001`
3. **Next.js Dashboard** on `http://localhost:3000/dashboard`
4. **HyperCode Supervisor** (MCP stdio child process)

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | OpenAI API key (GPT-4o, GPT-4o-mini) |
| `GOOGLE_API_KEY` or `GEMINI_API_KEY` | Recommended | Google AI API key (Gemini 2.5 Flash is **free tier**) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (Claude Sonnet 4) |
| `DEEPSEEK_API_KEY` | No | DeepSeek API key |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (free models available) |
| `HYPERCODE_CONFIG_DIR` | No | Override config directory (default: `~/.hypercode`) |
| `HYPERCODE_RUNTIME` | No | `node`, `go`, or `auto` (default: `auto`) |

## Key Configuration Files

- `mcp.jsonc` — MCP server definitions (34K+ lines, comprehensive)
- `llm_config.json` — LLM provider configuration
- `packages/core/config/council.json` — Council member definitions
- `hypercode.config.json` — Core service configuration

## Troubleshooting

### better-sqlite3 fails to load
```bash
pnpm rebuild better-sqlite3
# Verify:
node -e "require('better-sqlite3')(':memory:'); console.log('OK')"
```

### Port 4000 already in use
```bash
# Check what's using it
netstat -ano | findstr :4000
# Kill the process (get PID from above)
taskkill /PID <PID> /F
```

### Dashboard shows empty data
- The dashboard fetches from the control plane API on port 4000
- Make sure the core server started successfully (check for `Core loaded: orchestrator started`)
- SQLite must be working for most data (see better-sqlite3 troubleshooting above)

### All LLM providers fail with quota errors
- This means all paid API keys have exhausted their quotas
- Add a Google API key for Gemini 2.5 Flash (free tier with generous limits)
- Or add an OpenRouter API key for free model access

## Architecture

```
hypercode/
├── packages/core/       # Main TypeScript control plane (593 .ts)
├── packages/cli/        # CLI entrypoint (28 .ts)
├── apps/web/            # Next.js 16 dashboard (311 .ts/.tsx)
├── go/                  # Go-native server bridge (139 .go)
├── apps/maestro/        # Electron/Wails visual orchestrator (submodule)
├── apps/cloud-orchestrator/ # Jules autopilot (submodule)
├── submodules/          # Reference submodules
│   ├── hyperharness/    # LLM harness
│   └── prism-mcp/       # Prism MCP reference
├── packages/claude-mem/ # Claude memory bridge (submodule)
├── docs/                # Documentation
├── data/                # Runtime data
├── scripts/             # Build and utility scripts
└── mcp.jsonc            # MCP server configuration
```

## Deployment (Docker)

```bash
# Build production image
docker build -f Dockerfile.prod -t hypercode:latest .

# Run with docker-compose
docker-compose up -d
```

The Docker setup exposes:
- Port 4000 (API/control plane)
- Port 3000 (dashboard)
- Port 3001 (MCP WebSocket)
