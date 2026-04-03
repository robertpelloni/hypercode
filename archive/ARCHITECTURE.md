# Hypercode Architecture

## Purpose

Hypercode is a **local AI control plane** for orchestrating providers, MCP servers, external CLI sessions, agents, memory, and operator workflows.

The design goal is not to clone every external tool. The design goal is to coordinate them reliably through a small number of durable kernel subsystems.

## Kernel subsystems

### MCP Router / Aggregator

**Primary path:** `packages/core/mcp/`

Responsibilities:
- aggregate multiple MCP servers into a single Hypercode endpoint
- namespace servers and tools
- track health, latency, and lifecycle
- expose traffic inspection data to operator surfaces
- isolate failures so one server crash does not collapse the whole router

### Provider Router / Fallback Engine

**Primary path:** `packages/core/providers/`

Responsibilities:
- maintain provider registry and capability metadata
- manage auth state
- track quota and rate-limit state where possible
- classify failures
- route requests by strategy
- fail over to the next eligible provider/model when needed

### Session Supervisor

**Primary path:** `packages/core/supervisor/`

Responsibilities:
- spawn external CLI tools in isolated processes
- bind sessions to repos or worktrees
- capture status, logs, and health information
- auto-restart sessions with bounded retry policies
- prevent a supervised child crash from destabilizing the control plane

### Operator Dashboard

**Primary path:** `apps/web/`

Responsibilities:
- provide real operator visibility into system state
- expose session lifecycle controls
- surface MCP topology and traffic
- show provider health, quotas, and fallback events
- expose memory/context views that reflect real backend state

### Memory / Context Interface Layer

**Primary paths:** `packages/core/memory/` and connected services

Responsibilities:
- provide storage and retrieval interfaces
- support session summaries and compacted artifacts
- remain backend-agnostic where practical
- expose only implemented memory capabilities to the UI

## Runtime model

### Control plane

The control plane should remain primarily in **TypeScript / Node.js** for the near term.

It coordinates:
- API routing
- provider execution and fallback
- session supervision
- MCP aggregation
- event emission
- dashboard-facing queries and mutations

### Process isolation

External tools should run as isolated child processes where practical.

Rules:
- one external CLI session should not be able to crash the web dashboard
- one failing MCP server should not poison unrelated servers
- restart behavior must use bounded backoff and visible status transitions
- logs and failure states should be inspectable by operators

### Persistence and messaging

Depending on subsystem needs, Hypercode may use:
- **filesystem** for logs, artifacts, exports, and session snapshots
- **Redis** for events, pub/sub, or transient coordination
- **Postgres / SQLite** for durable operational state

The exact backend may vary by deployment, but the architecture should preserve clear boundaries between:
- transient runtime state
- durable metadata
- operator-visible history

## Capability contract model

Hypercode should define internal capabilities instead of chasing whole-tool parity.

Representative capability families:
- `provider.auth`
- `provider.execute`
- `provider.fallback`
- `provider.quota.read`
- `session.start`
- `session.stop`
- `session.restart`
- `session.attach`
- `worktree.isolate`
- `mcp.server.register`
- `mcp.server.health`
- `mcp.tool.search`
- `mcp.tool.invoke`
- `mcp.traffic.inspect`
- `memory.store`
- `memory.retrieve`
- `agent.spawn`
- `agent.debate`

Adapters should map external tools into these capability contracts.

## Dashboard philosophy

The dashboard is an **operations console**, not a speculative feature catalog.

Primary operator workflows:
- inspect system status
- start and supervise sessions
- inspect MCP servers and tools
- observe provider routing and fallback
- review memory/context state that actually exists

If the backend does not emit it reliably, the dashboard should not pretend it does.

## Hypercode 1.0 focus

Hypercode 1.0 should stay tightly focused on:
1. MCP aggregation
2. provider fallback
3. session supervision
4. operator dashboard workflows

Additional expansion should come only after these flows are reliable, test-covered, and installable by external users.
