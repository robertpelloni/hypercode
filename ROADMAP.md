# Borg Project Roadmap

**Current Version**: 2.7.80
**Last Stable Phase**: 119
**Codename**: AIOS (AI Operating System)

---

# MASTER TODO - Borg (v2.7.80)
> Final Completion Checklist (Phase 91: Swarm Agent Tool Execution)

## Phase 1-59: Foundations & Core OS (Completed)

... (Consolidated history)

## Phase 60-80: The Hive Mind (Completed)

- [x] **Phases 60-78: Capability Discovery, Redis Mesh, P2P Routing**
- [x] **Phase 79: Swarm Event Visualization Engine (2026-02-28)**
- [x] **Phase 80: Swarm Mission Persistence & Capabilities (2026-02-28)**

## Phase 81-90: Swarm Resilience & Evolution (Completed)

- [x] **Phase 81: Swarm Task Recovery & Manual Intervention (2026-02-28)**
- [x] **Phase 82: Recursive Swarm Decomposition (2026-02-28)**
- [x] **Phase 83: Swarm Self-Correction (2026-02-28)**
    - [x] Automatic retry logic in `SwarmOrchestrator`
    - [x] Exponential backoff for mesh task re-broadcasts
    - [x] Integration with `HealerService` for max-retry failures
    - [x] Dashboard visualization for retries and healing status
- [x] **Phase 84: Priority-Based Task Scheduling**
    - [x] Mission-level priority queues
- [x] **Phase 85: Swarm Resource Awareness**
    - [x] Memory/Token tracking from mesh
- [x] **Phase 86: Swarm Adaptive Rate Limiting**
    - [x] Token bucket RPM/TPM control
- [x] **Phase 87: Swarm Inter-Agent Communication**
    - [x] Point-to-point mesh payload delivery
- [x] **Phase 88: Swarm Consensus Voting (v2)**
    - [x] Multi-agent verification of task results before completion
    - [x] Slashing/Reporting logic for "malicious" agents
- [x] **Phase 89: Swarm Dynamic Resource Allocation**
    - [x] Throttling or expanding maxConcurrency dynamically based on task priority compared to other active tasks in the orchestration pool.
- [x] **Phase 90: Swarm Shared Context (Stateful Missions)**



    - [x] Add a `ContextFlow` memory object to `SwarmMission` that tasks can read from and write to.
    - [x] Allow downstream tasks to inject outputs of previous tasks into their prompts automatically.

## Phase 91-100: Swarm Tooling & Federation (In Progress)

- [x] **Phase 91: Swarm Agent Tool Execution (MCP)**
    - [x] Equip Swarm Agents with the ability to call MCP tools during task execution to interact with the external world (files, APIs, web).
    - [x] Swarm Dashboard allows user to attach allowed tools to a Swarm Session.
- [x] **Phase 92: P2P Multi-Node Worker Dispatch**
    - [x] Disperse compute by delegating task execution horizontally to connected nodes on the local `mesh`.
    - [x] Mesh node auto-discovery and capability advertisement.
- [x] **Phase 93: P2P Artifact Federation**
    - [x] Allow downstream mesh nodes to share files by broadcasting `read_file` results directly through the mesh bus.
- [x] **Phase 94: Sub-Agent Task Routing**
    - [x] Deploy specialized agents to execute sub-tasks without full node delegation.
- [x] **Phase 95: Swarm Git Worktree Isolation**
    - [x] Each coding task gets an isolated git worktree so parallel agents don't conflict on files.
    - [x] Worktrees are automatically cleaned up after task completion.
- [x] **Phase 96: Swarm Tool Permission Boundaries**
    - [x] Enforce mission-level allow/deny tool policies per delegated task.
    - [x] Expose denied-tool rationale in swarm telemetry and mission audit trail.
- [x] **Phase 97: Swarm Tool Policy Normalization & Contract Feedback**
    - [x] Normalize tool policies with deterministic deny-overrides-allow behavior.
    - [x] Return effective policy and warnings at mission start.
- [x] **Phase 98: Swarm Dashboard Policy & Denial Telemetry Representation**
    - [x] Expose tool policy controls and effective policy feedback in UI.
    - [x] Surface denied-tool telemetry on mission task cards.
- [x] **Phase 99: Persistent Mission Policy Context & UI Summary**
    - [x] Persist effective policy and warnings in mission context.
    - [x] Surface mission policy summary from persisted context in missions UI.
