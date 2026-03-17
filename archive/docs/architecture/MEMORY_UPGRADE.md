# Architecture: "Sherlock" Memory Upgrade (Graph-Based)

**Status:** Draft
**Last Updated:** 2026-02-03
**Target Component:** `packages/memory`

## 1. Overview
The **Sherlock** persona requires deep investigative capabilities. Currently, Borg uses simple Vector Storage (`mem0`), which retrieves semantically similar text but fails to "connect the dots" between disparate facts (e.g., entity relationships, temporal mapping).

We will upgrade the memory layer by integrating **Cognee**, which implements an **ECL (Extract, Cognify, Load)** pipeline to build a Knowledge Graph.

## 2. Core Concepts

### A. The ECL Pipeline
Instead of just "saving text", we runs a pipeline:
1.  **Extract:** Pull text from PDF/Website/Chat.
2.  **Cognify:** Use an LLM to identify **Entities** (People, Files, Servers) and **Edges** (Relationships).
3.  **Load:** Store Nodes and Edges in a Graph DB (Neo4j/NetworkX) and Vectors in Qdrant/Chroma.

### B. "Sherlock" Querying
Sherlock queries will validat against the Graph:
*   *Old Way:* "Find text about 'AuthService'."
*   *New Way:* "Traverse graph from 'AuthService' to find all 'Dependent Components'."

## 3. Integration Strategy

### A. `CogneeClient` (`packages/core/src/services/CogneeClient.ts`)
A Typed wrapper around the `cognee` Python library (via `python-shell` or MCP).
```typescript
interface GraphResult {
  nodes: Node[];
  edges: Edge[];
}

class CogneeClient {
  async add(data: string, context?: string): Promise<void>;
  async cognify(): Promise<void>; // Triggers the graph build
  async search(query: string): Promise<GraphResult>;
}
```

### B. `GraphMemory` Service
Refactor `GraphMemory.ts` to use `CogneeClient` as the backing store instead of the simplistic JSON file it likely is now.

## 4. Migration
*   **Legacy Data:** Existing vector data in `mem0` provides good broad context.
*   **New Data:** All new "Deep Research" tasks will feed into Cognee.
*   **Re-indexing:** We can iterate through `mem0` and feed it into `Cognee` to backfill the graph.
