# Architectural Analysis & System Overview

**Version:** 1.0.0
**Date:** 2026-02-09

This document provides a comprehensive technical overview of the Jules UI project, detailing its hybrid architecture, deployment strategy, and key subsystems.

## 1. System Overview

Jules UI is a **monorepo workspace** designed to provide a persistent, self-hosted interface for AI agents. It bridges the gap between ephemeral chat interactions and long-running engineering tasks.

### High-Level Components

*   **Frontend (`app/`)**: A Next.js 16 (App Router) application.
    *   **UI Framework**: React 19, Tailwind CSS v4, shadcn/ui.
    *   **State Management**: Zustand (`lib/stores`) with persistence.
    *   **Data Fetching**: SWR for real-time updates (polling).
    *   **Deployment**: Vercel Serverless Functions or Docker container.

*   **Backend Services**:
    *   **API Routes (`app/api/`)**: Standard Next.js serverless functions for CRUD operations (Sessions, Logs, Settings).
    *   **Session Keeper Daemon (`server/`)**: A dedicated background process responsible for:
        *   Monitoring session health (inactivity detection).
        *   Triggering "Smart Nudges" via LLM Supervisor.
        *   Auto-approving plans.
        *   Orchestrating multi-agent debates ("Council Mode").
    *   **Terminal Server (`terminal-server/`)**: A standalone WebSocket server (`socket.io`, `node-pty`) providing a fully functional web terminal connected to the host machine or a Docker container.

*   **Shared Core (`packages/shared/`)**: A TypeScript workspace package containing business logic shared between the Frontend (Next.js) and the Backend Daemon (Node/Bun).
    *   **Orchestration**: Logic for Debates, Code Reviews, and Summarization.
    *   **Providers**: Unified interface for LLM providers (OpenAI, Anthropic, Gemini, Qwen).
    *   **Types**: Shared TypeScript definitions.

## 2. Deployment Strategy

The project utilizes a dual-runtime strategy to maximize performance locally while ensuring stability on serverless platforms.

### Vercel Serverless (Production)
*   **Runtime**: Node.js.
*   **Challenge**: Vercel's build system does not automatically bundle local source files outside the entry point's root. Relative imports like `../../lib` from `server/` fail at runtime.
*   **Solution**:
    1.  **Shared Package**: Core logic is moved to `@jules/shared`. The root `package.json`'s `postinstall` script runs `pnpm run build:shared`, forcing compilation of this package before the main build.
    2.  **Explicit Imports**: All internal imports within `@jules/shared` use `.js` extensions (e.g., `import ... from './types.js'`) to satisfy Node.js ESM strict resolution.
    3.  **Server Adapter**: `server/index.ts` dynamically imports `@hono/node-server` when running in a non-Bun environment.
    4.  **Static Metadata**: System info (submodules) is generated into a static JSON file (`app/submodules.json`) at build time, avoiding runtime git dependencies.
    5.  **Prisma Resilience**: The `PrismaClient` initialization is wrapped in a `try/catch` with a Proxy fallback to prevent crashes if the binary is missing or the filesystem is read-only.

### Docker / Local (Development)
*   **Runtime**: Bun (optimized for speed) or Node.js.
*   **Daemon**: Runs as a persistent process (`pnpm run daemon`).
*   **Terminal**: Runs as a separate service on port 3002 (or internal container port).

## 3. Data Flow & Orchestration

### The "Session Keeper" Loop
1.  **Polling**: The Frontend polls `/api/daemon/status` to visualize the keeper's state.
2.  **Monitoring**: The Daemon (`server/daemon.ts`) runs a continuous loop checking active sessions via the Jules API.
3.  **Intervention**:
    *   If a session is stale (>10m inactive), the Daemon triggers the **Supervisor**.
    *   The Supervisor (LLM) analyzes the chat history (fetched via Jules Client) and decides on a nudge.
    *   The Daemon posts the nudge to the session using the Jules API.

### Multi-Provider Cloud Dev
*   **Abstraction**: `lib/cloud-dev/providers` defines a common interface (`BaseCloudDevProvider`) for interacting with different AI coding agents (Jules, Devin, Manus).
*   **Mock Mode**: A simulation layer allows users to test the UI flow without active API keys.
*   **Session Transfer**: Logic to migrate session context (files, history) from one provider to another.

## 4. Known Issues & Risks

*   **Analytics Scalability**: Currently, `AnalyticsDashboard` fetches *all* recent session data to the client and computes metrics in the browser. This will become slow with >100 sessions. **Recommendation**: Move aggregation to a server-side API (`/api/analytics`).
*   **WebSocket Limitations**: Vercel Serverless functions do not support persistent WebSockets. The "Session Keeper" real-time logs currently rely on polling or a separate WebSocket server that may not be reachable in a pure Vercel deployment.
*   **Submodule Sync**: The project relies on git submodules for external references. These must be kept in sync manually or via scripts.

## 5. Future Recommendations

1.  **Server-Side Analytics**: Implement a dedicated API endpoint to return pre-calculated stats (churn, activity volume).
2.  **Unified Auth**: Replace local storage API keys with a robust auth solution (NextAuth.js or Clerk) for multi-user support.
3.  **RAG Integration**: Index the `packages/shared` and `lib/` code to give the Supervisor deeper context about available tools.
4.  **Terminal V2**: Explore WebRTC or a custom relay for lower-latency terminal access over restrictive networks.
