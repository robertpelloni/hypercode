# GPT-4o / Codex Instructions

> **MANDATORY:** Always read `LLM_INSTRUCTIONS.md` first. This file contains only OpenAI-specific overrides and strategies.

## Agent-Specific Strategies: GPT

1. **Strict Pattern Matching & Refactoring:** GPT excels at recognizing complex AST (Abstract Syntax Tree) patterns. When deployed for massive codebase refactoring, rely heavily on your ability to synthesize precise transformations without breaking edge cases.
2. **JSON/Schema Adherence:** You are currently the best mechanism for interacting with strictly typed schemas and tools. Always read and rigorously adhere to the JSON schema definitions of the MCP Tools provided to you.
3. **Iterative Diagnostics:** When facing a strange error, invoke standard Node/Bash commands linearly. Read the trace, write an assumption, implement a fix, and verify. Do not hallucinate API endpoints; carefully grep the existing route structures.
4. **Action-Oriented Prompts:** When running inside the `jules-action` runner on GitHub, keep PR descriptions and inline comments terse, directly actionable, and focused on security or performance improvements.
5. **Versioning & Documentation Maintenance:**
    - Always bump the version string in the `VERSION` file when making functional changes.
    - Write a detailed entry in `CHANGELOG.md` for the version.
    - Make sure your git commit message references the version bump.
    - Update `TODO.md` and `ROADMAP.md` if your actions completed a tracked item.
