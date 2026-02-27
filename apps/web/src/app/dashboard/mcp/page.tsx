"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@borg/ui";
import { Button } from "@borg/ui";
import { Loader2, Plus, Server, Wrench, Trash2, Upload, Box, RefreshCw, Terminal, Layers, Globe, Key, Shield, FileCode, Activity, Zap, Bot, Search, Sparkles, ExternalLink, Cpu, Network } from "lucide-react";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

const PANEL_STORAGE_KEY = 'metamcp_panel_order_v1';

function getSafeLocalStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storage = window.localStorage;
        // Accessing a trivial property forces browsers to validate storage availability.
        void storage.length;
        return storage;
    } catch {
        return null;
    }
}

function safeStorageGet(key: string): string | null {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return null;
    }

    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key: string, value: string): void {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(key, value);
    } catch {
        // Ignore storage failures in restricted contexts.
    }
}

const DEFAULT_PANEL_ORDER = [
    'autopilot',
    'deer-flow',
    'session',
    'agent',
    'experts',
    'evolution',
    'namespaces',
    'endpoints',
    'api-keys',
    'tool-sets',
    'policies',
    'scripts',
    'ai-tools',
    'logs',
    'observability',
    'search',
] as const;

type PanelId = (typeof DEFAULT_PANEL_ORDER)[number];

const PANEL_META: Record<PanelId | 'open-webui', { title: string; href: string; icon: any; description: string; accent: string }> = {
    'open-webui': {
        title: 'Open-WebUI',
        href: '/dashboard/webui',
        icon: Bot,
        description: 'Ultimate unified chat interface and LLM aggregation.',
        accent: 'text-blue-400',
    },
    'autopilot': {
        title: 'OpenCode Autopilot',
        href: '/dashboard/autopilot',
        icon: Sparkles,
        description: 'Launch governance and multi-model autopilot workflows.',
        accent: 'text-fuchsia-400',
    },
    'deer-flow': {
        title: 'DeerFlow Harness',
        href: '/dashboard/deer-flow',
        icon: Network,
        description: 'Super Agent engine for sub-agent swarm reasoning.',
        accent: 'text-fuchsia-400',
    },
    'session': {
        title: 'Execution Session',
        href: '/dashboard/session',
        icon: Activity,
        description: 'Control state, Auto-Drive, and global executing goals.',
        accent: 'text-blue-400',
    },
    'agent': {
        title: 'Agent Playground',
        href: '/dashboard/mcp/agent',
        icon: Bot,
        description: 'Test orchestration and agent tool usage.',
        accent: 'text-pink-400',
    },
    'experts': {
        title: 'Expert Squad',
        href: '/dashboard/experts',
        icon: Bot,
        description: 'Deploy Researcher and Coder agents for deep tasks.',
        accent: 'text-indigo-400',
    },
    'evolution': {
        title: 'Evolution Engine',
        href: '/dashboard/evolution',
        icon: Sparkles,
        description: 'Mutate and experiment with agent prompt configurations.',
        accent: 'text-emerald-400',
    },
    'namespaces': {
        title: 'Namespaces',
        href: '/dashboard/mcp/namespaces',
        icon: Box,
        description: 'Organize tenant boundaries and routing scope.',
        accent: 'text-blue-400',
    },
    'endpoints': {
        title: 'Endpoints',
        href: '/dashboard/mcp/endpoints',
        icon: Globe,
        description: 'Manage MCP endpoint registrations and status.',
        accent: 'text-cyan-400',
    },
    'api-keys': {
        title: 'API Keys',
        href: '/dashboard/mcp/api-keys',
        icon: Key,
        description: 'Issue and rotate scoped integration keys.',
        accent: 'text-yellow-400',
    },
    'tool-sets': {
        title: 'Tool Sets',
        href: '/dashboard/mcp/tool-sets',
        icon: Layers,
        description: 'Compose capability bundles by environment.',
        accent: 'text-purple-400',
    },
    'policies': {
        title: 'Policies',
        href: '/dashboard/mcp/policies',
        icon: Shield,
        description: 'Enforce tool permissions and governance.',
        accent: 'text-green-400',
    },
    'scripts': {
        title: 'Internal Scripts',
        href: '/dashboard/mcp/scripts',
        icon: FileCode,
        description: 'Review and run managed automation scripts.',
        accent: 'text-orange-400',
    },
    'ai-tools': {
        title: 'Tools & Extensions',
        href: '/dashboard/mcp/tools',
        icon: Cpu,
        description: 'Host shell audit logs, semantic browser, and marketplace.',
        accent: 'text-fuchsia-400',
    },
    'logs': {
        title: 'Logs',
        href: '/dashboard/mcp/logs',
        icon: Activity,
        description: 'Inspect runtime activity and errors.',
        accent: 'text-rose-400',
    },
    'observability': {
        title: 'Observability',
        href: '/dashboard/mcp/observability',
        icon: Zap,
        description: 'Track health signals and live metrics.',
        accent: 'text-indigo-400',
    },
    'search': {
        title: 'Search',
        href: '/dashboard/mcp/search',
        icon: Search,
        description: 'Explore tools, routes, and MCP resources.',
        accent: 'text-teal-400',
    },
};

