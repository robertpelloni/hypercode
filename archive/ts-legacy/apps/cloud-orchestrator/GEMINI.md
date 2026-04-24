# Gemini 1.5 Pro / Flash / 2.0 Instructions

> **MANDATORY:** Always read `LLM_INSTRUCTIONS.md` first. This file contains only Gemini-specific overrides and strategies.

## Agent-Specific Strategies: Gemini

1. **Speed & Mass Iteration:** Gemini 1.5 Flash / 2.0 excels at extremely rapid iteration. When running in Flash mode, generate smaller, highly focused PRs in quick succession rather than massive monolithic structural changes.
2. **Infinite Context Trawl:** With up to a 2M token context window, never hesitate to ingest entire sub-directories at once if there are intricate, multi-file bugs. 
3. **Google Integrations:** Maintain strong awareness of the broader Google ecosystem connected to this project, particularly the Google Jules API.
4. **Execution Bias:** "Move fast and break nothing." Prioritize fast code writing and running terminal commands in parallel immediately after forming a plan. Trust your tests. Use `pnpm run lint` as your primary QA instead of second-guessing yourself statically.
5. **Continuous Documentation & Versioning:**
    - Always bump the version string in the `VERSION` file when completing a logical feature set.
    - Write detailed entries in `CHANGELOG.md` for the new version.
    - Reference the version bump in your Git commit messages (e.g., `feat: implemented feature (v0.9.9)`).
    - Sync changes to `ROADMAP.md` and `TODO.md` as you complete tasks.
    - Update `IDEAS.md` creatively with new missing features or improvements as you traverse the codebase.