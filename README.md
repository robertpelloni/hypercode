# BORG (previously AIOS): The Universal AI Operating System

> **Status**: Phase 64 (Release Readiness v0.8.0-rc1) - **IN PROGRESS**
> **Version**: 2.7.22
> **Codename**: AIOS (AI Operating System)

---

A unified operating system for PC-based local AI tools. Manage everything from tool installation to autonomous multi-agent orchestration in a single, high-fidelity dashboard.

## 🔍 Latest Audit & Stabilization (2026-02-24)

The system has undergone a major structural stabilization and resource synchronization pass:
- **Git Tree Restored**: Resolved fatal `no submodule mapping` errors by repairing `.gitmodules`.
- **932 Submodules Assimilated**: The ecosystem has scaled to over 900 verified reference submodules across categories like `orchestration`, `mcp-servers`, and `memory`.
- **Feature Gap Closure**: Identified "Dark Features" in the backend (Security Policies, Audit Logs) now slated for immediate UI implementation.
- **Redundancy Roadmap**: Initiated a deduplication plan to consolidate redundant submodule paths and optimize build performance.

[VIDEO EXPLANATION](https://www.youtube.com/watch?v=RQZsZWrqp2c)

## 🚀 Key Features

### 🛠️ Ultimate Tool Dashboard
- **Inventory Management:** Track installation status of local AI tools (Aider, Docker, Redis, Bun).
- **One-Click Setup:** Automatically detect missing tools and generate install commands.
- **Process Guardian:** Long-running service that monitors and restarts crashed background processes.
- **Hardware Stats:** Real-time CPU, VRAM, RAM, and Disk usage monitoring.

### 🧠 The "Director" Autonomous Agent
- **Auto-Drive:** Fully autonomous development loop that reads `task.md`, plans next steps, and executes them.
- **Council Consensus:** Multi-persona LLM debate engine (Architect, Guardian, Optimizer) that reviews high-stakes decisions.
- **Memory RAG:** Vector-based code indexing and semantic search for context-aware coding.
- **Skill Installer:** Dynamic capability expansion via `mcpm_install` (Git-based skills).
- **Configurable Control:** Real-time settings adjustment and persistence via Dashboard.

### 🔌 Universal MCP Control Plane
- **Core Server:** Central orchestrator connecting Native IDE, Web Dashboard, and Browser Extension.
- **Dynamic Routing:** Smart routing of prompts to specific tools (Native vs Web).
- **Skill Registry:** Expandable skill plugins for specialized tasks.

### 🖥️ High-Fidelity Dashboard
- **Mission Control:** Process monitoring, auto-restarts, and system status.
- **Skills UI:** Browse and manage installed capabilities.
- **Reader UI:** Test the web scraper/page reader.
- **Submodule Manager:** Visual git submodule health check and healing.
- **Council Config:** Manage personas and context files.
- **System Status:** Live metrics widget (CPU/RAM).
- **Engagement Layer:** Voice feedback (TTS), Toast notifications, and actionable suggestions.
- **Responsive Design:** Fully mobile-compatible Mission Control interface.

## 📦 Installation

### Option 1: Docker (Recommended)
You can spin up the entire stack (Core, Web, Postgres, Redis) with a single command:

```bash
docker-compose up --build
```
Access the Dashboard at `http://localhost:3001`.

### Option 2: Local Development
```bash
# Clone
git clone https://github.com/robertpelloni/borg.git
cd borg

# Install
pnpm install

# Start (Core + Web + Supervisor)
pnpm start
```

## 🏗️ Project Structure

- **`packages/core`**: The Brain (Node.js + MCP Server + Director Agent).
- **`packages/cli`**: The Entrypoint (`borg-cli`) hosting the Core.
- **`apps/web`**: Next.js Dashboard (Mission Control).
- **`apps/extension`**: Browser Extension (Chrome/Edge Bridge).
- **`packages/borg-supervisor`**: Native System Bridge (VS Code Automation).
- **`packages/vscode`**: VS Code Extension (Observer).


## 📚 Documentation

- [Submodule Ecosystem Dashboard](SUBMODULES.md) - **NEW!**
- [Memory Architecture](memory/ARCHITECTURE.md) - **NEW!**
- [Incoming Resources Queue](docs/INCOMING_RESOURCES.md)
- [Vision & Philosophy](docs/VISION.md)
- [Roadmap](ROADMAP.md)

## 🤝 Contributing

We welcome contributions! Please see `CONTRIBUTING.md` for details.

## 📄 License

MIT