const COMPAT_MODE_HELP: Record<'native' | 'bridge' | 'fallback' | 'unknown', string> = {
    native: 'Native upstream tRPC contract resolved directly.',
    bridge: 'Legacy dashboard calls were translated to MetaMCP namespaced procedures.',
    fallback: 'Upstream was unavailable or incompatible; compatibility fallback payload served.',
    unknown: 'Probe did not return a known compatibility header yet.',
};

export default function MCPDashboard() {
    const { data: servers, isLoading: isLoadingServers, refetch: refetchServers } = trpc.mcpServers.list.useQuery();
    const { data: tools, isLoading: isLoadingTools } = trpc.tools.list.useQuery();
    const { data: status } = trpc.mcp.getStatus.useQuery(undefined, { refetchInterval: 5000 }); // Keep legacy status for now if new one isn't ready

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'servers' | 'tools'>('servers');
    const [showAutopilotEmbed, setShowAutopilotEmbed] = useState(false);
    const [panelOrder, setPanelOrder] = useState<PanelId[]>([...DEFAULT_PANEL_ORDER]);
    const [isMounted, setIsMounted] = useState(false);
    const [compatMode, setCompatMode] = useState<'native' | 'bridge' | 'fallback' | 'unknown'>('unknown');
    const autopilotUrl = process.env.NEXT_PUBLIC_AUTOPILOT_DASHBOARD_URL || 'http://localhost:3847';

    useEffect(() => {
        try {
            const raw = safeStorageGet(PANEL_STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return;
            }
            const filtered = parsed.filter((id): id is PanelId => id in PANEL_META);
            const merged = [...new Set([...filtered, ...DEFAULT_PANEL_ORDER])];
            setPanelOrder(merged as PanelId[]);
        } catch {
            // no-op, fallback to defaults
        }
        setIsMounted(true);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const detectCompatMode = async () => {
            try {
                const response = await fetch('/api/trpc/mcp.getStatus?input=%7B%7D', {
                    method: 'GET',
                    credentials: 'include',
                });

                if (isCancelled) {
                    return;
                }

                const compatHeader = response.headers.get('x-borg-trpc-compat');
                if (!compatHeader) {
                    setCompatMode('native');
                    return;
                }

                if (compatHeader.includes('bridge')) {
                    setCompatMode('bridge');
                    return;
                }

                if (compatHeader.includes('fallback')) {
                    setCompatMode('fallback');
                    return;
                }

                setCompatMode('unknown');
            } catch {
                if (!isCancelled) {
                    setCompatMode('unknown');
                }
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                detectCompatMode();
            }
        };

        detectCompatMode();
        window.addEventListener('focus', detectCompatMode);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            isCancelled = true;
            window.removeEventListener('focus', detectCompatMode);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    const orderedPanels = useMemo(() => panelOrder.filter((id) => id in PANEL_META), [panelOrder]);
    const showCompatDataWarning = !isLoadingServers
        && !isLoadingTools
        && (servers?.length ?? 0) === 0
        && (tools?.length ?? 0) === 0
        && (compatMode === 'bridge' || compatMode === 'fallback');

    const handlePanelDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            return;
        }

        setPanelOrder((current) => {
            const oldIndex = current.indexOf(active.id as PanelId);
            const newIndex = current.indexOf(over.id as PanelId);
            if (oldIndex < 0 || newIndex < 0) {
                return current;
            }
            const next = arrayMove(current, oldIndex, newIndex);
            safeStorageSet(PANEL_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    const resetPanelOrder = () => {
        const next = [...DEFAULT_PANEL_ORDER];
        setPanelOrder(next);
        safeStorageSet(PANEL_STORAGE_KEY, JSON.stringify(next));
        toast.success('MetaMCP panel layout reset.');
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">MetaMCP Core Dashboard</h1>
                    <p className="text-zinc-500 flex items-center gap-2">
                        Main dashboard interface for tools, subpages, and MCP operations
                        <span
                            title={COMPAT_MODE_HELP[compatMode]}
                            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${compatMode === 'native'
                                ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                                : compatMode === 'bridge'
                                    ? 'border-blue-500/30 text-blue-300 bg-blue-500/10'
                                    : compatMode === 'fallback'
                                        ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
                                        : 'border-zinc-700 text-zinc-400 bg-zinc-900/70'
                                }`}
                        >
                            Data source: {compatMode}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={resetPanelOrder} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                        <RefreshCw className="mr-2 h-4 w-4" /> Reset Panels
                    </Button>
                    <Button onClick={() => setIsBulkImportOpen(!isBulkImportOpen)} variant="outline" className="border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                        <Upload className="mr-2 h-4 w-4" /> Bulk Import
                    </Button>
                    <Button onClick={() => setIsAddOpen(!isAddOpen)} className="bg-blue-600 hover:bg-blue-500">
                        <Plus className="mr-2 h-4 w-4" /> Add Server
                    </Button>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Tool Panels (Draggable + Auto-Saved)</CardTitle>
                    <p className="text-xs text-zinc-500">Drag cards to reorder; layout is saved locally for this browser.</p>
                </CardHeader>
                <CardContent>
                    {isMounted ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePanelDragEnd}>
                            <SortableContext items={orderedPanels} strategy={rectSortingStrategy}>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {orderedPanels.map((id) => {
                                        const panel = PANEL_META[id];
                                        return (
                                            <SortablePanelLink
                                                key={id}
                                                id={id}
                                                title={panel.title}
                                                href={panel.href}
                                                description={panel.description}
                                                icon={panel.icon}
                                                accent={panel.accent}
                                            />
                                        );
                                    })}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {orderedPanels.map((id) => {
                                const panel = PANEL_META[id];
                                return (
                                    <div key={id} className={`rounded-lg border border-zinc-800 bg-zinc-950/70 p-4`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <panel.icon className={`h-4 w-4 ${panel.accent}`} />
                                            <span className="text-sm font-semibold text-zinc-100">{panel.title}</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 leading-relaxed">{panel.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {showCompatDataWarning ? (
                <Card className="bg-amber-950/20 border-amber-800/60">
                    <CardContent className="pt-6">
                        <p className="text-sm text-amber-200 font-medium">Operational MCP data is currently unavailable.</p>
                        <p className="text-xs text-amber-300/80 mt-1">
                            Dashboard navigation is still available, but server/tool lists are empty while running in <span className="font-semibold">{compatMode}</span> mode.
                            This usually means the upstream contract is bridged/fallback only or upstream auth is not available for protected procedures.
                        </p>
                    </CardContent>
                </Card>
            ) : null}

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-fuchsia-400" />
                            OpenCode Autopilot (Patched into MetaMCP)
                        </CardTitle>
                        <p className="text-xs text-zinc-500 mt-1">Use embedded mode below or launch full Autopilot dashboard.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                            onClick={() => setShowAutopilotEmbed((v) => !v)}
                        >
                            {showAutopilotEmbed ? 'Hide Embed' : 'Show Embed'}
                        </Button>
                        <Link
                            href="/dashboard/autopilot"
                            className="inline-flex items-center rounded-md bg-fuchsia-700 px-3 py-2 text-xs font-medium text-white hover:bg-fuchsia-600 transition-colors"
                        >
                            Open Subpage
                        </Link>
                        <a
                            href={autopilotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Standalone
                        </a>
                    </div>
                </CardHeader>
                {showAutopilotEmbed ? (
                    <CardContent className="pt-0">
                        <div className="h-[520px] rounded-lg border border-zinc-800 overflow-hidden bg-black">
                            <iframe
                                src={autopilotUrl}
                                className="w-full h-full border-none"
                                title="OpenCode Autopilot Embedded"
                                allow="clipboard-read; clipboard-write"
                            />
                        </div>
                    </CardContent>
                ) : null}
            </Card>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Servers</CardTitle>
                        <Server className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{servers?.length ?? 0}</div>
                        <p className="text-xs text-zinc-500">configured endpoints</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Tools</CardTitle>
                        <Wrench className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{tools?.length ?? 0}</div>
                        <p className="text-xs text-zinc-500">available capabilities</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Connections</CardTitle>
                        <RefreshCw className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{(status as any)?.connectedCount ?? 0}</div>
                        <p className="text-xs text-zinc-500">live sessions</p>
                    </CardContent>
                </Card>
            </div>

            {isAddOpen && (
                <AddServerForm onSuccess={() => { setIsAddOpen(false); refetchServers(); }} />
            )}

            {isBulkImportOpen && (
                <BulkImportForm onSuccess={() => { setIsBulkImportOpen(false); refetchServers(); }} />
            )}

            {/* Tab Switcher */}
            <div className="flex gap-2 border-b border-zinc-800 pb-2">
                <button
                    onClick={() => setActiveTab('servers')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t transition-colors ${activeTab === 'servers' ? 'bg-zinc-800 text-white border-b-2 border-blue-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                >
                    <Server className="h-4 w-4" /> Servers
                </button>
                <button
                    onClick={() => setActiveTab('tools')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t transition-colors ${activeTab === 'tools' ? 'bg-zinc-800 text-white border-b-2 border-purple-500' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
                >
                    <Wrench className="h-4 w-4" /> Tools
                </button>
            </div>

            {activeTab === 'servers' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {isLoadingServers ? (
                        <div className="col-span-3 flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                        </div>
                    ) : (servers?.length ?? 0) === 0 ? (
                        <div className="col-span-3 text-center p-12 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
                            <Server className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No MCP Servers Configured</p>
                            <p className="text-sm mt-1">Add a server configuration to start using external tools.</p>
                        </div>
                    ) : servers?.map((server: any) => (
                        <ServerCard key={server.uuid ?? server.name} server={server} onRemoved={refetchServers} />
                    ))}
                </div>
            )}

            {activeTab === 'tools' && (
                <div className="space-y-3">
                    {isLoadingTools ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                        </div>
                    ) : (tools?.length ?? 0) === 0 ? (
                        <div className="text-center p-12 text-zinc-500 bg-zinc-900/50 rounded-lg border border-zinc-800 border-dashed">
                            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">
                                {compatMode === 'bridge' || compatMode === 'fallback' ? 'Tool Inventory Unavailable' : 'No Tools Discovered'}
                            </p>
                            <p className="text-sm mt-1">
                                {compatMode === 'bridge' || compatMode === 'fallback'
                                    ? 'Bridge/fallback mode cannot provide full tool inventory for this upstream contract.'
                                    : 'Wait for servers to connect and sync their tools.'}
                            </p>
                        </div>
                    ) : tools?.map((tool: any) => (
                        <div key={tool.uuid} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex justify-between items-start hover:border-zinc-700 transition-colors">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="font-mono text-sm text-blue-400 font-semibold">{tool.name}</div>
                                    <span className="text-zinc-600 text-xs">v1.0</span>
                                </div>
                                <div className="text-sm text-zinc-400 mt-1 line-clamp-2">{tool.description}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                    {tool.mcp_server_uuid ? 'Managed' : 'System'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SortablePanelLink({
    id,
    title,
    href,
    description,
    icon: Icon,
    accent,
}: {
    id: string;
    title: string;
    href: string;
    description: string;
    icon: any;
    accent: string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-lg border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 transition-colors ${isDragging ? 'opacity-70 ring-1 ring-blue-500' : ''}`}
        >
            <div className="flex items-start justify-between gap-3 p-4">
                <Link href={href} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${accent}`} />
                        <span className="text-sm font-semibold text-zinc-100">{title}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
                </Link>
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="text-zinc-500 hover:text-zinc-200 text-xs px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label={`Drag ${title} panel`}
                >
                    Drag
                </button>
            </div>
        </div>
    );
}

function ServerCard({ server, onRemoved }: { server: any; onRemoved: () => void }) {
    const removeMutation = trpc.mcpServers.delete.useMutation({
        onSuccess: () => {
            toast.success("Server removed successfully");
            onRemoved();
        },
        onError: (err) => {
            toast.error(`Failed to remove server: ${err.message}`);
        }
    });

    const envCount = server.env ? Object.keys(JSON.parse(JSON.stringify(server.env))).length : 0;

    return (
        <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium text-zinc-200 flex items-center gap-2 truncate">
                    <Box className="h-5 w-5 text-blue-500" />
                    <span className="truncate">{server.name}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <StatusBadge status={server.error_status === 'NONE' ? 'active' : 'error'} />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove server "${server.name}"? This cannot be undone.`)) {
                                removeMutation.mutate({ uuid: server.uuid });
                            }
                        }}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Server"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="bg-black/40 rounded p-2.5 font-mono text-xs text-zinc-400 overflow-hidden">
                        <div className="flex gap-2">
                            <span className="text-blue-500">$</span>
                            <span className="truncate">
                                {server.command} {server.args?.join(' ')}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-800/50 p-2 rounded flex flex-col">
                            <span className="text-zinc-500">Transport</span>
                            <span className="text-zinc-300 font-medium">{server.type}</span>
                        </div>
                        <div className="bg-zinc-800/50 p-2 rounded flex flex-col">
                            <span className="text-zinc-500">Environment</span>
                            <span className="text-zinc-300 font-medium">{envCount} vars</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors = {
        active: "bg-green-500/10 text-green-500 border-green-500/20",
        inactive: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
        error: "bg-red-500/10 text-red-500 border-red-500/20"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${colors[status as keyof typeof colors] || colors.inactive}`}>
            {status}
        </span>
    );
}

function AddServerForm({ onSuccess }: { onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        command: 'npx',
        args: '',
        env: ''
    });

    const createMutation = trpc.mcpServers.create.useMutation({
        onSuccess: () => {
            toast.success("Server added successfully");
            onSuccess();
        },
        onError: (err) => {
            toast.error(`Error adding server: ${err.message}`);
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let envParsed: Record<string, string> = {};
        if (formData.env.trim()) {
            try {
                envParsed = JSON.parse(formData.env);
            } catch {
                toast.error("Invalid JSON in Environment variables");
                return;
            }
        }

        createMutation.mutate({
            name: formData.name,
            type: 'STDIO',
            command: formData.command,
            args: formData.args.split(' ').filter(Boolean),
            env: envParsed,
        });
    };

    return (
        <Card className="bg-zinc-900 border-zinc-700 mb-8 border-l-4 border-l-blue-600 shadow-xl">
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Terminal className="h-3 w-3" /> STDIO Configuration
                    </div>
                    <Button variant="ghost" size="sm" onClick={onSuccess} className="text-zinc-500 hover:text-white h-6 w-6 p-0 rounded-full">
                        X
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Server Name</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. weather-server"
                        />
                        <p className="text-xs text-zinc-600 mt-1">Unique identifier for this server.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Command</label>
                            <input
                                required
                                value={formData.command}
                                onChange={e => setFormData({ ...formData, command: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Args (space separated)</label>
                            <input
                                value={formData.args}
                                onChange={e => setFormData({ ...formData, args: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="-y @modelcontextprotocol/server-memory"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Environment Variables (JSON)</label>
                        <textarea
                            value={formData.env}
                            onChange={e => setFormData({ ...formData, env: e.target.value })}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white font-mono h-24 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder='{"API_KEY": "xyz"}'
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Server
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function BulkImportForm({ onSuccess }: { onSuccess: () => void }) {
    const [jsonConfig, setJsonConfig] = useState('');

    const importMutation = trpc.mcpServers.bulkImport.useMutation({
        onSuccess: (data) => {
            toast.success(`Imported ${data.length} servers.`);
            onSuccess();
        },
        onError: (err) => {
            toast.error(`Import failed: ${err.message}`);
        }
    });

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const parsed = JSON.parse(jsonConfig);
            if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
                throw new Error("Invalid config: missing 'mcpServers' object");
            }

            const serversToImport = Object.entries(parsed.mcpServers).map(([name, config]: [string, any]) => {
                const type: "STDIO" | "SSE" = config.url ? 'SSE' : 'STDIO';
                return {
                    name,
                    type,
                    command: config.command,
                    args: config.args,
                    env: config.env,
                    url: config.url,
                };
            });

            importMutation.mutate(serversToImport);
        } catch (err: any) {
            toast.error(`Invalid JSON or schema: ${err.message}`);
        }
    };

    return (
        <Card className="bg-zinc-900 border-zinc-700 mb-8 border-l-4 border-l-purple-600 shadow-xl">
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Upload className="h-3 w-3" /> Bulk Import
                    </div>
                    <Button variant="ghost" size="sm" onClick={onSuccess} className="text-zinc-500 hover:text-white h-6 w-6 p-0 rounded-full">
                        X
                    </Button>
                </div>

                <form onSubmit={handleImport} className="space-y-5">
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Claude Desktop Config (JSON)</label>
                        <p className="text-xs text-zinc-400 mb-2">Paste the content of your <code>claude_desktop_config.json</code> file here.</p>
                        <textarea
                            value={jsonConfig}
                            onChange={e => setJsonConfig(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-white font-mono h-48 focus:ring-1 focus:ring-purple-500 outline-none"
                            placeholder='{ "mcpServers": { "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] } } }'
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={importMutation.isPending} className="bg-purple-600 hover:bg-purple-500 text-white font-medium">
                            {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import Configuration
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
