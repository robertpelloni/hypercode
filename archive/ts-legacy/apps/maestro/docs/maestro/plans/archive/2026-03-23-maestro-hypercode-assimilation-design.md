# Design Document: Maestro-Hypercode Assimilation

**Date**: 2026-03-23
**Status**: Approved
**Design Depth**: Deep
**Task Complexity**: Complex

## 1. Problem Statement

The Maestro orchestration engine currently operates using a standalone, Markdown-based state management system located in `docs/maestro/`. This creates an architectural silo that prevents deep interoperability with the **Hypercode** ecosystem—a state and context management layer that uses a JSON-based "handoff" protocol.

The goal of this task is the **Full Assimilation** of Maestro into Hypercode. This requires replacing Maestro’s native state management with a unified protocol where the **Hypercode Core Live Control Plane** acts as the authoritative source of truth for all session data, phase transitions, and agent handoffs.

### Key Decisions & Rationale

- **Protocol Unification** — _Chosen to eliminate redundant state formats and enable native JIT context passing across all Hypercode-compliant tools._
- **Clean-Break Transition** — _Existing legacy Maestro sessions will not be migrated to minimize implementation complexity and focus on a robust future-proof engine._
- **Live Core Dependency** — _Chosen to unlock centralized monitoring and coordination, accepting the trade-off of a network dependency for professional-grade reliability._

_Traces To: REQ-1 (Interoperability), REQ-2 (Integrity)_

## 2. Requirements

### Functional Requirements

- **REQ-1: Live Control Plane Integration** — The TechLead must connect to and use the Hypercode Core Live API as the authoritative engine for session creation, updates, and archival.
- **REQ-2: Unified Protocol Schema** — The system must generate and consume Hypercode-native JSON handoffs, including a `maestro` metadata namespace for tracking agent team logic and phase dependencies.
- **REQ-3: Refactored Reporting** — All Maestro reporting tools (e.g., `/maestro:status`) must be refactored to source data from the Hypercode protocol while maintaining current display formats.

### Non-Functional Requirements

- **REQ-4: Absolute Data Integrity** — All state writes must be atomic. The system must never emit or accept a corrupted handoff file.
- **REQ-5: Strict Validation** — Every state transaction must be validated against the unified schema before being committed to the Hypercode Core.
- **REQ-6: Connectivity Resilience** — The system must implement graceful degradation or clear "Blocking Errors" when the Hypercode Live Core is unreachable.

### Constraints

- **REQ-7: Tech Stack Alignment** — Implementation must use the existing Maestro TypeScript/Node.js stack and follow established service patterns.
- **REQ-8: UI Stability** — Visual output of the Maestro CLI must remain unchanged; only the underlying data engine is refactored.

## 3. Approach

### Selected Approach: Integrated Live Provider

Maestro's internal state engine will be completely refactored to replace its native Markdown/YAML file handlers with a new **`HypercodeLiveProvider`** written in TypeScript. This provider will communicate directly with the **Hypercode Core API** via a live control plane. Local `.hypercode/handoffs/` will serve as an optimized local cache for high-speed reads and offline-mirroring, while the remote API remains the source of truth for all mutations.

### Alternatives Considered

- **Sidecar Sync Proxy** _(Rejected)_ — _While easier to implement and offline-friendly, it introduces significant risk of "Split Brain" state and requires complex conflict resolution logic that conflicts with our Data Integrity priority._
- **Stateless Skill Transformation** _(Rejected)_ — _Maestro loses its identity as a primary orchestrator, becoming a passive component of Hypercode. This was rejected to maintain Maestro's specialized planning and TechLead capabilities._

### Decision Matrix

| Criterion              | Weight | Live Provider                      | Sidecar Sync                      |
| :--------------------- | :----- | :--------------------------------- | :-------------------------------- |
| **Data Integrity**     | 40%    | **5/5**: Single source of truth.   | **3/5**: Sync conflict risks.     |
| **Hypercode Native Flow**   | 30%    | **5/5**: Deep protocol alignment.  | **3/5**: Needs translation layer. |
| **Complexity**         | 20%    | **2/5**: High implementation cost. | **4/5**: Additive change.         |
| **Offline Capability** | 10%    | **1/5**: Hard network dependency.  | **5/5**: Local-first works.       |
| **Weighted Total**     |        | **4.2**                            | **3.4**                           |

