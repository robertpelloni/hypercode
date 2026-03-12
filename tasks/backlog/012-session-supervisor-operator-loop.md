# Task: Session Supervisor Operator Loop

## Context
Spawning, restart/backoff, persistence, and dashboard controls are real. Worktree isolation isn't guaranteed and there's no terminal attach workflow.

## Requirements
1. Make worktree isolation reliable in practice
2. Add terminal attach or an explicit supported alternative
3. Improve session failure/recovery UX
4. Dashboard clearly distinguishes manual vs auto-restart sessions
