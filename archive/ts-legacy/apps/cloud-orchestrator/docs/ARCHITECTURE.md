# Jules Autopilot - Architecture Guide

**Version:** 1.0.35
**Decision:** Option C - Hono Backend + Ink TUI + Web UI

---

## System Overview

> **Migration Note:** The legacy Bun/Hono daemon has been officially deleted. The Go backend (`backend-go/`) is now the exclusive and mandatory runtime for Jules Autopilot. It has reached full functional and operational parity, covering: manifest/summary/webhook/session replay routes, direct session/activity read routes, filesystem utility routes, template CRUD routes, review routes, import/export routes, debate execution/history routes, observability/health routes, static SPA serving/index fallback, websocket protocol alignment (`connected` / `pong` semantics), request-scoped Jules auth header support, resilient degraded-mode session handling, graceful shutdown, background task scheduling, comprehensive Borg webhook parity, Go-native CLI indexing, API Key management (v3.0 Roadmap), Bun-like CORS behavior, root `.env` bootstrap parity, centralized API-oriented error handling, daemon/worker lifecycle semantics, live daemon polling, keeper-cadence-aware daemon scheduling, Go-side Jules source discovery, `check_session` queue automation, provider-backed council debate for risky plans, failed-session recovery guidance, `index_codebase` background indexing, semantic RAG retrieval, autonomous RAG reindex triggering, `check_issues` autonomous work discovery, Keeper log persistence, shared provider/model/risk helper abstractions, and explicit daemon-style lifecycle event emission for Go-originated automation flows.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT INTERFACES                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │   Web UI (Browser)          │  │   CLI Tools                     │   │
│  │   Vite + React 19           │  │   Go Native Binaries            │   │
│  │   http://localhost:8080     │  │   indexer.exe / create-key.exe  │   │
│  │   shadcn/ui + Tailwind      │  │                                 │   │
│  └──────────────┬──────────────┘  └───────────────┬─────────────────┘   │
│                 │                                 │                      │
│                 └─────────────┬───────────────────┘                      │
│                               │                                          │
│                    ┌──────────▼──────────┐                               │
│                    │  Shared API Client  │                               │
│                    │  lib/jules/client   │                               │
│                    └──────────┬──────────┘                               │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │ HTTP + WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Go :8080)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ backend-go/main.go                                                  ││
│  │  REST API:                                                          ││
│  │  • GET/POST /api/daemon/status                                      ││
│  │  • GET /api/sessions/*                                              ││
│  │  • POST /api/sessions/:idAndAction                                  ││
│  │  • GET/POST /api/keys                                               ││
│  │  WebSocket:                                                         ││
│  │  • ws://localhost:8080/ws (real-time session updates)               ││
│  │  Static Serving:                                                    ││
│  │  • GET /* (serves dist/ built by Vite)                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ backend-go/services/daemon.go & scheduler.go                        ││
│  │  • Monitors Jules sessions via jules.googleapis.com                 ││
│  │  • Auto-nudges stalled agents                                       ││
│  │  • Auto-approves safe plans                                         ││
│  │  • Runs multi-agent debates for risky decisions                     ││
│  │  • Scheduled codebase indexing (RAG) and issue polling              ││
│  │  • Emits events to WebSocket subscribers                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Persistence (SQLite via GORM)                                       ││
│  │  • KeeperSettings / ApiKey / Workspace                              ││
│  │  • KeeperLog - action logs with timestamps                          ││
│  │  • CodeChunk / MemoryChunk - RAG vector storage                     ││
│  │  • QueueJob - background processing persistence                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS
                                ▼
                    ┌───────────────────────┐
                    │ jules.googleapis.com  │
                    │ (Google Jules API)    │
                    └───────────────────────┘
```

---

## Directory Structure

```
jules-autopilot/
├── backend-go/                 # Go Primary Runtime
│   ├── api/                    # Fiber REST/WS Routes
│   ├── cmd/                    # Standalone CLI tools (indexer, create-key)
│   ├── db/                     # GORM SQLite initialization
│   ├── models/                 # Database schema models
│   ├── services/               # Core business logic (Daemon, Queue, RAG, LLMs)
│   └── main.go                 # Entrypoint
├── components/                 # React UI Components
├── lib/                        # Frontend Utilities & API Clients
├── src/                        # React Application Entry
├── packages/
│   └── shared/                 # Shared TypeScript types for UI
├── dev.db                      # SQLite Database
├── dist/                       # Vite build output (served by Go)
└── package.json                # Frontend/Workspace configuration
```

---

## Key Architectural Decisions

### 1. Shared API Client

Both Web UI and TUI consume the same Hono backend through a shared API client:

```typescript
// packages/api-client/src/client.ts
import { hc } from 'hono/client';
import type { AppType } from '@jules/server';

export function createApiClient(baseUrl = 'http://localhost:8080') {
  return hc<AppType>(baseUrl);
}

// Usage in Web UI
const client = createApiClient();
const status = await client.api.daemon.status.$get();

// Usage in TUI (same API!)
const client = createApiClient();
const sessions = await client.api.sessions.$get();
```

### 2. WebSocket for Real-Time Updates

Replace polling (5s/10s/30s intervals) with WebSocket for instant updates:

```typescript
// packages/api-client/src/websocket.ts
export function createWebSocketClient(url = 'ws://localhost:8080/ws') {
  const ws = new WebSocket(url);
  
  return {
    subscribe: (event: EventType, handler: (data: any) => void) => {
      ws.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === event) handler(msg.data);
      });
    },
    close: () => ws.close()
  };
}

// Event types
export type EventType = 
  | 'session:updated'
  | 'session:nudged'
  | 'session:approved'
  | 'log:added'
  | 'daemon:status';
```

### 3. TUI Screen Architecture

State-based routing with keyboard navigation (Ink pattern):

```typescript
// apps/cli/src/app.tsx
import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Dashboard } from './screens/Dashboard.js';
import { SessionList } from './screens/SessionList.js';
import { Logs } from './screens/Logs.js';
import { Settings } from './screens/Settings.js';

type Screen = 'dashboard' | 'sessions' | 'logs' | 'settings';

export default function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('dashboard');

  useInput((input, key) => {
    if (input === 'q') exit();
    if (input === '1') setScreen('dashboard');
    if (input === '2') setScreen('sessions');
    if (input === '3') setScreen('logs');
    if (input === '4') setScreen('settings');
    if (key.escape) setScreen('dashboard');
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Text bold>Jules Autopilot</Text>
        <Text dimColor> | [1]Dashboard [2]Sessions [3]Logs [4]Settings [Q]Quit</Text>
      </Box>
      
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'sessions' && <SessionList onSelect={(id) => {/* drill down */}} />}
      {screen === 'logs' && <Logs />}
      {screen === 'settings' && <Settings />}
    </Box>
  );
}
```

### 4. Bun Compatibility Note

Ink has known stdin issues with Bun. Use Node.js for the TUI:

```json
// apps/cli/package.json
{
  "name": "@jules/cli",
  "bin": {
    "jules": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node ./dist/cli.js",
    "dev": "tsc --watch"
  },
  "engines": {
    "node": ">=20"
  }
}
```

---

## Real-Time Update Strategy

### Current: Polling
- ActivityFeed: 5s interval
- SessionList: 10s interval  
- SessionKeeperManager: 30s interval

### Target: WebSocket + Event Bus

```typescript
// server/routes/websocket.ts
import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';

