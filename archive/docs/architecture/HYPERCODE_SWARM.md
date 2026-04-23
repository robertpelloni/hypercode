# Borg Swarm Architecture: "Maestro" Pattern

**Status:** Draft
**Last Updated:** 2026-02-03

## 1. Overview
The **Borg Swarm** is the multi-agent orchestration layer. Historically, agents operated sequentially or required complex file locking to avoid overwriting each other's work.
This new architecture adopts the **Maestro Pattern** (Git Worktrees) to enable true parallel execution and **Cognee** (Graph Memory) for shared semantic reasoning.

## 2. The "Maestro" Pattern (Git Worktrees)

### Problem
When multiple agents edit the codebase simultaneously:
*   **Race Conditions:** Agent A reads file X, Agent B modifies files X, Agent A writes older version of X.
*   **Context Pollution:** Agent A's changes break the build for Agent B.
*   **Locking:** Traditional locking slows down the swarm to a single thread.

### Solution: Git Worktrees
Each Agent Task gets a dedicated **Git Worktree**.
*   **Isolation:** A worktree is a linked copy of the repository sharing the `.git` folder but having a separate working directory.
*   **Parallelism:** Agent A works in `.borg/worktrees/task-123/`, Agent B works in `.borg/worktrees/task-124/`.
*   **Efficiency:** Spawning a worktree is near-instant (<1s) compared to `git clone` (>30s).

### Architecture Components

#### A. `WorktreeManager`
*   **Responsibility:** Lifecycle management of worktrees.
*   **Methods:**
    *   `provision(taskId: string, baseBranch: string): Promise<string>` -> returns path
    *   `cleanup(taskId: string): Promise<void>`
    *   `merge(taskId: string): Promise<MergeResult>`

#### B. `TaskEnvironment`
*   **Responsibility:** wrapper around the execution context.
*   **Properties:**
    *   `taskId`: string
    *   `rootPath`: string (the worktree path)
    *   `gitBranch`: string (`task/123-feature-name`)

## 3. High-Level Flow (The "Swarm Cycle")

1.  **Director** receives a complex request ("Refactor the Auth module and update the UI").
2.  **Director** decomposes request into Sub-Tasks:
    *   Task A: "Refactor Auth Backend"
    *   Task B: "Update UI Components"
3.  **WorktreeManager** provisions environments:
    *   Task A -> `.borg/worktrees/task-A` (Branch: `feature/auth-backend`)
    *   Task B -> `.borg/worktrees/task-B` (Branch: `feature/ui-components`)
4.  **Agents** execute in parallel in their respective paths.
5.  **Verification:** Each agent runs tests *within their worktree*.
6.  **Merge:**
    *   Task A completes -> WorktreeManager merges `feature/auth-backend` to `main`.
    *   Task B completes -> WorktreeManager attempts merge `feature/ui-components` to `main`.
    *   **Conflict:** If Task B conflicts, the Agent is respawned in the worktree to resolve it.

## 4. Semantic Memory Integration (`Cognee`)

### Problem
Agents in isolation don't know what others are doing or "know". Vector memory is too fuzzy for structural updates.

### Solution: Centralized Graph Memory
The **Hive Mind** (Graph Memory) persists across all agents.

*   **Extraction:** When Agent A analyzes `AuthService.ts`, it pushes the *structural understanding* (Class `AuthService` depends on `UserRepo`) to Cognee.
*   **Retrieval:** Agent B asks "Who uses `UserRepo`?". Cognee answers "AuthService (modified by Agent A)".
*   **Cognify:** Cognee background processes link these entities.

## 5. Security & Safety
*   **Sandboxing:** Worktrees provide file isolation, but not process isolation. We assume trusted agents for now.
*   **Review Gates:** `OpenAgents` pattern. The Supervisor can review the diff of a worktree *before* merging.

## 6. Directory Structure
```
.borg/
  worktrees/
    task-abc-123/  <-- Agent A working here
    task-xyz-789/  <-- Agent B working here
  memory/
    cognee/        <-- Shared Graph Database
    txtai/         <-- Shared Embeddings
```
