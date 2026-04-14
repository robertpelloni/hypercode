"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Alert, AlertDescription, AlertTitle } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';
import { buildBulkImportServers } from '@/lib/mcp-import';
import { toast } from 'sonner';
import { buildDashboardServerRecords, buildServerToolActionLinks, getBulkMetadataTargetUuids, getManagedServerDiscoverySummary, hasStaleReadyMetadata, isLocalCompatMetadataSource } from './mcp-dashboard-utils';
import { EditMcpServer } from '@/components/mcp/EditMcpServer';
import {
    Activity,
    AlertTriangle,
    Database,
    Eye,
    ExternalLink,
    HeartPulse,
    Layers,
    Loader2,
    Network,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    Search,
    Server,
    Shield,
    Trash2,
    Upload,
    Wrench,
    Zap,
} from 'lucide-react';
import { PageStatusBanner } from '@/components/PageStatusBanner';

type AggregatedServer = {
    uuid?: string;
    name: string;
    status: string;
    toolCount: number;
    runtimeState?: string;
    warmupState?: string;
    runtimeConnected?: boolean;
    advertisedToolCount?: number;
    advertisedSource?: string;
    lastConnectedAt?: string | null;
    lastError?: string | null;
    metadataStatus?: string;
    metadataSource?: string;
    metadataToolCount?: number;
    lastSuccessfulBinaryLoadAt?: string;
    config?: {
        command?: string;
        args?: string[];
        env?: string[];
    };
    source_published_server_uuid?: string | null;
};

type ManagedServerMetadata = {
    uuid: string;
    name: string;
    type?: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
    description?: string | null;
    command?: string | null;
    args?: string[];
    env?: Record<string, string>;
    url?: string | null;
    bearerToken?: string | null;
    headers?: Record<string, string>;
    always_on?: boolean;
    source_published_server_uuid?: string | null;
    _meta?: {
        status?: string;
        metadataSource?: string;
        toolCount?: number;
        lastSuccessfulBinaryLoadAt?: string;
    } | null;
};

type BulkDiscoveryOperationState = {
    mode: 'all' | 'unresolved';
    completedCount: number;
    totalCount: number;
};

type AggregatedTool = {
    name: string;
    description: string;
    server: string;
};

type StatusSummary = {
    initialized: boolean;
    aggregatorStatus?: {
        initialized: boolean;
        isLKG: boolean;
        lastError?: string;
    } | null;
    serverCount: number;
    toolCount: number;
    connectedCount: number;
    pool?: {
        idle?: number;
        active?: number;
        activeSessionCount?: number;
        currentActiveServerUuid?: string | null;
        currentActiveServerName?: string | null;
        lastActiveServerSwitchAt?: number | null;
    };
    lifecycle?: {
        lazySessionMode?: boolean;
        singleActiveServerMode?: boolean;
        events?: Array<{
            id: number;
            timestamp: number;
            type: string;
            message: string;
            reasonCode?: string;
            sessionId?: string;
            serverUuid?: string;
            serverName?: string;
        }>;
    };
};

type QuickLinkCardProps = {
    title: string;
    description: string;
    href: string;
    accentClass: string;
    icon: ComponentType<{ className?: string }>;
};

type ServerConfigInput = {
    name: string;
    type: 'STDIO' | 'SSE' | 'STREAMABLE_HTTP';
    command: string;
    args: string;
    url: string;
    bearerToken: string;
    headers: string;
    env: string;
};

type BulkImportMutationResult =
        | unknown[]
        | {
                imported?: number;
            };

type BulkImportClassification = {
    newNames: string[];
    updatingNames: string[];
};

type ManagedServerHealth = {
    status?: string;
    crashCount?: number;
    maxAttempts?: number;
};

const LIFECYCLE_FILTER_PARAM_KEYS = {
    type: 'lt',
    reason: 'lr',
    window: 'lw',
    scope: 'ls',
    server: 'lsv',
} as const;

const LIFECYCLE_FILTER_DEFAULTS = {
    type: 'all',
    reason: 'all',
    window: '15m',
    scope: 'all',
    server: 'all',
} as const;

function parseLifecycleWindowFilter(value: string | null): '5m' | '15m' | '1h' | 'all' {
    if (value === '5m' || value === '15m' || value === '1h' || value === 'all') {
        return value;
    }

    return LIFECYCLE_FILTER_DEFAULTS.window;
}

function parseLifecycleScopeFilter(value: string | null): 'all' | 'active-server' {
    if (value === 'active-server' || value === 'all') {
        return value;
    }

    return LIFECYCLE_FILTER_DEFAULTS.scope;
}

function parseLifecycleServerFilter(value: string | null): string {
    if (!value || value === 'all') {
        return LIFECYCLE_FILTER_DEFAULTS.server;
    }

    return value;
}

function applyLifecycleFiltersToUrl(
    url: URL,
    filters: {
        type: string;
        reason: string;
        window: '5m' | '15m' | '1h' | 'all';
        scope: 'all' | 'active-server';
        server: string;
    },
) {
    const nextParams = [
        { key: LIFECYCLE_FILTER_PARAM_KEYS.type, value: filters.type, fallback: LIFECYCLE_FILTER_DEFAULTS.type },
        { key: LIFECYCLE_FILTER_PARAM_KEYS.reason, value: filters.reason, fallback: LIFECYCLE_FILTER_DEFAULTS.reason },
        { key: LIFECYCLE_FILTER_PARAM_KEYS.window, value: filters.window, fallback: LIFECYCLE_FILTER_DEFAULTS.window },
        { key: LIFECYCLE_FILTER_PARAM_KEYS.scope, value: filters.scope, fallback: LIFECYCLE_FILTER_DEFAULTS.scope },
        { key: LIFECYCLE_FILTER_PARAM_KEYS.server, value: filters.server, fallback: LIFECYCLE_FILTER_DEFAULTS.server },
    ] as const;

    nextParams.forEach(({ key, value, fallback }) => {
        if (!value || value === fallback) {
            url.searchParams.delete(key);
            return;
        }

        url.searchParams.set(key, value);
    });
}

function maskValue(value?: string | null): string {
    if (!value) {
        return 'none';
    }

    if (value.length <= 8) {
        return '•'.repeat(value.length);
    }

    return `${value.slice(0, 4)}${'•'.repeat(Math.min(Math.max(value.length - 8, 4), 12))}${value.slice(-4)}`;
}

function QuickLinkCard(props: QuickLinkCardProps): React.JSX.Element {
    const Icon = props.icon;

    return (
        <Link href={props.href} className="group">
            <Card className="h-full border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${props.accentClass}`} />
                        <div className="text-sm font-semibold text-white">{props.title}</div>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-500">{props.description}</p>
                    <div className="inline-flex items-center gap-1 text-xs text-zinc-400 group-hover:text-white">
                        Open
                        <ExternalLink className="h-3.5 w-3.5" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
    const normalized = status.toLowerCase();
    let tone = 'border-zinc-700 bg-zinc-800 text-zinc-400';

    if (normalized === 'connected' || normalized === 'active' || normalized === 'ready' || normalized === 'configured') {
        tone = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    } else if (normalized.includes('pending') || normalized.includes('cold') || normalized.includes('starting')) {
        tone = 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    } else if (normalized.includes('error') || normalized.includes('failed') || normalized.includes('dead')) {
        tone = 'border-red-500/20 bg-red-500/10 text-red-300';
    }

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>
            {status}
        </span>
    );
}

