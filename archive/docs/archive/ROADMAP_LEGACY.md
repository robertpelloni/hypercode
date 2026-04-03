# Hypercode Project Roadmap

**Current Version**: 2.7.108
**Last Stable Phase**: 146
**Codename**: Hypercode Neural OS

---

# MASTER TODO - Hypercode (v2.7.103)
> Final Completion Checklist (Phase 91: Swarm Agent Tool Execution)

- [x] **Phase 127: Extension Surface Cross-Intelligence**
    - [x] Persist captured browser-extension page context directly into core memory through a dedicated compatibility endpoint.
    - [x] Surface browser console logs and captured-page activity in the dashboard Traffic Inspector via shared WebSocket events.

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
- [x] **Phase 95.1: Docs/Ops Sync**
- [x] **Phase 96: Agentic Execution Telemetry (Replaced simulated endpoints)**
    - [x] Replace simulated sub-agent tools with real `use_agent` MCP endpoints in SystemWorkflows.
    - [x] Plumb LLM model/provider telemetry traces through DeepResearchService, CoderAgent, and SubAgents.
- [x] **Phase 97: External Link Ingestion Telemetry (Incremental fetch queue + Dashboard UI)**
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
- [x] **Phase 120: Filter-Scoped Health Confidence Stability Signal**
    - [x] Add confidence stability output to facets health API contract.
    - [x] Render confidence stability indicator in Missions filtered facets health panel.
- [x] **Phase 121: Filter-Scoped Health Confidence Guidance Signal**
    - [x] Add confidence guidance output to facets health API contract.
    - [x] Render confidence guidance in Missions filtered facets health panel.
- [x] **Phase 122: Filter-Scoped Health Confidence Alert Signals**
    - [x] Add confidence alert outputs to facets health API contract.
    - [x] Render confidence alerts in Missions filtered facets health panel.
- [x] **Phase 123: Filter-Scoped Health Confidence Alert Level Signal**
    - [x] Add confidence alert-level output to facets health API contract.
    - [x] Render confidence alert-level indicator in Missions filtered facets health panel.

- [x] **Phase 124: Filter-Scoped Health Confidence Alert Aggregation**
    - [x] Add confidence alert aggregation outputs to facets health API contract.
    - [x] Render confidence alert aggregation indicators in Missions filtered facets health panel.

## Phase 125-130: Advanced Threat Emulation & Cross-Surface Extensions

- [x] **Phase 125: Adversarial "Red Team" Debate Agent**
    - [x] Introduce a specialized debate persona configured with adversarial prompts to intentionally critique and stress-test generated mission plans.
    - [x] Update `DebateProtocol` and UI to visually distinguish adversarial critiques during swarm planning phases.
- [x] **Phase 126: Deferred Tool Loading Pipeline**
    - [x] Modify the MCP proxy integration to defer loading complete tool JSON schemas until explicitly requested by sub-agents to reduce token overhead.
    - [x] Expose explicit schema hydration through `get_tool_schema` and surface deferred-schema status in the MCP catalog/dashboard contract.
- [x] **Phase 127: Extension Surface Cross-Intelligence (Parity Milestone 2)**
    - [x] Forward browser and VS Code context capture directly into the Hypercode Core knowledge/memory pipeline.
    - [x] Map console log capture from Extension back into the Web Dashboard Traffic Inspector.
- [x] **Phase 128: VS Code Terminal Content Reading**
    - [x] Capture rolling terminal output in the VS Code extension when the proposed terminal data event is available.
    - [x] Return recent terminal content through the existing `GET_TERMINAL` bridge contract.
- [x] **Phase 129: Browser Extension RAG Ingestion**
    - [x] Add a browser-extension-compatible Core endpoint for direct text-based RAG ingestion.
    - [x] Expose a dedicated popup action to ingest the current page into Hypercode RAG.
- [x] **Phase 130: VS Code Expert Dispatch Commands**
    - [x] Add Core compatibility endpoints for expert dispatch and expert status.
    - [x] Expose command-palette-driven research/code dispatch and status checks in the VS Code extension.
