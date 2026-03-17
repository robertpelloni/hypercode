# Deploy & Development Guide

## Prerequisites
*   **Operating System**: Windows (primary), Linux/WSL2 (supported).
*   **Node.js**: v20 or higher.
*   **Package Manager**: `pnpm` (v10+).
*   **Docker Desktop**: Required for containerized memory/db services.

## Installation
```bash
# Clone repository
git clone <repo-url>
cd borg-monorepo

# Install dependencies
pnpm install
```

## Development Commands
The project uses `turborepo` to manage the monorepo.

### Start All Services
```bash
# Starts backend, frontend, and all microservices (skipping specific heavy agents)
pnpm dev
```

### Start Individual Components
```bash
# Web Dashboard only (localhost:3000)
pnpm dev:web

# Backend Server only
pnpm dev:server
```

### Building for Production
```bash
# Build all packages
pnpm build
```

## Troubleshooting

### Build Failures
If you encounter `context` or `lockfile` errors:
```bash
# Clean all artifacts
pnpm clean

# Re-install
pnpm install

# Force rebuild
pnpm build --force
```

### TypeScript Errors
Run a full typecheck across the monorepo:
```bash
pnpm typecheck
```
