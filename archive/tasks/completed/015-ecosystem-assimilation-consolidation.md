# Task: Ecosystem Assimilation Consolidation

## Context
The repository and recent user directives reference large upstream capability sets from MetaMCP, Claude-mem, MCP-SuperAssistant, Jules-Autopilot, and adjacent session-manager/autopilot projects. Those asks overlap heavily, conflict with Hypercode 1.0 focus if taken literally, and currently risk creating broad parity claims without one Hypercode-native implementation plan.

This task consolidates those asks into one staged Hypercode roadmap so future implementation can be evaluated against capability contracts instead of repo-by-repo cloning.

## Requirements
1. Define one Hypercode-native consolidation plan for the following capability families:
   - boot-ready control plane and startup truthfulness
   - MCP router progressive disclosure / semantic tool search / middleware
   - browser-extension memory, chat injection, automation, and transport bridge
   - Claude Code / IDE / CLI memory capture, hook events, observation compression, and session context
   - supervised tool+model sessions with portable context/history across providers and tools
2. Explicitly separate what belongs in:
   - Hypercode 1.0 release blocking work
   - Hypercode 1.5 memory + extension work
   - Hypercode 2.0 swarm / marketplace / autonomous orchestration work
3. Treat upstream projects as reference inputs, not product requirements. Hypercode should assimilate only the capability that materially improves the Hypercode control plane.
4. Avoid vague “full parity” language; every adopted feature must map to a Hypercode-owned subsystem, operator workflow, and test surface.
5. Record the current major gap clusters so future tasks can be carved into small implementation slices.

## Consolidated capability tracks

### Track A — Boot-ready control plane (Hypercode 1.0)
- deterministic `pnpm run dev` / Docker startup contract
- cached MCP inventory available before full live hydration
- truthful dashboard readiness across core, memory, session supervisor, and extension bridge
- lightweight always-on MCP advertisement, non-blocking server warmup, and last-known-good config reporting

### Track B — Hypercode-native MCP router maturity (Hypercode 1.0 → 1.5)
- progressive disclosure (`search -> load -> use -> unload`)
- semantic tool search and ranking over large inventories
- explicit always-on / pinned tools
- optional middleware pipeline for logging, policy, filtering, and tool overrides
- Hypercode-owned direct runtime first; MetaMCP bridge only where still required

### Track C — Browser extension platform (Hypercode 1.5)
- Chrome / Edge / Firefox install flow from the dashboard
- extension-scoped context/activity/memory persistence
- browser bridge to core for memory, session export/import, debug telemetry, and browser control
- multi-site chat-surface adapters, tool/result parsing, and automation loop only after bridge + memory capture are stable
- resource browser, prompt templates, context manager, debugger, and macros only when tied to core-backed workflows

### Track D — IDE / CLI / hook-based memory capture (Hypercode 1.5)
- Claude Code, VS Code, OpenCode, Gemini CLI, Codex, and similar environments should connect to Hypercode Core rather than maintain isolated memory silos
- hook events / session lifecycle integration for prompt capture, tool observation capture, summaries, and handoff artifacts
- Hypercode-native structured observation schema with dedupe, provenance, files, concepts, and summaries
- progressive context injection based on token budget and relevance
- transcript/session compression only if needed after observation capture is proven valuable

### Track E — Session fabric and model/tool portability (Hypercode 1.5 → 2.0)
- sessions become a commodity fabric where jobs, history, notes, and artifacts can move between models and tool harnesses
- tool sessions and model sessions share a portable context/history envelope
- multiple agents can annotate work, leave notes, and hand jobs across tools without losing state
- benchmark, diff, replay, and autonomous babysitting features are deferred until the supervised-session core is trustworthy

### Track F — Advanced autonomy and marketplace (Hypercode 2.0)
- plugin marketplace / registry
- session keeper / babysitter / shadow pilot
- consensus, debate, swarm scaling, CI fix agent, scheduled tasks
- cloud dev, external runtime integrations, and larger autonomy surfaces

## Major gap clusters to use for future task slicing

### 1. Startup and readiness gaps
- single authoritative readiness payload exists but still needs stricter operator and installer alignment
- last-known-good MCP inventory and always-on advertisement should remain available even when full core warmup is incomplete

### 2. MCP router gaps
- Hypercode still lacks fully mature progressive disclosure and semantic tool search compared with the strongest external references
- middleware/policy/filter chains are incomplete and should be adopted only where they improve operator trust or security

### 3. Browser-extension gaps
- Hypercode now has real browser memory capture foundations, but not yet full browser chat injection parity, multi-platform automation, resource browsing, or macro orchestration tied back to core

### 4. Claude-mem style capture gaps
- no first-class Claude Code hook registration or equivalent hook framework in Hypercode yet
- no Hypercode-native structured observation compression pipeline at claude-mem depth
- no complete progressive disclosure context injection pipeline over those observations yet

### 5. Session portability gaps
- supervised CLI sessions exist, but portable cross-tool / cross-model job handoff, replay, diffing, benchmarking, and babysitting are still mostly future work

## Acceptance criteria
- [x] A follow-up implementation task can point at one of the capability tracks above instead of restating the entire assimilation request
- [x] Hypercode 1.0, 1.5, and 2.0 boundaries are explicit
- [x] No repo-wide parity claim remains implied by planning language alone
- [x] Future work can be decomposed into small tasks against this brief

## Out of Scope
- Directly submoduling or removing upstream repos in this task
- Claiming full MetaMCP, Claude-mem, MCP-SuperAssistant, or Jules-Autopilot parity
- Implementing browser chat injection, Claude hooks, or marketplace features in one pass
- Do not create new task files
- STOP when criteria are met
