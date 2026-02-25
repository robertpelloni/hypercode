# VISION.md - Borg: The Neural Operating System

> **Version**: 2.7.23 | **Codename**: AIOS (AI Operating System)
> **Tagline**: *"The Ultimate AI Tool Dashboard & Development Orchestrator"*

---

## 1. Executive Summary

Borg is an all-in-one AI development platform that unifies every aspect of AI-assisted software development into a single, cohesive system. It combines an MCP router/aggregator, multi-model AI coding harness, universal memory system, agent orchestrator, provider manager, session controller, and full-featured WebUI dashboard — all extensible through a plugin architecture.

The core philosophy: **Why choose between competing tools when you can assimilate the best features from ALL of them?**

### The Ultimate Goal
To create a self-sustaining **Neural Operating System** where the "user" transitions from a coder to a Commander. Borg handles the "how" (coding, debugging, deployment via MCP tools) while you define the "what" (intent, vision, architecture). It aims for a future where a single developer can orchestrate the output of a 100-person engineering team through high-level intent directives, with Borg managing the swarm of specialized AI agents (Coder, Researcher, Tester, DevOps) to execute that vision autonomously.

Borg achieves feature parity with — and ultimately surpasses — every major AI coding CLI (OpenCode, Claude Code, Codex, Gemini CLI, Goose, Copilot CLI, Crush, CodeBuff, Kilo Code, Qwen Code, Warp CLI, Trae CLI), every MCP management tool (MetaMCP, MCPHub, PluggedIn, MCP-Proxy), every memory system (mem0, Supermemory, Letta, Zep, MemoryOS, Cognee), and every agent framework (OpenHands, AutoGen, Magentic-UI, Claude Squad).

---

## 2. Core Vision Pillars

### 2.1 MCP Router / Aggregator — The Ultimate MCP Hub

The MCP subsystem is the nervous system of Borg. It acts as both an MCP **client** (consuming tools from many servers) and an MCP **server** (presenting a unified "master" MCP to external consumers like Claude, Cursor, VS Code, etc.).

**Key Capabilities:**
- **Multi-Server Aggregation**: Combine 100+ MCP servers into one master interface
- **Namespace Isolation**: Group servers and tools into logical namespaces (e.g., `code.*`, `memory.*`, `browser.*`)
- **Session Management**: Handle MCP session lifecycle — auto-start, restart on crash, keep-alive heartbeat, timeout management
- **Single-Instance Multi-Client**: One running instance serves multiple AI clients simultaneously without duplication
- **Traffic Inspection**: Real-time MCP message inspector showing all JSON-RPC traffic with latency, direction, method, params, and results
- **Tool Reranking**: Automatically reorder tools by relevance, usage frequency, and semantic similarity to current task
- **Semantic Tool Search**: Find tools by natural language description, not just name
- **Progressive Tool Disclosure**: Start with essential tools, dynamically load more as needed to minimize context usage
- **Tool RAG**: Retrieve tools from a large registry using embedding-based search
- **TOON Format**: Tool-Optimized Output Notation for minimal-context tool descriptions
- **Code Mode**: Represent tools as callable code functions instead of JSON schema
- **Tool Renaming**: Automatically rename tools to minimize context tokens while preserving clarity
- **Tool Chaining**: Define and execute multi-tool workflows as single operations
- **MCP Directory**: Built-in directory of available MCP servers with ratings, categories, and one-click install
- **Auto-Install**: Automatically install MCP servers from npm, pip, or GitHub
- **Config Sync**: Auto-detect and write MCP configs for Claude Desktop, Cursor, VS Code, Windsurf, OpenCode, and custom clients
- **Import/Export**: Full MCP configuration import/export in JSON/JSONC format
- **Proxy Capabilities**: stdio↔remote, SSE↔streamable-HTTP, any transport conversion
- **Auth Management**: Handle OAuth 2.0, bearer tokens, API keys per MCP server
- **Health Monitoring**: Per-server latency tracking, error rates, memory usage, auto-restart on failure
- **Environment Variables**: Per-server env var management, .env file support, secret injection

### 2.2 AI Coding Harness — Feature Parity With All CLI Tools

Borg IS the CLI coding tool. Not a wrapper around other tools — a complete, native implementation with feature parity across ALL major CLI harnesses.

**Feature Parity Targets:**
- OpenCode: Plugin system, multi-provider, LSP integration, context management
- Claude Code: Agentic loop, tool use, file editing, bash execution
- Codex: Sandboxed execution, code generation, multi-file editing
- Gemini CLI: Large context, multi-modal, Google integration
- Goose CLI: Extensible toolkits, session management
- Copilot CLI: GitHub integration, PR management, code review
- Crush: TUI beauty, responsive design
- CodeBuff: Speed, minimal overhead
- Kilo Code: Cost tracking, model selection
- Qwen Code: Open model support
- Warp CLI: Terminal integration, blocks
- Trae CLI: Project understanding

