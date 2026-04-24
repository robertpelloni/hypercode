# Jules Autopilot - Master Vision Document

**Author:** Robert Pelloni
**Version:** 0.8.5
**Last Updated:** 2026-01-09
**Status:** Active Development

---

## Executive Summary

Jules Autopilot is the **Ultimate Cloud Dev Command Center**—a high-performance engineering workspace that orchestrates millions of AI coding sessions across multiple cloud development providers (Jules, Devin, Manus, OpenHands, GitHub Spark, Claude Code, Codex, and more). It bypasses the sluggish official interfaces with a powerful dual-interface system: a feature-rich Web Dashboard and a keyboard-driven "Mecha Suit" TUI for power users.

---

## Core Mission

> **Build the ultimate cloud dev command center** that allows running millions of AI coding sessions simultaneously across **multiple providers**, with automatic continuation powered by multi-model consensus—all while bypassing the sluggish official interfaces.

### Why This Exists

> "The Jules website blows and its really slow and takes forever to load and lags like heck so this is way better when it actually works"

The official AI coding agent interfaces are slow, laggy, and don't scale. Jules Autopilot provides:

| Problem | Solution |
|---------|----------|
| Slow official UIs | High-performance alternative with <2s load times |
| Manual session management | Autopilot mode with auto-nudge, auto-approve |
| Single-provider lock-in | Multi-provider abstraction layer |
| No intelligent decision-making | Multi-model consensus and debate system |
| Limited parallelization | Support for 100+ concurrent sessions |
| Poor observability | Full logging, analytics, and real-time monitoring |

---

## Architecture: The "Mecha Suit" System

