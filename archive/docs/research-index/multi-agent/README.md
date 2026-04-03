# Multi-Agent Orchestration

**Purpose**: SDKs, frameworks, and systems for coordinating multiple AI agents

## Overview

Multi-agent orchestration systems enable teams of AI agents to collaborate, debate, and coordinate on complex tasks. This category tracks frameworks, SDKs, and reference implementations for Hypercode's autonomous agent council and supervisor functionality.

## Known Frameworks & Systems

### Frameworks

| Repository | URL | Status | Notes |
|------------|-----|--------|-------|
| metamcp | https://github.com/robertpelloni/metamcp | 🔄 In Progress | MCP-based agent orchestration |
| Roo Code Cloud | https://docs.roocode.com/roo-code-cloud/roomote-control | ❓ Not Started | Cloud agent management |
| PocketFlow | https://github.com/The-Pocket/PocketFlow-Tutorial-Cursor | ❓ Not Started | Agent workflow tutorials |
| OpenHands | https://github.com/OpenHands/OpenHands | 📖 Fully Researched | Open-source autonomous coding |
| A2A | https://github.com/a2aproject/A2A | ❓ Not Started | Agent-to-Agent protocol |
| TaskSync | https://github.com/4regab/TaskSync | ❓ Not Started | Task synchronization |
| Agentic Ray | https://github.com/rayai-labs/agentic-ray | ❓ Not Started | Distributed agent execution |
| AgentDepot | https://github.com/biagruot/agentdepot-agents | ❓ Not Started | Agent registry |
| Pydantic DeepAgents | https://github.com/vstorm-co/pydantic-deepagents | ❓ Not Started | Type-safe agents |
| Agentic Playground | https://github.com/denniszielke/agentic-playground | ❓ Not Started | Testing environment |

### SDKs & Libraries

| Repository | URL | Status | Notes |
|------------|-----|--------|-------|
| CopilotKit | https://github.com/CopilotKit/CopilotKit | 📖 Fully Researched | React AI components |
| A2A UI | https://github.com/a2anet/a2a-ui | ❓ Not Started | A2A interface |
| AG-UI Protocol | https://github.com/ag-ui-protocol/ag-ui | ❓ Not Started | Agent UI spec |
| LangGraph | https://www.langchain.com/langgraph | 📖 Fully Researched | LangChain agent framework |
| CrewAI | https://www.crewai.com/ | 📖 Fully Researched | Multi-agent orchestration |
| SmolAgents | https://github.com/huggingface/smolagents | 📖 Fully Researched | Lightweight agents |

### Reference Implementations

| Repository | URL | Status | Notes |
|------------|-----|--------|-------|
| Building Agentic Code | https://benhouston3d.com/blog/building-an-agentic-code-from-scratch | ❓ Not Started | Tutorial |
| Parallel Coding Agents | https://simonwillison.net/2025/Oct/5/parallel-coding-agents/ | ❓ Not Started | Concept article |
| Gemini CLI Subagent | https://www.reddit.com/r/GithubCopilot/comments/1phnj0e/if_you_think_copilots_context_window_is_too_small/ | ❓ Not Started | Reddit discussion |
| Agent Client Protocol | https://agentclientprotocol.com/overview/agents | ❓ Not Started | Protocol specification |

---

## Integration Strategy

1. **Add as submodules** for reference
2. **Study orchestration patterns** (consensus, debate, supervision)
3. **Extract useful concepts** (A2A protocol, tool chaining, etc.)
4. **Implement agent council** with multi-model debate
5. **Build supervisor system** for autonomous task delegation
6. **Create agent spawning** and lifecycle management

---

## Hypercode Agent Architecture

Hypercode should implement:
- **Agent Council**: Multiple models debating high-stakes decisions
- **Supervisor Agent**: Orchestrates subagents for complex tasks
- **Autopilot**: Autonomous multi-step task execution
- **Handoff Protocol**: Seamless handoff between agents
- **Fallback System**: Automatic model switching on failure
- **Consensus Mechanism**: Voting for critical decisions
- **Subagent Registry**: Library of specialized subagents
- **Multi-Model Pair Programming**: Multiple models collaborating

---

## Research Tasks

- [ ] Study metamcp architecture in depth
- [ ] Analyze A2A protocol specification
- [ ] Research TaskSync prompt engineering
- [ ] Study OpenHands controller architecture
- [ ] Analyze Agent Client Protocol
- [ ] Extract patterns from all frameworks
- [ ] Design Hypercode agent council system
- [ ] Implement supervisor/autopilot
- [ ] Create agent registry and spawning system

---

## Related

- [Skills](../skills/README.md)
- [CLI Harnesses](../cli-harnesses/README.md)
