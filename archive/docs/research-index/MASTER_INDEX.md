# Hypercode Universal Resource Index

**Purpose**: Comprehensive index of all AI tools, MCP servers, libraries, frameworks, CLIs, and resources researched and integrated into Hypercode.

**Last Updated**: 2026-01-17

**Status**: ✅ IMPLEMENTATION COMPLETE - Ultimate MCP Router Phase Done

---

## Index Structure

Each entry follows this format:
- **Repository/Resource Name**: Description, relevance rating, integration status, research status

### Legend
- **Relevance Rating**: 🟢 Critical | 🟡 High | 🟠 Medium | 🔵 Low | ⚪ Reference Only
- **Integration Status**: ✅ Integrated | 🔄 In Progress | 📋 Planned | ⏸️ Deferred | ❌ Not Applicable
- **Research Status**: 📖 Fully Researched | 📄 Partially Researched | 🔬 Research In Progress | ❓ Not Started

---

## Categories

### [MCP Directories](./mcp-directories/README.md)
- Aggregated lists of MCP servers for discovery and installation

### [Skills](./skills/README.md)
- Skill definitions, hooks, slash commands, agent configurations

### [Multi-Agent Orchestration](./multi-agent/README.md)
- SDKs, frameworks, and systems for multi-agent coordination

### [CLI Harnesses](./cli-harnesses/README.md)
- Command-line AI coding tools (OpenCode, Claude Code, Codebuff, etc.)

### [Memory Systems](./memory-systems/README.md)
- Short-term, long-term, archival memory systems and vector stores

### [MCP Tool RAG / Disclosure](./mcp-tool-rag/README.md)
- Dynamic tool loading, semantic search, progressive disclosure

### [Ultimate MCP Router](./IMPLEMENTATION_COMPLETE.md) ✅ NEW
- Complete implementation with 4 core services
- Registry discovery, server management, configuration, session lifecycle

### [RAG Systems](./rag-systems/README.md)
- Document parsing, embedding, retrieval systems

### [Computer Use / Browser](./computer-use/README.md)
- Computer control, browser automation, screen interaction

### [Code Indexing](./code-indexing/README.md)
- Code understanding, AST analysis, semantic code search

### [Browsers](./browsers/README.md)
- Browser extensions, browser-based AI interfaces

### [Routers / Providers](./routers-providers/README.md)
- API gateways, model routing, provider management

### [Miscellaneous](./misc/README.md)
- Uncategorized or cross-category resources

---

## Quick Stats

- **Total Resources Tracked**: 200+
- **Submodules Added**: 50+
- **Fully Researched**: 20+ categories
- **In Progress**: Implementation phase complete
- **Not Started**: Remaining research tasks

---

## Core Implementations Created

### [Ultimate MCP Router](./IMPLEMENTATION_COMPLETE.md) - ✅ IMPLEMENTED

**Created**: 2026-01-17
**Status**: ✅ COMPLETE

#### Services Created:
| Service | File | Status |
|---------|------|--------|
| MCPRegistryService | `packages/core/src/services/MCPRegistryService.ts` | ✅ |
| ServerRegistryService | `packages/core/src/services/ServerRegistryService.ts` | ✅ |
| ConfigurationService | `packages/core/src/services/ConfigurationService.ts` | ✅ |
| McpSessionService | `packages/core/src/services/McpSessionService.ts` | ✅ |

#### Documentation Created:
| Document | File | Description |
|----------|------|-------------|
| Integration Guide | `MCP_ROUTER_INTEGRATION_GUIDE.md` | Integration guide for McpProxyManager |
| Implementation Complete | `IMPLEMENTATION_COMPLETE.md` | Final implementation summary |
| Examples | `packages/core/src/examples/` | 4 usage examples |

---

## Integration Priority Matrix

### Critical (Must Implement)
- ~~MCP router/aggregator with universal management~~ ✅ IMPLEMENTED
- ~~Progressive tool disclosure and semantic tool search~~ ✅ IMPLEMENTED
- ~~Memory system with multi-backend support~~ Existing in codebase
- Code indexing and understanding
- Multi-agent orchestration

### High (Strongly Recommended)
- Context pruning and summarization
- Tool chaining and code mode
- Computer-use and browser automation
- Session management and history
- Usage/billing tracking

### Medium (Nice to Have)
- RAG integration
- NotebookLM functionality
- Browser extension
- Mobile remote control

---

## Changelog

### 2026-01-17
- Created research infrastructure and directory structure
- Established master index template
- Created categorization system
- Started submodule audit phase
- ✅ **IMPLEMENTED Ultimate MCP Router** (4 core services + 5 examples + 4 docs)
  - MCPRegistryService (server discovery from 100+ registries)
  - ServerRegistryService (install, update, health management)
  - ConfigurationService (auto-detect, multi-format, env/secrets)
  - McpSessionService (auto-start, auto-restart, keep-alive, latency tracking)
  - 5 usage examples including end-to-end workflow
  - Integration guide with API routes
  - Implementation complete summary
  - Final summary with architecture diagram
- Updated services index exports and master index
---

## Notes

### Deduplication Strategy
- Cross-reference URLs to identify duplicates
- Merge information from multiple sources about same project
- Track forks and original repositories

### Integration Approach
1. Add as submodule for reference
2. Research thoroughly (docs, source, issues, PRs)
3. Categorize and document features
4. Assess relevance to Hypercode goals
5. Decide: Wrap | Call Directly | Reimplement | Reference Only
6. Document decision and reasoning

### Feature Parity Tracking
For each CLI harness, track parity status:
- OpenCode: ⏸️
- Claude Code: ⏸️
- Codebuff: ⏸️
- Codex: ⏸️
- Copilot CLI: ⏸️
- Crush: ⏸️
- Factory: ⏸️
- Gemini CLI: ⏸️
- Goose CLI: ⏸️
- Grok Build: ⏸️
- Kilo Code: ⏸️
- Kimi CLI: ⏸️
- Mistral Vibe: ⏸️
- Qwen Code: ⏸️
- Warp: ⏸️
- Trae: ⏸️

### MCP Architecture Notes

Hypercode should serve as both:
1. **Ultimate MCP Client**: Aggregating, routing, traffic inspection, progressive disclosure
2. **Ultimate MCP Server**: Universal configuration, session management, tool grouping

**UPDATE (2026-01-17)**: Ultimate MCP Router implementation is COMPLETE with 4 core services created in `packages/core/src/services/`:

| Service | Purpose |
|---------|---------|
| MCPRegistryService | Discover servers from external registries |
| ServerRegistryService | Install/update servers from GitHub/npm |
| ConfigurationService | Auto-detect configs, expand env/secrets |
| McpSessionService | Auto-start, auto-restart, keep-alive, latency tracking |

See `IMPLEMENTATION_COMPLETE.md` for full details and integration guide.

Key features to implement:
- Single instance with multiple client support ✅
- Latency monitoring and health checks ✅
- Auto-start, auto-restart ✅
- Tool namespace/group management ✅
- Dynamic loading/unloading
- Traffic inspection and logging ✅
- TOON format support ✅
- Code mode implementation

---

## References

- [Hypercode Vision](../VISION.md)
- [Hypercode Roadmap](../ROADMAP.md)
- [Submodules Guide](../SUBMODULES.md)
- [Memory Architecture](../memory/ARCHITECTURE.md)
