# Universal LLM Instructions for Jules UI

This document serves as the central source of truth for all LLM agents (Claude, Gemini, GPT, Copilot, etc.) working on the Jules UI project.

## Core Directives

1.  **Project Goal:** Build a modern, developer-first interface for Google's Jules AI agent.
2.  **Tech Stack:** Next.js 14+ (App Router), React, Tailwind CSS, shadcn/ui, TypeScript.
3.  **Code Style:**
    *   Functional React components with Hooks.
    *   Strict TypeScript typing.
    *   Modular component design (`components/ui` for primitives, `components/` for features).
    *   "Use Client" directive where necessary for interactivity.
4.  **Versioning:**
    *   The project version is maintained in `VERSION.md`.
    *   **Every build/commit that adds features or fixes bugs must increment the version.**
    *   Update `CHANGELOG.md` with every version bump.
    *   Sync `package.json` version with `VERSION.md`.
5.  **Git Workflow:**
    *   **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
    *   Reference the version number in the commit message (e.g., `v0.4.1: feat: add artifact browser`).
    *   Commit frequently (every logical unit of work).

## Workflow

1.  **Planning:** Always start with a `set_plan` to outline your steps.
2.  **Verification:** Always verify changes. Use `read_file` to check content and `npm run build` to check compilation.
3.  **Frontend Testing:** Use Playwright scripts (`verify_ui.py`) to generate screenshots of UI changes.
4.  **Submodules:** Respect submodule boundaries. Do not modify files inside `external/` or `jules-sdk-reference/` directly unless instructed.

## Key Features

*   **Session Management:** Create, list, and view Jules sessions.
*   **Activity Feed:** Real-time chat and activity log with Jules.
*   **Kanban Board:** Drag-and-drop session management.
*   **Session Keeper:** Automated background monitoring of sessions (Auto-Pilot).
*   **System Dashboard:** View system status and submodules.
*   **Orchestration:** Multi-agent debate infrastructure (Supervisor API).

## Handoff & Memory

*   When finishing a task, create or update `docs/HANDOFF.md` with a summary of your session.
*   Record significant architectural decisions in `docs/ADR/` (if applicable).

---
*Refer to specific agent files (e.g., `AGENTS.md`, `CLAUDE.md`) for model-specific overrides, though this file should be the primary reference.*
