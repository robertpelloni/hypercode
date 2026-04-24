# RAG (Retrieval-Augmented Generation) Architecture Investigation

As part of the v1.0.0 roadmap ("The Swarm"), Jules Autopilot requires native RAG integration to afford agents instantaneous, repository-wide context before executing code modifications. This document outlines the findings and proposed architecture for integrating RAG into the Orchestrator.

## 1. Challenge: Context Windows vs. Codebase Size
While models like Claude 3.5 Sonnet and Gemini 1.5 Pro offer massive context windows (up to 2M tokens), blindly dumping entire repositories into the prompt for every task is:
1. **Slow:** High Time-To-First-Token (TTFT) latency.
2. **Expensive:** Rapidly drains the `monthlyBudget` defined in the `Workspace`.
3. **Noisy:** Degrades the LLM's attention mechanism on the exact target files.

## 2. Proposed Architecture

### Vector Database Subsystem
Given our prioritization of "Zero-Config Self-Hosting," requiring a complex external vector database (like Pinecone) ruins the developer experience. 
**Recommendation:** Integrate `sqlite-vss` (Vector Similarity Search) directly into our existing Prisma SQLite database, or deploy a lightweight local `ChromaDB` container within our `docker-compose.yml`.

### The Ingestion Pipeline
We must map the GitHub organization context to vectors:
1. **Triggers:** A GitHub Webhook (`push` events on `main`) or a nightly background Cron job in `server/index.ts`.
2. **Chunking Strategy:** Abstract Syntax Tree (AST) aware chunking (using Tree-sitter) to ensure entire functions or classes are embedded as single unified vectors, rather than arbitrary 512-token splits.
3. **Embedding Model:** `text-embedding-3-small` (OpenAI) for cloud-connected workspaces, with a fallback to a local lightweight model (e.g., `BGE-M3` via Ollama) for completely air-gapped Enterprise deployments.

### Agent Interface (Model Context Protocol)
The orchestrator will expose a strictly typed MCP Tool to the agents:
```typescript
interface QueryCodebaseTool {
    name: "query_codebase";
    description: "Performs a semantic similarity search across the entire GitHub organization to find relevant code patterns or implementations.";
    parameters: {
        query: string; // The semantic prompt (e.g., "How is authentication handled in the frontend?")
        top_k?: number; // Defaults to 5
    }
}
```

## 3. Implementation Roadmap (v1.1.0)
1. Add `sqlite-vss` extension to the Prisma connection layer.
2. Build the AST Chunking worker queue in the daemon loop.
3. Inject the `query_codebase` MCP tool into the default agent capability payload.
4. Add a `Knowledge Base` management tab to the Next.js Dashboard allowing users to manually trigger re-indexing.
