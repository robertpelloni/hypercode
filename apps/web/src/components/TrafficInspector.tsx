"use client";

import { useEffect, useState, useRef } from 'react';
import { createReconnectPolicy, getReconnectDelayMs, resolveCoreWsUrl, shouldRetryReconnect } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';

interface Packet {
    id: string;
    type: 'TOOL_CALL_START' | 'TOOL_CALL_END' | 'BROWSER_LOG' | 'KNOWLEDGE_CAPTURED' | 'BROWSER_DEBUG_EVENT' | 'BROWSER_CHAT_SURFACE' | 'MCP_TRAFFIC';
    tool?: string;
    args?: any;
    contextPreview?: string;
    contextMatchedPaths?: string[];
    contextObservationCount?: number;
    contextSummaryCount?: number;
    result?: string;
    duration?: number;
    success?: boolean;
    timestamp: number;
    level?: string;
    content?: string;
    url?: string;
    source?: string;
    title?: string;
    preview?: string;
    method?: string;
    params?: unknown;
    tabId?: number | null;
    server?: string;
    trigger?: string;
    snapshot?: {
        adapterId?: string;
        adapterName?: string;
        url?: string;
        title?: string;
        messageCount?: number;
        toolCallCount?: number;
        toolCalls?: Array<{ name?: string; source?: string; preview?: string; parameters?: Array<{ name?: string; value?: string }> }>;
        functionResultCount?: number;
        functionResults?: Array<{ name?: string; source?: string; preview?: string; status?: string; summary?: string; fields?: Array<{ name?: string; value?: string }> }>;
        executions?: Array<{ id?: string; name?: string; state?: string; isStreaming?: boolean; callSource?: string; resultSource?: string; status?: string; summary?: string; parameters?: Array<{ name?: string; value?: string }>; fields?: Array<{ name?: string; value?: string }> }>;
        latestMessages?: Array<{ id?: string; sourceId?: string; text?: string; role?: string; isStreaming?: boolean }>;
    };
}

type PacketTypeFilter = Packet['type'] | 'ALL';
type PacketSourceFilter = 'ALL' | 'browser_extension' | 'vscode_extension' | 'unknown';

const PACKET_TYPE_FILTERS: Array<{ value: PacketTypeFilter; label: string }> = [
    { value: 'ALL', label: 'All events' },
    { value: 'TOOL_CALL_START', label: 'Tool starts' },
    { value: 'TOOL_CALL_END', label: 'Tool results' },
    { value: 'MCP_TRAFFIC', label: 'MCP traffic' },
    { value: 'BROWSER_LOG', label: 'Logs' },
    { value: 'BROWSER_CHAT_SURFACE', label: 'Chat surface' },
    { value: 'BROWSER_DEBUG_EVENT', label: 'CDP events' },
    { value: 'KNOWLEDGE_CAPTURED', label: 'Knowledge' },
];

const PACKET_SOURCE_FILTERS: Array<{ value: PacketSourceFilter; label: string }> = [
    { value: 'ALL', label: 'All sources' },
    { value: 'browser_extension', label: 'Browser ext' },
    { value: 'vscode_extension', label: 'VS Code ext' },
    { value: 'unknown', label: 'Unknown' },
];

