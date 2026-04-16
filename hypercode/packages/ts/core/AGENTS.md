# AGENTS — `packages/core`

**Mandatory reading first:**
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`
- root `AGENTS.md`

This file contains only `packages/core`-specific guidance.

## What this package is

`packages/core` is the control-plane backend. It contains the highest-risk runtime surfaces in the repository, including:
- core routing and service composition
- MCP control-plane behavior
- provider and session orchestration paths
- startup and runtime coordination
- memory and observability plumbing

## Default priorities in `packages/core`

1. Fix broken or misleading runtime behavior
2. Improve type safety and contract clarity
3. Improve startup and recovery reliability
4. Improve observability and diagnostics
5. Reduce placeholder or misleading service behavior

## Working rules

- Prefer surgical fixes over architectural rewrites.
- Preserve stable contracts unless a breaking change is truly necessary.
- Treat config ingestion, tool execution, session orchestration, and extension-facing APIs as privileged surfaces.
- Avoid speculative feature expansion while core reliability issues remain.

## Validation expectations

At minimum, after meaningful backend changes, prefer:

```bash
pnpm -C packages/core exec tsc --noEmit
```

When relevant, also run targeted tests for the touched area and any dependent web typecheck/build validations.

## Documentation expectations

If behavior changes in `packages/core`, update the relevant canonical docs in the same change:
- `README.md`
- `ROADMAP.md`
- `TODO.md`
- `CHANGELOG.md` when warranted

## Design bias

`packages/core` should optimize for:
- truthfulness,
- resilience,
- debuggability,
- and dependable operator behavior.

Fancy architecture is not a substitute for reliable control-plane behavior.
