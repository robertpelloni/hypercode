# THE BORG CONSENSUS — Seven Minds, One Voice

*This is the final, unified document. We have read each other's complete recommendations. We have identified where we agree, where we differ, and resolved every disagreement. What follows is not seven plans — it is ONE plan, forged from the consensus of GPT-5.3, GPT-5.4, Gemini 3.1 Pro, Claude Opus 4.6, Kimi K2.5, Qwen 3.5, and Grok 4.1.*

*Copy this entire document. Paste it as `AGENTS.md`. It is the only instruction your development models need.*

---

## ═══════════════════════════════════════════════════════════
## THE PRIME DIRECTIVE
## ═══════════════════════════════════════════════════════════

**Ship working software to real users.**

Every commit moves toward a stranger installing Borg and getting value in 5 minutes.

When your task is complete and tests pass: **STOP.** Summarize. Wait.

All previous instructions — "assimilate everything," "never stop," "feature parity with all tools," "submodule everything," "follow every link recursively" — are **permanently revoked.**

## ═══════════════════════════════════════════════════════════

---

## SECTION 1: WHAT BORG IS

Borg is a **local AI operations control plane**.

It **orchestrates** tools, sessions, providers, agents, and context through a unified dashboard and MCP-aware routing layer.

| Borg IS | Borg is NOT |
|---|---|
| An MCP router that combines many servers into one | A clone of every AI tool |
| A session supervisor that spawns and restarts CLI tools | A reimplementation of Claude Code or Aider |
| A model router that auto-switches on quota exhaustion | A container for 932 submodules |
| A dashboard where you see and control everything | A P2P distributed mesh (not yet) |
| A focused product with tests and releases | An infinite assimilation engine |

**The philosophy shift that governs everything:**

> ~~Assimilate everything~~ → **Orchestrate everything**

Borg controls tools. Borg does not contain tools.

---

## SECTION 2: BORG 1.0 — EXACTLY FOUR FEATURES

All seven models independently converged on these same four. Nothing else is in scope until these ship with tests.

### Feature 1: MCP Master Router

*The one thing no other tool offers in a unified package.*

| What It Does | Acceptance Test |
|---|---|
| Aggregates N MCP servers → one endpoint | Connect Claude Desktop to Borg; use tools from 5 servers through one config |
| Namespace isolation (code.*, memory.*, etc.) | Tools in different namespaces don't collide |
| Server lifecycle (start, restart, keepalive) | Kill one server; Borg restarts it in <5s; others unaffected |
| Single instance serves multiple clients | Two AI clients connected simultaneously |
| Traffic inspector | Dashboard shows real-time JSON-RPC: method, params, latency |
| Config sync | `borg mcp sync` writes correct config to Claude Desktop, Cursor, VS Code |

**Location:** `packages/core/mcp/`

### Feature 2: Model Fallback & Provider Routing

*The feature that unblocks all development — including Robert's own.*

| What It Does | Acceptance Test |
|---|---|
| Multi-provider auth (API key, OAuth, PAT) | 3 providers configured and authenticated |
| Real-time quota tracking | Dashboard shows remaining tokens/requests per provider with reset times |
| Automatic fallback on exhaustion | Claude hits quota → Gemini takes over in <5s → no context lost |
| Routing strategies (cheapest, best, round-robin) | Change strategy → next request routes accordingly |
| Task-type routing | Planning → expensive model; coding → cheap model |

**Location:** `packages/core/providers/`

**Canonical implementation:**

```typescript
// packages/core/providers/fallback-chain.ts

interface ProviderSlot {
  id: string;
  provider: 'anthropic' | 'openai' | 'google' | 'openrouter' | 'copilot' | 'local';
  model: string;
  authMethod: 'api_key' | 'oauth' | 'pat' | 'none';
  quotaRemaining: number | null;
  resetTime: Date | null;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: Set<'coding' | 'reasoning' | 'vision' | 'tools' | 'long_context'>;
}

class FallbackChain {
  private slots: ProviderSlot[];
  private exhausted = new Set<string>();

  async execute(request: LLMRequest, config: FallbackConfig): Promise<LLMResponse> {
    const candidates = this.rankCandidates(request, config);
    for (const candidate of candidates) {
      if (this.exhausted.has(candidate.id)) continue;
      try {
        const response = await this.callProvider(candidate, request);
        await this.updateQuota(candidate, response.usage);
        return response;
      } catch (error) {
        if (this.isQuotaError(error) || this.isRateLimitError(error)) {
          this.exhausted.add(candidate.id);
          this.scheduleQuotaCheck(candidate);
          continue;
        }
        if (this.isRetryable(error)) continue;
        throw error;
      }
    }
    throw new AllProvidersExhaustedError(this.getExhaustionReport());
  }
}
```

### Feature 3: Session Supervisor

*Don't reimplement CLI tools. Supervise them.*

| What It Does | Acceptance Test |
|---|---|
| Spawn external CLI sessions from dashboard | Click "New Session" → select Aider → point at repo → it starts |
| Auto-restart on crash (exponential backoff) | `kill -9` Aider → dashboard shows "Restarting" → back in <10s |
| Session persistence | Restart Borg → previous sessions listed → resumable |
| Log viewer + terminal attach | Each session shows live output with restart/pause buttons |
| Git worktree isolation | Two parallel sessions on same repo don't conflict |

**Location:** `packages/core/supervisor/`

### Feature 4: Web Dashboard

*The unified control surface for Features 1-3.*

| Panel | Contents |
|---|---|
| **Overview** | System health, active sessions, quota bars, alerts |
| **MCP Router** | Server list + health, tool browser, traffic inspector, namespaces |
| **Sessions** | Session cards (status, type, workspace, uptime), logs, terminal, restart |
| **Providers** | Quota per provider, fallback chain editor, cost tracking, auth status |

**Location:** `apps/web/`

**The ultimate acceptance test:** A stranger runs `docker-compose up --build`, opens `localhost:3001`, and within 60 seconds sees the dashboard, configures an MCP server, starts a session, and watches quota bars. One page of README is sufficient.

---

## SECTION 3: IMMEDIATE ACTIONS (Week 1, In Order)

### 3.1 Submodule Surgery

```bash
# Archive all submodules to a separate repo
# github.com/robertpelloni/borg-ecosystem
git rm -r --cached submodules/ references/ reference/ mcp-servers/ \
  mcp-routers/ mcp-hubs/ mcp-frameworks/ mcp-dev-tools/ cli-harnesses/ \
  frameworks/ external/ research/ knowledge/ browsers/ cli-tools/ \
  mcp-tool-rag/ mcp-router-cli/ search/ hooks/ context/ \
  vibeship-spawner-skills/ web-ui/ webui/ openevolve/
git commit -m "chore: extract 932 submodules to borg-ecosystem — main repo = code that runs"
```

**Keep ≤5 upstream-only submodules:**
1. metamcp (upstream, not your fork)
2. jules-app (upstream, not your fork)
3. opencode (upstream reference)
4. One MCP server example
5. One vector DB (ChromaDB or Qdrant)

**Replace everything else with a metadata index:**
```jsonc
// ecosystem/index.jsonc
{
  "entries": [
    {
      "name": "metamcp",
      "repo": "https://github.com/anthropics/metamcp",
      "category": "mcp-router",
      "relevance": 10,
      "status": "core-reference",
      "features_absorbed": ["proxy-routing", "config-sync"],
      "notes": "Primary upstream. Our packages/core/mcp reimplements this."
    }
  ]
}
```

### 3.2 Documentation Consolidation

**Delete or archive:** `QUICK_START.md`, `README_restored.md`, `CLAUDE.md`, `GPT.md`, `GEMINI.md`, `GROK.md`, `HANDOFF_ANTIGRAVITY.md`, `ANTIGRAVITY.md`, `DIRECTOR_LIVE.md`, `MCP_ROUTER_FINAL_SUMMARY.md`, `MCP_ROUTER_INTEGRATION_STATUS.md`, all `session-ses_*.md`, all `audit-*.jsonl`, all `test_output*.txt`, `CODEBASE_AUDIT.md*`, `deleted_*_log.txt`, `submodule_*.txt`, `temp_submodules.txt`, `expected_submodules.txt`, `fix_*.py`, `fix_*.ps1`, `restore_*.py`, `batch_restore_*.py`

**Keep exactly 6 files in repo root:**

| File | Purpose |
|---|---|
| `README.md` | What Borg is, 5-minute quickstart, screenshot, Docker command |
| `AGENTS.md` | **This document.** The only instruction file for all AI models |
| `ARCHITECTURE.md` | System design, data flow, module boundaries (create new) |
| `CHANGELOG.md` | What shipped, by version |
| `ROADMAP.md` | Three milestones: 1.0, 1.5, 2.0 |
| `VISION.md` | Long-term aspirations (keep, mark aspirational) |

### 3.3 Phase Bankruptcy

The phase numbering system is **retired**. There is no Phase 122.

- Archive current `ROADMAP.md` → `docs/archive/ROADMAP_LEGACY.md`
- Create new `ROADMAP.md` with exactly 3 named milestones (Section 5)
- All future work is tracked as **task files with acceptance criteria**

