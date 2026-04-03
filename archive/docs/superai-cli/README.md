# SuperAI CLI

> 🦾 The "Mecha Suit" - A unified CLI/TUI orchestrator for AI coding tools.

[![Go Version](https://img.shields.io/badge/Go-1.25.5-00ADD8?logo=go)](https://go.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

SuperAI CLI consolidates multiple AI coding assistants into a single, powerful interface. Instead of switching between different tools, you get one TUI that orchestrates them all.

**Supported Agents:**
- 🤖 **claude-code** - Anthropic's Claude CLI
- 🧠 **qwen-code** - Alibaba's Qwen CLI  
- ⚡ **opencode-autopilot** - OpenCode autopilot
- 📋 **vibe-kanban** - Kanban board TUI
- 👥 **aider** - AI pair programming

## Features

- **Unified Dashboard** - Single interface for all AI tools
- **Real-time Streaming** - Live output from any agent
- **Tool Registry** - Extensible tool system with JSON Schema
- **MCP Integration** - Connect to hypercode hub for shared tools
- **Keyboard-Driven** - Vim-style navigation

## Quick Start

```bash
# Build
go build ./cmd/superai

# Run
./superai
# or
go run ./cmd/superai
```

## Hotkeys

| Key | Action |
|-----|--------|
| `j` / `↓` | Navigate down |
| `k` / `↑` | Navigate up |
| `s` | Start selected agent |
| `t` | Test tool execution |
| `q` / `Ctrl+C` | Quit |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SuperAI CLI                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │   Sidebar   │  │   Viewport  │  │   Status Bar   │  │
│  │  (Agents)   │  │   (Logs)    │  │   (Hotkeys)    │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────────┘  │
│         │                │                              │
│         ▼                ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Runner (Goroutines)                │   │
│  │  Spawns agents, streams output via channels     │   │
│  └─────────────────────────────────────────────────┘   │
│         │                │                              │
│         ▼                ▼                              │
│  ┌─────────────┐  ┌─────────────┐                      │
│  │ Orchestrator│  │ MCP Client  │                      │
│  │ (Tool Exec) │  │ (Hub Tools) │                      │
│  └─────────────┘  └─────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
superai-cli/
├── cmd/superai/           # Entry point
│   └── main.go
├── internal/
│   ├── tui/               # Terminal UI (Bubble Tea)
│   │   └── dashboard.go
│   ├── agent/             # Subprocess management
│   │   └── runner.go
│   ├── orchestrator/      # Tool execution
│   │   ├── registry.go
│   │   └── orchestrator.go
│   └── mcp/               # MCP hub client
│       └── client.go
├── AGENTS.md              # AI agent instructions
├── CHANGELOG.md           # Release history
├── ROADMAP.md             # Development roadmap
├── VERSION                # Version number
└── go.mod
```

## Tech Stack

- **Language**: Go 1.25.5
- **TUI Framework**: [Bubble Tea](https://github.com/charmbracelet/bubbletea) + [Lip Gloss](https://github.com/charmbracelet/lipgloss)
- **Architecture**: MVU (Model-View-Update)
- **Concurrency**: Goroutines + Channels

## Configuration

SuperAI connects to the hypercode MCP hub at `localhost:3000` for tool discovery. Ensure the hub is running for full functionality.

## Development

```bash
# Format code
gofmt -w .

# Run checks
go vet ./...

# Build binary
go build ./cmd/superai
```

See [AGENTS.md](./AGENTS.md) for detailed development guidelines.

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the development plan:

- **v0.2.0** - Agent Integration (wire real binaries)
- **v0.3.0** - Tool Execution (MCP hub integration)
- **v0.4.0** - ReAct Orchestration (LLM-driven)
- **v0.5.0** - Multi-Agent Collaboration
- **v0.6.0** - Session Persistence
- **v0.7.0** - Advanced UI
- **v0.8.0** - Plugin System

## Part of hypercode

SuperAI CLI is a submodule of the [hypercode](https://github.com/hypercode) monorepo, providing a unified interface for all AI coding tools in the workspace.

## License

MIT
