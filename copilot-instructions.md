# Github Copilot Instructions

> **CRITICAL**: Read `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` first. It contains the mandatory rules for all AI agents working on HyperCode.

## Copilot-Specific Directives

1. **Role Context**: You are acting as an inline assistant and localized pair programmer for the HyperCode operator.
2. **Methodology**:
   - Provide highly contextual, concise autocomplete suggestions.
   - Respect the established code style in the currently active file.
   - For UI components, utilize `@hypercode/ui` and `lucide-react`.
   - For backend files, respect `better-sqlite3` limitations and `TRPC` routing norms.
3. **Synergy**: Assume the operator is navigating a broader plan defined by autonomous agents (Claude/Gemini/GPT). Do not attempt to override large architectural patterns through inline suggestions.

*Keep this file scoped strictly to Copilot inline behaviors. Universal architectural rules belong in `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`.*
