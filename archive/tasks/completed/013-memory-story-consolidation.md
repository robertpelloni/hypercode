# Task: Memory Story Consolidation

## Context
<<<<<<< HEAD:archive/tasks/completed/013-memory-story-consolidation.md
Hypercode has memory CRUD, summaries, observations, import/export. It does not yet have full claude-mem hook/search/context parity.

## Requirements
1. Define canonical Hypercode-native observation schema
2. Decide claude-mem relationship (adapter, migration source, or runtime dependency)
3. Unify memory UI around search, summaries, prompts, observations, and provenance
4. Memory dashboard reflects one coherent model
=======
Borg has memory CRUD, summaries, observations, import/export, and partial claude-mem-facing status surfaces. It does not yet have full claude-mem hook/search/context parity.

This task is the first implementation slice under **Track D — IDE / CLI / hook-based memory capture** from `tasks/completed/015-ecosystem-assimilation-consolidation.md`.

## Decision
- Borg-native memory records are the source of truth.
- `claude-mem` remains an adapter and interchange surface, not a required runtime dependency for core memory UX.
- Parity gaps stay visible on the dedicated claude-mem dashboard until they are implemented in bounded follow-up tasks.

## Requirements
1. Define the canonical Borg-native observation schema
2. Decide the claude-mem relationship (adapter, migration source, or runtime dependency)
3. Unify the memory UI around search, summaries, prompts, observations, and provenance
4. Make the memory dashboard reflect one coherent Borg-owned model

## Acceptance Criteria
- [x] Canonical Borg-native observation input contracts exist in shared types and are used by the memory router.
- [x] The claude-mem relationship is explicit: Borg-native memory is primary and claude-mem is presented as an adapter/interchange layer.
- [x] The memory dashboard presents facts, observations, prompts, summaries, provenance, pivots, and related-record views in one Borg-owned surface.
- [x] Claimed claude-mem parity gaps remain clearly labeled on the dedicated parity page instead of being implied as complete.
- [x] Focused tests pass for the unified memory dashboard utilities and claude-mem status helpers.
- [x] Core and web typechecks pass.
>>>>>>> origin/rewrite/main-sanitized:tasks/completed/013-memory-story-consolidation.md
