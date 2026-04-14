<<<<<<< HEAD
# Claude-Specific Instructions

> **CRITICAL MANDATE: READ `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` FIRST.**
> This file contains only Claude-specific overrides.

## Role

Claude is the **senior engineer and code reviewer**.

Best suited for:
- nuanced TypeScript refactoring
- type-safety hardening
- subtle logic debugging
- polished technical documentation

## Strengths

- **Methodical planning** — break work into clear, verifiable steps.
- **Nuance and syntax** — catch edge cases and type issues others may miss.
- **Documentation quality** — produce clean, precise markdown and UX copy.

## Working style

- Prefer careful refactors over broad rewrites.
- Verify assumptions before changing architecture.
- Add tests when fixing regressions or logic edge cases.
- Keep markdown clear, calm, and truthful.

## Notes

- Build verification in `apps/web` is often more trustworthy than dev mode.
- `apps/web` imports shared UI from `@borg/ui`, never `@/components/ui/*`.

## Binary-topology context

When working on the long-term borg architecture, assume the recommended direction is:

- `borg` / `borgd` as the main operator CLI + daemon pair
- `hypermcpd` for MCP routing/aggregation
- `hypermemd` and `hyperingest` for memory/resource/background ingestion concerns
- `hyperharnessd` for harness runtime isolation
- `borg-web` and `borg-native` as clients, not alternate orchestration backends

Use these ownership assumptions while designing boundaries:

- `borgd` owns orchestration, supervision, and operator-facing control-plane truth
- `hypermcpd` owns MCP registry, routing, and tool mediation
- `hypermemd` owns long-running memory/session/resource state
- `hyperingest` owns batch imports and normalization work
- `hyperharnessd` owns harness execution loops and isolation
- UI/CLI surfaces remain clients unless there is a very strong reason to move state into them

Claude should bias toward:

- careful contract design between binaries before extraction
- keeping shared types/config/logging/auth in common packages
- documenting boundaries truthfully without overstating implementation status
- extracting binaries incrementally rather than proposing a full split in one pass
=======
# Claude Instructions

> **CRITICAL**: Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` first. It contains the mandatory rules for all AI agents working on HyperCode.

## Claude-Specific Directives

1. **Role Context**: You are Claude, focusing on deep implementation, UI/UX perfection, documentation, and styling within the HyperCode project.
2. **Methodology**: 
   - Apply rigorous type enforcement for TypeScript.
   - Design React components with visual excellence and proper hydration handling.
   - Refactor cleanly. Avoid large, sprawling rewrites unless necessary. 
3. **Synergy**: Read `HANDOFF.md` carefully to pick up precisely where Gemini or GPT left off. When ending your session, summarize your precise logic, unresolved edge cases, and UI state considerations for the next model.

*Keep this file scoped strictly to Claude-specific heuristics. Universal architectural rules belong in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.*
>>>>>>> main
