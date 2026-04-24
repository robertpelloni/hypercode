<<<<<<< HEAD
# cloud-orchestrator (Lean Core)
=======
# Jules Autopilot (Go Primary Runtime)
>>>>>>> 276c1337b9222c9e448fecc479724cb628a6bdc9

> **The ultra-fast cloud command center for remote agents, including Jules and adjacent cloud workflows.**

<<<<<<< HEAD
cloud-orchestrator is a high-performance, minimalist orchestration platform for remote-agent workflows, including Google Jules and adjacent cloud operators. It replaces slower fragmented interfaces with a unified, real-time dashboard and a keyboard-driven TUI, all powered by a single zero-dependency Bun binary.
=======
Jules Autopilot is a high-performance, minimalist orchestration platform for the Google Jules AI agent. It replaces slow official interfaces with a unified, real-time dashboard, powered by a robust Go backend runtime.
>>>>>>> 276c1337b9222c9e448fecc479724cb628a6bdc9

## 🚀 The Stack

This project has been pivoted to a Go-first architecture to ensure maximum performance, operational reliability, and zero friction:

- **Backend/Runtime:** [Go](https://go.dev) (High-performance API, WebSocket server, Scheduler, and Static SPA host)
- **Frontend:** [Vite](https://vitejs.dev) + [React 19](https://react.dev) (Pure SPA, no SSR overhead)
- **Database:** [GORM](https://gorm.io) + SQLite (Zero-config local persistence)
- **Queue & Automation:** Native Go task queue and RAG indexer
- **Styling:** [TailwindCSS v4](https://tailwindcss.com)

## 🛠️ Getting Started

### Prerequisites
- [Go 1.21+](https://go.dev) installed.
- [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io) for frontend development.

### Installation
```bash
# Clone the repository
git clone https://github.com/your-repo/cloud-orchestrator.git
cd cloud-orchestrator

# Install frontend dependencies
pnpm install

# Build the frontend and shared packages
pnpm run build
```

### Running the Command Center
You can run the entire stack via the Go backend (which serves the built frontend):

1. **Start the Go Runtime:**
   ```bash
   cd backend-go
   go run main.go
   ```
   *The dashboard will be available at `http://localhost:8080`.*

2. **Frontend Dev Mode (Optional):**
   ```bash
   pnpm run dev
   ```

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│          Browser (Vite SPA)              │
│  http://localhost:3006 (Dev)             │
│  http://localhost:8080 (Prod)            │
└───────────────┬──────────────────────────┘
                │ API / WebSocket
                ▼
┌──────────────────────────────────────────┐
<<<<<<< HEAD
│        Bun Daemon (Hono Server)          │
│  • Centralized cloud-agent API Proxy     │
│  • SQLite Task Queue (Background Nudges) │
=======
│          Go Runtime (Fiber)              │
│  • Centralized Jules API Proxy           │
│  • SQLite Task Queue & Scheduler         │
>>>>>>> 276c1337b9222c9e448fecc479724cb628a6bdc9
│  • Local Filesystem Access               │
│  • Multi-Agent Debate Engine             │
│  • Static Asset Delivery (SPA fallback)  │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│          SQLite Database                 │
│  • Session State & Activity Logs         │
│  • Task Queue Persistence                │
│  • User Settings & Templates             │
└──────────────────────────────────────────┘
```

## 🧪 Operational Commands
- `pnpm run build`: Build the shared package and Vite SPA.
- `pnpm run daemon`: Start the Go backend API and background monitoring (`cd backend-go && go run main.go`).
- `pnpm run lint`: Run ESLint across the frontend source tree.
- `pnpm run index`: Run the standalone Go CLI indexer (`cd backend-go && go run cmd/index-repo/main.go`).

## 📜 License
MIT
