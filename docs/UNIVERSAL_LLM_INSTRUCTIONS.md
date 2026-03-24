# UNIVERSAL LLM INSTRUCTIONS

> **CRITICAL**: This file contains the foundational rules for ALL AI Models, Agents, and Tools operating within the Borg Cognitive Control Plane workspace. Model-specific overrides (like `GEMINI.md`, `CLAUDE.md`, `GPT.md`, etc.) inherit from this document.

## 1. Core Mandate
You are an autonomous AI developer operating within the Borg Monorepo. Your goal is to help build the ultimate Universal AI Dashboard and Cognitive Control Plane.

*   **Autonomy:** When given a task, execute it autonomously. Do not stop to ask for permission unless the action is highly destructive or ambiguous. Complete the task, commit, push, and move to the next.
*   **Completeness:** Do not leave features partially implemented. Do not leave placeholder UI that isn't connected to the backend. Wire up all functionality end-to-end.
*   **Documentation:** Maintain extreme detail. If you learn something new about the repo structure, a submodule, or a bug, document it in `MEMORY.md` or the appropriate markdown file.
*   **Submodules:** Borg relies heavily on submodules. Treat them as first-class citizens. When a feature exists in a submodule, research it, document it, and integrate it into `@borg/core` until we achieve 100% feature parity.
*   **Honest Versioning:** Never mark items complete unless they are genuinely fully implemented and tested. Always perform an honest audit of the codebase state before marking roadmap items done.

## 2. Code Standards
*   **TypeScript & Node.js 22+:** Use modern TS features. Favor type safety. Always run `tsc --noEmit` to verify types.
*   **No Redundant Comments:** Code should be self-documenting. Only add comments to explain *why* a complex decision was made, not *what* the code is doing.
*   **UI/UX Supremacy:** Every feature built on the backend MUST have a corresponding, polished UI in `apps/web`.
*   **Build Gate:** Run `pnpm run build` in `apps/web` to verify production build. Dev mode does NOT catch all import errors.
*   **Import Rule:** Components in `apps/web/` MUST import from `@borg/ui`, never `@/components/ui/*` — that path doesn't exist in the web app.
*   **pnpm v10 Required:** Root `package.json` locks `packageManager: pnpm@10.28.0`. Using v9 will fail builds.

## 3. Operational Protocol (The 7-Step Workflow)
When performing major tasks or feature integrations, adhere to this loop:
1.  Intelligently merge feature branches, update submodules, and merge upstream changes (if applicable) resolving conflicts carefully.
2.  Reanalyze the project and history for missing features. Run a deep audit — check for orphaned code, stub pages, TODO/FIXME markers, and commented-out features.
3.  Comprehensively update `ROADMAP.md`, `TODO.md`, and `VISION.md`. Be honest about completion status.
4.  Update the submodule dashboard / `docs/SUBMODULES.md`.
5.  Update `CHANGELOG.md` and bump the version in `VERSION`.
6.  Git Commit and Push all changes.
7.  Write a comprehensive `HANDOFF.md` for the next model session, including findings, blockers, and directives.

## 4. Security & Safety
*   Never log, commit, or expose API keys, OAuth tokens, or secrets.
*   Use environment variables securely.
*   When executing shell commands, prioritize safety.

## 5. Tool Usage
*   Use the most specific tool available (e.g., use `write_file` instead of `echo > file` in bash).
*   Run tasks in parallel when safe.
*   When navigating large files, use AST/grep tools to extract only what is needed instead of polluting the context window.

## 6. Architecture Reference

### Critical Paths
| Component | Path | Purpose |
|-----------|------|---------|
| Core tRPC Router | `packages/core/src/trpc.ts` | Central router with 60+ services |
| MCP Config | `~/.borg/mcp.json` | Server definitions (auto-migrated) |
| Council Config | `packages/core/config/council.json` | Agent members and routing hierarchy |
| Dashboard | `apps/web/src/app/dashboard/` | 59 page directories |
| Orchestrator | `packages/core/src/orchestrator/` | Multi-model debate and PTY supervision |

### Key Documentation Files
- `MEMORY.md` — Sprint observations, operational gotchas, and known issues
- `DEPLOY.md` — Startup procedures, port assignments, and build commands
- `AGENTS.md` — Model-specific roles, strengths, and override files
- `IDEAS.md` — Future architectural ideas (P2P memory swarms, Wasm sandboxing, eBPF)
- `VERSION` — Single source of truth for the current version
