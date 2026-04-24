# Design Document: Phase 4 - Collective Knowledge & Graphing

**Date**: 2026-03-23
**Status**: Draft
**Design Depth**: Standard
**Task Complexity**: Medium

## 1. Problem Statement

While Maestro is now assimilated into Hypercode for state management, session data remains isolated. To achieve the project's goal of "Global RAG integration," we need to:

1. **Discoverability**: Identify other active or historical sessions within the collective.
2. **Knowledge Extraction**: Capture high-value insights (decisions, discoveries, fixes) in a machine-readable format.
3. **Relationship Mapping**: Visualize the "Maestro Symphony" as a graph of interconnected tasks and agents.

## 2. Requirements

- **REQ-4.1: Collective Discovery** — Add `listSessions` to the `HypercodeLiveProvider` to query the global control plane.
- **REQ-4.2: Knowledge Namespace** — Extend the `HypercodeHandoff` schema with a `knowledge` section for extracted insights.
- **REQ-4.3: Graphing Engine** — Add a `maestro hypercode graph` CLI command that outputs DOT or JSON graph data.

## 3. Approach

We will leverage the existing API-first architecture to surface collective data.

### Approach: Distributed Intelligence

- **Provider Extension**: Add discovery methods to `IHypercodeProvider`.
- **Insight Extraction**: Update `AfterAgent` hook logic (conceptually) to encourage agents to populate the `knowledge` section.
- **Graph Visualization**: Implement a breadth-first traversal of session handoffs to build a dependency and knowledge graph.

## 4. Architecture Extensions

- **Discovery Service**: New methods in `HypercodeLiveProvider.ts`.
- **Knowledge Schema**: New Zod definitions in `hypercode-schema.ts`.
- **HypercodeGraph (CLI)**: New command handler in `src/cli/commands/hypercode-graph.ts`.

## 5. Agent Team

- **architect**: Design the knowledge extraction schema.
- **coder**: Implement discovery methods and CLI graphing.
- **api_designer**: Ensure the Discovery API is consistent with Hypercode Core patterns.

## 6. Risk Assessment

- **Risk**: Privacy concerns regarding shared knowledge across different projects.
- **Mitigation**: Implement "Namespace Isolation" so knowledge items are only shared within authorized project boundaries by default.

## 7. Success Criteria

1. `maestro hypercode list` shows all active sessions in the Hypercode Core.
2. `maestro hypercode graph` generates a valid visualization of session dependencies.
3. Handoffs contain a `knowledge` array with at least one "Discovery" or "Decision" item.
