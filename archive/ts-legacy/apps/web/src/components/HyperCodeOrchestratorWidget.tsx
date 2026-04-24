"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity, AlertCircle, Bot, CheckCircle2, ChevronDown, ChevronRight,
    ExternalLink, Gavel, History, Loader2, MessageSquare, Play, Plus,
    Power, RefreshCw, Server, Square, Terminal, Users, Wrench, XCircle, Zap
} from "lucide-react";

interface SupervisorInfo {
    id: string;
    name: string;
    model?: string;
    provider?: string;
    enabled?: boolean;
    weight?: number;
}

interface CouncilStatus {
    enabled?: boolean;
    supervisors: SupervisorInfo[];
    consensusMode: string;
    consensusThreshold?: number;
    leadSupervisor?: string | null;
    smartPilot?: boolean;
}

type SessionStatus = "active" | "stopped" | "error" | "starting" | "stopping" | "idle";

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

function isSupervisorInfo(value: unknown): value is SupervisorInfo {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { name?: unknown }).name === "string";
}

function isAutopilotSession(value: unknown): value is AutopilotSession {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { cliType?: unknown }).cliType === "string"
        && typeof (value as { status?: unknown }).status === "string";
}

function isCliTool(value: unknown): value is CliTool {
    return typeof value === "object"
        && value !== null
        && typeof (value as { type?: unknown }).type === "string"
        && typeof (value as { name?: unknown }).name === "string"
        && typeof (value as { installed?: unknown }).installed === "boolean";
}

function isVetoPending(value: unknown): value is VetoPending {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string";
}

function isDebateEntry(value: unknown): value is DebateEntry {
    return typeof value === "object" && value !== null;
}

function getArrayPayload<T>(value: unknown, key: string, guard: (item: unknown) => item is T): T[] | null {
    const list = Array.isArray(value)
        ? value
        : (typeof value === "object" && value !== null && Array.isArray((value as Record<string, unknown>)[key])
            ? (value as Record<string, unknown>)[key] as unknown[]
            : null);
    if (!list) {
        return null;
    }
    return list.every(guard) ? list : null;
}

const CONSENSUS_MODES = [
    "simple-majority", "supermajority", "unanimous", "weighted",
    "ceo-override", "ceo-veto", "hybrid-ceo-majority", "ranked-choice"
] as const;

type ConsensusModeType = (typeof CONSENSUS_MODES)[number];

const STATUS_CHIP: Record<SessionStatus, string> = {
    active: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
    stopped: "bg-zinc-800 text-zinc-400 border-zinc-700",
    error: "bg-red-900/30 text-red-300 border-red-700/50",
    starting: "bg-yellow-900/30 text-yellow-300 border-yellow-700/50",
    stopping: "bg-yellow-900/30 text-yellow-300 border-yellow-700/50",
    idle: "bg-blue-900/30 text-blue-300 border-blue-700/50",
};

function fmtDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const BASE = "/api/orchestrator";

interface ApResult<T> {
    ok: boolean;
    data?: T;
    error?: string;
}

