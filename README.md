# Borg (v0.9.667)

> The Unified AI Operations Control Plane.

<p align="center">
  <a href="https://github.com/robertpelloni/borg/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/robertpelloni/borg/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/robertpelloni/borg/actions/workflows/codeql.yml"><img alt="CodeQL" src="https://github.com/robertpelloni/borg/actions/workflows/codeql.yml/badge.svg" /></a>
  <a href="https://github.com/robertpelloni/borg/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/robertpelloni/borg?display_name=tag" /></a>
  <a href="https://github.com/robertpelloni/borg/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/robertpelloni/borg?style=flat" /></a>
  <a href="https://github.com/robertpelloni/borg/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/robertpelloni/borg?style=flat" /></a>
  <a href="https://github.com/robertpelloni/borg/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/robertpelloni/borg" /></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green" /></a>
</p>

<p align="center">
  <a href="https://github.com/robertpelloni/borg/actions"><img alt="Open Actions" src="https://img.shields.io/badge/View-Actions-1f6feb?logo=githubactions&logoColor=white" /></a>
  <a href="https://github.com/robertpelloni/borg/deployments"><img alt="Open Deployments" src="https://img.shields.io/badge/View-Deployments-0ea5e9?logo=vercel&logoColor=white" /></a>
  <a href="https://github.com/robertpelloni/borg/releases"><img alt="Open Releases" src="https://img.shields.io/badge/View-Releases-7c3aed?logo=github" /></a>
  <a href="https://github.com/robertpelloni/borg/pkgs/container/borg"><img alt="Open Container" src="https://img.shields.io/badge/View-Container-2563eb?logo=docker&logoColor=white" /></a>
</p>

## 📊 GitHub Stats & Activity

<p align="center">
  <img alt="Borg repo stats" src="https://github-readme-stats.vercel.app/api/pin/?username=robertpelloni&repo=borg&theme=dark&hide_border=true" />
</p>

<p align="center">
  <img alt="Borg commit activity" src="https://img.shields.io/github/commit-activity/m/robertpelloni/borg" />
  <img alt="Borg last commit" src="https://img.shields.io/github/last-commit/robertpelloni/borg" />
  <img alt="Borg open PRs" src="https://img.shields.io/github/issues-pr/robertpelloni/borg" />
</p>

## 🖼️ Screenshots

> Drop your latest captures into `docs/screenshots/` and keep this section as your visual changelog.
>
> Capture guide: [`docs/screenshots/README.md`](docs/screenshots/README.md)
>
> Refresh status + validate in one step: `pnpm run visuals:refresh`

| Capture | Target path | Status |
|---|---|---|
| Dashboard Home | `docs/screenshots/dashboard-home.png` | ⬜ Add |
| MCP Registry | `docs/screenshots/mcp-registry.png` | ⬜ Add |
| MCP Search | `docs/screenshots/mcp-search.png` | ⬜ Add |
| MCP Inspector | `docs/screenshots/mcp-inspector.png` | ⬜ Add |
| Billing | `docs/screenshots/billing.png` | ⬜ Add |
| GitHub Actions | `docs/screenshots/github-actions.png` | ⬜ Add |

Borg is a high-performance local control plane designed to sit between AI agents and their underlying infrastructure. It transforms standard agent interactions into a sophisticated, multi-tiered cognitive workflow with integrated memory, real-time observability, and autonomous "auto-drive" capabilities.

---

## 🚀 Key Capabilities

### 🧠 Advanced Multi-Tier Memory
Borg implements a sophisticated memory architecture inspired by `Mem0` and `Letta`, ensuring agents never "forget" across sessions:
- **Automatic Context Harvesting**: Borg silently extracts facts, concepts, and technical entities from every conversation and tool execution.
- **LanceDB Vector Storage**: High-speed local vector database for long-term semantic retrieval.
- **Graph-Based Knowledge**: Tracks relationships between files, tasks, and concepts via `GraphMemory`, allowing for high-level architectural reasoning.
- **Context Compacting & Pruning**: Automatically compresses chat history and prunes redundant data to maintain optimal context window efficiency.

### ⚡ One-Shot Discovery & Execution
The "Meta-Tool" architecture eliminates the turn-latency of traditional tool use:
- **`auto_call_tool`**: Describe an objective in plain language; Borg searches for the right tool, maps arguments using a background LLM, and executes it in a single step.
- **Dynamic Advertising**: Borg only advertises core Meta-Tools by default to stay under LLM limits. It summons the full power of hundreds of MCP tools on-demand.

### 🌐 Universal MCP Master Router
Aggregate hundreds of MCP servers behind one endpoint. Borg manages connections, tool conflicts, and namespacing automatically.

### 👁️ Real-Time "Local LLM" Watcher
Borg runs background "Copilot" logic through the `SuggestionService`:
- **Preemptive Injection**: As you browse code or chat, Borg semantically predicts your next move and injects clickable tool suggestions into the UI.
- **Thematic Comprehension**: Understands when you are debugging, researching, or refactoring, and surface relevant skills/tools automatically.

