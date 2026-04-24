# Multi-Agent Symphony & Orchestration Protocols

> **MANDATORY:** All agents reading this must also integrate the rules defined in `LLM_INSTRUCTIONS.md`.

## The "Symphony" Architecture

The Jules Autopilot project relies on multiple autonomous LLMs (Claude, Gemini, GPT) working concurrently or sequentially on different aspects of the codebase.

### Agent Roles & Workflows

#### 1. The Architect (Typically Claude 3.5 Opus/Sonnet)
- **Domain:** `ROADMAP.md`, `IMPLEMENTATION_PLAN.md`, global state directories.
- **Responsibility:** Ingest massive context, design REST API boundaries, define Prisma schemas, and orchestrate the overall breakdown of epic tickets into granular checklist items in `task.md`. Maintains `IDEAS.md` and `VISION.md`.

#### 2. The Engineer (Typically Gemini 1.5 Pro/Flash)
- **Domain:** `app/`, `components/`, `lib/`
- **Responsibility:** Execute the checklist provided by the Architect at high speeds. Write React components, bind APIs, and aggressively iterate through `pnpm run typecheck` output until the feature builds flawlessly.

#### 3. The Auditor (Typically GPT-4o)
- **Domain:** `tests/`, `.github/`, security auditing.
- **Responsibility:** Performs strict AST/Pattern searches. Writes isolated Jest/Vitest harnesses. Scans the codebase for loose `any` types or uncaught edge-cases and submits patch reviews.

### Handoff & Versioning Protocol
When an agent reaches its context limit or finishes its domain tasks, it MUST write a comprehensive update to `HANDOFF.md` and clearly update the internal checklist in `task.md` (`[x]` for finished, `[/]` for active) so the next agent inheriting the process can seamlessly spin up its task context loop.

**CRITICAL END-OF-SESSION REQUIREMENTS:**
1. Bump the version number in the single source of truth: the `VERSION` file.
2. Add your summarized changes to `CHANGELOG.md` under the new version header.
3. Commit and push your changes to git with a message referencing the new version (e.g., `feat: completed X (v1.0.0)`).
4. Update `ROADMAP.md`, `TODO.md`, and `IDEAS.md` to reflect the new state of the project.