## 4. Architecture

### Component Diagram

- **Maestro TechLead (Core)**: The high-level orchestrator managing the Phase 1-4 lifecycle.
- **HypercodeLiveProvider (Service)**: The new primary integration service that replaces `SessionManager`.
- **Hypercode Core Client**: A low-level HTTP/gRPC client handling communication with the live Hypercode control plane.
- **Schema Validator**: Uses `zod` to enforce the extended Hypercode-native JSON schema across all operations.
- **Local Cache Manager**: Manages the `.hypercode/handoffs/` directory as a high-fidelity local mirror for rapid reporting.

### Data Flow

1. **Initiation**: The TechLead invokes `HypercodeLiveProvider.createSession()`.
2. **Remote Commit**: The Provider validates the session against the schema and commits it to the **Hypercode Core API**.
3. **Local Sync**: Upon a successful remote commit, the **Local Cache Manager** asynchronously updates the `.hypercode/handoffs/` JSON file.
4. **Reporting**: Maestro slash commands (like `/maestro:status`) query the **Local Cache Manager** for high-speed Markdown generation.
5. **Phase Transition**: At the end of a phase, the TechLead commits the "Handoff" back to the Hypercode Core, including JIT context gathered by subagents.

## 5. Agent Team

### Team Roster

- **architect**: Responsible for the structural integrity of the `HypercodeLiveProvider` and the final definition of the extended JSON schema.
- **api_designer**: Specifically assigned to define the interaction contract between Maestro and the Hypercode Core Live API.
- **coder**: The primary implementer for the core refactor of the TechLead and the implementation of the TypeScript service layer.
- **tester**: Dedicated to ensuring REQ-4 (Data Integrity) through exhaustive unit and integration tests, including simulated network failures.
- **technical_writer**: Responsible for updating `ARCHITECTURE.md` and creating the new "Hypercode-Maestro Protocol" documentation.

### Execution Phases

1. **Phase 1: Interface & Schema Design** — `architect` and `api_designer` finalize the JSON namespace and `IHypercodeProvider` contract.
2. **Phase 2: Service Implementation** — `coder` builds the `HypercodeLiveProvider` and connectivity logic.
3. **Phase 3: Orchestrator Refactor** — `coder` refactors the Maestro TechLead to use the new provider; `tester` begins integration validation.
4. **Phase 4: Reporting & Documentation** — `coder` refactors the reporting scripts; `technical_writer` finalizes all documentation.

## 6. Risk Assessment

### Key Risks

- **Risk 1: Performance Degradation (High Impact, Medium Likelihood)** — Frequent API calls to the Hypercode Core could introduce latency in Maestro slash commands.
  - _Mitigation_: The **Local Cache Manager** will serve as a high-speed read buffer for all reporting tasks.
- **Risk 2: Protocol Evolution Conflict (Medium Impact, Low Likelihood)** — Future changes to the core Hypercode schema may conflict with our extended namespace.
  - _Mitigation_: We will implement **Versioned Schema Handling** and strict `maestro` namespacing.
- **Risk 3: Orchestration Lock-out (High Impact, Medium Likelihood)** — If the Hypercode Core control plane is unreachable, Maestro cannot start or advance sessions.
  - _Mitigation_: We will implement a **Graceful Failure Mode** that allows users to view status from the local cache while blocking mutations.
- **Risk 4: Implementation Regression (High Impact, High Likelihood)** — Refactoring the central state engine could break existing subagent handoff logic.
  - _Mitigation_: **Phase 3** includes a mandatory testing gate against a suite of "Reference Tasks."

## 7. Success Criteria

1. **Successful API Cycle** — Maestro can initiate and transition a session exclusively using the Hypercode Core Live API.
2. **Zero-Drift Integrity** — 100% data parity maintained between the remote state and local cache across 50 mutations.
3. **Schema Validation Pass** — All JSON handoffs pass validation against the versioned `Hypercode-Maestro-v1` schema.
4. **Visual Regression Pass** — The output of `/maestro:status` is behaviorally identical to the legacy engine.
5. **Documentation Delivery** — `ARCHITECTURE.md` and `PROTOCOL.md` are updated and delivered.
