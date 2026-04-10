# ⚡ HyperCode

> **The AI control plane you've been waiting for.**  
> One local system to rule your MCP servers, tame your providers, resurrect lost sessions, and watch every AI operation in real time.

[![Version](https://img.shields.io/badge/version-1.0.0--alpha.32-blueviolet)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Status](https://img.shields.io/badge/status-pre--1.0%20convergence-orange)](ROADMAP.md)

---

## The problem nobody wants to admit

You're juggling a dozen MCP servers, three provider accounts, five AI coding assistants, and a memory system held together with vibes and hope. Every tool is isolated. Every session starts from scratch. When something breaks, you have no idea why.

**This is the mess HyperCode was built to end.**

---

## What HyperCode does — and why it matters

### 🔌 The Ultimate MCP Control Plane

Stop launching MCP servers manually and praying they stay up. HyperCode is your **mission control for the entire MCP ecosystem**.

- **900+ MCP servers** catalogued and indexed from Glama, Smithery, MCP.run, npm, and GitHub Topics — all searchable from one place.
- **Intelligent working set** with LRU eviction: only the tools you actually need are loaded, keeping context lean and fast.
- **6 permanent meta-tools** always available — discover, search, and call any tool in your entire ecosystem on demand.
- **Auto-load with confidence thresholds**: HyperCode silently loads high-confidence tools before you even know you need them.
- **Profile-based boosting**: activate a `web-research` or `repo-coding` profile and the right tools float to the top automatically.
- **Single-instance pooling**: multiple clients share one MCP server process — no more duplicate daemons eating your RAM.
- **Live traffic inspection**: see every tool call, its latency, error rate, and payload in a real-time dashboard.

> **Why it matters:** Models perform dramatically better when they have access to the right tools at the right moment. HyperCode is the only system that manages tool visibility as a first-class, automated concern.

---

### 🧠 First-Class Tool Parity — LLMs Love It

Here's a secret most AI tooling ignores: LLMs are fine-tuned on the *exact* tool signatures used by the most popular coding environments. When a model sees a familiar `bash`, `glob`, or `str_replace_editor` tool, it performs **dramatically better** because it's working in territory it knows deeply.

HyperCode implements **byte-for-byte identical** tool schemas for every major harness:

| Harness | Parity Tools |
|---|---|
| **Claude Code** | `bash`, `glob`, `grep_search`, `file_read`, `str_replace_editor`, `web_fetch`, `ls` |
| **Codex CLI** | `shell`, `apply_diff`, `create_file`, `view_file`, `list_directory`, `search_files` |
| **Gemini CLI** | `read_file`, `write_file`, `edit_file`, `list_directory`, `search` |
| **OpenCode** | `read`, `write`, `edit`, `bash`, `glob`, `grep`, `ls`, `web_fetch` |

No renaming. No "inspired by." Identical schemas, identical behavior. Your models work at full capacity, every time.

> **Why it matters:** Stop leaving performance on the table. Tool parity means your AI does what you expect, with the precision it was trained to deliver.

---

### 🔀 Quota-Aware Provider Routing — Never Hit a Wall Again

Running out of Claude tokens mid-task? Rate-limited by OpenAI at 2am? **HyperCode routes around failures automatically**, so your work never stops.

- Configurable **fallback chains** across GPT, Claude, Gemini, local models, and OpenRouter.
- Automatic switching on **quota exhaustion, budget limits, and rate limits** — with zero manual intervention.
- `EMERGENCY_FALLBACK` and `budget_forced_local` states handled gracefully in real time.
- Full **billing visibility dashboard**: see your cost per session, per provider, per model — no more surprise invoices.
- **Auth state display**: know at a glance which providers are configured, authenticated, and ready to run.

> **Why it matters:** Quota failures are the silent killers of complex AI workflows. HyperCode makes them invisible to the operator — and to the model.

---

### 🔮 Omniscient Memory — Your AI Never Forgets

Every session you've ever had with any AI tool is a goldmine of context. Most people throw it away. HyperCode **captures, imports, and makes it searchable forever**.

Automatic session import from **every major AI harness**:
- VS Code Copilot Chat
- Claude Code / Copilot CLI
- Gemini CLI / Antigravity (`~/.gemini/antigravity/brain`)
- Simon Willison's `llm` CLI
- OpenAI / ChatGPT export roots
- Prism local SQLite histories + behavioral metadata

HyperCode processes these into **durable memories** with derived instruction docs — so the next session starts with full context, not a blank slate.

**Vector memory search** lets models query your entire knowledge base semantically. The `search_memory` and `add_memory` MCP tools are live and connected — models can read from and write to your memory without you lifting a finger.

> **Why it matters:** Context is everything. HyperCode turns your past AI sessions into a compounding asset instead of a landfill.

---

### 📊 Real-Time Operator Dashboard — Full Visibility, Zero Magic

HyperCode's **91-page web dashboard** is the nerve center of your AI stack. Every number is a real database row. Every status reflects actual runtime state.

**What you can see right now:**
- 🟢 Live MCP server health — response time, error rate, uptime, auto-restart status
- 🔍 Tool inventory with **Always On** toggling and semantic search
- 📡 Real-time traffic inspection — every MCP call, payload, and latency
- 💰 Provider billing — cost per session, quota remaining, routing decisions
- 🧬 Memory inspector — browse, search, and edit your entire memory store
- 🔄 Session timeline — every tool call, model response, and state change, in order
- 🤖 Agent negotiation monitor — watch A2A agents bid on tasks in real time
- 📈 Metrics dashboard — call counts, error rates, and latency histograms, live
- 🔧 Submodule health — git status and one-click heal for all submodules

> **Why it matters:** You can't fix what you can't see. HyperCode makes the invisible visible — so you can trust your AI stack, not just hope it works.

---

### 🤝 Multi-Agent Orchestration — Your Own AI Council

Why use one model when you can use five? HyperCode's **Council and Swarm** system lets multiple frontier models collaborate on the same problem with specialized roles:

- **Planner** — decomposes the problem and sets the strategy
- **Implementer** — writes the code, surgically and precisely
- **Tester** — validates correctness and hunts for edge cases
- **Critic** — challenges assumptions and finds what everyone else missed

The **Swarm Neural Transcript** shows the live collaborative conversation between models in a beautiful real-time dashboard. The **A2A (Agent-to-Agent) Handshake** protocol lets agents bid on tasks autonomously — no human babysitting required.

**Supported model networks:** `claude-3-7-sonnet`, `gpt-4o`, `gemini-2.0-flash`, `google/gemini-2.0-flash-lite`, `openrouter/best-available-coding`, and more.

> **Why it matters:** The best answers don't come from one model — they come from the right combination of models, each doing what they're best at.

---

### 🧬 Session Continuity — Pick Up Where You Left Off

Sessions crash. Contexts get lost. HyperCode's **SessionSupervisor** makes that irrelevant:

- **Auto-restart** with isolated PTY recovery — a crashed session comes back exactly where it stopped.
- **Session branching** — fork any session and explore alternatives without losing your original path.
- **Automatic summarization** — when a session gets long, HyperCode compresses old turns into memory entries so the model never runs out of context.
- **Session mesh** — `hypercode mesh status`, `hypercode mesh peers`, `hypercode mesh find --capability <name>` give you live visibility into every running agent in your local network.

> **Why it matters:** You spent hours building context in that session. HyperCode makes sure you never have to rebuild it.

---

### 🌐 Browser Extension — Memory Everywhere

The HyperCode browser extension uses a `MutationObserver` to **automatically capture every message** from ChatGPT and Claude web interfaces as you chat. No manual export. No copy-paste. Your web conversations flow directly into your universal memory bank.

MCP tools are also injectable into web chat interfaces — giving browser-based models the same tool access as your local harnesses.

> **Why it matters:** Your best insights don't only happen in the CLI. HyperCode captures them wherever they occur.

---

### ⚡ Go-Native Performance Sidecar

HyperCode ships a high-performance **Go sidecar** that natively owns core system services — no Node.js required for the hot path:

- **EventBus** with wildcard pattern matching and bounded history
- **CacheService** with TTL+LRU eviction and event callbacks
- **GitService** with full git operations (log, status, diff, blame, stash, branch, push, pull)
- **MetricsService** with Prometheus export and downsampled time series
- **ProcessManager** for child process lifecycle with stdin/stdout/stderr streaming
- **HealerService** — LLM-powered error diagnosis, fix generation, and auto-heal
- **SessionManager** with a full state machine (created → starting → running → stopped → failed → paused)
- **ToolRegistry** with fuzzy search and always-on tracking

The Go sidecar bridges seamlessly to the TypeScript control plane, providing native fallbacks across 50+ API route families with truthful local SQLite reads.

> **Why it matters:** Performance matters at scale. The Go sidecar keeps HyperCode fast, resilient, and correct — even when the Node runtime is under pressure.

---

## Quick start

### Requirements
- Node.js 22+
- pnpm 10+

### Up and running in 60 seconds

```bash
git clone https://github.com/hypercodehq/hypercode.git
cd hypercode
pnpm install
pnpm run dev
```

Open `http://localhost:3000/dashboard` and see your AI stack come to life.

### CLI harness

```bash
hypercode session harnesses           # see all available harnesses
hypercode session start ./my-app --harness hypercode
hypercode mesh status                 # inspect the live agent mesh
hypercode mesh peers                  # see all connected nodes
hypercode mesh find --capability bash # find agents that can run bash
```

### Docker

```bash
docker compose up --build
```

---

## Architecture at a glance

```text
┌─────────────────────────────────────────────────────────┐
│                  HyperCode Control Plane                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  MCP Router  │  │  Provider    │  │   Memory &   │  │
│  │  + Catalog   │  │  Fallback    │  │   Sessions   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Multi-Agent │  │  Dashboard   │  │  Go Sidecar  │  │
│  │  Council     │  │  (91 pages)  │  │  (native)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                   │                  │
    CLI harness         Web Dashboard      Browser ext.
   (hypercode CLI)   (localhost:3000)    (ChatGPT/Claude)
```

```text
apps/
  web/                    Next.js dashboard (91 pages, all real data)
  hypercode-extension/    Browser extension (auto memory capture)
  maestro/                Desktop orchestrator shell

packages/
  core/                   TypeScript control plane (MCP, sessions, memory, routing)
  ai/                     Provider & model integrations
  cli/                    CLI orchestrator entrypoints
  ui/                     Shared React UI components
  memory/                 Vector memory + retrieval layer
  tools/                  Shared tool definitions (parity implementations)

go/
  cmd/hypercode/          Go sidecar (native services, SQLite reads, Prometheus)
  internal/               EventBus, Cache, Git, Metrics, Healer, Sessions, Tools, A2A

submodules/
  hypercode/              External CLI harness upstream
```

---

## Design principles

1. **Local first** — your data, your hardware, your control. No cloud dependency required.
2. **Visibility over magic** — every dashboard number is a real database row. No mocks. No lies.
3. **Interoperability over reinvention** — wrap excellent tools (ripgrep, SQLite, LanceDB) instead of rewriting them poorly.
4. **Continuity over novelty** — crash recovery, session persistence, and routing correctness beat shiny new features every time.
5. **Parity over invention** — if the model expects `bash`, give it `bash`. Don't make it learn something new.

---

## Contributing

```bash
pnpm -C packages/core exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit --pretty false
pnpm run test
```

See also: [`AGENTS.md`](AGENTS.md) · [`ROADMAP.md`](ROADMAP.md) · [`TODO.md`](TODO.md) · [`VISION.md`](VISION.md) · [`CHANGELOG.md`](CHANGELOG.md)

---

## License

MIT — build something great.
