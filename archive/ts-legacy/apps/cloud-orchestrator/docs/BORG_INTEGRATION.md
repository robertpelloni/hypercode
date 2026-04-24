# HyperCode Integration Contract

This document outlines how the **Jules Autopilot** acts as a sub-component within the larger **HyperCode** ecosystem.

## Architecture Role
Jules Autopilot is the **Cloud Session Orchestrator**. 
While HyperCode manages local tasks, file manipulation, and high-level reasoning across multiple repositories, Jules Autopilot is solely responsible for spinning up, monitoring, and steering parallel cloud coding instances (like Google Jules) via its REST API.

## Integration Seams

### 1. The Local API (`http://localhost:8080/api`)
HyperCode instances can issue commands to the Jules Autopilot daemon via its local Hono API.

*   `GET /api/manifest`: **[NEW v0.9.7]** Official node discovery endpoint. Returns version, capabilities, and endpoint map.
*   `GET /api/sessions`: Returns all currently active cloud sessions and their raw states.
*   `GET /api/sessions/:id/replay`: **[NEW v0.9.7]** Returns a structured, audit-ready timeline of every agent thought and user interaction.
*   `POST /api/sessions`: Create a new cloud session for a specific repo and branch.
*   `POST /api/sessions/:id/sendMessage`: Send an instruction to a specific session.
*   `POST /api/sessions/:id/approvePlan`: Force-approve a pending implementation plan.
*   `POST /api/rag/query`: Semantically search the entire codebase. Accepts `{ "query": "string", "topK": number }`. 
*   `POST /api/rag/reindex`: Manually trigger a background codebase vectorization job.
*   `GET /api/system/submodules`: **[NEW v0.9.12]** Official submodule intelligence endpoint. Returns real-time commit hashes and sync status for the entire plugin architecture.

### 2. The Autopilot Daemon (`server/queue.ts`)
HyperCode does **not** need to manually poll sessions. The Autopilot daemon runs continuously in the background and implements the **Council Supervisor**:
*   **Autonomous Plan Evaluation**: Automatically intercepts `AWAITING_PLAN_APPROVAL` states, scores the risk, and auto-approves if safe.
*   **Cognitive Nudging**: Generates context-aware LLM nudges when cloud instances stall.

HyperCode can simply inject tasks into the queue or read the SQLite database (`prisma/dev.db`) directly to see event histories.

### 3. Shared Intelligence (`@jules/shared`)
HyperCode agents should utilize the `@jules/shared/orchestration` package to run Multi-Agent Debates (`debate.ts`) and evaluate risk (`supervisor.ts`) before executing destructive local actions. The models and logic have been normalized so both HyperCode and Jules use the exact same evaluation criteria.

## Handoff State
The `.hypercode` folder tracks active assimilation state. When launching HyperCode in this repository, it should read `HANDOFF.md` to understand the current capabilities of the fleet.