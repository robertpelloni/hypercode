# Task 006: Submodule Index Cleanup

## Context
Borg's live submodule registry had already been reduced to 5 approved entries in `.gitmodules`, but the Git index still contained 849 gitlinks. That mismatch left 844 orphaned gitlinks breaking `git submodule status`, confusing inventory tooling, and keeping legacy submodule sprawl alive in repository state.

## Scope
- Files: `scripts/prune_orphaned_gitlinks.mjs`, `package.json`, `docs/SUBMODULE_DASHBOARD.md`, `CHANGELOG.md`
- Validation: `git submodule status`, registry-vs-index orphan audit

## Requirements Completed
1. Removed orphaned gitlinks that were still tracked in the index but no longer registered in `.gitmodules`.
2. Preserved the approved live registry entries:
	 - `external/MetaMCP`
	 - `packages/MCP-SuperAssistant`
	 - `packages/opencode-autopilot`
	 - `submodules/mcpproxy`
	 - `submodules/litellm`
3. Restored consistent submodule tooling so `git submodule status` succeeds from the repo root.
4. Documented and scripted the cleanup path without re-expanding the archived submodule corpus.

## Acceptance Criteria
- [x] `git submodule status` succeeds from the repository root
- [x] All orphaned gitlinks not present in `.gitmodules` were removed from the index
- [x] `docs/SUBMODULES.md` and `docs/SUBMODULE_DASHBOARD.md` reflect the live registry state
- [x] Cleanup tooling and verification steps are documented in-repo
- [x] No `@ts-ignore` added
- [x] `CHANGELOG.md` updated

## Verification
- Added `scripts/prune_orphaned_gitlinks.mjs` and `package.json` script `submodules:prune-orphans`
- Dry-run audit reported:
	- `Registered submodules: 5`
	- `Tracked gitlinks: 849`
	- `Orphaned gitlinks: 844`
- Apply run removed `844` orphaned gitlinks from the index
- Post-cleanup audit reported:
	- `REGISTERED=5`
	- `GITLINKS=5`
	- `ORPHANS=0`
- Verified live submodule status after cleanup:
	- `external/MetaMCP`
	- `packages/MCP-SuperAssistant`
	- `packages/opencode-autopilot`
	- `submodules/litellm`
	- `submodules/mcpproxy`

## Notes
- Two legacy paths still exist locally on disk as untracked leftovers after the index cleanup:
	- `packages/claude-mem/`
	- `packages/mcp-directory/orchestration/blog.md/`
- Those leftovers no longer block submodule tooling and were intentionally left out of this cleanup commit.

## Completion
- Implemented, validated, committed, and pushed in `09c8cff5` (`chore: prune orphaned submodule gitlinks`).
