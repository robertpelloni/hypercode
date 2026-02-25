# Borg Deployment Guide

> **Version**: 2.7.21
> **Scope**: Local Development & Production Deployment

---

## 1. Prerequisites

- **Node.js**: v20 or higher (LTS recommended)
- **Package Manager**: pnpm (v9+)
- **Build Tool**: Turborepo (global install optional, used via scripts)
- **Database**: SQLite (default for local) or PostgreSQL (production)
- **Environment**: Windows, Linux, or macOS

## 2. Local Development (The "Mission Control" Setup)

Borg is designed to run locally as your personal AI Operating System.

### Quick Start
```bash
# 1. Install dependencies
pnpm install

# 2. Build shared packages
pnpm run build

# 3. Start the stack (Backend + Dashboard + CLI)
# This runs 'turbo run dev' which orchestrates all apps
pnpm run dev

# 4. Verify cross-service readiness
pnpm run check:dev-readiness

# Optional machine-readable output
pnpm run check:dev-readiness -- --json --soft
```

### Access Points
- **Dashboard**: `http://localhost:3000` (Next.js App)
- **Borg Server**: `http://localhost:3001` (Core API & WebSocket)
- **MCP Server**: `stdio` (via CLI wrapper) or `SSE` (if configured)

---

## 3. Production Deployment (Self-Hosting)

To host Borg as a shared team instance or cloud agent server.

### Docker (Recommended)
*Coming in v2.7.0 - Dockerfile generation is pending.*

### Manual Server Deployment
1. **Build**:
   ```bash
   pnpm install
   pnpm run build
   ```
2. **Environment Variables**:
   Create a `.env` file in `packages/core` and `apps/web`:
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
   # Start logic only
   cd packages/core
   npm start
   
   # Start UI
   cd apps/web
   npm start
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
```

### Cursor Config
Add via "Borg" extension or manual MCP settings using the same command tuple.

---

## 5. Troubleshooting

- **Port 3001 In Use**: The core server creates a WebSocket on 3001. Ensure no other instance is running.
- **Circular Dependencies**: If `pnpm build` fails, check `packages/core` for circular imports (Ref: Phase 63 fix).
- **Database Locks**: SQLite may lock if multiple processes access `dev.db` in write mode.

---

*"Assimilate your infrastructure."*
