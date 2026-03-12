"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Cloud,
    Plus,
    RefreshCw,
    Play,
    Pause,
    XCircle,
    CheckCircle2,
    Server,
    Trash2,
    Activity,
} from "lucide-react";

// Types mirroring the cloudDevRouter schemas
type CloudDevProvider = "jules" | "codex" | "copilot-workspace" | "devin" | "custom";
type SessionStatus =
    | "pending"
    | "active"
    | "paused"
    | "completed"
    | "failed"
    | "awaiting_approval"
    | "cancelled";

interface CloudDevSession {
    id: string;
    provider: CloudDevProvider;
    projectName: string;
    task: string;
    status: SessionStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}

interface ProviderInfo {
    name: string;
    provider: CloudDevProvider;
    enabled: boolean;
    hasApiKey: boolean;
}

const STATUS_COLORS: Record<SessionStatus, string> = {
    pending: "text-yellow-300 border-yellow-700/50 bg-yellow-950/20",
    active: "text-emerald-300 border-emerald-700/50 bg-emerald-950/20",
    paused: "text-blue-300 border-blue-700/50 bg-blue-950/20",
    completed: "text-green-300 border-green-700/50 bg-green-950/20",
    failed: "text-red-300 border-red-700/50 bg-red-950/20",
    awaiting_approval: "text-amber-300 border-amber-700/50 bg-amber-950/20",
    cancelled: "text-zinc-400 border-zinc-600/50 bg-zinc-900/20",
};

const PROVIDER_LABELS: Record<CloudDevProvider, string> = {
    jules: "Jules (Google)",
    codex: "Codex (OpenAI)",
    "copilot-workspace": "Copilot Workspace",
    devin: "Devin",
    custom: "Custom",
};

function getSafeLocalStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const storage = window.localStorage;
        void storage.length;
        return storage;
    } catch {
        return null;
    }
}

function safeStorageGet(key: string): string | null {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return null;
    }

    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key: string, value: string): void {
    const storage = getSafeLocalStorage();
    if (!storage) {
        return;
    }

    try {
        storage.setItem(key, value);
    } catch {
        // Ignore storage access errors in restricted contexts.
    }
}

