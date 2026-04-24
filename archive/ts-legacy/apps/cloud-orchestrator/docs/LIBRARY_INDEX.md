# Universal Library & Function Index

*Generated: 2026-03-25*  
*Version: 0.9.9*

---

## Table of Contents

- [Project Architecture & Directory Layout](#project-architecture--directory-layout)
- [Key Libraries & Tech Stack](#key-libraries--tech-stack)
- [Submodules](#submodules)

---

## Project Architecture & Directory Layout

The Jules Autopilot project is designed with a "Lean Core" philosophy, centralizing the intelligence into shared packages while maintaining a strict boundary between the UI and the background daemon.

### Directory Structure:
*   `app/` - The Next.js 15 App Router frontend. Contains page routes and global layouts.
*   `components/` - React components, primarily utilizing ShadCN UI and TailwindCSS v4.
    *   `ui/` - Foundational, reusable UI elements (buttons, dialogs, inputs).
    *   `layout/` - Structural components like `AppSidebar` and `AppLayout`.
*   `lib/` - Frontend utilities, Zustand stores (`stores/session-keeper.ts`), API clients (`jules/client.ts`), and React hooks (`hooks/use-daemon-events.ts`).
*   `packages/shared/` - The absolute core of the application's intelligence. Contains all universal types, the `Supervisor` logic, and the `Debate` engine. This is compiled into both the frontend and the backend.
*   `server/` - The Bun-based daemon.
    *   `index.ts` - Hono REST API and WebSocket server.
    *   `queue.ts` - The SQLite-backed background task queue.
    *   `daemon.ts` - The background polling loop.
    *   `rag.ts` - The semantic search and vectorization engine.
    *   `webhooks.ts` - The HyperCode Event Gateway.
*   `prisma/` - Database schema and migrations.
*   `docs/` - Comprehensive documentation (including this file).
*   `.hypercode/` - Directory for HyperCode meta-orchestrator state assimilation.

---

## Key Libraries & Tech Stack

| Library | Status | Description |
|---------|--------|-------------|
| **Next.js 15** | **Active** | Core frontend framework utilizing App Router. |
| **Bun** | **Active** | High-performance JS runtime powering the backend daemon and server. |
| **Hono** | **Active** | Ultra-fast routing framework used for the backend REST API (`server/index.ts`). |
| **Prisma (SQLite)** | **Active** | Database ORM. Manages sessions, queue jobs, logs, and RAG vector chunks. |
| **Zustand** | **Active** | State management library. Powers `useSessionKeeperStore` for global frontend state sync. |
| **Framer Motion** | **Active** | Used for micro-interactions and smooth UI transitions. |
| **@tanstack/react-virtual** | **Active** | Essential for rendering massive session chat histories without lagging the DOM. |
| **Lucide React** | **Active** | Primary iconography library. |
| **React Markdown** | **Active** | Renders agent responses and code blocks with `remark-gfm` for tables. |

---

## Submodules

### Jules Integration & Orchestration

#### 1. **antigravity-jules-orchestration**
*(https://github.com/Scarmonit/antigravity-jules-orchestration)*
- **Status:** Integrated internally via shared concepts.

#### 2. **gemini-cli-jules**
*(https://github.com/gemini-cli-extensions/jules)*
- **Status:** Integrated internally via shared concepts.

### MCP Servers

#### 3. **google-jules-mcp**
*(https://github.com/samihalawa/google-jules-mcp)*
- **Status:** Integrated internally via shared concepts.

#### 4. **jules-mcp-server**
*(https://github.com/CodeAgentBridge/jules-mcp-server)*
- **Status:** Integrated internally via shared concepts.

### GitHub Integration

#### 5. **jules-action**
*(https://github.com/google-labs-code/jules-action)*
- **Status:** Integrated internally via shared concepts.

#### 6. **jules-task-queue**
*(https://github.com/iHildy/jules-task-queue)*
- **Status:** Subsumed and highly enhanced by our native `server/queue.ts` SQLite engine.

### Documentation & Prompts

#### 7. **jules-awesome-list**
*(https://github.com/google-labs-code/jules-awesome-list)*
- **Status:** Concepts assimilated into `UNIVERSAL_LLM_INSTRUCTIONS.md` and system prompts.