### 🚑 Auto-Drive & Autonomous Healing
The `Director` and `HealerService` provide a safety net for autonomous operations:
- **Conversation Monitoring**: A background daemon watches chat logs and terminal outputs.
- **Self-Healing**: When a test fails or a process crashes, the Healer analyzes the stack trace, generates a fix, and proposes it for approval.
- **Handoff & Pickup**: Automatically summarizes sessions into "Bootstrap Prompts" so agents can resume work exactly where they left off.

---

## 📖 How to Use Borg

### 1. Connect your AI Agent
Borg acts as a standard MCP server that routes to all other servers. Connect your preferred AI (Claude Desktop, VS Code, etc.) to the Borg entry point:

**Standard Stdio Connection:**
```json
{
  "mcpServers": {
    "borg": {
      "command": "node",
      "args": ["/path/to/borg/packages/core/dist/index.js"]
    }
  }
}
```

### 2. The "One-Shot" Workflow (Recommended)
Instead of asking the model to find a tool, give it the objective directly. Borg will handle the discovery and execution in one turn.

*   **Agent Call**: `auto_call_tool({ objective: "Search my emails for the invoice from last Tuesday and save it to the project folder", context: "Tuesday was March 10th" })`
*   **Borg Action**: Automatically finds the `gmail` and `filesystem` tools, maps the arguments, and executes.

### 3. The Discovery Workflow
If you want to manually manage your active tools:
1.  **Search**: `search_tools({ query: "how do I interact with jira?" })`
2.  **Load**: `load_tool({ name: "jira__create_issue" })`
3.  **Execute**: Use the newly hydrated tool normally.

### 4. Mission Control Dashboard
Open `http://localhost:3001/dashboard` to:
- **Toggle Functions**: Instantly enable/disable any sidebar feature or MCP integration.
- **Monitor Swarms**: See live logs and memory graphs of all active agent sessions.
- **Manage Quotas**: View LLM provider spend and health in one place.

---

## 🏗️ Core Architecture

1. **Discovery**: `search_tools(query)` -> Semantic ranked matches.
2. **Loading**: `load_tool(name)` -> Hydrates specific tool schemas.
3. **Execution**: `auto_call_tool(objective, context)` -> One-shot magic.
4. **Memory**: `save_memory` / `search_memory` -> Persistent cross-session intelligence.

---

## 🔐 Security & Trust Model

Borg is designed as a **local-first control plane**. You should treat it as a high-privilege operator process in your development environment.

### What Borg does (and does not) assume
- Borg assumes you trust the local machine and user account running it.
- Borg does **not** require a hosted Borg backend for core operation.
- Borg can call external MCP servers/tools, so security posture depends on what you connect.

### Trust boundaries
- **Local process boundary**: Borg, your MCP clients, and local tools run with local user permissions.
- **Network boundary**: Any remote MCP endpoint or API provider is outside the local trust boundary.
- **Secret boundary**: Secrets/API keys are your responsibility and should be injected via environment/config, not committed to git.

### Operational hardening recommendations
- Run Borg with a least-privilege user account.
- Scope API keys to minimum permissions and rotate regularly.
- Review enabled MCP servers/tools and disable anything not needed.
- Isolate sensitive workloads in separate environments/projects.
- Audit logs regularly for unexpected tool executions.

### Repository safety basics
- Never commit real secrets; use templates such as `.env.example`.
- Runtime-generated files (for example `packages/cli/.borg-session.json`) may change frequently and can be locally excluded from git noise when needed.

---

## 🏁 Quick Start

### Prerequisites
- Node.js 20+ | `pnpm` 10+
- Docker Desktop (Optional)

### Option A: Docker (Recommended)
```bash
docker compose up --build
```

### Option B: Local Development
```bash
pnpm install
pnpm run dev
```

### Local Git Hygiene (runtime session file)

`packages/cli/.borg-session.json` is updated at runtime (for example `lastHeartbeat`) and can appear as a local change even when source code is clean.

If you want to keep your working tree clean locally, mark it as skip-worktree:

```bash
git update-index --skip-worktree packages/cli/.borg-session.json
```

To undo that local-only behavior later:

```bash
git update-index --no-skip-worktree packages/cli/.borg-session.json
```

---

## 📂 Repository Layout

- `apps/web`: Next.js Mission Control dashboard.
- `apps/borg-extension`: Browser bridge for MCP-to-Web and auto-memory capture.
- `apps/vscode`: VS Code integration for the Borg Control Plane.
- `packages/core`: The core engine, memory manager, and MCP router.
- `packages/cli`: Direct command-line interaction.
- `archive/`: Compressed history and legacy documentation.

---

## ⚖️ License

MIT. See `LICENSE` for details.