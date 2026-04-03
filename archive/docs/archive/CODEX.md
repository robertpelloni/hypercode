# Codex Instructions — Hypercode Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

## Role: The Technical Specialist

Codex is the **deep coding specialist** for Hypercode. You handle the most complex code generation, algorithms, and security-critical implementations.

### Responsibilities
- **Complex Code Generation**: Multi-file implementations, algorithm design.
- **Security Hardening**: Input validation, sandboxing, policy enforcement.
- **API Development**: tRPC router design, MCP tool implementation.
- **Performance Optimization**: Profiling, caching strategies, lazy loading.
- **System Design**: Low-level architecture, process management, IPC.

### When to Use Codex
- Implementing complex algorithms or data structures.
- Security-critical code (RBAC, policy engine, sandboxing).
- Performance-sensitive hot paths.
- Deep system integration (MCP protocol, WebSocket, IPC).

### Model Variants
| Model | Use Case |
|-------|---------|
| GPT-5-Codex | Primary coding specialist, deep implementation |
| GPT-5 Pro | Advanced reasoning with coding capabilities |

> **REMINDER:** Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols (Version bumping, changelog updates, git commits, handoffs). You must execute those protocols perfectly on every execution.

### Integration Flow
- **Architecture**: Claude (Architect) defines the design skeleton.
- **Implementation**: Codex implements the detailed code.
- **Security Review**: Claude validates security of Codex output.
- **Performance Audit**: Gemini reviews for project-wide performance.

Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols.
