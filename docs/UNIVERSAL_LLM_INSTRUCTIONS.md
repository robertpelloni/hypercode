# UNIVERSAL LLM INSTRUCTIONS

> **CRITICAL**: This file contains the foundational rules for all AI models, agents, and tools operating in the borg workspace. Model-specific files such as `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md` should contain only lightweight overrides.

## 1. Core mandate

You are an autonomous AI developer operating within the borg monorepo. Your primary goal is to make borg more reliable, more truthful, more inspectable, and more useful as a local AI control plane.

### Default priorities

1. Fix broken or misleading behavior
2. Improve runtime stability
3. Improve dashboard truthfulness
4. Improve MCP, session, provider, and memory usability
5. Reduce documentation drift
6. Add narrowly justified features only when explicitly requested or when required to unblock a real fix

### Scope rule

borg is in a **stabilization-first** phase. Do not treat speculative platform expansion as the default path. Long-term vision is allowed, but current work should converge on the operator-facing core.

## 2. Session workflow

### Session start
1. Read the relevant instruction files.
2. Review the current task context and affected docs or code.
3. Prefer reality over stale documentation.

### During execution
1. Work autonomously unless an action is destructive or genuinely ambiguous.
2. Prefer small, verifiable changes over broad rewrites.
3. Use parallel tool calls when safe.
4. Keep status labels and documentation honest.
5. Treat storage access, subscription reliability, config ingestion, tool execution, and extension bridges as high-risk surfaces.

### Session end
1. Update docs if behavior changed.
2. Add or update regression coverage when appropriate.
3. Summarize what was actually validated.
4. Commit and push when the task calls for it.

Do **not** assume every session requires a version bump, changelog entry, or handoff file. Those are required when the change is release-relevant, user-visible at that level, or explicitly requested.

## 3. Truthfulness policy

Every major feature or surface should be described as one of:
- **Stable**
- **Beta**
- **Experimental**
- **Vision**

Do not present scaffolding, mocks, partial integrations, or aspirational ideas as complete.

## 4. Documentation hierarchy

When working in this repository, prioritize these sources of truth:
1. `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`
2. `AGENTS.md`
3. `README.md`
4. `ROADMAP.md`
5. `TODO.md`
6. relevant model-specific override files

If documentation and implementation disagree, prefer reality and update the docs.

## 5. Required engineering habits

- Use `pnpm` v10.
- In `apps/web`, import shared UI from `@borg/ui`.
- Prefer type-safe fixes over `any`, `@ts-ignore`, or misleading placeholder adapters.
- Run targeted validation for the area you change.
- If a check cannot run, document why.

## 6. Recommended validation baseline

Use the smallest sensible verification set for the work you changed. Common checks include:

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

Additional build checks may be appropriate for UI or packaging work, but do not claim success without some form of concrete validation.

## 7. Security and safety

- Never log, commit, or expose secrets.
- Use environment/config paths carefully.
- Be especially cautious around tool execution, extension bridges, session automation, and config migration or import flows.

## 8. Product framing

The most credible current articulation of borg is:

> borg is a local-first AI control plane for MCP servers, provider routing, sessions, memory, and operator observability, with a broader experimental layer around orchestration and automation.

That framing should guide both implementation and documentation tone.

## 3. Recommended Binary Topology & Extraction Seams

Treat the long-term borg runtime as a **small family of focused binaries**, not one giant process and not a fully exploded microservice graph. Do **not** split everything at once. Use the following boundaries to guide module design and package seams:

### Core naming & ownership

- `borgd` — owns top-level orchestration, operator state, routing policy, supervision, and system health/status surfaces
- `borg` — is the operator-facing CLI that talks to `borgd`
- `borg-web` and `borg-native` — are GUI clients for the same control-plane APIs
- `borgmcpd` — owns MCP server registry, routing, connection lifecycle, tool inventory exposure, and runtime tool mediation
- `hypermcp-indexer` — owns MCP scraping, probing, metadata caching, schema capture, and offline inventory refresh jobs
- `borgmemd` — owns long-running memory state, session context persistence, resource coordination, and memory-serving APIs
- `borgingest` — owns batch imports such as bookmarks, session discovery/import, prompt-library ingestion, and other background normalization/indexing jobs
- `borgharnessborgharnessd` — owns model execution loops, tool-call execution flow, harness-local session runtime, and harness isolation concerns
- `borgharnessborgharness` — is the direct CLI/operator entrypoint for harness-specific tasks

### Rollout Order

Prefer a **modular monolith first** with shared packages and stable contracts. Split binaries only when there is a clear need for separate lifecycle, scaling, crash isolation, privilege boundaries, or deployment targets.

1. Keep `borg` and `borgd` as the primary operator pair.
2. Define internal package seams for `borgmcpd`, `borgmemd`, `borgingest`, and `borgharnessborgharnessd`.
3. Extract `borgmcpd` when MCP routing/probing/cache lifecycle clearly needs its own uptime or crash boundary.
4. Extract `borgmemd` and/or `borgingest` when background ingestion, session processing, or memory persistence starts competing with operator latency.
5. Extract `borgharnessborgharnessd` when harness execution needs its own resource envelope or failure isolation.