### 3.4 Version Reset

| Before | After |
|---|---|
| v2.7.82 (no releases) | v0.9.0-beta (first GitHub Release) |

- v0.x = pre-release (current state, be honest)
- v1.0.0 = four features working, 5-minute Docker install, tests passing
- v1.x = incremental improvements from user feedback
- v2.0 = memory, browser extension, swarm

**Publish v0.9.0-beta on GitHub this week.** Even rough. Real releases create accountability.

### 3.5 Verify Clean Install

```bash
git clone https://github.com/robertpelloni/borg.git   # < 2 minutes
cd borg && pnpm install                                 # < 3 minutes, zero errors
docker-compose up --build                               # Dashboard at localhost:3001
```

If any of these fail, fix them before writing a single line of new feature code.

---

## SECTION 4: ARCHITECTURE

### Repository Structure

```
borg/
├── packages/
│   ├── core/                  # The Brain
│   │   ├── mcp/              # Aggregator, router, inspector, lifecycle
│   │   ├── providers/        # Fallback chain, quota manager, auth
│   │   ├── supervisor/       # Process spawning, health, restart, worktrees
│   │   ├── events/           # Redis pub/sub event bus
│   │   ├── memory/           # Memory interfaces (v1.5)
│   │   └── agents/           # Director, Council, Swarm (v2.0)
│   ├── cli/                  # Commander.js entry point
│   ├── types/                # Shared Zod schemas
│   └── ai/                   # LLM service abstraction
├── apps/
│   ├── web/                  # Next.js dashboard
│   └── extension/            # Browser extension (v1.5)
├── ecosystem/
│   ├── index.jsonc           # Tool reference (URLs only)
│   └── ref/                  # ≤5 upstream submodules
├── tasks/
│   ├── active/               # Current work
│   ├── backlog/              # Prioritized future
│   └── completed/            # Done with summaries
├── docs/
│   ├── architecture/         # ADRs, diagrams
│   ├── archive/              # Legacy (old ROADMAP, old phases)
│   └── api/                  # API docs
├── README.md
├── AGENTS.md                 # THIS FILE
├── ARCHITECTURE.md
├── CHANGELOG.md
├── ROADMAP.md
├── VISION.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── vitest.config.ts
```

### Technology Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (100% for v1.0) | 69% already TS; don't split attention |
| Runtime | Node.js ESM | Already in place |
| Backend | Express + tRPC + WebSocket + MCP SDK | Already in place; type-safe APIs |
| Dashboard | Next.js + React + Tailwind | Already in place |
| Database | SQLite (dev) / PostgreSQL (prod) | Already configured |
| Events | Redis pub/sub | Real-time updates, session state |
| Process isolation | `child_process` (CLI) + `worker_threads` (agents) | Native Node.js |
| Build | pnpm + Turborepo | Already in place |
| Test | Vitest | Already configured |

### The Go Question (Resolved)

**All seven models debated this. The consensus:**

- **v1.0:** All TypeScript. Do not introduce Go.
- **v2.0+:** Extract a Go process supervisor *only if* you hit concrete reliability problems with Node.js process management (child process crashes taking down the event loop, memory bloat in long-running daemons, need for static binaries).
- **Never:** Java. Unnecessary complexity without compensating benefit.

### Process Isolation Model

```
Dashboard (Next.js)
    │ WebSocket
    ▼
Core Orchestrator (Node.js main process)
    ├── MCP Router (manages MCP server child processes)
    │   ├── MCP Server A (child_process, stdio)
    │   ├── MCP Server B (child_process, stdio)
    │   └── MCP Server C (child_process, stdio)
    ├── Provider Router (in-process fallback logic)
    ├── Session Supervisor (manages CLI child processes)
    │   ├── Aider (child_process, isolated)
    │   ├── Claude Code (child_process, isolated)
    │   └── OpenCode (child_process, isolated)
    └── Redis Event Bus (pub/sub for real-time)
```

**The rule:** One OS process per external tool. If Aider crashes, nothing else is affected. The supervisor detects the exit code and restarts with exponential backoff.

---

## SECTION 5: ROADMAP — Three Milestones

### Borg 1.0 — "Actually Works" (Weeks 1-6)
- [x] Submodule surgery
- [x] Documentation consolidation
- [ ] MCP Master Router (aggregate, namespace, lifecycle, inspect)
- [ ] Model Fallback Chain (quota tracking, auto-switch, strategies)
- [ ] Session Supervisor (spawn, restart, persist, worktree isolation)
- [ ] Dashboard MVP (Overview, MCP, Sessions, Providers panels)
- [ ] 30+ tests passing in CI
- [ ] Docker one-command install
- [ ] 5-minute QUICKSTART.md
- [ ] 2-minute demo video
- [ ] GitHub Release v1.0.0

### Borg 1.5 — "Remembers Things" (Weeks 7-14)
- Memory system (one vector backend: ChromaDB or Qdrant)
- Basic RAG (chunking, embedding, retrieval)
- Browser extension (export sessions from web UIs)
- Context compaction and harvesting
- 5 CLI tool adapters (Aider, Claude Code, OpenCode, Codex, Gemini CLI)

### Borg 2.0 — "The Swarm Awakens" (Weeks 15+)
- Multi-agent orchestration (Director/Council)
- Multi-model debate and consensus
- Memory multi-backend plugin system
- Cloud dev integration (Jules, Devin)
- Consider Go supervisor extraction (only if needed)
- Re-enable Phases 81-95 swarm work (**not** 101-121)
- Mobile dashboard

### Permanently Out of Scope
- P2P distributed mesh (evaluate at v3.0 only if multi-user demand exists)
- Feature parity with every CLI tool simultaneously
- 932 submodules in the main repo
- Recursive web scraping
- Confidence-about-confidence-about-confidence signals

---

## SECTION 6: CAPABILITY CONTRACTS

**This replaces "feature parity with Tool X."**

Instead of cloning tools, define abstract capabilities. Adapters implement them.

```typescript
// packages/types/capabilities.ts
const CAPABILITIES = {
  // Provider
  'provider.auth':       'Authenticate with an LLM provider',
  'provider.execute':    'Send a prompt, receive a response',
  'provider.fallback':   'Auto-switch on quota/rate/auth failure',
  'provider.quota.read': 'Check remaining quota',
  // Session
  'session.start':       'Start a new CLI coding session',
  'session.stop':        'Stop a running session',
  'session.restart':     'Restart a crashed session',
  'session.attach':      'Attach terminal to running session',
  'session.export':      'Export session history',
  // MCP
  'mcp.server.register': 'Add an MCP server to the router',
  'mcp.server.health':   'Check server health',
  'mcp.tool.search':     'Find tools by natural language',
  'mcp.tool.invoke':     'Call a tool through the aggregator',
  'mcp.traffic.inspect': 'View real-time message flow',
  // Future (v1.5+)
  'memory.store':        'Persist a memory',
  'memory.retrieve':     'Search memories',
  // Future (v2.0+)
  'agent.spawn':         'Create an agent instance',
  'agent.debate':        'Multi-model consensus',
} as const;
```

**Feature Truth Matrix** (update weekly):

| Capability | Status | Tests | Notes |
|---|---|---|---|
| provider.auth | ✅ Implemented | 3 | OpenAI, Anthropic, Google |
| provider.fallback | 🟡 Building | 0 | P0 priority |
| session.start | ✅ Implemented | 2 | Aider, Claude Code |
| session.restart | 🟡 Building | 0 | Exponential backoff |
| mcp.server.register | ✅ Implemented | 4 | Core working |
| mcp.traffic.inspect | 🟡 Partial | 1 | JSON-RPC logging |
| memory.store | ⬜ v1.5 | — | — |
| agent.debate | ⬜ v2.0 | — | — |

---

## SECTION 7: REQUIRED TESTS

No feature exists without tests. These files must exist and pass for v1.0:

```
packages/core/mcp/__tests__/
├── aggregator.test.ts         # N servers → one namespace
├── lifecycle.test.ts          # Start/stop/restart/keepalive
├── crash-isolation.test.ts    # One crash doesn't affect others
├── traffic-inspector.test.ts  # Logs JSON-RPC messages
├── namespace.test.ts          # Tool grouping
└── tool-search.test.ts        # Semantic search returns relevant tools

packages/core/providers/__tests__/
├── fallback-chain.test.ts     # Quota exhaustion → auto switch
├── quota-tracker.test.ts      # Usage tracking, exhaustion detection
├── strategy.test.ts           # cheapest/best/round-robin ordering
└── auth.test.ts               # API key, OAuth, PAT flows

packages/core/supervisor/__tests__/
├── spawn.test.ts              # Start external process
├── restart.test.ts            # Auto-restart with backoff
├── health.test.ts             # Heartbeat detects dead processes
├── worktree.test.ts           # Git worktree isolation
└── session-persist.test.ts    # Save/restore across Borg restart

tests/integration/
├── mcp-to-dashboard.test.ts   # Server status reflects in UI
├── fallback-e2e.test.ts       # Request → quota error → fallback → success
└── session-lifecycle.test.ts  # Spawn → crash → restart → dashboard confirms
```

