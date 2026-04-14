"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, createReconnectPolicy, getReconnectDelayMs, resolveCoreWsUrl, shouldRetryReconnect } from "@hypercode/ui";
import { Loader2, Globe, Trash2, XCircle, Activity, Search, ExternalLink, Zap, Bug, Network, Camera, FileText, Brain, Database, AlertTriangle } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { MirrorView } from '@/components/MirrorView';

type BrowserHistoryItem = {
    title: string;
    url: string;
    visitCount: number;
};

type QueueEntry = {
    url: string;
    name: string;
    id: string | null;
    category: string | null;
    error?: string;
    attempts?: number;
    lastAttemptAt?: string | null;
    source?: string;
};

type BrowserKnowledgeActivityEvent = {
    id: string;
    kind: 'knowledge' | 'rag';
    timestamp: number;
    source: string;
    title: string;
    detail: string;
    subtitle?: string;
    url?: string;
    success?: boolean;
};

type BrowserStatusPayload = {
    active: boolean;
    pageCount: number;
    pageIds: string[];
};

type QueueSnapshotPayload = {
    updatedAt?: string | null;
    totals: {
        processed: number;
        pending: number;
        failed: number;
    };
    queue: {
        pending: QueueEntry[];
        failed: QueueEntry[];
        processed: QueueEntry[];
    };
};

function isQueueEntry(value: unknown): value is QueueEntry {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { url?: unknown }).url === 'string'
        && typeof (value as { name?: unknown }).name === 'string';
}

function isBrowserStatusPayload(value: unknown): value is BrowserStatusPayload {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { active?: unknown }).active === 'boolean'
        && typeof (value as { pageCount?: unknown }).pageCount === 'number'
        && Array.isArray((value as { pageIds?: unknown }).pageIds)
        && ((value as { pageIds: unknown[] }).pageIds.every((item) => typeof item === 'string'));
}

function isQueueSnapshotPayload(value: unknown): value is QueueSnapshotPayload {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { totals?: unknown }).totals === 'object'
        && (value as { totals?: unknown }).totals !== null
        && typeof ((value as { totals: { processed?: unknown } }).totals.processed) === 'number'
        && typeof ((value as { totals: { pending?: unknown } }).totals.pending) === 'number'
        && typeof ((value as { totals: { failed?: unknown } }).totals.failed) === 'number'
        && typeof (value as { queue?: unknown }).queue === 'object'
        && (value as { queue?: unknown }).queue !== null
        && Array.isArray(((value as { queue: { pending?: unknown } }).queue.pending))
        && Array.isArray(((value as { queue: { failed?: unknown } }).queue.failed))
        && Array.isArray(((value as { queue: { processed?: unknown } }).queue.processed))
        && ((value as { queue: { pending: unknown[]; failed: unknown[]; processed: unknown[] } }).queue.pending.every(isQueueEntry))
        && ((value as { queue: { pending: unknown[]; failed: unknown[]; processed: unknown[] } }).queue.failed.every(isQueueEntry))
        && ((value as { queue: { pending: unknown[]; failed: unknown[]; processed: unknown[] } }).queue.processed.every(isQueueEntry));
}

function renderUnknownValue(value: unknown, fallback = '—'): string {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return fallback;
    }
}

function parseJsonInput<T>(value: string, fallback: T): T {
    const trimmed = value.trim();
    if (!trimmed) {
        return fallback;
    }

    return JSON.parse(trimmed) as T;
}

function formatEventTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatQueueTimestamp(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function BrowserDashboard() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectPolicyRef = useRef(createReconnectPolicy());
    const reconnectPolicy = reconnectPolicyRef.current;
    const [historyQuery, setHistoryQuery] = useState('');
    const [historyLimit, setHistoryLimit] = useState(10);
    const [historyRequest, setHistoryRequest] = useState<{ query: string; maxResults: number } | null>(null);
    const [knowledgeActivity, setKnowledgeActivity] = useState<BrowserKnowledgeActivityEvent[]>([]);
    const [proxyUrl, setProxyUrl] = useState('https://example.com');
    const [proxyMethod, setProxyMethod] = useState('GET');
    const [proxyHeaders, setProxyHeaders] = useState('{\n  "Accept": "application/json"\n}');
    const [proxyBody, setProxyBody] = useState('');
    const [debugMethod, setDebugMethod] = useState('Runtime.evaluate');
    const [debugParams, setDebugParams] = useState('{\n  "expression": "document.title",\n  "returnByValue": true\n}');
    const { data: status, isLoading, error: statusError, refetch } = trpc.browser.status.useQuery(undefined, { refetchInterval: 3000 });
    const queueQuery = trpc.research.ingestionQueue.useQuery(undefined, { refetchInterval: 10000 });
    const historySearch = trpc.browser.searchHistory.useQuery(
        historyRequest ?? { query: '__idle__', maxResults: 10 },
        { enabled: historyRequest !== null }
    );
    const pageScrape = trpc.browser.scrapePage.useQuery(undefined, { enabled: false });
    const proxyFetchMutation = trpc.browser.proxyFetch.useMutation({
        onError: (err) => {
            toast.error(`Browser proxy fetch failed: ${err.message}`);
        }
    });
    const screenshotMutation = trpc.browser.screenshot.useMutation({
        onError: (err) => {
            toast.error(`Browser screenshot failed: ${err.message}`);
        }
    });
    const browserDebugMutation = trpc.browser.debug.useMutation({
        onError: (err) => {
            toast.error(`Browser debug action failed: ${err.message}`);
        }
    });

    const closePageMutation = trpc.browser.closePage.useMutation({
        onSuccess: () => {
            toast.success("Page closed");
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to close page: ${err.message}`);
        }
    });

    const closeAllMutation = trpc.browser.closeAll.useMutation({
        onSuccess: () => {
            toast.success("All browser sessions closed");
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to close all: ${err.message}`);
        }
    });

    useEffect(() => {
        const targetUrl = process.env.NEXT_PUBLIC_CORE_WS_URL || 'ws://localhost:3000';
        const wsUrl = resolveCoreWsUrl(targetUrl);

        const connect = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                reconnectAttemptsRef.current = 0;
            };

            ws.onclose = () => {
                if (shouldRetryReconnect(reconnectAttemptsRef.current, reconnectPolicy)) {
                    reconnectAttemptsRef.current += 1;
                    const delayMs = getReconnectDelayMs(reconnectAttemptsRef.current, reconnectPolicy);
                    window.setTimeout(connect, delayMs);
                }
            };

            ws.onerror = () => {
                ws.close();
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as Record<string, unknown>;
                    const messageType = typeof message.type === 'string' ? message.type : undefined;
                    const payloadCandidate = message.payload;
                    const payload: Record<string, unknown> = payloadCandidate && typeof payloadCandidate === 'object' && !Array.isArray(payloadCandidate)
                        ? payloadCandidate as Record<string, unknown>
                        : message;
                    const source = String(payload.source ?? 'unknown');
                    if (source !== 'browser_extension') {
                        return;
                    }

                    if (messageType === 'KNOWLEDGE_CAPTURED') {
                        const timestamp = Number(payload.timestamp) || Date.now();
                        const nextEvent: BrowserKnowledgeActivityEvent = {
                            id: String(payload.id ?? `knowledge-${timestamp}`),
                            kind: 'knowledge',
                            timestamp,
                            source,
                            title: String(payload.title ?? 'Captured browser context'),
                            detail: String(payload.preview ?? 'Saved page context into HyperCode memory.'),
                            subtitle: 'Memory capture',
                            url: String(payload.url ?? ''),
                            success: true,
                        };

                        setKnowledgeActivity((prev) => prev.some((item) => item.id === nextEvent.id)
                            ? prev
                            : [nextEvent, ...prev].slice(0, 8));
                    }

                    if (messageType === 'RAG_INGESTED') {
                        const timestamp = Number(payload.timestamp) || Date.now();
                        const chunksIngested = Number(payload.chunksIngested ?? 0);
                        const success = Boolean(payload.success);
                        const sourceName = String(payload.sourceName ?? 'browser-extension-page');
                        const nextEvent: BrowserKnowledgeActivityEvent = {
                            id: `rag-${sourceName}-${timestamp}`,
                            kind: 'rag',
                            timestamp,
                            source,
                            title: sourceName,
                            detail: success
                                ? `Ingested ${chunksIngested} chunk${chunksIngested === 1 ? '' : 's'} into RAG.`
                                : 'RAG ingestion reported an unsuccessful result.',
                            subtitle: 'RAG ingest',
                            success,
                        };

                        setKnowledgeActivity((prev) => prev.some((item) => item.id === nextEvent.id)
                            ? prev
                            : [nextEvent, ...prev].slice(0, 8));
                    }
                } catch {
                    // Ignore malformed traffic; the browser dashboard only cares about knowledge-related packets.
                }
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const handleHistorySearch = async () => {
        const trimmedQuery = historyQuery.trim();

        if (!trimmedQuery) {
            return;
        }

        try {
            const nextRequest = {
                query: trimmedQuery,
                maxResults: historyLimit,
            };

            if (
                historyRequest?.query === nextRequest.query
                && historyRequest?.maxResults === nextRequest.maxResults
            ) {
                await historySearch.refetch();
                return;
            }

            setHistoryRequest(nextRequest);
        } catch (err: any) {
            toast.error(`History search failed: ${err.message}`);
        }
    };

    const handleProxyFetch = async () => {
        try {
            const headers = parseJsonInput<Record<string, string>>(proxyHeaders, {});

            await proxyFetchMutation.mutateAsync({
                url: proxyUrl.trim(),
                method: proxyMethod,
                headers,
                body: proxyBody.trim() || undefined,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Invalid JSON input';
            toast.error(`Browser proxy fetch failed: ${message}`);
        }
    };

    const handleDebugAction = async (action: 'attach' | 'detach' | 'command') => {
        try {
            const params = action === 'command'
                ? parseJsonInput<Record<string, unknown>>(debugParams, {})
                : undefined;

            await browserDebugMutation.mutateAsync({
                action,
                method: action === 'command' ? debugMethod.trim() : undefined,
                params,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Invalid JSON input';
            toast.error(`Browser debug action failed: ${message}`);
        }
    };

    const handlePageScrape = async () => {
        try {
            await pageScrape.refetch();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`Browser scrape failed: ${message}`);
        }
    };

    const handleScreenshot = async () => {
        try {
            await screenshotMutation.mutateAsync();
        } catch {
            // handled by mutation onError
        }
    };

    const statusUnavailable = Boolean(statusError) || (status !== undefined && !isBrowserStatusPayload(status));
    const statusData = !statusUnavailable && isBrowserStatusPayload(status) ? status : undefined;
    const queueUnavailable = Boolean(queueQuery.error) || (queueQuery.data !== undefined && !isQueueSnapshotPayload(queueQuery.data));
    const queueData = !queueUnavailable && isQueueSnapshotPayload(queueQuery.data) ? queueQuery.data : undefined;
    const queueTotals = queueData?.totals;
    const pendingItems = queueData?.queue.pending.slice(0, 3) ?? [];
    const failedItems = queueData?.queue.failed.slice(0, 3) ?? [];
    const processedItems = queueData?.queue.processed.slice(0, 3) ?? [];
    const queueError = queueQuery.error?.message ?? null;
    const browserStatusError = statusError?.message ?? (statusUnavailable ? 'Browser status returned an invalid payload.' : null);
    const historyUnavailable = Boolean(historySearch.error)
        || (historySearch.data !== undefined && (!historySearch.data || !Array.isArray(historySearch.data.items)));

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-400" />
                        Semantic Browser
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Monitor and manage autonomous headless browser sessions
                    </p>
                </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg">
                            <Activity className={`h-5 w-5 ${browserStatusError ? 'text-rose-400' : statusData?.active ? 'text-green-500' : 'text-zinc-600'}`} />
                            <span className="text-sm font-medium text-zinc-300">
                                {isLoading ? 'Loading...' : browserStatusError ? 'Browser Unavailable' : statusData?.active ? 'Browser Active' : 'Idle'}
                            </span>
                        </div>
                        {statusData?.active && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => { if(confirm("Close all sessions?")) closeAllMutation.mutate(); }}
                            disabled={closeAllMutation.isPending}
                        >
                            <XCircle className="mr-2 h-4 w-4" /> Stop All
                        </Button>
                    )}
                </div>
            </div>

            {browserStatusError && (
                <Card className="bg-rose-950/40 border-rose-900/60 shadow-lg">
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-rose-200">Browser runtime unavailable</div>
                        <div className="mt-1 text-sm text-rose-300/90">{browserStatusError}</div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-muted-foreground">Open Pages</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : browserStatusError ? '—' : statusData?.pageCount || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Pages List */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                    <CardTitle className="text-lg font-bold text-blue-400 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Active Viewports
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                        </div>
                    ) : browserStatusError ? (
                        <div className="p-16 text-center text-rose-300">
                            <Globe className="h-12 w-12 mx-auto mb-4 opacity-40" />
                            <p className="text-lg">Browser runtime unavailable.</p>
                            <p className="text-sm mt-1 text-rose-300/80">{browserStatusError}</p>
                        </div>
                    ) : !statusData?.active || statusData.pageIds.length === 0 ? (
                        <div className="p-16 text-center text-zinc-500">
                            <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">No active browser sessions.</p>
                            <p className="text-sm mt-1 text-zinc-600 font-mono">The browser service is ready for agent deployment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800">
                            {statusData.pageIds.map((id: string) => (
                                <div key={id} className="p-4 flex justify-between items-center hover:bg-zinc-800/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                            <Globe className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                                Page ID: {id.slice(0, 8)}...
                                                <span className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] uppercase font-bold border border-green-500/20">Live</span>
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1 font-mono">
                                                Managed Viewport
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-zinc-400 hover:text-red-400"
                                            onClick={() => closePageMutation.mutate({ pageId: id })}
                                            disabled={closePageMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                    <CardTitle className="text-lg font-bold text-fuchsia-400 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Live Browser Mirror
                    </CardTitle>
                    <p className="text-sm text-zinc-500">
                        View the active browser tab as the agent sees it and toggle live screenshot mirroring without hunting through the generic dashboard widget layout.
                    </p>
                </CardHeader>
                <CardContent className="p-4">
                    <MirrorView />
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                    <CardTitle className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Browser History Search
                    </CardTitle>
                    <p className="text-sm text-zinc-500">
                        Search recent browser history through the live browser-extension bridge without leaving the HyperCode dashboard.
                    </p>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-emerald-500 outline-none placeholder:text-zinc-600"
                            placeholder="Search browser history (e.g. hypercode, chatgpt, docs)"
                            value={historyQuery}
                            onChange={(e) => setHistoryQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleHistorySearch()}
                        />
                        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded px-3">
                            <span className="text-xs text-zinc-500 uppercase">Limit</span>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={historyLimit}
                                onChange={(e) => setHistoryLimit(Math.min(50, Math.max(1, Number(e.target.value) || 10)))}
                                className="w-14 bg-transparent text-white text-center outline-none"
                            />
                        </div>
                        <Button
                            onClick={handleHistorySearch}
                            disabled={historySearch.isFetching || !historyQuery.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {historySearch.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Search
                        </Button>
                    </div>

                    {historyUnavailable ? (
                        <div className="rounded border border-red-900/30 bg-red-950/10 p-4 text-sm text-red-300">
                            {historySearch.error?.message ?? 'Browser history search is unavailable.'}
                        </div>
                    ) : historySearch.data && (
                        <div className="space-y-3">
                            <div className="text-xs text-zinc-500">
                                Found {historySearch.data.items.length} history entr{historySearch.data.items.length === 1 ? 'y' : 'ies'} for <span className="text-emerald-400">{historySearch.data.query}</span>
                            </div>

                            {historySearch.data.items.length === 0 ? (
                                <div className="text-sm text-zinc-500 italic border border-dashed border-zinc-700 rounded p-4">
                                    No matching history entries found.
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800 rounded border border-zinc-800 overflow-hidden">
                                    {historySearch.data.items.map((item: BrowserHistoryItem, index: number) => (
                                        <div key={`${item.url}-${index}`} className="p-4 hover:bg-zinc-800/30 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-zinc-200 truncate">{item.title}</div>
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-xs text-emerald-400 hover:underline break-all"
                                                    >
                                                        {item.url}
                                                    </a>
                                                </div>
                                                <div className="text-[11px] uppercase tracking-wide text-zinc-500 whitespace-nowrap">
                                                    Visits: {item.visitCount}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                    <CardTitle className="text-lg font-bold text-sky-400 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Browser Knowledge Activity
                    </CardTitle>
                    <p className="text-sm text-zinc-500">
                        Watch real browser-originated memory captures and RAG ingests as they happen, plus the canonical URL-ingestion queue already driving deep research.
                    </p>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-md border border-sky-500/20 bg-sky-950/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-sky-300/80">Live events</div>
                            <div className="text-2xl font-semibold text-sky-300">{knowledgeActivity.length}</div>
                        </div>
                        <div className="rounded-md border border-emerald-500/20 bg-emerald-950/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-emerald-300/80">Processed URLs</div>
                            <div className="text-2xl font-semibold text-emerald-300">{queueUnavailable ? '—' : queueTotals?.processed ?? 0}</div>
                        </div>
                        <div className="rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-amber-300/80">Pending URLs</div>
                            <div className="text-2xl font-semibold text-amber-300">{queueUnavailable ? '—' : queueTotals?.pending ?? 0}</div>
                        </div>
                        <div className="rounded-md border border-rose-500/20 bg-rose-950/20 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-rose-300/80">Failed URLs</div>
                            <div className="text-2xl font-semibold text-rose-300">{queueUnavailable ? '—' : queueTotals?.failed ?? 0}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-zinc-200">Live browser captures & ingests</div>
                                <a href="/dashboard/knowledge" className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1">
                                    Open knowledge hub <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            {knowledgeActivity.length === 0 ? (
                                <div className="rounded border border-dashed border-zinc-700 px-4 py-6 text-sm text-zinc-500">
                                    Waiting for the next browser memory capture or page-to-RAG ingest. Trigger one from the browser extension popup and it will land here in real time.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {knowledgeActivity.map((eventItem) => (
                                        <div key={eventItem.id} className="rounded border border-zinc-800 bg-black/20 px-3 py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-xs font-semibold uppercase tracking-wide ${eventItem.kind === 'knowledge' ? 'text-emerald-300' : eventItem.success ? 'text-cyan-300' : 'text-rose-300'}`}>
                                                            {eventItem.subtitle}
                                                        </span>
                                                        <span className="text-[11px] uppercase tracking-wide text-zinc-600">{eventItem.source.replace('_', ' ')}</span>
                                                    </div>
                                                    <div className="text-sm font-semibold text-zinc-100 truncate">{eventItem.title}</div>
                                                </div>
                                                <span className="text-[11px] text-zinc-500 whitespace-nowrap">{formatEventTime(eventItem.timestamp)}</span>
                                            </div>
                                            <div className="mt-2 text-xs text-zinc-400 break-words">{eventItem.detail}</div>
                                            {eventItem.url ? (
                                                <a href={eventItem.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full text-xs text-sky-400 hover:underline break-all">
                                                    {eventItem.url}
                                                </a>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-zinc-200">Canonical ingestion queue</div>
                                <a href="/dashboard/research" className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1">
                                    Open research queue <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-300/80 mb-2">
                                        <Database className="h-3.5 w-3.5" /> Pending URL ingests
                                    </div>
                                    {queueUnavailable ? (
                                        <div className="text-xs text-rose-300 break-words">{queueError ?? 'Browser ingestion queue returned an invalid payload.'}</div>
                                    ) : pendingItems.length === 0 ? (
                                        <div className="text-xs text-zinc-500">No pending browser/discovery URLs right now.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {pendingItems.map((item: QueueEntry) => (
                                                <div key={`pending-${item.url}`} className="rounded border border-zinc-800 px-3 py-2 bg-black/20">
                                                    <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                                                    <div className="text-xs text-zinc-500 break-all">{item.url}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-rose-300/80 mb-2">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Failed URL ingests
                                    </div>
                                    {queueUnavailable ? (
                                        <div className="text-xs text-rose-300 break-words">{queueError ?? 'Browser ingestion queue returned an invalid payload.'}</div>
                                    ) : failedItems.length === 0 ? (
                                        <div className="text-xs text-zinc-500">No failed URL ingests. The queue is behaving itself.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {failedItems.map((item: QueueEntry) => (
                                                <div key={`failed-${item.url}`} className="rounded border border-rose-900/30 px-3 py-2 bg-rose-950/10">
                                                    <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                                                    <div className="text-xs text-zinc-500 break-all">{item.url}</div>
                                                    <div className="mt-1 text-xs text-rose-300 break-words">{item.error}</div>
                                                    <div className="mt-1 text-[11px] text-zinc-600">
                                                        Attempts: {item.attempts ?? 1} · Last try: {formatQueueTimestamp(item.lastAttemptAt)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-xs uppercase tracking-wide text-emerald-300/80 mb-2">Recent processed URLs</div>
                                    {queueUnavailable ? (
                                        <div className="text-xs text-rose-300 break-words">{queueError ?? 'Browser ingestion queue returned an invalid payload.'}</div>
                                    ) : processedItems.length === 0 ? (
                                        <div className="text-xs text-zinc-500">No processed URLs recorded yet.</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {processedItems.map((item: QueueEntry) => (
                                                <div key={`processed-${item.url}`} className="rounded border border-zinc-800 px-3 py-2 bg-black/20">
                                                    <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                                                    <div className="text-xs text-zinc-500 break-all">{item.url}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="text-[11px] text-zinc-600 border-t border-zinc-800 pt-3">
                                    Queue refreshed at {!queueUnavailable && queueData?.updatedAt ? formatQueueTimestamp(queueData.updatedAt) : '—'}.
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                        <CardTitle className="text-lg font-bold text-violet-400 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Active Page Scrape
                        </CardTitle>
                        <p className="text-sm text-zinc-500">
                            Pull the active page through the extension Readability pipeline and inspect the extracted article content directly from the dashboard.
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handlePageScrape}
                                disabled={pageScrape.isFetching}
                                className="bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                {pageScrape.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                Scrape Active Page
                            </Button>
                        </div>

                        {pageScrape.data && (
                            <div className="space-y-3 rounded border border-zinc-800 p-4 bg-zinc-950/50">
                                <div className="space-y-1">
                                    <div className="text-sm font-semibold text-zinc-200">{pageScrape.data.title ?? 'Untitled Page'}</div>
                                    {pageScrape.data.url && (
                                        <a href={pageScrape.data.url} target="_blank" rel="noreferrer" className="text-xs text-violet-400 break-all hover:underline">
                                            {pageScrape.data.url}
                                        </a>
                                    )}
                                </div>
                                <pre className="max-h-80 overflow-auto rounded bg-black/30 p-3 text-xs text-zinc-300 whitespace-pre-wrap break-words">{pageScrape.data.content || pageScrape.data.raw}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                        <CardTitle className="text-lg font-bold text-pink-400 flex items-center gap-2">
                            <Camera className="h-5 w-5" />
                            Active Tab Screenshot
                        </CardTitle>
                        <p className="text-sm text-zinc-500">
                            Capture the current visible browser tab through the extension and preview the latest screenshot inline.
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleScreenshot}
                                disabled={screenshotMutation.isPending}
                                className="bg-pink-600 hover:bg-pink-500 text-white"
                            >
                                {screenshotMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                                Capture Screenshot
                            </Button>
                        </div>

                        {screenshotMutation.data && (
                            <div className="space-y-3 rounded border border-zinc-800 p-4 bg-zinc-950/50">
                                <div className="text-xs text-zinc-500">{screenshotMutation.data.message}</div>
                                {screenshotMutation.data.imageDataUrl ? (
                                    <img
                                        src={screenshotMutation.data.imageDataUrl}
                                        alt="Active browser tab screenshot"
                                        className="w-full rounded border border-zinc-800 bg-black/30"
                                    />
                                ) : (
                                    <div className="text-sm text-zinc-500 italic border border-dashed border-zinc-700 rounded p-4">
                                        No screenshot image was returned by the browser bridge.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                        <CardTitle className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                            <Network className="h-5 w-5" />
                            Browser Proxy Fetch
                        </CardTitle>
                        <p className="text-sm text-zinc-500">
                            Send network requests through the browser extension to bypass CORS and reach browser-only or localhost contexts from the dashboard.
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none placeholder:text-zinc-600"
                                placeholder="https://example.com/api/status"
                                value={proxyUrl}
                                onChange={(e) => setProxyUrl(e.target.value)}
                            />
                            <select
                                value={proxyMethod}
                                onChange={(e) => setProxyMethod(e.target.value)}
                                className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white outline-none"
                            >
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                            <Button
                                onClick={handleProxyFetch}
                                disabled={proxyFetchMutation.isPending || !proxyUrl.trim()}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                            >
                                {proxyFetchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />}
                                Fetch
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-zinc-500">Headers JSON</div>
                                <textarea
                                    value={proxyHeaders}
                                    onChange={(e) => setProxyHeaders(e.target.value)}
                                    className="w-full min-h-[120px] bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs uppercase tracking-wide text-zinc-500">Request Body</div>
                                <textarea
                                    value={proxyBody}
                                    onChange={(e) => setProxyBody(e.target.value)}
                                    className="w-full min-h-[120px] bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 font-mono"
                                    placeholder='{"ping":true}'
                                />
                            </div>
                        </div>

                        {proxyFetchMutation.data && (
                            <div className="space-y-3 rounded border border-zinc-800 p-4 bg-zinc-950/50">
                                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                                    <span>Status: <span className="text-cyan-400">{renderUnknownValue(proxyFetchMutation.data.data?.status, 'n/a')}</span></span>
                                    <span>Status Text: <span className="text-zinc-300">{renderUnknownValue(proxyFetchMutation.data.data?.statusText)}</span></span>
                                </div>
                                <pre className="max-h-64 overflow-auto rounded bg-black/30 p-3 text-xs text-zinc-300 whitespace-pre-wrap break-words">{renderUnknownValue(proxyFetchMutation.data.data?.body, proxyFetchMutation.data.raw)}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                        <CardTitle className="text-lg font-bold text-amber-400 flex items-center gap-2">
                            <Bug className="h-5 w-5" />
                            Browser CDP Debug
                        </CardTitle>
                        <p className="text-sm text-zinc-500">
                            Attach to the active tab and issue raw Chrome DevTools Protocol commands from the dashboard for deep browser diagnostics.
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => handleDebugAction('attach')}
                                disabled={browserDebugMutation.isPending}
                                className="bg-amber-600 hover:bg-amber-500 text-white"
                            >
                                {browserDebugMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
                                Attach
                            </Button>
                            <Button
                                onClick={() => handleDebugAction('detach')}
                                disabled={browserDebugMutation.isPending}
                                variant="outline"
                                className="border-zinc-700 text-zinc-200"
                            >
                                Detach
                            </Button>
                            <Button
                                onClick={() => handleDebugAction('command')}
                                disabled={browserDebugMutation.isPending || !debugMethod.trim()}
                                variant="outline"
                                className="border-amber-500/40 text-amber-300"
                            >
                                Run Command
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">CDP Method</div>
                            <input
                                type="text"
                                value={debugMethod}
                                onChange={(e) => setDebugMethod(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                                placeholder="Runtime.evaluate"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs uppercase tracking-wide text-zinc-500">CDP Params JSON</div>
                            <textarea
                                value={debugParams}
                                onChange={(e) => setDebugParams(e.target.value)}
                                className="w-full min-h-[160px] bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono"
                            />
                        </div>

                        {browserDebugMutation.data && (
                            <div className="rounded border border-zinc-800 p-4 bg-zinc-950/50 space-y-2">
                                <div className="text-xs uppercase tracking-wide text-zinc-500">Last Debug Result</div>
                                <pre className="max-h-64 overflow-auto rounded bg-black/30 p-3 text-xs text-zinc-300 whitespace-pre-wrap break-words">{typeof browserDebugMutation.data.data === 'string' ? browserDebugMutation.data.data : JSON.stringify(browserDebugMutation.data.data, null, 2)}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Card className="bg-blue-900/10 border-blue-500/20">
                    <CardHeader>
                        <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Computer-Use Integration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            The Semantic Browser provides agents with a high-fidelity window into web applications. 
                            It supports element interaction, accessibility tree traversal, and visual verification.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
