import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { t, publicProcedure, adminProcedure } from './lib/trpc-core.js';
import { getMcpServer } from './lib/mcpHelper.js';
import { suggestionsRouter } from './routers/suggestionsRouter.js';
import { squadRouter } from './routers/squadRouter.js';
import { councilRouter } from './routers/councilRouter.js';
import { graphRouter } from './routers/graphRouter.js';
import { workflowRouter } from './routers/workflowRouter.js';
import { testsRouter } from './routers/testsRouter.js';
import { contextRouter } from './routers/contextRouter.js';
import { commandsRouter } from './routers/commandsRouter.js';
import { symbolsRouter } from './routers/symbolsRouter.js';
import { autoDevRouter } from './routers/autoDevRouter.js';
import { shellRouter } from './routers/shellRouter.js';
import { memoryRouter } from './routers/memoryRouter.js';
import { skillsRouter } from './routers/skillsRouter.js';
import { researchRouter } from './routers/researchRouter.js';
import { pulseRouter } from './routers/pulseRouter.js';

// Re-export core definitions for other files that might rely on them
export { t, publicProcedure, adminProcedure };

import { knowledgeRouter } from './routers/knowledgeRouter.js';
import { agentMemoryRouter } from './routers/agentMemoryRouter.js';
import { planRouter as planServiceRouter } from './routers/planRouter.js';
import { metricsRouter as metricsServiceRouter } from './routers/metricsRouter.js';
import { supervisorRouter } from './routers/supervisorRouter.js';
import { lspRouter } from './routers/lspRouter.js';
import { settingsRouter } from './routers/settingsRouter.js';
import { sessionRouter } from './routers/sessionRouter.js';

