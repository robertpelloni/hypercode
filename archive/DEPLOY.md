# Hypercode Deployment Guide

> **Current release track:** `2.7.324`
> **Scope:** local development and self-hosted deployment

## Prerequisites

- Node.js 20+
- `pnpm` 10+
- Docker (optional, for containerized workflows)

## Local development

### Standard flow

1. `pnpm install`
2. `pnpm run dev`
3. `node scripts/verify_dev_readiness.mjs`

### Local endpoints

- Dashboard: `http://127.0.0.1:<web-port>/dashboard` (typically `3000`, fallback possible)
- Core bridge/API: `http://127.0.0.1:3001`
- Startup status: `http://127.0.0.1:3001/api/trpc/startupStatus?input=%7B%7D`
- MCP status: `http://127.0.0.1:3001/api/trpc/mcp.getStatus?input=%7B%7D`

## Docker compose

Use repository `docker-compose.yml` for containerized local runs:

- `docker compose up --build`

After startup, expected dashboard endpoint is typically `http://localhost:3001` for the compose path.

## Production-oriented build path

1. `pnpm install`
2. `pnpm run build`
3. Start Hypercode through the CLI/runtime entrypoint used by your environment.

## MCP client integration (example)

Hypercode can be configured as an MCP server in clients like Claude Desktop or Cursor using the CLI MCP entrypoint (`packages/cli`).

## Troubleshooting highlights

- If Docker on Windows reports named pipe errors, start Docker Desktop fully before compose.
- If dashboard is not on `3000` during local dev, use `verify_dev_readiness.mjs` to discover the active URL.
- If core port `3001` is occupied, stop stale Hypercode processes before restarting.

## Documentation discipline

When startup/runtime behavior changes, update this file together with:

- `README.md`
- `ROADMAP.md`
- `TODO.md`
- `HANDOFF.md`
