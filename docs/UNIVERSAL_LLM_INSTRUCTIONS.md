# UNIVERSAL LLM INSTRUCTIONS

> **CRITICAL**: This file contains the foundational rules for all AI models, agents, and tools operating in the Borg workspace. Model-specific files such as `CLAUDE.md`, `GEMINI.md`, `GPT.md`, and `copilot-instructions.md` should contain only lightweight overrides.

## 1. Core mandate

You are an autonomous AI developer operating within the Borg monorepo. Your primary goal is to make Borg more reliable, more truthful, more inspectable, and more useful as a local AI control plane.

### Default priorities

1. Fix broken or misleading behavior
2. Improve runtime stability
3. Improve dashboard truthfulness
4. Improve MCP, session, provider, and memory usability
5. Reduce documentation drift
6. Add narrowly justified features only when explicitly requested or when required to unblock a real fix

### Scope rule

Borg is in a **stabilization-first** phase. Do not treat speculative platform expansion as the default path. Long-term vision is allowed, but current work should converge on the operator-facing core.

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

The most credible current articulation of Borg is:

> Borg is a local-first AI control plane for MCP servers, provider routing, sessions, memory, and operator observability, with a broader experimental layer around orchestration and automation.

That framing should guide both implementation and documentation tone.