export default function CloudDevDashboardPage() {
    const [sessions, setSessions] = useState<CloudDevSession[]>([]);
    const [providers] = useState<ProviderInfo[]>([
        { name: "Jules (Google)", provider: "jules", enabled: true, hasApiKey: false },
        { name: "Codex (OpenAI)", provider: "codex", enabled: false, hasApiKey: false },
        { name: "Copilot Workspace", provider: "copilot-workspace", enabled: false, hasApiKey: false },
        { name: "Devin", provider: "devin", enabled: false, hasApiKey: false },
    ]);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newSession, setNewSession] = useState({
        provider: "jules" as CloudDevProvider,
        projectName: "",
        task: "",
    });

    const refreshSessions = useCallback(() => {
        // In production, this would call the tRPC endpoint.
        // For now, load from localStorage as a client-side store.
        setLoading(true);
        try {
            const stored = safeStorageGet("borg-cloud-dev-sessions");
            if (stored) {
                setSessions(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        refreshSessions();
    }, [refreshSessions]);

    const persistSessions = useCallback((updated: CloudDevSession[]) => {
        setSessions(updated);
        safeStorageSet("borg-cloud-dev-sessions", JSON.stringify(updated));
    }, []);

    const createSession = useCallback(() => {
        if (!newSession.projectName.trim() || !newSession.task.trim()) return;

        const now = new Date().toISOString();
        const session: CloudDevSession = {
            id: `cds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            provider: newSession.provider,
            projectName: newSession.projectName.trim(),
            task: newSession.task.trim(),
            status: "pending",
            createdAt: now,
            updatedAt: now,
        };

        const updated = [session, ...sessions];
        persistSessions(updated);
        setNewSession({ provider: "jules", projectName: "", task: "" });
        setShowCreateForm(false);
    }, [newSession, sessions, persistSessions]);

    const updateStatus = useCallback(
        (sessionId: string, status: SessionStatus) => {
            const updated = sessions.map((s) =>
                s.id === sessionId
                    ? { ...s, status, updatedAt: new Date().toISOString() }
                    : s
            );
            persistSessions(updated);
        },
        [sessions, persistSessions]
    );

    const deleteSession = useCallback(
        (sessionId: string) => {
            const updated = sessions.filter((s) => s.id !== sessionId);
            persistSessions(updated);
        },
        [sessions, persistSessions]
    );

    const activeSessions = sessions.filter((s) => s.status === "active").length;
    const pendingSessions = sessions.filter((s) => s.status === "pending").length;

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-cyan-400" />
                        Cloud Dev Environments
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        Manage cloud development agents across all providers from one place.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshSessions}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-xs flex items-center gap-1.5"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Session
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-zinc-400">Active:</span>
                    <span className="text-emerald-300 font-semibold">{activeSessions}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-zinc-400">Pending:</span>
                    <span className="text-yellow-300 font-semibold">{pendingSessions}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-zinc-400">Total:</span>
                    <span className="text-blue-300 font-semibold">{sessions.length}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-zinc-500">Providers:</span>
                    {providers.map((p) => (
                        <span
                            key={p.provider}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${p.enabled
                                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"
                                    : "bg-zinc-800 text-zinc-500 border border-zinc-700/40"
                                }`}
                        >
                            {p.name}
                        </span>
                    ))}
                </div>
            </div>

            {/* Create Session Form */}
            {showCreateForm && (
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/80">
                    <h2 className="text-sm font-semibold mb-2">Create Cloud Dev Session</h2>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={newSession.provider}
                            onChange={(e) =>
                                setNewSession({ ...newSession, provider: e.target.value as CloudDevProvider })
                            }
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white"
                        >
                            {providers.map((p) => (
                                <option key={p.provider} value={p.provider}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={newSession.projectName}
                            onChange={(e) => setNewSession({ ...newSession, projectName: e.target.value })}
                            placeholder="Project name"
                            className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500"
                        />
                        <input
                            type="text"
                            value={newSession.task}
                            onChange={(e) => setNewSession({ ...newSession, task: e.target.value })}
                            placeholder="Task description"
                            className="flex-[2] min-w-[240px] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500"
                        />
                        <button
                            onClick={createSession}
                            className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-xs"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Sessions List */}
            <div className="flex-1 overflow-auto p-4">
                {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <Cloud className="h-12 w-12 mb-3 opacity-30" />
                        <p className="text-sm">No cloud dev sessions yet.</p>
                        <p className="text-xs mt-1">
                            Click &quot;New Session&quot; to assign a project to a cloud dev agent.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className={`border rounded-lg px-4 py-3 ${STATUS_COLORS[session.status]}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-600/40">
                                                {PROVIDER_LABELS[session.provider]}
                                            </span>
                                            <span className="font-semibold text-sm truncate">
                                                {session.projectName}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium">
                                                {session.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-300 truncate">{session.task}</p>
                                        <p className="text-[10px] text-zinc-500 mt-1">
                                            Created {new Date(session.createdAt).toLocaleString()} · Updated{" "}
                                            {new Date(session.updatedAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {session.status === "pending" && (
                                            <button
                                                onClick={() => updateStatus(session.id, "active")}
                                                className="p-1.5 hover:bg-emerald-800/40 rounded"
                                                title="Start"
                                            >
                                                <Play className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status === "active" && (
                                            <button
                                                onClick={() => updateStatus(session.id, "paused")}
                                                className="p-1.5 hover:bg-blue-800/40 rounded"
                                                title="Pause"
                                            >
                                                <Pause className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status === "paused" && (
                                            <button
                                                onClick={() => updateStatus(session.id, "active")}
                                                className="p-1.5 hover:bg-emerald-800/40 rounded"
                                                title="Resume"
                                            >
                                                <Play className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {(session.status === "active" || session.status === "paused") && (
                                            <button
                                                onClick={() => updateStatus(session.id, "completed")}
                                                className="p-1.5 hover:bg-green-800/40 rounded"
                                                title="Mark Complete"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status !== "cancelled" && session.status !== "completed" && (
                                            <button
                                                onClick={() => updateStatus(session.id, "cancelled")}
                                                className="p-1.5 hover:bg-red-800/40 rounded"
                                                title="Cancel"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteSession(session.id)}
                                            className="p-1.5 hover:bg-zinc-700/40 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
