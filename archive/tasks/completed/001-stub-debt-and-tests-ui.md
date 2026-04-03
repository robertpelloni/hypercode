# Task: Reduce Stub Debt and Promote Context-Router UI

**Track:** B — Hypercode-native MCP router maturity / P2 Cleanup  
**Priority:** P2 — Cleanup and coherence  
**Status:** Ready for implementation

## Context

From `TODO.md` item #13 and #7, there are remaining stub files in `packages/core/src/services/stubs/` that silently back pages or router procedures without real implementations:

**Remaining stubs (as of 2026-03-14):**
- `packages/core/src/services/stubs/policy.service.stub.ts` — used by `policiesRouter.ts`; UI at `/dashboard/mcp/policies` shows policies but evaluator is always-true
- `packages/core/src/services/stubs/toon.serializer.stub.ts` — TOON serialization placeholder

**Partially implemented backend services without meaningful UI:**
- `testsRouter.ts` (`tests` namespace) — `start`, `stop`, `run`, `results` procedures exist but no dashboard page uses them; `mcp/testing/page.tsx` is only a navigation hub
- `lspRouter.ts` — already has UI via `/dashboard/code` and `/dashboard/symbols`; this is complete

## Requirements

1. Create `/dashboard/tests/page.tsx` using `trpc.tests.*` procedures to show auto-test runner status, start/stop controls, per-file results, and tail output.
2. Decide whether `policy.service.stub.ts` should be promoted to a real evaluator or explicitly documented as pass-through.
3. Decide whether `toon.serializer.stub.ts` should be implemented or removed.
4. If stub is promoted to real, add acceptance tests. If stub is demoted/removed, remove the backing UI that implicitly depends on it.

## Acceptance Criteria

- [ ] `/dashboard/tests` page exists and uses `trpc.tests.status`, `trpc.tests.start`, `trpc.tests.stop`, `trpc.tests.results`
- [ ] Policy stub is either a real evaluator or explicitly documented as pass-through in code comments
- [ ] TOON stub is either implemented, removed, or marked intentional
- [ ] No UI page reads from a stub without an explicit operator-visible "experimental" or "placeholder" notice
