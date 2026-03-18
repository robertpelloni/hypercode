# Borg (v2.7.333)

> The Unified AI Operations Control Plane.

![Borg Mission Control Dashboard](./screenshot.png)

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

![Borg MCP Fleet Management](./screenshot2.png)

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

## 🏗️ Core Architecture

1. **Discovery**: `search_tools(query)` -> Semantic ranked matches.
2. **Loading**: `load_tool(name)` -> Hydrates specific tool schemas.
3. **Execution**: `auto_call_tool(objective, context)` -> One-shot magic.
4. **Memory**: `save_memory` / `search_memory` -> Persistent cross-session intelligence.

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
