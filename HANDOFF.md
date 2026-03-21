# Handoff & Session Learnings (2026-03-20)

## Session Summary
In this session, we undertook a massive structural realignment of the Borg Cognitive Control Plane. The goal was to cement the "Mega-Dashboard" vision, incorporating all requirements for an ultimate universal AI tool dashboard, complete with browser/IDE extensions, an MCP router/aggregator/proxy, autonomous council supervision, and omniscient memory.

## Accomplishments
1.  **Documentation Overhaul**:
    *   Rewrote `VISION.md` to perfectly capture the 6 pillars of the project: The Universal AI Dashboard, The Universal MCP Intelligence Layer, The Ultimate AI Coding Harness, Omniscient Memory & RAG, Multi-Agent Swarms & Council, and Universal Integrations.
    *   Updated `ROADMAP.md` mapping out Phases I through M to track the implementation of these features.
    *   Generated a highly granular `TODO.md` to track short-term implementations.
    *   Unified all LLM instructions into `docs/UNIVERSAL_LLM_INSTRUCTIONS.md` and updated `GEMINI.md`, `CLAUDE.md`, `GPT.md`, `AGENTS.md`, and `copilot-instructions.md` to inherit from it.
    *   Created `docs/SUBMODULES.md` to track submodule origins, and added `MEMORY.md` and `DEPLOY.md`.
2.  **Council / Auto-Orchestrator Assimilation**:
    *   Successfully assimilated `opencode-autopilot` (now Borg Orchestrator) into `@borg/core`.
    *   Migrated the Bun/Hono backend to Node/Express/tRPC.
    *   Wired the logic into Borg's `Drizzle ORM` schema and `SessionSupervisor`.
    *   Built the "Roundtable" Next.js dashboard view, bringing the council UI into the central app.
    *   Purged the old submodule.
3.  **Intelligent Model Fallback**:
    *   Updated `packages/ai/src/ModelSelector.ts` to implement the specific fallback chain requested by the user (`Gemini 3 Pro` -> `Codex 5.3` -> `Claude Opus 4.6`). This ensures the system automatically switches providers when quota limits are reached.

## Learnings & Non-Obvious Discoveries
*   **Submodule UI**: I discovered that `apps/web/src/app/dashboard/submodules/page.tsx` *already* has a highly functional UI for mapping the directory structure, reading `.gitmodules`, and extracting package versions dynamically using Node's `child_process`. We do not need to rebuild this; we only need to maintain `docs/SUBMODULES.md` as a textual reference.
*   **Model Routing Logic**: The `LLMService.ts` and `ModelSelector.ts` are tightly coupled. `LLMService` catches 429/Quota errors and calls `modelSelector.reportFailure()`, which marks that provider as depleted and automatically fetches the next candidate in the chain. This is highly robust and requires minimal changes beyond updating the arrays in `DEFAULT_CHAINS`.
*   **Worktree/Submodule Collisions**: During the commit process, I noticed an embedded git repository inside `packages/claude-mem.worktrees`. It is critical to use `git rm --cached` on these immediately to avoid polluting the git index.

## Next Steps for the Next Model
1.  **Merge Feature Branches**: We deferred a blind mass-merge of the 30+ feature branches to avoid catastrophic conflicts. The next model should systematically inspect branches like `feat/top-features`, `feat/login`, and `feat/engagement_modules` and merge them safely into `main-clean`.
2.  **Implement NotebookLM Integration**: Begin work on Phase I (Omniscient Memory), specifically the file parsing and citation-backed answer generation.
3.  **UI Polish**: The new `RoundtableDashboard.tsx` has some placeholder text in the Activity Logs. Hook this up to a real Zustand store or tRPC subscription.

End of Line.
