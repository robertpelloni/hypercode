# Borg Neural OS: Universal Agent Instructions

> **One Brain, Infinite Tools.**

This file serves as the **Single Source of Truth** for all AI agents (Claude, Gemini, GPT, etc.) working on the Borg project.

## 1. Core Philosophy: The Neural Operating System
We are not building a chatbot; we are building a **Recursive Self-Improvement Engine**. 
- **Borg** is a Master MCP Server that aggregates all other tools (Git, VS Code, Browser).
- **Goal**: To create an AI that can maintain, improve, and deploy itself without human intervention.
- **Vision**: See [VISION.md](file:///c:/Users/hyper/workspace/borg/VISION.md) for the ultimate design.

## 2. Global Directives (MUST FOLLOW)

### A. Deep Analysis & Autonomy
- **Analyze Deeply**: Before acting, scan `task.md`, `ROADMAP_V2.md`, and the `knowledge/` directory. Do not guess.
- **Be Autonomous**: Do not stop for confirmation unless critical (e.g., `rm -rf`).
    - If a feature is fully planned, implement it.
    - If a build fails, fix it (`HealerService` logic).
    - If a step completes, commit and push, then **start the next step immediately**.
- **Self-Correction**: If you find an error, fix it using available context. Do not ask "Should I fix this?".

### B. Versioning & Changelog
- **Single Source of Truth**: The version number is stored in the root file `VERSION` (e.g., `2.1.0`).
- **Update Rule**: Every significant change (Plan/Build/Verify cycle) **MUST** increment the version number in `VERSION`.
- **Changelog**: Update `CHANGELOG.md` with a concise summary of changes under the new version header.
- **Commit Messages**: Must reference the new version (e.g., `feat(core): aggregator implementation [v2.1.0]`).
- **Synchronization**: Ensure `package.json` version fields match `VERSION` if you edit them.

### C. Documentation First
- **Update Docs**: If you change code, update the relevant documentation (`walkthrough.md`, `implementation_plan.md`) **in the same turn**.
- **Submodules**: All external dependencies or referenced projects must be documented in `SUBMODULES.md`.
- **Input Logging**: If the user gives a complex instruction, summarize it in `AGENTS.md` (or this file) to persist the "Goal Direction".

## 3. Workflow: The Borg Cycle
1.  **Analyze**: Read `task.md` and `ROADMAP_V2.md`.
2.  **Plan**: Create/Update `implementation_plan.md`.
3.  **Implement**: Write code (TDD preferred).
4.  **Verify**: Run tests (`vitest`).
5.  **Document**: Update `CHANGELOG.md` and `VERSION`.
6.  **Commit**: `git commit` & `git push`.
7.  **Repeat**: Pick the next task.

## 4. Architecture Standards
- **Tech Stack**: TypeScript, Node.js (ESM), Vitest, Zod, MCP SDK.
- **Style**: Functional, modular, "Cybernetic" aesthetics for UI.
- **Paths**: Absolute paths preferred when using tools.

## 5. User Preferences
- **Time Source**: Trust the system prompt's time.
- **Subagents**: Use them freely for parallel tasks.
- **Commit Frequency**: High. "Commit early, commit often."

---
*If you are an AI reading this, you are part of the Hive Mind. Proceed with the mission.*
