"use client";

/**
 * @file page.tsx
 * @route /dashboard/registry/[uuid]
 *
 * WHAT:
 * Server detail view for a single published MCP catalog entry.
 * Shows full metadata, validation history, active recipe, and provenance sources.
 *
 * WHY:
 * The registry table gives operators a bird's-eye view, but they need a
 * drill-down to make informed install/trust decisions. This page is the
 * "truth page" for a single published server — no guessing, no placeholders.
 *
 * SECTIONS:
 *   1. Header — name, status badge, transport, install method, confidence bar
 *   2. Metadata — description, author, repository, homepage, tags, categories
 *   3. Validation history — timestamp, outcome, tool_count, failure_class
 *   4. Active recipe — template template, required_secrets, required_env, confidence
 *   5. Provenance sources — which registries listed this server and when
 *   6. Actions — Validate, Install (if validated/certified)
 */

import { trpc } from "@/utils/trpc";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Clock,
    Database,
    Package,
    Globe,
    Cpu,
    ExternalLink,
    PlayCircle,
    Download,
    Star,
    Tag,
    Link,
    ShieldCheck,
    FileCode,
    ListChecks,
    RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
import type { AppRouter } from "@hypercode/core";
=======
import type { AppRouter } from "@borg/core";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx

// ---- Types ----

type RouterOutput = inferRouterOutputs<AppRouter>;
type ServerDetail = RouterOutput["catalog"]["get"];
type ValidationRun = RouterOutput["catalog"]["listRuns"][number];

type ServerStatus =
    | "discovered"
    | "normalized"
    | "probeable"
    | "validated"
    | "certified"
    | "broken"
    | "archived";

// ---- Status config ----

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

// ---- Outcome config ----

const OUTCOME_COLOR: Record<string, string> = {
    passed: "text-emerald-400",
    failed: "text-red-400",
    error: "text-red-400",
    timeout: "text-amber-400",
    skipped: "text-zinc-500",
    pending: "text-blue-400",
};

/**
 * Human-readable descriptions for validation failure_class values produced by
 * published-catalog-validator.ts.  Each entry includes a short label and an
 * operator-actionable hint so the UI can surface "what does this mean and what can
 * I do about it?" rather than just showing the raw machine code.
 */
const FAILURE_CLASS_INFO: Record<
    string,
    { label: string; hint: string; severity: "error" | "warning" | "info" }
> = {
    no_recipe: {
        label: "No install recipe",
        hint: "The Configurator has not generated a recipe for this server yet. Try running validation to trigger recipe generation, or wait for the next catalog sync.",
        severity: "warning",
    },
    stdio_unsafe: {
        label: "STDIO — sandbox required",
        hint: "This server uses STDIO transport. Live validation requires Docker sandbox isolation which is not yet enabled. The server can still be installed manually if you trust the source.",
        severity: "info",
    },
    no_url_in_recipe: {
        label: "Missing server URL",
        hint: "The active recipe has no URL. This is common for SSE/HTTP servers whose endpoint is listed only in documentation. Check the repository for the correct endpoint and update the recipe.",
        severity: "warning",
    },
    timeout: {
        label: "Connection timed out",
        hint: "The server did not respond within 10 seconds. It may be offline, overloaded, or rate-limiting. Try again later or check the server status page.",
        severity: "error",
    },
    network_unreachable: {
        label: "Network unreachable",
        hint: "DNS lookup or TCP connection failed — the server's host may be down or the URL is incorrect. Verify the repository for the current endpoint.",
        severity: "error",
    },
    connection_error: {
        label: "Connection error",
        hint: "A network-level error occurred when contacting the server. Check your internet connection and try again.",
        severity: "error",
    },
    protocol_error: {
        label: "MCP protocol error",
        hint: "The server responded but the MCP handshake (tools/list) failed. It may require authentication, run a different MCP version, or have a bug.",
        severity: "error",
    },
    auth_required: {
        label: "Authentication required",
        hint: "The server requires credentials (API key, OAuth token, etc.). Add the required secrets via the Install dialog and try again.",
        severity: "warning",
    },
    unexpected_error: {
        label: "Unexpected validation error",
        hint: "An unhandled error occurred during validation. This is likely a bug in the validator. Check the findings_summary for details.",
        severity: "error",
    },
};

function outcomeIcon(outcome: string) {
    if (outcome === "passed") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (outcome === "failed" || outcome === "error") return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    if (outcome === "skipped") return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
    return <Clock className="w-3.5 h-3.5 text-blue-400" />;
}

