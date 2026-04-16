"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@hypercode/core";
import { trpc } from "@/utils/trpc";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookMarked, Database, ExternalLink, Loader2, Search } from "lucide-react";

const PAGE_SIZE = 50;

type RouterOutput = inferRouterOutputs<AppRouter>;
type UnifiedItem = RouterOutput["unifiedDirectory"]["list"]["items"][number];

type SourceFilter = "all" | "catalog" | "backlog";
const SOURCE_FILTERS: SourceFilter[] = ["all", "catalog", "backlog"];
const RESEARCH_FILTERS = ["", "pending", "running", "done", "failed", "skipped"] as const;

function isUnifiedItem(value: unknown): value is UnifiedItem {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { source?: unknown }).source === "string"
        && typeof (value as { title?: unknown }).title === "string"
        && Array.isArray((value as { tags?: unknown }).tags)
        && (value as { tags: unknown[] }).tags.every((tag) => typeof tag === "string");
}

function isUnifiedListPayload(value: unknown): value is { items: UnifiedItem[]; total: number } {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value)
        && Array.isArray((value as { items?: unknown }).items)
        && (value as { items: unknown[] }).items.every(isUnifiedItem)
        && typeof (value as { total?: unknown }).total === "number";
}

function isDirectoryBucket(value: unknown): value is { total: number; pending?: number; validated?: number; broken?: number } {
    return typeof value === "object"
        && value !== null
        && typeof (value as { total?: unknown }).total === "number"
        && ((value as { pending?: unknown }).pending === undefined || typeof (value as { pending?: unknown }).pending === "number")
        && ((value as { validated?: unknown }).validated === undefined || typeof (value as { validated?: unknown }).validated === "number")
        && ((value as { broken?: unknown }).broken === undefined || typeof (value as { broken?: unknown }).broken === "number");
}

function isUnifiedDirectoryStats(value: unknown): value is {
    combined_total: number;
    catalog: { total: number; validated: number; broken: number };
    backlog: { total: number; pending: number };
} {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value)
        && typeof (value as { combined_total?: unknown }).combined_total === "number"
        && isDirectoryBucket((value as { catalog?: unknown }).catalog)
        && typeof ((value as { catalog: { validated?: unknown } }).catalog.validated) === "number"
        && typeof ((value as { catalog: { broken?: unknown } }).catalog.broken) === "number"
        && isDirectoryBucket((value as { backlog?: unknown }).backlog)
        && typeof ((value as { backlog: { pending?: unknown } }).backlog.pending) === "number";
}

function formatDate(value: string | Date | null | undefined): string {
    if (!value) return "—";
    const parsed = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString();
}

function statusClass(source: UnifiedItem["source"], status: string | null): string {
    if (source === "catalog") {
        if (status === "validated" || status === "certified") return "bg-emerald-950 text-emerald-400 border-emerald-800";
        if (status === "broken") return "bg-red-950 text-red-400 border-red-800";
        if (status === "probeable") return "bg-amber-950 text-amber-400 border-amber-800";
        return "bg-zinc-900 text-zinc-400 border-zinc-700";
    }
    if (status === "done") return "bg-teal-950 text-teal-400 border-teal-800";
    if (status === "failed") return "bg-red-950 text-red-400 border-red-800";
    if (status === "running") return "bg-blue-950 text-blue-400 border-blue-800";
    return "bg-zinc-900 text-zinc-400 border-zinc-700";
}

export default function UnifiedDirectoryPage() {
    return (
        <Suspense fallback={<UnifiedDirectoryPageSkeleton />}>
            <UnifiedDirectoryPageContent />
        </Suspense>
    );
}

function UnifiedDirectoryPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState("");
    const [source, setSource] = useState<SourceFilter>("all");
    const [researchStatus, setResearchStatus] = useState<(typeof RESEARCH_FILTERS)[number]>("");
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [duplicatesOnly, setDuplicatesOnly] = useState(false);
    const [page, setPage] = useState(0);

    const querySearch = searchParams.get("search")?.trim() ?? "";
    const querySourceRaw = searchParams.get("source")?.trim() ?? "";
    const queryResearchStatusRaw = searchParams.get("research_status")?.trim() ?? "";
    const queryShowDuplicatesRaw = searchParams.get("show_duplicates")?.trim().toLowerCase() ?? "";
    const queryDuplicatesOnlyRaw = searchParams.get("duplicates_only")?.trim().toLowerCase() ?? "";
    const queryShowDuplicates = queryShowDuplicatesRaw === "1" || queryShowDuplicatesRaw === "true";
    const queryDuplicatesOnly = queryDuplicatesOnlyRaw === "1" || queryDuplicatesOnlyRaw === "true";
    const querySource = SOURCE_FILTERS.includes(querySourceRaw as SourceFilter)
        ? (querySourceRaw as SourceFilter)
        : "all";
    const queryResearchStatus = RESEARCH_FILTERS.includes(queryResearchStatusRaw as (typeof RESEARCH_FILTERS)[number])
        ? (queryResearchStatusRaw as (typeof RESEARCH_FILTERS)[number])
        : "";
    const queryBacklogFiltersEnabled = querySource !== "catalog";
    const hydratedQueryResearchStatus = queryBacklogFiltersEnabled ? queryResearchStatus : "";
    const hydratedQueryShowDuplicates = queryBacklogFiltersEnabled ? queryShowDuplicates : false;
    const hydratedQueryDuplicatesOnly = queryBacklogFiltersEnabled ? queryDuplicatesOnly : false;
    const hasEffectiveQueryPrefilters = Boolean(
        querySearch
            || querySource !== "all"
            || hydratedQueryResearchStatus
            || hydratedQueryShowDuplicates
            || hydratedQueryDuplicatesOnly,
    );

    useEffect(() => {
        if (querySearch !== search) setSearch(querySearch);
        if (querySource !== source) setSource(querySource);
        if (hydratedQueryResearchStatus !== researchStatus) setResearchStatus(hydratedQueryResearchStatus);
        if (hydratedQueryShowDuplicates !== showDuplicates) setShowDuplicates(hydratedQueryShowDuplicates);
        if (hydratedQueryDuplicatesOnly !== duplicatesOnly) setDuplicatesOnly(hydratedQueryDuplicatesOnly);
        if (hasEffectiveQueryPrefilters) setPage(0);
        // Hydrate from URL params without overriding user changes unless params change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [querySearch, querySource, hydratedQueryResearchStatus, hydratedQueryShowDuplicates, hydratedQueryDuplicatesOnly, hasEffectiveQueryPrefilters]);

    const statsQuery = trpc.unifiedDirectory.stats.useQuery();
    const backlogFiltersEnabled = source !== "catalog";
    const effectiveShowDuplicates = backlogFiltersEnabled && (showDuplicates || duplicatesOnly);
    const effectiveDuplicatesOnly = backlogFiltersEnabled && duplicatesOnly;
    const effectiveResearchStatus = backlogFiltersEnabled ? (researchStatus || undefined) : undefined;

    const listQuery = trpc.unifiedDirectory.list.useQuery({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: search.trim() || undefined,
        source,
        research_status: effectiveResearchStatus,
        show_duplicates: effectiveShowDuplicates,
        duplicates_only: effectiveDuplicatesOnly,
    });
    const stats = isUnifiedDirectoryStats(statsQuery.data) ? statsQuery.data : undefined;
    const statsUnavailable = statsQuery.isError || (statsQuery.data !== undefined && !isUnifiedDirectoryStats(statsQuery.data));
    const listUnavailable = listQuery.isError || (listQuery.data !== undefined && !isUnifiedListPayload(listQuery.data));
    const isLoading = listQuery.isLoading;
    const isFetching = listQuery.isFetching;

    const items = !listUnavailable && isUnifiedListPayload(listQuery.data) ? listQuery.data.items : [];
    const total = !listUnavailable && isUnifiedListPayload(listQuery.data) ? listQuery.data.total : 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const activeFilterCount =
        Number(search.trim().length > 0)
        + Number(source !== "all")
        + Number(backlogFiltersEnabled && researchStatus !== "")
        + Number(backlogFiltersEnabled && (showDuplicates || duplicatesOnly));
    const hasActiveFilters = activeFilterCount > 0;
    const resetFilters = () => {
        router.replace(pathname);
        setSearch("");
        setSource("all");
        setResearchStatus("");
        setShowDuplicates(false);
        setDuplicatesOnly(false);
        setPage(0);
    };

    const subtitle = useMemo(() => {
        if (!stats) return "";
        return `${stats.combined_total.toLocaleString()} total entries · ${stats.catalog.total.toLocaleString()} catalog · ${stats.backlog.total.toLocaleString()} backlog`;
    }, [stats]);

    useEffect(() => {
        if (page > 0 && page >= totalPages) {
            setPage(totalPages - 1);
        }
    }, [page, totalPages]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Database className="w-6 h-6 text-indigo-400" />
                        Unified Directory
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Merged operator view of published MCP catalog entries and BobbyBookmarks backlog links.
                        {statsUnavailable ? (
                            <span className="ml-2 text-red-300">{statsQuery.error?.message ?? "Unified directory stats unavailable."}</span>
                        ) : subtitle ? <span className="ml-2 text-zinc-500">{subtitle}</span> : null}
                    </p>
                    {hasEffectiveQueryPrefilters && (
                        <p className="text-indigo-400 text-xs mt-1">
                            Prefiltered from URL parameters.
                        </p>
                    )}
                </div>
            </div>

            {listUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {listQuery.error?.message ?? "Unified directory entries are unavailable."}
                </div>
            ) : null}

            {!statsUnavailable && stats ? (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <StatCard label="Combined" value={stats.combined_total} tone="indigo" />
                    <StatCard label="Catalog" value={stats.catalog.total} />
                    <StatCard label="Validated" value={stats.catalog.validated} tone="emerald" />
                    <StatCard label="Broken" value={stats.catalog.broken} tone="red" />
                    <StatCard label="Backlog" value={stats.backlog.total} tone="cyan" />
                    <StatCard label="Backlog Pending" value={stats.backlog.pending} tone="amber" />
                </div>
            ) : null}

            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        placeholder="Search names, IDs, URLs, descriptions..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />
                </div>

                <select
                    value={source}
                    onChange={(event) => {
                        const nextSource = event.target.value as SourceFilter;
                        setSource(nextSource);
                        if (nextSource === "catalog") {
                            setResearchStatus("");
                            setShowDuplicates(false);
                            setDuplicatesOnly(false);
                        }
                        setPage(0);
                    }}
                    className="h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300"
                >
                    <option value="all">All sources</option>
                    <option value="catalog">Catalog only</option>
                    <option value="backlog">Backlog only</option>
                </select>

                <select
                    value={backlogFiltersEnabled ? researchStatus : ""}
                    disabled={!backlogFiltersEnabled}
                    title={backlogFiltersEnabled ? "" : "Available when source includes backlog entries"}
                    onChange={(event) => {
                        setResearchStatus(event.target.value as (typeof RESEARCH_FILTERS)[number]);
                        setPage(0);
                    }}
                    className="h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300 disabled:opacity-50"
                >
                    <option value="">All backlog research states</option>
                    {RESEARCH_FILTERS.filter(Boolean).map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>

                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={backlogFiltersEnabled && (showDuplicates || duplicatesOnly)}
                        disabled={duplicatesOnly || !backlogFiltersEnabled}
                        title={backlogFiltersEnabled ? "" : "Available when source includes backlog entries"}
                        onChange={(event) => {
                            setShowDuplicates(event.target.checked);
                            setPage(0);
                        }}
                    />
                    Show duplicate backlog links
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={backlogFiltersEnabled && duplicatesOnly}
                        disabled={!backlogFiltersEnabled}
                        title={backlogFiltersEnabled ? "" : "Available when source includes backlog entries"}
                        onChange={(event) => {
                            const next = event.target.checked;
                            setDuplicatesOnly(next);
                            if (next) {
                                setShowDuplicates(true);
                            }
                            setPage(0);
                        }}
                    />
                    Only duplicate backlog links
                </label>

                <button
                    type="button"
                    disabled={!hasActiveFilters}
                    onClick={resetFilters}
                    className="h-9 px-3 rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 disabled:opacity-50 disabled:hover:text-zinc-300 disabled:hover:border-zinc-700"
                >
                    Clear filters{hasActiveFilters ? ` (${activeFilterCount})` : ""}
                </button>
            </div>

            {!backlogFiltersEnabled ? (
                <p className="text-xs text-zinc-500">
                    Backlog-specific filters are disabled while source is set to <span className="text-zinc-300">Catalog only</span>.
                </p>
            ) : null}

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/60">
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Entry</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Source</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Transport / Install</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : listUnavailable ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-red-300">
                                        {listQuery.error?.message ?? "Unified directory entries are unavailable."}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                                        <div className="space-y-2">
                                            <div>No unified directory entries found.</div>
                                            {hasActiveFilters ? (
                                                <button
                                                    type="button"
                                                    onClick={resetFilters}
                                                    className="inline-flex items-center px-3 py-1.5 rounded border border-zinc-700 text-xs text-zinc-300 hover:text-zinc-100 hover:border-zinc-500"
                                                >
                                                    Clear filters and try again
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => <UnifiedRow key={`${item.source}:${item.id}`} item={item} />)
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-sm text-zinc-500">
                    <div>{listUnavailable ? "Showing — of —" : isFetching ? "Refreshing…" : `Showing ${items.length} of ${total}`}</div>
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

function UnifiedDirectoryPageSkeleton() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Database className="w-6 h-6 text-indigo-400" />
                    Unified Directory
                </h1>
                <p className="text-zinc-500 text-sm mt-1">Loading directory filters…</p>
            </div>
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-500">
                Preparing merged catalog and backlog view...
            </div>
        </div>
    );
}

function UnifiedRow({ item }: { item: UnifiedItem }) {
    const sourceClass = item.source === "catalog"
        ? "bg-indigo-950 text-indigo-400 border-indigo-900"
        : "bg-cyan-950 text-cyan-400 border-cyan-900";

    return (
        <tr className="border-b border-zinc-800 hover:bg-zinc-900/40">
            <td className="px-4 py-3 align-top">
                <div className="flex flex-col gap-1">
                    <div className="text-zinc-100 font-medium">{item.title}</div>
                    {item.subtitle ? <div className="text-xs text-zinc-500 break-all">{item.subtitle}</div> : null}
                    {item.description ? <div className="text-xs text-zinc-400 max-w-3xl">{item.description}</div> : null}
                    {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline break-all">
                            {item.url}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    ) : null}
                    <div className="flex flex-wrap gap-2 mt-1">
                        {item.source === "catalog" ? (
                            <Link
                                href={`/dashboard/registry/${item.id}`}
                                className="inline-flex items-center text-xs text-indigo-300 hover:text-indigo-200 hover:underline"
                            >
                                Open catalog entry
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={`/dashboard/links?search=${encodeURIComponent(item.subtitle ?? item.title)}&source=unified-directory${item.status ? `&research_status=${encodeURIComponent(item.status)}` : ""}${item.is_duplicate ? "&show_duplicates=true" : ""}`}
                                    className="inline-flex items-center text-xs text-cyan-300 hover:text-cyan-200 hover:underline"
                                >
                                    Open in link backlog
                                </Link>
                                {item.is_duplicate && item.duplicate_of ? (
                                    <Link
                                        href={`/dashboard/links?search=${encodeURIComponent(item.duplicate_of)}&source=unified-directory&show_duplicates=true`}
                                        className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 hover:underline"
                                    >
                                        Open canonical target
                                    </Link>
                                ) : null}
                            </>
                        )}
                    </div>
                    {item.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.slice(0, 6).map((tag) => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-zinc-800/80 text-zinc-500 border border-zinc-700">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            </td>
            <td className="px-4 py-3 align-top">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${sourceClass}`}>
                    {item.source === "catalog" ? <Database className="w-3 h-3" /> : <BookMarked className="w-3 h-3" />}
                    {item.source}
                </span>
            </td>
            <td className="px-4 py-3 align-top">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs border ${statusClass(item.source, item.status)}`}>
                    {item.status ?? "—"}
                </span>
                {item.source === "backlog" && item.is_duplicate ? (
                    <div className="mt-1">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] border bg-amber-950 text-amber-300 border-amber-800">
                            duplicate
                        </span>
                        {item.duplicate_of ? (
                            <div className="text-[11px] text-amber-200 mt-1 break-all">
                                of {item.duplicate_of}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </td>
            <td className="px-4 py-3 align-top text-zinc-400 text-xs">
                {item.source === "catalog" ? (
                    <div className="space-y-0.5">
                        <div>{item.transport ?? "—"}</div>
                        <div className="text-zinc-500">{item.install_method ?? "—"}</div>
                        {typeof item.confidence === "number" ? (
                            <div className="text-zinc-500">{Math.max(0, Math.min(100, item.confidence))}% confidence</div>
                        ) : null}
                    </div>
                ) : (
                    "—"
                )}
            </td>
            <td className="px-4 py-3 align-top text-zinc-500 text-xs">
                {formatDate(item.updated_at ?? item.created_at)}
            </td>
        </tr>
    );
}

function StatCard({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "indigo" | "emerald" | "red" | "cyan" | "amber" }) {
    const colors = tone === "indigo"
        ? "text-indigo-300 border-indigo-900/40 bg-indigo-950/20"
        : tone === "emerald"
            ? "text-emerald-300 border-emerald-900/40 bg-emerald-950/20"
            : tone === "red"
                ? "text-red-300 border-red-900/40 bg-red-950/20"
                : tone === "cyan"
                    ? "text-cyan-300 border-cyan-900/40 bg-cyan-950/20"
                    : tone === "amber"
                        ? "text-amber-300 border-amber-900/40 bg-amber-950/20"
                        : "text-zinc-300 border-zinc-800 bg-zinc-900/40";

    return (
        <div className={`rounded-xl border px-4 py-3 ${colors}`}>
            <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 text-xl font-bold">{value.toLocaleString()}</div>
        </div>
    );
}
