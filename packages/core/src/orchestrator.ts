
console.log("[Core:Orchestrator] Starting imports...");
import { spawn } from 'child_process';

import express from 'express';
console.log("[Core:Orchestrator] ✓ express");
import cors from 'cors';
console.log("[Core:Orchestrator] ✓ cors");
import { createExpressMiddleware } from '@trpc/server/adapters/express';
console.log("[Core:Orchestrator] ✓ @trpc/server/adapters/express");
import { appRouter } from './trpc.js';
console.log("[Core:Orchestrator] ✓ trpc.js");
import { ingestPublishedCatalog } from './services/published-catalog-ingestor.js';
import { InputTools, SystemStatusTool } from '@borg/tools';
import { MCPServer } from './MCPServer.js';
import { resolveSupervisorEntryPath } from './orchestratorPaths.js';
console.log("[Core:Orchestrator] ✓ MCPServer.js");

export const name = "@borg/core";

export interface StartOrchestratorOptions {
    host?: string;
    trpcPort?: number;
    startSupervisor?: boolean;
    startMcp?: boolean;
    autoDrive?: boolean;
}

export async function startOrchestrator(options: StartOrchestratorOptions = {}) {
    console.log(`[Core] Initializing ${name}...`);

    const host = options.host ?? '0.0.0.0';
    const trpcPort = options.trpcPort ?? 4000;
    const startSupervisor = options.startSupervisor ?? false;
    const startMcp = options.startMcp ?? true;
    const autoDrive = options.autoDrive ?? false;

    console.log("[Core] 1. Starting Express/tRPC...");
    // 1. Start tRPC Server (Dashboard API)
    const app = express();
    app.use(cors());
    app.use(
        '/trpc',
        createExpressMiddleware({
            router: appRouter,
            createContext: () => ({}),
        })
    );

    app.listen(trpcPort, host, () => {
        console.log(`[Core] tRPC Server running at http://${host}:${trpcPort}/trpc`);
    });

    // 1.1. Schedule automatic catalog ingestion (startup + 24h interval)
    scheduleCatalogIngestion();

    // 1.5. Start Supervisor (Native Input / Watchdog)
    if (startSupervisor) {
        try {
            console.log("[Core] 1.5 Starting Borg Supervisor...");
            const supervisorPath = resolveSupervisorEntryPath();
            if (!supervisorPath) {
                console.warn("[Core] Borg Supervisor build not found. Skipping supervisor startup.");
            } else {
                const supervisor = spawn('node', [supervisorPath], {
                    stdio: 'inherit',
                    detached: false
                });

                supervisor.on('error', (err) => console.error("[Supervisor] Failed to start:", err));
                console.log(`[Core] Supervisor running (PID: ${supervisor.pid})`);
            }
        } catch (e) {
            console.error("[Core] Failed to spawn Supervisor:", e);
        }
    }

    // 2. Start MCP Server (Bridged: Stdio + WebSocket)
    if (startMcp) {
        try {
            console.log("[Core] 2. Instantiating MCPServer...");
            const inputTools = new InputTools();
            const systemStatusTool = new SystemStatusTool();
            const mcp = new MCPServer({
                inputTools,
                systemStatusTool,
                skipAutoDrive: !autoDrive,
                skipStdio: true,
            });

            console.log("[Core] 3. Starting MCPServer...");
            await mcp.start();
            console.log("[Core] MCPServer Started.");

            // Auto-Start the Director in Auto-Drive Mode (High Autonomy)
            if (autoDrive) {
                console.log("[Core] 4. Scheduling Auto-Drive...");
                // We use a small delay to ensure connections are ready
                setTimeout(() => {
                    console.log("[Core] Triggering Auto-Drive Tool...");
                    mcp.executeTool('start_auto_drive', {}).catch(e => console.error("Failed to auto-start Director:", e));
                }, 3000);
            }

        } catch (err) {
            console.error("Failed to start MCP server:", err);
            throw err;
        }
    }

    return {
        host,
        trpcPort,
        bridgePort: startMcp ? 3001 : null,
    };
}

// ---------------------------------------------------------------------------
// Catalog Ingestion Scheduler
// ---------------------------------------------------------------------------
const INGEST_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INGEST_STARTUP_DELAY_MS = 10_000;           // 10 seconds after startup

function scheduleCatalogIngestion(): void {
    const run = () => {
        console.log("[Core:Catalog] Running scheduled catalog ingestion...");
        ingestPublishedCatalog()
            .then(report => {
                const adapterNames = report.results.map(r => r.source).join(", ");
                console.log(
                    `[Core:Catalog] Ingestion complete — upserted: ${report.total_upserted}, ` +
                    `errors: ${report.total_errors}, adapters: ${adapterNames}`
                );
            })
            .catch(err => {
                console.warn("[Core:Catalog] Scheduled ingestion failed (non-fatal):", err?.message ?? err);
            });
    };

    setTimeout(() => {
        run();
        setInterval(run, INGEST_INTERVAL_MS);
    }, INGEST_STARTUP_DELAY_MS);

    console.log(`[Core:Catalog] Catalog ingestion scheduled (startup delay: ${INGEST_STARTUP_DELAY_MS / 1000}s, interval: 24h)`);
}
