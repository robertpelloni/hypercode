# Hypercode-Maestro Handoff Protocol

This document defines the unified JSON handoff protocol used by Maestro after its assimilation into the Hypercode ecosystem.

## Overview

Maestro uses the Hypercode JSON handoff protocol as its primary source of truth for orchestration state. This replaces the legacy Markdown-based `active-session.md` system. The state is managed by a **Live Hypercode Core** control plane, with local mirroring in the `.hypercode/handoffs/` directory.

## Schema Definition (v1)

The protocol uses an extended Hypercode schema, incorporating a `maestro` namespace for orchestration-specific metadata.

### 1. Root Structure

```json
{
  "version": "Hypercode-Maestro-v1",
  "timestamp": 1711234567890,
  "sessionId": "uuid-string",
  "stats": { ... },
  "recentContext": [ ... ],
  "notes": "Optional human-readable notes",
  "maestro": { ... }
}
```

### 2. Stats Object

Tracking usage and activity across the session.

- `totalCount`: Total message count.
- `observationCount`: Number of tool outputs or environment observations.
- `agent`: Number of agent execution cycles.
- `decision`: Number of significant architectural or strategy decisions recorded.

### 3. Recent Context

An array of the most recent observations and interactions.

```json
{
	"content": "The full text content of the context item",
	"metadata": {
		"source": "agent-name",
		"tags": ["agent-response", "error", "observation"],
		"preview": "Short summary for UI display"
	}
}
```

### 4. Maestro Metadata Namespace

Orchestration-specific fields managed by the Maestro TechLead.

- `sessionId`: The original Maestro session identifier.
- `workflowMode`: `standard` or `express`.
- `status`: `in_progress`, `completed`, or `failed`.
- `currentPhase`: The ID of the currently executing phase.
- `totalPhases`: Total number of phases in the implementation plan.

## API Integration

### Base URL

Defaults to `http://localhost:3000` (configurable via `HYPERCODE_CORE_URL`).

### Endpoints

- `POST /v1/sessions`: Initialize a new session.
- `GET /v1/handoffs/:sessionId`: Retrieve the latest state.
- `PUT /v1/handoffs/:sessionId`: Commit a new handoff (requires timestamp for OCC).
- `POST /v1/sessions/:sessionId/archive`: Archive the session.
- `GET /v1/health`: Connectivity check.

## Local Mirroring

For performance, the `LocalCacheManager` maintains a copy of the latest handoff in `.hypercode/handoffs/latest.json`. Maestro CLI commands (like `/maestro:status`) read directly from this mirror to ensure instantaneous response times.
