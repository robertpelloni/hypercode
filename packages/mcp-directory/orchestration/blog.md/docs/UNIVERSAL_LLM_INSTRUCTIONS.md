# Universal LLM Instructions — Omni-Workspace Root

> **CRITICAL: THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL AI AGENTS OPERATING IN THE ROBERT PELLONI MONOREPO.**

## 1. Project Context & Vision
This repository is an **Omni-Workspace**—a centralized manager and command center for a vast ecosystem of unrelated submodules, forks, and independent projects. 
*   **The Scope:** Includes AI operating systems (`aios`, `borg`), game engines (`itgmania`, `okgame`, `bg`), web platforms (`fwber`, `raindropioapp`), and numerous development tools.
*   **The Goal:** Maintain, synchronize, and orchestrate updates across 100+ nested repositories without regressions or data loss.
*   **The Vision:** A highly autonomous, self-healing, and self-documenting software ecosystem where AI agents (Gemini, Claude, GPT, Google Jules) collaborate seamlessly across diverse codebases.

## 2. Global Mandates
*   **Autonomy First:** Proceed with implementation, research, and documentation autonomously. Do not pause for confirmation unless a critical, irreversible destructive action is about to be taken (and even then, explain clearly).
*   **Never Lose Features:** When merging branches (especially AI-generated feature branches) or syncing upstream, **ALWAYS intelligently merge and solve conflicts.** Favor the "new" or "local" changes if they represent progress. Never force push or overwrite working code.
*   **Conventions:** Rigorously adhere to existing project conventions (formatting, naming). Analyze surrounding code, tests, and configuration first.
*   **Upstream Syncing:** Always check for and merge upstream changes into `robertpelloni` forks if a valid upstream branch exists.
*   **Submodule Integrity:** Run `python scripts/update_repos_v5.py` (or the latest iteration) to recursively sync all submodules. **Never** leave submodules in a detached HEAD state if possible; merge changes into the default branch (`main` or `master`) and push.

## 3. Documentation & Versioning Protocol
*   **Single Source of Truth:** The `VERSION` file in the root directory contains the current version number.
*   **Increment on Build:** Every significant set of changes (a "build" or "session") MUST result in a version increment.
*   **Changelog:** Record the rationale, date, and changes in `CHANGELOG.md` with every version bump.
*   **Commit Message:** The version bump commit message must reference the new version (e.g., `chore: bump version to 1.3.0`).
*   **Dashboards:** Update `ROADMAP.md`, `PROJECT_STRUCTURE.md`, and `SUBMODULE_DASHBOARD.md` (via `python scripts/generate_dashboard.py`) regularly to reflect the latest state.
*   **Model-Specific Files:** `GEMINI.md`, `CLAUDE.md`, and `GPT.md` must *only* contain model-specific overrides and strengths, and must explicitly reference this universal document first.
*   **Handoff:** End sessions by documenting your findings, roadblocks, and next steps in `HANDOFF.md` and archive a detailed version in `logs/handoffs/` to ensure continuity across the model cycle (Gemini -> Claude -> GPT).

## 4. Workflow Protocols

### A. Feature Implementation
1.  **Analyze:** Read `ROADMAP.md`, `TODO.md`, and `LLM_INSTRUCTIONS.md`. Search the codebase to understand context.
2.  **Plan:** Select a feature. Break it down into atomic steps.
3.  **Execute:** Implement using available tools. *Self-Correction:* If an error occurs, fix it immediately without stopping.
4.  **Verify:** Write and run tests for new features. Ensure code compiles/runs and has no regressions.
5.  **Commit:** Stage changes, commit with descriptive messages, and push.
6.  **Loop:** Proceed to the next feature without pausing.

### B. Repo Maintenance
1.  **Update:** Run scripts in `scripts/` to sync submodules and fetch/merge upstream changes.
2.  **Merge:** Intelligently merge feature branches (local and remote) into `main`.
3.  **Fix:** Resolve conflicts prioritizing feature retention.
4.  **Prune:** Use `scripts/prune_broken_submodules.py` to keep `.gitmodules` clean.

## 5. Model-Specific Roles
*   **Claude:** Architect, Planner, Documentation Lead. Specialized in large-scale refactoring and holistic system understanding.
*   **Gemini:** Speed, Performance Analysis, Large Context Operations (full-repo scans), and complex Scripting.
*   **GPT:** Code Generation, Unit Testing, and specific algorithm implementation.

## 6. Directory Structure
*   `docs/`: Workspace-level documentation and universal instructions.
*   `scripts/`: Automation and maintenance scripts.
*   `logs/`: Operation logs and handoff archives.
*   `aios/`, `borg/`, `metamcp/`: AI Orchestration layers.
*   `bobmani/`: Rhythm game engine suite.
*   `fwber/`, `bobcoin/`: Full-stack applications.
