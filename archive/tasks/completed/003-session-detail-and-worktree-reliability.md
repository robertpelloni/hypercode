# Task: Session Supervisor Terminal Attach and Worktree Reliability

**Track:** E — Session fabric and model/tool portability  
**Priority:** P0 item #4 (ongoing)  
**Status:** Ready for implementation slice

## Context

From `TODO.md` item #4, the session supervisor has spawning, restart/backoff, persistence, and dashboard controls, but:
- Worktree isolation is not guaranteed in all runtime paths
- There is no true terminal attach workflow
<<<<<<< HEAD:archive/tasks/completed/003-session-detail-and-worktree-reliability.md
- Operators can't easily tell when Hypercode will or will not auto-restart a session
=======
- Operators can't easily tell when Borg will or will not auto-restart a session
>>>>>>> origin/rewrite/main-sanitized:tasks/backlog/003-session-detail-and-worktree-reliability.md

## Requirements

1. Audit the `WorktreeManagerLike` interface in `SessionSupervisor.ts` and document which methods have real implementations vs. stubs.
2. Add a `/dashboard/session/[id]` detail page that shows:
   - Live session stdout/stderr (polling from `logsRouter` or session-specific log query)
   - Session metadata: harness, model, worktree path, restart policy
   - Explicit restart/stop/force-kill controls
   - Restart history with timestamps and exit codes
<<<<<<< HEAD:archive/tasks/completed/003-session-detail-and-worktree-reliability.md
3. Decide what "terminal attach" means for Hypercode 1.0: buffered I/O viewer (read-only) or write-capable REPL bridge.
=======
3. Decide what "terminal attach" means for Borg 1.0: buffered I/O viewer (read-only) or write-capable REPL bridge.
>>>>>>> origin/rewrite/main-sanitized:tasks/backlog/003-session-detail-and-worktree-reliability.md

## Acceptance Criteria

- [ ] `/dashboard/session/[id]` detail page exists with live log output, metadata panel, and control buttons
- [ ] Dashboard clearly distinguishes manual-restart vs auto-restart sessions
- [ ] `WorktreeManagerLike` interface has inline documentation noting which paths are real vs. stub
- [ ] New session detail page is linked from the session list on `/dashboard/session`
