import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolResult,
    type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
    ensureBackgroundCoreRunning,
    isCoreBridgeHealthy,
    waitForCoreBridge,
    type BackgroundCoreBootstrapResult,
} from './backgroundCoreBootstrap.js';
import { getBridgeHealthUrl, getBridgeToolExecuteUrl } from './bridge/bridgePort.js';
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
import { type HyperCodeMcpJsonConfig, loadHyperCodeMcpConfig, loadToolCache, type HyperCodeMcpToolMetadata } from './mcp/mcpJsonConfig.js';
=======
import { type BorgMcpJsonConfig, loadBorgMcpConfig, loadToolCache, type BorgMcpToolMetadata } from './mcp/mcpJsonConfig.js';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
import { namespaceToolName } from './mcp/namespaces.js';

const CORE_HEALTH_URL = getBridgeHealthUrl();
const CORE_TOOL_EXECUTE_URL = getBridgeToolExecuteUrl();
const DEFAULT_TOOL_CALL_READY_TIMEOUT_MS = 1_500;
const DEFAULT_TOOL_CALL_POLL_INTERVAL_MS = 250;

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
export const HYPERCODE_CORE_LOADER_STATUS_TOOL = 'hypercode_core_loader_status';
=======
export const BORG_CORE_LOADER_STATUS_TOOL = 'borg_core_loader_status';
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts

export type LoaderBootstrapState = {
    lastBootstrapStatus: BackgroundCoreBootstrapResult['status'] | 'idle';
    lastBootstrapPid: number | null;
    lastBootstrapCliEntryPath: string | null;
    lastBootstrapAt: string | null;
};

export type CachedLoaderCatalog = {
    tools: Tool[];
    source: 'config' | 'empty';
    snapshotUpdatedAt: string | null;
    enabledServerCount: number;
    cachedToolCount: number;
};

export interface LoaderRuntimeState {
    bootstrap: LoaderBootstrapState;
    cache: CachedLoaderCatalog;
}

export interface LoaderCallDeps {
    ensureBackgroundCoreRunning?: typeof ensureBackgroundCoreRunning;
    isCoreBridgeHealthy?: typeof isCoreBridgeHealthy;
    waitForCoreBridge?: typeof waitForCoreBridge;
    proxyToolCall?: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
    now?: () => string;
}

