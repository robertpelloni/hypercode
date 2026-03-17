# MCP & Context Features Master List

> **Compiled from research on**: MetaMCP, MCP Tool Chainer, TOON Format, Code Mode, Beads
> **Last Updated**: 2026-02-02

## MCP Router/Aggregator Features

### Core MCP Management
- [ ] Aggregate multiple MCP servers into single proxy
- [ ] Dynamic configuration via GUI
- [ ] Multi-workspace support
- [ ] Namespace isolation for tools
- [ ] Universal client compatibility (Claude, Cursor, Windsurf)
- [ ] Local and secure operation
- [ ] One-click MCP installation (marketplace)
- [ ] Tool cherry-picking when remixing servers
- [ ] Pluggable middleware (observability, security)
- [ ] Enhanced MCP inspector

### Authentication
- [ ] Basic OAuth
- [ ] Session cookies
- [ ] API key authentication
- [ ] OpenID Connect (OIDC) / Enterprise SSO

### MCP Tool Chaining
- [ ] Chain multiple tools in single operation
- [ ] CHAIN_RESULT placeholders for intermediate outputs
- [ ] JsonPath input/output filtering
- [ ] Automatic tool discovery from all configured servers
- [ ] Token usage reduction (vs individual calls)

---

## Progressive Tool Disclosure Features

### Dynamic Loading
- [ ] Load tools on-demand, not at startup
- [ ] Prevent context window bloat
- [ ] Dynamic tool registration
- [ ] Incremental discovery

### Meta-Tool Pattern
- [ ] Generic meta-tools instead of all tool definitions
- [ ] LLM writes code to orchestrate specific tools
- [ ] 50%+ cost reduction
- [ ] 94% context usage reduction

---

## Code Mode Features

### Core Concept
- [ ] LLM generates code to call tools (Python/Starlark, TypeScript)
- [ ] Execute in secure sandbox (Deno, etc.)
- [ ] Intermediate results processed in sandbox, not LLM context
- [ ] Dynamic tool discovery on demand

### Capabilities
- [ ] Tool chaining via code
- [ ] Variables and state management
- [ ] Loops and conditionals
- [ ] Reusable "skills" as code

---

## TOON Format Features

### Token Efficiency
- [ ] 30-60% token reduction vs JSON
- [ ] Remove redundant syntax (braces, quotes)
- [ ] Schema-aware encoding
- [ ] Lossless/reversible to JSON

### Structure
- [ ] Array name & length declaration
- [ ] Field names declared once
- [ ] Data rows with comma-separated values
- [ ] Indentation for nesting (like YAML)
- [ ] Automatic type inference

---

## Beads Context Format Features

### Git-Based Storage
- [ ] Issues stored as JSONL in `.beads/` directory
- [ ] Versioned, branched, merged with code
- [ ] Hash-based IDs prevent merge conflicts
- [ ] SQLite cache for fast queries

### Dependency Tracking
- [ ] `blocks` (hard dependency)
- [ ] `related` (soft connection)
- [ ] `parent-child` (hierarchical)
- [ ] `discovered-from` (tracking origin)

### Context Efficiency
- [ ] Compact, relevant context for LLMs
- [ ] Semantic memory decay (summarize old tasks)
- [ ] Ready-to-work task detection
- [ ] Small, targeted queries

### CLI Commands
- [ ] `bd ready` - list unblocked tasks
- [ ] `bd create` - add new issues
- [ ] `bd dep add` - link tasks

---

## A2A Protocol Features (Agent-to-Agent)

### Core Protocol
- [ ] Open standard (Apache 2.0)
- [ ] JSON-RPC 2.0 over HTTP(S)
- [ ] Agent Cards (capability discovery)
- [ ] Directory system for trust

### Interaction Patterns
- [ ] Synchronous request/response
- [ ] Streaming (SSE)
- [ ] Asynchronous push notifications
- [ ] Long-running task support

### Data Exchange
- [ ] Text, files, structured JSON
- [ ] Audio, video streams
- [ ] Rich UI interactions (forms)

### Security
- [ ] OAuth 2.0
- [ ] Digital signatures
- [ ] Role-Based Access Control (RBAC)
- [ ] End-to-end encryption

### SDKs
- [ ] Python SDK
- [ ] JavaScript/TypeScript SDK
- [ ] Java SDK
- [ ] .NET SDK
