# Task: Session Supervisor Worktree and Attach Reliability

## Context
Session supervision is broadly implemented, but operator trust still depends on clear worktree behavior and a dependable attach/interaction story.

## Scope
- `packages/core/src/supervisor/**`
- `packages/core/src/routers/sessionRouter.ts`
- `apps/web/src/app/dashboard/session/**`
- focused tests for supervisor/session router/dashboard helpers

## Requirements
1. Ensure worktree-enabled sessions are reliable in runtime paths, not only test scaffolds.
2. Clarify and implement the supported attach/interaction workflow for supervised sessions.
3. Improve restart/failure operator feedback so recovery behavior is explicit.
4. Keep dashboard labels aligned with actual supervisor policy state.

## Acceptance Criteria
- [ ] Worktree session behavior is reliable in practical smoke checks
- [ ] Attach/interaction flow is explicit and functional (or explicitly documented non-goal)
- [ ] Restart policy and failure states are clear in session UI
- [ ] Focused supervisor/session tests pass
- [ ] `CHANGELOG.md` updated for behavioral changes

## Out of Scope
- New multi-agent orchestration features
- Non-session dashboard feature expansions
