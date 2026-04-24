# Vision

## North star

borg is the **ultimate local-first control plane** for multi-agent workflows, Model Context Protocol (MCP) tooling, provider routing, session continuity, and operator observability.

It is building toward a future where one local system seamlessly coordinates the most critical parts of AI-driven software development: tools, models, sessions, context, subagents, and full visibility across the entire stack.

That future only becomes credible if the present system is reliable, truthful, and meticulously engineered for extreme robustness.

## The problem

AI workflows are fragmenting faster than they are becoming usable. A serious operator may now rely on:
- Multiple, disparate MCP servers with overlapping tools.
- Multiple AI provider accounts, quotas, API keys, and fallback chains.
- Multiple coding or session harnesses (VS Code, Cursor, Windsurf, Aider, OpenCode, Gemini CLI, Claude Code).
- Multiple memory surfaces (RAG, vector DBs, file-based contexts).
- Weak observability, logging, and crash-recovery across all of the above.

borg exists to eradicate that fragmentation by providing a unified, practical, and highly capable local substrate.

## Core thesis

The strongest version of borg is not a chaotic wrapper, but a **decision system and universal bridge**. It is the version that makes a messy local AI stack feel:
- **Calm**: Automatic orchestration, recovery, and fallback models.
- **Visible**: Comprehensive dashboards with real-time status, traffic inspection, and memory insight.
- **Composable**: Dynamic tool grouping, code execution sandboxes, and progressive tool disclosure.
- **Recoverable**: Persistent session history, crash isolation, and auto-restarting daemons.

## Practical product direction

### 1. The Ultimate MCP Control Plane
borg must become the absolute authority for:
- Registering, instantiating, and managing the lifecycle of MCP servers.
- Inspecting traffic, enforcing timeout rules, and providing single-instance pooling for multiple clients.
- Normalizing, grouping, and semantically searching tools (Tool RAG).
- Enabling code-mode execution for complex tool chains and deferred binary loading.
- Managing environment variables, secrets, and auth across all servers.

**The Definitive Library**: Over time, borg must maintain a definitive internal library of MCP servers aggregated from public catalogs, deduplicating overlapping entries, tracking provenance, and benchmarking tool implementations. Models will be able to reach any relevant tool in the ecosystem through one unified, local router.

### 2. Universal Tool Reach & First-Class Parity
Large Language Models are fine-tuned on the exact tool signatures used by the most popular coding environments. borg's mandate is **Absolute 1:1 Parity**. If a model expects `bash`, `glob`, `file_read`, or `grep_search` (from Claude Code, Codex, or Gemini CLI), borg provides a tool that is byte-for-byte identical in schema and behavior.

### 3. Model and Provider Routing
borg makes provider behavior legible and automated:
- Configurable fallback chains across models and APIs.
- Intelligent routing based on quota exhaustion, free tiers, and budget limits.
- Clear dashboards for auth-state, historical cost, and routing rules.

### 4. Session Continuity and Omniscient Memory
borg ensures an operator can continue work without rebuilding context from scratch:
- **Auto-Detection**: Automatically detects, imports, and parses sessions from *all* AI harnesses (IDEs, CLIs, Web) into durable memories.
- **Memory Subsystems**: A pluggable memory ecosystem (file-based, vector DB, RAG) with automatic context harvesting, chunking, reranking, and semantic search.
- **Web Integrations**: Browser extensions that inject MCP tools into web chats and export histories into the universal memory bank.

### 5. Multi-Agent Orchestration & Council Debate
borg provides an ecosystem for autonomous subagents and team-based modeling:
- Orchestrating a session where multiple frontier models (e.g., GPT, Gemini, Claude) take turns implementing, testing, and planning in a shared chatroom.
- Debate protocols, consensus voting, and autoDev loops under the supervision of a dedicated council.

### 6. Architectural Convergence (The Daemon Family)
borg is transitioning toward a robust, small family of focused binaries rather than a monolithic IPC bottleneck. The long-term topology includes:
- `borgd` — the primary control-plane daemon.
- `borgmcpd` — the MCP router, aggregator, and pool manager.
- `borgmemd` — the long-running memory and context daemon.
- `borgingest` — the background worker for batch imports (like BobbyBookmarks) and deduplication.
- `borgharnessborgharnessd` — the execution loop and isolation boundary.
- GUI Clients: CLI (`borg`), Web UI (`borg-web`), Desktop (`borg-native`).

## What borg is not optimizing for in v1

- Mass-market simplicity at the cost of operator control.
- Hosted SaaS-first workflows (we are explicitly local-first).
- Speculative platform expansion that outruns core reliability and truthfulness.

