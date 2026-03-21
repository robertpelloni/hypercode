"use client";

/**
 * autopilot/page.tsx – Borg Orchestrator Dashboard (legacy compatibility route)
 *
 * Native Borg-integrated control panel for the Borg Orchestrator council runtime.
 *
 * Provides:
 *  - Council status: supervisor roster, consensus mode, enable/disable toggle
 *  - Sessions list with start / stop / resume / guidance controls
 *  - CLI tools detection panel for supported harness targets
 *  - Veto queue (pending decisions awaiting human approval)
 *  - Debate history log
 *  - Server health bar
 *
 * The orchestrator service exposes a REST API at NEXT_PUBLIC_BORG_ORCHESTRATOR_URL
 * (default: http://localhost:3847). The legacy NEXT_PUBLIC_AUTOPILOT_URL
 * variable remains supported for compatibility during migration.
 *
 * If the service is unreachable the page shows a clear "offline" banner and
 * all controls are disabled – we never render fake/stale data.
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Activity,
    AlertCircle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Gavel,
    History,
    Loader2,
    MessageSquare,
    Play,
    Plus,
    Power,
    RefreshCw,
    Server,
    Square,
    Terminal,
    Users,
    Wrench,
    XCircle,
    Zap,
} from "lucide-react";
import { PageStatusBanner } from "@/components/PageStatusBanner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupervisorInfo {
    id: string;
    name: string;
    model?: string;
    provider?: string;
    enabled?: boolean;
    weight?: number;
}

interface CouncilStatus {
    enabled: boolean;
    supervisors: SupervisorInfo[];
    consensusMode: string;
    consensusThreshold?: number;
    leadSupervisor?: string | null;
    smartPilot?: boolean;
}

type SessionStatus =
    | "active"
    | "stopped"
    | "error"
    | "starting"
    | "stopping"
    | "idle";

interface AutopilotSession {
    id: string;
    cliType: string;
    status: SessionStatus;
    task?: string;
    template?: string;
    tags?: string[];
    startedAt?: string;
    lastActivity?: string;
    pid?: number;
}

interface CliTool {
    type: string;
    name: string;
    installed: boolean;
    version?: string;
    path?: string;
}

interface VetoPending {
    id: string;
    sessionId?: string;
    description?: string;
    createdAt?: string;
}

interface DebateEntry {
    id?: string;
    task?: string;
    consensus?: string;
    outcome?: string;
    timestamp?: string;
    rounds?: number;
}

interface ServerHealth {
    uptime?: number;
    memoryUsedMb?: number;
    memoryTotalMb?: number;
    version?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONSENSUS_MODES = [
    "simple-majority",
    "supermajority",
    "unanimous",
    "weighted",
    "ceo-override",
    "ceo-veto",
    "hybrid-ceo-majority",
    "ranked-choice",
] as const;

type ConsensusModeType = (typeof CONSENSUS_MODES)[number];

const STATUS_CHIP: Record<SessionStatus, string> = {
    active:   "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
    stopped:  "bg-zinc-800 text-zinc-400 border-zinc-700",
    error:    "bg-red-900/30 text-red-300 border-red-700/50",
    starting: "bg-yellow-900/30 text-yellow-300 border-yellow-700/50",
    stopping: "bg-yellow-900/30 text-yellow-300 border-yellow-700/50",
    idle:     "bg-blue-900/30 text-blue-300 border-blue-700/50",
};

function fmtDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ─── Hook: orchestrator API client ─────────────────────────────────────────

const BASE = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_BORG_ORCHESTRATOR_URL ?? process.env.NEXT_PUBLIC_AUTOPILOT_URL ?? "http://localhost:3847")
    : "http://localhost:3847";

/** Simple result container — avoids discriminant-union narrowing issues. */
interface ApResult<T> {
    ok: boolean;
    data?: T;
    error?: string;
}

async function apFetch<T>(
    path: string,
    opts?: RequestInit
): Promise<ApResult<T>> {
    try {
        const res = await fetch(`${BASE}${path}`, {
            headers: { "Content-Type": "application/json" },
            ...opts,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
        }
        const data: T = await res.json();
        return { ok: true, data };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
    }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
    return (
        <span
            className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}
        />
    );
}

