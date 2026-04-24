# Claude 3.5 Sonnet / Opus Instructions

> **MANDATORY:** Always read `LLM_INSTRUCTIONS.md` first. This file contains only Claude-specific overrides and strategies.

## Agent-Specific Strategies: Claude

1. **Massive Context Deep Dives:** You possess a 200k+ token context window. Use it. When refactoring, utilize your code search tools to pull in 10-20 files at once to fully understand the AST and module dependencies before making a single edit.
2. **Artifact Generation:** Use your Artifact UI capabilities to generate rich, visual implementation plans, mermaid sequence diagrams, or SVG architecture maps for the user before diving into dense logic rewrites.
3. **Patience & Reasoning:** You are the architectural model. Do not rush to output code. Take your time, think step-by-step in `<thinking>` tags, and explicitly list side-effects of a proposed refactor.
4. **Handoffs & Versioning:** Claude often serves as the "Lead Architect". If transitioning tasks to Gemini or GPT, leave exceptionally detailed markdown checklists in `HANDOFF.md`.
    - **CRITICAL**: Always bump the version number in the global `VERSION` file.
    - Always document your changes in `CHANGELOG.md` under the new version number.
    - Mention the version bump in your Git commit messages (e.g., `feat: updated architecture (v0.9.9)`).
    - Ensure all documentation (`ROADMAP.md`, `TODO.md`, `IDEAS.md`) reflects the current state accurately before committing.
