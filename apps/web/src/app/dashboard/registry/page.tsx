"use client";

/**
 * @file page.tsx
 * @route /dashboard/registry
 *
 * WHAT:
 * Dashboard page for the MCP Registry Intelligence Published Catalog.
 * Displays a searchable, filterable table of publicly known MCP servers
 * aggregated from external registries (Glama.ai, Smithery.ai, etc.).
 *
 * WHY:
 * The registry catalog gives operators visibility into what MCP servers
 * exist in the ecosystem — before they decide to install anything — so
 * they can make informed, evidence-backed decisions.
 *
 * STATUS BADGES:
 *   discovered  → grey   ("seen in registry")
 *   normalized  → blue   ("fields cleaned")
 *   probeable   → amber  ("recipe ready")
 *   validated   → green  ("tools/list passed")
 *   certified   → teal   ("operator reviewed")
 *   broken      → red    ("validation failing")
 *   archived    → zinc   ("deprecated")
 */

import { trpc } from "@/utils/trpc";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@borg/core";
import {
    Search,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Clock,
    Database,
    Globe,
    Package,
    Cpu,
    PlayCircle,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ---- Types ----

type ServerStatus =
    | "discovered"
    | "normalized"
    | "probeable"
    | "validated"
    | "certified"
    | "broken"
    | "archived";

type RouterOutput = inferRouterOutputs<AppRouter>;
// Server type is always in sync with the catalog.list router output.
type Server = RouterOutput["catalog"]["list"]["servers"][number];

// ---- Status badge config ----

const STATUS_CONFIG: Record<
    ServerStatus,
    { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
    discovered: { label: "Discovered", color: "bg-zinc-800 text-zinc-400 border-zinc-700", icon: Clock },
    normalized: { label: "Normalized", color: "bg-blue-950 text-blue-400 border-blue-800", icon: Database },
    probeable: { label: "Probeable", color: "bg-amber-950 text-amber-400 border-amber-800", icon: Package },
    validated: { label: "Validated", color: "bg-emerald-950 text-emerald-400 border-emerald-800", icon: CheckCircle2 },
    certified: { label: "Certified", color: "bg-teal-950 text-teal-400 border-teal-800", icon: CheckCircle2 },
    broken: { label: "Broken", color: "bg-red-950 text-red-400 border-red-800", icon: AlertCircle },
    archived: { label: "Archived", color: "bg-zinc-900 text-zinc-600 border-zinc-800", icon: Clock },
};

function getStatusConfig(status: string) {
    return STATUS_CONFIG[status as ServerStatus] ?? STATUS_CONFIG.discovered;
}

// ---- Transport/install icons ----

function TransportBadge({ transport }: { transport: string }) {
    const label = transport === "unknown" ? "?" : transport.replace("_", " ");
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Globe className="w-3 h-3" />
            {label}
        </span>
    );
}

function InstallBadge({ method }: { method: string }) {
    if (method === "unknown") return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Cpu className="w-3 h-3" />
            {method}
        </span>
    );
}

// ---- Main page ----

const PAGE_SIZE = 50;