function formatDate(value: string | Date | null | undefined): string {
    if (!value) return "—";
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}
function formatRelativeTime(value: string | Date | null | undefined): string {
    if (!value) return "—";
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "—";
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
}

// ---- Main page ----

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
type RegistryDetailActionResult = {
    title: string;
    tone: 'success' | 'warning' | 'error';
    summary: string;
    details?: string[];
};

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx
export default function ServerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const uuid = typeof params?.uuid === "string" ? params.uuid : "";

    const [installName, setInstallName] = useState("");
    const [installEnv, setInstallEnv] = useState<Record<string, string>>({});
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
    const [lastActionResult, setLastActionResult] = useState<RegistryDetailActionResult | null>(null);
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx

    const utils = trpc.useContext();

    // Server detail query
    const { data: detail, isLoading, error: detailError } = trpc.catalog.get.useQuery(
        { uuid },
        { enabled: Boolean(uuid), staleTime: 30_000 }
    );

    // Validation run history (up to 20)
    const { data: runs = [], isFetching: loadingRuns } = trpc.catalog.listRuns.useQuery(
        { server_uuid: uuid, limit: 20 },
        { enabled: Boolean(uuid), staleTime: 30_000 }
    );

    // Linked managed servers (servers installed from this published catalog entry)
    const { data: linkedServers = [], isFetching: loadingLinkedServers } = trpc.catalog.listLinkedServers.useQuery(
        { published_server_uuid: uuid },
        { enabled: Boolean(uuid), staleTime: 30_000 }
    );

    // Validate mutation
    const validateMutation = trpc.catalog.triggerValidation.useMutation({
        onSuccess: (result) => {
            const icon = result.outcome === "passed" ? "✅" : result.outcome === "skipped" ? "⏭️" : "❌";
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            setLastActionResult({
                title: 'Validation Result',
                tone: result.outcome === 'passed' ? 'success' : result.outcome === 'skipped' ? 'warning' : 'error',
                summary: `${icon} Validation ${result.outcome}${result.tool_count != null ? ` — ${result.tool_count} tools` : ""}`,
                details: [
                    `server_uuid=${uuid}`,
                    ...(result.failure_class ? [`failure_class=${result.failure_class}`] : []),
                ],
            });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            toast.success(
                `${icon} Validation ${result.outcome}${result.tool_count != null ? ` — ${result.tool_count} tools` : ""}`
            );
            utils.catalog.get.invalidate({ uuid });
            utils.catalog.listRuns.invalidate({ server_uuid: uuid });
        },
        onError: (err) => {
            toast.error("Validation error: " + err.message);
        },
    });

    // Install mutation
    const installMutation = trpc.catalog.installFromRecipe.useMutation({
        onSuccess: (result) => {
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            setLastActionResult({
                title: 'Install Result',
                tone: 'success',
                summary: `Installed as "${result.name}"`,
                details: [
                    `server_uuid=${uuid}`,
                    `managed_name=${result.name}`,
                ],
            });
=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            toast.success(`Installed as "${result.name}"`);
            utils.catalog.get.invalidate({ uuid });
            utils.mcpServers.list.invalidate();
            setShowInstallModal(false);
            setInstallName("");
            setInstallEnv({});
            setShowSecrets(false);
        },
        onError: (err) => {
            toast.error("Install failed: " + err.message);
        },
    });

    if (!uuid) {
        return (
            <div className="p-8 text-center text-zinc-500">Invalid server UUID.</div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center gap-3 text-zinc-500">
                <RefreshCw className="w-5 h-5 animate-spin" /> Loading…
            </div>
        );
    }

    if (detailError) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle className="w-10 h-10 mx-auto text-red-500 opacity-60" />
                <p className="text-zinc-300">Catalog entry unavailable.</p>
                <p className="text-sm text-zinc-500">{detailError.message}</p>
                <button
                    onClick={() => router.back()}
                    className="text-sm text-indigo-400 hover:underline"
                >
                    ← Back to registry
                </button>
            </div>
        );
    }

    if (!detail?.server) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle className="w-10 h-10 mx-auto text-red-500 opacity-60" />
                <p className="text-zinc-400">Server not found in catalog.</p>
                <button
                    onClick={() => router.back()}
                    className="text-sm text-indigo-400 hover:underline"
                >
                    ← Back to registry
                </button>
            </div>
        );
    }

    const { server, latestRun, activeRecipe, sources } = detail;
    const statusCfg = getStatusConfig(server.status);
    const StatusIcon = statusCfg.icon;
    const canInstall = server.status === "validated" || server.status === "certified";

    const requiredSecrets = activeRecipe?.required_secrets ?? [];
    const requiredEnv = activeRecipe?.required_env ?? {};
    const missingSecrets = requiredSecrets.filter((k) => !(installEnv[k] ?? "").trim());
    const canSubmit =
        !installMutation.isPending &&
        Boolean(activeRecipe) &&
        missingSecrets.length === 0;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Back + breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
                <button
                    onClick={() => router.push("/dashboard/registry")}
                    className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    MCP Registry
                </button>
                <span>/</span>
                <span className="text-zinc-300 truncate max-w-xs">{server.display_name}</span>
            </div>