const { upgradeWebSocket, websocket } = createBunWebSocket();

const clients = new Set<WebSocket>();

export const wsRouter = new Hono()
  .get('/ws', upgradeWebSocket((c) => ({
    onOpen(event, ws) {
      clients.add(ws.raw);
    },
    onClose(event, ws) {
      clients.delete(ws.raw);
    }
  })));

export function broadcast(event: string, data: any) {
  const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Usage in daemon.ts
import { broadcast } from './routes/websocket';

await addLog('Nudge sent', 'action', sessionId);
broadcast('log:added', { message: 'Nudge sent', type: 'action', sessionId });
broadcast('session:nudged', { sessionId });
```

---

## Migration Path

### Phase 1: Shared Types (Current Sprint)
1. Create `packages/shared-types/` with Zod schemas
2. Export types for Session, Activity, DaemonStatus, Log
3. Import into both server and web app

### Phase 2: API Client Package
1. Create `packages/api-client/`
2. Use `hono/client` for type-safe RPC
3. Migrate web app from raw fetch to shared client

### Phase 3: WebSocket Integration
1. Add WebSocket support to Hono server
2. Create event bus for daemon → clients
3. Update web app to use WebSocket for real-time
4. Remove polling intervals

### Phase 4: TUI Implementation
1. Create `apps/cli/` with Ink
2. Implement core screens (Dashboard, Sessions, Logs)
3. Add to package.json bin entry
4. Test with Node.js runtime

### Phase 5: Monorepo Setup
1. Add pnpm-workspace.yaml
2. Configure TypeScript path aliases
3. Set up shared build tooling

---

## Feature Mapping (Vision → Implementation)

| Feature | Web UI | TUI | Backend |
|---------|--------|-----|---------|
| Session List | ✅ SessionList.tsx | 📋 SessionList screen | GET /api/sessions |
| Session Monitor | ✅ ActivityFeed.tsx | 📋 SessionDetail screen | WebSocket events |
| Interrupt All | ✅ Button in header | 📋 `i` key binding | POST /api/sessions/interrupt-all |
| Continue All | ✅ Button in header | 📋 `c` key binding | POST /api/sessions/continue-all |
| Autopilot Toggle | ✅ Settings dialog | 📋 Settings screen | POST /api/daemon/start\|stop |
| Logs | ✅ LogPanel.tsx | 📋 Logs screen (scrollable) | GET /api/logs, WebSocket |
| Broadcast | ✅ BroadcastDialog.tsx | 📋 `b` key → prompt | POST /api/broadcast |
| Debate | ✅ DebateDialog.tsx | 📋 View-only (complex) | POST /api/supervisor |
| Terminal | ✅ TerminalPanel.tsx | N/A (already in terminal) | terminal-server |
| Kanban | ✅ KanbanBoard.tsx | 📋 Simplified columns | GET /api/sessions |

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Web UI** | Next.js 16, React 19, Tailwind, shadcn/ui | Existing |
| **TUI** | Ink 5, React 19 | NEW - runs on Node.js |
| **Backend** | Bun, Hono 4, WebSocket | Existing server/, add WS |
| **Database** | SQLite, Prisma 5 | Existing |
| **State (Web)** | Zustand 5 | Existing |
| **State (TUI)** | React useState + useInput | Ink hooks |
| **Real-time** | WebSocket, Event Bus | NEW - replace polling |
| **Types** | TypeScript 5, Zod | Shared packages |

---

## References

- **Wave Terminal**: Go backend + React + Electron, event bus pattern
- **Kubernetes**: Dashboard (web) + kubectl (CLI) sharing API server
- **Ink Documentation**: State-based routing, useInput, useFocus
- **Hono Documentation**: Route modules, hono/client, WebSocket support