- [x] **Phase 131: VS Code Sidebar Dispatch UI**
    - [x] Add a real activity-bar webview surface for Hypercode dispatch inside VS Code.
    - [x] Surface research, coder, status, and memory-capture actions directly in the sidebar.
- [x] **Phase 133: VS Code Mini Dashboard Parity**
    - [x] Upgrade the VS Code sidebar from dispatch-only UI to a real mini-dashboard with status, recent tasks, and quick actions.
    - [x] Add dashboard deep links and direct tool invocation so manifest-declared commands map to real surfaces or live Core endpoints.
- [x] **Phase 134: Unified Extension WebSocket Protocol Specification**
    - [x] Publish a single reference doc for the currently implemented Hypercode Core, browser extension, and VS Code extension WebSocket message contract.
    - [x] Document compatibility quirks and a recommended normalization path for future transport cleanup.
- [x] **Phase 135: VS Code RAG Ingestion Parity**
    - [x] Expose direct RAG ingestion from the active VS Code selection or file through the existing Core compatibility endpoint.
    - [x] Represent the new ingestion flow in both the command surface and the VS Code mini-dashboard UI.
- [x] **Phase 136: VS Code Live Log Streaming Parity**
    - [x] Mirror VS Code extension activity logs into the same shared inspector stream used by browser telemetry.
    - [x] Surface the event source in the dashboard inspector so extension-originated log packets are easy to distinguish.
- [x] **Phase 137: Browser Dashboard Mirror Surface**
    - [x] Promote the browser mirror from a generic widget into the dedicated browser dashboard page for direct operator access.
    - [x] Make browser screenshot mirroring explicitly discoverable and documented in the parity matrix.
- [x] **Phase 138: Browser User Activity Tracking Parity**
    - [x] Forward browser interaction activity into the shared Core user-activity bridge.
    - [x] Document the browser activity packet shape and mark the browser activity gap as shipped in the parity matrix.
- [x] **Phase 139: VS Code Chat History Bridge Hardening**
    - [x] Replace the placeholder VS Code chat history response with a real interaction-backed buffer.
    - [x] Add best-effort visible chat editor snapshots while keeping the parity matrix honest about remaining limitations versus browser DOM scraping.
- [x] **Phase 140: Extension URL Ingestion Parity**
    - [x] Expose a Core compatibility endpoint for direct URL ingestion so non-dashboard clients can use the existing knowledge ingest flow.
    - [x] Add URL ingestion actions to both the browser extension popup and the VS Code mini-dashboard/command surface.
- [x] **Phase 141: Browser History Search Dashboard Surface**
    - [x] Surface browser history search directly in the dedicated browser dashboard page.
    - [x] Back the UI with a typed browser router procedure that uses the existing browser extension history bridge.
- [x] **Phase 142: Browser Debug & Proxy Fetch Dashboard Surface**
    - [x] Surface browser proxy fetch directly in the dedicated browser dashboard page.
    - [x] Add typed browser router procedures and dashboard controls for Chrome DevTools Protocol attach/detach/command flows.
- [x] **Phase 143: Browser CDP Event Inspector Stream**
    - [x] Rebroadcast browser debugger events through the shared Core WebSocket traffic channel.
    - [x] Surface live CDP events in the dashboard Traffic Inspector with structured payload visibility.
- [x] **Phase 144: Browser Scrape & Screenshot Dashboard Surface**
    - [x] Surface active-page scrape directly in the dedicated browser dashboard page.
    - [x] Surface one-click screenshot capture with inline preview directly in the browser dashboard page.
- [x] **Phase 145: Filterable Traffic Inspector**
    - [x] Add event-type filtering, source filtering, and text search to the dashboard Traffic Inspector.
    - [x] Add visible event counters so operators can triage browser, debugger, knowledge, and tool activity at a glance.
- [x] **Phase 146: Browser Knowledge Activity Dashboard Surface**
    - [x] Surface live browser-originated knowledge capture and RAG ingest events directly in the dedicated browser dashboard.
    - [x] Combine the live event feed with the canonical deep-research ingestion queue summary so recent browser knowledge activity is operator-visible in one place.