function getPacketSearchText(packet: Packet): string {
    return [
        packet.type,
        packet.tool,
        packet.contextPreview,
        JSON.stringify(packet.contextMatchedPaths ?? []),
        packet.result,
        packet.content,
        packet.url,
        packet.source,
        packet.title,
        packet.preview,
        packet.method,
        typeof packet.params === 'string' ? packet.params : JSON.stringify(packet.params ?? {}),
        JSON.stringify(packet.snapshot?.executions ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
}

export function TrafficInspector() {
    const [packets, setPackets] = useState<Packet[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [customWsUrl, setCustomWsUrl] = useState<string>('');
    const [connectTrigger, setConnectTrigger] = useState(0); // Used to force reconnect
    const [typeFilter, setTypeFilter] = useState<PacketTypeFilter>('ALL');
    const [sourceFilter, setSourceFilter] = useState<PacketSourceFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectPolicy = createReconnectPolicy();

    useEffect(() => {
        // Prefer custom URL if set, otherwise let the shared endpoint resolver pick the canonical core WS target.
        const targetUrl = customWsUrl || process.env.NEXT_PUBLIC_CORE_WS_URL;
        const wsUrl = resolveCoreWsUrl(targetUrl);

        console.log(`[TrafficInspector] Connecting to: ${wsUrl}`);

        const connect = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }

            // Connect to HyperCode Core Bridge
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;
            };

            ws.onclose = () => {
                setIsConnected(false);
                if (shouldRetryReconnect(reconnectAttemptsRef.current, reconnectPolicy)) {
                    reconnectAttemptsRef.current += 1;
                    const delayMs = getReconnectDelayMs(reconnectAttemptsRef.current, reconnectPolicy);
                    setTimeout(connect, delayMs); // Reconnect with capped backoff
                }
            };

            ws.onerror = () => {
                // Let onclose handle capped retries.
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Filter for interesting events
                    if (msg.type === 'TOOL_CALL_START' || msg.type === 'TOOL_CALL_END') {
                        addPacket({
                            ...msg,
                            timestamp: msg.timestamp ?? Date.now()
                        });
                    } else if (msg.type === 'BROWSER_LOG') {
                        const payload = msg.payload ?? msg;
                        const timestamp = Number(payload.timestamp) || Date.now();
                        addPacket({
                            id: `browser-log-${timestamp}-${payload.url ?? 'unknown'}`,
                            type: 'BROWSER_LOG',
                            timestamp,
                            level: String(payload.level ?? 'log'),
                            content: String(payload.content ?? payload.message ?? ''),
                            url: String(payload.url ?? 'unknown'),
                            source: String(payload.source ?? 'browser_extension')
                        });
                    } else if (msg.type === 'KNOWLEDGE_CAPTURED') {
                        const payload = msg.payload ?? msg;
                        const timestamp = Number(payload.timestamp) || Date.now();
                        addPacket({
                            id: `knowledge-captured-${payload.id ?? timestamp}`,
                            type: 'KNOWLEDGE_CAPTURED',
                            timestamp,
                            title: String(payload.title ?? 'Captured Page'),
                            url: String(payload.url ?? ''),
                            source: String(payload.source ?? 'browser_extension'),
                            preview: String(payload.preview ?? '')
                        });
                    } else if (msg.type === 'BROWSER_DEBUG_EVENT') {
                        const payload = msg.payload ?? msg;
                        const timestamp = Number(payload.timestamp) || Date.now();
                        addPacket({
                            id: `browser-debug-${payload.tabId ?? 'unknown'}-${payload.method ?? 'event'}-${timestamp}`,
                            type: 'BROWSER_DEBUG_EVENT',
                            timestamp,
                            source: String(payload.source ?? 'browser_extension'),
                            method: String(payload.method ?? 'unknown'),
                            params: payload.params,
                            tabId: typeof payload.tabId === 'number' ? payload.tabId : null,
                        });
                    } else if (msg.type === 'BROWSER_CHAT_SURFACE') {
                        const payload = msg.payload ?? msg;
                        const timestamp = Number(payload.timestamp) || Date.now();
                        const snapshot = typeof payload.snapshot === 'object' && payload.snapshot !== null ? payload.snapshot : {};
                        addPacket({
                            id: `browser-chat-surface-${snapshot.adapterId ?? 'unknown'}-${timestamp}`,
                            type: 'BROWSER_CHAT_SURFACE',
                            timestamp,
                            source: String(payload.source ?? 'browser_extension'),
                            trigger: String(payload.trigger ?? 'mutation'),
                            snapshot: snapshot as Packet['snapshot'],
                            content: `${String(snapshot.adapterName ?? 'Unknown surface')} · ${Number(snapshot.messageCount ?? 0)} messages · ${Number(snapshot.toolCallCount ?? 0)} tool calls · ${Number(snapshot.functionResultCount ?? 0)} results`,
                            url: typeof snapshot.url === 'string' ? snapshot.url : undefined,
                        });
                    }
                } catch (e) { }
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            wsRef.current?.close();
        };
    }, [connectTrigger]);

    const addPacket = (packet: Packet) => {
        setPackets(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === packet.id && p.type === packet.type)) return prev;
            const newPackets = [packet, ...prev].slice(0, 50);
            return newPackets;
        });
    };

    const handleReplay = async () => {
        // logs router is not active — replay not available
        console.warn('[TrafficInspector] Log replay not available — logs router is disabled');
    };

    const filteredPackets = packets.filter((packet) => {
        const normalizedSource = packet.source === 'browser_extension' || packet.source === 'vscode_extension'
            ? packet.source
            : 'unknown';
        const matchesType = typeFilter === 'ALL' || packet.type === typeFilter;
        const matchesSource = sourceFilter === 'ALL' || normalizedSource === sourceFilter;
        const matchesSearch = !searchQuery.trim() || getPacketSearchText(packet).includes(searchQuery.trim().toLowerCase());
        return matchesType && matchesSource && matchesSearch;
    });

    const packetCounts = packets.reduce<Record<string, number>>((acc, packet) => {
        acc[packet.type] = (acc[packet.type] ?? 0) + 1;
        return acc;
    }, {});

    return (
        <div className="bg-black/80 rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <h2 className="font-mono font-bold text-zinc-300">NETWORK TRAFFIC (MCP)</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReplay}
                            className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded"
                        >
                            REPLAY LOGS
                        </button>
                        <button
                            onClick={() => setPackets([])}
                            className="text-xs text-zinc-500 hover:text-white"
                        >
                            CLEAR
                        </button>
                    </div>
                </div>

                {/* Connection Config Bar */}
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={customWsUrl}
                        onChange={(e) => setCustomWsUrl(e.target.value)}
                        placeholder="ws://localhost:3847"
                        className="flex-1 bg-black/50 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-400 focus:border-blue-500 outline-none"
                    />
                    <button
                        onClick={() => setConnectTrigger(prev => prev + 1)}
                        className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono"
                    >
                        CONNECT
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by text, URL, method, tool..."
                        className="bg-black/50 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-400 focus:border-blue-500 outline-none"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as PacketTypeFilter)}
                        className="bg-black/50 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-300 outline-none"
                    >
                        {PACKET_TYPE_FILTERS.map((filter) => (
                            <option key={filter.value} value={filter.value}>{filter.label}</option>
                        ))}
                    </select>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as PacketSourceFilter)}
                        className="bg-black/50 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-300 outline-none"
                    >
                        {PACKET_SOURCE_FILTERS.map((filter) => (
                            <option key={filter.value} value={filter.value}>{filter.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                    {PACKET_TYPE_FILTERS.filter((filter) => filter.value !== 'ALL').map((filter) => (
                        <span key={filter.value} className="px-2 py-1 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                            {filter.label}: <span className="text-zinc-200">{packetCounts[filter.value] ?? 0}</span>
                        </span>
                    ))}
                    <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-900/40">
                        Visible: {filteredPackets.length}
                    </span>
                </div>
            </div>

            {/* Packet Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
                {filteredPackets.length === 0 && (
                    <div className="text-zinc-600 text-center mt-20">
                        {isConnected ? 'Waiting for traffic...' : 'Traffic feed unavailable. Reconnecting to the live stream...'}
                    </div>
                )}
                {filteredPackets.map((p, i) => (
                    <PacketRow key={`${p.id}-${p.type}-${i}`} packet={p} />
                ))}
            </div>
        </div>
    );
}

function ToonRenderer({ data, previewLength, className }: { data: any, previewLength?: number, className?: string }) {
    if (!data) return <span>—</span>;
    
    // Auto-stringify objects if they aren't strings yet
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Check if it's TOON formatted
    if (typeof text !== 'string' || !text.includes('<toon>')) {
        return <span className={className}>{previewLength ? text.substring(0, previewLength) : text}</span>;
    }
    
    const match = text.match(/<toon>([\s\S]*?)<\/toon>/);
    if (!match) return <span className={className}>{previewLength ? text.substring(0, previewLength) : text}</span>;
    
    const toonContent = match[1].trim();
    const displayContent = previewLength && toonContent.length > previewLength 
        ? toonContent.substring(0, previewLength) + '... (truncated)' 
        : toonContent;
        
    return (
        <div className="mt-1 p-2 bg-emerald-950/20 border border-emerald-900/40 rounded font-mono text-xs text-emerald-400/90 whitespace-pre-wrap overflow-x-auto shadow-inner">
            <div className="text-emerald-500/40 mb-1 select-none font-bold text-[10px] tracking-widest leading-none">{'<TOON>'}</div>
            {displayContent}
            <div className="text-emerald-500/40 mt-1 select-none font-bold text-[10px] tracking-widest leading-none">{'</TOON>'}</div>
        </div>
    );
}

function PacketRow({ packet }: { packet: Packet }) {
    if (packet.type === 'BROWSER_LOG') {
        const level = packet.level ?? 'log';
        const icon = level === 'error' ? '🔴' : level === 'warn' ? '🟡' : '🔵';
        const borderColor = level === 'error'
            ? 'border-red-900/30 bg-red-900/10'
            : level === 'warn'
                ? 'border-yellow-900/30 bg-yellow-900/10'
                : 'border-sky-900/30 bg-sky-900/10';

        return (
            <div className={`p-3 rounded border ${borderColor} transition-all hover:bg-zinc-800/50`}>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold">{icon}</span>
                        <span className="text-zinc-200 font-bold">BROWSER LOG</span>
                        <span className="text-xs text-zinc-500 uppercase">{level}</span>
                        <span className="text-xs text-emerald-400/80 uppercase">{packet.source ?? 'browser_extension'}</span>
                        <span className="text-xs text-zinc-600 truncate">{packet.url}</span>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                </div>
                <div className="mt-2 pl-6 text-xs text-zinc-300 break-all whitespace-pre-wrap">
                    <ToonRenderer data={packet.content} />
                </div>
            </div>
        );
    }

    if (packet.type === 'KNOWLEDGE_CAPTURED') {
        return (
            <div className="p-3 rounded border border-emerald-900/30 bg-emerald-900/10 transition-all hover:bg-zinc-800/50">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-emerald-400">🧠</span>
                        <span className="text-zinc-200 font-bold truncate">{packet.title}</span>
                        <span className="text-xs text-zinc-600 truncate">{packet.url}</span>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                </div>
                <div className="mt-2 pl-6 text-xs text-zinc-400 break-all">
                    Source: <span className="text-emerald-300/80">{packet.source}</span>
                </div>
                {packet.preview && (
                    <div className="mt-1 pl-6 text-xs text-zinc-500 break-all">
                        Preview: <ToonRenderer data={packet.preview} previewLength={500} />
                    </div>
                )}
            </div>
        );
    }

    if (packet.type === 'BROWSER_DEBUG_EVENT') {
        return (
            <div className="p-3 rounded border border-amber-900/30 bg-amber-900/10 transition-all hover:bg-zinc-800/50">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-amber-400">🪲</span>
                        <span className="text-zinc-200 font-bold">CDP EVENT</span>
                        <span className="text-xs text-amber-300 uppercase">{packet.method}</span>
                        <span className="text-xs text-zinc-500 uppercase">tab {packet.tabId ?? 'n/a'}</span>
                        <span className="text-xs text-emerald-400/80 uppercase">{packet.source ?? 'browser_extension'}</span>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                </div>
                <div className="mt-2 pl-6 text-xs text-zinc-300">
                    <ToonRenderer data={packet.params} previewLength={800} className="break-all whitespace-pre-wrap" />
                </div>
            </div>
        );
    }

    if (packet.type === 'BROWSER_CHAT_SURFACE') {
        const toolCalls = packet.snapshot?.toolCalls ?? [];
        const functionResults = packet.snapshot?.functionResults ?? [];
        const executions = packet.snapshot?.executions ?? [];
        const latestMessages = packet.snapshot?.latestMessages ?? [];

        return (
            <div className="p-3 rounded border border-cyan-900/30 bg-cyan-900/10 transition-all hover:bg-zinc-800/50">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-cyan-400">💬</span>
                        <span className="text-zinc-200 font-bold">CHAT SURFACE</span>
                        <span className="text-xs text-cyan-300 uppercase">{packet.snapshot?.adapterName ?? 'unknown'}</span>
                        <span className="text-xs text-zinc-500 uppercase">{packet.trigger ?? 'mutation'}</span>
                        <span className="text-xs text-emerald-400/80 uppercase">{packet.source ?? 'browser_extension'}</span>
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                </div>
                <div className="mt-2 pl-6 text-xs text-zinc-300 break-all">
                    {packet.content}
                    {packet.url ? <div className="mt-1 text-zinc-500">{packet.url}</div> : null}
                </div>
                {toolCalls.length > 0 ? (
                    <div className="mt-2 pl-6 text-xs text-cyan-200/90 break-all">
                        Tool calls: {toolCalls.map((tool) => {
                            const parameterSummary = tool.parameters?.length
                                ? ` [${tool.parameters.map((parameter) => `${parameter.name ?? 'value'}=${parameter.value ?? ''}`).join(', ')}]`
                                : '';
                            return `${tool.name ?? 'unknown'} (${tool.source ?? 'unknown'})${parameterSummary}`;
                        }).join(', ')}
                    </div>
                ) : null}
                {functionResults.length > 0 ? (
                    <div className="mt-2 pl-6 text-xs text-emerald-200/90 break-all">
                        Function results: {functionResults.map((result) => {
                            const statusSummary = result.status ? ` [${result.status}]` : '';
                            const fieldSummary = result.fields?.length
                                ? ` {${result.fields.map((field) => `${field.name ?? 'value'}=${field.value ?? ''}`).join(', ')}}`
                                : '';
                            const summary = result.summary ? ` — ${result.summary}` : '';
                            return `${result.name ?? 'unknown'} (${result.source ?? 'unknown'})${statusSummary}${fieldSummary}${summary}`;
                        }).join(', ')}
                    </div>
                ) : null}
                {executions.length > 0 ? (
                    <div className="mt-2 pl-6 text-xs text-violet-200/90 space-y-1">
                        <div className="text-violet-300">Execution timeline:</div>
                        {executions.map((execution) => {
                            const parameterSummary = execution.parameters?.length
                                ? ` [${execution.parameters.map((parameter) => `${parameter.name ?? 'value'}=${parameter.value ?? ''}`).join(', ')}]`
                                : '';
                            const fieldSummary = execution.fields?.length
                                ? ` {${execution.fields.map((field) => `${field.name ?? 'value'}=${field.value ?? ''}`).join(', ')}}`
                                : '';
                            const statusSummary = execution.status ? ` [${execution.status}]` : '';
                            const sourceSummary = [execution.callSource, execution.resultSource].filter(Boolean).join(' → ');
                            const sourceSuffix = sourceSummary ? ` (${sourceSummary})` : '';
                            const summary = execution.summary ? ` — ${execution.summary}` : '';
                            return (
                                <div key={execution.id ?? `${execution.name ?? 'unknown'}-${execution.state ?? 'unknown'}`} className="break-all">
                                    • <span className="text-violet-100">{execution.name ?? 'unknown'}</span> <span className="uppercase text-[10px] text-violet-400">{execution.state ?? 'unknown'}</span>{execution.isStreaming ? <span className="ml-2 uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">streaming</span> : null}{sourceSuffix}{statusSummary}{parameterSummary}{fieldSummary}{summary}
                                </div>
                            );
                        })}
                    </div>
                ) : null}
                {latestMessages.length > 0 ? (
                    <div className="mt-2 pl-6 text-xs text-zinc-400 space-y-1">
                        {latestMessages.slice(-2).map((message) => (
                            <div key={message.id ?? message.text} className="break-all flex items-center gap-2">
                                <span>•</span>
                                {message.role ? <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-cyan-300 border border-zinc-700">{message.role}</span> : null}
                                {message.isStreaming ? <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">streaming</span> : null}
                                <span>{message.text}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }

    if (packet.type === 'MCP_TRAFFIC') {
        const borderColor = packet.success ? 'border-violet-900/30 bg-violet-900/10' : 'border-red-900/30 bg-red-900/10';
        const iconColor = packet.success ? 'text-violet-400' : 'text-red-400';

        return (
            <div className={`p-3 rounded border ${borderColor} transition-all hover:bg-zinc-800/50`}>
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-bold ${iconColor}`}>⬢</span>
                        <span className="text-zinc-200 font-bold">{packet.method}</span>
                        <span className="text-xs text-violet-300 uppercase">{packet.server}</span>
                        {packet.tool ? <span className="text-xs text-zinc-500 uppercase">tool {packet.tool}</span> : null}
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">
                        {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                    </span>
                </div>
                <div className="mt-2 pl-6 text-xs text-zinc-300 break-all">
                    Params: <ToonRenderer data={packet.content} className="text-violet-200/80" />
                    <div className="mt-1 text-zinc-500">Latency: {packet.duration}ms</div>
                </div>
            </div>
        );
    }

    const isStart = packet.type === 'TOOL_CALL_START';

    // Color coding
    const borderColor = isStart ? 'border-blue-900/30' : (packet.success ? 'border-green-900/30' : 'border-red-900/30');
    const bgColor = isStart ? 'bg-blue-900/10' : (packet.success ? 'bg-green-900/10' : 'bg-red-900/10');
    const icon = isStart ? '→' : (packet.success ? '✓' : '✗');
    const iconColor = isStart ? 'text-blue-400' : (packet.success ? 'text-green-400' : 'text-red-400');

    return (
        <div className={`p-3 rounded border ${borderColor} ${bgColor} transition-all hover:bg-zinc-800/50`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <span className={`font-bold ${iconColor}`}>{icon}</span>
                    <span className="text-zinc-300 font-bold">{packet.tool}</span>
                    <span className="text-xs text-zinc-600">#{packet.id.substring(0, 4)}</span>
                </div>
                <span className="text-xs text-zinc-600">
                    {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                </span>
            </div>

            {/* Details */}
            <div className="mt-2 pl-6">
                {isStart ? (
                    <div className="text-zinc-400 break-all text-xs">
                        Args: <ToonRenderer data={packet.args} previewLength={500} className="text-blue-300/80" />
                        {packet.contextPreview ? (
                            <div className="mt-1 text-cyan-300/90">
                                <ToonRenderer data={packet.contextPreview} />
                                {(packet.contextMatchedPaths?.length ?? 0) > 0 ? (
                                    <span className="text-zinc-500"> · {packet.contextMatchedPaths?.join(', ')}</span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="text-zinc-400 break-all text-xs">
                        Result: <ToonRenderer data={packet.result} previewLength={1000} className="text-zinc-500" />
                        <div className="mt-1 text-zinc-600">
                            Duration: {packet.duration}ms
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