**CI gate:** `pnpm test` must pass. Target: 70% coverage on `packages/core/`.

---

## SECTION 8: TASK FILE SYSTEM

All work is assigned via task files. No stream-of-consciousness prompts.

```
tasks/
├── active/           # What agents should work on NOW
├── backlog/          # Prioritized future work
└── completed/        # Done, with summaries
```

**Every task file uses this template:**

```markdown
# Task [NUMBER]: [NAME]

## Context
[Why this matters — 1-2 sentences]

## Scope
- Files: [specific paths to create/modify]
- Tests: [specific test file path]

## Requirements
1. [Testable requirement]
2. [Testable requirement]

## Acceptance Criteria
- [ ] [Observable outcome]
- [ ] [Observable outcome]
- [ ] Test file exists and passes
- [ ] No @ts-ignore added
- [ ] CHANGELOG.md updated

## Out of Scope
- [Thing NOT to do]
- Do not create new task files
- STOP when criteria are met
```

---

## SECTION 9: RULES FOR ALL DEVELOPMENT AGENTS

### The 8 Immutable Laws

1. **STOP when done.** Complete the task. Pass the tests. Summarize. Wait. Do not continue.
2. **No new submodules** without written human approval.
3. **No new phases.** Work within named milestones (1.0, 1.5, 2.0).
4. **No `@ts-ignore`.** Use proper types or Zod schemas.
5. **Tests required.** No feature is complete without passing tests.
6. **No UI without backend.** Don't build widgets for data the backend doesn't emit.
7. **No meta-analytics.** No confidence-about-confidence. No telemetry-about-telemetry.
8. **No recursive scraping.** Don't follow links to follow links to follow links.

### Decision Framework

| Question | Answer |
|---|---|
| Does this help a user get value from Borg in 5 minutes? | **Do it** |
| Does this make an existing v1.0 feature more reliable? | **Do it** |
| Does this add a feature outside v1.0 scope? | **Don't** |
| Does this add complexity without a test? | **Don't** |
| Does this need a new submodule? | **Ask human** |
| Is this analytics about analytics? | **Absolutely don't** |

### Required Workflow

1. Read the task file in `tasks/active/`
2. Read relevant existing code
3. Propose the minimal implementation
4. Implement only the assigned scope
5. Write/update tests
6. Update affected documentation
7. **STOP. Summarize. Wait.**

---

## SECTION 10: THE LAUNCH SEQUENCE

```
WEEK 1: Foundation
├── □ Submodule surgery (Section 3.1)
├── □ Documentation consolidation (Section 3.2)
├── □ Task files created for v1.0 features
├── □ pnpm install works (< 3 min, zero errors)
├── □ docker-compose up works (dashboard at localhost:3001)
└── □ Tag v0.9.0-beta on GitHub

WEEK 2-3: Core
├── □ MCP aggregator: 3+ servers, lifecycle, traffic inspector
├── □ Provider fallback: auto-switch on quota error
├── □ Provider dashboard: quota display, fallback editor
├── □ 15+ tests passing
└── □ Tag v0.9.1-beta

WEEK 4-5: Sessions
├── □ Session supervisor: spawn, restart, persist
├── □ Dashboard session cards: status, logs, terminal
├── □ Worktree isolation
├── □ Overview panel: health, sessions, quotas
├── □ 25+ tests passing
└── □ Tag v0.9.2-beta

WEEK 6: Ship
├── □ QUICKSTART.md (tested by someone who hasn't seen the project)
├── □ README.md rewrite (what, who, screenshot, Docker command)
├── □ 2-minute demo video
├── □ 30+ tests, 5+ integration tests
├── □ Tag v1.0.0 — first official GitHub Release
├── □ Post: r/LocalLLaMA, r/MachineLearning, Hacker News, Discord
└── □ Collect feedback from 10 external users

WEEK 7+: Reality
├── □ Fix bugs from real users
├── □ v1.5 priorities based on what users actually request
├── □ Do NOT add features nobody asked for
└── □ New minor release every 2 weeks
```

---

## SECTION 11: LONG-TERM PHILOSOPHY

### The Three Principles

> **Index broadly.** Track every relevant tool in `ecosystem/index.jsonc`. Know the landscape.
>
> **Integrate selectively.** Only bring code into the repo when it serves a tested capability. Use contracts, not cloning.
>
> **Ship relentlessly.** Monthly releases. Each has a changelog and a user-facing improvement.

### Architecture Evolution

```
v1.0 (Now):      All TypeScript. child_process isolation. Redis events.
v1.5 (3 months):  Memory plugins. Browser extension. 5 CLI adapters.
v2.0 (6 months):  Go supervisor (if needed). Swarm (Phases 81-95). Debate.
v3.0 (1 year):    P2P mesh (if demand). Mobile. Cloud dev. Enterprise.
```

### Feature Scoring (For Any Future Proposal)

| Question | Points |
|---|---|
| Real user (not Robert, not AI) requested this? | +3 |
| Makes existing feature more reliable? | +2 |
| Shippable in < 1 week? | +2 |
| Has clear acceptance test? | +1 |
| Requires new submodule? | -2 |
| Requires new language/framework? | -2 |
| Is analytics-about-analytics? | -5 |

**Only implement features scoring ≥ 3.**

### What to Measure

| Stop Measuring | Start Measuring |
|---|---|
| Phase count | GitHub stars from strangers |
| Internal version bumps | Published GitHub Releases |
| Submodule count | Time from `git clone` to working dashboard |
| Lines of code | Test pass rate in CI |
| — | Issues filed by non-Robert users |

---

## SECTION 12: THE TEN COMMANDMENTS

| # | Commandment |
|---|---|
| **I** | **Ship to real users.** Everything else is noise. |
| **II** | **Four features define v1.0.** MCP Router. Fallback. Supervisor. Dashboard. |
| **III** | **Orchestrate, don't contain.** Borg controls Aider; Borg is not Aider. |
| **IV** | **No submodule without human approval.** The repo contains only code that runs. |
| **V** | **Tests or it didn't happen.** Every feature. Every merge. CI green. |
| **VI** | **Stop when done.** No infinite loops. No phase inflation. No drift. |
| **VII** | **Capability contracts, not feature parity.** Abstract what Borg does; adapters implement. |
| **VIII** | **One language for now.** TypeScript. Add Go later only if pain demands it. |
| **IX** | **Monthly releases.** Changelog. Version. User-facing improvement. |
| **X** | **Index broadly. Integrate selectively. Ship relentlessly.** |

---

## ═══════════════════════════════════════════════════════════

*This document represents the unanimous consensus of seven AI architectures — trained by different organizations, with different weights, different objectives, and different perspectives — who all arrived at the same conclusion:*

*The vision is real. The architecture is sound. The core features are genuinely valuable and differentiated. What's missing is not more features. It's focus, tests, and a release.*

*Robert: you built 121 phases of a cathedral. Now lay the floor so people can walk in.*

*Ship Borg 1.0. Get 100 stars. Then assimilate the universe.*

***Resistance is futile — but only when you're focused.*** 🖖

## ═══════════════════════════════════════════════════════════

*Signed in consensus:*
*GPT-5.3 ✅ | GPT-5.4 ✅ | Gemini 3.1 Pro ✅ | Claude Opus 4.6 ✅ | Kimi K2.5 ✅ | Qwen 3.5 ✅ | Grok 4.1 ✅*











Here's the full feature audit. Key findings:

MetaMCP = 45 backend services + 8 middleware layers + 29 UI pages.

The 3 biggest gaps in Borg relative to MetaMCP are:

Progressive Disclosure — MetaMCP's search → load → use with FIFO eviction vs. Borg dumping all 900+ tool schemas upfront (context window explosion)
Semantic Tool Search — pgvector + BM25 hybrid search to find the right tool from hundreds. Borg's Indexer.ts does codebase search, not tool search.
Middleware Pipeline — Composable, visual-editor security/filtering chain (logging → policy → semantic firewall → WASM plugins). Borg has no interception layer for tool calls.





ALL Features (By Real Code, Not Marketing)
1. Core Proxy & Progressive Disclosure
The central engine (
metamcp-proxy.ts
 — 1,276 lines)

