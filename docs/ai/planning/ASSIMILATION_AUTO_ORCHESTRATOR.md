# Planning: Assimilation of OpenCode Autopilot (Borg Auto-Orchestrator)

## 🌌 Overview
This document outlines the plan to assimilate `github.com/robertpelloni/opencode-autopilot` into the Borg monorepo as a first-class orchestration layer. The assimilated project will be renamed to **Borg Auto-Orchestrator** and will provide multi-model council supervision for autonomous agent workflows.

## 🏗️ Target Architecture

### Package Information
- **Name**: `@borg/auto-orchestrator`
- **Location**: `packages/auto-orchestrator`
- **Primary Runtime**: Node.js 22 (migrating from Bun)
- **Framework**: Express/tRPC integration (migrating from Hono)

### Core Components to Migrate
1. **Council Service**: Orchestrates debates between multiple LLM supervisors.
2. **Supervisor Adapters**: Pluggable adapters for OpenAI, Anthropic, Gemini, etc. (to be aligned with `@borg/core` providers).
3. **Consensus Engine**: Implements majority, weighted, and CEO-override voting models.
4. **Debate History**: Persistence layer for council decisions (using Borg's SQLite/Drizzle).
5. **Guidance Delivery**: System for injecting council decisions back into agent sessions.

## 🔄 Integration Strategy

### 1. Low-Level Substrate Alignment
The Auto-Orchestrator will consume `@borg/core` for:
- Database access (Drizzle schema).
- Tool discovery (MCP Aggregator).
- Process supervision (Session Supervisor).
- Provider authentication (Provider Truth).

### 2. Dashboard Integration
A new "Council" section will be added to `@borg/web` (`apps/web`):
- `/dashboard/council`: Overview of active council debates.
- `/dashboard/council/history`: Audit trail of past decisions.
- `/dashboard/council/config`: Configuration for supervisor weights and consensus modes.

### 3. API & Communication
- Endpoints currently in `opencode-autopilot` (Hono) will be migrated to tRPC procedures in `@borg/core` or a new router in the orchestrator package.
- Real-time updates will continue using WebSockets, likely unified under the main Borg socket.

## 🚀 Phases

### Phase 1: Preparation (Active)
- [x] Analyze source repository (`opencode-autopilot`).
- [ ] Define `@borg/auto-orchestrator` package structure.
- [ ] Update `pnpm-workspace.yaml`.

### Phase 2: Foundation & Skeleton
- [ ] Initialize `packages/auto-orchestrator`.
- [ ] Port shared types to `@borg/types` or a local `shared` module.
- [ ] Setup build pipeline via Turborepo.

### Phase 3: Core Logic Migration
- [ ] Port `CouncilService` and `ConsensusEngine`.
- [ ] Re-implement Supervisor adapters to use Borg's common provider logic.
- [ ] Integrate with Borg's SQLite database.

### Phase 4: Interface & Wiring
- [ ] Expose council triggers as MCP tools in `@borg/core`.
- [ ] Add Council Dashboard pages to `apps/web`.
- [ ] Implement Ink-based CLI if standalone usage is required (under `packages/cli`).

## 🛡️ Principles
- **Truthfulness**: Council debates must be transparent and cite evidence from the session context.
- **Isolation**: Debates should happen in isolated contexts to prevent state leakage.
- **Consistency**: Use the same coding standards, linting, and formatting as the rest of Borg.
