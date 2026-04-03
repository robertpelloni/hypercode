# QUICKSTART.md — Using Hypercode

> **Version**: 2.6.2 | [Full Vision](VISION.md) | [Roadmap](ROADMAP.md)

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** (`npm i -g pnpm`)
- **Git** with submodule support

---

## 1. Installation

```bash
git clone https://github.com/robertpelloni/hypercode.git
cd hypercode
pnpm install
```

---

## 2. Starting the System

### Option A: Full Stack (Core + Dashboard + Supervisor)

```bash
pnpm start
```

This boots:
- **Hypercode Core** (MCPServer) — Stdio + WebSocket on `ws://localhost:3001`
- **Web Dashboard** — Next.js on `http://localhost:3000`

### Option B: Individual Services

```bash
# Core only (MCP server)
cd packages/core && npm run build && node dist/MCPServer.js

# Dashboard only (assumes Core is running)
cd apps/web && npm run dev

# CLI
cd packages/cli && npm run build && node dist/index.js
```

---

## 3. Using Hypercode as an MCP Server

Hypercode is a standard MCP server. It exposes all its tools (file operations, code search, memory, agents, research, etc.) via the Model Context Protocol.

### Claude Desktop / Cursor / Windsurf

Add to your MCP settings (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hypercode": {
      "command": "node",
      "args": ["C:/Users/hyper/workspace/hypercode/packages/core/dist/MCPServer.js"],
      "cwd": "C:/Users/hyper/workspace/hypercode"
    }
  }
}
```

### Antigravity (VS Code)

Hypercode integrates natively with the Antigravity VS Code extension. The extension connects to Hypercode Core via WebSocket on port 3001. This is already configured in the workspace — when you open the Hypercode project in Antigravity, the extension activates automatically.

**Connection flow:**
1. Antigravity extension starts → activates `google.antigravity`
2. Extension connects to `ws://localhost:3001`
3. All MCP tools are available through the VS Code agent

### Other MCP Clients

Any MCP client that supports stdio transport can connect:

```bash
# Direct stdio connection
node packages/core/dist/MCPServer.js
```

Or via WebSocket (port 3001) for clients that support HTTP/WS transport.

---

## 4. Web Dashboard (Mission Control)

The dashboard provides a visual interface to all 31+ system pages.

```bash
cd apps/web && npm run dev
# Open http://localhost:3000
```

### Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| Director | `/dashboard/director` | AI agent task management |
| Council | `/dashboard/council` | Multi-agent consensus debates |
| Memory | `/dashboard/memory` | Vector memory search & management |
| Research | `/dashboard/research` | Deep recursive research |
| Skills | `/dashboard/skills` | Tool & skill registry |
| Metrics | `/dashboard/metrics` | System performance metrics |
| Evolution | `/dashboard/evolution` | Prompt evolution experiments |
| Inspector | `/dashboard/inspector` | MCP traffic inspection |
| Healer | `/dashboard/healer` | Self-healing diagnostics |
| Architecture | `/dashboard/architecture` | Dependency graph visualization |

---

## 5. Browser Extension

The Chrome/Firefox extension bridges browser capabilities to Hypercode Core.

### Installation (Development)

1. Build the extension:
   ```bash
   cd apps/extension && pnpm install && pnpm build
   ```
2. Load in Chrome:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" → select `apps/extension/dist`

### How It Works

The extension connects to Hypercode Core via WebSocket (`ws://localhost:3001`) and provides:
- **Page reading** — extract content from any webpage
- **Screenshot capture** — visual context for the AI
- **Tab management** — programmatic browser control
- **CDP Bridge** — Chrome DevTools Protocol integration

---

## 6. CLI (Command Line)

The `hypercode` CLI provides terminal access to all subsystems:

```bash
# Install globally (optional)
pnpm -w run build && npm link packages/cli

# Or run directly
node packages/cli/dist/index.js

# Available commands:
hypercode start          # Start Hypercode Core
hypercode status         # System status
hypercode mcp            # MCP server management
hypercode memory         # Memory operations (save/recall/search)
hypercode agent          # Agent management
hypercode session        # Session management
hypercode provider       # AI provider configuration
hypercode tools          # Tool registry
hypercode config         # Configuration
hypercode dashboard      # Dashboard management
```

---

## 7. Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    HYPERCODE CORE (MCPServer)                 │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ Director │  │ Council  │  │  Memory  │  │ Healer  │  │
│  │  Agent   │  │ (4-role) │  │ (Vector) │  │ Service │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │
│       └──────────────┴──────────────┴─────────────┘      │
│                          │                               │
│    ┌─────────────────────┼─────────────────────┐        │
│    │                     │                     │        │
│    ▼                     ▼                     ▼        │
│ ┌──────┐          ┌───────────┐         ┌──────────┐   │
│ │Stdio │          │ WebSocket │         │  tRPC    │   │
│ │(MCP) │          │ :3001     │         │ Router   │   │
│ └──┬───┘          └─────┬─────┘         └────┬─────┘   │
└────┼────────────────────┼────────────────────┼─────────┘
     │                    │                    │
     ▼                    ▼                    ▼
┌─────────┐      ┌──────────────┐      ┌────────────┐
│ Claude  │      │   Browser    │      │  Next.js   │
│ Desktop │      │  Extension   │      │ Dashboard  │
│ Cursor  │      │ + Antigravity│      │  :3000     │
│ VS Code │      │   VS Code    │      │            │
└─────────┘      └──────────────┘      └────────────┘
```

---

## 8. Troubleshooting

### Port 3001 already in use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F
```

### Build errors
```bash
# Rebuild everything
pnpm install
cd packages/core && npm run build
cd ../../apps/web && npm run build
```

### WebSocket not connecting
- Ensure Hypercode Core is running (`pnpm start` or `node packages/core/dist/MCPServer.js`)
- Check `ws://localhost:3001/health` returns `{"status":"online"}`

### Multiple lockfiles warning
This is harmless — Next.js detects both `package-lock.json` and `pnpm-lock.yaml`. The build still succeeds.
