# Implementation Priority Matrix

> **Purpose**: Map researched features to Hypercode implementation status and prioritize development
> **Based on**: 25+ tools researched in Phase 50
> **Created**: 2026-02-02

## Legend
- ✅ **Implemented** - Feature exists in Hypercode
- 🔄 **Partial** - Basic implementation, needs enhancement
- ❌ **Missing** - Feature does not exist
- 🎯 **Priority** - P1 (Critical), P2 (High), P3 (Medium), P4 (Low)

---

## 1. CLI/TUI Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **Multi-model support** | 🔄 Partial | P2 | Have LLMService, need broader provider support |
| **Model switching mid-session** | ❌ Missing | P2 | Research: Crush, OpenCode |
| **Session management** | 🔄 Partial | P2 | Have persistence, need better UX |
| **Plan/Build modes** | ❌ Missing | P1 | Research: OpenCode, Plandex |
| **Diff sandbox** | ❌ Missing | P1 | Research: Plandex |
| **Git integration** | 🔄 Partial | P2 | Have GitService, need auto-commit |
| **Voice input** | ❌ Missing | P3 | Research: Aider |
| **Image context** | ❌ Missing | P3 | Research: Aider, Codex |
| **Slash commands** | 🔄 Partial | P2 | Have some, need comprehensive set |
| **Knowledge.md** | ❌ Missing | P2 | Research: Codebuff |
| **Checkpoints** | ❌ Missing | P1 | Research: Codebuff |
| **Specialized agents** | 🔄 Partial | P2 | Have Council, need more specialists |
| **LSP integration** | ❌ Missing | P1 | Research: OpenCode, Serena |
| **Tree-sitter maps** | ❌ Missing | P2 | Research: Plandex |

### Priority Actions (CLI)
1. **P1**: Implement Plan/Build modes with diff sandbox
2. **P1**: Add LSP integration for semantic code understanding
3. **P1**: Implement checkpoints for state restoration
4. **P2**: Expand multi-model support and mid-session switching

---

## 2. Memory System Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **Vector storage** | 🔄 Partial | P2 | Have basic, need optimization |
| **Knowledge graph** | ❌ Missing | P1 | Research: Mem0, Zep |
| **Hybrid vector+graph** | ❌ Missing | P1 | Research: Mem0 |
| **Memory scoping** | ❌ Missing | P2 | User/session/agent scopes |
| **Fact extraction** | ❌ Missing | P2 | Research: Mem0 |
| **Self-editing memory** | ❌ Missing | P2 | Research: Letta |
| **Temporal knowledge graph** | ❌ Missing | P1 | Research: Zep (Graphiti) |
| **Bi-temporal model** | ❌ Missing | P2 | Research: Zep |
| **Smart forgetting** | ❌ Missing | P3 | Research: Supermemory |
| **Multi-source ingestion** | ❌ Missing | P2 | Research: Supermemory |
| **Cross-session persistence** | 🔄 Partial | P2 | Have MemoryManager |
| **Entity extraction** | ❌ Missing | P1 | Research: Zep |

### Priority Actions (Memory)
1. **P1**: Implement knowledge graph with entity extraction (Zep-inspired)
2. **P1**: Add hybrid vector+graph retrieval (Mem0-inspired)
3. **P2**: Implement memory scoping (user/session/agent)
4. **P2**: Add fact extraction and self-editing memory

---

## 3. MCP & Context Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **MCP server** | ✅ Implemented | - | MCPServer.ts |
| **MCP aggregation** | ❌ Missing | P2 | Research: MetaMCP |
| **Tool chaining** | ❌ Missing | P2 | Research: MCP Tool Chainer |
| **Progressive tool disclosure** | ❌ Missing | P1 | Research: Code Mode |
| **TOON format** | ❌ Missing | P3 | 30-60% token reduction |
| **Code Mode** | ❌ Missing | P1 | 94% context reduction |
| **Tool search/RAG** | ❌ Missing | P2 | Research: Tool Search |
| **Dynamic tool loading** | ❌ Missing | P2 | Research: Lazy MCP |
| **Workspace switching** | ❌ Missing | P3 | Research: MetaMCP |
| **Namespace isolation** | ❌ Missing | P3 | Research: MetaMCP |