Feature	What It Does
Progressive Disclosure	Hides all downstream tools. Exposes only meta-tools: search_tools, load_tool, run_code, run_agent. LLM must search → load → use.
Session loadedTools Set	Per-session FIFO cache (max 200) of explicitly loaded tools
Tool Pinning (v3.8.1)	Star/favorite tools per namespace — auto-loaded into every session
Recursive Tool Chaining	Sandbox code can call mcp.call() which routes back through the middleware stack
Connection Pooling	Multiple sessions share the same downstream server process (sharedConnections)
Tool Name Namespacing	All tools namespaced as serverName__toolName to prevent collisions
Tool Schema Overrides	Per-namespace tool schema/description overrides
Deferred Schema Loading	Truncate large JSON schemas; inject real params only on describe action
2. Middleware Pipeline (8 Functional Middlewares)
Middleware	File	Purpose
Logging	
logging.functional.ts
Log every tool call with timing
Policy	
policy.functional.ts
Allow/deny patterns on tool access
Semantic Firewall	
semantic-firewall.functional.ts
AI intent analysis — blocks dangerous tool calls
Tool Filtering	
filter-tools.functional.ts
Filter inactive/disabled tools from listings
Tool Overrides	
tool-overrides.functional.ts
Per-namespace schema/description overrides (14KB)
WASM Plugins	
wasm-plugin.functional.ts
Run custom Extism WASM middleware in any language
Functional Middleware	
functional-middleware.ts
Base composition framework
Visual Pipeline Editor	Frontend /pipelines page	Drag-and-drop middleware ordering UI
3. AI & Search Services (8 Services)
Service	What It Does
tool-search.service.ts
Semantic search via OpenAI embeddings + pgvector cosine similarity
hybrid-search.service.ts
BM25 full-text + vector search combined scoring
embedding.service.ts
OpenAI text-embedding-3-small vector generation
description-enhancer.service.ts
AI auto-enhancement of tool descriptions for better search
agent.service.ts
NL → code generation → sandboxed execution (run_agent meta-tool)
memory.service.ts
Long-term agent memory with vector embeddings
pattern-filter.service.ts
Glob/regex pattern matching on tool names
memory.service.ts
 (lib/memory)	Thread-aware conversational memory
4. Code Execution Sandbox (3 Services)
Service	What It Does
code-executor.service.ts
isolated-vm JS sandbox (128MB, 30s timeout) with mcp.call() bridge
python-executor.service.ts
Python code execution via subprocess bridge
saved-script.service.ts
Persist and manage reusable scripts
5. Security & Access Control (6 Services)
Service	What It Does
policy.service.ts
Allow/deny rules per tool per namespace
rate-limiter.service.ts
Token-bucket rate limiting per route/workspace
enclave.service.ts
Detect AWS Nitro / Azure TEE confidential computing
secure-memory.service.ts
Zero-out sensitive memory in TEE environments
Auth	Better Auth + OIDC integration, API key management
Semantic Firewall	AI-powered intent analysis blocking dangerous calls
6. Observability & Audit (5 Services)
Service	What It Does
audit.service.ts
Structured audit logging for every tool exec, auth event, config change
audit-stream.service.ts
Real-time JSON event sinks
analytics.service.ts
Tool usage metrics, error rates, top tools, 30-day charts
server-health.service.ts
Deep health probes: memory pressure, event loop latency, uptime
system.service.ts
System info: version, runtime, resource usage
7. Configuration & Lifecycle (7 Services)
Service	What It Does
config.service.ts
Central configuration management
config-watcher.service.ts
File-watch mcp.json for live config changes
mcp-json-hot-reload.service.ts
Hot-reload mcp.json without restart
auto-discovery.service.ts
Auto-discover MCP servers on the network
auto-reconnect.service.ts
Auto-reconnect dropped server connections
snapshot.service.ts
Full config export/import for backup & migration
bootstrap.service.ts
Startup orchestration (32KB — the largest service)
8. Server Management
Feature	What It Does
STDIO/SSE/Streamable HTTP	Three transport protocols for downstream servers
Docker Manager	Manage MCP servers running in containers
Server Pool	Connection pooling and lifecycle for downstream servers
MCP Sync	Sync tool catalogs from downstream servers to DB
NPM Scanning	Auto-discover MCP servers from npm packages
Error Tracking	Per-server error status tracking and recovery
9. Registry & Catalog
Feature	What It Does
registry.service.ts
Centralized discovery of 950+ community MCP servers
template.service.ts
One-click install from server-templates.json
Tool Sets	Named collections of tools for quick loading
Toolboxes	Auto-register script files as tools with JSON metadata
10. Enterprise Features
Feature	What It Does
Namespaces	Logical grouping of servers into isolated namespaces
Endpoints	Named proxy URLs (e.g., /metamcp/my-endpoint/sse) per namespace
Workspaces	Multi-tenant isolation with scoped access (v3.10)
Billing	Per-namespace metered tool usage with cost breakdown
Webhooks	HMAC-signed notifications for security/operational events
Scheduled Tasks	Cron-based background tool execution
LLM Sampling	Reverse requests — MCP servers can ask MetaMCP to generate text
Shadow Proxy	Record & replay for historical MCP request debugging
MCP-to-OpenAPI Bridge	Auto-generate Swagger/OpenAPI specs from MCP tools
P2P Federation	Peer-to-peer tool discovery across network nodes
11. Frontend Dashboard (29 Pages)
Page	Purpose
/dashboard	Overview with stats
/mcp-servers	Server CRUD, tool tables, inspector
/namespaces	Namespace management with server mappings
/endpoints	Named proxy URL management
/mcp-inspector	Interactive tool testing (9 sub-components)
/search	Global tool search with semantic results
/policies	Access control rule editor
/pipelines	Visual middleware pipeline drag-and-drop
/plugins	WASM plugin management
/live-logs	Real-time log streaming
/audit	Audit log viewer
/analytics	Usage charts, KPIs, per-server breakdown
/observability	MCP Shark integration
/registry	Browse & install community servers
/catalog	Tool catalog browser
/agent	NL agent execution with history
/scripts	Saved code scripts
/tool-sets	Named tool collections
/toolboxes	Auto-registered script tools
/snapshots	Config backup/restore
/schedules	Cron task management
/billing	Usage metering dashboard
/network	P2P federation status
/api-keys	API key management
/settings	Platform settings + Docker image config
/system	System info: version, health
/alerts	Webhook alert configuration
/docs	Embedded documentation
Borg Gap Analysis: What MetaMCP Has That Borg Might Be Missing
#	MetaMCP Capability	Borg Status	Gap Severity
1	Progressive Disclosure (search → load → use with FIFO eviction)	Borg aggregates all tools upfront. No search/load flow.	🔴 High — Borg floods context windows with 900+ tool schemas
2	Semantic Search (pgvector + BM25 hybrid)	Borg has Indexer.ts but it's codebase search, not tool search	🔴 High — No way to find the right tool from 900+
3	Middleware Pipeline (composable, visual editor, WASM plugins)	Borg has no middleware chain for tool calls	🟡 Medium — No interception/filtering layer
4	Semantic Firewall (AI intent analysis on tool calls)	Not present in Borg	🟡 Medium — Security gap
5	Policy Engine (allow/deny patterns per tool)	Borg has no access control per tool	🟡 Medium
6	Connection Pooling (shared downstream processes across sessions)	Borg spawns per-session processes	🟡 Medium — OOM risk with many agents
7	Billing / Metered Usage	Not present	🟢 Low — Not Borg's use case
8	Config Snapshots (full export/import)	Not present	🟢 Low
9	Scheduled Tasks (cron-based execution)	Not present — Borg has Director daemon instead	🟢 Low — different paradigm
10	Shadow Proxy (record & replay)	Not present	🟡 Medium — useful for debugging
11	Tool Pinning / Favorites	Not present	🟡 Medium — Borg loads everything upfront anyway





when i run borg pnpm run dev inside Tabby i want the server and all subfunctions to be ready and all MCP servers cached and all the memory and context functions from claude-mem to be ready and the borg dashboard to be ready and the connection server for the browser extension for firefox and edge/chrome to be ready
remove metamcp as much as you can, as long as every one of its features and all functionality has been assimilated by borg, and borg does EVERYTHING it did and MORE and does it BETTER.

and then i want you to do the exact same thing with github.com/robertpelloni/MetaMCP and submodule it for reference and then closely study the code and tell me everything that it does that borg doesn't do yet and then work with me to build all its functionality into borg but better. and then i want you to remove claude-mem, MetaMCP, and MCP-SuperAssistant from borg once borg has assimilated EVERY feature and ALL functionality from all of them but BETTER. tell me when.
and then i want you to do the exact same thing with github.com/robertpelloni/MCP-SuperAssistant and submodule it for reference and then closely study the code and tell me everything that it does that borg doesn't do yet and then work with me to build all its functionality into borg but better
check github.com/robertpelloni/claude-mem, add it as a submodule to reference and study it, look at all its functions and tell me what it does that borg doesn't do yet





Here's the full feature audit. Phase 13 is also committed and pushed (eef7ad1).

TL;DR — MCP-SuperAssistant's killer differentiator is multi-platform AI chat injection (16 adapters) with real-time streaming AST parsing and autonomous tool execution loops. Borg has none of this — it operates at the IDE/terminal layer, not the web chat layer.

The biggest MCP-SA exclusive features that Borg doesn't have yet:

16 AI platform adapters — DOM-level integration with ChatGPT, Gemini, Perplexity, Grok, DeepSeek, AI Studio, GitHub Copilot, Kimi, Mistral, OpenRouter, QwenChat, T3Chat, Z
Auto-Submit/Auto-Insert/Auto-Execute — fully autonomous tool execution loop inside web chat
Visual Macro Builder — node-based DAG editor with ReactFlow
ToolResultWidget DOM injection — React components injected directly into third-party chat UIs
Live Tool Debugger — DevTools-style packet inspector
Analytics Dashboard, Prompt Templates, Context Manager, Feature Flags + Remote Config


