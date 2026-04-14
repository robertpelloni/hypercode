"use client";

import React from "react";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@hypercode/ui";
import { Badge } from "@hypercode/ui";
import { Button } from "@hypercode/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hypercode/ui";
import { ScrollArea } from "@hypercode/ui";
import { Bot, Wrench, Server, Cpu, Activity, Zap, Loader2, RefreshCw, AlertTriangle, Chrome, Globe, PlugZap, Route, LayoutPanelTop, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PageStatusBanner } from "@/components/PageStatusBanner";

interface ToolItem {
    uuid: string;
    name: string;
    description?: string;
    serverId?: string;
}

interface ServerItem {
    id: string;
    name: string;
    status?: string;
    transport?: string;
}

type PlatformSupport = {
    name: string;
    host: string;
    browsers: string[];
    supportLevel: 'Generic bridge live' | 'Adapter scaffold live';
    note: string;
};

type CapabilityItem = {
    title: string;
    status: 'shipped' | 'next';
    note: string;
};

const PLATFORM_SUPPORT: PlatformSupport[] = [
    { name: 'ChatGPT', host: 'chatgpt.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Page capture, chat paste, logs, screenshot, history/debug tooling, plus HyperCode sidebar/input detection.' },
    { name: 'Claude', host: 'claude.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Bridge surface active with HyperCode sidebar scaffold; Claude-specific automation loops are a later slice.' },
    { name: 'Gemini', host: 'gemini.google.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Current bridge can ingest/scrape/paste and detect input/submit controls while deeper automation remains pending.' },
    { name: 'Google AI Studio', host: 'aistudio.google.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Newly included in HyperCode manifest parity footprint with sidebar shell support.' },
    { name: 'Perplexity', host: 'perplexity.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Bridge available across both bare and www hostnames with adapter registry coverage.' },
    { name: 'Grok', host: 'grok.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Ready for HyperCode-side browser bridge features and injected sidebar actions.' },
    { name: 'DeepSeek', host: 'chat.deepseek.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Bridge footprint now matches the MCP-SA reference surface and mounts the adapter shell.' },
    { name: 'OpenRouter', host: 'openrouter.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Transport-agnostic bridge support with HyperCode’s current sidebar scaffold.' },
    { name: 'T3 Chat', host: 't3.chat', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Manifest-level parity plus inline HyperCode sidebar actions.' },
    { name: 'GitHub Copilot', host: 'github.com/copilot', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Bridge injected on Copilot web routes; richer DOM semantics come later.' },
    { name: 'Mistral', host: 'chat.mistral.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'HyperCode bridge now mounts here as part of the common chat footprint and sidebar slice.' },
    { name: 'Kimi', host: 'kimi.com', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Reference-compatible surface enabled with HyperCode adapter shell.' },
    { name: 'Qwen Chat', host: 'chat.qwen.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Manifest-level compatibility plus scaffolded HyperCode inline controls.' },
    { name: 'Z.ai', host: 'chat.z.ai', browsers: ['Chrome', 'Edge', 'Firefox'], supportLevel: 'Adapter scaffold live', note: 'Reference-compatible bridge footprint with sidebar shell enabled.' },
];

const IMPLEMENTED_CAPABILITIES: CapabilityItem[] = [
    { title: 'Generic browser-chat bridge', status: 'shipped', note: 'Content script and background bridge now mount across the MCP-SA-style platform set.' },
    { title: 'Host-aware adapter registry', status: 'shipped', note: 'Supported browser-chat surfaces now resolve through HyperCode’s first-pass adapter registry with per-host input and submit selectors.' },
    { title: 'Injected sidebar shell', status: 'shipped', note: 'A HyperCode shadow-DOM sidebar now mounts directly inside supported chat surfaces with quick actions and runtime status.' },
    { title: 'Chat-surface observer scaffold', status: 'shipped', note: 'Supported surfaces now emit stable DOM-backed message IDs when available, adapter-aware best-effort message roles/streaming flags, closed or still-streaming fenced tool-call parameters, plain-text hints, structured function-result summaries, and a lightweight execution timeline with per-execution streaming state into the HyperCode traffic inspector via the extension bridge.' },
    { title: 'Knowledge capture + RAG ingest', status: 'shipped', note: 'Popup actions send absorbed page content and URL/text ingestion into HyperCode core.' },
    { title: 'Chat paste / remote control bridge', status: 'shipped', note: 'Core can push text back into the active browser surface via the extension channel, now preferring adapter-aware input insertion before page fallbacks.' },
    { title: 'History, screenshot, proxy fetch, CDP debug', status: 'shipped', note: 'Backed by HyperCode bridge methods and surfaced in the Browser dashboard.' },
    { title: 'Manifest-level cross-browser footprint', status: 'shipped', note: 'Chrome, Edge, and Firefox now share the widened chat host coverage.' },
];

const NEXT_CAPABILITIES: CapabilityItem[] = [
    { title: 'Per-site DOM automation depth', status: 'next', note: 'The current registry now uses adapter-aware role and streaming heuristics for key surfaces, detects inputs, submit controls, and both structured fenced/plain-text tool-call or function-result snapshots—including unfinished streaming fences—but richer per-site observers and deep capability negotiation are still pending.' },
    { title: 'Auto-execute / auto-insert / auto-submit loops', status: 'next', note: 'Automation toggles and trusted-tool governance are not yet extension-native.' },
    { title: 'Prompt templates / context manager / macro builder', status: 'next', note: 'Those UX systems need HyperCode-native versions wired into the browser extension.' },
    { title: 'Function-call parser + tool result widgets', status: 'next', note: 'HyperCode now captures lightweight result status/field summaries plus execution correlation, but the full AST/render prescript layer and inline widgets have not been assimilated yet.' },
];

const TRANSPORTS = [
    { name: 'HTTP control plane', note: 'Health checks, knowledge capture, URL ingest, and RAG ingest route over HyperCode core HTTP endpoints.' },
    { name: 'WebSocket event bridge', note: 'Live browser logs, mirror updates, chat control, and debugger traffic stream through the HyperCode core bridge.' },
    { name: 'Dashboard/operator bridge', note: 'The Browser dashboard already exposes screenshot, scrape, history search, proxy fetch, and CDP commands via tRPC.' },
];

type NormalizedArrayResult<T> = {
    data: T[];
    invalid: boolean;
};

function normalizeArray<T>(value: unknown): NormalizedArrayResult<T> {
    if (value == null) return { data: [], invalid: false };
    if (!Array.isArray(value)) return { data: [], invalid: true };
    return { data: value as T[], invalid: false };
}

export default function SuperAssistantDashboardPage() {
    const toolsQuery = trpc.tools.list.useQuery();
    const serversQuery = trpc.mcpServers.list.useQuery();
    const skillsQuery = trpc.skills.list.useQuery();
    const browserStatusQuery = trpc.browser.status.useQuery(undefined, { refetchInterval: 5000 });

    const rawTools = toolsQuery.data;
    const rawServers = serversQuery.data;
    const rawSkills = skillsQuery.data;

    const normalizedTools = normalizeArray<ToolItem>(rawTools);
    const normalizedServers = normalizeArray<ServerItem>(rawServers);
    const normalizedSkills = normalizeArray<{ id: string; name: string; description: string }>(rawSkills);
    const tools = normalizedTools.data;
    const servers = normalizedServers.data;
    const skills = normalizedSkills.data;
    const browserStatus = browserStatusQuery.data;

    const activeServers = servers.filter((s) => s.status === "connected" || s.status === "active");
    const toolInventoryUnavailable = toolsQuery.isError || normalizedTools.invalid;
    const serverInventoryUnavailable = serversQuery.isError || normalizedServers.invalid;
    const skillInventoryUnavailable = skillsQuery.isError || normalizedSkills.invalid;
    const browserStatusUnavailable = browserStatusQuery.isError;
    const failedSources = [
        toolInventoryUnavailable ? 'Tools' : null,
        serverInventoryUnavailable ? 'Servers' : null,
        skillInventoryUnavailable ? 'Skills' : null,
        browserStatusUnavailable ? 'Browser status' : null,
    ].filter((value): value is string => Boolean(value));
    const hasErrors = failedSources.length > 0;
    const isLoading = toolsQuery.isLoading || serversQuery.isLoading || skillsQuery.isLoading || browserStatusQuery.isLoading;
    const toolInventoryError = toolsQuery.error?.message ?? 'Tool inventory is unavailable.';
    const serverInventoryError = serversQuery.error?.message ?? 'Server inventory is unavailable.';
    const skillInventoryError = skillsQuery.error?.message ?? 'Skill inventory is unavailable.';
    const browserStatusError = browserStatusQuery.error?.message ?? 'Browser bridge status is unavailable.';

    const handleRefresh = async () => {
        await Promise.all([
            toolsQuery.refetch(),
            serversQuery.refetch(),
            skillsQuery.refetch(),
            browserStatusQuery.refetch(),
        ]);
    };

    return (
        <div className="w-full h-full flex flex-col">
            <PageStatusBanner status="beta" message="Browser Bridge" note="Adapter scaffolds are live across all 14 platforms. Per-site automation depth and input/submit integration vary — full parity is a later release slice." />
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-400" /> Browser Bridge
                        </h1>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-xs">Beta</Badge>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                        HyperCode browser-extension assimilation surface — shared platform footprint first, per-site adapter parity next.
                    </p>
                </div>
                <div className="flex gap-2">
                    {hasErrors ? (
                        <Badge variant="outline" className="border-rose-600 text-rose-400">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Degraded
                        </Badge>
                    ) : null}
                    {isLoading ? (
                        <Badge variant="outline" className="border-blue-600 text-blue-400">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading
                        </Badge>
                    ) : null}
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400">
                        <Chrome className="w-3 h-3 mr-1" /> {PLATFORM_SUPPORT.length} Surfaces
                    </Badge>
                    <Badge variant="outline" className="border-green-600 text-green-400">
                        <Activity className="w-3 h-3 mr-1" /> {browserStatusUnavailable ? 'Bridge unavailable' : browserStatus?.available ? 'Bridge Ready' : 'Bridge Offline'}
                    </Badge>
                    <Badge variant="outline" className="border-purple-600 text-purple-400">
                        <Zap className="w-3 h-3 mr-1" /> {toolInventoryUnavailable ? '— Tools' : `${tools.length} Tools`}
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefresh}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-auto">
                {hasErrors ? (
                    <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-300 flex items-center justify-between gap-3">
                        <span>
                            Failed to load: {failedSources.join(', ')}. {browserStatusUnavailable ? browserStatusError : 'Showing only data sources that returned valid results.'}
                        </span>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefresh}>
                            Retry fetch
                        </Button>
                    </div>
                ) : null}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="platforms">Platforms ({PLATFORM_SUPPORT.length})</TabsTrigger>
                        <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                        <TabsTrigger value="inventory">Live Inventory</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Chrome className="w-4 h-4 text-cyan-400" /> Chat Surfaces
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{PLATFORM_SUPPORT.length}</div>
                                    <p className="text-xs text-gray-400 mt-1">Chrome, Edge, Firefox footprint now aligned to the reference surface</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <PlugZap className="w-4 h-4 text-emerald-400" /> Bridge Runtime
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{browserStatusUnavailable ? 'Unavailable' : browserStatus?.available ? 'Ready' : 'Offline'}</div>
                                    <p className="text-xs text-gray-400 mt-1">{browserStatusUnavailable ? 'Browser bridge status query failed.' : browserStatus?.active ? `${browserStatus.pageCount} active browser page(s)` : 'No active browser service pages'}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-blue-400" /> Assimilated Now
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{IMPLEMENTED_CAPABILITIES.length}</div>
                                    <p className="text-xs text-gray-400 mt-1">Bridge and operator-facing capabilities already live in HyperCode</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <ShieldAlert className="w-4 h-4 text-amber-400" /> Parity Backlog
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{NEXT_CAPABILITIES.length}</div>
                                    <p className="text-xs text-gray-400 mt-1">Deep DOM automation, execution loops, templates, and widget parsing remain</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <Route className="w-4 h-4 text-purple-400" /> Why this slice matters
                                    </CardTitle>
                                    <CardDescription>
                                        HyperCode now claims the browser-chat territory directly and ships a real inline sidebar shell without pretending the full automation stack is already done.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-zinc-300">
                                    <p>
                                        This slice broadens the actual extension injection footprint to the reference platform set, adds a host-aware adapter registry, and mounts a HyperCode-native sidebar directly into supported chat surfaces.
                                    </p>
                                    <p>
                                        In other words: the bridge and sidebar are real now, while the heavier automation loops and render/widget subsystems still come next. No cardboard cutouts, no vaporware confetti.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-sm">
                                        <LayoutPanelTop className="w-4 h-4 text-cyan-400" /> Active transports
                                    </CardTitle>
                                    <CardDescription>
                                        Current HyperCode-native routes carrying extension/browser traffic.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {TRANSPORTS.map((transport) => (
                                        <div key={transport.name} className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-3">
                                            <div className="font-medium text-white">{transport.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">{transport.note}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="platforms" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Supported Browser Chat Platforms</CardTitle>
                                <CardDescription>The current HyperCode browser-extension footprint across supported chat surfaces.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-2">
                                        {PLATFORM_SUPPORT.map((platform) => (
                                            <div key={platform.name} className="flex items-start justify-between gap-4 p-3 rounded border border-zinc-800 bg-zinc-900/50">
                                                <div>
                                                    <div className="font-medium text-white flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-cyan-400" /> {platform.name}
                                                    </div>
                                                    <div className="text-xs text-cyan-400 mt-1">{platform.host}</div>
                                                    <div className="text-xs text-gray-400 mt-2">{platform.note}</div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {platform.browsers.map((browser) => (
                                                            <Badge key={`${platform.name}-${browser}`} variant="outline" className="text-[10px]">
                                                                {browser}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                                                    {platform.supportLevel}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="capabilities" className="mt-4">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Implemented in HyperCode Now</CardTitle>
                                    <CardDescription>Operator-visible pieces already assimilated.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {IMPLEMENTED_CAPABILITIES.map((capability) => (
                                        <div key={capability.title} className="rounded border border-emerald-500/20 bg-emerald-950/10 px-3 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-medium text-white">{capability.title}</div>
                                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">Shipped</Badge>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-2">{capability.note}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Next Assimilation Slices</CardTitle>
                                    <CardDescription>Remaining browser-bridge differentiators to build HyperCode-native.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {NEXT_CAPABILITIES.map((capability) => (
                                        <div key={capability.title} className="rounded border border-amber-500/20 bg-amber-950/10 px-3 py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-medium text-white">{capability.title}</div>
                                                <Badge variant="outline" className="border-amber-500/30 text-amber-400">Next</Badge>
                                            </div>
                                            <div className="text-xs text-gray-400 mt-2">{capability.note}</div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="inventory" className="mt-4">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>MCP Tool Registry</CardTitle>
                                    <CardDescription>Live HyperCode tool inventory currently reachable.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[420px]">
                                        <div className="space-y-2">
                                            {toolInventoryUnavailable ? (
                                                <p className="text-rose-400 italic">{toolInventoryError}</p>
                                            ) : null}
                                            {tools.map((tool) => (
                                                <div key={tool.uuid} className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-3">
                                                    <div className="font-mono text-sm text-white">{tool.name}</div>
                                                    <div className="text-xs text-gray-400 mt-1">{tool.description || 'No description'}</div>
                                                </div>
                                            ))}
                                            {!toolInventoryUnavailable && tools.length === 0 && <p className="text-gray-500 italic">No tools registered yet.</p>}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Server Pool</CardTitle>
                                    <CardDescription>Connected MCP servers HyperCode can expose through the bridge.</CardDescription>
                                </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {serverInventoryUnavailable ? (
                                            <p className="text-rose-400 italic">{serverInventoryError}</p>
                                        ) : null}
                                        {servers.map((server) => (
                                            <div key={server.id} className="flex items-center justify-between p-3 rounded border border-zinc-800 bg-zinc-900/50">
                                                <div>
                                                    <div className="font-medium text-white">{server.name}</div>
                                                    <div className="text-xs text-gray-400">{server.transport || 'stdio'}</div>
                                                </div>
                                                <Badge variant={server.status === 'connected' ? 'default' : 'outline'}>
                                                    {server.status || 'unknown'}
                                                </Badge>
                                            </div>
                                        ))}
                                        {!serverInventoryUnavailable && servers.length === 0 && <p className="text-gray-500 italic">No MCP servers configured.</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Assimilated Skills</CardTitle>
                                    <CardDescription>Live HyperCode skill inventory adjacent to the extension/browser stack.</CardDescription>
                                </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {skillInventoryUnavailable ? (
                                            <p className="text-rose-400 italic">{skillInventoryError}</p>
                                        ) : null}
                                        {skills.map((skill) => (
                                            <div key={skill.id} className="flex items-center justify-between p-3 rounded border border-zinc-800 bg-zinc-900/50">
                                                <div>
                                                    <div className="font-medium text-white">{skill.name}</div>
                                                    <div className="text-xs text-gray-400">{skill.description}</div>
                                                </div>
                                                <Badge variant="outline" className="text-green-400">Active</Badge>
                                            </div>
                                        ))}
                                        {!skillInventoryUnavailable && skills.length === 0 && <p className="text-gray-500 italic">No skills assimilated.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
