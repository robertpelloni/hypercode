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
