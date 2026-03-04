# Borg Project Roadmap

**Current Version**: 2.7.51
**Last Stable Phase**: 91
**Codename**: AIOS (AI Operating System)

---

# MASTER TODO - Borg (v2.7.44)
> Final Completion Checklist (Phase 91: Swarm Agent Tool Execution)

## Phase 1-59: Foundations & Core OS (Completed)

... (Consolidated history)

## Phase 60-80: The Hive Mind (Completed)

- [x] **Phases 60-78: Capability Discovery, Redis Mesh, P2P Routing**
- [x] **Phase 79: Swarm Event Visualization Engine (2026-02-28)**
- [x] **Phase 80: Swarm Mission Persistence & Capabilities (2026-02-28)**

## Phase 81-90: Swarm Resilience & Evolution (Current)

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

## Phase 91-100: Swarm Tooling & Federation (Planning)

- [x] **Phase 91: Swarm Agent Tool Execution (MCP)**
    - [x] Equip Swarm Agents with the ability to call MCP tools during task execution to interact with the external world (files, APIs, web).
    - [x] Swarm Dashboard allows user to attach allowed tools to a Swarm Session.
- [ ] **Phase 92: P2P Multi-Node Worker Dispatch**
    - [ ] Disperse compute by delegating task execution horizontally to connected nodes on the local `mesh`.
    - [ ] Mesh node auto-discovery and capability advertisement.