function ServerInspectionPanel(
    {
        server,
        runtime,
        health,
        lastReloadDecision,
        onClose,
    }: {
        server?: ManagedServerMetadata;
        runtime?: AggregatedServer;
        health?: ManagedServerHealth;
        /** Last reload decision returned from the core reloadMetadata endpoint for this server. */
        lastReloadDecision?: string;
        onClose: () => void;
    },
): React.JSX.Element {
    return (
        <Card className="border-zinc-700 border-l-4 border-l-cyan-500 bg-zinc-900">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle className="text-base text-white">Inspect downstream MCP server</CardTitle>
                    <p className="mt-1 text-sm text-zinc-500">
                        Review the effective transport config, cached-vs-runtime posture, and current health counters without leaving the control plane.
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    title="Close server inspection panel"
                    aria-label="Close server inspection panel"
                    className="text-zinc-500 hover:text-white"
                >
                    Close
                </Button>
            </CardHeader>
            <CardContent>
                {!server ? (
                    <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
                        Loading server details…
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-lg font-semibold text-white">{server.name}</div>
                                <div className="mt-1 text-sm text-zinc-400">
                                    Transport <span className="font-medium text-white">{server.type ?? 'STDIO'}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <StatusBadge status={server._meta?.status ?? 'pending'} />
                                {runtime ? <StatusBadge status={runtime.runtimeState ?? runtime.status} /> : null}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Runtime</div>
                                <div className="mt-2 space-y-1 text-zinc-300">
                                    <div>Runtime state: <span className="font-semibold text-white">{runtime?.runtimeState ?? runtime?.status ?? 'unknown'}</span></div>
                                    <div>Warmup: <span className="font-semibold text-white">{runtime?.warmupState ?? 'idle'}</span></div>
                                    <div>Advertised source: <span className="font-semibold text-white">{runtime?.advertisedSource ?? 'unknown'}</span></div>
                                    <div>Advertised tools: <span className="font-semibold text-white">{String(runtime?.advertisedToolCount ?? runtime?.metadataToolCount ?? 0)}</span></div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Connection</div>
                                <div className="mt-2 space-y-1 text-zinc-300">
                                    <div>Command: <span className="font-mono text-xs text-white">{server.command ?? 'n/a'}</span></div>
                                    <div>URL: <span className="break-all font-mono text-xs text-white">{server.url ?? 'n/a'}</span></div>
                                    <div>Last runtime connect: <span className="font-semibold text-white">{runtime?.lastConnectedAt ?? 'never'}</span></div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Metadata</div>
                                <div className="mt-2 space-y-1 text-zinc-300">
                                    <div>Status: <span className="font-semibold text-white">{String(server._meta?.status ?? 'pending')}</span></div>
                                    <div>Source: <span className="font-semibold text-white">{String(server._meta?.metadataSource ?? 'none')}</span></div>
                                    <div>Cached tools: <span className="font-semibold text-white">{String(server._meta?.toolCount ?? 0)}</span></div>
                                    <div>Last binary load: <span className="font-semibold text-white">{String(server._meta?.lastSuccessfulBinaryLoadAt ?? 'never')}</span></div>
                                    {lastReloadDecision ? (
                                        <div>Last reload decision: <span className="font-semibold text-white">{lastReloadDecision}</span></div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Health</div>
                                <div className="mt-2 space-y-1 text-zinc-300">
                                    <div>Status: <span className="font-semibold text-white">{health?.status ?? 'unknown'}</span></div>
                                    <div>Crash count: <span className="font-semibold text-white">{health?.crashCount ?? 0}</span></div>
                                    <div>Max attempts: <span className="font-semibold text-white">{health?.maxAttempts ?? 0}</span></div>
                                </div>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Description</div>
                                <div className="mt-2 text-zinc-300">{server.description ?? 'No description provided.'}</div>
                                {runtime?.lastError ? (
                                    <div className="mt-3 rounded border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                                        <div className="font-semibold text-white">Latest runtime error</div>
                                        <div className="mt-1 break-words">{runtime.lastError}</div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Args</div>
                                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">
                                    {JSON.stringify(server.args ?? [], null, 2)}
                                </pre>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Environment</div>
                                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">
                                    {JSON.stringify(server.env ?? {}, null, 2)}
                                </pre>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Headers</div>
                                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-zinc-300">
                                    {JSON.stringify(server.headers ?? {}, null, 2)}
                                </pre>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Sensitive fields</div>
                                <div className="mt-2 space-y-1 text-sm text-zinc-300">
                                    <div>Bearer token: <span className="font-mono text-xs text-white">{maskValue(server.bearerToken)}</span></div>
                                    <div>Description: <span className="text-white">{server.description ?? 'none'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AddServerForm({ onDone }: { onDone: () => void }): React.JSX.Element {
    const mcpServersClient = trpc.mcpServers as any;
    const [formData, setFormData] = useState<ServerConfigInput>({
        name: '',
        type: 'STDIO',
        command: 'npx',
        args: '',
        url: '',
        bearerToken: '',
        headers: '',
        env: '',
    });

    const createMutation = mcpServersClient.create.useMutation({
        onSuccess: () => {
            toast.success('Server added successfully');
            onDone();
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        let parsedEnv: Record<string, string> = {};
        if (formData.env.trim()) {
            try {
                parsedEnv = JSON.parse(formData.env) as Record<string, string>;
            } catch {
                toast.error('Environment variables must be valid JSON');
                return;
            }
        }

        let parsedHeaders: Record<string, string> = {};
        if (formData.headers.trim()) {
            try {
                parsedHeaders = JSON.parse(formData.headers) as Record<string, string>;
            } catch {
                toast.error('Headers must be valid JSON');
                return;
            }
        }

        createMutation.mutate({
            name: formData.name,
            type: formData.type,
            command: formData.type === 'STDIO' ? formData.command : undefined,
            args: formData.type === 'STDIO' ? formData.args.split(' ').filter(Boolean) : undefined,
            url: formData.type === 'STDIO' ? undefined : formData.url.trim(),
            bearerToken: formData.type === 'STDIO' ? undefined : (formData.bearerToken.trim() || undefined),
            headers: formData.type === 'STDIO' ? undefined : parsedHeaders,
            env: parsedEnv,
            metadataStrategy: 'auto',
        });
    }

    return (
        <Card className="bg-zinc-900 border-zinc-700 border-l-4 border-l-blue-600">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-white text-base">Add downstream MCP server</CardTitle>
                    <p className="text-sm text-zinc-500 mt-1">Register another MCP endpoint under HyperCode’s aggregated router.</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDone}
                    title="Close add-server form"
                    aria-label="Close add-server form"
                    className="text-zinc-500 hover:text-white"
                >
                    Close
                </Button>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Server name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                            title="Unique display name used for this downstream MCP server"
                            aria-label="MCP server name"
                            className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="github"
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Connection type</label>
                        <select
                            value={formData.type}
                            onChange={(event) => setFormData((current) => ({ ...current, type: event.target.value as ServerConfigInput['type'] }))}
                            title="Transport used to connect to the downstream MCP server"
                            aria-label="MCP server connection type"
                            className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="STDIO">STDIO</option>
                            <option value="SSE">SSE</option>
                            <option value="STREAMABLE_HTTP">STREAMABLE_HTTP</option>
                        </select>
                    </div>

                    {formData.type === 'STDIO' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Command</label>
                                <input
                                    required
                                    value={formData.command}
                                    onChange={(event) => setFormData((current) => ({ ...current, command: event.target.value }))}
                                    title="Executable command used to launch the downstream MCP server"
                                    aria-label="MCP server command"
                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Args</label>
                                <input
                                    value={formData.args}
                                    onChange={(event) => setFormData((current) => ({ ...current, args: event.target.value }))}
                                    title="Command arguments for the server process, separated by spaces"
                                    aria-label="MCP server command arguments"
                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="-y @modelcontextprotocol/server-memory"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">URL</label>
                                <input
                                    required
                                    value={formData.url}
                                    onChange={(event) => setFormData((current) => ({ ...current, url: event.target.value }))}
                                    title="Remote MCP endpoint URL"
                                    aria-label="MCP server URL"
                                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="https://example.com/mcp"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Bearer token</label>
                                    <input
                                        value={formData.bearerToken}
                                        onChange={(event) => setFormData((current) => ({ ...current, bearerToken: event.target.value }))}
                                        title="Optional bearer token used for remote MCP authentication"
                                        aria-label="MCP server bearer token"
                                        className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Optional bearer token"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Headers</label>
                                    <textarea
                                        value={formData.headers}
                                        onChange={(event) => setFormData((current) => ({ ...current, headers: event.target.value }))}
                                        title="Optional request headers as a JSON object"
                                        aria-label="MCP server headers JSON"
                                        className="h-24 w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder='{"Authorization":"Bearer ..."}'
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-1.5">Environment variables</label>
                        <textarea
                            value={formData.env}
                            onChange={(event) => setFormData((current) => ({ ...current, env: event.target.value }))}
                            title="Optional environment variables as a JSON object"
                            aria-label="MCP server environment variables JSON"
                            className="h-24 w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder='{"API_KEY":"secret"}'
                        />
                    </div>

                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                        New servers use <span className="font-semibold text-white">Auto</span> discovery by default. If you ever need to force a clean rediscovery, use the <span className="font-semibold text-white">Clear cache</span> button on the server card.
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            title="Register this downstream MCP server in HyperCode"
                            aria-label="Add downstream MCP server"
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Add Server
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function classifyImportNames(importedNames: string[], existingServerNames: string[]): BulkImportClassification {
    const existingNames = new Set(existingServerNames.map((name) => name.trim()).filter(Boolean));

    return importedNames.reduce<BulkImportClassification>((result, name) => {
        if (existingNames.has(name)) {
            result.updatingNames.push(name);
        } else {
            result.newNames.push(name);
        }

        return result;
    }, { newNames: [], updatingNames: [] });
}

function BulkImportForm({ onDone, existingServerNames }: { onDone: () => void; existingServerNames: string[] }): React.JSX.Element {
    const [jsonConfig, setJsonConfig] = useState('');
    const [lastImportedNames, setLastImportedNames] = useState<string[]>([]);

    const preview = useMemo(() => {
        if (!jsonConfig.trim()) {
            return null;
        }

        try {
            return {
                data: buildBulkImportServers(jsonConfig),
                error: null,
            } as const;
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error.message : 'Invalid JSON',
            } as const;
        }
    }, [jsonConfig]);

    const importClassification = useMemo(() => {
        if (!preview?.data) {
            return null;
        }

        return classifyImportNames(preview.data.importedNames, existingServerNames);
    }, [existingServerNames, preview]);

    const importMutation = trpc.mcpServers.bulkImport.useMutation({
        onSuccess: (data: BulkImportMutationResult) => {
            const importedCount = Array.isArray(data)
                ? data.length
                : typeof data === 'object' && data !== null && typeof data.imported === 'number'
                    ? data.imported
                    : 0;

            const importedPreview = lastImportedNames.length > 0
                ? ` ${lastImportedNames.slice(0, 3).join(', ')}${lastImportedNames.length > 3 ? `, +${lastImportedNames.length - 3} more` : ''}.`
                : '';

            toast.success(`Imported ${importedCount} server${importedCount === 1 ? '' : 's'}.${importedPreview}`);
            onDone();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    function handleImport(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            const { servers, importedNames } = buildBulkImportServers(jsonConfig);

            setLastImportedNames(importedNames);
            importMutation.mutate(servers);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid JSON';
            toast.error(message);
        }
    }

    return (
        <Card className="bg-zinc-900 border-zinc-700 border-l-4 border-l-purple-600">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-white text-base">Bulk import MCP config</CardTitle>
                    <p className="text-sm text-zinc-500 mt-1">Import existing client configs and fold them into HyperCode’s router.</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDone}
                    title="Close bulk import form"
                    aria-label="Close bulk import form"
                    className="text-zinc-500 hover:text-white"
                >
                    Close
                </Button>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleImport} className="space-y-4">
                    <textarea
                        value={jsonConfig}
                        onChange={(event) => setJsonConfig(event.target.value)}
                        title="Paste MCP JSON or JSONC config to preview and import server entries"
                        aria-label="Bulk MCP config input"
                        className="h-56 w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder='{ "mcpServers": { "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] } } }'
                    />
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                        Paste a full MCP config, JSONC with comments/trailing commas, the raw <span className="font-semibold text-white">mcpServers</span> object, or a single server entry without outer braces.
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                        Imports currently <span className="font-semibold text-white">merge by server name</span>: matching names are updated, untouched servers stay in place.
                    </div>
                    {preview ? (
                        preview.error ? (
                            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                                {preview.error}
                            </div>
                        ) : (
                            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-2">
                                <div>
                                    Previewing <span className="font-semibold text-white">{preview.data.servers.length}</span> server{preview.data.servers.length === 1 ? '' : 's'}.
                                </div>
                                {importClassification ? (
                                    <div className="space-y-2">
                                        {importClassification.newNames.length > 0 ? (
                                            <div className="space-y-1.5">
                                                <div className="text-[11px] uppercase tracking-wider text-emerald-200/80">
                                                    New servers · {importClassification.newNames.length}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {importClassification.newNames.slice(0, 8).map((name) => (
                                                        <span key={`new-${name}`} className="rounded-full border border-emerald-400/20 bg-zinc-950/50 px-2 py-1 text-[11px] text-emerald-100">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {importClassification.newNames.length > 8 ? (
                                                        <span className="rounded-full border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300">
                                                            +{importClassification.newNames.length - 8} more
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                        {importClassification.updatingNames.length > 0 ? (
                                            <div className="space-y-1.5">
                                                <div className="text-[11px] uppercase tracking-wider text-amber-200/80">
                                                    Updating existing · {importClassification.updatingNames.length}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {importClassification.updatingNames.slice(0, 8).map((name) => (
                                                        <span key={`updating-${name}`} className="rounded-full border border-amber-400/20 bg-zinc-950/50 px-2 py-1 text-[11px] text-amber-100">
                                                            {name}
                                                        </span>
                                                    ))}
                                                    {importClassification.updatingNames.length > 8 ? (
                                                        <span className="rounded-full border border-zinc-700 bg-zinc-950/50 px-2 py-1 text-[11px] text-zinc-300">
                                                            +{importClassification.updatingNames.length - 8} more
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )
                    ) : null}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={importMutation.isPending || Boolean(preview?.error)}
                            title="Import all valid server definitions from this config into HyperCode"
                            aria-label="Import MCP server configuration"
                            className="bg-purple-600 hover:bg-purple-500 text-white"
                        >
                            {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Import
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function MCPDashboard(): React.JSX.Element {
    const trpcUtils = trpc.useUtils();
    const { data: servers, isLoading: isLoadingServers, error: serversError, refetch: refetchServers } = trpc.mcp.listServers.useQuery();
    const mcpServersClient = trpc.mcpServers as any;
    const { data: managedServers, error: managedServersError, refetch: refetchManagedServers } = mcpServersClient.list.useQuery();
    const { data: tools, isLoading: isLoadingTools, error: toolsError, refetch: refetchTools } = trpc.mcp.listTools.useQuery();
    const { data: status, error: statusError, refetch: refetchStatus } = trpc.mcp.getStatus.useQuery(undefined, { refetchInterval: 5000 });
    const [editingServerUuid, setEditingServerUuid] = useState<string | null>(null);
    const [inspectingServerUuid, setInspectingServerUuid] = useState<string | null>(null);
    const [deletingServerUuid, setDeletingServerUuid] = useState<string | null>(null);
    const [resettingServerUuid, setResettingServerUuid] = useState<string | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [lifecycleTypeFilter, setLifecycleTypeFilter] = useState<string>('all');
    const [lifecycleReasonFilter, setLifecycleReasonFilter] = useState<string>('all');
    const [lifecycleScopeFilter, setLifecycleScopeFilter] = useState<'all' | 'active-server'>('all');
    const [lifecycleWindowFilter, setLifecycleWindowFilter] = useState<'5m' | '15m' | '1h' | 'all'>('15m');
    const [lifecycleServerFilter, setLifecycleServerFilter] = useState<string>('all');
    const [hasHydratedLifecycleFiltersFromUrl, setHasHydratedLifecycleFiltersFromUrl] = useState(false);
    const [bulkRefreshState, setBulkRefreshState] = useState<BulkDiscoveryOperationState | null>(null);
    // Persistent per-server reload decision map — survives re-renders until the next explicit reload.
    // Key: server UUID, value: last DiscoveryResult decision label (e.g. 'binary-fresh', 'cache-cooldown').
    const [serverReloadDecisions, setServerReloadDecisions] = useState<Map<string, string>>(new Map());
    const reloadMetadataMutation = mcpServersClient.reloadMetadata.useMutation();
    const clearMetadataCacheMutation = mcpServersClient.clearMetadataCache.useMutation();
    const deleteServerMutation = mcpServersClient.delete.useMutation();
    const updateServerMutation = mcpServersClient.update.useMutation();
    const resetServerHealthMutation = trpc.serverHealth.reset.useMutation();
    const setLifecycleModesMutation = trpc.mcp.setLifecycleModes.useMutation();
    // Tool working-set eviction history — shows recent LRU/idle eviction events so operators
    // can observe memory-pressure patterns without digging into server logs.
    const {
        data: evictionHistoryData,
        error: evictionHistoryError,
        refetch: refetchEvictionHistory,
    } = trpc.mcp.getWorkingSetEvictionHistory.useQuery(undefined, { refetchInterval: 10000 });
    const clearEvictionHistoryMutation = trpc.mcp.clearWorkingSetEvictionHistory.useMutation({
        onSuccess: () => {
            void refetchEvictionHistory();
            toast.success('Eviction history cleared.');
        },
        onError: (err: { message?: string }) => { toast.error(err.message ?? 'Failed to clear eviction history.'); },
    });
    const evictionHistory = (evictionHistoryData ?? []) as Array<{
        toolName: string;
        timestamp: number;
        tier: 'loaded' | 'hydrated';
        idleEvicted: boolean;
        idleDurationMs: number;
    }>;
    const { data: editingServer } = mcpServersClient.get.useQuery(
        { uuid: editingServerUuid ?? '' },
        { enabled: Boolean(editingServerUuid) },
    );
    const { data: inspectingServer, refetch: refetchInspectingServer } = mcpServersClient.get.useQuery(
        { uuid: inspectingServerUuid ?? '' },
        { enabled: Boolean(inspectingServerUuid) },
    );
    const { data: inspectingServerHealth } = trpc.serverHealth.check.useQuery(
        { serverUuid: inspectingServerUuid ?? '' },
        { enabled: Boolean(inspectingServerUuid) },
    );

    const serversUnavailable = Boolean(serversError) || (servers !== undefined && !Array.isArray(servers));
    const managedServersUnavailable = Boolean(managedServersError) || (managedServers !== undefined && !Array.isArray(managedServers));
    const serverInventoryUnavailable = serversUnavailable || managedServersUnavailable;
    const serverInventoryErrorMessage = serversError?.message ?? managedServersError?.message ?? 'Downstream server inventory is unavailable.';
    const managedServerList = (!managedServersUnavailable ? (managedServers || []) : []) as ManagedServerMetadata[];
    const discoverySummary = getManagedServerDiscoverySummary(managedServerList);
    const unresolvedDiscoveryTargetUuids = getBulkMetadataTargetUuids(managedServerList, 'unresolved');
    const allDiscoveryTargetUuids = getBulkMetadataTargetUuids(managedServerList, 'all');
    const serverList = buildDashboardServerRecords((!serversUnavailable ? (servers || []) : []) as AggregatedServer[], managedServerList);
    const inspectingRuntimeServer = useMemo(() => serverList.find((server) => server.uuid === inspectingServerUuid), [inspectingServerUuid, serverList]);
    const toolList = (tools || []) as AggregatedTool[];
    const existingServerNames = useMemo(() => Array.from(new Set([
        ...serverList.map((server) => server.name),
        ...managedServerList.map((server) => server.name),
    ])).sort(), [managedServerList, serverList]);
    const summary = (status || {
        initialized: false,
        serverCount: 0,
        toolCount: 0,
        connectedCount: 0,
    }) as unknown as StatusSummary;
    const mcpStatusError = statusError?.message ?? null;

    const topTools = toolList.slice(0, 8);
    const lifecycleEvents = summary.lifecycle?.events ?? [];
    const lifecycleEventTypes = useMemo(() => {
        return Array.from(new Set(lifecycleEvents.map((event) => event.type))).sort();
    }, [lifecycleEvents]);
    const lifecycleReasonCodes = useMemo(() => {
        return Array.from(new Set(
            lifecycleEvents
                .map((event) => event.reasonCode)
                .filter((reason): reason is string => Boolean(reason)),
        )).sort();
    }, [lifecycleEvents]);
    const lifecycleServerOptions = useMemo(() => {
        const unique = new Map<string, string>();

        lifecycleEvents.forEach((event) => {
            if (!event.serverUuid) {
                return;
            }

            unique.set(event.serverUuid, event.serverName ?? event.serverUuid);
        });

        return Array.from(unique.entries())
            .map(([serverUuid, serverLabel]) => ({ serverUuid, serverLabel }))
            .sort((left, right) => left.serverLabel.localeCompare(right.serverLabel));
    }, [lifecycleEvents]);
    const scopedLifecycleEvents = useMemo(() => {
        const activeServerUuid = summary.pool?.currentActiveServerUuid ?? null;
        const now = Date.now();
        const windowMs = lifecycleWindowFilter === 'all'
            ? null
            : lifecycleWindowFilter === '5m'
                ? 5 * 60 * 1000
                : lifecycleWindowFilter === '15m'
                    ? 15 * 60 * 1000
                    : 60 * 60 * 1000;

        return lifecycleEvents.filter((event) => {
            if (windowMs !== null && now - event.timestamp > windowMs) {
                return false;
            }

            if (lifecycleTypeFilter !== 'all' && event.type !== lifecycleTypeFilter) {
                return false;
            }

            if (lifecycleServerFilter !== 'all') {
                if (!event.serverUuid) {
                    return false;
                }

                if (event.serverUuid !== lifecycleServerFilter) {
                    return false;
                }
            }

            if (lifecycleScopeFilter === 'active-server') {
                if (!activeServerUuid) {
                    return false;
                }

                return event.serverUuid === activeServerUuid;
            }

            return true;
        });
    }, [lifecycleEvents, lifecycleScopeFilter, lifecycleServerFilter, lifecycleTypeFilter, lifecycleWindowFilter, summary.pool?.currentActiveServerUuid]);

    const lifecycleReasonFacetCounts = useMemo(() => {
        const counts = new Map<string, number>();
        scopedLifecycleEvents.forEach((event) => {
            if (!event.reasonCode) {
                return;
            }

            counts.set(event.reasonCode, (counts.get(event.reasonCode) ?? 0) + 1);
        });

        return Array.from(counts.entries())
            .map(([reasonCode, count]) => ({
                reasonCode,
                count,
                sharePct: scopedLifecycleEvents.length > 0 ? Math.round((count / scopedLifecycleEvents.length) * 100) : 0,
            }))
            .sort((left, right) => {
                if (right.count !== left.count) {
                    return right.count - left.count;
                }

                return left.reasonCode.localeCompare(right.reasonCode);
            })
            .slice(0, 6);
    }, [scopedLifecycleEvents]);
    const lifecycleReasonServerFacetCounts = useMemo(() => {
        const counts = new Map<string, {
            reasonCode: string;
            serverUuid: string;
            serverLabel: string;
            count: number;
        }>();

        scopedLifecycleEvents.forEach((event) => {
            if (!event.reasonCode || !event.serverUuid) {
                return;
            }

            const serverLabel = event.serverName ?? event.serverUuid;
            const key = `${event.reasonCode}::${event.serverUuid}`;
            const existing = counts.get(key);

            if (existing) {
                existing.count += 1;
                return;
            }

            counts.set(key, {
                reasonCode: event.reasonCode,
                serverUuid: event.serverUuid,
                serverLabel,
                count: 1,
            });
        });

        return Array.from(counts.values())
            .sort((left, right) => {
                if (right.count !== left.count) {
                    return right.count - left.count;
                }

                const leftReason = left.reasonCode.localeCompare(right.reasonCode);
                if (leftReason !== 0) {
                    return leftReason;
                }

                return left.serverLabel.localeCompare(right.serverLabel);
            })
            .slice(0, 6);
    }, [scopedLifecycleEvents]);
    const filteredLifecycleEvents = useMemo(() => {
        return scopedLifecycleEvents.filter((event) => {
            if (lifecycleReasonFilter !== 'all' && event.reasonCode !== lifecycleReasonFilter) {
                return false;
            }
            return true;
        });
    }, [lifecycleReasonFilter, scopedLifecycleEvents]);
    const hasFocusedLifecyclePair = lifecycleReasonFilter !== 'all' && lifecycleServerFilter !== 'all';
    const timelineLifecycleEvents = useMemo(() => {
        if (hasFocusedLifecyclePair) {
            return scopedLifecycleEvents.slice(0, 8);
        }

        return filteredLifecycleEvents.slice(0, 8);
    }, [filteredLifecycleEvents, hasFocusedLifecyclePair, scopedLifecycleEvents]);
    const highlightedTimelinePairMatches = useMemo(() => {
        if (!hasFocusedLifecyclePair) {
            return 0;
        }

        return timelineLifecycleEvents.filter((event) => {
            return event.reasonCode === lifecycleReasonFilter && event.serverUuid === lifecycleServerFilter;
        }).length;
    }, [hasFocusedLifecyclePair, lifecycleReasonFilter, lifecycleServerFilter, timelineLifecycleEvents]);
    const lifecycleReasonTrendBuckets = useMemo(() => {
        if (scopedLifecycleEvents.length === 0) {
            return [] as Array<{
                label: string;
                bucketStart: number;
                bucketEnd: number;
                topReasonCode: string;
                topReasonCount: number;
                totalCount: number;
            }>;
        }

        const timestamps = scopedLifecycleEvents.map((event) => event.timestamp);
        const latestTimestamp = Math.max(...timestamps);
        const earliestTimestamp = lifecycleWindowFilter === 'all'
            ? Math.min(...timestamps)
            : lifecycleWindowFilter === '5m'
                ? latestTimestamp - (5 * 60 * 1000)
                : lifecycleWindowFilter === '15m'
                    ? latestTimestamp - (15 * 60 * 1000)
                    : latestTimestamp - (60 * 60 * 1000);
        const bucketCount = lifecycleWindowFilter === '1h' ? 6 : 5;
        const spanMs = Math.max(latestTimestamp - earliestTimestamp, 1);
        const bucketSizeMs = Math.max(Math.ceil(spanMs / bucketCount), 1);

        const buckets = Array.from({ length: bucketCount }, (_, index) => {
            const bucketStart = earliestTimestamp + (index * bucketSizeMs);
            const bucketEnd = index === bucketCount - 1
                ? latestTimestamp + 1
                : bucketStart + bucketSizeMs;

            return {
                bucketStart,
                bucketEnd,
                totalCount: 0,
                reasonCounts: new Map<string, number>(),
            };
        });

        scopedLifecycleEvents.forEach((event) => {
            const rawBucketIndex = Math.floor((event.timestamp - earliestTimestamp) / bucketSizeMs);
            const bucketIndex = Math.min(Math.max(rawBucketIndex, 0), bucketCount - 1);
            const bucket = buckets[bucketIndex];

            bucket.totalCount += 1;

            if (event.reasonCode) {
                bucket.reasonCounts.set(event.reasonCode, (bucket.reasonCounts.get(event.reasonCode) ?? 0) + 1);
            }
        });

        return buckets.map((bucket) => {
            const sortedReasons = Array.from(bucket.reasonCounts.entries()).sort((left, right) => {
                if (right[1] !== left[1]) {
                    return right[1] - left[1];
                }

                return left[0].localeCompare(right[0]);
            });
            const topReason = sortedReasons[0] ?? ['none', 0];

            return {
                label: new Date(bucket.bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bucketStart: bucket.bucketStart,
                bucketEnd: bucket.bucketEnd,
                topReasonCode: topReason[0],
                topReasonCount: topReason[1],
                totalCount: bucket.totalCount,
            };
        });
    }, [lifecycleWindowFilter, scopedLifecycleEvents]);
    const lifecycleReasonTrendMaxBucketCount = useMemo(() => {
        return lifecycleReasonTrendBuckets.reduce((max, bucket) => Math.max(max, bucket.totalCount), 0);
    }, [lifecycleReasonTrendBuckets]);
    const lifecycleServerTrendBuckets = useMemo(() => {
        if (scopedLifecycleEvents.length === 0) {
            return [] as Array<{
                label: string;
                bucketStart: number;
                bucketEnd: number;
                topServerUuid: string;
                topServerLabel: string;
                topServerCount: number;
                momentumDelta: number;
                totalCount: number;
            }>;
        }

        const timestamps = scopedLifecycleEvents.map((event) => event.timestamp);
        const latestTimestamp = Math.max(...timestamps);
        const earliestTimestamp = lifecycleWindowFilter === 'all'
            ? Math.min(...timestamps)
            : lifecycleWindowFilter === '5m'
                ? latestTimestamp - (5 * 60 * 1000)
                : lifecycleWindowFilter === '15m'
                    ? latestTimestamp - (15 * 60 * 1000)
                    : latestTimestamp - (60 * 60 * 1000);
        const bucketCount = lifecycleWindowFilter === '1h' ? 6 : 5;
        const spanMs = Math.max(latestTimestamp - earliestTimestamp, 1);
        const bucketSizeMs = Math.max(Math.ceil(spanMs / bucketCount), 1);

        const buckets = Array.from({ length: bucketCount }, (_, index) => {
            const bucketStart = earliestTimestamp + (index * bucketSizeMs);
            const bucketEnd = index === bucketCount - 1
                ? latestTimestamp + 1
                : bucketStart + bucketSizeMs;

            return {
                bucketStart,
                bucketEnd,
                totalCount: 0,
                serverCounts: new Map<string, { count: number; label: string }>(),
            };
        });

        scopedLifecycleEvents.forEach((event) => {
            if (!event.serverUuid) {
                return;
            }

            const rawBucketIndex = Math.floor((event.timestamp - earliestTimestamp) / bucketSizeMs);
            const bucketIndex = Math.min(Math.max(rawBucketIndex, 0), bucketCount - 1);
            const bucket = buckets[bucketIndex];

            bucket.totalCount += 1;

            const existing = bucket.serverCounts.get(event.serverUuid);
            if (existing) {
                existing.count += 1;
                return;
            }

            bucket.serverCounts.set(event.serverUuid, {
                count: 1,
                label: event.serverName ?? event.serverUuid,
            });
        });

        return buckets.map((bucket, index) => {
            const sortedServers = Array.from(bucket.serverCounts.entries()).sort((left, right) => {
                if (right[1].count !== left[1].count) {
                    return right[1].count - left[1].count;
                }

                return left[1].label.localeCompare(right[1].label);
            });
            const topServer = sortedServers[0] ?? ['none', { count: 0, label: 'none' }];

            const previousBucket = index > 0 ? buckets[index - 1] : null;
            const previousTopServerCount = previousBucket
                ? previousBucket.serverCounts.get(topServer[0])?.count ?? 0
                : 0;

            return {
                label: new Date(bucket.bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bucketStart: bucket.bucketStart,
                bucketEnd: bucket.bucketEnd,
                topServerUuid: topServer[0],
                topServerLabel: topServer[1].label,
                topServerCount: topServer[1].count,
                momentumDelta: topServer[0] === 'none' ? 0 : topServer[1].count - previousTopServerCount,
                totalCount: bucket.totalCount,
            };
        });
    }, [lifecycleWindowFilter, scopedLifecycleEvents]);
    const lifecycleServerTrendMaxBucketCount = useMemo(() => {
        return lifecycleServerTrendBuckets.reduce((max, bucket) => Math.max(max, bucket.totalCount), 0);
    }, [lifecycleServerTrendBuckets]);
    const recentLifecycleEvents = timelineLifecycleEvents;
    const bulkActionsDisabled = bulkRefreshState !== null || reloadMetadataMutation.isPending || clearMetadataCacheMutation.isPending;
    const unresolvedActionableCount = unresolvedDiscoveryTargetUuids.length;
    const allActionableCount = allDiscoveryTargetUuids.length;
    const unresolvedWithoutActionCount = Math.max(discoverySummary.unresolvedCount - unresolvedActionableCount, 0);
    const localCompatActive = discoverySummary.localCompatCount > 0;

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const initialType = searchParams.get(LIFECYCLE_FILTER_PARAM_KEYS.type) ?? LIFECYCLE_FILTER_DEFAULTS.type;
        const initialReason = searchParams.get(LIFECYCLE_FILTER_PARAM_KEYS.reason) ?? LIFECYCLE_FILTER_DEFAULTS.reason;
        const initialServer = parseLifecycleServerFilter(searchParams.get(LIFECYCLE_FILTER_PARAM_KEYS.server));

        setLifecycleTypeFilter(initialType);
        setLifecycleReasonFilter(initialReason);
        setLifecycleWindowFilter(parseLifecycleWindowFilter(searchParams.get(LIFECYCLE_FILTER_PARAM_KEYS.window)));
        setLifecycleScopeFilter(parseLifecycleScopeFilter(searchParams.get(LIFECYCLE_FILTER_PARAM_KEYS.scope)));
        setLifecycleServerFilter(initialServer);
        setHasHydratedLifecycleFiltersFromUrl(true);
    }, []);

    useEffect(() => {
        if (!hasHydratedLifecycleFiltersFromUrl) {
            return;
        }

        if (lifecycleServerFilter === 'all') {
            return;
        }

        const isKnownServer = lifecycleServerOptions.some((option) => option.serverUuid === lifecycleServerFilter);
        if (!isKnownServer) {
            setLifecycleServerFilter('all');
        }
    }, [hasHydratedLifecycleFiltersFromUrl, lifecycleServerFilter, lifecycleServerOptions]);

    useEffect(() => {
        if (!hasHydratedLifecycleFiltersFromUrl || typeof window === 'undefined') {
            return;
        }

        const url = new URL(window.location.href);
        applyLifecycleFiltersToUrl(url, {
            type: lifecycleTypeFilter,
            reason: lifecycleReasonFilter,
            window: lifecycleWindowFilter,
            scope: lifecycleScopeFilter,
            server: lifecycleServerFilter,
        });

        const nextRelativeUrl = `${url.pathname}${url.search}${url.hash}`;
        const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

        if (nextRelativeUrl !== currentRelativeUrl) {
            window.history.replaceState(window.history.state, '', nextRelativeUrl);
        }
    }, [hasHydratedLifecycleFiltersFromUrl, lifecycleReasonFilter, lifecycleScopeFilter, lifecycleServerFilter, lifecycleTypeFilter, lifecycleWindowFilter]);

    async function refreshDashboardQueries() {
        await Promise.all([
            refetchServers(),
            refetchManagedServers(),
            refetchTools(),
            refetchStatus(),
            inspectingServerUuid ? refetchInspectingServer() : Promise.resolve(undefined),
        ]);
    }

    async function handleToggleLifecycleMode(mode: 'lazySessionMode' | 'singleActiveServerMode') {
        const currentValue = mode === 'lazySessionMode'
            ? summary.lifecycle?.lazySessionMode !== false
            : summary.lifecycle?.singleActiveServerMode !== false;
        const nextValue = !currentValue;

        try {
            await setLifecycleModesMutation.mutateAsync({
                [mode]: nextValue,
            });
            await refetchStatus();
            toast.success(`${mode === 'lazySessionMode' ? 'Lazy sessions' : 'Single-active mode'} ${nextValue ? 'enabled' : 'disabled'}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update lifecycle mode.';
            toast.error(message);
        }
    }

    async function handleDeleteServer(uuid: string, serverName: string) {
        const confirmed = typeof window === 'undefined'
            ? true
            : window.confirm(`Delete MCP server '${serverName}'? This removes the server from HyperCode configuration.`);
        if (!confirmed) {
            return;
        }

        try {
            setDeletingServerUuid(uuid);
            await deleteServerMutation.mutateAsync({ uuid });
            if (editingServerUuid === uuid) {
                setEditingServerUuid(null);
            }
            if (inspectingServerUuid === uuid) {
                setInspectingServerUuid(null);
            }
            await refreshDashboardQueries();
            toast.success(`Deleted ${serverName}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete MCP server.';
            toast.error(message);
        } finally {
            setDeletingServerUuid(null);
        }
    }

    async function handleToggleAlwaysOn(serverUuid: string, serverName: string, currentValue: boolean) {
        try {
            await updateServerMutation.mutateAsync({
                uuid: serverUuid,
                always_on: !currentValue,
            });
            await refreshDashboardQueries();
            toast.success(`'Always On' setting updated for ${serverName}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update setting.';
            toast.error(message);
        }
    }

    async function handleResetHealth(serverUuid: string, serverName: string) {
        try {
            setResettingServerUuid(serverUuid);
            await resetServerHealthMutation.mutateAsync({ serverUuid });
            if (inspectingServerUuid === serverUuid) {
                await refetchInspectingServer();
            }
            toast.success(`Reset health counters for ${serverName}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reset server health.';
            toast.error(message);
        } finally {
            setResettingServerUuid(null);
        }
    }

    async function handleTestServer(serverUuid: string, serverName: string) {
        try {
            const result = await trpcUtils.serverHealth.check.fetch({ serverUuid });
            setInspectingServerUuid(serverUuid);
            toast.success(`${serverName} health: ${result.status} (${result.crashCount} crashes tracked).`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to test MCP server health.';
            toast.error(message);
        }
    }

    async function handleReloadMetadata(
        input: { uuid: string; mode: 'auto' | 'binary' | 'cache' },
        options?: { notify?: boolean; refresh?: boolean },
    ) {
        try {
            const result = await reloadMetadataMutation.mutateAsync(input);

            if (options?.refresh !== false) {
                await refreshDashboardQueries();
            }

            // Persist the reload decision so the server card chip stays visible after the toast fades.
            const decision = typeof (result as { reloadDecision?: string }).reloadDecision === 'string'
                ? (result as { reloadDecision: string }).reloadDecision
                : null;
            if (decision && input.uuid) {
                setServerReloadDecisions((prev) => {
                    const next = new Map(prev);
                    next.set(input.uuid, decision);
                    return next;
                });
            }

            if (options?.notify !== false) {
                const decisionText = decision ? ` (${decision})` : '';
                toast.success(`Reloaded metadata for ${result.server.name} from ${result.metadata.metadataSource ?? 'metadata cache'}${decisionText}.`);
            }

            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reload MCP metadata.';
            toast.error(message);
            throw error;
        }
    }

    async function handleClearMetadataCache(uuid: string) {
        try {
            const result = await clearMetadataCacheMutation.mutateAsync({ uuid });
            await refreshDashboardQueries();
            toast.success(`Cleared cached metadata for ${result.server.name}. The next auto discovery will reload from the binary.`);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to clear MCP metadata cache.';
            toast.error(message);
            throw error;
        }
    }

    async function handleBulkBinaryRefresh(targetMode: 'all' | 'unresolved') {
        const targetUuids = targetMode === 'all'
            ? allDiscoveryTargetUuids
            : unresolvedDiscoveryTargetUuids;

        if (targetUuids.length === 0) {
            toast.info(targetMode === 'all'
                ? 'No managed MCP servers are available for discovery refresh.'
                : 'All managed MCP servers already have ready metadata.');
            return;
        }

        let completedCount = 0;
        setBulkRefreshState({
            mode: targetMode,
            completedCount,
            totalCount: targetUuids.length,
        });

        try {
            for (const uuid of targetUuids) {
                await handleReloadMetadata({ uuid, mode: 'binary' }, { notify: false, refresh: false });
                completedCount += 1;
                setBulkRefreshState({
                    mode: targetMode,
                    completedCount,
                    totalCount: targetUuids.length,
                });
            }

            await refreshDashboardQueries();
            toast.success(`Refreshed binary metadata for ${completedCount} MCP server${completedCount === 1 ? '' : 's'}.`);
        } catch (error) {
            await refreshDashboardQueries();
            const message = error instanceof Error ? error.message : 'Bulk discovery refresh failed.';
            toast.error(`Bulk refresh stopped after ${completedCount} of ${targetUuids.length} server${targetUuids.length === 1 ? '' : 's'}. ${message}`);
        } finally {
            setBulkRefreshState(null);
        }
    }

    async function handleLoadTestAndCacheServer(serverUuid: string, serverName: string) {
        try {
            await handleReloadMetadata({ uuid: serverUuid, mode: 'binary' }, { notify: false, refresh: false });
            const health = await trpcUtils.serverHealth.check.fetch({ serverUuid });
            await refreshDashboardQueries();
            setInspectingServerUuid(serverUuid);
            toast.success(`${serverName} loaded and cached. Health: ${health.status}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load, test, and cache MCP server.';
            toast.error(message);
        }
    }

    async function handleCopyLifecycleTriageLink() {
        if (typeof window === 'undefined') {
            return;
        }

        const shareUrl = new URL(window.location.href);
        applyLifecycleFiltersToUrl(shareUrl, {
            type: lifecycleTypeFilter,
            reason: lifecycleReasonFilter,
            window: lifecycleWindowFilter,
            scope: lifecycleScopeFilter,
            server: lifecycleServerFilter,
        });

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl.toString());
                toast.success('Copied lifecycle triage link to clipboard.');
                return;
            }

            toast.error('Clipboard access is unavailable in this browser.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to copy lifecycle triage link.';
            toast.error(message);
        }
    }

    async function handleCopyLifecycleTriageSummary() {
        const activeServerLabel = summary.pool?.currentActiveServerName
            ? `${summary.pool.currentActiveServerName}${summary.pool.currentActiveServerUuid ? ` (${summary.pool.currentActiveServerUuid})` : ''}`
            : (summary.pool?.currentActiveServerUuid ?? 'none');
        const topReasonsLine = lifecycleReasonFacetCounts.length > 0
            ? lifecycleReasonFacetCounts.map((facet) => `${facet.reasonCode}: ${facet.count}`).join(', ')
            : 'none';
        const topReasonServerPairsLine = lifecycleReasonServerFacetCounts.length > 0
            ? lifecycleReasonServerFacetCounts
                .slice(0, 3)
                .map((facet) => `${facet.reasonCode}@${facet.serverLabel}: ${facet.count}`)
                .join(', ')
            : 'none';
        const topServerMomentumLine = lifecycleServerTrendBuckets.length > 0
            ? lifecycleServerTrendBuckets
                .filter((bucket) => bucket.topServerUuid !== 'none')
                .slice(0, 3)
                .map((bucket) => `${bucket.topServerLabel}:${bucket.topServerCount}${bucket.momentumDelta >= 0 ? '+' : ''}${bucket.momentumDelta}`)
                .join(', ') || 'none'
            : 'none';
        const focusedPairLine = hasFocusedLifecyclePair
            ? `${lifecycleReasonFilter}@${lifecycleServerFilter}`
            : 'none';

        const summaryText = [
            'MCP lifecycle triage summary',
            `window=${lifecycleWindowFilter}`,
            `type=${lifecycleTypeFilter}`,
            `reason=${lifecycleReasonFilter}`,
            `scope=${lifecycleScopeFilter}`,
            `server=${lifecycleServerFilter}`,
            `activeServer=${activeServerLabel}`,
            `matchingEvents=${filteredLifecycleEvents.length}`,
            `visibleEvents=${recentLifecycleEvents.length}`,
            `highlightedPairEvents=${highlightedTimelinePairMatches}`,
            `focusedPair=${focusedPairLine}`,
            `topReasons=${topReasonsLine}`,
            `topReasonServerPairs=${topReasonServerPairsLine}`,
            `topServerMomentum=${topServerMomentumLine}`,
        ].join('\n');

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(summaryText);
                toast.success('Copied lifecycle triage summary.');
                return;
            }

            toast.error('Clipboard access is unavailable in this browser.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to copy lifecycle triage summary.';
            toast.error(message);
        }
    }

    function applyLifecyclePreset(preset: 'all' | 'crashes' | 'single-active-prunes' | 'mode-changes') {
        if (preset === 'all') {
            setLifecycleTypeFilter('all');
            setLifecycleReasonFilter('all');
            setLifecycleWindowFilter('15m');
            setLifecycleScopeFilter('all');
            setLifecycleServerFilter('all');
            return;
        }

        if (preset === 'crashes') {
            setLifecycleTypeFilter('server-crash');
            setLifecycleReasonFilter('process-exit');
            setLifecycleWindowFilter('1h');
            setLifecycleScopeFilter('all');
            setLifecycleServerFilter('all');
            return;
        }

        if (preset === 'single-active-prunes') {
            setLifecycleTypeFilter('single-active-prune');
            setLifecycleReasonFilter('single-active-policy');
            setLifecycleWindowFilter('15m');
            setLifecycleScopeFilter('all');
            setLifecycleServerFilter('all');
            return;
        }

        setLifecycleTypeFilter('mode-updated');
        setLifecycleReasonFilter('all');
        setLifecycleWindowFilter('1h');
        setLifecycleScopeFilter('all');
        setLifecycleServerFilter('all');
    }

    const isCrashPresetActive = lifecycleTypeFilter === 'server-crash' && lifecycleReasonFilter === 'process-exit' && lifecycleWindowFilter === '1h' && lifecycleScopeFilter === 'all' && lifecycleServerFilter === 'all';
    const isSingleActivePresetActive = lifecycleTypeFilter === 'single-active-prune' && lifecycleReasonFilter === 'single-active-policy' && lifecycleWindowFilter === '15m' && lifecycleScopeFilter === 'all' && lifecycleServerFilter === 'all';
    const isModePresetActive = lifecycleTypeFilter === 'mode-updated' && lifecycleWindowFilter === '1h' && lifecycleScopeFilter === 'all' && lifecycleServerFilter === 'all';
    const isAllPresetActive = lifecycleTypeFilter === 'all' && lifecycleReasonFilter === 'all' && lifecycleWindowFilter === '15m' && lifecycleScopeFilter === 'all' && lifecycleServerFilter === 'all';

    return (
        <div className="p-4 sm:p-6 xl:p-8 space-y-8">
            <PageStatusBanner
                status="beta"
                message="MCP Router Control Plane"
                note="Core router health, lifecycle telemetry, config import, and downstream server management are live. Progressive disclosure and some search/load ergonomics are still maturing."
            />

            {summary.aggregatorStatus?.isLKG ? (
                <Alert variant="destructive" className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <AlertTitle>Last-Known-Good Configuration Active</AlertTitle>
                    <AlertDescription>
                        HyperCode failed to load the primary MCP configuration and has fallen back to the last-known-good (LKG) backup.
                        Please check your configuration files for syntax errors or permission issues.
                    </AlertDescription>
                </Alert>
            ) : null}
            {mcpStatusError ? (
                <Alert variant="destructive" className="bg-red-500/10 text-red-200 border-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-300" />
                    <AlertTitle>MCP status unavailable</AlertTitle>
                    <AlertDescription>{mcpStatusError}</AlertDescription>
                </Alert>
            ) : null}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">MCP Router Control Plane</h1>
                    <p className="text-zinc-500 mt-2 max-w-3xl">
                        HyperCode should read like the ultimate MCP aggregator/router first: one operator surface, many downstream servers, semantic search and grouping, lifecycle control, traffic visibility, and client config sync.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        onClick={() => setIsImportOpen((value) => !value)}
                        title="Open or close the bulk config import panel"
                        aria-label="Toggle MCP config import panel"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Import Config
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={() => setIsAddOpen((value) => !value)}
                        title="Open or close the add-server panel"
                        aria-label="Toggle add MCP server panel"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Server
                    </Button>
                </div>
            </div>

            {isAddOpen ? <AddServerForm onDone={() => { setIsAddOpen(false); void refreshDashboardQueries(); }} /> : null}
            {isImportOpen ? <BulkImportForm existingServerNames={existingServerNames} onDone={() => { setIsImportOpen(false); void refreshDashboardQueries(); }} /> : null}
            {editingServerUuid && editingServer ? (
                <EditMcpServer
                    server={editingServer}
                    onCancel={() => setEditingServerUuid(null)}
                    onSuccess={() => {
                        setEditingServerUuid(null);
                        void refreshDashboardQueries();
                    }}
                />
            ) : null}
            {inspectingServerUuid ? (
                <ServerInspectionPanel
                    server={inspectingServer}
                    runtime={inspectingRuntimeServer}
                    health={inspectingServerHealth}
                    lastReloadDecision={serverReloadDecisions.get(inspectingServerUuid)}
                    onClose={() => setInspectingServerUuid(null)}
                />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Configured servers</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{mcpStatusError ? '—' : summary.serverCount}</div>
                            </div>
                            <Server className="h-5 w-5 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Connected peers</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{mcpStatusError ? '—' : summary.connectedCount}</div>
                            </div>
                            <Network className="h-5 w-5 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Aggregated tools</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{mcpStatusError ? '—' : summary.toolCount}</div>
                            </div>
                            <Wrench className="h-5 w-5 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-zinc-500">Router status</div>
                                <div className="mt-1 text-3xl font-semibold text-white">{mcpStatusError ? 'Unavailable' : (summary.initialized ? 'Ready' : 'Cold')}</div>
                                <div className="mt-2 space-y-1 text-[11px] text-zinc-400">
                                    {mcpStatusError ? (
                                        <div className="text-red-300">{mcpStatusError}</div>
                                    ) : (
                                        <>
                                            <div>
                                                pool active <span className="font-semibold text-white">{summary.pool?.active ?? 0}</span> • idle <span className="font-semibold text-white">{summary.pool?.idle ?? 0}</span>
                                            </div>
                                            <div>
                                                sessions <span className="font-semibold text-white">{summary.pool?.activeSessionCount ?? 0}</span> • lazy <span className="font-semibold text-white">{summary.lifecycle?.lazySessionMode === false ? 'off' : 'on'}</span> • single-active <span className="font-semibold text-white">{summary.lifecycle?.singleActiveServerMode === false ? 'off' : 'on'}</span>
                                            </div>
                                            <div>
                                                active server <span className="font-semibold text-white">{summary.pool?.currentActiveServerName ?? summary.pool?.currentActiveServerUuid ?? 'none'}</span>
                                                {summary.pool?.currentActiveServerName && summary.pool?.currentActiveServerUuid
                                                    ? <> <span className="text-zinc-500">({summary.pool.currentActiveServerUuid})</span></>
                                                    : null}
                                                {summary.pool?.lastActiveServerSwitchAt
                                                    ? <> • switched <span className="font-semibold text-white">{new Date(summary.pool.lastActiveServerSwitchAt).toLocaleTimeString()}</span></>
                                                    : null}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={setLifecycleModesMutation.isPending}
                                        onClick={() => void handleToggleLifecycleMode('lazySessionMode')}
                                        className="border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800"
                                        title="Toggle lazy downstream session startup"
                                        aria-label="Toggle lazy downstream session startup"
                                    >
                                        Lazy {summary.lifecycle?.lazySessionMode === false ? 'off' : 'on'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={setLifecycleModesMutation.isPending}
                                        onClick={() => void handleToggleLifecycleMode('singleActiveServerMode')}
                                        className="border-zinc-700 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800"
                                        title="Toggle single-active downstream server policy"
                                        aria-label="Toggle single-active downstream server policy"
                                    >
                                        Single-active {summary.lifecycle?.singleActiveServerMode === false ? 'off' : 'on'}
                                    </Button>
                                </div>
                                <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/60 p-2.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Lifecycle timeline</div>
                                        <div className="text-[11px] text-zinc-500">
                                            showing <span className="font-semibold text-white">{recentLifecycleEvents.length}</span> of <span className="font-semibold text-white">{filteredLifecycleEvents.length}</span>
                                            {hasFocusedLifecyclePair ? (
                                                <>
                                                    {' '}• pair matches in view <span className="font-semibold text-emerald-200">{highlightedTimelinePairMatches}</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-5">
                                        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                            Event type
                                            <select
                                                value={lifecycleTypeFilter}
                                                onChange={(event) => setLifecycleTypeFilter(event.target.value)}
                                                title="Filter lifecycle timeline by event type"
                                                aria-label="Filter lifecycle timeline by event type"
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="all">All event types</option>
                                                {lifecycleEventTypes.map((eventType) => (
                                                    <option key={eventType} value={eventType}>{eventType}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                            Reason
                                            <select
                                                value={lifecycleReasonFilter}
                                                onChange={(event) => setLifecycleReasonFilter(event.target.value)}
                                                title="Filter lifecycle timeline by reason code"
                                                aria-label="Filter lifecycle timeline by reason code"
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="all">All reasons</option>
                                                {lifecycleReasonCodes.map((reasonCode) => (
                                                    <option key={reasonCode} value={reasonCode}>{reasonCode}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                            Window
                                            <select
                                                value={lifecycleWindowFilter}
                                                onChange={(event) => setLifecycleWindowFilter(event.target.value as '5m' | '15m' | '1h' | 'all')}
                                                title="Filter lifecycle timeline by recency window"
                                                aria-label="Filter lifecycle timeline by recency window"
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="5m">Last 5m</option>
                                                <option value="15m">Last 15m</option>
                                                <option value="1h">Last 1h</option>
                                                <option value="all">All events</option>
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                            Scope
                                            <select
                                                value={lifecycleScopeFilter}
                                                onChange={(event) => setLifecycleScopeFilter(event.target.value as 'all' | 'active-server')}
                                                title="Filter lifecycle timeline scope"
                                                aria-label="Filter lifecycle timeline scope"
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="all">All servers</option>
                                                <option value="active-server" disabled={!summary.pool?.currentActiveServerUuid}>
                                                    Current active server only
                                                </option>
                                            </select>
                                        </label>
                                        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                            Server
                                            <select
                                                value={lifecycleServerFilter}
                                                onChange={(event) => setLifecycleServerFilter(event.target.value)}
                                                title="Filter lifecycle timeline by server identity"
                                                aria-label="Filter lifecycle timeline by server"
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="all">All servers</option>
                                                {lifecycleServerOptions.map((option) => (
                                                    <option key={option.serverUuid} value={option.serverUuid}>{option.serverLabel}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyLifecyclePreset('crashes')}
                                            className={`border-zinc-700 ${isCrashPresetActive ? 'bg-rose-500/15 text-rose-200 border-rose-500/40' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            title="Show recent downstream crash events"
                                            aria-label="Apply crash triage preset"
                                        >
                                            Crash triage
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyLifecyclePreset('single-active-prunes')}
                                            className={`border-zinc-700 ${isSingleActivePresetActive ? 'bg-amber-500/15 text-amber-200 border-amber-500/40' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            title="Show single-active pruning lifecycle decisions"
                                            aria-label="Apply single-active pruning preset"
                                        >
                                            Single-active prunes
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyLifecyclePreset('mode-changes')}
                                            className={`border-zinc-700 ${isModePresetActive ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            title="Show lifecycle mode update events"
                                            aria-label="Apply mode-changes preset"
                                        >
                                            Mode changes
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyLifecyclePreset('all')}
                                            className={`border-zinc-700 ${isAllPresetActive ? 'bg-zinc-700/40 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            title="Reset lifecycle filters to default overview"
                                            aria-label="Reset lifecycle filter presets"
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleCopyLifecycleTriageLink()}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            title="Copy a shareable link with the current lifecycle triage filters"
                                            aria-label="Copy lifecycle triage link"
                                        >
                                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                            Copy triage link
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void handleCopyLifecycleTriageSummary()}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            title="Copy a compact lifecycle triage summary for incident handoff"
                                            aria-label="Copy lifecycle triage summary"
                                        >
                                            <Activity className="mr-2 h-3.5 w-3.5" />
                                            Copy summary
                                        </Button>
                                    </div>
                                    {lifecycleReasonFacetCounts.length > 0 ? (
                                        <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                                                <span>Top reasons (current scope)</span>
                                                <span>
                                                    total <span className="font-semibold text-zinc-300">{filteredLifecycleEvents.length}</span>
                                                </span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setLifecycleReasonFilter('all')}
                                                    className={`h-7 border-zinc-700 px-2 text-[11px] ${lifecycleReasonFilter === 'all' ? 'bg-zinc-700/40 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                                    title="Show events for all reason codes in the current scope"
                                                    aria-label="Show all lifecycle reasons"
                                                >
                                                    all
                                                </Button>
                                                {lifecycleReasonFacetCounts.map((facet) => (
                                                    <Button
                                                        key={facet.reasonCode}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setLifecycleReasonFilter(facet.reasonCode)}
                                                        className={`h-7 border-zinc-700 px-2 text-[11px] ${lifecycleReasonFilter === facet.reasonCode ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-100' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                                        title={`Filter lifecycle timeline by reason ${facet.reasonCode}`}
                                                        aria-label={`Filter lifecycle reason ${facet.reasonCode}`}
                                                    >
                                                        {facet.reasonCode}
                                                        <span className="ml-1 rounded border border-zinc-700 bg-zinc-900 px-1 text-[10px] text-zinc-300">{facet.count}</span>
                                                        <span className="ml-1 text-[10px] text-zinc-400">{facet.sharePct}%</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    {lifecycleReasonServerFacetCounts.length > 0 ? (
                                        <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                                                <span>Top reason + server pairs</span>
                                                <span>{lifecycleReasonServerFacetCounts.length} pairs</span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {lifecycleReasonServerFacetCounts.map((facet) => (
                                                    <Button
                                                        key={`${facet.reasonCode}-${facet.serverUuid}`}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setLifecycleReasonFilter(facet.reasonCode);
                                                            setLifecycleServerFilter(facet.serverUuid);
                                                        }}
                                                        className={`h-7 border-zinc-700 px-2 text-[11px] ${lifecycleReasonFilter === facet.reasonCode && lifecycleServerFilter === facet.serverUuid ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                                        title={`Filter lifecycle timeline by ${facet.reasonCode} on ${facet.serverLabel}`}
                                                        aria-label={`Filter lifecycle timeline by ${facet.reasonCode} on ${facet.serverLabel}`}
                                                    >
                                                        <span className="max-w-[140px] truncate">{facet.reasonCode} · {facet.serverLabel}</span>
                                                        <span className="ml-1 rounded border border-zinc-700 bg-zinc-900 px-1 text-[10px] text-zinc-300">{facet.count}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    {lifecycleReasonTrendBuckets.length > 0 ? (
                                        <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                                                <span>Reason trend (window buckets)</span>
                                                <span>{lifecycleReasonTrendBuckets.length} buckets</span>
                                            </div>
                                            <div className="mt-1.5 flex items-end gap-1.5">
                                                {lifecycleReasonTrendBuckets.map((bucket) => {
                                                    const heightPct = lifecycleReasonTrendMaxBucketCount > 0
                                                        ? Math.max((bucket.totalCount / lifecycleReasonTrendMaxBucketCount) * 100, bucket.totalCount > 0 ? 22 : 8)
                                                        : 8;

                                                    return (
                                                        <button
                                                            key={`${bucket.bucketStart}-${bucket.bucketEnd}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (bucket.topReasonCode !== 'none') {
                                                                    setLifecycleReasonFilter(bucket.topReasonCode);
                                                                }
                                                            }}
                                                            disabled={bucket.topReasonCode === 'none'}
                                                            title={bucket.topReasonCode === 'none'
                                                                ? `${bucket.label} · no reason-coded events`
                                                                : `${bucket.label} · top reason ${bucket.topReasonCode} (${bucket.topReasonCount}/${bucket.totalCount})`}
                                                            aria-label={bucket.topReasonCode === 'none'
                                                                ? `${bucket.label} no reason-coded lifecycle events`
                                                                : `Filter by top reason ${bucket.topReasonCode} from ${bucket.label}`}
                                                            className="group flex min-w-0 flex-1 flex-col items-center gap-1 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex h-14 w-full items-end">
                                                                <div
                                                                    className={`w-full rounded-sm border ${bucket.topReasonCode === 'none' ? 'border-zinc-800 bg-zinc-800/60' : lifecycleReasonFilter === bucket.topReasonCode ? 'border-cyan-500/40 bg-cyan-500/20' : 'border-zinc-700 bg-zinc-700/80 group-hover:bg-zinc-600/80'}`}
                                                                    style={{ height: `${heightPct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-zinc-500">{bucket.label}</span>
                                                            <span className="max-w-full truncate text-[10px] text-zinc-300">{bucket.topReasonCode}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                    {lifecycleServerTrendBuckets.length > 0 ? (
                                        <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/50 p-2">
                                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
                                                <span>Server momentum (window buckets)</span>
                                                <span>{lifecycleServerTrendBuckets.length} buckets</span>
                                            </div>
                                            <div className="mt-1.5 flex items-end gap-1.5">
                                                {lifecycleServerTrendBuckets.map((bucket) => {
                                                    const heightPct = lifecycleServerTrendMaxBucketCount > 0
                                                        ? Math.max((bucket.totalCount / lifecycleServerTrendMaxBucketCount) * 100, bucket.totalCount > 0 ? 22 : 8)
                                                        : 8;

                                                    return (
                                                        <button
                                                            key={`${bucket.bucketStart}-${bucket.bucketEnd}`}
                                                            type="button"
                                                            onClick={() => {
                                                                if (bucket.topServerUuid !== 'none') {
                                                                    setLifecycleServerFilter(bucket.topServerUuid);
                                                                }
                                                            }}
                                                            disabled={bucket.topServerUuid === 'none'}
                                                            title={bucket.topServerUuid === 'none'
                                                                ? `${bucket.label} · no server-tagged events`
                                                                : `${bucket.label} · top server ${bucket.topServerLabel} (${bucket.topServerCount}/${bucket.totalCount}), momentum ${bucket.momentumDelta >= 0 ? '+' : ''}${bucket.momentumDelta}`}
                                                            aria-label={bucket.topServerUuid === 'none'
                                                                ? `${bucket.label} no server-tagged lifecycle events`
                                                                : `Filter by top server ${bucket.topServerLabel} from ${bucket.label}`}
                                                            className="group flex min-w-0 flex-1 flex-col items-center gap-1 disabled:cursor-not-allowed"
                                                        >
                                                            <div className="flex h-14 w-full items-end">
                                                                <div
                                                                    className={`w-full rounded-sm border ${bucket.topServerUuid === 'none' ? 'border-zinc-800 bg-zinc-800/60' : lifecycleServerFilter === bucket.topServerUuid ? 'border-emerald-500/40 bg-emerald-500/20' : 'border-zinc-700 bg-zinc-700/80 group-hover:bg-zinc-600/80'}`}
                                                                    style={{ height: `${heightPct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-zinc-500">{bucket.label}</span>
                                                            <span className="max-w-full truncate text-[10px] text-zinc-300">{bucket.topServerLabel}</span>
                                                            <span className={`text-[10px] ${bucket.momentumDelta > 0 ? 'text-emerald-300' : bucket.momentumDelta < 0 ? 'text-amber-300' : 'text-zinc-500'}`}>
                                                                {bucket.momentumDelta >= 0 ? '+' : ''}{bucket.momentumDelta}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                    {recentLifecycleEvents.length > 0 ? (
                                        <div className="mt-2 space-y-1.5 text-[11px] text-zinc-400">
                                            {recentLifecycleEvents.map((event) => {
                                                const isPairMatch = hasFocusedLifecyclePair
                                                    && event.reasonCode === lifecycleReasonFilter
                                                    && event.serverUuid === lifecycleServerFilter;

                                                return (
                                                    <div
                                                        key={event.id}
                                                        className={`rounded border px-2 py-1.5 ${isPairMatch ? 'border-emerald-500/40 bg-emerald-500/10' : hasFocusedLifecyclePair ? 'border-zinc-800/80 bg-zinc-900/40 opacity-80' : 'border-zinc-800 bg-zinc-900/60'}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-zinc-300">{event.type}</span>
                                                                {event.reasonCode ? (
                                                                    <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-cyan-200">
                                                                        {event.reasonCode}
                                                                    </span>
                                                                ) : null}
                                                                {isPairMatch ? (
                                                                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
                                                                        focused pair
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <span className="text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        {event.serverName || event.serverUuid ? (
                                                            <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                                                                server {event.serverName ?? event.serverUuid}
                                                                {event.serverName && event.serverUuid ? ` (${event.serverUuid})` : ''}
                                                            </div>
                                                        ) : null}
                                                        <div className="mt-1 text-zinc-400">{event.message}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="mt-2 text-[11px] text-zinc-500">No lifecycle events match the active filters.</div>
                                    )}
                                </div>
                            </div>
                            <Zap className="h-5 w-5 text-yellow-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tool working-set eviction history — shows when LRU/idle pressure evicted a tool from the
                active session. Helps operators understand memory patterns and detect overloaded sessions. */}
            <div>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold text-white">Tool working-set eviction history</div>
                                    {evictionHistory.length > 0 ? (
                                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                                            {evictionHistory.length} event{evictionHistory.length === 1 ? '' : 's'}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-xs text-zinc-500">
                                    Recent LRU and idle-eviction events from the active session working set (capped at 200). Idle evictions fire when a tool has not been accessed within the configured threshold.
                                </p>
                                {evictionHistoryError ? (
                                    <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                                        {evictionHistoryError.message}
                                    </div>
                                ) : evictionHistory.length > 0 ? (
                                    <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
                                        {evictionHistory.slice(0, 20).map((event, index) => (
                                            <div
                                                key={`${event.toolName}-${event.timestamp}-${index}`}
                                                className={`rounded border px-2 py-1.5 ${event.idleEvicted ? 'border-amber-500/20 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/60'}`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-zinc-300">{event.toolName}</span>
                                                        <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${event.tier === 'hydrated' ? 'border-violet-500/20 bg-violet-500/10 text-violet-200' : 'border-zinc-700 bg-zinc-900/40 text-zinc-400'}`}>
                                                            {event.tier}
                                                        </span>
                                                        {event.idleEvicted ? (
                                                            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                                                                idle
                                                            </span>
                                                        ) : (
                                                            <span className="rounded border border-zinc-700 bg-zinc-900/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                                                                lru
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-zinc-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="mt-1 text-[10px] text-zinc-500">
                                                    idle for {event.idleDurationMs >= 60_000
                                                        ? `${(event.idleDurationMs / 60_000).toFixed(1)}m`
                                                        : `${(event.idleDurationMs / 1000).toFixed(1)}s`}
                                                </div>
                                            </div>
                                        ))}
                                        {evictionHistory.length > 20 ? (
                                            <div className="text-[11px] text-zinc-500 text-center py-1">
                                                …and {evictionHistory.length - 20} older events
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="mt-3 text-[11px] text-zinc-500">
                                        No eviction events recorded yet. Evictions occur when the working-set tool cap is reached or a tool has been idle past the threshold.
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => clearEvictionHistoryMutation.mutate(undefined)}
                                    disabled={clearEvictionHistoryMutation.isPending || evictionHistory.length === 0 || Boolean(evictionHistoryError)}
                                    className="border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                    title="Clear all eviction history entries"
                                >
                                    {clearEvictionHistoryMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    Clear history
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <Card className="min-w-0 overflow-hidden bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Why this page exists</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Server className="h-4 w-4 text-blue-400" /> Aggregation</div>
                            <p className="mt-2 text-sm text-zinc-500">One HyperCode endpoint should make many downstream MCP servers feel like a coherent control plane, not a pile of loose wires.</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Search className="h-4 w-4 text-cyan-400" /> Semantic grouping</div>
                            <p className="mt-2 text-sm text-zinc-500">Tool collisions and overlap should be handled through search, ranking, and working-set grouping instead of extra namespace ceremony.</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-emerald-400" /> Lifecycle supervision</div>
                            <p className="mt-2 text-sm text-zinc-500">A dead child server should restart without knocking over its healthy neighbors. Drama belongs in logs, not uptime.</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Search className="h-4 w-4 text-purple-400" /> Discoverability</div>
                            <p className="mt-2 text-sm text-zinc-500">Search, load, and working-set management are router features too; a giant static tool dump is not a UX strategy.</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Zap className="h-4 w-4 text-yellow-400" /> Traffic visibility</div>
                            <p className="mt-2 text-sm text-zinc-500">Operators should see message flow, latency, and failures clearly enough to debug the router without reading tea leaves.</p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Layers className="h-4 w-4 text-indigo-400" /> Client sync</div>
                            <p className="mt-2 text-sm text-zinc-500">The system should push usable config into clients like Claude Desktop, Cursor, and VS Code rather than making setup a scavenger hunt.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Control-plane quick links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <QuickLinkCard title="Tool Search" description="Find tools semantically and shape the active working set without extra routing layers." href="/dashboard/mcp/search" accentClass="text-cyan-400" icon={Search} />
                        <QuickLinkCard title="Observability" description="Watch metrics, health, and live router state." href="/dashboard/mcp/observability" accentClass="text-yellow-400" icon={Zap} />
                        <QuickLinkCard title="Policies" description="Enforce tool access and governance rules." href="/dashboard/mcp/policies" accentClass="text-green-400" icon={Shield} />
                        <QuickLinkCard title="Testing Lab" description="Use inspector/search/playground surfaces without polluting the main control-plane view." href="/dashboard/mcp/testing" accentClass="text-fuchsia-400" icon={Wrench} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Card className="min-w-0 overflow-hidden bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <CardTitle className="text-white">Downstream runtime</CardTitle>
                            <p className="mt-1 text-sm text-zinc-500">
                                Managed-server discovery is now batch-operable too, so recovering a stale fleet no longer means click-click-click until your mouse files a complaint.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={bulkActionsDisabled || unresolvedActionableCount === 0}
                                onClick={() => void handleBulkBinaryRefresh('unresolved')}
                                title={unresolvedActionableCount > 0
                                    ? `Repair ${unresolvedActionableCount} managed MCP server${unresolvedActionableCount === 1 ? '' : 's'} with unresolved metadata or stale ready zero-tool caches`
                                    : 'No unresolved or stale managed MCP servers are currently actionable for binary rediscovery'}
                                aria-label="Repair unresolved or stale MCP server discovery"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                {bulkRefreshState?.mode === 'unresolved' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="mr-2 h-3.5 w-3.5" />}
                                Repair stale / unresolved {unresolvedActionableCount > 0 ? `(${unresolvedActionableCount})` : ''}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={bulkActionsDisabled || allActionableCount === 0}
                                onClick={() => void handleBulkBinaryRefresh('all')}
                                title={allActionableCount > 0
                                    ? `Refresh binary metadata across ${allActionableCount} managed MCP server${allActionableCount === 1 ? '' : 's'}`
                                    : 'No managed MCP servers are currently actionable for binary rediscovery'}
                                aria-label="Refresh binary metadata for all managed MCP servers"
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                            >
                                {bulkRefreshState?.mode === 'all' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                                Refresh all binaries {allActionableCount > 0 ? `(${allActionableCount})` : ''}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="text-sm font-medium text-white">Fleet discovery summary</div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider text-zinc-400">
                                        <span className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1">Managed {discoverySummary.totalCount}</span>
                                        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-200">Ready {discoverySummary.readyCount}</span>
                                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-200">Unresolved {discoverySummary.unresolvedCount}</span>
                                        <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-rose-200">Stale ready {discoverySummary.staleReadyCount}</span>
                                        <span className="rounded border border-zinc-700 bg-zinc-900/60 px-2 py-1">Never loaded {discoverySummary.neverLoadedCount}</span>
                                        <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-200">Repairable {discoverySummary.repairableCount}</span>
                                        {localCompatActive ? (
                                            <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-200">Local compat {discoverySummary.localCompatCount}</span>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="max-w-md text-xs text-zinc-500 lg:text-right">
                                    {bulkRefreshState ? (
                                        <span className="text-zinc-300">
                                            Running {bulkRefreshState.mode === 'all' ? 'full fleet' : 'unresolved'} binary discovery: {bulkRefreshState.completedCount} / {bulkRefreshState.totalCount}
                                        </span>
                                    ) : localCompatActive ? (
                                        <span>
                                            Local compat fallback is active for {discoverySummary.localCompatCount} managed server{discoverySummary.localCompatCount === 1 ? '' : 's'}, so HyperCode is surfacing config-backed records with stable local IDs and action links while live core telemetry is unavailable.
                                        </span>
                                    ) : discoverySummary.staleReadyCount > 0 ? (
                                        <span>
                                            {discoverySummary.staleReadyCount} server{discoverySummary.staleReadyCount === 1 ? '' : 's'} look <span className="font-semibold text-white">ready</span> but still have zero cached tools. Use <span className="font-semibold text-white">Repair stale / unresolved</span> to force fresh binary discovery and scrub the zombie cache state.
                                        </span>
                                    ) : unresolvedWithoutActionCount > 0 ? (
                                        <span>
                                            {unresolvedWithoutActionCount} unresolved server{unresolvedWithoutActionCount === 1 ? '' : 's'} are missing actionable card links in this view. The bulk buttons currently target {allActionableCount} managed server{allActionableCount === 1 ? '' : 's'} with stable identifiers.
                                        </span>
                                    ) : allActionableCount === 0 ? (
                                        <span>
                                            No managed servers are currently actionable for bulk rediscovery yet.
                                        </span>
                                    ) : (
                                        <span>
                                            Use <span className="font-semibold text-white">Retry unresolved</span> for failed or pending metadata, or <span className="font-semibold text-white">Refresh all binaries</span> after a broad config/tooling change.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isLoadingServers ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
                        ) : serverInventoryUnavailable ? (
                            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-8 text-center text-amber-200">
                                <div className="font-medium">Downstream server inventory unavailable</div>
                                <div className="mt-2 text-sm text-amber-200/80">{serverInventoryErrorMessage}</div>
                            </div>
                        ) : serverList.length > 0 ? (
                            serverList.map((server) => {
                                const actionLinks = buildServerToolActionLinks(server.name);
                                const serverUuid = server.uuid;
                                const lastReloadDecision = serverUuid ? serverReloadDecisions.get(serverUuid) : undefined;
                                const isLocalCompatServer = isLocalCompatMetadataSource(server.metadataSource);
                                const hasStaleReadyCache = hasStaleReadyMetadata({
                                    name: server.name,
                                    _meta: {
                                        status: server.metadataStatus,
                                        metadataSource: server.metadataSource,
                                        toolCount: server.metadataToolCount,
                                        lastSuccessfulBinaryLoadAt: server.lastSuccessfulBinaryLoadAt,
                                    },
                                });

                                return (
                                <div key={server.name} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="font-medium text-white">{server.name}</div>
                                            <div className="mt-1 text-xs text-zinc-500 font-mono break-all">
                                                {server.config?.command || 'n/a'} {(server.config?.args || []).join(' ')}
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-zinc-400">
                                                <span className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1">
                                                    cache {server.metadataStatus ?? 'pending'}
                                                </span>
                                                <span className={`rounded border px-2 py-1 ${server.runtimeConnected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-zinc-800 bg-zinc-900/60'}`}>
                                                    runtime {server.runtimeState ?? server.status}
                                                </span>
                                                <span className={`rounded border px-2 py-1 ${server.warmupState === 'ready' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : server.warmupState === 'failed' ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : server.warmupState === 'warming' || server.warmupState === 'scheduled' ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-zinc-800 bg-zinc-900/60'}`}>
                                                    warmup {server.warmupState ?? 'idle'}
                                                </span>
                                                {server.always_on ? (
                                                    <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-indigo-200 font-bold">
                                                        Always On
                                                    </span>
                                                ) : null}
                                                <span className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1">
                                                    source {server.metadataSource ?? 'none'}
                                                </span>
                                                {hasStaleReadyCache ? (
                                                    <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-rose-200">
                                                        stale ready cache
                                                    </span>
                                                ) : null}
                                                {isLocalCompatServer ? (
                                                    <span className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-sky-200">
                                                        local compat actions enabled
                                                    </span>
                                                ) : null}
                                                {lastReloadDecision ? (
                                                    <span className={`rounded border px-2 py-1 ${
                                                        lastReloadDecision === 'binary-fresh' ? 'border-violet-500/20 bg-violet-500/10 text-violet-200'
                                                        : lastReloadDecision === 'binary-coalesced' ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200'
                                                        : lastReloadDecision === 'cache-cooldown' ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                                                        : lastReloadDecision === 'cache-reusable' ? 'border-teal-500/20 bg-teal-500/10 text-teal-200'
                                                        : 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
                                                    }`} title={`Last reload decision: ${lastReloadDecision}`}>
                                                        reload: {lastReloadDecision}
                                                    </span>
                                                ) : null}
                                                {server.source_published_server_uuid ? (
                                                    <Link href={`/dashboard/registry/${server.source_published_server_uuid}`} className="inline-flex items-center gap-1 rounded border border-indigo-900/50 bg-indigo-950/40 px-2 py-1 text-indigo-400 hover:bg-indigo-950/70 transition-colors">
                                                        <Database className="h-3 w-3" />
                                                        from registry
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </div>
                                        <StatusBadge status={server.status} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5">
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Tools</div>
                                            <div className="mt-1 text-white font-semibold">{server.toolCount}</div>
                                        </div>
                                        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5">
                                            <div className="text-xs uppercase tracking-wider text-zinc-500">Advertised tools</div>
                                            <div className="mt-1 text-white font-semibold">{server.advertisedToolCount ?? server.metadataToolCount ?? 0}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-3">
                                        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 text-xs text-zinc-400">
                                            <div>Cached tools: <span className="font-semibold text-white">{server.metadataToolCount ?? 0}</span></div>
                                            <div className="mt-1">Advertised source: <span className="font-semibold text-white">{server.advertisedSource ?? 'unknown'}</span></div>
                                            <div className="mt-1">Last runtime connect: <span className="font-semibold text-white">{server.lastConnectedAt ?? 'never'}</span></div>
                                            <div className="mt-1">Env keys: <span className="font-semibold text-white">{server.config?.env?.length ?? 0}</span></div>
                                            <div className="mt-1 break-all">Last binary load: {server.lastSuccessfulBinaryLoadAt ?? 'never'}</div>
                                        </div>
                                        {hasStaleReadyCache ? (
                                            <div className="rounded border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-100">
                                                <div className="flex items-center gap-2 font-semibold text-white">
                                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                                                    Ready cache looks stale
                                                </div>
                                                <p className="mt-1 text-rose-100/90">
                                                    This server is marked ready, but HyperCode has zero cached tools for it. That usually means an older discovery failure got cached as success. Run a binary refresh to repair it.
                                                </p>
                                            </div>
                                        ) : null}
                                        {serverUuid ? (
                                            <div className="min-w-0 rounded border border-zinc-800 bg-zinc-900/60 p-3">
                                                <div className={`rounded-md px-3 py-2 ${isLocalCompatServer ? 'border border-sky-500/20 bg-sky-500/5' : 'border border-cyan-500/20 bg-cyan-500/5'}`}>
                                                    <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">Server actions live here</div>
                                                    <p className="mt-1 text-xs text-zinc-400">
                                                        {isLocalCompatServer
                                                            ? 'This server is being surfaced through local compat fallback, so these controls act on the HyperCode-managed local config record while upstream core telemetry is unavailable.'
                                                            : 'Keep the operator controls anchored on every server card so inspection, edits, cache warm-up, health tests, and logs stay one click away.'}
                                                    </p>
                                                </div>
                                                <div className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">Primary actions</div>
                                                <p className="mt-1 text-xs text-zinc-500">
                                                    The controls below stay visible on each server card so inspection, editing, cache init, testing, and logs are easy to reach even on narrow layouts.
                                                </p>
                                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setInspectingServerUuid(serverUuid)}
                                                        title={`Inspect ${server.name} configuration and metadata`}
                                                        aria-label={`Inspect ${server.name}`}
                                                        className="justify-center border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                                        Inspect
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingServerUuid(serverUuid)}
                                                        title={`Edit ${server.name}`}
                                                        aria-label={`Edit ${server.name}`}
                                                        className="justify-center border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={reloadMetadataMutation.isPending}
                                                        onClick={() => void handleReloadMetadata({ uuid: serverUuid, mode: 'binary' })}
                                                        title={hasStaleReadyCache
                                                            ? `Repair stale ready cache for ${server.name} by relaunching the binary and rediscovering tools`
                                                            : `Refresh metadata by launching ${server.name} binary and rediscovering tools`}
                                                        aria-label={hasStaleReadyCache
                                                            ? `Repair stale cache for ${server.name}`
                                                            : `Refresh binary metadata for ${server.name}`}
                                                        className={`justify-center ${hasStaleReadyCache ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}
                                                    >
                                                        {reloadMetadataMutation.isPending && reloadMetadataMutation.variables?.uuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                                                        {hasStaleReadyCache ? 'Repair cache' : 'Refresh binary'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={reloadMetadataMutation.isPending}
                                                        onClick={() => void handleLoadTestAndCacheServer(serverUuid, server.name)}
                                                        title={`Start ${server.name}, test its health, and initialize cached tools in one pass`}
                                                        aria-label={`Initialize cache for ${server.name}`}
                                                        className="justify-center border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
                                                    >
                                                        {reloadMetadataMutation.isPending && reloadMetadataMutation.variables?.uuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5" />}
                                                        Init cache
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void handleTestServer(serverUuid, server.name)}
                                                        title={`Run a health check for ${server.name}`}
                                                        aria-label={`Test ${server.name}`}
                                                        className="justify-center border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        <HeartPulse className="mr-2 h-3.5 w-3.5" />
                                                        Test
                                                    </Button>
                                                    <Link
                                                        href={actionLinks.logsHref}
                                                        title={`Open live logs while you test ${server.name}`}
                                                        aria-label={`Open logs for ${server.name}`}
                                                        className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                                                    >
                                                        <Activity className="mr-2 h-3.5 w-3.5" />
                                                        Logs
                                                    </Link>
                                                        <Link
                                                            href={`/dashboard/mcp/testing/servers?target=${encodeURIComponent(server.name)}`}
                                                            title={`Open the interactive probe panel for ${server.name}`}
                                                            aria-label={`Open interactive test for ${server.name}`}
                                                            className="inline-flex items-center justify-center rounded-md border border-cyan-500/30 px-3 py-2 text-sm text-cyan-200 transition-colors hover:bg-cyan-500/10"
                                                        >
                                                            <Play className="mr-2 h-3.5 w-3.5" />
                                                            Interactive test
                                                        </Link>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={reloadMetadataMutation.isPending}
                                                        onClick={() => void handleReloadMetadata({ uuid: serverUuid, mode: 'cache' })}
                                                        title={`Refresh cached metadata snapshot for ${server.name}`}
                                                        aria-label={`Refresh cache for ${server.name}`}
                                                        className="justify-center border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
                                                    >
                                                        {reloadMetadataMutation.isPending && reloadMetadataMutation.variables?.uuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                                                        Refresh cache
                                                    </Button>
                                                </div>
                                                <div className="mt-3 border-t border-zinc-800 pt-3">
                                                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Secondary actions</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link
                                                            href={actionLinks.inspectToolsHref}
                                                            title={`Inspect tools discovered from ${server.name}`}
                                                            aria-label={`Inspect tools for ${server.name}`}
                                                            className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                                                        >
                                                            <Wrench className="mr-2 h-3.5 w-3.5" />
                                                            Inspect tools
                                                        </Link>
                                                        <Link
                                                            href={actionLinks.editToolsHref}
                                                            title={`Edit working-set behavior for tools from ${server.name}`}
                                                            aria-label={`Edit tools for ${server.name}`}
                                                            className="inline-flex items-center rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                                                        >
                                                            <Pencil className="mr-2 h-3.5 w-3.5" />
                                                            Edit tools
                                                        </Link>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={updateServerMutation.isPending}
                                                            onClick={() => void handleToggleAlwaysOn(serverUuid, server.name, !!server.always_on)}
                                                            title={`Toggle Always On status for ${server.name}`}
                                                            aria-label={`Toggle Always On for ${server.name}`}
                                                            className={`border-zinc-700 hover:bg-zinc-800 ${server.always_on ? 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5' : 'text-zinc-300'}`}
                                                        >
                                                            <Zap className="mr-2 h-3.5 w-3.5" />
                                                            Toggle Auto-Load Tools: {server.always_on ? 'ON' : 'OFF'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => void handleResetHealth(serverUuid, server.name)}
                                                            disabled={resetServerHealthMutation.isPending}
                                                            title={`Reset tracked health state for ${server.name}`}
                                                            aria-label={`Reset health for ${server.name}`}
                                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                        >
                                                            {resetServerHealthMutation.isPending && resettingServerUuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <HeartPulse className="mr-2 h-3.5 w-3.5" />}
                                                            Reset health
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={clearMetadataCacheMutation.isPending || reloadMetadataMutation.isPending}
                                                            onClick={() => void handleClearMetadataCache(serverUuid)}
                                                            title={`Clear cached metadata for ${server.name}`}
                                                            aria-label={`Clear metadata cache for ${server.name}`}
                                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                        >
                                                            {clearMetadataCacheMutation.isPending && clearMetadataCacheMutation.variables?.uuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Database className="mr-2 h-3.5 w-3.5" />}
                                                            Clear cache
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={reloadMetadataMutation.isPending}
                                                            onClick={() => void handleReloadMetadata({ uuid: serverUuid, mode: 'binary' })}
                                                            title={`Force a fresh binary rediscovery for ${server.name}`}
                                                            aria-label={`Force binary rediscovery for ${server.name}`}
                                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                        >
                                                            {reloadMetadataMutation.isPending && reloadMetadataMutation.variables?.uuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                                                            Force rediscovery
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => void handleDeleteServer(serverUuid, server.name)}
                                                            disabled={deleteServerMutation.isPending}
                                                            title={`Delete ${server.name} from HyperCode configuration`}
                                                            aria-label={`Delete ${server.name}`}
                                                            className="border-red-500/30 text-red-200 hover:bg-red-500/10"
                                                        >
                                                            {deleteServerMutation.isPending && deletingServerUuid === serverUuid ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                                <div className="space-y-3">
                                    <div>No downstream servers are configured yet.</div>
                                    <p className="mx-auto max-w-xl text-sm text-zinc-500">
                                        Once a server is available, each server card exposes <span className="font-medium text-zinc-300">Inspect</span>, <span className="font-medium text-zinc-300">Edit</span>, <span className="font-medium text-zinc-300">Init cache</span>, <span className="font-medium text-zinc-300">Test</span>, <span className="font-medium text-zinc-300">Refresh cache</span>, and <span className="font-medium text-zinc-300">Logs</span> as primary actions.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsAddOpen(true)}
                                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Server
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div>
                            <CardTitle className="text-white">Tool discovery snapshot</CardTitle>
                            <p className="text-sm text-zinc-500 mt-1">A compact view of the aggregated catalog. Use Search for deeper discovery and working-set actions.</p>
                        </div>
                        <Link
                            href="/dashboard/mcp/search"
                            title="Open semantic search and working-set management for MCP tools"
                            aria-label="Open MCP search dashboard"
                            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
                        >
                            Open Search
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoadingTools ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
                        ) : toolsError ? (
                            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-8 text-center text-amber-200">
                                <div className="font-medium">Tool discovery unavailable</div>
                                <div className="mt-2 text-sm text-amber-200/80">{toolsError.message}</div>
                            </div>
                        ) : topTools.length > 0 ? (
                            topTools.map((tool) => (
                                <div key={`${tool.server}:${tool.name}`} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="font-mono text-sm text-blue-400 break-all">{tool.name}</div>
                                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">{tool.server}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-zinc-500">{tool.description || 'No description available.'}</p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
                                No aggregated tools available yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