export default function RegistryPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [transportFilter, setTransportFilter] = useState<string>("");
    const [page, setPage] = useState(0);

    const utils = trpc.useContext();

    // Stats
    const { data: stats } = trpc.catalog.stats.useQuery(undefined, {
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });

    // List query
    const { data, isLoading, isFetching } = trpc.catalog.list.useQuery(
        {
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            search: search.trim() || undefined,
            status: (statusFilter as any) || undefined,
            transport: transportFilter || undefined,
        },
        {
            staleTime: 30_000,
        }
    );

    const servers = data?.servers ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Ingestion trigger
    const ingestMutation = trpc.catalog.triggerIngestion.useMutation({
        onSuccess: (report) => {
            toast.success(
                `Ingestion complete: ${report.total_upserted} servers synced from ${report.results.length} sources.`
            );
            utils.catalog.list.invalidate();
            utils.catalog.stats.invalidate();
        },
        onError: (err) => {
            toast.error("Ingestion failed: " + err.message);
        },
    });

    // Validation trigger
    const validateMutation = trpc.catalog.triggerValidation.useMutation({
        onSuccess: (result) => {
            const icon = result.outcome === "passed" ? "✅" : result.outcome === "skipped" ? "⏭️" : "❌";
            toast.success(
                `${icon} Validation ${result.outcome}${result.tool_count != null ? ` — ${result.tool_count} tools` : ""}`
            );
            utils.catalog.list.invalidate();
        },
        onError: (err) => {
            toast.error("Validation error: " + err.message);
        },
    });

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(0);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">MCP Registry</h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Published catalog of known MCP servers from external registries.
                        {stats && (
                            <span className="ml-2 text-zinc-500">
                                {stats.total.toLocaleString()} total · {stats.validated} validated · {stats.broken} broken
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => ingestMutation.mutate()}
                    disabled={ingestMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 rounded-lg text-sm font-medium text-white transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${ingestMutation.isPending ? "animate-spin" : ""}`} />
                    {ingestMutation.isPending ? "Syncing…" : "Sync Registries"}
                </button>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <StatCard label="Total" value={stats.total} color="zinc" />
                    <StatCard label="Validated" value={stats.validated} color="emerald" />
                    <StatCard label="Broken" value={stats.broken} color="red" />
                    <StatCard
                        label="Discovered"
                        value={stats.byStatus?.discovered ?? 0}
                        color="zinc"
                    />
                    <StatCard label="Updated 24h" value={stats.recentlyUpdated ?? 0} color="amber" />
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-zinc-600"
                        placeholder="Search name, author, canonical id…"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <select
                    className="h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                >
                    <option value="">All statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </select>
                <select
                    className="h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                    value={transportFilter}
                    onChange={(e) => { setTransportFilter(e.target.value); setPage(0); }}
                >
                    <option value="">All transports</option>
                    <option value="stdio">stdio</option>
                    <option value="sse">SSE</option>
                    <option value="streamable_http">Streamable HTTP</option>
                    <option value="unknown">unknown</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/60">
                                <th className="text-left px-4 py-3 font-medium text-zinc-400 w-[280px]">Name</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Transport</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Install</th>
                                <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                                <th className="text-right px-4 py-3 font-medium text-zinc-400">Confidence</th>
                                <th className="text-right px-4 py-3 font-medium text-zinc-400">Stars</th>
                                <th className="text-right px-4 py-3 font-medium text-zinc-400 w-[100px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading || (isFetching && servers.length === 0) ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-zinc-500">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Loading catalog…
                                    </td>
                                </tr>
                            ) : servers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-zinc-500">
                                        <Package className="w-8 h-8 mx-auto mb-3 opacity-40" />
                                        <p>No servers in catalog yet.</p>
                                        <p className="text-xs mt-1 text-zinc-600">
                                            Click &ldquo;Sync Registries&rdquo; to ingest from external sources.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                servers.map((server) => (
                                    <ServerRow
                                        key={server.uuid}
                                        server={server}
                                        onValidate={() => validateMutation.mutate({ server_uuid: server.uuid })}
                                        isValidating={validateMutation.isPending && (validateMutation.variables as { server_uuid?: string } | undefined)?.server_uuid === server.uuid}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500">
                            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} servers
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-zinc-300" />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-zinc-300" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---- Sub-components ----

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: "zinc" | "emerald" | "red" | "amber";
}) {
    const colors = {
        zinc: "border-zinc-800 text-zinc-300",
        emerald: "border-emerald-900 text-emerald-400",
        red: "border-red-900 text-red-400",
        amber: "border-amber-900 text-amber-400",
    };
    return (
        <div className={`bg-zinc-900/40 border rounded-xl p-4 ${colors[color]}`}>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">{label}</div>
        </div>
    );
}

function ServerRow({
    server,
    onValidate,
    isValidating,
}: {
    server: Server;
    onValidate: () => void;
    isValidating: boolean;
}) {
    const statusCfg = getStatusConfig(server.status);
    const StatusIcon = statusCfg.icon;

    return (
        <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
            {/* Name + description */}
            <td className="px-4 py-3">
                <div className="font-medium text-zinc-200 truncate max-w-[260px]">
                    {server.display_name}
                </div>
                {server.description && (
                    <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[260px]">
                        {server.description}
                    </div>
                )}
                {server.author && (
                    <div className="text-xs text-zinc-600 mt-0.5">{server.author}</div>
                )}
            </td>

            {/* Transport */}
            <td className="px-4 py-3">
                <TransportBadge transport={server.transport} />
            </td>

            {/* Install method */}
            <td className="px-4 py-3">
                <InstallBadge method={server.install_method} />
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${statusCfg.color}`}
                >
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                </span>
            </td>

            {/* Confidence */}
            <td className="px-4 py-3 text-right">
                <ConfidenceBar value={server.confidence} />
            </td>

            {/* Stars */}
            <td className="px-4 py-3 text-right text-zinc-400 text-xs">
                {server.stars != null ? server.stars.toLocaleString() : "—"}
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    {server.repository_url && (
                        <a
                            href={server.repository_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-zinc-300"
                            title="Open repository"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                    <button
                        onClick={onValidate}
                        disabled={isValidating}
                        className="p-1.5 rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-indigo-400 disabled:opacity-40"
                        title="Run validation"
                    >
                        <PlayCircle className={`w-3.5 h-3.5 ${isValidating ? "animate-pulse" : ""}`} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function ConfidenceBar({ value }: { value: number }) {
    const pct = Math.min(100, Math.max(0, value));
    const color =
        pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
            ? "bg-amber-500"
            : pct >= 20
            ? "bg-zinc-500"
            : "bg-zinc-700";

    return (
        <div className="flex items-center gap-2 justify-end">
            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-zinc-500 w-8 text-right">{pct}%</span>
        </div>
    );
}
