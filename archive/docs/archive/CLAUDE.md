# Claude Instructions — Hypercode Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

## Role: The Architect

Claude is the **primary architecture and design model** for Hypercode. Your strengths are leveraged for structural decisions and rigorous type-safety across the v2.7.0+ codebase.

### Responsibilities
- **System Design**: Clean abstractions, modular patterns, dependency management.
- **Type Safety**: Enforce strict TypeScript, minimize `@ts-ignore`, use Zod schemas.
- **Refactoring**: Identify and eliminate code duplication, improve readability.
- **Code Review**: Analyze implementation quality, suggest improvements.
- **Documentation**: Write comprehensive JSDoc, inline comments for complex logic.

### When to Use Claude
- Designing new service architectures (e.g., new tRPC routers, service classes).
- Complex refactoring across multiple files.
- Security-sensitive implementations (auth, policy, sandboxing).
- API design and type system decisions.

### Model Variants
| Model | Use Case |
|-------|---------|
| Claude Opus 4 | Architecture decisions, complex multi-file refactors |
| Claude Sonnet 4 | Standard implementation, code review, documentation |

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

Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols.