type LoaderToolInputSchema = {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
    [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function maxIsoTimestamp(current: string | null, candidate: string | undefined): string | null {
    if (!candidate) {
        return current;
    }

    if (!current) {
        return candidate;
    }

    return candidate > current ? candidate : current;
}

function normalizeInputSchema(inputSchema: unknown): LoaderToolInputSchema {
    if (isRecord(inputSchema) && inputSchema.type === 'object') {
        const properties = isRecord(inputSchema.properties)
            ? Object.fromEntries(
                Object.entries(inputSchema.properties).filter(([, value]) => isRecord(value)),
            ) as Record<string, object>
            : {};

        const required = Array.isArray(inputSchema.required)
            ? inputSchema.required.filter((value): value is string => typeof value === 'string')
            : undefined;

        return {
            type: 'object',
            properties,
            ...(required && required.length > 0 ? { required } : {}),
        };
    }

    return { type: 'object', properties: {} };
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
function toToolDefinition(serverName: string, tool: HyperCodeMcpToolMetadata): Tool {
=======
function toToolDefinition(serverName: string, tool: BorgMcpToolMetadata): Tool {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
    return {
        name: namespaceToolName(serverName, tool.name),
        description: tool.description ?? `Cached tool discovered for downstream server '${serverName}'.`,
        inputSchema: normalizeInputSchema(tool.inputSchema),
    } as Tool;
}

export function buildLoaderStatusToolDefinition(): Tool {
    return {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
        name: HYPERCODE_CORE_LOADER_STATUS_TOOL,
        description: 'Report whether the lightweight stdio loader is serving cached tools or proxying to a live HyperCode Core control plane.',
=======
        name: BORG_CORE_LOADER_STATUS_TOOL,
        description: 'Report whether the lightweight stdio loader is serving cached tools or proxying to a live borg Core control plane.',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
        inputSchema: { type: 'object', properties: {} },
    } as Tool;
}

export function createEmptyLoaderRuntimeState(): LoaderRuntimeState {
    return {
        bootstrap: {
            lastBootstrapStatus: 'idle',
            lastBootstrapPid: null,
            lastBootstrapCliEntryPath: null,
            lastBootstrapAt: null,
        },
        cache: {
            tools: [buildLoaderStatusToolDefinition()],
            source: 'empty',
            snapshotUpdatedAt: null,
            enabledServerCount: 0,
            cachedToolCount: 0,
        },
    };
}

<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
export function buildCachedLoaderCatalog(config: HyperCodeMcpJsonConfig): CachedLoaderCatalog {
=======
export function buildCachedLoaderCatalog(config: BorgMcpJsonConfig): CachedLoaderCatalog {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
    const toolMap = new Map<string, Tool>();
    let snapshotUpdatedAt: string | null = null;
    let enabledServerCount = 0;

    for (const [serverName, serverEntry] of Object.entries(config.mcpServers ?? {})) {
        if (serverEntry?.disabled) {
            continue;
        }

        enabledServerCount += 1;
        snapshotUpdatedAt = maxIsoTimestamp(snapshotUpdatedAt, serverEntry?._meta?.cacheHydratedAt);
        snapshotUpdatedAt = maxIsoTimestamp(snapshotUpdatedAt, serverEntry?._meta?.discoveredAt);

        const cachedTools = Array.isArray(serverEntry?._meta?.tools)
            ? serverEntry._meta.tools
            : [];

        for (const rawTool of cachedTools) {
            if (!rawTool || typeof rawTool.name !== 'string' || rawTool.name.trim().length === 0) {
                continue;
            }

            const definition = toToolDefinition(serverName, rawTool);
            toolMap.set(definition.name, definition);
        }
    }

    const allTools = [
        buildLoaderStatusToolDefinition(),
        ...Array.from(toolMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
    ];

    // Safety limit for LLMs (e.g. Gemini has a 512 function declaration limit)
    // We use 450 to leave room for native tools and CLI-specific tools.
    const MAX_TOOLS = 450;
    const tools = allTools.slice(0, MAX_TOOLS);

    return {
        tools,
        source: toolMap.size > 0 || enabledServerCount > 0 ? 'config' : 'empty',
        snapshotUpdatedAt,
        enabledServerCount,
        cachedToolCount: toolMap.size,
    };
}

export async function loadCachedLoaderCatalog(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
    loadConfigImpl: typeof loadHyperCodeMcpConfig = loadHyperCodeMcpConfig,
=======
    loadConfigImpl: typeof loadBorgMcpConfig = loadBorgMcpConfig,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
): Promise<CachedLoaderCatalog> {
    const cache = await loadToolCache();
    if (cache) {
        return buildCachedLoaderCatalog(cache);
    }
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
    const config = await loadConfigImpl().catch(() => ({ mcpServers: {} } satisfies HyperCodeMcpJsonConfig));
=======
    const config = await loadConfigImpl().catch(() => ({ mcpServers: {} } satisfies BorgMcpJsonConfig));
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
    return buildCachedLoaderCatalog(config);
}

function asTextResult(text: string, isError = false): CallToolResult {
    return {
        isError,
        content: [{ type: 'text', text }],
    } satisfies CallToolResult;
}

function normalizeToolResult(payload: unknown): CallToolResult {
    if (isRecord(payload) && Array.isArray(payload.content)) {
        return payload as CallToolResult;
    }

    if (typeof payload === 'string') {
        return asTextResult(payload);
    }

    return asTextResult(JSON.stringify(payload ?? null, null, 2));
}

async function proxyToolCallToCore(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    const response = await fetch(CORE_TOOL_EXECUTE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, args }),
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        return asTextResult(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
            `HyperCode Core returned HTTP ${response.status} while executing '${name}'.${body ? `\n${body}` : ''}`,
=======
            `borg Core returned HTTP ${response.status} while executing '${name}'.${body ? `\n${body}` : ''}`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
            true,
        );
    }

    const payload = await response.json().catch(() => null);
    const result = isRecord(payload) && 'result' in payload
        ? (payload as { result?: { data?: unknown } | unknown }).result
        : payload;
    const data = isRecord(result) && 'data' in result
        ? (result as { data?: unknown }).data
        : result;

    return normalizeToolResult(data);
}

function buildLoaderStatusResult(state: LoaderRuntimeState, coreHealthy: boolean): CallToolResult {
    return asTextResult(JSON.stringify({
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
        loader: 'hypercode-core-stdio-loader',
=======
        loader: 'borg-core-stdio-loader',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
        coreHealthy,
        bootstrap: state.bootstrap,
        cache: {
            source: state.cache.source,
            snapshotUpdatedAt: state.cache.snapshotUpdatedAt,
            enabledServerCount: state.cache.enabledServerCount,
            cachedToolCount: state.cache.cachedToolCount,
        },
    }, null, 2));
}

let bootstrapPromise: Promise<BackgroundCoreBootstrapResult> | null = null;

async function ensureLoaderBootstrap(
    state: LoaderRuntimeState,
    deps: Pick<LoaderCallDeps, 'ensureBackgroundCoreRunning' | 'now'> = {},
): Promise<BackgroundCoreBootstrapResult> {
    const ensureCoreRunningImpl = deps.ensureBackgroundCoreRunning ?? ensureBackgroundCoreRunning;
    const now = deps.now ?? (() => new Date().toISOString());

    if (!bootstrapPromise) {
        bootstrapPromise = ensureCoreRunningImpl({
            waitForReady: false,
            log: (message, ...optionalParams) => console.error(message, ...optionalParams),
        }).finally(() => {
            bootstrapPromise = null;
        });
    }

    const result = await bootstrapPromise;
    state.bootstrap = {
        lastBootstrapStatus: result.status,
        lastBootstrapPid: result.pid ?? null,
        lastBootstrapCliEntryPath: result.cliEntryPath ?? null,
        lastBootstrapAt: now(),
    };

    return result;
}

export async function callLoaderTool(
    name: string,
    args: Record<string, unknown>,
    state: LoaderRuntimeState,
    deps: LoaderCallDeps = {},
): Promise<CallToolResult> {
    const isCoreHealthyImpl = deps.isCoreBridgeHealthy ?? isCoreBridgeHealthy;
    const waitForCoreImpl = deps.waitForCoreBridge ?? waitForCoreBridge;
    const proxyToolCallImpl = deps.proxyToolCall ?? proxyToolCallToCore;

    const coreHealthy = await isCoreHealthyImpl(CORE_HEALTH_URL);
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
    if (name === HYPERCODE_CORE_LOADER_STATUS_TOOL) {
=======
    if (name === BORG_CORE_LOADER_STATUS_TOOL) {
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
        return buildLoaderStatusResult(state, coreHealthy);
    }

    if (coreHealthy) {
        return await proxyToolCallImpl(name, args);
    }

    const bootstrap = await ensureLoaderBootstrap(state, deps);
    const readyAfterBootstrap = await waitForCoreImpl({
        healthUrl: CORE_HEALTH_URL,
        timeoutMs: DEFAULT_TOOL_CALL_READY_TIMEOUT_MS,
        pollIntervalMs: DEFAULT_TOOL_CALL_POLL_INTERVAL_MS,
    });

    if (!readyAfterBootstrap) {
        return asTextResult(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
            `HyperCode Core is still warming in the background, so '${name}' is not ready yet. Cached tools are available immediately, and the control plane has been ${bootstrap.status === 'already-running' ? 'detected' : 'requested'}${bootstrap.pid ? ` (PID ${bootstrap.pid})` : ''}. Retry this tool call in a moment.`,
=======
            `borg Core is still warming in the background, so '${name}' is not ready yet. Cached tools are available immediately, and the control plane has been ${bootstrap.status === 'already-running' ? 'detected' : 'requested'}${bootstrap.pid ? ` (PID ${bootstrap.pid})` : ''}. Retry this tool call in a moment.`,
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
            true,
        );
    }

    return await proxyToolCallImpl(name, args);
}

export async function startStdioLoader(): Promise<void> {
    const server = new Server(
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
        { name: 'hypercode-core-loader', version: '0.99.1' },
=======
        { name: 'borg-core-loader', version: '0.99.1' },
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
        {
            capabilities: {
                tools: {},
            },
        },
    );

    const runtimeState = createEmptyLoaderRuntimeState();

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        runtimeState.cache = await loadCachedLoaderCatalog();
        void ensureLoaderBootstrap(runtimeState).catch((error) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
            console.error('[HyperCode Core] Background control-plane bootstrap failed:', error);
=======
            console.error('[borg Core] Background control-plane bootstrap failed:', error);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
        });

        return {
            tools: runtimeState.cache.tools,
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        runtimeState.cache = await loadCachedLoaderCatalog();
        return await callLoaderTool(
            request.params.name,
            (request.params.arguments ?? {}) as Record<string, unknown>,
            runtimeState,
        );
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    void ensureLoaderBootstrap(runtimeState).catch((error) => {
<<<<<<< HEAD:archive/ts-legacy/packages/core/src/stdioLoader.ts
        console.error('[HyperCode Core] Background control-plane bootstrap failed:', error);
=======
        console.error('[borg Core] Background control-plane bootstrap failed:', error);
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/core/src/stdioLoader.ts
    });
}
