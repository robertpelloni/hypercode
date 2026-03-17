# Research Index: The Great Absorption 🌊

> **Status**: In Progress (Phase 1 Complete)
> **Started**: 2026-02-02
> **Total Links**: 427
> **Processed**: 25+
> **Submodules Added**: 22

## Submodules Added (22 total)

### CLI Tools (7)
| Repository | Path | Status |
|------------|------|--------|
| sst/opencode | `reference/cli/opencode` | ✅ Added |
| CodebuffAI/codebuff | `reference/cli/codebuff` | ✅ Added |
| charmbracelet/crush | `reference/cli/crush` | ✅ Added |
| openai/codex | `reference/cli/codex` | ✅ Added |
| block/goose | `reference/cli/goose` | ✅ Added |
| plandex-ai/plandex | `reference/cli/plandex` | ✅ Added |
| Aider-AI/aider | `reference/cli/aider` | ✅ Added |

### Memory Systems (4)
| Repository | Path | Status |
|------------|------|--------|
| mem0ai/mem0 | `reference/memory/mem0` | ✅ Added |
| letta-ai/letta | `reference/memory/letta` | ✅ Added |
| supermemoryai/supermemory | `reference/memory/supermemory` | ✅ Added |
| getzep/zep | `reference/memory/zep` | ✅ Added |

### MCP Tools (2)
| Repository | Path | Status |
|------------|------|--------|
| thirdstrandstudio/mcp-tool-chainer | `reference/mcp/mcp-tool-chainer` | ✅ Added |
| robertpelloni/metamcp | `reference/mcp/metamcp` | ✅ Added |

### Protocols (1)
| Repository | Path | Status |
|------------|------|--------|
| a2aproject/A2A | `reference/protocols/a2a` | ✅ Added |

### Context Systems (1)
| Repository | Path | Status |
|------------|------|--------|
| steveyegge/beads | `reference/context/beads` | ✅ Added |

### Agent UI (1)
| Repository | Path | Status |
|------------|------|--------|
| CopilotKit/CopilotKit | `reference/agent-ui/copilotkit` | ✅ Added |

### Code Indexing (1)
| Repository | Path | Status |
|------------|------|--------|
| oraios/serena | `reference/indexing/serena` | ✅ Added |

### Sandbox (1)
| Repository | Path | Status |
|------------|------|--------|
| e2b-dev/code-interpreter | `reference/sandbox/e2b` | ✅ Added |

### Browser Automation (1)
| Repository | Path | Status |
|------------|------|--------|
| puppeteer/puppeteer | `reference/browser/puppeteer` | ✅ Added |

### Orchestration (2)
| Repository | Path | Status |
|------------|------|--------|
| langchain-ai/langgraph | `reference/orchestration/langgraph` | ✅ Added |
| crewAIInc/crewAI | `reference/orchestration/crewai` | ✅ Added |

---

## Feature Documentation Created (7 files)

| File | Description | Categories |
|------|-------------|------------|
| [CLI_FEATURE_PARITY.md](file:///C:/Users/hyper/workspace/borg/docs/CLI_FEATURE_PARITY.md) | 230+ features from 7 CLI tools | CLI/TUI |
| [MEMORY_FEATURES.md](file:///C:/Users/hyper/workspace/borg/docs/MEMORY_FEATURES.md) | Memory architecture from 4 systems | Memory |
| [MCP_CONTEXT_FEATURES.md](file:///C:/Users/hyper/workspace/borg/docs/MCP_CONTEXT_FEATURES.md) | MCP routing & context formats | MCP, Context |
| [AGENT_UI_FEATURES.md](file:///C:/Users/hyper/workspace/borg/docs/AGENT_UI_FEATURES.md) | Agent UI/React integration | UI |
| [INFRASTRUCTURE_FEATURES.md](file:///C:/Users/hyper/workspace/borg/docs/INFRASTRUCTURE_FEATURES.md) | Code indexing, sandbox, browser | Infra |
| [ORCHESTRATION_FEATURES.md](file:///C:/Users/hyper/workspace/borg/docs/ORCHESTRATION_FEATURES.md) | Multi-agent orchestration | Orchestration |
| RESEARCH_INDEX.md (this file) | Research progress tracker | Meta |

---

## Research Categories Completed

### 1. CLI/TUI Tools (7 researched)
- OpenCode, Codebuff, Crush, Codex CLI, Goose, Plandex, Aider
- **Key Insights**: Multi-model support, Plan/Build modes, LSP integration, diff sandboxes

### 2. Memory Systems (4 researched)
- Mem0, Letta/MemGPT, Supermemory, Zep
- **Key Insights**: Temporal knowledge graphs, hybrid vector+graph, self-editing memory

### 3. MCP & Context (5 researched)
- MetaMCP, MCP Tool Chainer, TOON Format, Code Mode, Beads
- **Key Insights**: MCP aggregation, tool chaining, 94% context reduction

### 4. Protocols (1 researched)
- A2A Protocol
- **Key Insights**: Agent-to-agent communication, OAuth/OIDC, multi-SDK

### 5. Agent UI (1 researched)
- CopilotKit CoAgents
- **Key Insights**: React state sync, generative UI, human-in-the-loop

### 6. Code Indexing (1 researched)
- Serena
- **Key Insights**: LSP-based semantic understanding, cross-reference database

### 7. Sandbox (1 researched)
- E2B Code Interpreter
- **Key Insights**: <200ms spin-up, Firecracker microVMs, multi-language

### 8. Browser Automation (1 researched)
- Puppeteer MCP
- **Key Insights**: MCP server for LLM access, screenshots, JS execution

### 9. Orchestration (2 researched)
- LangGraph, CrewAI
- **Key Insights**: Graph-based workflows, role-based teams, shared memory

### 10. Coding Skills & MCP Directories (Batch 15)
- **Skills Frameworks**: `anthropics/skills`, `bkircher/skills`, `gemini-claude-skills`
- **MCP Directories**: `awesome-mcp-servers`, `toolsdk-mcp-registry`
- **Key Insights**: `SKILL.md` standardization, Gemini-as-a-skill pattern, Enterprise MCP registry validation.

### 11. Agent Frameworks & Skills II (Batch 16)
- **Frameworks**: `Maestro` (Orchestrator), `OpenAgents` (Control), `smolagents` (Code), `OpenHands` (Full).
- **Skills**: `open-skills` (Sandboxed), `codex-skills`, `awesome-claude-skills`.
- **Key Insights**: Git Worktrees for parallel agents, Pattern Context vs generic context, MVI token efficiency.

---

### 12. Knowledge Graphs & Media (Batch 17)
- **Knowledge Graphs**: `cognee` (ECL/Graph), `txtai` (Embeddings DB), `ragflow` (DeepDoc).
- **Browser**: `browser-use` (Agentic Web).
- **Key Insights**: "Cognify" step for memory, "Quality In" for RAG, Agent-first browser automation.

---

## Next Steps

1. Continue processing remaining ~400 links from `LINKS_TO_PROCESS.md`
2. Cross-reference features with existing Borg implementation
3. Create implementation priority matrix
4. Begin implementing missing features in priority order