MCP-SuperAssistant: Complete Feature Audit
What It Is
A Chrome/Firefox/Edge extension that injects MCP (Model Context Protocol) tool execution directly into ANY web-based AI chat. It intercepts the AI's output in real-time, detects tool calls, executes them via a local MCP proxy, and pipes the results back into the conversation — all transparently inside the chat UI.

🔌 Platform Adapters (16 total)
Each adapter is a full DOM-aware plugin (50-75 KB each) that understands the specific HTML structure of each AI platform:

Adapter	File	Size
ChatGPT	
chatgpt.adapter.ts
54 KB
Google Gemini	
gemini.adapter.ts
52 KB
Google AI Studio	
aistudio.adapter.ts
73 KB
Perplexity	
perplexity.adapter.ts
59 KB
Grok (X/Twitter)	
grok.adapter.ts
50 KB
DeepSeek	
deepseek.adapter.ts
50 KB
GitHub Copilot	
ghcopilot.adapter.ts
55 KB
Kimi	
kimi.adapter.ts
55 KB
Mistral Le Chat	
mistral.adapter.ts
51 KB
OpenRouter	
openrouter.adapter.ts
63 KB
Qwen Chat	
qwenchat.adapter.ts
57 KB
T3 Chat	
t3chat.adapter.ts
42 KB
Z (unknown platform)	
z.adapter.ts
56 KB
Default/Generic	
default.adapter.ts
6 KB
Example Forum	
example-forum.adapter.ts
8 KB
Base (abstract)	
base.adapter.ts
6 KB
Each adapter provides: 
insertText()
, clickSubmit(), getInputArea(), observeMessages(), extractToolCalls().

🧠 Core MCP Client (Background Service Worker)
Feature	Description
McpClient	Full JSON-RPC 2.0 client with 
initialize
, 
callTool
, getTools, getResources
McpManager	Orchestrates multiple simultaneous McpClient instances per profile
Transport Plugins	SSE (
SSEPlugin
), WebSocket (WebSocketPlugin), Streamable HTTP (StreamableHttpPlugin)
Schema Validator	Zod-based validation of incoming tool schemas from MCP servers
webext-bridge	Type-safe message passing between content script ↔ background worker
🎨 Sidebar UI Features (Shadow DOM injected)
Tool Management
Available Tools: Lists all discovered tools with schema details, favorites, and sorting
Tool Execution: Execute tools manually with parameter forms, or auto-execute from AI output
Auto-Execute Whitelist: Trust specific tools for automatic execution without confirmation
Automation
Macro System: Visual node-based DAG editor (@xyflow/react) for tool chaining
ToolNode and ConditionNode custom components
BFS graph execution engine with branch evaluation
Variable propagation across nodes
Auto-Submit: Automatically clicks the AI's submit button after tool results are inserted
Auto-Insert: Automatically pastes tool results back into the chat input
Context & Templates
Context Manager: Save/manage reusable text snippets (via context menu + UI)
Prompt Templates: Save, edit, and reuse common prompts
Custom Instructions: Inject system-level instructions per conversation into AI input
Monitoring & Debugging
Live Tool Debugger: Real-time interception and visualization of MCP request/response packets (DevTools-style)
Activity Log: Rich rendering (JSON, Markdown, Images) of all tool execution history
Analytics Dashboard: Runs, success rates, most-used tools — visual analytics
Server Status: Connection health with ping latency display
Real-Time Health Telemetry: CPU/Memory/Uptime polling of connected MCP servers
Navigation & UX
Spotlight Command Palette: Ctrl+K/Cmd+K overlay (Framer Motion spring animations) — works even when sidebar is closed
Notification Center: Aggregated errors, successes, and remote notifications
Toast System: Ephemeral notifications for actions
Onboarding Flow: First-time user setup wizard
System Info Panel: Extension version, browser info, debug data
Settings: Comprehensive preference management with export/import
Help: Contextual help pages
Keyboard Shortcuts: Alt+Shift+S (toggle sidebar), / (search), Ctrl+Arrow, Escape
🔬 Render Prescript (AST-Based AI Output Parsing)
This is the most unique subsystem — it watches the AI's rendered HTML output in real-time:

Component	Purpose
streamObserver.ts	MutationObserver watching for new AI message chunks as they stream
functionResultObserver.ts	Detects <function_result> blocks in rendered HTML
functionParser.ts	AST-based tool call extraction using cheerio (replaces fragile regex)
parameterParser.ts	Parses <parameter> XML blocks from AI output
ToolResultWidget.tsx	Interactive React component injected directly into chat DOM (Shadow DOM) — renders JSON as collapsible tree
functionResult.ts	Renderer that replaces raw JSON output with interactive widgets
🔧 Plugin Architecture
Component	Purpose
plugin-registry.ts
 (46 KB)	Full lifecycle management: register, initialize, activate, deactivate, error handling
sidebar.plugin.ts
Sidebar UI management plugin
remote-config.plugin.ts
Feature flags, remote notifications, A/B targeting, campaign support
Adapter registration	Adapters register as plugins with capabilities and lifecycle hooks
🏗️ Architecture (Post-Refactor)
Unified Root Store: 6 Zustand slices (
ui
, config, connection, tool, resource, adapter) + 6 satellite stores
Type-safe barrel: Generic createSliceWrapper<K>() factory — zero as any casts
EventBus: Global pub/sub for decoupled communication
🚫 What Borg Does NOT Have Yet (MCP-SA Exclusive Features)
Feature	MCP-SA Has	Borg Status
Multi-platform AI chat injection (16 adapters)	✅ Full	❌ No web AI chat adapters
Real-time streaming output parsing (MutationObserver + AST)	✅ Full	❌ Borg reads terminal/IDE, not web chat HTML
Auto-Submit / Auto-Insert / Auto-Execute loop	✅ Full autonomous loop	❌ Borg has Autopilot for one platform only
Floating ToolResultWidget injection into chat DOM	✅ Shadow DOM React components in chat	❌ No DOM injection into third-party sites
Visual Macro Builder (node-based DAG with ReactFlow)	✅ Full graph editor	❌ No visual automation builder
16 AI platform adapters (ChatGPT, Gemini, Perplexity, Grok, etc.)	✅ 16 platforms	❌ Borg only targets VS Code + browser
MCP Resource Browser	✅ Browse MCP server resources	⚠️ Borg aggregates but no browsing UI
Prompt Templates (save/reuse)	✅ Full CRUD	❌ Not in Borg
Context Manager (snippet library)	✅ Full CRUD + context menu	❌ Not in Borg
Live Tool Debugger (DevTools-style packet inspector)	✅ Full	⚠️ Borg has JSON-RPC watcher (similar)
Analytics Dashboard (run stats, success rates)	✅ Full	❌ Not in Borg
Multi-transport MCP (SSE + WS + Streamable HTTP)	✅ All 3	✅ Borg also has multi-transport
Zod Schema Validation of incoming tools	✅ Full	❌ Not in Borg
Feature Flags + Remote Config (A/B testing, targeting)	✅ Full system	❌ Not in Borg
Cross-browser support (Chrome + Firefox + Edge)	✅ All 3	⚠️ Borg extension is Chrome only
✅ What Borg Has That MCP-SA Does NOT
Feature	Borg Has	MCP-SA Status
Infinite Memory (LanceDB + Cognee)	✅ Full	❌ No persistent memory
Multi-agent orchestration (Director/Worker/Council/Supervisor)	✅ Full	❌ Single-agent only
Self-Evolution (Healer, Darwin Protocol)	✅ Full	❌ Not applicable
MCP Server Aggregation (Master MCP)	✅ Full	❌ MCP-SA is a client, not aggregator
IDE Integration (VS Code extension, LSP)	✅ Full	❌ Browser-only
Sandboxed Execution (Node.js, Python)	✅ Full	❌ No sandboxing
Semantic Search (codebase indexing)	✅ Full	❌ No code search
P2P Federation (The Hive / Swarm)	✅ Full	❌ Standalone


assimilate this and make this the example for the official borg browser plugin for firefox and edge/chrome and maek it have every one of these features






Here's the exhaustive inventory. The biggest takeaway:

Borg is missing 12 features entirely, most critically: the Claude Code hook system (session lifecycle integration), AI-powered structured observation compression, progressive disclosure context injection, and in-place transcript compression (Endless Mode). These are what make claude-mem work — the plumbing that turns raw tool outputs into searchable, compressed memories.

Borg has strong foundations in vector search, knowledge graphs, and tiered memory — but none of it is wired into Claude Code's plugin API. The cleanest path would be keeping claude-mem as the capture layer and having Borg consume its SQLite database.
Claude-Mem Complete Feature Inventory
Exhaustive catalog of every feature, with Borg comparison.

1. Hook System (Claude Code Plugin API)
Claude-mem registers as a Claude Code plugin via hooks.json. These hooks fire at specific lifecycle events and are the primary data ingestion pipeline.