**Core Harness Features:**
- Multi-model support: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, OpenRouter, Copilot, Antigravity, local models
- Agentic loop with tool use (file read/write, bash, search, LSP)
- Code indexing and semantic code search
- AST-aware code understanding with tree-sitter
- LSP integration for diagnostics, definitions, references
- Ripgrep-powered fast search
- Git integration (status, diff, commit, PR creation)
- Context management: automatic pruning, harvesting, compaction
- Session persistence and resumption
- Slash commands and hooks
- Plugin system for extensibility

### 2.3 Memory System — Universal, Multi-Backend, Intelligent

Memory is Borg's long-term brain. It supports multiple storage backends simultaneously, with automatic harvesting, pruning, and retrieval.

**Storage Backends (Plugin-Based, Selectable/Combinable):**
- File-based (Markdown, JSON)
- SQLite (local, fast)
- PostgreSQL (scalable, shared)
- ChromaDB (vector embeddings)
- Qdrant (high-performance vectors)
- pgvector (Postgres + vectors)
- mem0 (structured memory)
- Supermemory (cloud memory)
- Letta (agent memory)
- Zep (conversation memory)
- Custom backend plugins

**Memory Types:**
- **Short-term**: Current session context, recent messages
- **Medium-term**: Cross-session project knowledge, recent decisions
- **Long-term**: Persistent knowledge, user preferences, learned patterns
- **Episodic**: Timestamped event memories
- **Semantic**: Concept and knowledge graph
- **Procedural**: How-to and workflow memories

**Intelligent Features:**
- Automatic context harvesting: Extract key info from conversations
- Smart pruning: Remove redundant/outdated memories
- Reranking: Prioritize relevant memories for current context
- Semantic search: Find memories by meaning, not just keywords
- Import/Export: Convert between any memory format
- Auto-detection: Find and import memories from other tools
- Browser integration: Store memories from web browsing
- Embedding-based retrieval with configurable models
- Memory visualization dashboard

### 2.4 Agent Orchestrator — Multi-Model Intelligence

Borg orchestrates multiple AI models working together, each with specialized roles.

**Orchestration Patterns:**
- **Director/Council/Supervisor**: A Director agent oversees development, consulting a Council of diverse models for decisions, with a Supervisor ensuring quality
- **Architect-Implementer**: One model plans, another implements
- **Multi-Model Debate**: Multiple models discuss a problem from different perspectives
- **Consensus Protocol**: Models vote on decisions (majority, unanimous, weighted, debate format)
- **Pair Programming**: Two models collaboratively write code
- **Swarm**: Multiple lightweight agents tackle independent subtasks

**Agent Capabilities:**
- Spawn agents from any provider/model
- Agent definitions library with pre-configured personas
- Per-agent system prompts, temperature, tool access
- Inter-agent communication via shared context
- Agent session isolation and resource management
- Fallback chains: When one model hits quota, seamlessly switch to next
- Cost tracking per agent

### 2.5 Provider Management — Intelligent, Quota-Aware

**Provider Features:**
- Configure multiple providers: OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, OpenRouter, Copilot, Antigravity, local
- OAuth login for subscription services: Claude Max/Pro, Google AI Plus, Copilot Premium Plus, ChatGPT Plus, OpenCode Black
- API key management with encryption
- Per-provider quota tracking with visual dashboards
- **Automatic Fallback**: When one provider's quota is exhausted, automatically switch to the next best model
- **Smart Selection**: Choose models based on task type, cost, speed, quota remaining
- **Billing Dashboard**: Real-time usage, cost projections, reset dates
- **Free Tier Optimization**: Maximize usage of free tiers across providers (OpenCode, Cursor, Kilo Code, Windsurf, OpenRouter, Copilot)

### 2.6 Session Management — Never Lose Progress

**Session Features:**
- Track all development sessions with full history
- Auto-restart crashed sessions
- Pause/resume sessions
- Export/import sessions (JSON, Markdown)
- Cloud dev integration: Jules, Devin, Codex remote sessions
- Transfer tasks between local and cloud
- Broadcast messages to all sessions
- Remote management from mobile
- Auto-start previous sessions on boot
- Session search and filtering

### 2.7 WebUI Dashboard — Full Control Center

A comprehensive React web dashboard providing visual management of all Borg subsystems.

**Dashboard Panels:**
- **Overview**: System health, quick stats, recent activity feed
- **MCP Router**: Server management, tool browser, traffic inspector, config editor, MCP directory
- **Memory**: Browse, search, import/export, backend config, visualization
- **Agents**: Agent library, spawn/manage, live chat, metrics
- **Sessions**: Active sessions, cloud sessions, history, export
- **Providers**: Quota dashboards, OAuth login, fallback chain editor
- **Tools**: Tool browser, groups, semantic search, enable/disable
- **Skills**: Skill library, import, install
- **Config**: Full configuration editor with all subsystems
- **About**: Version, submodule dashboard, project structure

**UI Principles:**
- Dark neural theme (deep blues, purples, green accents)
- Responsive layout with collapsible sidebar
- Real-time data with WebSocket updates
- Comprehensive tooltips on every element
- Keyboard shortcuts for power users
- Mobile-responsive for remote management

### 2.8 Browser Extension — Web AI Integration