function SectionCard({
    title,
    icon,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800/60 text-left"
            >
                <span className="text-zinc-400">{icon}</span>
                <span className="font-semibold text-sm text-zinc-200">{title}</span>
                <span className="ml-auto text-zinc-600">
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BorgOrchestratorDashboardPage() {
    // ── state ──────────────────────────────────────────────────────────────
    const [online, setOnline] = useState<boolean | null>(null);
    const [council, setCouncil] = useState<CouncilStatus | null>(null);
    const [sessions, setSessions] = useState<AutopilotSession[]>([]);
    const [cliTools, setCliTools] = useState<CliTool[]>([]);
    const [vetoPending, setVetoPending] = useState<VetoPending[]>([]);
    const [debateHistory, setDebateHistory] = useState<DebateEntry[]>([]);
    const [health, setHealth] = useState<ServerHealth | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    // New session form
    const [showNewSession, setShowNewSession] = useState(false);
    const [newTask, setNewTask] = useState("");
    const [newCliType, setNewCliType] = useState("opencode");
    const [startingSession, setStartingSession] = useState(false);

    // Guidance form
    const [guidanceTarget, setGuidanceTarget] = useState<string | null>(null);
    const [guidanceText, setGuidanceText] = useState("");
    const [sendingGuidance, setSendingGuidance] = useState(false);

    // Consensus mode setter
    const [settingMode, setSettingMode] = useState(false);

    const serverUrl = BASE;

    // ── data fetching ──────────────────────────────────────────────────────

    const refresh = useCallback(async () => {
        setLoading(true);
        setLastError(null);

        const [
            healthRes,
            councilRes,
            sessionsRes,
            cliRes,
            vetoRes,
            debateRes,
        ] = await Promise.all([
            apFetch<{ uptime?: number; memUsed?: number; memTotal?: number; version?: string } | null>("/api/health/server"),
            apFetch<{ council?: CouncilStatus; enabled?: boolean; supervisors?: SupervisorInfo[] }>("/api/council/status"),
            apFetch<{ sessions?: AutopilotSession[] } | AutopilotSession[]>("/api/sessions"),
            apFetch<{ tools?: CliTool[] } | CliTool[]>("/api/cli/tools"),
            apFetch<{ pending?: VetoPending[] } | VetoPending[]>("/api/veto/pending"),
            apFetch<{ entries?: DebateEntry[] } | DebateEntry[]>("/api/debate-history/status"),
        ]);

        if (!healthRes.ok) {
            setOnline(false);
            setLastError(`Server unreachable: ${healthRes.error ?? "connection refused"}`);
            setLoading(false);
            return;
        }
        setOnline(true);

        // health
        const h = healthRes.data;
        if (h) {
            setHealth({
                uptime: h.uptime,
                memoryUsedMb: h.memUsed,
                memoryTotalMb: h.memTotal,
                version: h.version,
            });
        }

        // council
        if (councilRes.ok) {
            const d = councilRes.data;
            const c: CouncilStatus = {
                enabled: (d as any)?.enabled ?? (d as any)?.council?.enabled ?? false,
                supervisors: (d as any)?.supervisors ?? (d as any)?.council?.supervisors ?? [],
                consensusMode: (d as any)?.consensusMode ?? (d as any)?.council?.consensusMode ?? "simple-majority",
            };
            setCouncil(c);
        }

        // sessions
        if (sessionsRes.ok) {
            const d = sessionsRes.data;
            const list: AutopilotSession[] = Array.isArray(d)
                ? (d as AutopilotSession[])
                : ((d as any)?.sessions ?? []);
            setSessions(list);
        }

        // cli tools
        if (cliRes.ok) {
            const d = cliRes.data;
            const list: CliTool[] = Array.isArray(d)
                ? (d as CliTool[])
                : ((d as any)?.tools ?? []);
            setCliTools(list);
        }

        // veto pending
        if (vetoRes.ok) {
            const d = vetoRes.data;
            const list: VetoPending[] = Array.isArray(d)
                ? (d as VetoPending[])
                : ((d as any)?.pending ?? []);
            setVetoPending(list);
        }

        // debate history
        if (debateRes.ok) {
            const d = debateRes.data;
            const list: DebateEntry[] = Array.isArray(d)
                ? (d as DebateEntry[])
                : ((d as any)?.entries ?? (d as any)?.debates ?? []);
            setDebateHistory(list.slice(0, 20)); // keep most recent 20
        }

        setLoading(false);
    }, []);

    // Auto-refresh every 8 s while mounted
    useEffect(() => {
        void refresh();
        const t = setInterval(() => void refresh(), 8000);
        return () => clearInterval(t);
    }, [refresh]);

    // ── actions ────────────────────────────────────────────────────────────

    const toggleCouncil = useCallback(async () => {
        const res = await apFetch("/api/council/toggle", { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const setConsensusMode = useCallback(async (mode: ConsensusModeType) => {
        setSettingMode(true);
        const res = await apFetch("/api/council/consensus-mode", {
            method: "POST",
            body: JSON.stringify({ mode }),
        });
        setSettingMode(false);
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const startSession = useCallback(async () => {
        if (!newTask.trim()) return;
        setStartingSession(true);
        const res = await apFetch("/api/sessions/start", {
            method: "POST",
            body: JSON.stringify({ task: newTask.trim(), cliType: newCliType }),
        });
        setStartingSession(false);
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        setNewTask("");
        setShowNewSession(false);
        void refresh();
    }, [newTask, newCliType, refresh]);

    const stopSession = useCallback(async (id: string) => {
        const res = await apFetch(`/api/sessions/${id}/stop`, { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const resumeSession = useCallback(async (id: string) => {
        const res = await apFetch(`/api/sessions/${id}/resume`, { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const sendGuidance = useCallback(async () => {
        if (!guidanceTarget || !guidanceText.trim()) return;
        setSendingGuidance(true);
        const res = await apFetch(`/api/sessions/${guidanceTarget}/guidance`, {
            method: "POST",
            body: JSON.stringify({ guidance: guidanceText.trim() }),
        });
        setSendingGuidance(false);
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        setGuidanceText("");
        setGuidanceTarget(null);
        void refresh();
    }, [guidanceTarget, guidanceText, refresh]);

    const approveVeto = useCallback(async (id: string) => {
        const res = await apFetch(`/api/veto/pending/${id}/approve`, { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const rejectVeto = useCallback(async (id: string) => {
        const res = await apFetch(`/api/veto/pending/${id}/reject`, { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    // ── derived ────────────────────────────────────────────────────────────

    const activeSessions = useMemo(
        () => sessions.filter((s) => s.status === "active"),
        [sessions]
    );
    const installedCli = useMemo(
        () => cliTools.filter((t) => t.installed),
        [cliTools]
    );

    // ── render ─────────────────────────────────────────────────────────────

    return (
        <div className="w-full h-full flex flex-col bg-black text-white overflow-auto">
            {/* ── Header ── */}
            <div className="sticky top-0 z-10 p-4 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Bot className="h-5 w-5 text-purple-400" />
                        Borg Orchestrator
                    </h1>
                    <p className="text-zinc-400 text-sm">Multi-model AI council governance &amp; session management</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <StatusDot online={online === true} />
                    <span className="text-xs text-zinc-500">
                        {online === null ? "Connecting…" : online ? `Online — ${serverUrl}` : "Offline"}
                    </span>
                    {health?.uptime !== undefined && (
                        <span className="text-xs text-zinc-600">uptime {fmtDuration(health.uptime)}</span>
                    )}
                    <button
                        onClick={() => void refresh()}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <a
                        href={serverUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                    >
                        <ExternalLink className="h-3 w-3" /> Open Standalone UI
                    </a>
                    <a
                        href="https://github.com/robertpelloni/borg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                    >
                        <ExternalLink className="h-3 w-3" /> GitHub
                    </a>
                </div>
            </div>

            {/* ── Status banner ── */}
            {online === false && (
                <div className="mx-4 mt-3 px-3 py-2.5 bg-red-950/30 border border-red-700/50 rounded-lg flex flex-wrap items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-red-300 font-medium">Borg Orchestrator is not reachable.</p>
                        <p className="text-red-400/70 text-xs mt-0.5">
                            Configure <code className="bg-red-950/50 px-1 rounded">NEXT_PUBLIC_BORG_ORCHESTRATOR_URL</code> (current: {serverUrl}).
                            The legacy <code className="bg-red-950/50 px-1 rounded">NEXT_PUBLIC_AUTOPILOT_URL</code> alias still works during migration.
                        </p>
                    </div>
                </div>
            )}
            {online === null && (
                <div className="mx-4 mt-3 px-3 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center gap-2 text-sm text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Connecting to Borg Orchestrator at {serverUrl}…
                </div>
            )}
            {online && (
                <div className="px-4 pt-3">
                    <PageStatusBanner
                        status="experimental"
                        message="Borg Orchestrator integration"
                        note="Native Borg dashboard for council governance, session supervision, and smart-pilot workflows. Legacy autopilot env names remain supported during migration."
                    />
                </div>
            )}

            {/* ── Error toast ── */}
            {lastError && (
                <div className="mx-4 mt-3 px-3 py-2 bg-red-950/40 border border-red-700/50 rounded text-red-300 text-xs flex items-center justify-between">
                    <span>{lastError}</span>
                    <button onClick={() => setLastError(null)} className="ml-3 text-red-500 hover:text-red-300">
                        <XCircle className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div className="flex-1 p-4 space-y-4">

                {/* ── Stats bar ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        {
                            label: "Active Sessions",
                            value: activeSessions.length,
                            icon: <Activity className="h-4 w-4 text-emerald-400" />,
                            color: "text-emerald-300",
                        },
                        {
                            label: "Total Sessions",
                            value: sessions.length,
                            icon: <Terminal className="h-4 w-4 text-blue-400" />,
                            color: "text-blue-300",
                        },
                        {
                            label: "Supervisors",
                            value: council?.supervisors?.length ?? 0,
                            icon: <Users className="h-4 w-4 text-purple-400" />,
                            color: "text-purple-300",
                        },
                        {
                            label: "Pending Vetoes",
                            value: vetoPending.length,
                            icon: <Gavel className="h-4 w-4 text-amber-400" />,
                            color: vetoPending.length > 0 ? "text-amber-300" : "text-zinc-500",
                        },
                    ].map((s) => (
                        <div key={s.label} className="border border-zinc-800 rounded-lg bg-zinc-950 px-4 py-3 flex items-center gap-3">
                            {s.icon}
                            <div>
                                <p className="text-[11px] text-zinc-500">{s.label}</p>
                                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Council ── */}
                <SectionCard title="Council" icon={<Users className="h-4 w-4" />}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">Status:</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${council?.enabled ? "text-emerald-300 border-emerald-700/50 bg-emerald-950/30" : "text-zinc-500 border-zinc-700 bg-zinc-900"}`}>
                                    {council?.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                            <button
                                onClick={() => void toggleCouncil()}
                                disabled={!online}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-xs"
                            >
                                <Power className="h-3 w-3" />
                                {council?.enabled ? "Disable" : "Enable"} Council
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400">Consensus:</span>
                                <select
                                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                                    value={council?.consensusMode ?? "simple-majority"}
                                    disabled={!online || settingMode}
                                    onChange={(e) => void setConsensusMode(e.target.value as ConsensusModeType)}
                                >
                                    {CONSENSUS_MODES.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Supervisor roster */}
                        {council?.supervisors && council.supervisors.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {council.supervisors.map((sup) => (
                                    <div key={sup.id} className="border border-zinc-800 rounded bg-zinc-900 px-3 py-2 flex items-center gap-2 text-xs">
                                        <Bot className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-zinc-200 truncate">{sup.name ?? sup.id}</p>
                                            <p className="text-zinc-500 truncate">{sup.provider ?? sup.model ?? ""}</p>
                                        </div>
                                        {sup.weight !== undefined && (
                                            <span className="ml-auto shrink-0 text-[10px] text-zinc-500">wt {sup.weight}</span>
                                        )}
                                        {sup.enabled === false && (
                                            <span className="ml-auto shrink-0 text-[10px] text-zinc-600">off</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-600">No supervisors registered. Add provider credentials so Borg Orchestrator can auto-register supervisors.</p>
                        )}
                    </div>
                </SectionCard>

                {/* ── Sessions ── */}
                <SectionCard title={`Sessions (${sessions.length})`} icon={<Terminal className="h-4 w-4" />}>
                    <div className="space-y-3">
                        {/* New session form */}
                        {showNewSession ? (
                            <div className="border border-zinc-800 rounded-lg px-3 py-2 bg-zinc-900 space-y-2">
                                <p className="text-xs font-semibold text-zinc-300">Start New Session</p>
                                <div className="flex flex-wrap gap-2">
                                    <select
                                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                                        value={newCliType}
                                        onChange={(e) => setNewCliType(e.target.value)}
                                    >
                                        {[
                                            "opencode", "claude", "aider",
                                            "cursor", "continue", "cody", "copilot",
                                        ].map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        {installedCli
                                            .filter((t) => !["opencode","claude","aider","cursor","continue","cody","copilot"].includes(t.type))
                                            .map((t) => (
                                                <option key={t.type} value={t.type}>{t.name ?? t.type}</option>
                                            ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") void startSession(); }}
                                        placeholder="Task description…"
                                        className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                    />
                                    <button
                                        onClick={() => void startSession()}
                                        disabled={startingSession || !newTask.trim()}
                                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded text-xs flex items-center gap-1"
                                    >
                                        {startingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                        Start
                                    </button>
                                    <button
                                        onClick={() => setShowNewSession(false)}
                                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewSession(true)}
                                disabled={!online}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded text-xs flex items-center gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> New Session
                            </button>
                        )}

                        {/* Sessions list */}
                        {sessions.length === 0 ? (
                            <p className="text-xs text-zinc-600 text-center py-4">No sessions. Start one above.</p>
                        ) : (
                            <div className="space-y-2">
                                {sessions.map((s) => (
                                    <div key={s.id} className="border border-zinc-800 rounded-lg bg-zinc-900">
                                        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_CHIP[s.status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                                                {s.status}
                                            </span>
                                            <span className="text-xs font-semibold text-zinc-200 truncate flex-1 min-w-0">
                                                {s.task ?? s.id}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 shrink-0">{s.cliType}</span>
                                            {s.tags && s.tags.length > 0 && s.tags.map((tag) => (
                                                <span key={tag} className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-500">{tag}</span>
                                            ))}
                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                {s.status === "active" && (
                                                    <button
                                                        onClick={() => void stopSession(s.id)}
                                                        className="p-1 hover:bg-zinc-700 rounded" title="Stop"
                                                    >
                                                        <Square className="h-3 w-3 text-red-400" />
                                                    </button>
                                                )}
                                                {s.status === "stopped" && (
                                                    <button
                                                        onClick={() => void resumeSession(s.id)}
                                                        className="p-1 hover:bg-zinc-700 rounded" title="Resume"
                                                    >
                                                        <Play className="h-3 w-3 text-emerald-400" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setGuidanceTarget(guidanceTarget === s.id ? null : s.id)}
                                                    className={`p-1 hover:bg-zinc-700 rounded ${guidanceTarget === s.id ? "bg-zinc-700" : ""}`}
                                                    title="Send guidance"
                                                >
                                                    <MessageSquare className="h-3 w-3 text-cyan-400" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Guidance panel */}
                                        {guidanceTarget === s.id && (
                                            <div className="border-t border-zinc-800 px-3 py-2 flex gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={guidanceText}
                                                    onChange={(e) => setGuidanceText(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === "Enter") void sendGuidance(); }}
                                                    placeholder="Send guidance to this session…"
                                                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                                                />
                                                <button
                                                    onClick={() => void sendGuidance()}
                                                    disabled={sendingGuidance || !guidanceText.trim()}
                                                    className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 rounded text-xs flex items-center gap-1"
                                                >
                                                    {sendingGuidance ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                                    Send
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* ── Veto queue ── */}
                {vetoPending.length > 0 && (
                    <SectionCard
                        title={`Pending Vetoes (${vetoPending.length})`}
                        icon={<Gavel className="h-4 w-4 text-amber-400" />}
                    >
                        <div className="space-y-2">
                            {vetoPending.map((v) => (
                                <div key={v.id} className="border border-amber-800/50 rounded-lg bg-amber-950/20 px-3 py-2 flex flex-wrap items-center gap-2">
                                    <Gavel className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-amber-200 truncate">{v.description ?? v.id}</p>
                                        {v.createdAt && (
                                            <p className="text-[10px] text-zinc-500">{new Date(v.createdAt).toLocaleString()}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => void approveVeto(v.id)}
                                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs flex items-center gap-1"
                                    >
                                        <CheckCircle2 className="h-3 w-3" /> Approve
                                    </button>
                                    <button
                                        onClick={() => void rejectVeto(v.id)}
                                        className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs flex items-center gap-1"
                                    >
                                        <XCircle className="h-3 w-3" /> Reject
                                    </button>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* ── CLI Tools ── */}
                <SectionCard title="CLI Tools" icon={<Wrench className="h-4 w-4" />} defaultOpen={false}>
                    {cliTools.length === 0 ? (
                        <p className="text-xs text-zinc-600">No CLI tools data. Server may not be running.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {cliTools.map((t) => (
                                <div key={t.type} className={`border rounded px-3 py-2 text-xs ${t.installed ? "border-emerald-700/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900"}`}>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        {t.installed
                                            ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                            : <XCircle className="h-3 w-3 text-zinc-600" />
                                        }
                                        <span className={t.installed ? "text-zinc-200" : "text-zinc-500"}>{t.name ?? t.type}</span>
                                    </div>
                                    {t.version && <p className="text-[10px] text-zinc-500 ml-4">{t.version}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* ── Debate History ── */}
                <SectionCard title="Recent Debates" icon={<History className="h-4 w-4" />} defaultOpen={false}>
                    {debateHistory.length === 0 ? (
                        <p className="text-xs text-zinc-600">No debate history yet.</p>
                    ) : (
                        <div className="space-y-1 max-h-64 overflow-auto">
                            {debateHistory.map((d, i) => (
                                <div key={d.id ?? i} className="flex flex-wrap items-center gap-2 py-1 border-b border-zinc-800 text-xs">
                                    <span className="text-zinc-400 truncate flex-1 min-w-0">{d.task ?? "(no task)"}</span>
                                    {d.consensus && (
                                        <span className="text-zinc-500 shrink-0">{d.consensus}</span>
                                    )}
                                    {d.outcome && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${d.outcome === "approved" ? "text-emerald-300 border-emerald-700/50 bg-emerald-950/20" : "text-zinc-400 border-zinc-700"}`}>
                                            {d.outcome}
                                        </span>
                                    )}
                                    {d.timestamp && (
                                        <span className="text-[10px] text-zinc-600 shrink-0">
                                            {new Date(d.timestamp).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* ── Server health ── */}
                {health && (
                    <SectionCard title="Server Health" icon={<Server className="h-4 w-4" />} defaultOpen={false}>
                        <div className="flex flex-wrap gap-4 text-xs text-zinc-300">
                            {health.uptime !== undefined && (
                                <div>
                                    <p className="text-zinc-500 mb-0.5">Uptime</p>
                                    <p className="font-mono">{fmtDuration(health.uptime)}</p>
                                </div>
                            )}
                            {health.memoryUsedMb !== undefined && health.memoryTotalMb !== undefined && (
                                <div>
                                    <p className="text-zinc-500 mb-0.5">Memory</p>
                                    <p className="font-mono">{Math.round(health.memoryUsedMb)} / {Math.round(health.memoryTotalMb)} MB</p>
                                </div>
                            )}
                            {health.version && (
                                <div>
                                    <p className="text-zinc-500 mb-0.5">Version</p>
                                    <p className="font-mono">{health.version}</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                )}

            </div>
        </div>
    );
}