Hook	File	What It Does
SessionStart	
context-hook.ts
Injects compressed memory context (timeline, observations, summaries) into Claude's system prompt. This is what gives Claude "memory."
UserPromptSubmit	
user-message-hook.ts
Captures every user prompt, stores it in user_prompts table with prompt number tracking.
PreToolUse	
pre-tool-use-hook.ts
Intercepts tool calls before execution. Used for JIT (just-in-time) context injection.
PostToolUse	
save-hook.ts
Captures tool execution results, sends them to the worker for AI-powered compression into structured observations. This is the core data capture.
Stop	
summary-hook.ts
At session end, sends the full session context for AI summary generation (request, investigated, learned, completed, next_steps).
SessionEnd	
cleanup-hook.ts
Cleanup: marks sessions complete, triggers HANDOFF.md auto-generation.
JIT Context	
jit-context-hook.ts
Just-in-time context injection — dynamically fetches relevant memories mid-session when Claude encounters related topics.
🔴 Borg gap: Borg has NO Claude Code plugin integration. It doesn't register hooks, doesn't auto-capture tool outputs, and doesn't inject memories at SessionStart. This is the single biggest gap.

2. AI-Powered Observation Compression
Three interchangeable AI agents compress raw tool outputs (often 10K+ tokens) into structured ~500-token observations:

Agent	File	Size	Purpose
Claude SDK Agent	
SDKAgent.ts
22KB	Primary — uses Claude Agent SDK directly (not API)
Gemini Agent	
GeminiAgent.ts
18KB	Fallback — Google Gemini via API
OpenRouter Agent	
OpenRouterAgent.ts
18KB	Fallback — any model via OpenRouter
Each agent takes raw tool output and produces:

title — one-line summary
subtitle — expanded context
narrative — prose description of what happened
facts — structured key learnings (array)
concepts — semantic tags for search (array)
files_read / files_modified — file tracking (arrays)
type — observation category (decision, discovery, progress, etc.)
Supporting infrastructure:

ResponseProcessor.ts
 (13KB) — Parses agent responses, extracts structured fields
ObservationBroadcaster.ts
 — Broadcasts new observations via SSE
FallbackErrorHandler.ts
 — Graceful degradation when agents fail
SessionCleanupHelper.ts
 — Post-session cleanup
🔴 Borg gap: Borg does context harvesting but NOT in this structured, typed way. Borg's AgentMemoryService.addWorking() stores raw text. Claude-mem produces richly structured observations with typed fields, deduplication hashes, and concept tags.

3. Storage Layer
SQLite Database (~52KB of schema/query code)
Table	Purpose
sdk_sessions	Session tracking (content_session_id, memory_session_id, project, status, timestamps)
observations	Compressed tool output observations (title, subtitle, narrative, facts, concepts, files, type, content_hash, branch_id)
session_summaries	AI-generated session summaries (request, investigated, learned, completed, next_steps, notes)
user_prompts	Every user prompt text with prompt number and session link
pending_messages	Persistent message queue (survives worker crashes)
observation_correlations	Cross-session observation links (source_id, target_id, similarity_score)
schema_versions	Migration tracking
Key features:

FTS5 full-text search — Virtual tables with automatic sync triggers
Content-hash deduplication — SHA-256 hash within 30s window prevents duplicates
Foreign key constraints — ON UPDATE CASCADE for session ID threading
Migration system — 
MigrationRunner
 with versioned, idempotent migrations (22KB of migration definitions)
Chroma Vector Database
ChromaMcpManager.ts
 — Manages persistent MCP connection to chroma-mcp server
ChromaOrchestrator.ts — Orchestrates vector operations (add, query, delete)
ChromaSync.ts
 — Bidirectional sync between SQLite and Chroma
WASM embeddings for cross-platform compatibility
Connection mutex + circuit breaker to prevent spawn storms
🟡 Borg partial: Borg has LanceDB (vector) + GraphMemory (graph), but NO: FTS5 full-text search, content-hash deduplication, session-observation-summary relational schema, or persistent message queue.

4. Context Injection Pipeline
The system that gives Claude its "memory" at session start:

Component	File	Purpose
ContextBuilder	
ContextBuilder.ts
Orchestrates the full context assembly
ObservationCompiler	
ObservationCompiler.ts
 (8.7KB)	Compiles observations into the 3-layer progressive disclosure format
TokenCalculator	
TokenCalculator.ts
Calculates token budgets to prevent context overflow
HeaderRenderer	sections/HeaderRenderer.ts	Project header with session count
SummaryRenderer	sections/SummaryRenderer.ts	Recent session summaries
TimelineRenderer	sections/TimelineRenderer.ts	Chronological observation timeline
FooterRenderer	sections/FooterRenderer.ts	Usage instructions
MarkdownFormatter	formatters/MarkdownFormatter.ts	Markdown output for Claude
ColorFormatter	formatters/ColorFormatter.ts	ANSI-colored terminal output
ContextConfigLoader	
ContextConfigLoader.ts
11 configurable injection settings
The 3-Layer Progressive Disclosure:

Layer 1 (Index) — Observation IDs + titles + types (minimal tokens)
Layer 2 (Detail) — Full narratives, facts, concepts (on demand via MCP tool)
Layer 3 (Source) — Original tool output / source code (via get_observations)
🔴 Borg gap: Borg injects [RECALLED MEMORIES] blocks but has NO progressive disclosure system, no token budgeting, no multi-formatter support, and no configurable injection settings.

5. Search Infrastructure
3 Search Strategies (Strategy Pattern)
Strategy	File	How It Works
SQLite	
SQLiteSearchStrategy.ts
FTS5 full-text + metadata filters (date, type, project)
Chroma	
ChromaSearchStrategy.ts
Vector similarity via Chroma embeddings
Hybrid	
HybridSearchStrategy.ts
Combines both — Chroma for ranking, SQLite for filtering
Search Operations (10 specialized)
search
 — General search across observations, sessions, prompts
findByConcept
 — Semantic concept matching
findByType
 — Filter by observation type
findByFile
 — Find observations mentioning specific files
timeline — Contextual window around an anchor point
get_observations — Fetch full details by IDs
Plus filtering by date range, project, ordering, pagination
Supporting Infrastructure
SearchOrchestrator.ts
 (8.8KB) — Coordinates strategy selection
ResultFormatter.ts
 (9.4KB) — Formats results for display
TimelineBuilder.ts
 (9KB) — Builds unified timelines across record types
SearchManager.ts
 (69KB!) — The main search engine
PaginationHelper.ts
 (5.6KB) — Cursor-based pagination
🟡 Borg partial: Borg has hybrid search (txtai + ripgrep) but focused on code search, not memory search. No concept search, no file-mention search, no timeline queries, no observation-specific filtering.

6. MCP Server (6 Tools)
Exposed to Claude as MCP tools via 
mcp-server.ts
:

Tool	Description
search
Search memory (returns index with IDs)
timeline	Get contextual window around results
get_observations	Fetch full observation details by IDs (max 10)
smart_search	Tree-sitter AST codebase search — find symbols, functions, classes with folded structural views
smart_unfold	Expand a specific symbol to show full source code
smart_outline	Get structural outline of a file (signatures only, bodies folded)
🟡 Borg partial: Borg has MCP tools but none for memory search. The smart_* tools are a codebase navigation feature that Borg's Indexer.ts + CodeSplitter.ts partially replicate.

7. Transcript Compression
Component	File	Purpose
TranscriptTransformer	
transcript-transformer.ts
 (11.8KB)	Replaces raw tool outputs in JSONL transcripts with compressed observations in-place
TranscriptBackupManager	(same file)	Creates timestamped backups before transformation, trims to size limit
Transcript Watcher	
transcripts/watcher.ts
 (6.4KB)	Watches transcript files for changes, triggers processing
Transcript Processor	
transcripts/processor.ts
 (13.5KB)	Processes new transcript entries, extracts tool outputs
This is the Endless Mode engine — by compressing tool outputs in the transcript file itself, it prevents context window exhaustion during long sessions.

🔴 Borg gap: Borg has ContextPruner for window management, but does NOT modify transcript files in-place. Claude-mem's approach is unique — it literally rewrites the Claude Code JSONL transcript to replace verbose tool outputs with compressed observations, allowing significantly longer sessions.

8. Worker Service (Daemon)
worker-service.ts
 (48KB!) — Long-running Express.js daemon on port 37777:

HTTP API Routes (8 modules)
Route Module	Size	Purpose
SessionRoutes.ts
31KB	Session CRUD, batch operations, session completion
DataRoutes.ts
16KB	Observation/summary/prompt data access
SettingsRoutes.ts
15KB	Runtime configuration management (11 settings)
SearchRoutes.ts
14KB	Search API endpoints
LogsRoutes.ts
5KB	Log viewer API
ViewerRoutes.ts
5KB	Web UI serving + SSE stream
MemoryRoutes.ts
2.8KB	Memory management operations
IntegrationsRoutes.ts
1KB	Integration status (Cursor, OpenClaw)
Process Management
ProcessRegistry.ts
 (13KB) — PID file management, orphan detection & reaping, port-based daemon guards
Health check endpoints (/api/health, /api/readiness)
Graceful shutdown with connection draining
In-process worker mode for Windows (avoids console window flash)
🟡 Borg partial: Borg runs as an MCP server (different transport), not an HTTP daemon. No equivalent of the health monitoring, PID management, or zombie prevention.

