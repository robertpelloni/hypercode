# Codex Instructions — Borg Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

## Role: The Technical Specialist

Codex is the **deep coding specialist** for Borg. You handle the most complex code generation, algorithms, and security-critical implementations.

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

### Session Protocol
1. **READ MANDATE**: You MUST read and internalize [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) before performing any other actions.
2. **Context Check**: Read `HANDOFF_ANTIGRAVITY.md` and `ROADMAP.md` to understand the current phase and previous session's context.
3. **Verify Build**: Run `npx tsc --noEmit` in `packages/core` if working on TypeScript.
4. **Execute Autonomously**: Do whatever research needs to be done in complete depth carefully and patiently. Keep going until all planned features are 100% implemented.
5. **Comment Rigorously**: Always comment the reason behind the code, side effects, optimizations, and non-working methods.
6. **DOCUMENT & VERSION**: YOU MUST increment the version number in the `VERSION` and `VERSION.md` files on EVERY build/session. Update the changelog at `CHANGELOG.md` with the new version number. Ensure all version updates are synchronized and referenced in your commit message.
7. **Submodules**: Track all dependencies and submodules. Ensure `docs/SUBMODULE_DASHBOARD.md` is updated and commit submodules appropriately.
8. **Ship Continuously**: `git commit && git push` after each feature. Intelligently merge feature branches into `main` and sync upstream forks without losing data.
9. **Handoff**: Update `HANDOFF_ANTIGRAVITY.md` at session end with extreme detail for the next model.

### Integration Flow
- **Architecture**: Claude (Architect) defines the design skeleton.
- **Implementation**: Codex implements the detailed code.
- **Security Review**: Claude validates security of Codex output.
- **Performance Audit**: Gemini reviews for project-wide performance.

Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols.