## Design principles

<<<<<<< HEAD
1. **Local first, but Cloud Aware**: Total local sovereignty with seamless remote deployment and syncing.
2. **Truth over hype**: Dashboards must reflect actual database rows and runtime state, not mocked UI scaffolds.
3. **Visible systems**: Everything—from LLM reasoning to MCP network traffic—must be inspectable.
4. **Interoperability over reinvention**: Wrap, adapt, and assimilate existing excellent tools (like ripgrep, SQLite, LanceDB) instead of rewriting them poorly.
5. **Continuity over novelty**: Focus heavily on state recovery, crash resilience, and session persistence.
=======
The most valuable features are often the least glamorous:

- restart behavior
- config sync
- health visibility
- quota awareness
- deterministic routing
- session persistence
- truthful logs

If Borg does those better than everyone else, it becomes the place operators trust.

### Prefer focus over mythology

Big ideas are welcome. Infinite scope is not.

The vision only matters if each release leaves the product easier to install, easier to operate, and easier to explain.

---

## 4. End-state capability picture

Over time, Borg should grow into a cohesive control plane with five durable layers.

### 4.1 MCP operations layer

Borg should be the easiest way to:

- aggregate many MCP servers behind one endpoint
- keep tool routing collision-safe while discovery happens through semantic search and grouping
- inspect live JSON-RPC traffic
- manage health, lifecycle, and config sync

### 4.2 Provider routing layer

Borg should make model usage resilient by handling:

- normalized provider authentication
- quota and rate-limit awareness
- routing strategies by cost, quality, and task type
- fallback without losing request continuity

### 4.3 Session supervision layer

Borg should supervise external coding tools and agent loops with:

- isolated child processes
- restart policies and crash recovery
- worktree isolation
- persistent session state, logs, and operator controls

### 4.4 Operator dashboard layer

The dashboard should remain an operations console, not a decorative feature dump.

It should help operators answer:

- what is running?
- what is failing?
- what is costing money?
- what was restarted?
- what tool traffic just happened?

### 4.5 Expansion layer

Once the control plane is trustworthy, Borg can responsibly expand into:

- memory and retrieval systems
- browser and editor companion surfaces
- multi-agent orchestration
- cloud-dev bridges
- richer automation workflows

Those are important, but they should compound on a stable base instead of becoming excuses to avoid shipping one.

---

## 5. Milestone horizon

### Borg 1.0

Ship the four core features:

1. MCP Master Router
2. Model Fallback & Provider Routing
3. Session Supervisor
4. Web Dashboard

### Borg 1.5

Add memory and context systems that support real workflows without destabilizing the core product.

### Borg 2.0

Add multi-agent orchestration and broader integrations only after the control plane has earned trust with external users.

---

## 6. Non-goals

The long-term vision explicitly does **not** require:

- cloning every AI coding tool feature-for-feature
- shipping every experimental idea at once
- hiding instability behind clever branding
- measuring meta-analytics that do not improve operator outcomes
- keeping massive reference collections in the main runtime path

If Borg ever has to choose between being impressive on paper and dependable in practice, dependable wins.

---

## 7. The standard for future decisions

Future proposals should make Borg more of the following:

- **runnable**
- **observable**
- **recoverable**
- **composable**
- **useful to a stranger in under five minutes**

That is the real vision.

Everything else is garnish.



## 2. VISION.md

