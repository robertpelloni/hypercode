# EXTREME WIP ALPHA DEVELOPED "IN THE OPEN," DON'T BOTHER TRYING TO USE IT UNLESS YOU PLAN ON HACKING ON IT TO GET IT WORKING

# BORG (previously AIOS): The Universal AI Operating System

A unified operating system for PC-based local AI tools. Manage everything from tool installation to autonomous multi-agent orchestration in a single, high-fidelity dashboard.

![Borg Dashboard](https://via.placeholder.com/1200x600?text=Borg+Dashboard+Preview)

![Borg Borg Borg](https://www.youtube.com/watch?v=RQZsZWrqp2c)

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

## 📦 Installation
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
