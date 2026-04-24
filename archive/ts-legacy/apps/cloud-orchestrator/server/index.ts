import { JulesClient, JulesAPIError } from '../lib/jules/client';
import { prisma } from '../lib/prisma';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { EventEmitter } from 'events';
import { startDaemon, stopDaemon } from './daemon';
import { queryCodebase } from './rag';
import { handleBorgWebhook } from './webhooks';
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun';
import { setupWorker, orchestratorQueue } from './queue';
import fs from 'fs';
import path from 'path';
import type { DaemonEventType } from '@jules/shared';
import { createDaemonEvent } from '@jules/shared';

console.log(`[Server] Initializing Lean Core (Routing Fix Mode)...`);

// Force load .env into process.env
try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                if (key) {
                    let value = (match[2] || '').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1); 
                    if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1); 
                    process.env[key] = value;
                }
            }
        });
        console.log('[Server] Manually loaded .env file');
    }
} catch (e) { console.error('[Server] Failed to manually load .env:', e); }

const { upgradeWebSocket, websocket } = createBunWebSocket();
const app = new Hono();
const api = new Hono();
const port = 8080;

const eventBus = new EventEmitter();
const wsClients = new Set<ServerWebSocket<any>>();
let workerInstance: ReturnType<typeof setupWorker> | null = null;

export function broadcastToClients(message: object) {
    const payload = JSON.stringify(message);
    for (const client of wsClients) {
        try {
            client.sendText(payload);
        } catch {
            wsClients.delete(client);
        }
    }
}

export function emitDaemonEvent(type: DaemonEventType, data?: object) {
    const message = createDaemonEvent(type, data);
    eventBus.emit('daemon', message);
    broadcastToClients(message);
}

// GLOBAL MIDDLEWARE
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Jules-Api-Key', 'X-Jules-Auth-Token', 'X-Goog-Api-Key'],     
}));

app.onError((err, c) => {
    console.error(`[Fatal Server Error] ${err.message}`, err.stack);
    return c.json({ error: err.message, status: 500 }, 500);
});

async function getJulesClient(c?: any) {
    try {
        const headerKey = c?.req?.header('X-Jules-Api-Key') || c?.req?.header('X-Goog-Api-Key');
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);    

        const julesKey = process.env.JULES_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY;

        let apiKey: string | undefined;
        const isInvalid = (val?: string) => !val || val === 'placeholder' || val === 'undefined' || val === 'null' || val.length < 5;

        // PRIORITIZE your environment key
        if (!isInvalid(julesKey)) apiKey = julesKey;
        else if (!isInvalid(googleKey)) apiKey = googleKey;
        else if (!isInvalid(headerKey)) apiKey = headerKey;
        else if (settings?.julesApiKey && !isInvalid(settings.julesApiKey)) apiKey = settings.julesApiKey;

        if (apiKey) {
            // CRITICAL: Jules Portal tokens (AQ.A) MUST use x-goog-api-key and 
            // MUST NOT use Bearer Authorization. JulesClient handles this internally.
            return new JulesClient(apiKey, 'https://jules.googleapis.com/v1alpha');
        }
    } catch (e) {
        console.error(`[Auth] Client initialization error:`, e);
    }
    return null;
}

const getMockSessions = () => [
    {
        id: 'mock-1',
        title: 'Fix broken auth',
        status: 'active',
        rawState: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceId: 'google/jules',
        branch: 'main'
    }
];

