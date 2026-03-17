# Borg Memory System

## Overview
The Borg Memory System is a sophisticated tiered architecture designed to provide AI agents with infinite, persistent, and structured context. It combines vector-based semantic search with graph-based structured relationships to enable "Cognitive Object Permanence."

## Architecture

### 1. Tiered Memory Levels
The system mimics human memory consolidation through three distinct tiers:

*   **Session Memory (Short-Term)**: Ephemeral context for the current conversation loop. TTL ~30 mins.
*   **Working Memory (Mid-Term)**: Task-relevant facts harvested during execution. Promoted to long-term after repeated access (5+ times).
*   **Long-Term Memory (Persistent)**: Consolidated knowledge stored in the VectorStore and Knowledge Graph.

### 2. Core Components

#### VectorStore (Semantic Memory)
*   **Engine**: LanceDB (embedded vector database).
*   **Embeddings**: `@xenova/transformers` (all-MiniLM-L6-v2) for local-first privacy and speed.
*   **Capabilities**:
    *   Semantic search with hybrid lexical re-ranking (`txtai` + `ripgrep` logic).
    *   Lifecycle management (bulk delete, reset, list).
    *   AST-sensitive chunking via `CodeSplitter.ts`.

#### Knowledge Graph (Structured Memory)
*   **Implementation**: Persistent Adjacency List graph in `@borg/memory`.
*   **Storage**: Serialized to `.borg/memory/knowledge_graph.json`.
*   **Nodes**: Represent Concepts, Files, Functions, Agents, and Tasks.
*   **Edges**: Typed relationships (e.g., `imports`, `calls`, `defines`, `implements`).
*   **Traversal**: `KnowledgeService.ts` provides BFS traversal for "Deep Context" retrieval, allowing agents to understand dependencies (e.g., requesting File A automatically pulls in imported File B).

### 3. The "Hippocampus" Loop
Integrated into the Director and Council agents:
1.  **Search**: Agents query `agentMemoryService.search(goal)` before planning.
2.  **Inject**: Relevant memories are injected into the context window under `[RECALLED MEMORIES]`.
3.  **Consolidate**: Successful task results are written back to Long-Term Memory.
4.  **Prune**: `ContextPruner.ts` uses a "Sliding Window + Landmark" strategy to keep the context window focused.

## Usage

### Dashboard Integration
The Memory Dashboard (`/dashboard/memory` and `/dashboard/knowledge`) provides visual interfaces for:
*   **Graph Explorer**: Visualize the Logic Graph connections.
*   **Memory Inspector**: Search and view stored vector embeddings.
*   **Assimilation**: "Teach" the agent new skills by ingesting documentation URLs.

### API (TRPC)
Accessed via `trpc.memory` and `trpc.knowledge`:
*   `getGraph`: Retrieve graph snapshots.
*   `searchAgentMemory`: Semantic search across tiers.
*   `assimilate`: Ingest external documentation into the memory stream.

## Future Roadmap
*   **Phase 41**: Advanced "Hippocampus" integration with recursive self-correction.
*   **Phase 42**: Multi-provider support (Pinecone/Weaviate adapters).
*   **Phase 43**: Distributed memory synchronization across fleet agents.
