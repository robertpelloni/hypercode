# AGENTS — Borg Contributor & Agent Guide

**Mandatory reading first:** `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`

## Core rule

Borg is in a **stabilization-first** phase. Default work should improve reliability, truthfulness, type safety, observability, and operator usefulness. Do not expand scope unless explicitly requested or directly required to fix a real blocker.

## Working principle

Build the future **through convergence, not chaos**.

The project has ambitious long-range ideas, but current contributions should strengthen the operator-facing core:
- MCP control plane quality
- provider routing correctness
- session supervision usability
- memory and context continuity
- observability and diagnostics

## Priority order

1. Fix broken or misleading behavior
2. Improve runtime stability
3. Improve dashboard truthfulness
4. Improve MCP, session, provider, and memory usability
5. Reduce documentation drift
6. Add narrowly justified features only if explicitly requested

## Read before making changes

Review these files before editing code or docs:
- `README.md`
- `VISION.md`
- `ROADMAP.md`
- `TODO.md`
- `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`

If docs and code disagree, prefer reality and update the docs.

## Scope control

### Allowed by default
- bug fixes
- type and test hardening
- observability improvements
- docs accuracy improvements
- UX clarity improvements on existing surfaces

### Requires explicit approval
- new dashboard areas
- new routers or services without a blocking need
- speculative platform expansion
- broad architectural rewrites

## Truthfulness policy

Every major feature or surface should be described as one of:
- **Stable**
- **Beta**
- **Experimental**
- **Vision**

Do not present scaffolding, mocks, or partial integrations as complete.

## What good contributions look like

- tighten an existing workflow
- fix runtime or type errors
- improve first-run or recovery UX
- make status reporting more truthful
- reduce misleading documentation
- improve test coverage around real failure modes

## What to avoid by default

- shipping new conceptual layers just to feel ambitious
- adding new operator surfaces that are not fully wired
- overstating implementation maturity
- letting documentation outrun the code
- hiding unstable behavior behind confident language

## Repo-specific rules

- Use **pnpm v10**.
- In `apps/web`, import shared components from `@borg/ui`.
- After backend changes in `packages/core`, verify relevant type and build flows.
- Prefer type-safe fixes over escape hatches.
- Treat extension bridges, tool execution, and config ingestion as high-risk surfaces.

## Validation baseline

Run targeted verification for the area you change. At minimum, prefer:

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

If a check cannot run, document why.

## Documentation rules

If behavior changes, update the relevant docs in the same change:
- `README.md`
- `ROADMAP.md`
- `TODO.md`
- `CHANGELOG.md`
- `AGENTS.md` if contributor rules changed

## Current interpretation of success

Borg succeeds by becoming:
- more reliable,
- more understandable,
- more inspectable,
- and more useful as a local control plane.

Ambition is welcome. Overclaiming is not.