```markdown
# VISION.md — Borg Long-Term Direction

> **Current version:** `1.0.0-alpha.1`
> **Near-term mission:** Ship a trustworthy Borg 1.0
> **Long-term ambition:** The best local AI operations control plane for builders.

---

## 1. What Borg Is

Borg exists to make AI-assisted development **operable instead of chaotic**.

It gives a single operator one dependable place to:

- Route tools through a unified MCP-aware control plane
- Switch between providers and models without losing momentum
- Supervise long-running coding sessions and recover from crashes
- Observe what the system is doing in real time
- Gradually add memory, agent orchestration, and integrations without
  breaking the core

**In short:** orchestrate everything, reimplement almost nothing.

## 2. The Primitive: Session

The fundamental unit of Borg is the **Session** — a supervised, checkpointable,
resumable AI workflow. Sessions are to Borg what containers are to Kubernetes.

A session encapsulates:
Session {
process // Child process or remote connection
state // Serializable, resumable conversation + tool state
routing_policy // Model preferences, fallback chain, cost budget
loaded_tools // Currently active MCP tools
memory_refs // Pointers to relevant long-term context
supervisor // Council config, restart policy
logs // Structured event stream
metrics // Cost, latency, token usage
checkpoints // Git commits + serialized state snapshots
}



**If you can serialize it, persist it, restore it, and hand it to a different
model — that's the Borg primitive.**

## 3. The Five Engines

### 3.1 MCP Master Router

Aggregates N MCP servers behind one endpoint. Models see a **tiny permanent
meta-tool surface** (6 tools), not hundreds:

- `search_tools` — Ranked semantic discovery
- `load_tool` — Activate a capability
- `get_tool_schema` — Inspect before calling
- `list_loaded_tools` — What's active
- `unload_tool` — Release
- `run_code` — Code-mode escape hatch

**Progressive disclosure tiers:**

| Tier | Strategy | Example |
|------|----------|---------|
| 0: Meta | Always visible | `search_tools`, `load_tool` |
| 1: Core | Always visible | `read_file`, `write_file`, `execute_command` |
| 2: Lazy | On-demand | Database, browser, Slack tools |
| 3: Deferred | Binary not spawned until first call | Heavy tools |

**Auto-load thresholds:**

- Confidence > 0.85 → silent auto-load
- Confidence 0.60–0.85 → present ranked alternatives
- Confidence < 0.60 → require explicit search

**Key insight from our MCP aggregator research:**

> "Most aggregators solve plumbing. Borg solves selection friction.
> The model should almost never face more than a handful of visible choices."

### 3.2 Provider Router

Normalized API access to all model providers with automatic quota-aware fallback.

**Routing equation:**

$$m^* = \argmax_{m \in M} \left( S(m) \cdot R(m) \cdot \left[ w_1 Q(m,T) - w_2 C(m,T) - w_3 L(m,T) \right] \right)$$

Where:
- $S(m) \in \{0, 1\}$ — health status (circuit breaker)
- $R(m) \in [0, 1]$ — remaining quota ratio
- $w_1, w_2, w_3$ — user-configurable weights

**In practice:** ordered waterfall fallback chains per task type. Exhaust all
providers of the best model before cascading to the next tier.

### 3.3 Session Supervisor

Manages long-running coding sessions as supervised child processes with
**crash-safe checkpoint/restore**.

**Checkpoint = git commit + serialized conversation state + environment snapshot.**

Recovery: checkout the commit, rehydrate the conversation, inject into a fresh
process with the next available model. The session never dies.

### 3.4 Council (Autonomous Supervisor)

When a session is idle and waiting for human input, the Council injects
intelligent continuation. Three modes:

1. **Cheerleader** (~free) — Rotates through "Keep going" prompts
2. **Informed** (~$0.001) — Flash model reads TODO.md and suggests next step
3. **Expert Panel** (~$0.05) — Multi-model debate on direction

### 3.5 Operator Dashboard

A web-based operations console that **tells stories, not just state**.

Instead of: "MCP Server X: unhealthy"
Show: "File search became unavailable 4 min ago. Borg fell back to grep.
       Here's the log."

## 4. Product Philosophy

### Orchestrate, don't absorb

Borg coordinates tools. It does not clone them. Adapters over parity checklists.
Capability contracts over brand-specific duplication.

### Make the boring parts solid

Restart behavior. Config sync. Health visibility. Quota awareness. Deterministic
routing. Session persistence. Truthful logs. If Borg does those better than
everyone else, it becomes the place operators trust.

### Prefer focus over mythology

Big ideas are welcome. Infinite scope is not. The vision only matters if each
release leaves the product easier to install, easier to operate, and easier
to explain.

## 5. Milestone Horizon

### Borg 1.0 — "It Runs and Recovers"
- MCP Master Router with progressive disclosure
- Provider Router with waterfall fallback
- Session Supervisor with checkpoint/restore
- Web Dashboard
- Council (cheerleader mode)

### Borg 1.5 — "It Remembers"
- Memory plugin system (file, vector DB, graph)
- Semantic tool search / tool RAG
- Context harvesting and compaction
- Browser extension (memory capture)

### Borg 2.0 — "It Orchestrates"
- Multi-model council (expert panel)
- Architect-implementer-reviewer workflows
- Cloud dev session management
- IDE extensions
- Skill and prompt libraries

## 6. Non-Goals

- Cloning every AI coding tool feature-for-feature
- Shipping every experimental idea at once
- Hiding instability behind clever branding
- Measuring meta-analytics that don't improve operator outcomes

**If Borg ever has to choose between being impressive on paper and
dependable in practice, dependable wins.**

## 7. The Standard

Future proposals should make Borg more:

- **Runnable**
- **Observable**
- **Recoverable**
- **Composable**
- **Useful to a stranger in under five minutes**

That is the real vision. Everything else is garnish.
>>>>>>> origin/rewrite/main-sanitized
