# Borg Memory System Architecture

> **Version**: 2.7.21 (Phase 64)
> **Status**: Hybrid (SQLite + Vector Placeholder) - Evolving to Multi-Backend

---

## 1. Overview

The Memory System is the "Long-Term Potentiation" layer of the Neural Operating System. It allows Borg to retain context, learn from past interactions, and "know" the user and project without re-reading every file.

It allows agents (Director, Coder, Researcher) to:
1. **Store** entities, facts, and code snippets.
2. **Recall** relevant information based on semantic query.
3. **Refine** knowledge over time (consolidation).

## 2. Architecture

### 2.1 The Memory Manager (`packages/memory`)
The core interface `MemoryManager` abstracts the underlying storage.

```typescript
interface MemoryManager {
    saveContext(content: string, metadata?: any): Promise<void>;
    search(query: string, limit: number): Promise<MemoryResult[]>;
    getGraph(): Promise<KnowledgeGraph>;
}
```

### 2.2 Storage Tiers (Planned v2.7.0)

| Tier | Technology | Purpose |
|------|------------|---------|
| **Short-Term** | In-Memory (Map) | Active session context, recent messages. |
| **Episodic** | SQLite / Postgres | Time-series log of actions and outcomes. |
| **Semantic** | Vector DB (Chroma/LanceDB) | Embedding-based retrieval of concepts. |
| **Graph** | Neo4j / Graphology | Relationship mapping (File A imports File B). |

## 3. Integrated Backends (Phase 68)

The following advanced memory backends have been assimilated as submodules and are available for integration:

### 3.1 Memora (`external/memory/memora`)
- **Type**: MCP Server (Python)
- **Features**: Semantic storage, Knowledge Graphs, SQLite persistence with cloud sync (S3/R2/D1).
- **Integration**: Registered in `borg.config.json` as `memora`.

### 3.2 Papr Memory (`external/memory/memory-opensource`)
- **Type**: Predictive Memory Layer (FastAPI)
- **Features**: MongoDB + Qdrant + Neo4j stack, Predictive retrieval, custom ontologies.
- **Integration**: Slated for container-based deployment in Phase 69.

## 4. Current Implementation (v2.7.20)

- **Vector Store**: Uses `vectordb` (LanceDB) locally for embedding search.
- **Knowledge Service**: `KnowledgeService.ts` manages a primitive graph structure.
- **Routers**: `memoryRouter` and `knowledgeRouter` expose these via tRPC.

## 4. Integration Guide

### Usage in Agents
```typescript
// Storing a finding
await memoryManager.saveContext("User prefers Tailwind over CSS modules", { type: "preference" });

// Recalling info
const relevant = await memoryManager.search("css preference", 1);
// Result: "User prefers Tailwind..."
```

### Usage in MCP
Use the `knowledge-store` tool exposed by `mcpRouter` to save/retrieve information naturally.

---

## 5. Future Roadmap (Phase 64+)

- [ ] **Multi-Backend Plugin System**: Swap LanceDB for Qdrant/Pinecone via config.
- [ ] **Automatic Harvesting**: Background watcher that aggressively summarizes read files into memory.
- [ ] **Graph Visualization**: Interactive 3D force graph in Dashboard (replacing current mock).
- [ ] **Context Window Optimization**: "Smart Context" that injects only relevant memories into the LLM prompt.

---

*"I remember everything."*
