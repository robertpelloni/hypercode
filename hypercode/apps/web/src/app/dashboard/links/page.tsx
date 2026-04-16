"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@hypercode/core";
import { useSearchParams } from "next/navigation";
import { BookMarked, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { PageStatusBanner } from "@/components/PageStatusBanner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type LinkItem = RouterOutput["linksBacklog"]["list"]["items"][number];

const PAGE_SIZE = 50;
const RESEARCH_FILTERS = ["", "pending", "running", "done", "failed", "skipped"] as const;

type LinksSyncResult = {
    upserted: number;
    pages: number;
    baseUrl?: string;
};

function isLinkItem(value: unknown): value is LinkItem {
    return typeof value === "object"
        && value !== null
        && typeof (value as { uuid?: unknown }).uuid === "string"
        && typeof (value as { url?: unknown }).url === "string"
        && typeof (value as { normalized_url?: unknown }).normalized_url === "string"
        && typeof (value as { research_status?: unknown }).research_status === "string"
        && typeof (value as { source?: unknown }).source === "string";
}

function isLinksListPayload(value: unknown): value is { items: LinkItem[]; total: number } {
    return typeof value === "object"
        && value !== null
        && Array.isArray((value as { items?: unknown }).items)
        && ((value as { items: unknown[] }).items).every(isLinkItem)
        && typeof (value as { total?: unknown }).total === "number";
}

function isLinksStatsPayload(value: unknown): value is {
    total: number;
    unique: number;
    duplicates: number;
    pending: number;
    researched: number;
    sources: number;
} {
    return typeof value === "object"
        && value !== null
        && typeof (value as { total?: unknown }).total === "number"
        && typeof (value as { unique?: unknown }).unique === "number"
        && typeof (value as { duplicates?: unknown }).duplicates === "number"
        && typeof (value as { pending?: unknown }).pending === "number"
        && typeof (value as { researched?: unknown }).researched === "number"
        && typeof (value as { sources?: unknown }).sources === "number";
}

export default function LinksBacklogPage() {
    return (
        <Suspense fallback={<LinksBacklogPageSkeleton />}>
            <LinksBacklogPageContent />
        </Suspense>
    );
}

function LinksBacklogPageContent() {
    const searchParams = useSearchParams();

    const [search, setSearch] = useState("");
    const [researchStatus, setResearchStatus] = useState<(typeof RESEARCH_FILTERS)[number]>("");
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [syncBaseUrl, setSyncBaseUrl] = useState("http://localhost:5000");
    const [page, setPage] = useState(0);
    const [lastSyncResult, setLastSyncResult] = useState<LinksSyncResult | null>(null);

    const querySearch = searchParams.get("search")?.trim() ?? "";
    const querySource = searchParams.get("source")?.trim() ?? "";
    const queryStatusRaw = searchParams.get("research_status")?.trim() ?? "";
    const queryShowDuplicatesRaw = searchParams.get("show_duplicates")?.trim().toLowerCase() ?? "";
    const queryShowDuplicates = queryShowDuplicatesRaw === "1" || queryShowDuplicatesRaw === "true";
    const queryStatus = RESEARCH_FILTERS.includes(queryStatusRaw as (typeof RESEARCH_FILTERS)[number])
        ? (queryStatusRaw as (typeof RESEARCH_FILTERS)[number])
        : "";

    useEffect(() => {
        if (querySearch !== search) setSearch(querySearch);
        if (queryStatus !== researchStatus) setResearchStatus(queryStatus);
        if (queryShowDuplicates !== showDuplicates) setShowDuplicates(queryShowDuplicates);
        if (querySearch || queryStatus || queryShowDuplicates) setPage(0);
        // Intentionally react only to URL-derived inputs; this hydrates deep links
        // without fighting user edits once params are unchanged.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [querySearch, queryStatus, queryShowDuplicates]);

    const utils = trpc.useUtils();
    const { data: stats, error: statsError } = trpc.linksBacklog.stats.useQuery();
    const { data, isLoading, isFetching, error: listError } = trpc.linksBacklog.list.useQuery({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: search.trim() || undefined,
        research_status: researchStatus || undefined,
        show_duplicates: showDuplicates,
    });

    const syncMutation = trpc.linksBacklog.syncFromBobbyBookmarks.useMutation({
        onSuccess: async (result) => {
            setLastSyncResult({
                upserted: result.upserted,
                pages: result.pages,
                baseUrl: syncBaseUrl.trim(),
            });
            toast.success(`Synced ${result.upserted} backlog links from BobbyBookmarks (${result.pages} pages).`);
            await Promise.all([
                utils.linksBacklog.list.invalidate(),
                utils.linksBacklog.stats.invalidate(),
            ]);
        },
        onError: (error) => {
            toast.error(`Backlog sync failed: ${error.message}`);
        },
    });

    const statsUnavailable = Boolean(statsError) || (stats !== undefined && !isLinksStatsPayload(stats));
    const listUnavailable = Boolean(listError) || (data !== undefined && !isLinksListPayload(data));
    const items = !listUnavailable && data ? data.items : [];
    const total = !listUnavailable && data ? data.total : 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const sourceSummary = useMemo(() => {
        return !statsUnavailable && stats ? `${stats.total} total · ${stats.unique} unique · ${stats.duplicates} duplicates` : null;
    }, [stats, statsUnavailable]);

    const handleSync = () => {
        if (!syncBaseUrl.trim()) {
            toast.error("Enter a BobbyBookmarks base URL first.");
            return;
        }
        syncMutation.mutate({
            baseUrl: syncBaseUrl.trim(),
            perPage: 100,
            includeDuplicates: true,
            includeResearched: true,
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageStatusBanner
                status="beta"
                message="Link Backlog"
                note="Canonical HyperCode backlog for BobbyBookmarks-powered link sync, research status, and future universal MCP directory integration."
            />

            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <BookMarked className="w-6 h-6 text-cyan-400" />
                        Link Backlog
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        BobbyBookmarks is the canonical datasource for this backlog.
                        {sourceSummary ? <span className="ml-2 text-zinc-500">{sourceSummary}</span> : null}
                    </p>
                    {querySource === "unified-directory" && (
                        <p className="text-cyan-400 text-xs mt-1">
                            Prefiltered from Unified Directory deep link.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        value={syncBaseUrl}
                        onChange={(event) => setSyncBaseUrl(event.target.value)}
                        className="h-9 min-w-[240px] rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-200"
                        placeholder="http://localhost:5000"
                    />
                    <button
                        onClick={handleSync}
                        disabled={syncMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-900 disabled:text-cyan-300 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                        {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {syncMutation.isPending ? "Syncing…" : "Sync BobbyBookmarks"}
                    </button>
                </div>
            </div>

            {lastSyncResult && (
                <div className="rounded-lg border border-cyan-900/30 bg-cyan-950/10 p-4 text-sm text-cyan-100">
                    <div className="font-medium text-cyan-300">Last BobbyBookmarks Sync</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cyan-100/90">
                        <span>{lastSyncResult.upserted} links upserted</span>
                        <span>{lastSyncResult.pages} pages scanned</span>
                        {lastSyncResult.baseUrl ? <span>Source: {lastSyncResult.baseUrl}</span> : null}
                    </div>
                </div>
            )}

            {statsUnavailable ? (
                <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-4 text-sm text-red-300">
                    {statsError?.message ?? "Backlog stats are unavailable."}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <StatCard label="Total" value={stats.total} />
                    <StatCard label="Unique" value={stats.unique} tone="emerald" />
                    <StatCard label="Duplicates" value={stats.duplicates} tone="amber" />
                    <StatCard label="Pending" value={stats.pending} tone="blue" />
                    <StatCard label="Researched" value={stats.researched} tone="teal" />
                    <StatCard label="Sources" value={stats.sources} />
                </div>
            ) : null}

            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                        placeholder="Search URLs, titles, descriptions…"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />
                </div>
                <select
                    value={researchStatus}
                    onChange={(event) => {
                        setResearchStatus(event.target.value as (typeof RESEARCH_FILTERS)[number]);
                        setPage(0);
                    }}
                    className="h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300"
                >
                    <option value="">All research states</option>
                    {RESEARCH_FILTERS.filter(Boolean).map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={showDuplicates}
                        onChange={(event) => {
                            setShowDuplicates(event.target.checked);
                            setPage(0);
                        }}
                    />
                    Show duplicates
                </label>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/60">
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Link</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Research</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Source</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Cluster</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : listUnavailable ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-red-300">
                                        {listError?.message ?? "Backlog entries are unavailable."}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                                        No backlog links found yet.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => <LinkRow key={item.uuid} item={item} />)
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-sm text-zinc-500">
                    <div>{isFetching ? "Refreshing…" : `Showing ${items.length} of ${total}`}</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((value) => Math.max(0, value - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 rounded border border-zinc-800 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span>
                            Page {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage((value) => (value + 1 < totalPages ? value + 1 : value))}
                            disabled={page + 1 >= totalPages}
                            className="px-3 py-1.5 rounded border border-zinc-800 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LinksBacklogPageSkeleton() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <PageStatusBanner
                status="beta"
                message="Link Backlog"
                note="Loading backlog view..."
            />
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-500">
                Preparing backlog filters...
            </div>
        </div>
    );
}

function LinkRow({ item }: { item: LinkItem }) {
    return (
        <tr className="border-b border-zinc-800 hover:bg-zinc-900/40">
            <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-1">
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-zinc-100 hover:text-cyan-300 inline-flex items-center gap-1">
                        {item.title || item.page_title || item.url}
                        <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="text-xs text-zinc-500 break-all">{item.normalized_url}</div>
                    {item.description || item.page_description ? (
                        <div className="text-xs text-zinc-400 max-w-2xl">
                            {item.description || item.page_description}
                        </div>
                    ) : null}
                </div>
            </td>
            <td className="px-4 py-3 align-top">
                <StatusPill status={item.research_status} />
            </td>
            <td className="px-4 py-3 align-top text-zinc-300">{item.source}</td>
            <td className="px-4 py-3 align-top text-zinc-400">{item.cluster_id ?? "—"}</td>
            <td className="px-4 py-3 align-top text-zinc-500">
                {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
            </td>
        </tr>
    );
}

function StatusPill({ status }: { status: string }) {
    const style = status === "done"
        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
        : status === "failed"
            ? "bg-red-950 text-red-400 border-red-800"
            : status === "running"
                ? "bg-blue-950 text-blue-400 border-blue-800"
                : "bg-zinc-900 text-zinc-400 border-zinc-700";

    return <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${style}`}>{status}</span>;
}

function StatCard({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "emerald" | "amber" | "blue" | "teal" }) {
    const colors = tone === "emerald"
        ? "text-emerald-300 border-emerald-900/40 bg-emerald-950/20"
        : tone === "amber"
            ? "text-amber-300 border-amber-900/40 bg-amber-950/20"
            : tone === "blue"
                ? "text-blue-300 border-blue-900/40 bg-blue-950/20"
                : tone === "teal"
                    ? "text-teal-300 border-teal-900/40 bg-teal-950/20"
                    : "text-zinc-300 border-zinc-800 bg-zinc-900/40";

    return (
        <div className={`rounded-xl border px-4 py-3 ${colors}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
        </div>
    );
}
