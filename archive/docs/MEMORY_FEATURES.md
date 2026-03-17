# Memory System Features Master List

> **Compiled from research on**: Mem0, Letta/MemGPT, Supermemory
> **Last Updated**: 2026-02-02

## Core Memory Architecture

### Memory Types
- [ ] **Working Memory**: Short-term, session-specific context
- [ ] **Factual Memory**: Persistent facts and preferences
- [ ] **Episodic Memory**: Specific interaction memories
- [ ] **Semantic Memory**: Conceptual understanding
- [ ] **Graph Memory**: Relationship-based storage

### Storage Backends
- [ ] Vector database (Chroma, pgvector, Qdrant)
- [ ] Graph database (Neo4j, etc.)
- [ ] Key-value store (Redis)
- [ ] SQLite for local caching
- [ ] Hybrid storage (vector + graph + KV)

---

## Mem0 Specific Features

### LLM-Powered Processing
- [ ] Fact extraction from conversations
- [ ] Memory filtering (noise reduction)
- [ ] Embeddings-backed semantic recall
- [ ] Automatic memory updates and conflict resolution

### Performance
- [ ] 90% token reduction vs full-context
- [ ] 91% faster response latency
- [ ] 26% accuracy improvement over OpenAI Memory

### Memory Scoping
- [ ] user_id scoping
- [ ] agent_id scoping
- [ ] run_id scoping
- [ ] Multi-user/multi-agent isolation

### Integration
- [ ] Python SDK
- [ ] Node.js SDK
- [ ] Self-hosted option
- [ ] Cloud-hosted option
- [ ] Framework agnostic (any LLM)

---

## Letta/MemGPT Specific Features

### Hierarchical Memory (OS-Inspired)
- [ ] **Core Memory** (analogous to RAM)
  - [ ] Agent persona block
  - [ ] User information block
  - [ ] Self-editable by agent
- [ ] **Recall Memory** (semantic search database)
- [ ] **Archival Memory** (long-term vector storage)

### Virtual Context Management
- [ ] Illusion of infinite context window
- [ ] LLM acts as memory manager
- [ ] Self-generated function calls for data movement
- [ ] Memory tier transitions (archival ↔ recall ↔ core)

### Control Flow
- [ ] OS-like event loop
- [ ] Interrupt handling
- [ ] Yielding (pause execution)
- [ ] Function chaining for multi-step reasoning

### Agent Development
- [ ] Agent Development Environment (ADE) - GUI
- [ ] Memory block editing
- [ ] Custom tool integration
- [ ] RESTful API (Letta Server)

---

## Supermemory Specific Features

### Unlimited Context API
- [ ] Automatic long-term context management
- [ ] No manual programming required
- [ ] Model-agnostic compatibility

### Intelligent Structuring
- [ ] Knowledge graph for relationships
- [ ] Smart forgetting / memory decay
- [ ] Recency bias
- [ ] Relevance weighting

### Advanced Retrieval
- [ ] Hybrid retrieval (vector + graph)
- [ ] Semantic search
- [ ] User profile generation from memories

### Data Sources
- [ ] URL ingestion
- [ ] PDF ingestion
- [ ] Plain text
- [ ] Google Drive integration
- [ ] Notion integration
- [ ] OneDrive integration
- [ ] Custom connectors

### Performance
- [ ] Sub-400ms latency
- [ ] Enterprise-grade scalability
- [ ] Data isolation and privacy
- [ ] Cloudflare infrastructure

### Extensions
- [ ] Browser extension
- [ ] Raycast extension
- [ ] Supermemory MCP integration
- [ ] Claude/Cursor compatibility

---

## Implementation Priority for Borg

### Phase 1: Core Memory Layer
1. Hybrid storage backend (vector + graph)
2. Memory scoping (user, agent, session)
3. LLM-powered fact extraction
4. Semantic search/retrieval

### Phase 2: Advanced Features
1. Self-editing memory (like MemGPT)
2. Memory decay and compaction
3. Hierarchical memory tiers
4. Knowledge graph relationships

### Phase 3: Integration
1. Browser extension for memory capture
2. Document ingestion pipeline
3. MCP memory server
4. Cross-session persistence

---

## Cognee Specific Features

### ECL Core
- [ ] **Cognify Step**: LLM extraction of graph edges before storage
- [ ] **Knowledge Graph**: Nodes (Entities) + Edges (Relationships)
- [ ] **Graph Retrieval**: Multi-hop reasoning over memory
- [ ] **ECL Pipeline**: Extract -> Cognify -> Load

### Integration
- [ ] MCP Server
- [ ] Vector + Graph hybrid search

---

## txtai Specific Features

### All-in-One Embeddings
- [ ] **Semantic Graph**: Topic modeling + dynamic graph
- [ ] **SQL + Vector**: Hybrid search capability
- [ ] **Local First**: Lightweight, no heavy DB required

---

## Implementation Priority for Borg
1. **Cognee Integration**: Use for "Sherlock" Deep Memory (Reasoning Layer).
2. **txtai Integration**: potential replacement for local lightweight memories.
3. **Hybrid Backend**: Combine Postgres (relational) + Cognee (Graph) + Qdrant (Vector).

---

## Zep Specific Features

### Temporal Knowledge Graph (Graphiti Engine)
- [ ] Bi-temporal model (Event Time + Ingestion Time)
- [ ] Unstructured + structured data integration
- [ ] Historical relationship preservation
- [ ] Temporal validity tracking

### Hierarchical Subgraphs
- [ ] **Episode Subgraph (Ge)**: Raw input storage (messages, text, JSON)
- [ ] **Semantic Entity Subgraph (Gs)**: Entity nodes + semantic edges
- [ ] **Community Subgraph (Gc)**: Clustered entity summaries

### Retrieval Mechanism
- [ ] Cosine semantic similarity (ϕcos)
- [ ] Okapi BM25 full-text search (ϕbm25)
- [ ] Breadth-first graph traversal (ϕbfs)
- [ ] Candidate re-ranking
- [ ] <100ms latency

### Entity Processing
- [ ] LLM-based entity extraction with historical context
- [ ] High-dimensional vector embedding
- [ ] Similarity-based entity resolution
- [ ] Fact extraction with temporal validity

### Performance
- [ ] Superior to MemGPT on DMR benchmark
- [ ] Superior on LongMemEval benchmark
- [ ] Session-based memory persistence
- [ ] Multi-user/multi-session support

