# Borg Deployment Instructions

_This document contains the latest deployment instructions for the Borg Universal AI Dashboard and Cognitive Control Plane._

## Prerequisites

1.  **Node.js**: >= 22.12.0
2.  **pnpm**: Recommended package manager (`npm install -g pnpm`)
3.  **Git**: For submodule fetching and version control.

## Initial Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/robertpelloni/borg.git
    cd borg
    ```

2.  **Initialize Submodules**:
    ```bash
    git submodule update --init --recursive
    ```

3.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

4.  **Environment Variables**:
    Copy `.env.example` to `.env` and fill in the required API keys (OpenAI, Anthropic, Gemini, etc.).
    ```bash
    cp .env.example .env
    ```

## Running the Platform

Borg is designed as a long-running service that manages PC memory, CPU, disk, and bandwidth usage.

### Start the Dashboard & Core Server
Use the provided startup scripts:

**Windows**:
```bash
.\start.bat
```

`start.bat` defaults to `pnpm run build:workspace` (faster startup, skips extension-only build stages).
To force a full build before startup, set:

```bash
set BORG_FULL_BUILD=1
.\start.bat
```

**Linux/macOS**:
```bash
./start.sh
```

Alternatively, run via pnpm:
```bash
pnpm dev
```

This will:
1. Start the Borg Server (core).
2. Start the MCP Router (client/server proxy).
3. Open the Web Dashboard (Next.js) at `http://localhost:3000`.

### Building for Production
```bash
pnpm build
pnpm start
```

## Extension Installation

Once the dashboard is running, navigate to the **Integrations** tab in the WebUI to install:
*   Browser Extensions (Chrome, Firefox).
*   IDE Plugins (VSCode, Cursor, Windsurf).
*   CLI Harnesses.

## Package Manager Requirement

**pnpm v10 is required.** The root `package.json` locks `packageManager: pnpm@10.28.0`. Using pnpm v9 or below will produce `ERR_PNPM_BAD_PM_VERSION` and fail the build.

```bash
npm install -g pnpm@10
```

## CI/CD

Workflows in `.github/workflows/` use `pnpm/action-setup@v4` with `version: 10`. Do not downgrade this — it will invalidate every CI run against the packageManager lock.

## Release Gate

Before merging or pushing, validate the full release gate:

```bash
pnpm run check:release-gate:ci
```

This runs (in order):
1. `check:placeholders` — ensures no unresolved placeholder files are committed
2. Core typecheck — `tsc --noEmit` across `packages/core`
3. Turbo lint — ESLint across all packages

Screenshot/visual verification is now opt-in (manual workflow). Use this when you explicitly want to validate screenshot state:

```bash
pnpm run check:release-gate:ci:strict-visuals
```

If strict visuals fail, run `pnpm run sync:screenshot-status` to resync the README table.