// PING ENDPOINT
api.get('/ping', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

// API ROUTES
api.get('/manifest', (c) => {
    return c.json({
        id: 'jules-autopilot-node-1',
        name: 'Jules Autopilot Orchestrator',
        version: '0.9.7',
        capabilities: [
            'cloud_session_management',
            'autonomous_plan_approval',
            'semantic_rag_indexing',
            'council_supervisor_debate',
            'automatic_self_healing',
            'github_issue_conversion'
        ],
        endpoints: {
            sessions: '/api/sessions',
            summary: '/api/fleet/summary',
            rag: '/api/rag/query',
            reindex: '/api/rag/reindex'
        },
        borgCompatible: true
    });
});

api.get('/sessions/:id/replay', async (c) => {
    try {
        const id = c.req.param('id');
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);

        const [session, activities] = await Promise.all([
            client.getSession(id),
            client.listActivities(id)
        ]);

        // Transform activities into a structured replay timeline
        const timeline = activities.map(a => ({
            id: activity.id,
            timestamp: a.createdAt,
            role: a.role,
            type: a.type,
            content: a.content,
            hasDiff: !!a.diff,
            hasCommand: !!a.bashOutput
        }));

        return c.json({
            sessionId: id,
            title: session.title,
            status: session.status,
            createdAt: session.createdAt,
            timeline
        });
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

api.get('/sessions', async (c) => {
    try {
        const client = await getJulesClient(c);
        if (!client) return c.json({ sessions: getMockSessions() });

        const sessions = await client.listSessions();
        return c.json({ sessions });
    } catch (e: any) {
        const errorMessage = e?.message || String(e);
        console.error(`[API] listSessions failed: ${errorMessage}`);

        return c.json({ 
            sessions: [
                {
                    id: 'critical-err',
                    title: `API Error: ${errorMessage}`,
                    status: 'failed',
                    rawState: 'FAILED',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    sourceId: 'system',
                    branch: 'none',
                    metadata: { error: e?.response || errorMessage }
                },
                ...getMockSessions()
            ]
        });
    }
});

api.get('/sessions/:id', async (c) => {
    try {
        const id = c.req.param('id');
        if (id === 'critical-err') return c.json({ id, title: 'API Error Log', state: 'FAILED' });
        if (id.startsWith('mock-')) return c.json({ id, title: 'Mock Session', state: 'ACTIVE' });
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);
        return c.json(await client.getSession(id));
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

api.get('/sessions/:id/activities', async (c) => {
    try {
        const id = c.req.param('id');
        if (id === 'critical-err' || id.startsWith('mock-')) return c.json({ activities: [] });
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);
        return c.json({ activities: await client.listActivities(id) });
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

// ROUTE FIX: Handle URLs with colons (Custom Methods) correctly
api.post('/sessions/:idAndAction', async (c) => {
    try {
        const idAndAction = c.req.param('idAndAction');
        const [id, action] = idAndAction.includes(':') ? idAndAction.split(':') : [idAndAction, null];
        
        if (!action) return c.notFound();

        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);

        if (action === 'sendMessage') {
            const body = await c.req.json();
            return c.json(await client.createActivity({ sessionId: id, content: body.prompt }));
        }

        if (action === 'approvePlan') {
            await client.approvePlan(id);
            return c.json({ success: true });
        }

        return c.json({ error: 'Invalid action' }, 400);
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

api.post('/sessions/:id/activities', async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const client = await getJulesClient(c);
        if (!client) return c.json({ error: 'Auth required' }, 401);
        return c.json(await client.createActivity({
            sessionId: id,
            content: body.content || body.userMessage?.message || '',
            role: body.role,
            type: body.type
        }));
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

const handleWebhookSignal = async (c: Context) => {
    try {
        const body = await c.req.json();
        const result = await handleBorgWebhook(body);
        
        // Broadcast the signal to all connected UI clients
        emitDaemonEvent('borg_signal_received', {
            type: body.type,
            source: body.source || 'collective',
            data: body.data,
            timestamp: new Date().toISOString()
        });

        return c.json(result);
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
};

api.post('/webhooks/borg', handleWebhookSignal);
api.post('/webhooks/borg', handleWebhookSignal);

api.post('/rag/query', async (c) => {
    try {
        const body = await c.req.json();
        const { query, topK } = body;
        
        if (!query) {
            return c.json({ error: 'Query is required' }, 400);
        }

        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
        const apiKey = process.env.OPENAI_API_KEY || settings?.supervisorApiKey;

        if (!apiKey || apiKey === 'placeholder') {
            return c.json({ error: 'OpenAI API key is required for RAG' }, 401);
        }

        const results = await queryCodebase(query, apiKey, topK || 5);
        return c.json({ results });
    } catch (e) {
        console.error('[API] RAG Query failed:', e);
        return c.json({ error: String(e) }, 500);
    }
});

api.post('/rag/reindex', async (c) => {
    try {
        const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
        const apiKey = process.env.OPENAI_API_KEY || settings?.supervisorApiKey;

        if (!apiKey || apiKey === 'placeholder') {
            return c.json({ error: 'OpenAI API key is required for RAG' }, 401);
        }

        await orchestratorQueue.add('index_codebase', {});
        return c.json({ success: true, message: 'Re-indexing job enqueued' });
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

api.get('/fleet/summary', async (c) => {
    try {
        const [
            sessions,
            pendingJobs,
            processingJobs,
            recentActions,
            chunkCount
        ] = await Promise.all([
            prisma.session.findMany({ select: { status: true } }),
            prisma.queueJob.count({ where: { status: 'pending' } }),
            prisma.queueJob.count({ where: { status: 'processing' } }),
            prisma.keeperLog.findMany({ 
                where: { type: 'action' },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.codeChunk.count()
        ]);

        const statusCounts = sessions.reduce((acc: Record<string, number>, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        }, {});

        return c.json({
            timestamp: new Date().toISOString(),
            fleet: {
                total: sessions.length,
                byStatus: statusCounts
            },
            orchestrator: {
                queueDepth: pendingJobs + processingJobs,
                isActive: processingJobs > 0,
                recentAutonomousActions: recentActions.map(a => ({
                    message: a.message,
                    time: a.createdAt
                }))
            },
            knowledgeBase: {
                totalChunks: chunkCount,
                isIndexed: chunkCount > 0
            },
            borgReady: true
        });
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

api.get('/system/submodules', async (c) => {
    try {
        const { execSync } = await import('child_process');
        const output = execSync('git submodule status', { encoding: 'utf8' });
        
        const submodules = output.split('\n')
            .filter(line => line.trim())
            .map(line => {
                // git submodule status output format: [status_char][hash] [path] ([tag/branch])
                const match = line.match(/^([\s+-])([a-f0-9]+)\s+([^\s]+)(?:\s+\((.+)\))?$/);
                if (!match) return null;
                
                const [_, statusChar, hash, path, ref] = match;
                return {
                    name: path.split('/').pop(),
                    path,
                    hash: hash.substring(0, 7),
                    fullHash: hash,
                    ref: ref || 'unknown',
                    status: statusChar === ' ' ? 'synced' : statusChar === '+' ? 'modified' : 'uninitialized'
                };
            })
            .filter(Boolean);

        return c.json({ submodules });
    } catch (e) {
        console.error('[API] Failed to fetch submodules:', e);
        return c.json({ submodules: [] }); // Fallback to empty list
    }
});

api.get('/daemon/status', async (c) => {
    const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);        
    const logs = await prisma.keeperLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }).catch(() => []);     
    
    // Get queue stats
    const [pendingJobs, processingJobs] = await Promise.all([
        prisma.queueJob.count({ where: { status: 'pending' } }),
        prisma.queueJob.count({ where: { status: 'processing' } })
    ]);

    return c.json({ 
        isEnabled: settings?.isEnabled || false, 
        logs, 
        wsClients: wsClients.size,
        queue: {
            pending: pendingJobs,
            processing: processingJobs
        }
    });
});

// FILE SYSTEM ENDPOINTS
api.get('/fs/list', async (c) => {
    try {
        const queryPath = c.req.query('path') || '.';
        const targetPath = path.resolve(process.cwd(), queryPath);
        if (!targetPath.startsWith(process.cwd())) return c.json({ error: 'Access denied' }, 403);

        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const files = entries
            .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
            .map(e => ({
                name: e.name,
                isDirectory: e.isDirectory(),
                path: path.relative(process.cwd(), path.join(targetPath, e.name))
            }));

        return c.json({ files });
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

api.get('/fs/read', async (c) => {
    try {
        const queryPath = c.req.query('path');
        if (!queryPath) return c.json({ error: 'Path required' }, 400);
        const targetPath = path.resolve(process.cwd(), queryPath);
        if (!targetPath.startsWith(process.cwd())) return c.json({ error: 'Access denied' }, 403);
        if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) return c.json({ error: 'File not found' }, 404);

        const content = fs.readFileSync(targetPath, 'utf8');
        return c.json({ content });
    } catch (e) { return c.json({ error: String(e) }, 500); }
});

// Mount API
app.route('/api', api);

// WEBSOCKET HANDLER
app.get('/ws', upgradeWebSocket(() => ({
    onOpen(event, ws) {
        wsClients.add(ws as unknown as ServerWebSocket<any>);
        ws.send(JSON.stringify({ type: 'connected' }));
    },
    onClose(event, ws) {
        wsClients.delete(ws as unknown as ServerWebSocket<any>);
    }
})));

// STATIC FILE SERVING
app.get('*', async (c) => {
    const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
    const filePath = path.resolve(process.cwd(), 'dist', reqPath.startsWith('/') ? reqPath.slice(1) : reqPath);     
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        let contentType = 'text/plain';
        if (reqPath.endsWith('.js')) contentType = 'text/javascript; charset=utf-8';
        else if (reqPath.endsWith('.css')) contentType = 'text/css';
        else if (reqPath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
        else if (reqPath.endsWith('.svg')) contentType = 'image/svg+xml';
        else if (reqPath.endsWith('.ico')) contentType = 'image/x-icon';
        return new Response(content, { headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' } });
    }
    if (!reqPath.startsWith('/api') && !reqPath.startsWith('/ws')) {
        const indexPath = path.resolve(process.cwd(), 'dist/index.html');
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath);
            return new Response(content, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); 
        }
    }
    return c.notFound();
});

// BUN SERVE
if (typeof Bun !== 'undefined') {
    Bun.serve({ port, fetch: app.fetch, websocket });
    console.log(`[Bun] Command Center running at http://localhost:${port}`);
    setTimeout(async () => {
        try {
            const settings = await prisma.keeperSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
            if (settings?.isEnabled) {
                console.log("[Server] Auto-starting Session Keeper...");
                startDaemon();
                workerInstance = setupWorker();
            }
        } catch (e) { console.error("[Server] Auto-start failed:", e); }
    }, 1000);
}
