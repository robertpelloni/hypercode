# Deployment Instructions

<<<<<<< HEAD
## borg `1.0.0-alpha.1`
=======
> **Version**: 0.9.0-beta
> **Scope**: Local Development & Production Deployment
>>>>>>> origin/rewrite/main-sanitized

### 1. Build Requirements
- Node.js >= 24
- pnpm >= 10.28
- Go >= 1.23 (For experimental sidecar)

### 2. Standard Build & Run
```bash
<<<<<<< HEAD
pnpm install
pnpm run build
pnpm run start
=======
# 1. Install dependencies
pnpm install

# 2. Start the Borg dev readiness launcher
pnpm run dev

# 3. Verify cross-service readiness
node scripts/verify_dev_readiness.mjs

# Optional machine-readable output
node scripts/verify_dev_readiness.mjs --json --soft
>>>>>>> origin/rewrite/main-sanitized
```
This will compile the TypeScript monorepo, build the web assets, and launch the primary Node.js `cli-orchestrator` along with the web dashboard on port `3000`.

<<<<<<< HEAD
### 3. Experimental Go Sidecar
To run the Go bridge alongside the main control plane:
=======
`pnpm run dev` launches Borg's readiness-aware development wrapper rather than a bare workspace watch. It brings up the core bridge, the dashboard, supporting package watchers, and reports a truthful ready summary once the live startup contract is satisfied.

### Access Points
- **Dashboard**: `http://127.0.0.1:<detected-port>/dashboard`
  - the dev wrapper prefers the marked Next.js dev port and may fall back among `3000`, `3010`, `3020`, `3030`, or `3040`
- **Core bridge / core HTTP probe**: `http://127.0.0.1:3001`
- **Core WebSocket bridge**: `ws://127.0.0.1:3001`
- **Startup status probe**: `http://127.0.0.1:3001/api/trpc/startupStatus?input=%7B%7D`
- **MCP status probe**: `http://127.0.0.1:3001/api/trpc/mcp.getStatus?input=%7B%7D`
- **MCP server**: `stdio` via the CLI entrypoint or the core bridge transport surface

Notes:

- The dashboard root redirects from `/` to `/dashboard`.
- The readiness wrapper can automatically open the detected dashboard URL unless `BORG_DEV_READY_OPEN_BROWSER=0` is set.
- If an existing Borg-owned core bridge is already healthy on port `3001`, the wrapper reuses it instead of spawning a duplicate core process.

---

## 3. Production Deployment (Self-Hosting)

### Docker (Recommended)

Borg ships with a multi-stage `Dockerfile.prod` that creates separate container targets for the core API and the web dashboard.

#### Build Targets

| Target | Base Image | Exposes | Purpose |
|--------|-----------|---------|---------|
| `core-runner` | node:20-slim | 3000 | Borg Core API + WebSocket server |
| `web-runner` | node:20-slim | 8080 | Next.js standalone dashboard |

#### Build & Run
>>>>>>> origin/rewrite/main-sanitized
```bash
cd go
go run ./cmd/borg serve
```

<<<<<<< HEAD
### 4. Extensions
To build extensions (VS Code, Chrome):
```bash
pnpm run build:extensions
=======
Both containers include built-in healthchecks (30s interval, 5s timeout, 3 retries).

### Manual Server Deployment
1. **Build**:
   ```bash
   pnpm install
   pnpm run build
   ```
2. **Environment Variables**:
  Create a `.env` file where your chosen deployment path expects it. For the current local control-plane defaults, the important values are:
   ```env
   # Core
   PORT=3001
   DATABASE_URL=file:./dev.db
   JWT_SECRET=your_secret_key
   
   # Web
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
3. **Start**:
   ```bash
  # Root production-style build
  pnpm run build

  # Root CLI start path
  node packages/cli/dist/index.js start
   ```

---

## 4. MCP Server Integration

To use Borg as an MCP Server inside **Claude Desktop** or **Cursor**:

### Claude Desktop Config
Edit `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "borg-core": {
      "command": "node",
      "args": [
        "C:/path/to/borg/packages/cli/dist/index.js",
        "mcp",
        "start"
      ]
    }
  }
}
>>>>>>> origin/rewrite/main-sanitized
```

### 5. Production Docker
```bash
docker build -f Dockerfile.prod -t borg:latest .
docker run -p 3000:3000 -p 4000:4000 -v borg-data:/root/.borg borg:latest
```

<<<<<<< HEAD
## Health Checks
- `http://localhost:4000/api/config/status` - Main control plane health
- `http://localhost:3000` - Dashboard
=======
---

## 5. Troubleshooting

- **Port 3001 In Use**: The core server creates a WebSocket on 3001. Ensure no other instance is running.
- **Dashboard on an unexpected port**: `pnpm run dev` may move the dashboard off `3000` if that port is occupied. Use the ready summary from the launcher or rerun `node scripts/verify_dev_readiness.mjs` to discover the active dashboard URL.
- **Circular Dependencies**: If `pnpm build` fails, check `packages/core` for circular imports (Ref: Phase 63 fix).
- **Database Locks**: SQLite may lock if multiple processes access `dev.db` in write mode.
- **Docker Build Fails**: Ensure `turbo` can prune the workspace. Run `pnpm dlx turbo prune @borg/web @borg/core --docker` locally first to validate.

### Optional verbose Borg core startup logs

Normal `pnpm run dev` keeps `packages/core/src/MCPServer.ts` boot logging quiet unless you opt in.

Use either flag when you want verbose startup/import tracing:

```powershell
$env:BORG_MCP_SERVER_DEBUG='1'; pnpm run dev
```

```powershell
$env:DEBUG='borg:mcp-server'; pnpm run dev
```

To clear them again in the current PowerShell session:

```powershell
Remove-Item Env:BORG_MCP_SERVER_DEBUG -ErrorAction SilentlyContinue
Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
```

---

*"Assimilate your infrastructure."*
>>>>>>> origin/rewrite/main-sanitized