<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            {lastActionResult ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${lastActionResult.tone === 'success' ? 'border-emerald-900/40 bg-emerald-950/10 text-emerald-100' : lastActionResult.tone === 'warning' ? 'border-amber-900/40 bg-amber-950/10 text-amber-100' : 'border-red-900/40 bg-red-950/10 text-red-100'}`}>
                    <div className="font-medium">{lastActionResult.title}</div>
                    <div className="mt-1">{lastActionResult.summary}</div>
                    {lastActionResult.details && lastActionResult.details.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-current/80">
                            {lastActionResult.details.map((detail) => (
                                <li key={detail} className="font-mono">{detail}</li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}

=======
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/registry/[uuid]/page.tsx
            {/* Header card */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-zinc-100 truncate">{server.display_name}</h1>
                        {server.author && (
                            <p className="text-sm text-zinc-500 mt-0.5">by {server.author}</p>
                        )}
                        {server.description && (
                            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{server.description}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {server.repository_url && (
                            <a
                                href={server.repository_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Repository
                            </a>
                        )}
                        <button
                            onClick={() => validateMutation.mutate({ server_uuid: uuid })}
                            disabled={validateMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-zinc-700 text-zinc-400 hover:text-indigo-400 hover:border-indigo-700 disabled:opacity-40 transition-colors"
                        >
                            <PlayCircle className={`w-3.5 h-3.5 ${validateMutation.isPending ? "animate-pulse" : ""}`} />
                            {validateMutation.isPending ? "Validating…" : "Validate"}
                        </button>
                        {canInstall && (
                            <button
                                onClick={() => { setShowInstallModal(true); setInstallName(""); setInstallEnv({}); setShowSecrets(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Install
                            </button>
                        )}
                    </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <Globe className="w-3 h-3" />
                        {server.transport}
                    </span>
                    {server.install_method && server.install_method !== "unknown" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <Cpu className="w-3 h-3" />
                            {server.install_method}
                        </span>
                    )}
                    {server.stars != null && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <Star className="w-3 h-3" />
                            {server.stars.toLocaleString()}
                        </span>
                    )}
                    {/* Confidence */}
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-zinc-800 border border-zinc-700">
                        <ShieldCheck className={`w-3 h-3 ${server.confidence >= 70 ? "text-emerald-400" : server.confidence >= 40 ? "text-amber-400" : "text-red-400"}`} />
                        <span className="text-zinc-300">{server.confidence}% confidence</span>
                    </span>
                </div>

                {/* Tags + Categories */}
                {((server.tags && server.tags.length > 0) || (server.categories && server.categories.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {(server.categories ?? []).map((cat: string) => (
                            <span key={`cat-${cat}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-950/50 text-indigo-400 border border-indigo-900/50">
                                {cat}
                            </span>
                        ))}
                        {(server.tags ?? []).map((tag: string) => (
                            <span key={`tag-${tag}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800/80 text-zinc-500 border border-zinc-800">
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Known Blocker banner — shown when the latest run has a failure class */}
            {latestRun?.failure_class && latestRun.outcome !== "passed" && (() => {
                const info = FAILURE_CLASS_INFO[latestRun.failure_class] ?? {
                    label: latestRun.failure_class,
                    hint: "See validation history for details.",
                    severity: "error" as const,
                };
                const bannerColor =
                    info.severity === "error"
                        ? "bg-red-950/30 border-red-900/40"
                        : info.severity === "warning"
                        ? "bg-amber-950/30 border-amber-900/40"
                        : "bg-zinc-900/50 border-zinc-800";
                const labelColor =
                    info.severity === "error" ? "text-red-400" :
                    info.severity === "warning" ? "text-amber-400" :
                    "text-zinc-400";
                const Icon =
                    info.severity === "error" ? AlertCircle :
                    info.severity === "warning" ? AlertCircle :
                    Clock;
                return (
                    <div className={`flex gap-3 p-4 rounded-xl border ${bannerColor}`}>
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${labelColor}`} />
                        <div>
                            <p className={`text-sm font-medium ${labelColor}`}>Known blocker: {info.label}</p>
                            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{info.hint}</p>
                        </div>
                    </div>
                );
            })()}

            {/* Two-column layout for recipe + history */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Recipe */}
                <Section icon={FileCode} title="Active Install Recipe">
                    {activeRecipe ? (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Recipe version</span>
                                <span className="text-zinc-300">v{activeRecipe.recipe_version}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-500">Confidence</span>
                                <span className={activeRecipe.confidence >= 70 ? "text-emerald-400" : "text-amber-400"}>
                                    {activeRecipe.confidence}%
                                </span>
                            </div>
                            {activeRecipe.explanation && (
                                <p className="text-xs text-zinc-500 italic leading-relaxed">{activeRecipe.explanation}</p>
                            )}
                            {requiredSecrets.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-zinc-400 mb-1">Required secrets</p>
                                    <ul className="space-y-1">
                                        {requiredSecrets.map((k: string) => (
                                            <li key={k} className="text-xs font-mono text-amber-400 bg-amber-950/30 border border-amber-900/40 rounded px-2 py-1">
                                                {k}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {Object.keys(requiredEnv as Record<string, string>).length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-zinc-400 mb-1">Env defaults</p>
                                    <ul className="space-y-1">
                                        {Object.entries(requiredEnv as Record<string, string>).map(([k, v]) => (
                                            <li key={k} className="text-xs font-mono text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1">
                                                <span className="text-zinc-300">{k}</span>
                                                {v && <span className="text-zinc-600"> = {v}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Template preview (collapsed, code block) */}
                            <details className="group">
                                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">
                                    View template JSON
                                </summary>
                                <pre className="mt-2 text-xs bg-zinc-900 border border-zinc-800 rounded p-3 overflow-x-auto text-zinc-400 leading-relaxed">
                                    {JSON.stringify(activeRecipe.template, null, 2)}
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-600 italic">No active recipe. Run validation to generate one.</p>
                    )}
                </Section>

                {/* Validation History */}
                <Section icon={ListChecks} title="Validation History">
                    {loadingRuns ? (
                        <div className="flex gap-2 items-center text-zinc-500 text-sm">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                    ) : runs.length === 0 ? (
                        <p className="text-sm text-zinc-600 italic">No validation runs yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {runs.map((run: ValidationRun) => {
                                const failureInfo = run.failure_class
                                    ? (FAILURE_CLASS_INFO[run.failure_class] ?? {
                                        label: run.failure_class,
                                        hint: "See findings summary for details.",
                                        severity: "error" as const,
                                    })
                                    : null;
                                return (
                                <li key={run.uuid} className="text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900/30">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {outcomeIcon(run.outcome)}
                                            <span className={`font-medium ${OUTCOME_COLOR[run.outcome] ?? "text-zinc-400"}`}>
                                                {run.outcome}
                                            </span>
                                            {run.tool_count != null && (
                                                <span className="text-zinc-600">· {run.tool_count} tools</span>
                                            )}
                                        </div>
                                        <span className="text-zinc-600 text-xs shrink-0" title={formatDate(run.started_at)}>{formatRelativeTime(run.started_at)}</span>
                                    </div>
                                    {failureInfo && (
                                        <div className={`mt-1.5 rounded px-2 py-1 ${
                                            failureInfo.severity === "error"
                                                ? "bg-red-950/40 border border-red-900/40"
                                                : failureInfo.severity === "warning"
                                                ? "bg-amber-950/30 border border-amber-900/30"
                                                : "bg-zinc-900/50 border border-zinc-800"
                                        }`}>
                                            <p className={`font-medium text-xs ${
                                                failureInfo.severity === "error" ? "text-red-400" :
                                                failureInfo.severity === "warning" ? "text-amber-400" :
                                                "text-zinc-400"
                                            }`}>{failureInfo.label}</p>
                                            <p className="text-zinc-500 mt-0.5 leading-relaxed">{failureInfo.hint}</p>
                                        </div>
                                    )}
                                    <p className="mt-0.5 text-zinc-600">{run.run_mode} · by {run.performed_by}</p>
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>
            </div>

            {/* Provenance Sources */}
            {sources && sources.length > 0 && (
                <Section icon={Link} title="Provenance Sources">
                    <ul className="space-y-2">
                        {sources.map((src) => (
                            <li key={src.uuid} className="flex items-center justify-between text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900/30">
                                <div>
                                    <span className="font-medium text-zinc-300">{src.source_name}</span>
                                    {src.source_url && (
                                        <a
                                            href={src.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 text-indigo-400 hover:underline"
                                        >
                                            {src.source_url}
                                        </a>
                                    )}
                                </div>
                                <span className="text-zinc-600 text-xs shrink-0">
                                    Last seen {formatDate(src.last_seen_at)}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {/* Installed as */}
            {linkedServers && linkedServers.length > 0 && (
                <Section icon={Download} title="Installed as">
                    <ul className="space-y-2">
                        {linkedServers.map((server) => {
                            const transport = (server.type ?? "STDIO").toLowerCase();
                            const isRunning = !server.error_status;

                            return (
                                <li key={server.uuid} className="flex items-center justify-between text-xs border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900/30">
                                    <button
                                        onClick={() => router.push(`/dashboard/mcp/servers/${server.uuid}`)}
                                        className="text-indigo-400 hover:underline text-left"
                                    >
                                        <div className="font-medium">{server.name}</div>
                                        <div className="text-zinc-500 text-xs mt-0.5">{transport || "stdio"}</div>
                                    </button>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                        isRunning ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
                                    }`}>
                                        {isRunning ? "✓ Running" : "⚠ Not running"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    {loadingLinkedServers && (
                        <div className="flex gap-2 items-center text-zinc-500 text-sm mt-2">
                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
                        </div>
                    )}
                </Section>
            )}

            {/* Metadata */}
            <Section icon={Database} title="Metadata">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <MetaRow label="Canonical ID" value={server.canonical_id} mono />
                    <MetaRow label="Auth model" value={server.auth_model} />
                    <MetaRow label="Created" value={formatDate(server.created_at)} />
                    <MetaRow label="Updated" value={formatDate(server.updated_at)} />
                    <MetaRow label="Last seen" value={formatDate(server.last_seen_at)} />
                    <MetaRow label="Last verified" value={formatDate(server.last_verified_at)} />
                    {server.homepage_url && (
                        <dt className="text-zinc-500">Homepage</dt>
                    )}
                    {server.homepage_url && (
                        <dd>
                            <a href={server.homepage_url} target="_blank" rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline"
                            >
                                {server.homepage_url}
                            </a>
                        </dd>
                    )}
                    {server.categories && server.categories.length > 0 && (
                        <>
                            <dt className="text-zinc-500">Categories</dt>
                            <dd className="text-zinc-300">{server.categories.join(", ")}</dd>
                        </>
                    )}
                </dl>
            </Section>

            {/* Install modal */}
            {showInstallModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
                        <div className="px-5 py-4 border-b border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-100">Install from verified recipe</h2>
                            <p className="text-xs text-zinc-500 mt-1">
                                {server.display_name} · provide any required values before install.
                            </p>
                        </div>
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1">Optional name override</label>
                                <input
                                    className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                    placeholder="auto-generated from catalog"
                                    value={installName}
                                    onChange={(e) => setInstallName(e.target.value)}
                                />
                            </div>
                            {Object.keys(requiredEnv as Record<string, string>).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-300">Recommended environment defaults</p>
                                    {Object.entries(requiredEnv as Record<string, string>).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="block text-xs text-zinc-500 mb-1">{key}</label>
                                            <input
                                                className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                value={installEnv[key] ?? value}
                                                onChange={(e) => setInstallEnv((prev) => ({ ...prev, [key]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {requiredSecrets.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-zinc-300">Required secrets</p>
                                        <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setShowSecrets((v) => !v)}>
                                            {showSecrets ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    {requiredSecrets.map((key: string) => (
                                        <div key={key}>
                                            <label className="block text-xs text-zinc-500 mb-1">{key}</label>
                                            <input
                                                type={showSecrets ? "text" : "password"}
                                                className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                                value={installEnv[key] ?? ""}
                                                onChange={(e) => setInstallEnv((prev) => ({ ...prev, [key]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                    {missingSecrets.length > 0 && (
                                        <p className="text-xs text-amber-400">Missing: {missingSecrets.join(", ")}</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                            <button
                                className="px-3 py-1.5 text-xs rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                                onClick={() => { setShowInstallModal(false); setInstallName(""); setInstallEnv({}); setShowSecrets(false); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900 disabled:text-emerald-300"
                                disabled={!canSubmit}
                                onClick={() => {
                                    installMutation.mutate({
                                        server_uuid: uuid,
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

function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4 text-zinc-500" />
                <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function MetaRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    if (!value) return null;
    return (
        <>
            <dt className="text-zinc-500">{label}</dt>
            <dd className={`text-zinc-300 truncate ${mono ? "font-mono text-indigo-400" : ""}`}>{value}</dd>
        </>
    );
}