export const appRouter = t.router({
    graph: graphRouter,
    workflow: workflowRouter,
    tests: testsRouter,
    context: contextRouter,
    commands: commandsRouter,
    symbols: symbolsRouter,
    autoDev: autoDevRouter,
    shell: shellRouter,
    memory: memoryRouter,
    knowledge: knowledgeRouter,
    research: researchRouter,
    pulse: pulseRouter,
    skills: skillsRouter,
    healer: t.router({
        diagnose: t.procedure.input(z.object({ error: z.string(), context: z.string().optional() })).mutation(async ({ input }) => {
            return getMcpServer().healerService.analyzeError(input.error, input.context || "");
        }),
        heal: t.procedure.input(z.object({ error: z.string(), context: z.string().optional() })).mutation(async ({ input }) => {
            const success = await getMcpServer().healerService.heal(input.error, input.context || "");
            return { success };
        }),
        getHistory: t.procedure.query(async () => {
            return getMcpServer().healerService.getHistory();
        })
    }),
    darwin: t.router({
        evolve: t.procedure.input(z.object({ prompt: z.string(), goal: z.string() })).mutation(async ({ input }) => {
            return getMcpServer().darwinService.proposeMutation(input.prompt, input.goal);
        }),
        experiment: t.procedure.input(z.object({ mutationId: z.string(), task: z.string() })).mutation(async ({ input }) => {
            const exp = await getMcpServer().darwinService.startExperiment(input.mutationId, input.task);
            return { experimentId: exp.id };
        }),
        getStatus: t.procedure.query(async () => {
            return getMcpServer().darwinService.getStatus();
        })
    }),
    health: publicProcedure.query(() => {
        return { status: 'running', service: '@borg/core' };
    }),
    getTaskStatus: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(({ input }) => {
            // @ts-ignore
            const mcp = global.mcpServerInstance;
            if (!mcp) return { taskId: 'offline', status: 'offline', progress: 0 };

            const status = mcp.projectTracker.getStatus();
            return {
                taskId: status.currentTask,
                status: status.status,
                progress: status.progress
            };
        }),
    indexingStatus: t.procedure.query(() => {
        // @ts-ignore
        const mcp = global.mcpServerInstance;
        if (!mcp) return { status: 'offline', filesIndexed: 0, totalFiles: 0 };
        return mcp.lspService.getStatus();
    }),
    remoteAccess: t.router({
        start: t.procedure.mutation(async () => {
            const { TunnelTools } = await import('@borg/tools');
            const result = await TunnelTools[0].handler({ port: 3000 });
            return result.content[0].text;
        }),
        stop: t.procedure.mutation(async () => {
            const { TunnelTools } = await import('@borg/tools');
            const result = await TunnelTools[1].handler({});
            return result.content[0].text;
        }),
        status: t.procedure.query(async () => {
            const { TunnelTools } = await import('@borg/tools');
            const result = await TunnelTools[2].handler({});
            return JSON.parse(result.content[0].text);
        })
    }),
    config: t.router({
        readAntigravity: t.procedure.query(async () => {
            const { ConfigTools } = await import('@borg/tools');
            // @ts-ignore
            const result = await ConfigTools[0].handler({});
            // Parse JSON content from the tool output
            return JSON.parse(result.content[0].text);
        }),
        writeAntigravity: t.procedure.input(z.object({ content: z.string() })).mutation(async ({ input }) => {
            const { ConfigTools } = await import('@borg/tools');
            const result = await ConfigTools[1].handler({ content: input.content });
            return result.content[0].text;
        })
    }),
    logs: t.router({
        read: t.procedure.input(z.object({ lines: z.number().optional() })).query(async ({ input }) => {
            const { LogTools } = await import('@borg/tools');
            // @ts-ignore
            const result = await LogTools[0].handler({ lines: input.lines });
            return result.content[0].text;
        })
    }),

    autonomy: t.router({
        setLevel: t.procedure.input(z.object({ level: z.enum(['low', 'medium', 'high']) })).mutation(async ({ input }) => {
            getMcpServer().permissionManager.setAutonomyLevel(input.level);
            return input.level;
        }),
        getLevel: t.procedure.query(() => {
            return getMcpServer().permissionManager.autonomyLevel;
        }),
        activateFullAutonomy: t.procedure.mutation(async () => {
            const mcp = getMcpServer();
            // 1. Set Autonomy High
            mcp.permissionManager.setAutonomyLevel('high');

            // 2. Start Director Chat Daemon
            // @ts-ignore - Private/Missing method usage preserved from original
            mcp.director.startChatDaemon();

            // 3. Start Watchdog (Long)
            // @ts-ignore - Private/Missing method usage preserved from original
            mcp.director.startWatchdog(100);

            return "Autonomous Supervisor Activated (High Level + Chat Daemon + Watchdog)";
        })
    }),
    director: t.router({
        memorize: t.procedure.input(z.object({ content: z.string(), source: z.string(), title: z.string().optional() })).mutation(async ({ input }) => {
            await getMcpServer().memoryManager.saveContext(input.content, {
                source: input.source,
                title: input.title || 'Untitled Web Page',
                type: 'web_page'
            });
            return "Memorized.";
        }),
        chat: t.procedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
            const server = getMcpServer();

            // 1. Intercept Slash Commands
            if (input.message.trim().startsWith('/')) {
                const commandResult = await server.commandRegistry.execute(input.message);
                if (commandResult && commandResult.handled) {
                    return commandResult.output;
                }
            }

            // 2. Intercept "Yes" / "Approve" for Suggestions
            const pending = server.suggestionService.getPendingSuggestions();
            if (pending.length > 0 && /^(yes|approve|do it|confirm|ok)$/i.test(input.message.trim())) {
                const latest = pending[0];
                const suggestion = server.suggestionService.resolveSuggestion(latest.id, 'APPROVED');

                if (suggestion && suggestion.payload?.tool) {
                    // @ts-ignore - Private/Missing method
                    server.director.broadcast(`✅ Approved: **${latest.title}**. Executing ${suggestion.payload.tool}...`);
                    const result = await server.executeTool(suggestion.payload.tool, suggestion.payload.args);
                    return `✅ Execution Complete.\n\nResult:\n${JSON.stringify(result)?.substring(0, 200)}...`;
                }

                return `✅ Approved suggestion: **${latest.title}**. (No tool attached)`;
            }

            // 3. Default: Director Execution
            // @ts-ignore - Private/Missing method
            const result = await server.director.executeTask(input.message);
            return result;
        }),
        status: t.procedure.query(() => {
            return getMcpServer().director.getStatus();
        }),
        updateConfig: t.procedure.input(z.object({
            defaultTopic: z.string().optional()
        })).mutation(({ input }) => {
            getMcpServer().director.updateConfig(input);
            return { success: true };
        }),
        stopAutoDrive: adminProcedure.mutation(async () => {
            getMcpServer().director.stopAutoDrive();
            return "Stopped";
        }),
        startAutoDrive: adminProcedure.mutation(async () => {
            // Running valid tool so it logs properly
            getMcpServer().executeTool('start_auto_drive', {});
            return "Started";
        })
    }),
    directorConfig: t.router({
        get: t.procedure.query(async () => {
            return getMcpServer().director.getConfig();
        }),
        update: t.procedure.input(z.object({
            defaultTopic: z.string().optional(),
            taskCooldownMs: z.number().optional(),
            heartbeatIntervalMs: z.number().optional(),
            periodicSummaryMs: z.number().optional(),
            pasteToSubmitDelayMs: z.number().optional(),
            acceptDetectionMode: z.enum(['state', 'polling']).optional(),
            pollingIntervalMs: z.number().optional(),
            // Personalization & Council
            persona: z.enum(['default', 'homie', 'professional', 'chaos']).optional(),
            customInstructions: z.string().optional(),
            council: z.any().optional(),
            // New Controls
            autoSubmitChat: z.boolean().optional(),
            enableChatPaste: z.boolean().optional(),
            enableCouncil: z.boolean().optional(),
            stopDirector: z.boolean().optional(),
            chatPrefix: z.string().optional(),
            directorActionPrefix: z.string().optional(),
            councilPrefix: z.string().optional(),
            statusPrefix: z.string().optional(),
            lmStudioTimeoutMs: z.number().optional(),
            nudgeThresholdMs: z.number().optional(),
            verboseLogging: z.boolean().optional()
        })).mutation(({ input }) => {
            getMcpServer().director.updateConfig(input);
            return { success: true };
        })
    }),

    // NEW: Imported Modular Routers
    suggestions: suggestionsRouter,
    council: councilRouter,
    squad: squadRouter,
    supervisor: supervisorRouter,
    lsp: lspRouter,
    agentMemory: agentMemoryRouter,
    planService: planServiceRouter,
    settings: settingsRouter,
    session: sessionRouter,

    runCommand: adminProcedure.input(z.object({ command: z.string() })).mutation(async ({ input }) => {
        const result = await getMcpServer().executeTool('execute_command', { command: input.command, cwd: process.cwd() });
        // @ts-ignore
        if (result.isError) throw new Error(result.content[0].text);
        // @ts-ignore
        return result.content[0].text;
    }),
    // skills router removed (duplicate)
    executeTool: adminProcedure.input(z.object({
        name: z.string(),
        args: z.any()
    })).mutation(async ({ input }) => {
        const result = await getMcpServer().executeTool(input.name, input.args);
        // Result is { content: ... }
        // @ts-ignore
        if (result.isError) throw new Error(result.content[0].text);
        // @ts-ignore
        return result.content[0].text;
    }),
    repoGraph: graphRouter,
    autoTest: t.router({
        getResults: t.procedure.query(() => {
            const results = getMcpServer().autoTestService.testResults;
            return Object.fromEntries(results);
        }),
        getStatus: t.procedure.query(() => {
            return { isRunning: getMcpServer().autoTestService.isRunning };
        }),
        start: t.procedure.mutation(() => {
            getMcpServer().autoTestService.start();
            return true;
        }),
        stop: t.procedure.mutation(() => {
            getMcpServer().autoTestService.stop();
            return true;
        }),
        clear: t.procedure.mutation(() => {
            getMcpServer().autoTestService.testResults.clear();
            return true;
        })
    }),
    git: t.router({
        getSubmodules: t.procedure.query(async () => {
            const fs = await import('fs/promises');
            const path = await import('path');
            const gitModulesPath = path.join(process.cwd(), '.gitmodules');

            try {
                const content = await fs.readFile(gitModulesPath, 'utf-8');
                const modules = [];
                // Simple regex parser
                const lines = content.split('\n');
                let current: any = {};

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('[submodule')) {
                        if (current.path) modules.push(current);
                        current = { name: trimmed.match(/"(.+)"/)?.[1] || 'unknown' };
                    } else if (trimmed.startsWith('path = ')) {
                        current.path = trimmed.split(' = ')[1];
                    } else if (trimmed.startsWith('url = ')) {
                        current.url = trimmed.split(' = ')[1];
                    }
                }
                if (current.path) modules.push(current);

                return modules;
            } catch (e) {
                console.error("Failed to read .gitmodules", e);
                return [];
            }
        }),
        getLog: t.procedure.input(z.object({ limit: z.number().optional() })).query(async ({ input }) => {
            return getMcpServer().gitService.getLog(input.limit);
        }),
        getStatus: t.procedure.query(async () => {
            return getMcpServer().gitService.getStatus();
        }),
        revert: t.procedure.input(z.object({ hash: z.string() })).mutation(async ({ input }) => {
            return getMcpServer().gitService.revert(input.hash);
        })
    }),
    submodule: t.router({
        list: t.procedure.query(async () => {
            return getMcpServer().submoduleService.listSubmodules();
        }),
        updateAll: t.procedure.mutation(async () => {
            return getMcpServer().submoduleService.updateAll();
        }),
        install: t.procedure.input(z.object({ path: z.string() })).mutation(async ({ input }) => {
            return getMcpServer().submoduleService.installDependencies(input.path);
        }),
        build: t.procedure.input(z.object({ path: z.string() })).mutation(async ({ input }) => {
            return getMcpServer().submoduleService.buildSubmodule(input.path);
        }),
        enable: t.procedure.input(z.object({ path: z.string() })).mutation(async ({ input }) => {
            return getMcpServer().submoduleService.enableSubmodule(input.path);
        })
    }),
    billing: t.router({
        getStatus: t.procedure.query(async () => {
            // Check Env Keys (MASKED)
            const keys = {
                openai: !!process.env.OPENAI_API_KEY,
                anthropic: !!process.env.ANTHROPIC_API_KEY,
                gemini: !!process.env.GEMINI_API_KEY,
                mistral: !!process.env.MISTRAL_API_KEY
            };

            const mcp = getMcpServer();
            const stats = mcp.llmService.getCostStats();
            // Create a breakdown from the single total (simplification for now)
            const breakdown = [
                { provider: 'Total Evaluated', cost: stats.estimatedCostUSD, requests: stats.inputTokens + stats.outputTokens }
            ];

            const usage = {
                currentMonth: stats.estimatedCostUSD,
                limit: 100.00,
                breakdown
            };

            return { keys, usage };
        })
    }),
    system: t.router({
        stats: t.procedure.query(async () => {
            const result = await getMcpServer().executeTool('system_status', {});
            // @ts-ignore
            if (result.isError) return { error: result.content[0].text, platform: 'Error' };
            // @ts-ignore
            return JSON.parse(result.content[0].text);
        }),
        info: t.procedure.query(async () => {
            const fs = await import('fs/promises');
            const path = await import('path');
            const { exec } = await import('child_process');
            const util = await import('util');
            const execAsync = util.promisify(exec);

            let rootVersion = '0.0.0';
            try {
                rootVersion = (await fs.readFile(path.join(process.cwd(), 'VERSION'), 'utf-8')).trim();
            } catch (e) { /* ignore */ }

            let submodules: any[] = [];
            try {
                const { stdout } = await execAsync('git submodule status');
                // Format: -hash path (describe)
                submodules = stdout.trim().split('\n').map(line => {
                    const parts = line.trim().split(' ');
                    const commit = parts[0].replace(/^[+-]/, ''); // Remove status chars
                    const path = parts[1];
                    // Status logic
                    let status = 'Clean';
                    if (line.trim().startsWith('-')) status = 'Uninitialized';
                    if (line.trim().startsWith('+')) status = 'Modified';

                    return {
                        name: path.split('/').pop() || path,
                        path: path,
                        commit: commit,
                        branch: 'HEAD', // Expensive to get real branch for all, default to HEAD for now
                        date: new Date().toISOString().split('T')[0], // Placeholder, real date requires git log per module
                        status: status
                    };
                });
            } catch (e) {
                console.error("Failed to read submodules", e);
            }

            return {
                rootVersion,
                submodules,
                structure: [
                    { path: 'apps/web', description: 'Next.js Dashboard & Mission Control Interface' },
                    { path: 'packages/core', description: 'Central Intelligence: Orchestrator, MCPServer, tRPC' },
                    { path: 'packages/borg-supervisor', description: 'Autonomous Agent Logic & Input Management' },
                    { path: 'packages/ui', description: 'Shared Design System & Feature Widgets' }
                ]
            };
        })
    }),
    sandbox: t.router({
        execute: t.procedure.input(z.object({
            language: z.enum(['python', 'node']),
            code: z.string()
        })).mutation(async ({ input }) => {
            return getMcpServer().sandboxService.execute(input.language, input.code);
        })
    }),
    audit: t.router({
        getLogs: t.procedure.input(z.object({ limit: z.number().optional() })).query(async ({ input }) => {
            return getMcpServer().auditService.getLogs(input.limit || 50);
        }),
        query: t.procedure.input(z.object({
            level: z.string().optional(),
            agentId: z.string().optional(),
            event: z.string().optional(),
            limit: z.number().optional()
        })).query(async ({ input }) => {
            return getMcpServer().auditService.query(input);
        })
    }),
    // Merged into line 375

    roadmap: t.router({
        get: t.procedure.query(async () => {
            const fs = await import('fs/promises');
            const path = await import('path');
            try {
                // Try root first
                const rootCookie = path.join(process.cwd(), 'ROADMAP.md');
                return await fs.readFile(rootCookie, 'utf-8');
            } catch (e) {
                try {
                    // Try docs/
                    const docsCookie = path.join(process.cwd(), 'docs', 'ROADMAP.md');
                    return await fs.readFile(docsCookie, 'utf-8');
                } catch (e2) {
                    return "# Roadmap\n\nCould not load ROADMAP.md";
                }
            }
        })
    }),
    metrics: metricsServiceRouter,

    policy: t.router({
        getRules: t.procedure.query(() => {
            return getMcpServer().policyService.getRules();
        }),
        updateRules: t.procedure.input(z.object({ rules: z.array(z.any()) })).mutation(({ input }) => {
            getMcpServer().policyService.updateRules(input.rules);
            return true;
        }),
        lockdown: t.procedure.mutation(() => {
            const mcp = getMcpServer();
            // 1. Set Autonomy to Low
            mcp.permissionManager.setAutonomyLevel('low');
            // 2. Add Deny All Rule to top of policy (memory only or persist?)
            // Let's persist a lockdown rule.
            const rules = mcp.policyService.getRules();
            // Check if already locked
            if (rules[0].reason !== 'SYSTEM LOCKDOWN') {
                rules.unshift({ action: "*", resource: "*", effect: "DENY", reason: "SYSTEM LOCKDOWN" });
                mcp.policyService.updateRules(rules);
            }
            return "SYSTEM LOCKED DOWN";
        }),
        unlock: t.procedure.mutation(() => {
            const mcp = getMcpServer();
            const rules = mcp.policyService.getRules();
            if (rules[0].reason === 'SYSTEM LOCKDOWN') {
                rules.shift(); // Remove top rule
                mcp.policyService.updateRules(rules);
            }
            return "SYSTEM UNLOCKED";
        })
    }), // End policy
    vscode: t.router({
        open: t.procedure.input(z.object({
            path: z.string()
        })).mutation(async ({ input }) => {
            const server = getMcpServer();
            // @ts-ignore - shellService might be missing from interface
            if (server && server.shellService) {
                try {
                    // @ts-ignore
                    await server.shellService.execute(`code "${input.path}"`);
                    return true;
                } catch (e) {
                    try {
                        await server.executeTool('vscode_execute_command', {
                            command: 'vscode.open', args: [input.path]
                        });
                        return true;
                    } catch (e2) { return false; }
                }
            }
            return false;
        })
    }),
    search: t.router({
        query: t.procedure.input(z.object({ query: z.string() })).mutation(async ({ input }) => {
            return await getMcpServer().executeTool('search_codebase', { query: input.query });
        })
    }),
    mcp: t.router({
        list: t.procedure.query(async () => {
            return await getMcpServer().mcpAggregator.listServers();
        }),
        add: t.procedure.input(z.object({
            name: z.string(),
            command: z.string(),
            args: z.array(z.string()).optional(),
            env: z.record(z.string()).optional(),
            repoUrl: z.string().optional()
        })).mutation(async ({ input }) => {
            const server = getMcpServer();

            if (input.repoUrl) {
                // Use the tool logic to handle cloning + adding
                return await server.executeTool('mcp_add_server', {
                    name: input.name,
                    repoUrl: input.repoUrl,
                    command: input.command,
                    args: input.args,
                    env: input.env
                });
            } else {
                // Direct add (manual config)
                await server.mcpAggregator.addServerConfig(input.name, {
                    command: input.command,
                    args: input.args || [],
                    env: input.env,
                    enabled: true
                });
                return { success: true };
            }
        })
    })
});

export type AppRouter = typeof appRouter;
