# 🚀 Borg Autonomous Development Quick Start

This guide enables you to use the **Intelligent Supervisor**, **Antigravity Extension**, and **MCP Server** together for autonomous development.

## 1. Prerequisites
Ensure you have your environment variables set, specifically:
- `GOOGLE_API_KEY`: Required for the Director Agent to "think".

Create a `.env` file in `packages/core` if it doesn't exist:
```bash
GOOGLE_API_KEY=your_key_here
```

## 2. Start the Mission Control (Dashboard)
The Dashboard is your visualization layer.

```bash
cd apps/web
pnpm dev
# Opens at http://localhost:3000
```

## 3. Start the Borg Core (MCP Server)
The Core is the brain. It runs the Director agent and the WebSocket bridge.

```bash
cd packages/core
pnpm start
# Listen on Stdio AND ws://localhost:3001
```

## 4. Install the Antigravity Extension
The Extension bridges your web browser (ChatGPT/Claude/Gemini) to your local Borg Core.

1.  **Build the Extension:**
    ```bash
    cd apps/extension
    pnpm install
    pnpm build
    ```
2.  **Load into Chrome/Edge:**
    -   Go to `chrome://extensions`.
    -   Enable **Developer Mode** (top right).
    -   Click **Load unpacked**.
    -   Select `apps/extension/dist`.
3.  **Verify Connection:**
    -   The extension icon should turn **Green** (Connected to `ws://localhost:3001`).

## 5. Run Your First Autonomous Task

You can trigger the Director in two ways:

### Option A: Via Dashboard (Trace Viewer / Command Runner)
(Coming soon: Dedicated "Task Input" UI)

### Option B: Via CLI (Direct Test)
You can test the Director immediately using the `start_task` tool via HTTP or a simple script.

Or, ask **Gemini/Claude** in your browser (with Extension active):
> "Use the `start_task` tool to summarize the README.md file in my root directory."

The Extension will:
1.  Intercept the request.
2.  Send it to Borg Core via WebSocket.
3.  Core will wake `Director`.
4.  Director will:
    -   Use `filesystem_list_directory`.
    -   Use `filesystem_read_file`.
    -   Use LLM to summarize.
    -   Return the result to your browser chat.

---

**Status:**
- **Supervisor:** Running (Logs visible in Dashboard Trace Viewer).
- **Director:** Active (Powered by Google Gemini Flash via `GoogleLLMClient`).
- **Git:** Repaired & Clean.