async function apFetch<T>(path: string, opts?: RequestInit): Promise<ApResult<T>> {
    if (!BASE) {
        return { ok: false, error: "Orchestrator endpoint is not configured." };
    }

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

function StatusDot({ online }: { online: boolean }) {
    return (
        <span className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
    );
}

function SectionCard({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/70">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800/60 text-left transition-colors"
            >
                <span className="text-cyan-400">{icon}</span>
                <span className="font-semibold text-sm text-slate-200">{title}</span>
                <span className="ml-auto text-slate-600">
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}

<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/components/HyperCodeOrchestratorWidget.tsx
export function HyperCodeOrchestratorWidget() {
========
export function borgOrchestratorWidget() {
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/components/BorgOrchestratorWidget.tsx
    const isConfigured = Boolean(BASE);
    const [online, setOnline] = useState<boolean | null>(null);
    const [council, setCouncil] = useState<CouncilStatus | null>(null);
    const [sessions, setSessions] = useState<AutopilotSession[]>([]);
    const [cliTools, setCliTools] = useState<CliTool[]>([]);
    const [vetoPending, setVetoPending] = useState<VetoPending[]>([]);
    const [debateHistory, setDebateHistory] = useState<DebateEntry[]>([]);
    const [debateHistoryError, setDebateHistoryError] = useState<string | null>(null);
    const [councilError, setCouncilError] = useState<string | null>(null);
    const [sessionsError, setSessionsError] = useState<string | null>(null);
    const [cliToolsError, setCliToolsError] = useState<string | null>(null);
    const [vetoError, setVetoError] = useState<string | null>(null);
    const [health, setHealth] = useState<ServerHealth | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);

    const [showNewSession, setShowNewSession] = useState(false);
    const [newTask, setNewTask] = useState("");
    const [newCliType, setNewCliType] = useState("opencode");
    const [startingSession, setStartingSession] = useState(false);

    const [guidanceTarget, setGuidanceTarget] = useState<string | null>(null);
    const [guidanceText, setGuidanceText] = useState("");
    const [sendingGuidance, setSendingGuidance] = useState(false);

    const [settingMode, setSettingMode] = useState(false);

    const serverUrl = BASE;

    const refresh = useCallback(async () => {
        if (!BASE) {
            setOnline(false);
            setLoading(false);
            setLastError(null);
            return;
        }

        setLoading(true);
        setLastError(null);
        setDebateHistoryError(null);
        setCouncilError(null);
        setSessionsError(null);
        setCliToolsError(null);
        setVetoError(null);

        const [healthRes, councilRes, sessionsRes, cliRes, vetoRes, debateRes] = await Promise.all([
            apFetch<{ uptime?: number; memUsed?: number; memTotal?: number; version?: string } | null>("/api/health/server"),
            apFetch<{ council?: CouncilStatus; enabled?: boolean; supervisors?: SupervisorInfo[] }>("/api/council/status"),
            apFetch<{ sessions?: AutopilotSession[] } | AutopilotSession[]>("/api/sessions"),
            apFetch<{ tools?: CliTool[] } | CliTool[]>("/api/cli/tools"),
            apFetch<{ pending?: VetoPending[] } | VetoPending[]>("/api/veto/pending"),
            apFetch<{ entries?: DebateEntry[] } | DebateEntry[]>("/api/debate-history/status"),
        ]);

        if (!healthRes.ok) {
            setOnline(false);
            setLastError(`Orchestrator unreachable: ${healthRes.error ?? "connection refused"}`);
            setLoading(false);
            return;
        }
        setOnline(true);

        const h = healthRes.data;
        if (h) {
            setHealth({ uptime: h.uptime, memoryUsedMb: h.memUsed, memoryTotalMb: h.memTotal, version: h.version });
        }

        if (councilRes.ok) {
            const d = councilRes.data;
            const councilData = ((d as any)?.council ?? d) as Partial<CouncilStatus> | undefined;
            const supervisors = Array.isArray(councilData?.supervisors) && councilData.supervisors.every(isSupervisorInfo)
                ? councilData.supervisors
                : null;
            const consensusMode = typeof councilData?.consensusMode === "string" ? councilData.consensusMode : null;
            if (supervisors && consensusMode) {
                setCouncil({
                    enabled: typeof councilData?.enabled === "boolean" ? councilData.enabled : undefined,
                    supervisors,
                    consensusMode,
                });
            } else {
                setCouncil(null);
                setCouncilError("Council status returned an invalid payload.");
            }
        } else {
            setCouncil(null);
            setCouncilError(councilRes.error ?? "Council status is unavailable.");
        }

        if (sessionsRes.ok) {
            const sessionList = getArrayPayload(sessionsRes.data, "sessions", isAutopilotSession);
            if (sessionList) {
                setSessions(sessionList);
            } else {
                setSessions([]);
                setSessionsError("Session inventory returned an invalid payload.");
            }
        } else {
            setSessions([]);
            setSessionsError(sessionsRes.error ?? "Session inventory is unavailable.");
        }

        if (cliRes.ok) {
            const toolList = getArrayPayload(cliRes.data, "tools", isCliTool);
            if (toolList) {
                setCliTools(toolList);
            } else {
                setCliTools([]);
                setCliToolsError("CLI tool inventory returned an invalid payload.");
            }
        } else {
            setCliTools([]);
            setCliToolsError(cliRes.error ?? "CLI tool inventory is unavailable.");
        }

        if (vetoRes.ok) {
            const vetoList = getArrayPayload(vetoRes.data, "pending", isVetoPending);
            if (vetoList) {
                setVetoPending(vetoList);
            } else {
                setVetoPending([]);
                setVetoError("Pending vetoes returned an invalid payload.");
            }
        } else {
            setVetoPending([]);
            setVetoError(vetoRes.error ?? "Pending vetoes are unavailable.");
        }

        if (debateRes.ok) {
            const list = getArrayPayload(debateRes.data, "entries", isDebateEntry)
                ?? getArrayPayload(debateRes.data, "debates", isDebateEntry);
            if (list) {
                setDebateHistory(list.slice(0, 20));
            } else {
                setDebateHistory([]);
                setDebateHistoryError("Debate history returned an invalid payload.");
            }
        } else {
            setDebateHistory([]);
            setDebateHistoryError(debateRes.error ?? "Debate history is unavailable.");
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        if (!BASE) {
            setOnline(false);
            return;
        }

        void refresh();
        const t = setInterval(() => void refresh(), 8000);
        return () => clearInterval(t);
    }, [refresh]);

    const toggleCouncil = useCallback(async () => {
        const res = await apFetch("/api/council/toggle", { method: "POST" });
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const setConsensusMode = useCallback(async (mode: ConsensusModeType) => {
        setSettingMode(true);
        const res = await apFetch("/api/council/consensus-mode", { method: "POST", body: JSON.stringify({ mode }) });
        setSettingMode(false);
        if (!res.ok) { setLastError(res.error ?? "Unknown error"); return; }
        void refresh();
    }, [refresh]);

    const startSession = useCallback(async () => {
        if (!newTask.trim()) return;
        setStartingSession(true);
        const res = await apFetch("/api/sessions/start", { method: "POST", body: JSON.stringify({ task: newTask.trim(), cliType: newCliType }) });
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
        const res = await apFetch(`/api/sessions/${guidanceTarget}/guidance`, { method: "POST", body: JSON.stringify({ guidance: guidanceText.trim() }) });
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

    const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active"), [sessions]);
    const installedCli = useMemo(() => cliTools.filter((t) => t.installed), [cliTools]);

    return (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/20 flex flex-col gap-6 h-full">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">CLI Orchestrator</p>
                    <h2 className="mt-2 text-xl font-semibold text-white flex items-center gap-2">
                        <Bot className="h-5 w-5 text-purple-400" />
                        Supervised Swarm
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">Multi-model AI council governance & session management.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-full border border-slate-700">
                        <StatusDot online={online === true} />
                        <span className="text-xs font-medium text-slate-300">
                            {!isConfigured ? "Not configured" : online === null ? "Connecting…" : online ? "Connected" : "Offline"}
                        </span>
                        <button onClick={() => void refresh()} className="ml-1 text-slate-400 hover:text-white transition">
                            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                    {health?.uptime !== undefined && (
                        <span className="text-xs text-slate-500 font-mono text-right">up {fmtDuration(health.uptime)}</span>
                    )}
                </div>
            </div>

            {!isConfigured && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm flex gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-amber-100 font-medium">Custom orchestrator override not configured</p>
                        <div className="text-amber-200/80 text-xs mt-1 space-y-1">
                            <p>This surface already uses the bundled proxy route at <code className="bg-amber-950/40 px-1 rounded">{serverUrl}</code>.</p>
                            <p>Set one of these env vars only if you need to target a different orchestrator base:</p>
                            <ul className="list-disc pl-4 space-y-1">
<<<<<<<< HEAD:archive/ts-legacy/apps/web/src/components/HyperCodeOrchestratorWidget.tsx
                                <li><code className="bg-amber-950/40 px-1 rounded">NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL</code></li>
========
                                <li><code className="bg-amber-950/40 px-1 rounded">NEXT_PUBLIC_BORG_ORCHESTRATOR_URL</code></li>
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/apps/web/src/components/BorgOrchestratorWidget.tsx
                                <li><code className="bg-amber-950/40 px-1 rounded">NEXT_PUBLIC_AUTOPILOT_URL</code> <span className="text-amber-300/70">(legacy alias)</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {isConfigured && online === false && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm flex gap-3">
                    <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-rose-200 font-medium">Orchestrator offline</p>
                        <p className="text-rose-300/80 text-xs mt-1">Could not reach {serverUrl}</p>
                    </div>
                </div>
            )}

            {lastError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs flex justify-between items-center text-rose-200">
                    <span>{lastError}</span>
                    <button onClick={() => setLastError(null)} className="text-rose-400 hover:text-rose-200">
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Active", value: sessionsError ? "—" : activeSessions.length, icon: <Activity className="h-4 w-4 text-emerald-400" /> },
                    { label: "Sessions", value: sessionsError ? "—" : sessions.length, icon: <Terminal className="h-4 w-4 text-blue-400" /> },
                    { label: "Council", value: councilError ? "—" : (council?.supervisors?.length ?? 0), icon: <Users className="h-4 w-4 text-purple-400" /> },
                    { label: "Vetoes", value: vetoError ? "—" : vetoPending.length, icon: <Gavel className="h-4 w-4 text-amber-400" /> },
                ].map((s) => (
                    <div key={s.label} className="border border-slate-800 rounded-xl bg-slate-950/70 p-3 flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg">{s.icon}</div>
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                            <p className="text-lg font-bold text-slate-200">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex-1 space-y-4">
                <SectionCard title="Council Governance" icon={<Users className="h-4 w-4" />}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${councilError ? "text-rose-300 border-rose-700/50 bg-rose-500/10" : council?.enabled ? "text-emerald-300 border-emerald-700/50 bg-emerald-500/10" : "text-slate-400 border-slate-700 bg-slate-800"}`}>
                                {councilError ? "Unavailable" : council?.enabled ? "Active" : "Standby"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none"
                                value={council?.consensusMode ?? "simple-majority"}
                                disabled={!online || settingMode || Boolean(councilError)}
                                onChange={(e) => void setConsensusMode(e.target.value as ConsensusModeType)}
                            >
                                {CONSENSUS_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <button
                                onClick={() => void toggleCouncil()}
                                disabled={!online || Boolean(councilError)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-md text-xs font-medium transition"
                            >
                                {council?.enabled ? "Disable" : "Enable"}
                            </button>
                        </div>
                    </div>
                    {councilError ? (
                        <p className="text-xs text-rose-300">{councilError}</p>
                    ) : council?.supervisors && council.supervisors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {council.supervisors.map((sup) => (
                                <div key={sup.id} className="border border-slate-800 rounded-lg bg-slate-900 p-2 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Bot className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-semibold text-slate-200 block truncate">{sup.name ?? sup.id}</span>
                                            <span className="text-[10px] text-slate-500 block truncate">{sup.provider ?? sup.model}</span>
                                        </div>
                                    </div>
                                    {sup.weight && <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">wt {sup.weight}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">No supervisors registered.</p>
                    )}
                </SectionCard>

                <SectionCard title={`Active Swarm (${sessionsError ? "—" : sessions.length})`} icon={<Terminal className="h-4 w-4" />}>
                    {showNewSession ? (
                        <div className="border border-slate-700 rounded-lg p-3 bg-slate-900 mb-3">
                            <p className="text-xs font-semibold text-slate-300 mb-2">Deploy New Agent</p>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 flex-1" value={newCliType} onChange={(e) => setNewCliType(e.target.value)}>
                                        <option value="opencode">opencode</option>
                                        <option value="claude">claude</option>
                                        <option value="aider">aider</option>
                                        {installedCli.filter(t => !['opencode','claude','aider'].includes(t.type)).map(t => <option key={t.type} value={t.type}>{t.name}</option>)}
                                    </select>
                                    <button onClick={() => setShowNewSession(false)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300">Cancel</button>
                                </div>
                                <input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void startSession(); }} placeholder="Directive / Task description…" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500" />
                                <button onClick={() => void startSession()} disabled={startingSession || !newTask.trim()} className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded text-xs font-semibold text-white flex items-center justify-center gap-1">
                                    {startingSession ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                    Deploy Agent
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowNewSession(true)} disabled={!online} className="w-full mb-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 border-dashed rounded-lg text-xs flex items-center justify-center gap-1.5 text-slate-300 transition">
                            <Plus className="h-3 w-3" /> Spawn Agent
                        </button>
                    )}

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {sessionsError ? (
                            <p className="text-xs text-rose-300 text-center py-2">{sessionsError}</p>
                        ) : sessions.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-2">Swarm is idle.</p>
                        ) : sessions.map(s => (
                            <div key={s.id} className="border border-slate-800 rounded-lg bg-slate-900/50 overflow-hidden">
                                <div className="p-2.5 flex items-center gap-2">
                                    <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${STATUS_CHIP[s.status] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                                        {s.status}
                                    </span>
                                    <span className="text-xs font-medium text-slate-200 truncate flex-1">{s.task ?? s.id}</span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1 rounded">{s.cliType}</span>
                                    <div className="flex gap-1 ml-1">
                                        {s.status === "active" && <button onClick={() => void stopSession(s.id)} className="p-1 hover:bg-slate-700 rounded text-rose-400"><Square className="h-3.5 w-3.5" /></button>}
                                        {s.status === "stopped" && <button onClick={() => void resumeSession(s.id)} className="p-1 hover:bg-slate-700 rounded text-emerald-400"><Play className="h-3.5 w-3.5" /></button>}
                                        <button onClick={() => setGuidanceTarget(guidanceTarget === s.id ? null : s.id)} className={`p-1 rounded ${guidanceTarget === s.id ? "bg-cyan-900/40 text-cyan-300" : "hover:bg-slate-700 text-cyan-400/70"}`}><MessageSquare className="h-3.5 w-3.5" /></button>
                                    </div>
                                </div>
                                {guidanceTarget === s.id && (
                                    <div className="bg-slate-950 p-2 border-t border-slate-800 flex gap-2">
                                        <input autoFocus type="text" value={guidanceText} onChange={(e) => setGuidanceText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void sendGuidance(); }} placeholder="Provide guidance..." className="flex-1 bg-transparent border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500" />
                                        <button onClick={() => void sendGuidance()} disabled={sendingGuidance || !guidanceText.trim()} className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 disabled:opacity-40 rounded text-xs font-medium">Send</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {(vetoPending.length > 0 || vetoError) && (
                    <SectionCard title={`Pending Vetoes (${vetoError ? "—" : vetoPending.length})`} icon={<Gavel className="h-4 w-4 text-amber-400" />}>
                        {vetoError ? (
                            <p className="text-xs text-rose-300">{vetoError}</p>
                        ) : (
                            <div className="space-y-2">
                                {vetoPending.map((v) => (
                                    <div key={v.id} className="border border-amber-500/20 rounded-lg bg-amber-500/5 p-2 flex flex-col gap-2">
                                        <p className="text-xs text-amber-200">{v.description ?? v.id}</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => void approveVeto(v.id)} className="flex-1 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-xs font-medium flex justify-center items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approve</button>
                                            <button onClick={() => void rejectVeto(v.id)} className="flex-1 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-xs font-medium flex justify-center items-center gap-1"><XCircle className="h-3 w-3" /> Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                )}

                <SectionCard title="Debate History" icon={<History className="h-4 w-4" />} defaultOpen={false}>
                    {debateHistory.length === 0 ? (
                        <p className={`text-xs ${debateHistoryError ? "text-rose-300" : "text-slate-500"}`}>
                            {debateHistoryError ?? "No debates on record."}
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {debateHistory.map((d, i) => (
                                <div key={d.id ?? i} className="p-2 border border-slate-800 rounded bg-slate-900/50 text-xs">
                                    <p className="text-slate-300 font-medium mb-1 truncate">{d.task}</p>
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500">{d.consensus}</span>
                                        <span className={`px-1.5 py-0.5 rounded border ${d.outcome === "approved" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-slate-400 border-slate-700 bg-slate-800"}`}>{d.outcome}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>
        </section>
    );
}