### Option C: Hono Backend + Ink CLI (Dual Interface)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT INTERFACES                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │   Web UI (Browser)          │  │   TUI "Mecha Suit" (Terminal)   │   │
│  │   Next.js 16 + React 19     │  │   Bun + Ink (React for CLI)     │   │
│  │   http://localhost:3000     │  │   `jules` command               │   │
│  │   Rich visualizations       │  │   Vim-style keybindings         │   │
│  └──────────────┬──────────────┘  └───────────────┬─────────────────┘   │
│                 │                                 │                      │
│                 └─────────────┬───────────────────┘                      │
│                               │                                          │
│                    ┌──────────▼──────────┐                               │
│                    │  Shared API Client  │                               │
│                    │  packages/api/      │                               │
│                    └──────────┬──────────┘                               │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │ HTTP + WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Bun/Hono :8080)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ server/index.ts - REST + WebSocket API                              ││
│  │  • /api/daemon/* (start, stop, status)                              ││
│  │  • /api/sessions/* (list, get, nudge, approve, interrupt)           ││
│  │  • /api/supervisor/* (debate, conference, handoff, review)          ││
│  │  • /api/broadcast                                                   ││
│  │  • ws://localhost:8080/ws (real-time events)                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ server/daemon.ts - Background Monitoring Loop                       ││
│  │  • Monitors sessions via provider APIs                              ││
│  │  • Auto-nudges stalled agents                                       ││
│  │  • Auto-approves safe plans (risk scoring)                          ││
│  │  • Runs multi-agent debates for risky decisions                     ││
│  │  • Handles session handoffs (30+ day archival)                      ││
│  │  • Emits WebSocket events to subscribers                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Persistence (SQLite via Prisma)                                     ││
│  │  • KeeperSettings - daemon configuration                            ││
│  │  • KeeperLog - action audit trail                                   ││
│  │  • SupervisorState - per-session state tracking                     ││
│  │  • Debate - multi-agent debate history                              ││
│  │  • Templates - session configuration presets                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Cloud Dev Provider APIs                              │
│  Jules • Devin • Manus • OpenHands • GitHub Spark • Claude Code • Codex │
└─────────────────────────────────────────────────────────────────────────┘
```

### Four Layers Architecture

| Layer | Technology | Purpose |
|-------|------------|---------|
| **1. Hono API Server** | Bun + Hono (port 8080) | Stateless REST + WebSocket API, shared by Web UI and TUI |
| **2. Background Daemon** | Inside Hono server | Long-running monitoring loop, autonomous actions, SQLite persistence |
| **3. Web Dashboard** | Next.js 16 (port 3000) | Full-featured browser UI, aggregates multiple service dashboards |
| **4. TUI Client** | Bun + Ink | `jules` CLI command, terminal-native keyboard-driven experience |
| **5. System Tray** | Tauri (Future) | Native desktop presence, quick start/stop, notifications |

### The "Mecha Suit" Concept

The TUI is your **Mecha Suit**—a keyboard-driven cockpit for power users:
- Same React mental model (Ink uses React for terminal)
- Vim-style keybindings
- Real-time session status in terminal
- Quick actions without leaving the command line
- Works over SSH, pipeable output

---

## Feature Requirements

### Session Management (P0 Critical)

| Feature | Description | Status |
|---------|-------------|--------|
| Session List | View all active/paused/completed sessions | ✅ Complete |
| Session Monitor | Real-time status tracking per session | ✅ Complete |
| **Interrupt All Sessions** | Emergency stop for all running sessions | ✅ Complete |
| **Continue All Sessions** | Resume all paused sessions at once | ✅ Complete |
| **Restart Old Sessions** | Automatically resume stalled/old sessions | ✅ Complete |
| Show Last/First Activity | Timestamps for session timeline | ✅ Complete |
| Show Current Status | Real-time state (running/paused/waiting) | ✅ Complete |
| Kanban Board | Visual drag-and-drop session management | ✅ Complete |

### Autopilot & Intelligence (P0 Critical)

| Feature | Description | Status |
|---------|-------------|--------|
| Autopilot Toggle | Enable/disable automatic continuation | ✅ Complete |
| Supervisor LLM | LLM that decides next actions | ✅ Complete |
| Auto-Approve Plans | Automatically approve safe agent plans | ✅ Complete |
| Risk Scoring | Evaluate plan safety before auto-approval | ✅ Complete |
| **Fallbacks** | Retry with different models on failure | ✅ Complete |
| **Consensus** | Multi-model agreement before risky actions | ✅ Complete |
| **Multi-Agent Debate** | Multiple AI personas discuss complex decisions | ✅ Complete |
| Broadcast | Send message to multiple sessions | ✅ Complete |

### Logging & Observability (P0 Critical)

| Feature | Description | Status |
|---------|-------------|--------|
| Logs Button | Quick access to daemon/session logs | ✅ Complete |
| Full Conversation Logs | Complete history with all entries | ✅ Complete |
| Download Logs | Export as JSON/Markdown | ✅ Complete |
| Analytics Dashboard | Session metrics and trends | ✅ Complete |
| Session Health | Stalled session detection with badges | ✅ Complete |
| Code Churn Analytics | Visualize additions/deletions over time | ✅ Complete |

### Multi-Provider Cloud Dev (v0.8.5)

| Feature | Description | Status |
|---------|-------------|--------|
| Unified Provider Interface | Abstract base class for all providers | ✅ Complete |
| Provider Registry | Factory functions for dynamic instantiation | ✅ Complete |
| Jules Provider | Full implementation wrapping JulesClient | ✅ Complete |
| Stub Providers | Devin, Manus, OpenHands, Spark, Blocks, Claude Code, Codex | ✅ Complete |
| Session Transfer Service | Cross-provider migration with context | ✅ Complete |
| Multi-Provider Store | Zustand state for sessions across providers | ✅ Complete |
| **Cross-Provider UI** | Dashboard for managing all providers | ✅ Complete |
| **Transfer Progress** | Real-time progress during migrations | ✅ Complete |
| Full Provider APIs | Implement Devin, Manus, OpenHands APIs | 🟡 Planned |

---

## Implementation Status

### Completed Phases

#### Phase 1: Core UI/UX ✅
- Session Board, Activity Feed, Artifact Browser
- Session Keeper with Auto-Pilot
- Multi-Agent Debate basic implementation

#### Phase 2: Enhanced Interactions ✅
- Code Diff Viewer
- Terminal Output Rendering
- Session Kanban Board
- System Status Dashboard
- Memory Manager (context compaction)
- Code Churn Analytics
- Session Health Monitoring
- Broadcast Messages
- Terminal Integration with API key injection

#### Phase 3: Advanced Features ✅
- Multi-Agent Debate with configurable providers
- Deep Code Analysis (Security, Performance, Maintainability)
- Artifact Browser with list and preview
- Session Templates
- Council Debate Visualization
- GitHub Issue Integration

#### Phase 4: Production Readiness ✅
- Secure Authentication (HTTP-only cookies + Middleware)
- Docker Optimization (multi-stage builds)
- CI/CD Pipeline (automated testing)
- E2E Testing (Playwright suite)
- Hierarchical Documentation (AGENTS.md structure)
- Versioning System (VERSION.md single source of truth)
- Submodule Dashboard

#### Phase 5: Platform Extensions 🟡 In Progress
- [ ] User Accounts with OAuth (Google/GitHub)
- [ ] Plugin System for custom agent tools
- [x] Advanced Analytics (token usage, cost estimation)

#### Phase 6: Multi-Provider Cloud Dev ✅
- [x] Unified Provider Interface
- [x] Provider Registry with Factory Functions
- [x] Jules Provider Implementation
- [x] Stub Providers (7 additional providers)
- [x] Session Transfer Service
- [x] Multi-Provider State Management
- [x] Cross-Provider UI Dashboard
- [x] Transfer Progress Tracking

### Open Issues (P1-P2)

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| PERF-004 | Replace Polling with Reactive Data Fetching | P1 | 🟡 Open |
| CLEAN-001 | Remove Debug Logging from Proxy | P1 | 🟡 Open |
| EXPORT-001 | Export Session Data | P2 | 🟡 Open |
| NOTIF-002 | Native Browser Notifications | P2 | 🟡 Open |
| TYPE-001 | Strict API Type Safety | P2 | 🟡 Open |
| ANALYTICS-002 | Code Impact Metrics | P2 | 🟡 Open |
| THEME-001 | Semantic Theming System | P2 | 🟡 Open |
| EXT-001 | Modjules Library Integration | P2 | 🟡 Open |

---

## Long-Term Vision

### Jules Autonomous
- **Self-hosting capability** - Run entirely on your own infrastructure
- **Full repository management** - Auto-PR, auto-merge workflows
- **Continuous development** - 24/7 autonomous coding agents

### Provider Ecosystem
- **10+ cloud dev providers** - Unified interface for all major AI coding agents
- **Unified billing** - Cost tracking across all providers
- **Automated provider selection** - Smart routing based on task requirements
- **Provider health monitoring** - Automatic failover between providers

### HyperCode Integration
> "We want to wrap over all of those and somehow be compatible with all the frameworks they are using"

Jules Autopilot is designed to integrate into the larger HyperCode (AI Operating System) ecosystem:
- Acts as a portal/aggregator for disparate webservers
- Supports reverse proxy or iframe embedding
- Maintains consistent UX across different backend frameworks
- Aggregates 70+ submodules into a unified "Mecha Suit" architecture

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| **Terminal** | xterm.js (web), Ink 5 (CLI) |
| **Backend** | Bun, Hono 4, WebSocket |
| **Database** | SQLite (Prisma 5), Turso (libSQL) for cloud |
| **State** | Zustand 5 |
| **Real-time** | WebSocket events |
| **Testing** | Jest, Playwright |
| **Deployment** | Docker, Docker Compose |

---

## Quality Standards

### Zero Regressions Policy

> "You broke everything and keep breaking everything over and over and it keeps getting regressions... then I point out all the broken stuff and you fix it and then slowly break it all again"

**Mandatory Practices:**
1. Run `lsp_diagnostics` after every code change
2. Run `npm run build` before any commit
3. Test daemon startup after Prisma changes
4. Never suppress type errors with `as any` or `@ts-ignore`
5. Minimal fixes for bugs—no refactoring during bugfixes

### Success Metrics

| Metric | Target |
|--------|--------|
| Session Throughput | 100+ concurrent sessions |
| Response Time | Dashboard loads <2 seconds |
| Uptime | Daemon runs 24/7 without intervention |
| Zero Regressions | Build must pass before every commit |

---

## Commands Reference

```bash
# Development
npm run dev                      # Start Next.js (port 3000)
bun run server/index.ts          # Start Daemon (port 8080)
node terminal-server/server.js   # Start Terminal WebSocket (port 8081)

# Docker
docker-compose -f deploy/docker-compose.yml up

# Maintenance
git submodule update --init --recursive
npx prisma migrate dev
npx prisma studio

# Testing
npm test
npm run test:e2e
npm run lint
npm run build
```

---

## Appendix: User Commands

From the Ultimate Command Center Vision:

| Command | Description |
|---------|-------------|
| **Interrupt All** | Emergency halt all background autopilot actions |
| **Continue All** | Resume background monitoring for all sessions |
| **Restart Old Sessions** | Bulk trigger age-based handoffs (30+ days) |

---

*This document represents the consolidated vision for Jules Autopilot. It is the single source of truth for project direction, features, and architecture.*
