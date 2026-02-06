import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { t, publicProcedure, adminProcedure } from './lib/trpc-core.js';
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
import { researchRouter } from './routers/researchRouter.js';
import { pulseRouter } from './routers/pulseRouter.js';

// Re-export core definitions for other files that might rely on them
export { t, publicProcedure, adminProcedure };

import { knowledgeRouter } from './routers/knowledgeRouter.js';

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
    health: publicProcedure.query(() => {
        return { status: 'running', service: '@borg/core' };
    }),
    getTaskStatus: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(({ input }) => {
            return {
                taskId: input.taskId || 'current',
                status: 'processing',
                progress: 45
            };
        }),
    indexingStatus: t.procedure.query(() => {
        return { status: 'idle', filesIndexed: 0, totalFiles: 0 };
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
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                global.mcpServerInstance.permissionManager.setAutonomyLevel(input.level);
                return input.level;
            }
            throw new Error("MCPServer instance not found global");
        }),
        getLevel: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.permissionManager.autonomyLevel;
            }
            return 'low';
        }),
        activateFullAutonomy: t.procedure.mutation(async () => {
            // @ts-ignore
            const mcp = global.mcpServerInstance;
            if (mcp) {
                // 1. Set Autonomy High
                mcp.permissionManager.setAutonomyLevel('high');

                // 2. Start Director Chat Daemon
                mcp.director.startChatDaemon();

                // 3. Start Watchdog (Long)
                mcp.director.startWatchdog(100);

                return "Autonomous Supervisor Activated (High Level + Chat Daemon + Watchdog)";
            }
            throw new Error("MCPServer instance not found");
        })
    }),
    director: t.router({
        memorize: t.procedure.input(z.object({ content: z.string(), source: z.string(), title: z.string().optional() })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.memoryManager) {
                // @ts-ignore
                await global.mcpServerInstance.memoryManager.saveContext(input.content, {
                    source: input.source,
                    title: input.title || 'Untitled Web Page',
                    type: 'web_page'
                });
                return "Memorized.";
            }
            return "Memory Manager not ready.";
        }),
        chat: t.procedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                // @ts-ignore
                const server = global.mcpServerInstance;

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
                        server.director.broadcast(`✅ Approved: **${latest.title}**. Executing ${suggestion.payload.tool}...`);
                        const result = await server.executeTool(suggestion.payload.tool, suggestion.payload.args);
                        return `✅ Execution Complete.\n\nResult:\n${JSON.stringify(result)?.substring(0, 200)}...`;
                    }

                    return `✅ Approved suggestion: **${latest.title}**. (No tool attached)`;
                }

                // 3. Default: Director Execution
                const result = await server.director.executeTask(input.message);
                return result;
            }
            throw new Error("MCPServer instance not found");
        }),
        status: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.director) {
                // @ts-ignore
                return global.mcpServerInstance.director.getStatus();
            }
            return { active: false, status: 'OFFLINE' };
        }),
        updateConfig: t.procedure.input(z.object({
            defaultTopic: z.string().optional()
        })).mutation(({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.director) {
                // @ts-ignore
                global.mcpServerInstance.director.updateConfig(input);
                return { success: true };
            }
            throw new Error("Director not found");
        }),
        stopAutoDrive: adminProcedure.mutation(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                global.mcpServerInstance.director.stopAutoDrive();
                return "Stopped";
            }
            throw new Error("MCPServer instance not found");
        }),
        startAutoDrive: adminProcedure.mutation(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                // Running valid tool so it logs properly
                // But we can call direct: mcp.director.startAutoDrive()
                // Let's use executeTool to keep consistency
                global.mcpServerInstance.executeTool('start_auto_drive', {});
                return "Started";
            }
            throw new Error("MCPServer instance not found");
        })
    }),
    directorConfig: t.router({
        get: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.director) {
                // @ts-ignore
                return global.mcpServerInstance.director.getConfig();
            }
            // Default config
            return {
                defaultTopic: "Implement Roadmap Features",
                taskCooldownMs: 10000,
                heartbeatIntervalMs: 30000,
                periodicSummaryMs: 120000,
                pasteToSubmitDelayMs: 1000,
                acceptDetectionMode: 'polling' as const,
                pollingIntervalMs: 30000
            };
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
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.director) {
                // @ts-ignore
                global.mcpServerInstance.director.updateConfig(input);
                return { success: true };
            }
            throw new Error("Director not found");
        })
    }),

    // NEW: Imported Modular Routers
    suggestions: suggestionsRouter,
    council: councilRouter,
    squad: squadRouter,

    runCommand: adminProcedure.input(z.object({ command: z.string() })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance) {
            // @ts-ignore
            const result = await global.mcpServerInstance.executeTool('execute_command', { command: input.command, cwd: process.cwd() });
            // @ts-ignore
            if (result.isError) throw new Error(result.content[0].text);
            // @ts-ignore
            return result.content[0].text;
        }
        throw new Error("MCPServer instance not found");
    }),
    skills: t.router({
        list: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
                // @ts-ignore
                const skills = await mcp.skillRegistry.listSkills();
                return skills;
            }
            return { tools: [] };
        }),
        listLibrary: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
                const library = await mcp.skillRegistry.getLibraryIndex();

                // Decorate with 'isAssimilated'
                const decorate = (items: any[]) => items.map(item => ({
                    ...item,
                    isAssimilated: mcp.skillRegistry.hasSkill(item.id)
                }));

                return {
                    mcp_servers: decorate(library.categories.mcp_servers || []),
                    universal_harness: decorate(library.categories.universal_harness || []),
                    skills: decorate(library.categories.skills || [])
                };
            }
            return { mcp_servers: [], universal_harness: [], skills: [] };
        }),
        assimilate: t.procedure.input(z.object({
            id: z.string(),
            name: z.string(),
            url: z.string(),
            summary: z.string(),
            relevance: z.string()
        })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
                const result = await mcp.skillAssimilationService.assimilate(input);

                // Update the Master Index status (we do this manually here for now)
                try {
                    const indexPath = path.join(process.cwd(), 'BORG_MASTER_INDEX.jsonc');
                    const content = await fs.readFile(indexPath, 'utf-8');
                    // Find the entry with this ID and update status
                    const updatedContent = content.replace(
                        new RegExp(`"id":\\s*"${input.id}"[\\s\\S]*?"status":\\s*"(.*?)"`, 'g'),
                        (match: string) => match.replace(/"status":\s*".*?"/, `"status": "assimilated"`)
                    );
                    await fs.writeFile(indexPath, updatedContent, 'utf-8');
                } catch (e) {
                    console.error("Failed to update Master Index status in tRPC:", e);
                }

                return { success: true, result };
            }
            throw new Error("MCPServer instance not found");
        }),
        read: t.procedure.input(z.object({ name: z.string() })).query(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return await global.mcpServerInstance.skillRegistry.readSkill(input.name);
            }
            return { content: [{ type: "text", text: "Error: No Server" }] };
        }),
        create: t.procedure.input(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string()
        })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return await global.mcpServerInstance.skillRegistry.createSkill(input.id, input.name, input.description);
            }
            throw new Error("No Server");
        }),
        save: t.procedure.input(z.object({
            id: z.string(),
            content: z.string()
        })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return await global.mcpServerInstance.skillRegistry.saveSkill(input.id, input.content);
            }
            throw new Error("No Server");
        })
    }),
    executeTool: adminProcedure.input(z.object({
        name: z.string(),
        args: z.any()
    })).mutation(async ({ input }) => {
        // @ts-ignore
        if (global.mcpServerInstance) {
            // @ts-ignore
            const result = await global.mcpServerInstance.executeTool(input.name, input.args);
            // Result is { content: ... }
            // @ts-ignore
            if (result.isError) throw new Error(result.content[0].text);
            // @ts-ignore
            return result.content[0].text;
        }
        throw new Error("MCPServer not found");
    }),
    repoGraph: graphRouter,
    autoTest: t.router({
        getResults: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.autoTestService) {
                // @ts-ignore
                const results = global.mcpServerInstance.autoTestService.testResults;
                return Object.fromEntries(results);
            }
            return {};
        }),
        getStatus: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.autoTestService) {
                // @ts-ignore
                return { isRunning: global.mcpServerInstance.autoTestService.isRunning };
            }
            return { isRunning: false };
        }),
        start: t.procedure.mutation(() => {
            // @ts-ignore
            if (global.mcpServerInstance) global.mcpServerInstance.autoTestService.start();
            return true;
        }),
        stop: t.procedure.mutation(() => {
            // @ts-ignore
            if (global.mcpServerInstance) global.mcpServerInstance.autoTestService.stop();
            return true;
        }),
        clear: t.procedure.mutation(() => {
            // @ts-ignore
            if (global.mcpServerInstance) global.mcpServerInstance.autoTestService.testResults.clear();
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
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.gitService.getLog(input.limit);
            }
            return [];
        }),
        getStatus: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.gitService.getStatus();
            }
            return { branch: 'unknown', clean: false, modified: [], staged: [] };
        }),
        revert: t.procedure.input(z.object({ hash: z.string() })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.gitService.revert(input.hash);
            }
            throw new Error("No Server");
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

            // Mock Usage (In real app, read from SQL/Graph)
            const usage = {
                currentMonth: 42.50,
                limit: 100.00,
                breakdown: [
                    { provider: 'OpenAI', cost: 12.50, requests: 1540 },
                    { provider: 'Anthropic', cost: 25.00, requests: 890 },
                    { provider: 'Gemini', cost: 5.00, requests: 3020 } // Cheap!
                ]
            };

            return { keys, usage };
        })
    }),
    system: t.router({
        stats: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const result = await global.mcpServerInstance.executeTool('system_status', {});
                if (result.isError) return { error: result.content[0].text, platform: 'Error' };

                return JSON.parse(result.content[0].text);
            }
            return { error: "No Server", platform: 'Unknown' };
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
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.sandboxService) {
                // @ts-ignore
                return global.mcpServerInstance.sandboxService.execute(input.language, input.code);
            }
            throw new Error("SandboxService not found");
        })
    }),
    audit: t.router({
        getLogs: t.procedure.input(z.object({ limit: z.number().optional() })).query(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.auditService.getLogs(input.limit || 50);
            }
            return [];
        }),
        query: t.procedure.input(z.object({
            level: z.string().optional(),
            agentId: z.string().optional(),
            event: z.string().optional(),
            limit: z.number().optional()
        })).query(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.auditService.query(input);
            }
            return [];
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
    metrics: t.router({
        getStats: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.metricsService.getStats();
            }
            return { counts: {}, averages: {}, totalEvents: 0, series: [] };
        })
    }),
    healer: t.router({
        getHistory: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance && global.mcpServerInstance.healerService) {
                // @ts-ignore
                return global.mcpServerInstance.healerService.getHistory();
            }
            return [];
        })
    }),
    policy: t.router({
        getRules: t.procedure.query(() => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return global.mcpServerInstance.policyService.getRules();
            }
            return [];
        }),
        updateRules: t.procedure.input(z.object({ rules: z.array(z.any()) })).mutation(({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                global.mcpServerInstance.policyService.updateRules(input.rules);
                return true;
            }
            throw new Error("No Server");
        }),
        lockdown: t.procedure.mutation(() => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
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
            }
            throw new Error("No Server");
        }),
        unlock: t.procedure.mutation(() => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const mcp = global.mcpServerInstance;
                const rules = mcp.policyService.getRules();
                if (rules[0].reason === 'SYSTEM LOCKDOWN') {
                    rules.shift(); // Remove top rule
                    mcp.policyService.updateRules(rules);
                }
                return "SYSTEM UNLOCKED";
            }
            throw new Error("No Server");
        })
    }), // End policy
    vscode: t.router({
        open: t.procedure.input(z.object({
            path: z.string()
        })).mutation(async ({ input }) => {
            const server = (global as any).mcpServerInstance;
            if (server && server.shellService) {
                try {
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
            const server = (global as any).mcpServerInstance;
            if (server) {
                return await server.executeTool('search_codebase', { query: input.query });
            }
            return { content: [] };
        })
    }),
    mcp: t.router({
        list: t.procedure.query(async () => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                return await global.mcpServerInstance.mcpAggregator.listServers();
            }
            return [];
        }),
        add: t.procedure.input(z.object({
            name: z.string(),
            command: z.string(),
            args: z.array(z.string()).optional(),
            env: z.record(z.string()).optional(),
            repoUrl: z.string().optional()
        })).mutation(async ({ input }) => {
            // @ts-ignore
            if (global.mcpServerInstance) {
                // @ts-ignore
                const server = global.mcpServerInstance;

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
                    // @ts-ignore
                    await server.mcpAggregator.addServerConfig(input.name, {
                        command: input.command,
                        args: input.args,
                        env: input.env,
                        enabled: true
                    });
                    return { success: true };
                }
            }
            throw new Error("MCPServer not found");
        })
    })
});

export type AppRouter = typeof appRouter;
