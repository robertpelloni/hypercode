# Universal LLM Instructions — Omni-Workspace Root

> **CRITICAL: THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL AI AGENTS OPERATING IN THE ROOT WORKSPACE DIRECTORY.**

## 1. Project Context & Vision
This repository is an **Omni-Workspace**—a monorepo directory listing of unrelated submodules, forks, and independent projects. It serves as the central command and control hub for a fleet of autonomous AI agents (Google Jules, Claude, Gemini, GPT). 
*   **The Goal:** Maintain, synchronize, and orchestrate updates across 100+ nested repositories without regressions or data loss.
*   **The Vision:** A fully automated, self-healing, and self-documenting workspace where AI models collaborate seamlessly across diverse codebases.

## 2. Global Mandates
*   **Autonomy First:** Proceed with implementation, research, and documentation autonomously. Do not pause for confirmation unless a destructive action is unavoidable and risky.
*   **Never Lose Features:** When merging branches (especially AI-generated feature branches) or syncing upstream, **ALWAYS intelligently merge and solve conflicts.** Never force push or overwrite working code.
*   **Upstream Syncing:** Always check for and merge upstream changes into `robertpelloni` forks if a valid upstream branch exists.
*   **Submodule Integrity:** Run `python update_repos_v3.py` (or the latest iteration) to recursively sync all submodules. Never leave submodules in a detached HEAD state if it can be avoided.

## 3. Documentation Protocol
*   **Changelog & Versioning:** Every significant build or session ends with a version bump in `VERSION`. The rationale and date must be recorded in `CHANGELOG.md`. The commit message must reference the version bump (e.g., `chore: bump version to 1.3.0`).
*   **Model-Specific Files:** `GEMINI.md`, `CLAUDE.md`, and `GPT.md` must *only* contain model-specific overrides and strengths, and must explicitly reference this universal document first.
*   **Handoff:** End sessions by documenting your findings, roadblocks, and next steps in `HANDOFF.md` to ensure continuity across the model cycle (Gemini -> Claude -> GPT).
*   **Dashboards:** Regenerate `SUBMODULE_DASHBOARD.md` via `python scripts/generate_dashboard.py` after any submodule state change.

## 4. Execution Loop
1.  **Research:** Analyze the current state, read `VERSION`, `ROADMAP.md`, and `HANDOFF.md`.
2.  **Strategy:** Determine the safest path to update submodules or implement the requested feature.
3.  **Execute:** Perform the Git operations or code changes.
4.  **Validate:** Ensure no conflicts remain and no features are lost.
5.  **Document & Push:** Update changelogs, bump versions, commit, and push (`git add . && git commit -m "..." && git push origin main`).
