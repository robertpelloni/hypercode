# Deep Research Batch 16: Agent Frameworks & Skills II

**Date:** 2026-02-03
**Status:** Complete
**Focus:** Agent Frameworks and Advanced Skill Definitions

## Executive Summary
This batch focused on the "Second Wave" of agent frameworks—those prioritizing control, code-centricity, and orchestration—and the emerging standard of "Skills" as portable agent capabilities. `Maestro` and `OpenAgents` offer significant workflow improvements (Git Worktrees, Pattern Control) that Borg should adopt.

## 1. Agent Frameworks

### A. `Maestro` (The Orchestrator)
*   **Role:** Desktop app for orchestrating multiple agents (Claude, Codex, OpenCode).
*   **Key Innovation:** **Git Worktrees**. Runs sub-agents on isolated git branches in parallel. This solves the "context collision" problem when multiple agents work on the same repo.
*   **Relevance:** High. We should emulate the Git Worktree strategy for our Swarm.

### B. `OpenAgents` (Control & Consistency)
*   **Role:** Framework built on `OpenCode`.
*   **Key Philosophy:** "Pattern Control". Instead of generic code, agents load "Context Files" (<200 lines) describing *your* specific project patterns (naming, auth, DB).
*   **Feature:** **Approval Gates**. Agents *must* propose a plan and get approval before execution. This aligns with our "Director" mode.
*   **Token Efficiency:** Uses MVI (Minimal Viable Information) to reduce context load by 80%.

### C. `smolagents` (Transparency)
*   **Role:** HuggingFace's lightweight library (~1k lines).
*   **Key Innovation:** **CodeAgents**. Agents write actions as Python code snippets, not JSON blobs. This is 30% more efficient and handles complex loops/logic better.
*   **Relevance:** Good reference for our internal tool-use logic.

### D. `OpenHands` (The Heavy lifter)
*   **Role:** Full "AI-Driven Development" platform (formerly OpenDevin?).
*   **Components:** SDK, CLI, Local GUI, Cloud.
*   **Relevance:** A complete alternative ecosystem. Useful for checking feature parity (e.g., they have a "Local GUI" similar to our Dashboard).

## 2. Skills Ecosystem (Phase II)

### A. `open-skills` (Secure Sandbox)
*   **Concept:** Runs skills in local Docker containers (or native Apple containers).
*   **Protocol:** MCP-compatible. Exposes skills like "PDF manipulation", "Image processing" as tools.
*   **Key Takeaway:** Demonstrates high-security "Skill Sandboxing".

### B. `codex-skills` & `awesome-claude-skills`
*   **Standardization:** Confirms the `SKILL.md` directory structure is the industry standard.
*   **Content:** Thousands of ready-made skills (e.g., "Deep Research", "Brand Guidelines", "AWS Development").
*   **Integration:** We can "mount" these skills into Borg by simple directory copying.

## Recommendations

1.  **Adopt Git Worktrees:** Implement a `task_branch` tool for the Swarm that automatically creates a git worktree for a specific task, allowing parallel execution without file lock contention.
2.  **Pattern Contexts:** Refine our `knowledge/` to be more like `OpenAgents` "MVI Contexts"—small, specific pattern files loaded on demand, rather than giant documents.
3.  **Skill Mounting:** Create a `skills/` directory in Borg root and "mount" selected high-value skills (e.g., `deep-research`, `postgres`) from the researched repositories.
