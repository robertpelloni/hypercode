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
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
import type { AppRouter } from "@hypercode/core";
=======
import type { AppRouter } from "@borg/core";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx
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
    Download,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ListChecks,
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

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
type RegistryActionResult = {
    title: string;
    tone: 'success' | 'warning' | 'error';
    summary: string;
    details?: string[];
};

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx
export default function RegistryPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [transportFilter, setTransportFilter] = useState<string>("");
    const [page, setPage] = useState(0);
    const [installTarget, setInstallTarget] = useState<Server | null>(null);
    const [installName, setInstallName] = useState("");
    const [installEnv, setInstallEnv] = useState<Record<string, string>>({});
    const [showSecrets, setShowSecrets] = useState(false);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
    const [lastRegistryAction, setLastRegistryAction] = useState<RegistryActionResult | null>(null);
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx

    const utils = trpc.useContext();

    // Stats
    const statsQuery = trpc.catalog.stats.useQuery(undefined, {
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });

    // List query
    const listQuery = trpc.catalog.list.useQuery(
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
    const stats = statsQuery.data;
    const registryStatsUnavailable = statsQuery.isError || (statsQuery.data !== undefined && (!statsQuery.data || typeof statsQuery.data !== "object" || Array.isArray(statsQuery.data)));
    const registryListUnavailable = listQuery.isError || (listQuery.data !== undefined && (!listQuery.data || typeof listQuery.data !== "object" || Array.isArray(listQuery.data) || !Array.isArray((listQuery.data as { servers?: unknown[] }).servers)));
    const isLoading = listQuery.isLoading;
    const isFetching = listQuery.isFetching;

    const servers = !registryListUnavailable ? listQuery.data?.servers ?? [] : [];
    const total = !registryListUnavailable ? listQuery.data?.total ?? 0 : 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Ingestion trigger
    const ingestMutation = trpc.catalog.triggerIngestion.useMutation({
        onSuccess: (report) => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
            setLastRegistryAction({
                title: 'Registry Sync Complete',
                tone: 'success',
                summary: `${report.total_upserted} servers synced from ${report.results.length} sources.`,
                details: (report.results ?? []).map((entry: { source_name?: string; upserted?: number; skipped?: number; error?: string | null }) => {
                    const sourceName = entry.source_name ?? 'unknown-source';
                    const upserted = entry.upserted ?? 0;
                    const skipped = entry.skipped ?? 0;
                    const error = entry.error ? ` error=${entry.error}` : '';
                    return `${sourceName}: upserted=${upserted}, skipped=${skipped}${error}`;
                }),
            });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx
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

    // Install from validated/certified recipe
    const installMutation = trpc.catalog.installFromRecipe.useMutation({
        onSuccess: (result) => {
            toast.success(`Installed as ${result.name}`);
            utils.catalog.list.invalidate();
            utils.mcpServers.list.invalidate();
            setInstallTarget(null);
            setInstallName("");
            setInstallEnv({});
            setShowSecrets(false);
        },
        onError: (err) => {
            toast.error("Install failed: " + err.message);
        },
    });

    // Batch validate — runs validation on all normalized/probeable servers
    const batchValidateMutation = trpc.catalog.triggerBatchValidation.useMutation({
        onSuccess: (result) => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
            setLastRegistryAction({
                title: 'Batch Validation Result',
                tone: (result.failed ?? 0) > 0 ? 'warning' : 'success',
                summary: `${result.passed ?? 0} passed, ${result.failed ?? 0} failed, ${result.skipped ?? 0} skipped (${result.queued} queued)`,
            });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx
            toast.success(
                `Batch validation: ${result.passed ?? 0} passed, ${result.failed ?? 0} failed, ${result.skipped ?? 0} skipped (${result.queued} queued)`
            );
            utils.catalog.list.invalidate();
            utils.catalog.stats.invalidate();
        },
        onError: (err) => {
            toast.error("Batch validation error: " + err.message);
        },
    });

    const { data: installDetails, error: installDetailsError, isLoading: loadingInstallDetails } = trpc.catalog.get.useQuery(
        { uuid: installTarget?.uuid ?? "" },
        {
            enabled: Boolean(installTarget?.uuid),
            staleTime: 30_000,
        }
    );

    const requiredSecrets = installDetails?.activeRecipe?.required_secrets ?? [];
    const requiredEnv = installDetails?.activeRecipe?.required_env ?? {};
    const missingRequiredSecrets = requiredSecrets.filter((key) => !(installEnv[key] ?? "").trim());
    const canSubmitInstall =
        !installMutation.isPending &&
        Boolean(installTarget?.uuid) &&
        Boolean(installDetails?.activeRecipe) &&
        missingRequiredSecrets.length === 0;

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
                        {registryStatsUnavailable ? (
                            <span className="ml-2 text-red-300">{statsQuery.error?.message ?? "Registry stats unavailable."}</span>
                        ) : stats && (
                            <span className="ml-2 text-zinc-500">
                                {stats.total.toLocaleString()} total · {stats.validated} validated · {stats.broken} broken
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => batchValidateMutation.mutate({ statuses: ["normalized", "probeable"], max_servers: 10 })}
                        disabled={batchValidateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-sm font-medium text-zinc-200 transition-colors"
                        title="Validate up to 10 unvalidated servers"
                    >
                        <ListChecks className={`w-4 h-4 ${batchValidateMutation.isPending ? "animate-pulse" : ""}`} />
                        {batchValidateMutation.isPending ? "Validating…" : "Validate All"}
                    </button>
                    <button
                        onClick={() => ingestMutation.mutate()}
                        disabled={ingestMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 rounded-lg text-sm font-medium text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${ingestMutation.isPending ? "animate-spin" : ""}`} />
                        {ingestMutation.isPending ? "Syncing…" : "Sync Registries"}
                    </button>
                </div>
            </div>

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/page.tsx
            {lastRegistryAction ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${lastRegistryAction.tone === 'success' ? 'border-emerald-900/40 bg-emerald-950/10 text-emerald-100' : lastRegistryAction.tone === 'warning' ? 'border-amber-900/40 bg-amber-950/10 text-amber-100' : 'border-red-900/40 bg-red-950/10 text-red-100'}`}>
                    <div className="font-medium">{lastRegistryAction.title}</div>
                    <div className="mt-1">{lastRegistryAction.summary}</div>
                    {lastRegistryAction.details && lastRegistryAction.details.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-current/80">
                            {lastRegistryAction.details.map((detail) => (
                                <li key={detail} className="font-mono">{detail}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/page.tsx
            {registryListUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {listQuery.error?.message ?? "Registry catalog is unavailable."}
                </div>
            ) : null}

            {/* Stats cards */}
            {!registryStatsUnavailable && stats ? (
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
            ) : null}

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
                            ) : registryListUnavailable ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-red-300">
                                        {listQuery.error?.message ?? "Registry catalog is unavailable."}
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
                                        onInstall={() => {
                                            setInstallTarget(server);
                                            setInstallName("");
                                            setInstallEnv({});
                                            setShowSecrets(false);
                                        }}
                                        onDetail={() => router.push(`/dashboard/registry/${server.uuid}`)}
                                        isValidating={validateMutation.isPending && (validateMutation.variables as { server_uuid?: string } | undefined)?.server_uuid === server.uuid}
                                        isInstalling={installMutation.isPending && (installMutation.variables as { server_uuid?: string } | undefined)?.server_uuid === server.uuid}
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

            {installTarget && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <div className="px-5 py-4 border-b border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-100">Install from verified recipe</h2>
                            <p className="text-xs text-zinc-500 mt-1">
                                {installTarget.display_name} · provide required values before install.
                            </p>
                        </div>

                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            {installDetailsError && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                                    Install details unavailable: {installDetailsError.message}
                                </div>
                            )}

                            {loadingInstallDetails && !installDetailsError && (
                                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-400">
                                    Loading install recipe details…
                                </div>
                            )}

                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Optional server name override</label>
                                <input
                                    className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                    placeholder="auto-generated from catalog"
                                    value={installName}
                                    onChange={(e) => setInstallName(e.target.value)}
                                />
                            </div>

                            {Object.keys(requiredEnv).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-300">Recommended environment defaults</p>
                                    {Object.entries(requiredEnv).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="block text-xs text-zinc-500 mb-1">{key}</label>
                                            <input
                                                className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                value={installEnv[key] ?? value}
                                                onChange={(e) =>
                                                    setInstallEnv((prev) => ({ ...prev, [key]: e.target.value }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {requiredSecrets.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-zinc-300">Required secret values</p>
                                        <button
                                            type="button"
                                            className="text-xs text-zinc-500 hover:text-zinc-300"
                                            onClick={() => setShowSecrets((v) => !v)}
                                        >
                                            {showSecrets ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {requiredSecrets.map((key) => (
                                        <div key={key}>
                                            <label className="block text-xs text-zinc-500 mb-1">{key}</label>
                                            <input
                                                className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                type={showSecrets ? "text" : "password"}
                                                value={installEnv[key] ?? ""}
                                                onChange={(e) =>
                                                    setInstallEnv((prev) => ({ ...prev, [key]: e.target.value }))
                                                }
                                            />
                                        </div>
                                    ))}
                                    {missingRequiredSecrets.length > 0 && (
                                        <p className="text-xs text-amber-400">
                                            Missing required values: {missingRequiredSecrets.join(", ")}
                                        </p>
                                    )}
                                </div>
                            )}

                            {!loadingInstallDetails && !installDetailsError && !installDetails?.activeRecipe && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                                    No install recipe is currently available for this catalog entry.
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                            <button
                                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                                onClick={() => {
                                    setInstallTarget(null);
                                    setInstallName("");
                                    setInstallEnv({});
                                    setShowSecrets(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900 disabled:text-emerald-300"
                                disabled={!canSubmitInstall}
                                onClick={() => {
                                    if (!installTarget) return;
                                    installMutation.mutate({
                                        server_uuid: installTarget.uuid,
                                        name: installName.trim() || undefined,
                                        env: installEnv,
                                    });
                                }}
                            >
                                {installMutation.isPending ? "Installing…" : "Install"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    onInstall,
    onDetail,
    isValidating,
    isInstalling,
}: {
    server: Server;
    onValidate: () => void;
    onInstall: () => void;
    onDetail: () => void;
    isValidating: boolean;
    isInstalling: boolean;
}) {
    const statusCfg = getStatusConfig(server.status);
    const StatusIcon = statusCfg.icon;
    const canInstall = server.status === "validated" || server.status === "certified";

    return (
        <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
            {/* Name + description — click → detail page */}
            <td className="px-4 py-3 cursor-pointer" onClick={onDetail}>
                <div className="font-medium text-zinc-200 truncate max-w-[260px] hover:text-indigo-300 transition-colors">
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
                    <button
                        onClick={onInstall}
                        disabled={!canInstall || isInstalling}
                        className="p-1.5 rounded hover:bg-zinc-700 transition-colors text-zinc-500 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={canInstall ? "Install from active recipe" : "Install enabled after validation"}
                    >
                        <Download className={`w-3.5 h-3.5 ${isInstalling ? "animate-pulse" : ""}`} />
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