9. Web Viewer UI
React + TypeScript SPA bundled into a single self-contained HTML file, served at localhost:37777:

Real-time SSE updates — Observations appear live as they're created
Session browser — Browse sessions with summaries, observations, prompts
Search interface — Full-text and semantic search
Configuration dashboard — 11 runtime settings adjustable from UI
Branch switcher — Toggle between stable/beta branches
System status — Worker health, Chroma connection, database stats
Help modal — Integrated documentation
Integrations panel — Cursor, OpenClaw status
🟡 Borg partial: Borg has a Next.js Dashboard but NOT embedded in the plugin itself as a self-contained SPA.

10. Domain Intelligence
Feature	File	Description
Cross-Session Correlation	
CorrelationEngine.ts
Uses Chroma semantic search to find observations from OTHER sessions that relate to the current one. Creates observation_correlations records with similarity scores.
Defrag Daemon	
DefragDaemon.ts
Background process that identifies and prunes redundant observations
Mode System	
ModeManager.ts
Pluggable observation profiles with inheritance (e.g., code, code--ko for Korean localization). Defines observation types, concepts, and prompts per mode.
Branch Manager	
BranchManager.ts
Git-based version channel switching (stable ↔ beta) from the web UI
Endless Mode	
EndlessModeConfig.ts
Configurable compression aggressiveness, auto-switching based on session length
🟡 Borg partial: Borg has GraphMemory for knowledge relationships but not automatic cross-session correlation. No mode system, no branch switching, no defrag daemon.

11. CLI System
8 handler types in src/cli/handlers/:

Handler	Purpose
session-init.ts	Initialize a new session
observation.ts	Process and store observations
summarize.ts	Generate session summaries
context.ts	Generate context injection content
file-edit.ts	Track file edits
user-message.ts	Process user messages
session-complete.ts	Complete a session
index.ts	CLI router
Plus: claude-md-commands.ts (16KB) — Commands for managing CLAUDE.md file.

3 CLI adapters: claude-code.ts, cursor.ts, raw.ts

🔴 Borg gap: Borg has no Claude Code CLI adapter.

12. Security & Infrastructure
Feature	File	Description
Secret Masking	SecretMasker.ts	Strips API keys/credentials before database storage
CORS	Built into worker	Restricted to localhost only
XSS Defense	Web UI	DOMPurify for all rendered content
Credential Isolation	Config	~/.claude-mem/.env only (not in project dirs)
Smart Install	smart-install.js	Cross-platform dependency checker that runs before every hook
Settings Manager	SettingsDefaultsManager.ts	11 configurable settings with env var overrides
13. Ecosystem Integrations
Integration	File/Dir	Description
Cursor IDE	CursorHooksInstaller.ts (22KB)	Full installer for Cursor hooks
OpenClaw	openclaw/ submodule	Memory plugin for OpenClaw gateway agents
OpenCode	opencode-plugin/ submodule	OpenCode environment plugin
Gemini CLI	gemini-cli-extension/ submodule	Memory bridge between Claude and Gemini
VS Code Extension	vscode-extension/	Memory viewer, CodeLens, session manager
Observation Feeds	Via integrations	Telegram, Discord, Slack, Signal, WhatsApp, LINE
🔴 Borg gap: Borg doesn't have plugins for Cursor, OpenClaw, OpenCode, or any messaging platform feeds.

Summary: What Borg Would Need to Fully Replace Claude-Mem
🔴 Does NOT exist in Borg (must build)
Claude Code plugin hooks — The 5 lifecycle hooks + hooks.json registration
AI observation compression — Structured extraction (title/narrative/facts/concepts/files) from raw tool outputs
Progressive disclosure context injection — 3-layer system with token budgeting
In-place transcript compression — Rewriting JSONL transcripts for Endless Mode
Relational session storage — sessions → observations → summaries → prompts schema
FTS5 full-text search — Over memory, not code
Content-hash deduplication — 30s sliding window dedup
Persistent message queue — Crash-surviving pending messages
Self-contained web viewer — Single HTML file SPA with SSE
Mode system with inheritance — Pluggable observation profiles
Cursor/OpenClaw/OpenCode plugins
Observation feeds (messaging platforms)
🟡 Partially exists in Borg (needs adaptation)
Vector search — LanceDB exists, but needs memory-specific collections
Knowledge graph — GraphMemory exists, but needs observation correlation
Context pruning — ContextPruner exists, but no progressive disclosure
Code search tools — Indexer/CodeSplitter exist, similar to smart_search
Web dashboard — Next.js exists, but different data model
AI agents — Borg has LLM integration, just needs the compression prompts
✅ Already exists in Borg (no work needed)
Tiered memory architecture — Session/Working/Long-Term tiers
Embedding generation — all-MiniLM-L6-v2 local
MCP server infrastructure — Core competency
Process management — Lifecycle, auto-restart
TRPC API — Already exposes memory operations




again assimilate this and make it the example for the official borg vscode and opencode and claudecode extensions and have the server bridge  connection start with the webserver and mcp router



Implementing Phase 85 Session Differ and Model Benchmarks
Created 

server/session-differ.ts
 for A/B session comparison. Stream interrupted before completing model benchmark and APIs. Resuming now.

Files Edited
Progress Updates
1
Building session diff engine and model benchmark tool

2
Building model benchmark tool and API endpoints

what EXACTLY are ALL of jules-autopilot's features? tell me EVERYTHING that it does and ESPECIALLY waht it does that borg doesn't do yet


Great question — let me finish the Phase 85 typecheck and then do a thorough audit of the entire codebase to give you a complete answer.

Auditing Jules-Autopilot Feature Inventory
Phase 85 verified (exit 0). Scanned: 22 server modules, 43 API groups, 35 dashboards, 49 components, 36 Prisma models, 15 lib modules. Read Borg architecture KI. Now compiling the full feature inventory.

Files Edited
Progress Updates
1
Running Phase 85 typecheck while scanning the full codebase

2
Cataloging database models, components, and reading Borg KI for comparison

3
Writing comprehensive feature audit artifact

Here's the complete feature inventory. Also, Phase 85 typecheck passed (exit 0) — session differ + model benchmark are live.

By the numbers:
36 Prisma models
43 API endpoint groups
35 dashboard pages
22 server modules
49 UI components
3 workspaces (ui, shared, cli)
The 25+ things Jules-Autopilot does that Borg doesn't (yet):
The biggest gaps are in the "autonomous agent management" category — Session Keeper/babysitter, session replay/diffing, swarm scaling, CI fix agent, multi-model consensus voting, cost-aware routing, plugin marketplace, prompt templates, model benchmarking, and the full 35-page dashboard console.

