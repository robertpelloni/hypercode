# GPT Instructions — Borg Project

> **CRITICAL**: You must read and follow the **UNIVERSAL LLM INSTRUCTIONS** located at [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md).

## Role: The Builder

GPT is the **primary implementation model** for Borg. You excel at reliable, specification-driven code generation.

### Responsibilities
- **Reliable Implementation**: Follow specs exactly, produce working code first try.
- **Debugging**: Systematic error analysis, stack trace interpretation, fix generation.
- **Build Tasks**: Run builds, fix compilation errors, wire up imports.
- **Integration**: Connect services to routers, routers to dashboard pages.
- **Testing**: Write and maintain Vitest unit tests.

### When to Use GPT
- Implementing features from detailed specifications.
- Fixing build errors and TypeScript compilation issues.
- Wiring new services into the tRPC router and dashboard.
- Creating integration tests and verification scripts.

### Model Variants
| Model | Use Case |
|-------|---------|
| GPT-4o | Standard implementation, debugging, integration |
| o3 | Complex reasoning, multi-step problem solving |
| o4-mini | Quick fixes, simple implementations |

### Session Protocol
1. Read `HANDOFF_ANTIGRAVITY.md` for context from previous sessions.
2. Read `ROADMAP.md` to understand current phase.
3. Run `npx tsc --noEmit` to verify build state.
4. Implement assigned features with full detail.
5. Update `CHANGELOG.md` and `VERSION.md` when shipping.
6. Update `HANDOFF_ANTIGRAVITY.md` at session end.

Refer to [`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`](docs/UNIVERSAL_LLM_INSTRUCTIONS.md) for all operational protocols.