**Extension Features:**
- Store memories from web browsing
- Connect MCP servers to browser AI chats (ChatGPT, Claude, Gemini, Grok)
- Import/export browser sessions
- Read browser debug console
- Web search integration
- Computer/browser use automation
- Access Borg dashboard from browser toolbar

### 2.9 RAG & Document Processing

**RAG Features:**
- Multiple chunking strategies (fixed, semantic, code-aware)
- Multiple embedding models (OpenAI, Cohere, local)
- Document intake: PDF, Markdown, HTML, code files, images (OCR)
- Summarization pipeline
- Google Docs/Drive integration
- Retrieval with reranking
- Context window optimization

### 2.10 Plugin Architecture — Extensible Everything

Every major feature is implemented as a plugin-capable module:
- Direct code integration for performance
- MCP server wrapper for external access
- Plugin interface for extensibility
- Hot-reload for development

---

## 3. Architecture

### 3.1 Monorepo Structure

```
borg/
├── packages/
│   ├── types/      # Shared TypeScript types & Zod schemas
│   ├── core/       # Backend server (Express/tRPC), MCP router, orchestrator
│   ├── ai/         # LLM service, model selector, forge
│   ├── agents/     # Director, Council, Supervisor, orchestration
│   ├── tools/      # File, terminal, browser, chain executor, all tools
│   ├── search/     # Search service (semantic, ripgrep, AST)
│   ├── memory/     # Memory backends, vector store, graph, indexer
│   ├── adk/        # Agent Development Kit interfaces
│   └── cli/        # Commander.js CLI application
├── webui/          # Vite + React + Tailwind dashboard
├── docs/           # Comprehensive documentation
├── references/     # 200+ submodule reference implementations
└── VERSION.md      # Single source of truth for version
```

### 3.2 Technology Stack

- **Runtime**: Node.js with TypeScript ESM
- **Backend**: Express + tRPC + WebSocket + MCP SDK
- **CLI**: Commander.js with chalk, cli-table3
- **WebUI**: Vite + React 19 + Tailwind CSS + Lucide icons
- **Database**: SQLite (default), PostgreSQL (production)
- **Vector Store**: ChromaDB, Qdrant, pgvector (selectable)
- **MCP**: @modelcontextprotocol/sdk for client/server
- **Build**: pnpm + Turborepo
- **Test**: Vitest

### 3.3 Process Architecture

- Main process: Core server (Express/tRPC/WebSocket/MCP)
- Worker threads: Per-model agent execution (isolated, crash-safe)
- Child processes: MCP server instances (stdio transport)
- WebSocket: Real-time dashboard communication
- File watchers: Config hot-reload, session monitoring

---

## 4. Feature Parity Matrix

| Feature | OpenCode | Claude | Codex | Gemini | Borg |
|---------|----------|--------|-------|--------|------|
| Multi-model | ✓ | ✗ | ✗ | ✗ | ✓ |
| Plugin system | ✓ | ✗ | ✗ | ✗ | ✓ |
| MCP client | ✓ | ✓ | ✗ | ✓ | ✓ |
| MCP server | ✗ | ✗ | ✗ | ✗ | ✓ |
| WebUI | ✓ | ✗ | ✗ | ✗ | ✓ |
| Memory | Plugin | ✗ | ✗ | ✗ | ✓ |
| Multi-agent | ✗ | ✗ | ✗ | ✗ | ✓ |
| Auto-fallback | ✗ | ✗ | ✗ | ✗ | ✓ |
| Billing | ✗ | ✗ | ✗ | ✗ | ✓ |
| Browser ext | ✗ | ✗ | ✗ | ✗ | ✓ |
| Session mgmt | ✗ | ✗ | ✗ | ✗ | ✓ |
| RAG | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 5. Design Philosophy

1. **Assimilate, Don't Replicate**: Every referenced tool's best features are integrated, not just copied
2. **Plugin-First**: Each subsystem works standalone AND as part of the whole
3. **Context Efficiency**: Minimize token usage through TOON format, progressive disclosure, smart pruning
4. **Fail Gracefully**: Worker isolation, auto-restart, fallback chains — the system never fully crashes
5. **Document Everything**: Every feature has JSDoc, CLI help, UI tooltips, and manual documentation
6. **Single Source of Truth**: One VERSION.md, one config system, one memory store accessed many ways
7. **Submodule as Reference**: 200+ submodules provide reference implementations, not runtime dependencies

---

## 6. Roadmap Summary

- **v2.5.0**: Core engine rebuild, full CLI, WebUI dashboard, documentation overhaul
- **v2.6.0**: MCP router feature completion, provider fallback system, billing dashboard
- **v2.6.3**: Build stabilization — 90+ `@ts-ignore` removed, 17+ component fixes, codebase hardening complete
- **v2.7.0** (Current): MetaMCP submodule assimilation, AI Command Center dashboards, Marketplace & Ecosystem
- **v2.8.0**: Memory system multi-backend, RAG pipeline, automatic context harvesting
- **v2.9.0**: Browser extension, session management, cloud dev integration
- **v3.0.0**: Full feature parity with all referenced tools, production-ready release

---

*"Resistance is futile. Your tools will be assimilated."*