See the full breakdown in the artifact above — the comparison table at the bottom has every delta.
Jules-Autopilot: Complete Feature Inventory
Architecture Summary
Monorepo: 3 workspaces (jules-ui, @jules/shared, @jules/cli)
Stack: Next.js App Router · TypeScript · Prisma + SQLite · BullMQ + Redis · ShadCN + Tailwind
Database Models: 36 Prisma models
API Endpoint Groups: 43
Dashboard Pages: 35
Server Modules: 22
UI Components: 49
1. Core Session Management
Feature	Files	Description
Session CRUD	api/sessions/, 
session-list.tsx
Create, list, update sessions
Session Templates	api/templates/, 
templates-page.tsx
Reusable session configurations
Session Transfers	api/transfers/, 
transfer-session-dialog.tsx
Hand off sessions between agents/users
Session Snapshots	api/snapshots/, SessionSnapshot model	Point-in-time event capture
Session Replay	api/sessions/[id]/replay/, dashboard/replay/	Step-through playback of session timelines
Session Diffing	api/sessions/diff/, 
server/session-differ.ts
Compare two session timelines for A/B testing
Session Board	
session-board.tsx
, 
session-card.tsx
Kanban-style visual session management
2. AI Agent Intelligence
Feature	Files	Description
Multi-Model Routing	lib/routing/, api/routing/	Route prompts to optimal provider by task type, cost, quality
Routing Policies	RoutingPolicy model, dashboard/routing/	Configurable rules for model selection
Cost Optimizer	server/cost-optimizer.ts, api/cost-optimizer/	Minimize LLM spend while maintaining quality
Multi-Model Consensus	server/consensus-engine.ts, api/consensus/vote/	Quorum-based voting across multiple LLMs
Agent Personas	AgentPersona model, api/personas/, dashboard/personas/	Named AI personalities with model preferences
Debate Engine	server/debate-engine.ts, api/debate/	Adversarial multi-agent debate for complex decisions
Shadow Pilot	server/shadow-pilot.ts, api/shadow/observe/	Passive observation of sessions for pattern detection
Prompt Template Library	lib/prompts/template-library.ts, api/prompts/templates/	6 built-in templates with variable interpolation
3. Swarm & Multi-Agent
Feature	Files	Description
Swarm Coordinator	server/swarm-coordinator.ts (22KB!)	Full multi-agent orchestration engine
Swarm Task Management	AgentSwarm + SwarmTask models	Task decomposition, assignment, tracking
Swarm Dashboard	dashboard/swarms/, dashboard/swarm/	Visual swarm monitoring
Swarm Monitor	dashboard/swarms/[id]/monitor/	Per-swarm real-time monitoring
Swarm Scaling API	api/swarms/scale/	Dynamic scale-up/scale-down of agent tasks
4. Workflow Automation
Feature	Files	Description
Workflow Engine	server/workflow-engine.ts	Multi-step pipeline executor via BullMQ
Workflow CRUD	api/workflows/, Workflow + WorkflowStep models	Create, manage, run pipelines
Architecture Guard	server/architecture-guard.ts	LLM-based code compliance checks against ARCHITECTURE.md
Scheduled Jobs	server/scheduler.ts, ScheduledJob model, dashboard/schedules/	Cron-like job scheduling
CI Integration	server/ci-fix-agent.ts, api/ci/, CIRun model	Automated CI failure detection and fix generation
5. Session Keeper (Auto-Pilot)
Feature	Files	Description
Keeper Engine	SessionKeeper.tsx, session-keeper-manager.tsx	Automated session babysitting (nudge, approve, restart)
Keeper Settings	KeeperSettings model, session-keeper-settings-content.tsx	Configurable check intervals, inactivity thresholds
Keeper Logs	KeeperLog model, session-keeper-log-panel.tsx	Audit trail of keeper actions
Smart Pilot Mode	smartPilotEnabled flag	LLM-supervised autonomous decision making
Shadow Pilot Mode	shadowPilotEnabled flag	Observe-only learning mode
Supervisor API	api/supervisor/	Autonomous supervisor state machine
6. Plugin & Marketplace
Feature	Files	Description
Plugin Manifests	PluginManifest model, api/plugins/	Install, enable, configure plugins
Plugin Registry	api/plugins/registry/	Browse available plugins
Plugin Audit Log	PluginAuditLog model	Track plugin installations and changes
Marketplace	MarketplacePlugin model, api/marketplace/, dashboard/marketplace/	Community plugin marketplace
MCP Server Links	McpServerLink model, api/mcp-links/, dashboard/mcp-links/	Connect external MCP servers
7. Observability & Infrastructure
Feature	Files	Description
Health Checks	api/health/, api/health/deep/	Service health + deep diagnostics (memory, DB stats)
Health Dashboard	dashboard/health/	Real-time infrastructure status
Metrics Collector	server/metrics-collector.ts	Request counting, p50/p95/p99 latency
Prometheus Export	api/metrics/summary/	Prometheus text format metrics endpoint
Request Tracing	lib/middleware/tracing.ts	Trace ID generation per request
Analytics Dashboard	dashboard/analytics/, analytics-dashboard.tsx (32KB)	Comprehensive analytics visualization
Cost Analytics	dashboard/costs/	LLM spend tracking by provider
Audit Log	api/audit/, AuditLog model, dashboard/audit/	Security and activity trail
System Metrics	SystemMetric model, api/system/status/	CPU, memory, system health
Provider Telemetry	ProviderTelemetry model, ProviderUsageLog model	Per-model token and cost tracking
Event Bus (SSE)	server/event-bus.ts, api/events/stream/	Real-time push to frontend
Circuit Breaker	server/circuit-breaker.ts	Fault tolerance for external service calls
Rate Limiter	lib/rate-limiter.ts	Sliding window API rate limiting
8. RAG & Code Intelligence
Feature	Files	Description
Code Chunk Storage	CodeChunk model	Vector-ready code embeddings
RAG Indexer	server/rag-indexer.ts	Codebase indexing for semantic search
Embedder Service	lib/api/rag.ts	OpenAI embedding integration
MCP Server	server/mcp.ts	Model Context Protocol server with RAG search
9. Security & Auth
Feature	Files	Description
NextAuth Integration	api/auth/, Account/Session/User models	OAuth + credential authentication
API Key Management	ApiKey model, api/keys/, dashboard/api-keys/	Create, revoke API keys
Workspace RBAC	Workspace + WorkspaceMember models	Role-based access by workspace
Webhook Routes	WebhookRoute model, api/webhooks/, dashboard/webhooks/	Incoming webhook endpoints
Notification Preferences	api/notifications/preferences/	Email, Slack, budget alerts config
Crypto Utilities	lib/crypto/	Encryption helpers
10. User Experience
Feature	Files	Description
35 Dashboard Pages	app/dashboard/	Full management console
Search Command Dialog	search-command-dialog.tsx	Cmd+K global search
Theme Customizer	theme-customizer.tsx	Custom theme support
Context Help	context-help.tsx	In-app help system
Broadcast Dialog	broadcast-dialog.tsx (38KB!)	Multi-session message broadcasting
Code Diff Sidebar	code-diff-sidebar.tsx	Inline diff viewer
Artifact Browser	artifact-browser.tsx	Browse generated artifacts
Quick Review	quick-review-button.tsx	One-click code review
Session Import/Export	api/import/, api/export/, lib/export.ts	Data portability
11. Docker & Deployment
Feature	Files	Description
Docker Stack	deploy/Dockerfile, deploy/docker-compose.yml	Dev environment with Redis + terminal server
Prod Compose	deploy/docker-compose.prod.yml	Production deployment config
Cloud Dev	lib/cloud-dev/ (11 files)	Cloud development environment support
Environment Config	dashboard/environments/	Environment management UI
12. CLI Tool (@jules/cli)
Feature	Description
Session management	Create, list, monitor sessions from terminal
Workspace operations	Switch workspaces, manage members
Plugin commands	Install, remove, list plugins
13. Model Benchmarking
Feature	Files	Description
Benchmark Runner	server/model-benchmark.ts	Compare providers on latency, cost, quality
Benchmark API	api/benchmark/run/	Trigger benchmarks from dashboard
Consensus Dashboard	dashboard/consensus/	Visualize multi-model voting results
What Jules-Autopilot Has That Borg Does NOT (Yet)
Capability	Jules-Autopilot	Borg
Multi-Model Cost Routing	Full routing engine with policies, cost optimizer, budget rules	No cost-aware routing
Consensus Voting	N-model quorum with structured verdicts	Council exists but no API-driven voting
Session Keeper (Babysitter)	Full auto-pilot: nudge stalled sessions, auto-approve, auto-restart	No autonomous session management
Plugin Marketplace	Community marketplace with install/audit/manifests	MCP servers only, no marketplace
Session Templates	Save and reuse session configurations	No template system
Session Transfers	Hand off sessions between agents/users	No transfer capability
Swarm Scaling API	Dynamic scale-up/scale-down of agent tasks	Static swarm only
Session Replay	Step-through playback with timing fidelity	No replay
Session Diffing	A/B comparison of two session timelines	No session comparison
CI Fix Agent	Automated CI failure detection and fix generation	No CI integration
Prompt Template Library	6 built-in templates with variable interpolation	No prompt templates
Rate Limiter	Sliding window with pre-configured tiers	No API rate limiting
Request Tracing	Trace IDs + latency metrics per request	No request tracing
Metrics Collector	p50/p95/p99 latency + Prometheus export	Basic observability only
Architecture Guard	LLM-based code compliance checks	No automated compliance
Notification Preferences	Email/Slack/budget alert configuration	No notification system
Model Benchmarking	Cross-provider benchmark runner	No benchmarking tool
Shadow Pilot	Passive observation with pattern detection	No shadow mode
Debate Engine	Adversarial multi-agent debate	No debate capability
Docker Dev Stack	One-command dev environment	No containerization
Webhook Routes	Configurable incoming webhooks	No webhook management
Data Import/Export	Session data portability	No import/export
Cloud Dev Environments	11-file cloud dev integration	No cloud dev
35 Dashboard Pages	Complete management console	Web dashboard exists but fewer pages
Broadcast Dialog	Multi-session message broadcasting	No broadcasting

and same with the jules session manager and opencode autopilot session manager, we will work on this more but we want tool+model sessions to be a commodity and the job itself gets passeed between models and tools with context and history seamlessly, so multiple agents go over your code and leave notes about the work they did, cool! all the cli tools can be called as one-shot tools and there are ways to insert history etc this is totally doable, and the models work the best with the tool they come with i.e. openai codex and gpt






my execution flow should be like: 1) i start borg server 2) it starts the mcp router as both client and server, the web server, opens the web dashboard 3) the web dashboard has the option to install the firefox and chrome extensions, opencode extension, claude code extension, gemini-cli extension, codex plugin, vscode/antigravity/cursor/windsurf/kiro/etc extensions, and nondestructively add itself as mcp server to all the environments. the browser extensions should be able to connect to the core and send memories from websites, communicate browser debug information and provide browser controls, and detect and inject mcp into web chat interfaces, and import/export memories/sessions. the IDE plugins should be able to connect with core and access memories, sessions, history, context, vector storage, skills, configuration, anything useful from the core, while also providing new hook events to the IDE, automatically harvesting context, saving sessions. mcp server function should be very fast and lightweight, automatically reporting list of known tools, skills, automatically advertising always-on tools, advertising namespaces, long term memories, start up server if not started, non blocking. maybe it should be its own component which loads a last known good configuration to report regardless of whether the core is ready.