### Priority Actions (MCP)
1. **P1**: Implement Code Mode for massive context reduction
2. **P1**: Add progressive tool disclosure
3. **P2**: Implement MCP aggregation for multiple servers
4. **P2**: Add tool chaining with JsonPath filtering

---

## 4. Agent UI Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **React integration** | ✅ Implemented | - | apps/web |
| **Agent state streaming** | 🔄 Partial | P2 | Have tRPC, need better streaming |
| **Generative UI** | ❌ Missing | P2 | Research: CopilotKit |
| **Bidirectional state sync** | ❌ Missing | P1 | Research: CopilotKit |
| **Human-in-the-loop checkpoints** | 🔄 Partial | P2 | Have Council approval |
| **Intermediate state visualization** | ❌ Missing | P2 | Research: CopilotKit |
| **Agent progress display** | 🔄 Partial | P2 | Have basic dashboard |

### Priority Actions (UI)
1. **P1**: Implement bidirectional agent-UI state sync
2. **P2**: Add intermediate state visualization
3. **P2**: Enhance agent progress display with step-by-step

---

## 5. Infrastructure Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **Code indexing** | ❌ Missing | P1 | Research: Serena |
| **Symbol-level understanding** | ❌ Missing | P1 | Research: Serena |
| **Cross-reference database** | ❌ Missing | P1 | Research: Serena |
| **Code sandbox** | ❌ Missing | P2 | Research: E2B |
| **Isolated execution** | ❌ Missing | P2 | Research: E2B |
| **Browser automation** | ❌ Missing | P3 | Research: Puppeteer |
| **Screenshot capture** | ❌ Missing | P3 | Research: Puppeteer |

### Priority Actions (Infrastructure)
1. **P1**: Implement LSP-based code indexing (Serena-inspired)
2. **P1**: Build cross-reference database for refactoring
3. **P2**: Add E2B-style isolated code execution

---

## 6. Orchestration Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **Multi-agent execution** | ✅ Implemented | - | SquadService.ts |
| **Graph-based workflows** | ❌ Missing | P1 | Research: LangGraph |
| **Shared state management** | 🔄 Partial | P2 | Have basic, need centralized |
| **Durable execution** | ❌ Missing | P2 | Resume from failure |
| **Role-based agents** | 🔄 Partial | P2 | Have Council roles |
| **Crews/Flows** | ❌ Missing | P2 | Research: CrewAI |
| **Supervisor pattern** | 🔄 Partial | P2 | Have Director |
| **Dynamic delegation** | ❌ Missing | P2 | Research: CrewAI |

### Priority Actions (Orchestration)
1. **P1**: Implement graph-based workflow engine (LangGraph-inspired)
2. **P2**: Add durable execution with state persistence
3. **P2**: Implement role-based agent design (CrewAI-inspired)

---

## Implementation Roadmap

### Phase 51: Core Infrastructure (P1 items)
1. LSP integration + code indexing (Serena-inspired)
2. Plan/Build modes with diff sandbox
3. Code Mode for context reduction
4. Graph-based workflow engine

### Phase 52: Memory Enhancement (P1 items)
1. Knowledge graph with entity extraction
2. Hybrid vector+graph retrieval
3. Temporal knowledge graph

### Phase 53: Agent Experience (P2 items)
1. Bidirectional UI-agent state sync
2. Expanded multi-model support
3. Checkpoints and session management
4. MCP aggregation and tool chaining

### Phase 54: Polish (P3 items)
1. Voice input
2. Browser automation
3. Advanced memory features

---

## Feature Count Summary

| Category | Total | ✅ Impl | 🔄 Partial | ❌ Missing |
|----------|-------|---------|------------|-----------|
| CLI/TUI | 14 | 0 | 5 | 9 |
| Memory | 12 | 0 | 2 | 10 |
| MCP/Context | 10 | 1 | 0 | 9 |
| Agent UI | 7 | 1 | 3 | 3 |
| Infrastructure | 7 | 0 | 0 | 7 |
| Orchestration | 8 | 1 | 3 | 4 |
| **Total** | **58** | **3** | **13** | **42** |

> **Gap Analysis**: 72% of researched features are missing, 22% are partial, 5% are implemented.
> **Focus Areas**: Infrastructure (code indexing), Memory (knowledge graph), MCP (Code Mode)