- [x] **Phase 100: Swarm Denied-Event Governance Filter & Aggregation UI**
    - [x] Show mission-level denied event counts for quick risk scanning.
    - [x] Add denied-only task filter mode in Missions view.
- [x] **Phase 101: Swarm Mission Risk Summary API & Dashboard Strip**
    - [x] Provide backend risk summary aggregation for denied-tool governance.
    - [x] Surface risk summary metrics in Missions view.
- [x] **Phase 102: Swarm Governance Severity & Top Denied Tools Analytics**
    - [x] Add severity scoring and top denied tools aggregation in API.
    - [x] Render severity meter and top denied-tool chips in Missions UI.
- [x] **Phase 103: Swarm Mission Risk Trend & Status Analytics**
    - [x] Add status breakdown and last-24-hour denied event analytics in API.
    - [x] Render status breakdown and denied-event 24h trend in Missions UI.
- [x] **Phase 104: Mission Risk Triage Ordering & Filtering UX**
    - [x] Add mission status filter and risk-first ordering controls in Missions UI.
    - [x] Surface per-mission risk score and last-24h denied-event indicator badges for triage.
- [x] **Phase 105: Server-Backed Mission Risk Rows for Governance Triage**
    - [x] Add backend mission risk rows API with status filtering and risk/recent sorting.
    - [x] Consume mission risk rows API in Missions UI for authoritative triage ordering.
- [x] **Phase 106: High-Risk Mission Focus Filter (Server-Enforced)**
    - [x] Add optional minimum-risk filtering in mission risk rows API.
    - [x] Add Missions toggle for high-risk-only triage using server query parameters.
- [x] **Phase 107: Configurable High-Risk Threshold Control (Server-Driven)**
    - [x] Add operator-configurable high-risk threshold controls in Missions UI.
    - [x] Keep threshold filtering server-driven through mission risk rows API query parameters.
- [x] **Phase 108: Filter-Scoped Risk Facets Analytics**
    - [x] Add backend risk facets endpoint scoped by active mission governance filters.
    - [x] Render filtered risk facets card in Missions UI for aggregate triage context.
- [x] **Phase 109: Normalized Risk Band Percentages & Dominant Band Signal**
    - [x] Add normalized risk-band percentage outputs in risk facets API.
    - [x] Add dominant-band signal and percentage rendering in Missions facets UI.
- [x] **Phase 110: Filter-Scoped Denied-Event Momentum Signals**
    - [x] Add previous-window denied-event aggregates and trend signals to risk facets API.
    - [x] Render denied-event momentum context in Missions filtered risk facets card.
- [x] **Phase 111: Filter-Scoped Risk Status Distribution Facets**
    - [x] Add status-distribution counts and percentages to risk facets API.
    - [x] Render filter-scoped status distribution in Missions facets card.
- [x] **Phase 112: Filter-Scoped Facet Freshness Signals**
    - [x] Add freshness metadata to risk facets API output.
    - [x] Render facet freshness signals in Missions filtered facets card.
- [x] **Phase 113: Filter-Scoped Facets Health Signal**
    - [x] Add health severity/score/reasons to risk facets API.
    - [x] Render facets health panel in Missions with diagnostic reasons.
- [x] **Phase 114: Filter-Scoped Health Recommended Action Signal**
    - [x] Add recommended action guidance to facets health API contract.
    - [x] Render recommended health action in Missions filtered facets panel.
- [x] **Phase 115: Filter-Scoped Health Confidence Signal**
    - [x] Add confidence score/level output to facets health API contract.
    - [x] Render confidence signal in Missions filtered facets health panel.
- [x] **Phase 116: Filter-Scoped Health Confidence Drivers**
    - [x] Add confidence driver explanations to facets health API contract.
    - [x] Render confidence drivers in Missions filtered facets health panel.
- [x] **Phase 117: Filter-Scoped Health Confidence Components**
    - [x] Add confidence penalty component breakdown to facets health API contract.
    - [x] Render confidence component breakdown in Missions filtered facets health panel.
- [x] **Phase 118: Filter-Scoped Health Confidence Inputs**
    - [x] Add confidence input provenance fields to facets health API contract.
    - [x] Render confidence input provenance in Missions filtered facets health panel.
- [x] **Phase 119: Filter-Scoped Health Confidence Uncertainty Signals**
    - [x] Add confidence uncertainty margin and score-range outputs to facets health API contract.
    - [x] Render confidence uncertainty indicators in Missions filtered facets health panel.
