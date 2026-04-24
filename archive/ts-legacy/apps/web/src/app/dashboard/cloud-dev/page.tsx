"use client";

/**
 * cloud-dev/page.tsx - Cloud Dev Environments Dashboard
 *
 * Unified dashboard for managing cloud dev agents across providers.
 * Features: session list, per-session chat history + logs pane,
 * broadcast, force-send, accept-plan, auto-accept-plan, tRPC-backed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Cloud,
    FileText,
    MessageSquare,
    Pause,
    Play,
    Plus,
    Radio,
    RefreshCw,
    Search,
    Send,
    Server,
    Trash2,
    XCircle,
    Zap,
} from "lucide-react";
import { trpc } from "@/utils/trpc";
import { filterHistoryEntries, getHistoryCoverage, getLoadAllLimit } from "./page-helpers";

type CloudDevProvider = "jules" | "codex" | "copilot-workspace" | "devin" | "custom";
type SessionStatus = "pending" | "active" | "paused" | "completed" | "failed" | "awaiting_approval" | "cancelled";
type ChatRole = "user" | "agent" | "system" | "plan";
type LogLevel = "debug" | "info" | "warn" | "error";
type BroadcastSkipReason = "session_filter_mismatch" | "status_filter_mismatch" | "terminal_requires_force" | "other";

interface SessionSummary {
    id: string;
    provider: CloudDevProvider;
    projectName: string;
    task: string;
    status: SessionStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
    autoAcceptPlan: boolean;
    messageCount: number;
    logCount: number;
}

interface ChatMessage {
    id: string;
    role: ChatRole;
    content: string;
    timestamp: string;
    forceSent?: boolean;
}

interface LogEntry {
    id: string;
    level: LogLevel;
    message: string;
    timestamp: string;
}

interface BroadcastPreviewRecipient {
    id: string;
    provider: CloudDevProvider;
    projectName: string;
    status: SessionStatus;
    updatedAt: string;
}

interface BroadcastSkippedSession {
    id: string;
    provider: CloudDevProvider;
    projectName: string;
    status: SessionStatus;
    reason: BroadcastSkipReason;
}

interface BroadcastPreview {
    totalSessions: number;
    targeted: number;
    skipped: number;
    byStatus: Partial<Record<SessionStatus, number>>;
    sessionIds: string[];
    recipients: BroadcastPreviewRecipient[];
    skippedByReason: Partial<Record<BroadcastSkipReason, number>>;
    skippedSessionIds: string[];
    skippedSessions: BroadcastSkippedSession[];
    skippedSessionsSampled: boolean;
}

const BROADCAST_SKIP_REASON_LABELS: Record<BroadcastSkipReason, string> = {
    session_filter_mismatch: "session mismatch",
    status_filter_mismatch: "status mismatch",
    terminal_requires_force: "terminal requires Force",
    other: "other",
};

const STATUS_COLORS: Record<SessionStatus, string> = {
    pending: "text-yellow-300 border-yellow-700/50 bg-yellow-950/20",
    active: "text-emerald-300 border-emerald-700/50 bg-emerald-950/20",
    paused: "text-blue-300 border-blue-700/50 bg-blue-950/20",
    completed: "text-green-300 border-green-700/50 bg-green-950/20",
    failed: "text-red-300 border-red-700/50 bg-red-950/20",
    awaiting_approval: "text-amber-300 border-amber-700/50 bg-amber-950/20",
    cancelled: "text-zinc-400 border-zinc-600/50 bg-zinc-900/20",
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    debug: "text-zinc-500",
    info: "text-zinc-300",
    warn: "text-yellow-400",
    error: "text-red-400",
};

const ROLE_COLORS: Record<ChatRole, string> = {
    user: "text-cyan-300",
    agent: "text-emerald-300",
    system: "text-zinc-400 italic",
    plan: "text-amber-300",
};

const PROVIDER_LABELS: Record<CloudDevProvider, string> = {
    jules: "Cloud Orchestrator (Google Jules, Spark, Copilot)",
    codex: "Codex (OpenAI)",
    "copilot-workspace": "Copilot Workspace",
    devin: "Devin",
    custom: "Custom",
};

const BROADCAST_STATUS_ORDER: SessionStatus[] = [
    "pending",
    "active",
    "paused",
    "awaiting_approval",
    "completed",
    "failed",
    "cancelled",
];

const TERMINAL: Set<SessionStatus> = new Set(["completed", "failed", "cancelled"]);

function isCloudSessionSummary(value: unknown): value is SessionSummary {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { provider?: unknown }).provider === "string"
        && typeof (value as { projectName?: unknown }).projectName === "string"
        && typeof (value as { task?: unknown }).task === "string"
        && typeof (value as { status?: unknown }).status === "string"
        && typeof (value as { autoAcceptPlan?: unknown }).autoAcceptPlan === "boolean"
        && typeof (value as { messageCount?: unknown }).messageCount === "number"
        && typeof (value as { logCount?: unknown }).logCount === "number";
}

function isChatMessage(value: unknown): value is ChatMessage {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { role?: unknown }).role === "string"
        && typeof (value as { content?: unknown }).content === "string"
        && typeof (value as { timestamp?: unknown }).timestamp === "string";
}

function isLogEntry(value: unknown): value is LogEntry {
    return typeof value === "object"
        && value !== null
        && typeof (value as { id?: unknown }).id === "string"
        && typeof (value as { level?: unknown }).level === "string"
        && typeof (value as { message?: unknown }).message === "string"
        && typeof (value as { timestamp?: unknown }).timestamp === "string";
}

function isProviderRecord(value: unknown): value is { provider: string; name: string; enabled: boolean; hasApiKey?: boolean } {
    return typeof value === "object"
        && value !== null
        && typeof (value as { provider?: unknown }).provider === "string"
        && typeof (value as { name?: unknown }).name === "string"
        && typeof (value as { enabled?: unknown }).enabled === "boolean";
}

function isStatsPayload(value: unknown): value is { totalMessages: number; totalLogs: number } {
    return typeof value === "object"
        && value !== null
        && typeof (value as { totalMessages?: unknown }).totalMessages === "number"
        && typeof (value as { totalLogs?: unknown }).totalLogs === "number";
}

function isBroadcastPreview(value: unknown): value is BroadcastPreview {
    return typeof value === "object"
        && value !== null
        && typeof (value as { totalSessions?: unknown }).totalSessions === "number"
        && typeof (value as { targeted?: unknown }).targeted === "number"
        && typeof (value as { skipped?: unknown }).skipped === "number"
        && Array.isArray((value as { recipients?: unknown }).recipients)
        && Array.isArray((value as { skippedSessionIds?: unknown }).skippedSessionIds)
        && Array.isArray((value as { skippedSessions?: unknown }).skippedSessions);
}

function SessionPanel({
    session,
    onClose,
    initialTab,
    onSessionMutation,
}: {
    session: SessionSummary;
    onClose: () => void;
    initialTab: "chat" | "logs";
    onSessionMutation: () => void;
}) {
    const [activeTab, setActiveTab] = useState<"chat" | "logs">(initialTab);
    const [msgInput, setMsgInput] = useState("");
    const [forceFlag, setForceFlag] = useState(false);
    const [messageLimit, setMessageLimit] = useState(100);
    const [logLimit, setLogLimit] = useState(200);
    const [historyQuery, setHistoryQuery] = useState("");
    const [localAutoAcceptPlan, setLocalAutoAcceptPlan] = useState(session.autoAcceptPlan);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, session.id]);

    useEffect(() => {
        setLocalAutoAcceptPlan(session.autoAcceptPlan);
    }, [session.autoAcceptPlan, session.id]);

    useEffect(() => {
        setHistoryQuery("");
    }, [activeTab, session.id]);

    const messagesQuery = trpc.cloudDev.getMessages.useQuery(
        { sessionId: session.id, limit: messageLimit },
        { refetchInterval: 3000 }
    );
    const logsQuery = trpc.cloudDev.getLogs.useQuery(
        { sessionId: session.id, limit: logLimit },
        { refetchInterval: 3000 }
    );
    const sendMutation = trpc.cloudDev.sendMessage.useMutation({
        onSuccess: () => {
            setMsgInput("");
            void messagesQuery.refetch();
            onSessionMutation(); // keep messageCount in session list in sync
        },
    });
    const acceptPlanMutation = trpc.cloudDev.acceptPlan.useMutation({
        onSuccess: async () => {
            onSessionMutation();
            await Promise.all([messagesQuery.refetch(), logsQuery.refetch()]);
        },
    });
    const autoAcceptMutation = trpc.cloudDev.setAutoAcceptPlan.useMutation({
        onSuccess: ({ autoAcceptPlan }) => {
            setLocalAutoAcceptPlan(autoAcceptPlan);
            onSessionMutation();
        },
        onError: () => {
            setLocalAutoAcceptPlan(session.autoAcceptPlan);
        },
    });

    const handleSend = useCallback(() => {
        if (!msgInput.trim()) return;
        sendMutation.mutate({ sessionId: session.id, content: msgInput.trim(), force: forceFlag });
    }, [msgInput, forceFlag, sendMutation, session.id]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }, [handleSend]);

    const messagesUnavailable = Boolean(messagesQuery.error)
        || (messagesQuery.data !== undefined && (!Array.isArray(messagesQuery.data) || !messagesQuery.data.every(isChatMessage)));
    const logsUnavailable = Boolean(logsQuery.error)
        || (logsQuery.data !== undefined && (!Array.isArray(logsQuery.data) || !logsQuery.data.every(isLogEntry)));
    const messages: ChatMessage[] = !messagesUnavailable && Array.isArray(messagesQuery.data)
        ? (messagesQuery.data as ChatMessage[])
        : [];
    const logs: LogEntry[] = !logsUnavailable && Array.isArray(logsQuery.data)
        ? (logsQuery.data as LogEntry[])
        : [];
    const isTerminal = TERMINAL.has(session.status);
    const messageCoverage = useMemo(
        () => getHistoryCoverage({ loadedCount: messages.length, totalCount: session.messageCount, label: "messages" }),
        [messages.length, session.messageCount]
    );
    const logCoverage = useMemo(
        () => getHistoryCoverage({ loadedCount: logs.length, totalCount: session.logCount, label: "logs" }),
        [logs.length, session.logCount]
    );
    const filteredMessages = useMemo(
        () => filterHistoryEntries(messages.map((message) => ({
            ...message,
            message: message.content,
        })), historyQuery),
        [historyQuery, messages]
    );
    const filteredLogs = useMemo(
        () => filterHistoryEntries(logs, historyQuery),
        [historyQuery, logs]
    );
    const activeCoverage = activeTab === "chat" ? messageCoverage : logCoverage;
    const activeLoadedCount = activeTab === "chat" ? messages.length : logs.length;
    const activeFilteredCount = activeTab === "chat" ? filteredMessages.length : filteredLogs.length;
    const canLoadAll = activeTab === "chat"
        ? session.messageCount > messageLimit
        : session.logCount > logLimit;

    // Scroll to the bottom of the chat whenever new messages arrive or when the
    // chat tab becomes active, so fresh messages are always visible.
    useEffect(() => {
        if (activeTab === "chat") {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [filteredMessages.length, activeTab]);

    return (
        <div className="border border-zinc-700 rounded-lg bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">{session.projectName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLORS[session.status]}`}>
                        {session.status.replace("_", " ")}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 cursor-pointer text-[11px] text-zinc-400 select-none">
                        <input
                            type="checkbox"
                            className="accent-amber-500"
                            checked={localAutoAcceptPlan}
                            disabled={autoAcceptMutation.isPending}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setLocalAutoAcceptPlan(next);
                                autoAcceptMutation.mutate({ sessionId: session.id, enabled: next });
                            }}
                        />
                        Auto-accept plan
                    </label>
                    {session.status === "awaiting_approval" && (
                        <button onClick={() => acceptPlanMutation.mutate({ sessionId: session.id })}
                            className="px-2 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Accept Plan
                        </button>
                    )}
                    <button onClick={() => setActiveTab("chat")}
                        className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 ${activeTab === "chat" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                        <MessageSquare className="h-3 w-3" /> Chat ({messages.length}/{session.messageCount})
                    </button>
                    <button onClick={() => setActiveTab("logs")}
                        className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 ${activeTab === "logs" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                        <FileText className="h-3 w-3" /> Logs ({logs.length}/{session.logCount})
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300">
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="border-b border-zinc-800 bg-zinc-950/80 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                    <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-300">
                        {activeCoverage.label}
                    </span>
                    {historyQuery.trim() && (
                        <span className="rounded border border-cyan-700/50 bg-cyan-950/20 px-2 py-1 text-cyan-200">
                            Filtered {activeFilteredCount} of {activeLoadedCount} loaded
                        </span>
                    )}
                    {activeCoverage.hasMore && (
                        <span className="text-zinc-500">
                            {activeCoverage.remaining} older {activeTab === "chat" ? "messages" : "logs"} available
                        </span>
                    )}
                    {isTerminal && activeTab === "chat" && !forceFlag && (
                        <span className="rounded border border-amber-700/50 bg-amber-950/20 px-2 py-1 text-amber-200">
                            Terminal session: enable Force to send follow-up
                        </span>
                    )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="relative min-w-[240px] flex-1">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={historyQuery}
                            onChange={(e) => setHistoryQuery(e.target.value)}
                            placeholder={activeTab === "chat" ? "Filter loaded messages" : "Filter loaded logs"}
                            className="w-full rounded border border-zinc-700 bg-zinc-900 py-1.5 pl-7 pr-2 text-xs text-white outline-none focus:border-cyan-500"
                        />
                    </label>
                    {historyQuery.trim() && (
                        <button
                            type="button"
                            onClick={() => setHistoryQuery("")}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                        >
                            Clear filter
                        </button>
                    )}
                    {activeCoverage.hasMore && (
                        <button
                            type="button"
                            onClick={() => {
                                if (activeTab === "chat") {
                                    setMessageLimit((prev) => Math.min(prev + 100, 1000));
                                    return;
                                }

                                setLogLimit((prev) => Math.min(prev + 200, 2000));
                            }}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
                        >
                            Load older
                        </button>
                    )}
                    {canLoadAll && (
                        <button
                            type="button"
                            onClick={() => {
                                if (activeTab === "chat") {
                                    setMessageLimit(getLoadAllLimit(session.messageCount, 1000));
                                    return;
                                }

                                setLogLimit(getLoadAllLimit(session.logCount, 2000));
                            }}
                            className="rounded border border-cyan-700/60 bg-cyan-950/20 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-950/35"
                        >
                            Load all loaded history
                        </button>
                    )}
                </div>
            </div>
            <div className="h-52 overflow-auto px-3 py-2 text-xs font-mono space-y-1">
                {activeTab === "chat" && (
                    messagesUnavailable
                        ? <p className="text-red-300 text-center pt-8">{messagesQuery.error?.message ?? "Messages are unavailable."}</p>
                        : filteredMessages.length === 0
                            ? <p className="text-zinc-600 text-center pt-8">No messages yet.</p>
                        : <>
                            {filteredMessages.map((m) => (
                                <div key={m.id} className="flex gap-1.5">
                                    <span className={`shrink-0 ${ROLE_COLORS[m.role]}`}>[{m.role}]</span>
                                    <span className={m.forceSent ? "text-amber-200" : "text-zinc-200"}>
                                        {m.content}
                                        {m.forceSent && <span className="ml-1.5 text-[9px] text-amber-500 not-italic">(forced)</span>}
                                    </span>
                                    <span className="ml-auto shrink-0 text-zinc-600 text-[10px]">{new Date(m.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </>
                )}
                {activeTab === "logs" && (
                    logsUnavailable
                        ? <p className="text-red-300 text-center pt-8">{logsQuery.error?.message ?? "Logs are unavailable."}</p>
                        : filteredLogs.length === 0
                            ? <p className="text-zinc-600 text-center pt-8">No log entries.</p>
                        : <>
                            {filteredLogs.map((l) => (
                                <div key={l.id} className="flex gap-1.5">
                                    <span className={`shrink-0 uppercase ${LOG_LEVEL_COLORS[l.level]}`}>[{l.level}]</span>
                                    <span className="text-zinc-200">{l.message}</span>
                                    <span className="ml-auto shrink-0 text-zinc-600 text-[10px]">{new Date(l.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </>
                )}
            </div>
            {activeTab === "chat" && (
                <div className="px-3 py-2 border-t border-zinc-800 flex items-center gap-2">
                    <textarea rows={1} value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isTerminal && !forceFlag ? "Session is terminal — enable Force to send" : "Send a message (Enter to send)"}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 resize-none" />
                    <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer select-none shrink-0">
                        <input type="checkbox" className="accent-amber-500" checked={forceFlag}
                            onChange={(e) => setForceFlag(e.target.checked)} />
                        Force
                    </label>
                    <button onClick={handleSend} disabled={sendMutation.isPending || (!forceFlag && isTerminal)}
                        className="p-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 rounded" title="Send">
                        <Send className="h-3.5 w-3.5 text-white" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function CloudDevDashboardPage() {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newSession, setNewSession] = useState<{
        provider: CloudDevProvider; projectName: string; task: string; autoAcceptPlan: boolean;
    }>({ provider: "jules", projectName: "", task: "", autoAcceptPlan: false });
    const [expandedSession, setExpandedSession] = useState<{ id: string; tab: "chat" | "logs" } | null>(null);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [broadcastForce, setBroadcastForce] = useState(true);
    const [broadcastStatusFilter, setBroadcastStatusFilter] = useState<SessionStatus[]>([]);
    const [broadcastSessionScopeIds, setBroadcastSessionScopeIds] = useState<string[] | null>(null);
    const [lastBroadcastPayload, setLastBroadcastPayload] = useState<{
        content: string;
        force: boolean;
        statusFilter?: SessionStatus[];
        sessionIds?: string[];
    } | null>(null);
    const [pendingBroadcastScopeIds, setPendingBroadcastScopeIds] = useState<string[] | null>(null);
    const [broadcastResult, setBroadcastResult] = useState<{
        delivered: number;
        skipped: number;
        statuses: SessionStatus[];
        skippedByReason: Partial<Record<BroadcastSkipReason, number>>;
        scopeSessionIds: string[];
        skippedSessionIds: string[];
        skippedSessions: BroadcastSkippedSession[];
        skippedSessionsSampled: boolean;
    } | null>(null);
    const [showAllPreviewRecipients, setShowAllPreviewRecipients] = useState(false);
    const [showAllResultSkippedSessions, setShowAllResultSkippedSessions] = useState(false);

    const sessionsQuery = trpc.cloudDev.listSessions.useQuery(undefined, { refetchInterval: 5000 });
    const statsQuery = trpc.cloudDev.stats.useQuery(undefined, { refetchInterval: 5000 });
    const providersQuery = trpc.cloudDev.listProviders.useQuery();

    const createMutation = trpc.cloudDev.createSession.useMutation({
        onSuccess: () => {
            void sessionsQuery.refetch();
            setShowCreateForm(false);
            setNewSession({ provider: "jules", projectName: "", task: "", autoAcceptPlan: false });
        },
    });
    const updateStatusMutation = trpc.cloudDev.updateSessionStatus.useMutation({
        onSuccess: () => void sessionsQuery.refetch(),
    });
    const deleteMutation = trpc.cloudDev.deleteSession.useMutation({
        onSuccess: () => void sessionsQuery.refetch(),
    });
    const broadcastMutation = trpc.cloudDev.broadcastMessage.useMutation({
        onSuccess: (result) => {
            setBroadcastResult({
                delivered: result.delivered,
                skipped: result.skipped,
                statuses: Array.from(new Set((result.results ?? []).map((entry) => entry.status as SessionStatus))),
                skippedByReason: (result.skippedByReason ?? {}) as Partial<Record<BroadcastSkipReason, number>>,
                scopeSessionIds: pendingBroadcastScopeIds ?? [],
                skippedSessionIds: (result.skippedSessionIds ?? []) as string[],
                skippedSessions: (result.skippedSessions ?? []) as BroadcastSkippedSession[],
                skippedSessionsSampled: Boolean(result.skippedSessionsSampled),
            });
            setPendingBroadcastScopeIds(null);
            setBroadcastMsg("");
        },
        onError: () => {
            setPendingBroadcastScopeIds(null);
        },
    });
    const broadcastPreviewQuery = trpc.cloudDev.previewBroadcastRecipients.useQuery(
        {
            force: broadcastForce,
            statusFilter: broadcastStatusFilter.length > 0 ? broadcastStatusFilter : undefined,
            sessionIds: broadcastSessionScopeIds && broadcastSessionScopeIds.length > 0 ? broadcastSessionScopeIds : undefined,
        },
        {
            refetchInterval: 5000,
        }
    );

    const handleCreate = useCallback(() => {
        if (!newSession.projectName.trim() || !newSession.task.trim()) return;
        createMutation.mutate(newSession);
    }, [newSession, createMutation]);

    const handleBroadcast = useCallback(() => {
        if (!broadcastMsg.trim()) return;
        const payload = {
            content: broadcastMsg.trim(),
            force: broadcastForce,
            statusFilter: broadcastStatusFilter.length > 0 ? [...broadcastStatusFilter] : undefined,
            sessionIds: broadcastSessionScopeIds && broadcastSessionScopeIds.length > 0 ? [...broadcastSessionScopeIds] : undefined,
        };
        setLastBroadcastPayload(payload);
        setPendingBroadcastScopeIds(payload.sessionIds ?? null);
        broadcastMutation.mutate({
            content: payload.content,
            force: payload.force,
            statusFilter: payload.statusFilter,
            sessionIds: payload.sessionIds,
        });
    }, [broadcastMsg, broadcastForce, broadcastMutation, broadcastSessionScopeIds, broadcastStatusFilter]);

    const toggleBroadcastStatusFilter = useCallback((status: SessionStatus) => {
        setBroadcastSessionScopeIds(null);
        setBroadcastStatusFilter((current) =>
            current.includes(status) ? current.filter((value) => value !== status) : [...current, status]
        );
    }, []);

    const mergeStatusFilter = useCallback((base: SessionStatus[] | undefined, statuses: SessionStatus[]) => {
        const merged = new Set<SessionStatus>([...(base ?? []), ...statuses]);
        return BROADCAST_STATUS_ORDER.filter((status) => merged.has(status));
    }, []);

    const addBroadcastStatuses = useCallback((statuses: SessionStatus[]) => {
        setBroadcastSessionScopeIds(null);
        setBroadcastStatusFilter((current) => {
            return mergeStatusFilter(current, statuses);
        });
    }, [mergeStatusFilter]);

    const setBroadcastStatuses = useCallback((statuses: SessionStatus[]) => {
        const normalized = BROADCAST_STATUS_ORDER.filter((status) => statuses.includes(status));
        setBroadcastSessionScopeIds(null);
        setBroadcastStatusFilter(normalized);
    }, []);

    useEffect(() => {
        setShowAllPreviewRecipients(false);
    }, [broadcastForce, broadcastSessionScopeIds, broadcastStatusFilter]);

    useEffect(() => {
        setShowAllResultSkippedSessions(false);
    }, [broadcastResult]);

    const sessionsUnavailable = Boolean(sessionsQuery.error)
        || (sessionsQuery.data !== undefined && (!Array.isArray(sessionsQuery.data) || !sessionsQuery.data.every(isCloudSessionSummary)));
    const statsUnavailable = Boolean(statsQuery.error) || (statsQuery.data !== undefined && !isStatsPayload(statsQuery.data));
    const providersUnavailable = Boolean(providersQuery.error)
        || (providersQuery.data !== undefined && (!Array.isArray(providersQuery.data) || !providersQuery.data.every(isProviderRecord)));
    const broadcastPreviewUnavailable = Boolean(broadcastPreviewQuery.error)
        || (broadcastPreviewQuery.data !== undefined && !isBroadcastPreview(broadcastPreviewQuery.data));
    const sessions: SessionSummary[] = !sessionsUnavailable && Array.isArray(sessionsQuery.data)
        ? (sessionsQuery.data as SessionSummary[])
        : [];
    const broadcastPreview = !broadcastPreviewUnavailable && isBroadcastPreview(broadcastPreviewQuery.data) ? broadcastPreviewQuery.data : null;
    const stats = !statsUnavailable && isStatsPayload(statsQuery.data) ? statsQuery.data : undefined;
    const providers = !providersUnavailable && Array.isArray(providersQuery.data) ? providersQuery.data : [];
    const previewRecipients = useMemo(
        () => broadcastPreview?.recipients ?? [],
        [broadcastPreview]
    );
    const visiblePreviewRecipients = useMemo(
        () => (showAllPreviewRecipients ? previewRecipients : previewRecipients.slice(0, 8)),
        [previewRecipients, showAllPreviewRecipients]
    );
    const skippedStatusSuggestions = useMemo(() => {
        if (!broadcastPreview) return [] as SessionStatus[];
        const statuses = new Set<SessionStatus>();
        broadcastPreview.skippedSessions.forEach((session) => {
            if (session.reason === "status_filter_mismatch") {
                statuses.add(session.status);
            }
        });
        return BROADCAST_STATUS_ORDER.filter((status) => statuses.has(status));
    }, [broadcastPreview]);

    const retryLastBroadcastWithStatuses = useCallback((statuses: SessionStatus[], force: boolean) => {
        if (!lastBroadcastPayload?.content) return;
        const baseFilter = lastBroadcastPayload.statusFilter ?? broadcastStatusFilter;
        const statusFilter = mergeStatusFilter(baseFilter, statuses);
        setBroadcastStatusFilter(statusFilter);
        setBroadcastSessionScopeIds(null);
        setBroadcastForce(force);
        const payload = {
            content: lastBroadcastPayload.content,
            force,
            statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
            sessionIds: undefined,
        };
        setLastBroadcastPayload(payload);
        setPendingBroadcastScopeIds(payload.sessionIds ?? null);
        broadcastMutation.mutate({
            content: payload.content,
            force: payload.force,
            statusFilter: payload.statusFilter,
            sessionIds: payload.sessionIds,
        });
    }, [broadcastMutation, broadcastStatusFilter, lastBroadcastPayload, mergeStatusFilter]);

    const retryLastBroadcastToSessionIds = useCallback((sessionIds: string[], force: boolean) => {
        if (!lastBroadcastPayload?.content || sessionIds.length === 0) return;
        setBroadcastForce(force);
        setBroadcastStatusFilter([]);
        setBroadcastSessionScopeIds(sessionIds);
        const payload = {
            content: lastBroadcastPayload.content,
            force,
            statusFilter: undefined,
            sessionIds,
        };
        setLastBroadcastPayload(payload);
        setPendingBroadcastScopeIds(payload.sessionIds ?? null);
        broadcastMutation.mutate({
            content: payload.content,
            force: payload.force,
            statusFilter: payload.statusFilter,
            sessionIds: payload.sessionIds,
        });
    }, [broadcastMutation, lastBroadcastPayload]);

    const broadcastDraftToSessionIds = useCallback((sessionIds: string[], force: boolean) => {
        const content = broadcastMsg.trim();
        if (!content || sessionIds.length === 0) return;
        setBroadcastForce(force);
        setBroadcastStatusFilter([]);
        setBroadcastSessionScopeIds(sessionIds);
        const payload = {
            content,
            force,
            statusFilter: undefined,
            sessionIds,
        };
        setLastBroadcastPayload(payload);
        setPendingBroadcastScopeIds(payload.sessionIds ?? null);
        broadcastMutation.mutate({
            content: payload.content,
            force: payload.force,
            statusFilter: payload.statusFilter,
            sessionIds: payload.sessionIds,
        });
    }, [broadcastMsg, broadcastMutation]);

    const resultSkippedStatusSuggestions = useMemo(() => {
        if (!broadcastResult) return [] as SessionStatus[];
        const statuses = new Set<SessionStatus>();
        broadcastResult.skippedSessions.forEach((session) => {
            if (session.reason === "status_filter_mismatch") {
                statuses.add(session.status);
            }
        });
        return BROADCAST_STATUS_ORDER.filter((status) => statuses.has(status));
    }, [broadcastResult]);

    const activeSessions = useMemo(() => sessions.filter((s) => s.status === "active").length, [sessions]);
    const pendingSessions = useMemo(() => sessions.filter((s) => s.status === "pending").length, [sessions]);
    const awaitingApproval = useMemo(() => sessions.filter((s) => s.status === "awaiting_approval").length, [sessions]);
    const isBroadcastPending = broadcastMutation.isPending;

    return (
        <div className="w-full h-full flex flex-col bg-black text-white overflow-auto">
            <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900 sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Cloud className="h-5 w-5 text-cyan-400" /> Cloud Dev Environments
                    </h1>
                    <p className="text-zinc-400 text-sm">Manage cloud dev agents across all providers from one place.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => void sessionsQuery.refetch()}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs flex items-center gap-1.5">
                        <RefreshCw className={`h-3.5 w-3.5 ${sessionsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    <button onClick={() => setShowBroadcast(!showBroadcast)}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-xs flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5" /> Broadcast
                    </button>
                    <button onClick={() => setShowCreateForm(!showCreateForm)}
                        className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded text-xs flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> New Session
                    </button>
                </div>
            </div>

            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center gap-6 text-xs">
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
                {awaitingApproval > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                        <span className="text-zinc-400">Awaiting Approval:</span>
                        <span className="text-amber-300 font-semibold">{awaitingApproval}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-zinc-400">Total:</span>
                    <span className="text-blue-300 font-semibold">{sessionsUnavailable ? "—" : sessions.length}</span>
                </div>
                {statsUnavailable ? (
                    <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-red-400" />
                        <span className="text-red-300">{statsQuery.error?.message ?? "Cloud-dev stats unavailable."}</span>
                    </div>
                ) : stats && (
                    <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-zinc-500" />
                        <span className="text-zinc-500">{stats.totalMessages} msgs / {stats.totalLogs} logs</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                    {providersUnavailable ? (
                        <span className="text-red-300">{providersQuery.error?.message ?? "Provider inventory unavailable."}</span>
                    ) : providers.map((p) => (
                        <span key={p.provider} className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            p.enabled ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/40" : "bg-zinc-800 text-zinc-500 border-zinc-700/40"
                        }`}>
                            {p.name}{p.hasApiKey ? " \u2713" : ""}
                        </span>
                    ))}
                </div>
            </div>

            {sessionsUnavailable ? (
                <div className="mx-4 mt-4 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {sessionsQuery.error?.message ?? "Cloud-dev sessions are unavailable."}
                </div>
            ) : null}

            {showBroadcast && (
                <div className="px-4 py-3 border-b border-zinc-800 bg-purple-950/20">
                    <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Radio className="h-4 w-4 text-purple-400" /> Broadcast Message
                        <span className="text-xs text-zinc-500 font-normal">
                            - sends to non-terminal sessions by default; Force includes terminal sessions
                        </span>
                    </h2>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-zinc-500">Target statuses:</span>
                        {(["pending", "active", "paused", "awaiting_approval", "completed", "failed", "cancelled"] as SessionStatus[]).map((status) => {
                            const selected = broadcastStatusFilter.includes(status);
                            return (
                                <button
                                    key={`broadcast-status-${status}`}
                                    type="button"
                                    disabled={isBroadcastPending}
                                    onClick={() => toggleBroadcastStatusFilter(status)}
                                    className={`rounded border px-2 py-0.5 transition-colors ${selected
                                        ? "border-purple-500/60 bg-purple-500/15 text-purple-200"
                                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                                        } disabled:opacity-50`}
                                >
                                    {status.replace("_", " ")}
                                </button>
                            );
                        })}
                        {broadcastStatusFilter.length > 0 && (
                            <button
                                type="button"
                                disabled={isBroadcastPending}
                                onClick={() => {
                                    setBroadcastStatusFilter([]);
                                    setBroadcastSessionScopeIds(null);
                                }}
                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                            >
                                clear
                            </button>
                        )}
                        {broadcastSessionScopeIds && broadcastSessionScopeIds.length > 0 && (
                            <button
                                type="button"
                                disabled={isBroadcastPending}
                                onClick={() => setBroadcastSessionScopeIds(null)}
                                className="rounded border border-cyan-700/60 bg-cyan-900/30 px-2 py-0.5 text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-50"
                                title="Clear session-scoped retry targeting"
                            >
                                Session scope: {broadcastSessionScopeIds.length} IDs (clear)
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <textarea rows={2} value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Enter message to broadcast to all sessions..."
                            className="flex-1 min-w-[280px] bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-purple-500 resize-none" />
                        <div className="flex flex-col gap-1.5">
                            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                                <input type="checkbox" className="accent-amber-500" checked={broadcastForce}
                                    disabled={isBroadcastPending}
                                    onChange={(e) => setBroadcastForce(e.target.checked)} />
                                Force (include terminal sessions)
                            </label>
                            <button onClick={handleBroadcast} disabled={isBroadcastPending || !broadcastMsg.trim()}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded text-xs flex items-center gap-1.5">
                                {isBroadcastPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
                                Broadcast
                            </button>
                        </div>
                    </div>
                    <div className="mt-2 rounded border border-purple-800/60 bg-purple-950/25 px-2 py-1.5 text-[11px] text-zinc-300">
                        {broadcastPreviewQuery.isLoading ? (
                            <span className="text-zinc-500">Calculating recipients…</span>
                        ) : broadcastPreviewUnavailable ? (
                            <span className="text-red-300">{broadcastPreviewQuery.error?.message ?? "Broadcast preview is unavailable."}</span>
                        ) : broadcastPreview ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span>
                                        Preview: targeting <span className="font-semibold text-purple-200">{broadcastPreview.targeted}</span>
                                        {" "}of {broadcastPreview.totalSessions} sessions
                                        {broadcastPreview.skipped > 0 ? ` (skipping ${broadcastPreview.skipped})` : ""}.
                                    </span>
                                    {Object.entries(broadcastPreview.byStatus).map(([status, count]) => (
                                        <span key={`preview-status-${status}`} className="rounded border border-purple-700/60 bg-purple-900/40 px-1.5 py-0.5 text-[10px] text-purple-200">
                                        {status.replace("_", " ")}: {count}
                                    </span>
                                    ))}
                                </div>
                                {visiblePreviewRecipients.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase tracking-wide text-purple-300/80">Recipient preview</div>
                                        <div className="space-y-1">
                                            {visiblePreviewRecipients.map((recipient) => (
                                                <div
                                                    key={`preview-recipient-${recipient.id}`}
                                                    className="flex flex-wrap items-center gap-1.5 rounded border border-purple-900/80 bg-black/30 px-2 py-1 text-[10px]"
                                                >
                                                    <span className="rounded border border-zinc-700/70 bg-zinc-900 px-1.5 py-0.5 text-zinc-300">
                                                        {PROVIDER_LABELS[recipient.provider]}
                                                    </span>
                                                    <span className="font-medium text-purple-100">{recipient.projectName}</span>
                                                    <span className="rounded border border-purple-700/60 bg-purple-900/40 px-1.5 py-0.5 text-purple-200">
                                                        {recipient.status.replace("_", " ")}
                                                    </span>
                                                    <span className="ml-auto text-zinc-500">{recipient.id}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {previewRecipients.length > 8 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllPreviewRecipients((value) => !value)}
                                                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                            >
                                                {showAllPreviewRecipients
                                                    ? "Show fewer recipients"
                                                    : `Show all ${previewRecipients.length} recipients`}
                                            </button>
                                        )}
                                    </div>
                                )}
                                {(broadcastPreview.skippedByReason.session_filter_mismatch || broadcastPreview.skippedByReason.terminal_requires_force || broadcastPreview.skippedByReason.status_filter_mismatch || broadcastPreview.skippedByReason.other) && (
                                    <div className="space-y-1">
                                        <div className="text-[10px] uppercase tracking-wide text-purple-300/80">Skip diagnostics</div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {(Object.entries(broadcastPreview.skippedByReason) as Array<[BroadcastSkipReason, number]>).map(([reason, count]) => (
                                                <span
                                                    key={`preview-skip-reason-${reason}`}
                                                    className="rounded border border-zinc-700/80 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300"
                                                >
                                                    {BROADCAST_SKIP_REASON_LABELS[reason]}: {count}
                                                </span>
                                            ))}
                                        </div>
                                        {broadcastPreview.skippedSessions.length > 0 && (
                                            <div className="space-y-1">
                                                {broadcastPreview.skippedSessions.slice(0, 6).map((session) => (
                                                    <div
                                                        key={`preview-skipped-session-${session.id}`}
                                                        className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-800/80 bg-black/30 px-2 py-1 text-[10px] text-zinc-300"
                                                    >
                                                        <span className="rounded border border-zinc-700/70 bg-zinc-900 px-1.5 py-0.5 text-zinc-300">
                                                            {PROVIDER_LABELS[session.provider]}
                                                        </span>
                                                        <span>{session.projectName}</span>
                                                        <span className="rounded border border-zinc-700/60 bg-zinc-900/70 px-1.5 py-0.5 text-zinc-300">
                                                            {session.status.replace("_", " ")}
                                                        </span>
                                                        <span className="text-zinc-500">{BROADCAST_SKIP_REASON_LABELS[session.reason]}</span>
                                                    </div>
                                                ))}
                                                {broadcastPreview.skippedSessionsSampled && (
                                                    <div className="text-[10px] text-zinc-500">
                                                        Showing sampled skipped sessions. Expand filters or retry with Force for full coverage.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {skippedStatusSuggestions.length > 0 && (
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-zinc-500">Add suggested skipped statuses:</div>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {skippedStatusSuggestions.map((status) => (
                                                        <button
                                                            key={`add-suggested-status-${status}`}
                                                            type="button"
                                                            onClick={() => addBroadcastStatuses([status])}
                                                            className="rounded border border-purple-700/70 bg-purple-900/35 px-2 py-0.5 text-[10px] text-purple-200 hover:bg-purple-900/55"
                                                        >
                                                            + {status.replace("_", " ")}
                                                        </button>
                                                    ))}
                                                    {skippedStatusSuggestions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => addBroadcastStatuses(skippedStatusSuggestions)}
                                                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                                        >
                                                            Add all suggested
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setBroadcastStatuses(skippedStatusSuggestions)}
                                                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        Use only suggested
                                                    </button>
                                                    {lastBroadcastPayload?.content && (
                                                        <button
                                                            type="button"
                                                            disabled={isBroadcastPending}
                                                            onClick={() => retryLastBroadcastWithStatuses(skippedStatusSuggestions, lastBroadcastPayload.force)}
                                                            className="rounded border border-purple-500/60 bg-purple-700/40 px-2 py-0.5 text-[10px] text-purple-100 hover:bg-purple-700/60 disabled:opacity-50"
                                                        >
                                                            Retry last with suggested statuses
                                                        </button>
                                                    )}
                                                    {lastBroadcastPayload?.content && (broadcastPreview.skippedByReason.terminal_requires_force ?? 0) > 0 && !lastBroadcastPayload.force && (
                                                        <button
                                                            type="button"
                                                            disabled={isBroadcastPending}
                                                            onClick={() => retryLastBroadcastWithStatuses(skippedStatusSuggestions, true)}
                                                            className="rounded border border-amber-500/60 bg-amber-700/40 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/60 disabled:opacity-50"
                                                        >
                                                            Retry last with suggested + Force
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {broadcastPreview.skippedSessionIds.length > 0 && lastBroadcastPayload?.content && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => retryLastBroadcastToSessionIds(broadcastPreview.skippedSessionIds, false)}
                                                    className="rounded border border-cyan-500/60 bg-cyan-700/35 px-2 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-700/55 disabled:opacity-50"
                                                >
                                                    Retry last to preview skipped only
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => retryLastBroadcastToSessionIds(broadcastPreview.skippedSessionIds, true)}
                                                    className="rounded border border-amber-500/60 bg-amber-700/35 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/55 disabled:opacity-50"
                                                >
                                                    Retry preview skipped only + Force
                                                </button>
                                                {broadcastPreview.skippedSessionsSampled && (
                                                    <span className="text-[10px] text-zinc-500">
                                                        Skipped rows are sampled, but retry targets full skipped ID set.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {broadcastPreview.skippedSessionIds.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => {
                                                        setBroadcastSessionScopeIds(broadcastPreview.skippedSessionIds);
                                                        setBroadcastStatusFilter([]);
                                                    }}
                                                    className="rounded border border-cyan-700/60 bg-cyan-900/30 px-2 py-0.5 text-[10px] text-cyan-200 hover:bg-cyan-900/50 disabled:opacity-50"
                                                >
                                                    Use preview skipped as scope
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => {
                                                        setBroadcastSessionScopeIds(broadcastPreview.skippedSessionIds);
                                                        setBroadcastStatusFilter([]);
                                                        setBroadcastForce(true);
                                                    }}
                                                    className="rounded border border-amber-700/60 bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-200 hover:bg-amber-900/50 disabled:opacity-50"
                                                >
                                                    Use skipped scope + Force
                                                </button>
                                                <span className="text-[10px] text-zinc-500">
                                                    Updates preview/next send scope without dispatching.
                                                </span>
                                            </div>
                                        )}
                                        {broadcastPreview.skippedSessionIds.length > 0 && broadcastMsg.trim().length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => broadcastDraftToSessionIds(broadcastPreview.skippedSessionIds, false)}
                                                    className="rounded border border-purple-500/60 bg-purple-700/35 px-2 py-0.5 text-[10px] text-purple-100 hover:bg-purple-700/55 disabled:opacity-50"
                                                >
                                                    Broadcast draft to preview skipped only
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBroadcastPending}
                                                    onClick={() => broadcastDraftToSessionIds(broadcastPreview.skippedSessionIds, true)}
                                                    className="rounded border border-amber-500/60 bg-amber-700/35 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/55 disabled:opacity-50"
                                                >
                                                    Broadcast draft to skipped only + Force
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-zinc-500">No preview available.</span>
                        )}
                    </div>
                    {broadcastResult && (
                        <div className="mt-2 space-y-1">
                            <p className="text-xs text-emerald-400">
                                Delivered to {broadcastResult.delivered} session{broadcastResult.delivered !== 1 ? "s" : ""}
                                {broadcastResult.skipped > 0 ? `, skipped ${broadcastResult.skipped}` : ""}
                                {broadcastResult.statuses.length > 0 ? ` (${broadcastResult.statuses.join(", ")})` : ""}.
                                {Object.keys(broadcastResult.skippedByReason).length > 0
                                    ? ` Skip reasons: ${(Object.entries(broadcastResult.skippedByReason) as Array<[BroadcastSkipReason, number]>).map(([reason, count]) => `${BROADCAST_SKIP_REASON_LABELS[reason]}=${count}`).join(", ")}.`
                                    : ""}
                                {broadcastResult.scopeSessionIds.length > 0
                                    ? ` Session scope: ${broadcastResult.scopeSessionIds.length} IDs.`
                                    : ""}
                            </p>
                            {(broadcastResult.skippedByReason.terminal_requires_force ?? 0) > 0 && !broadcastForce && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setBroadcastForce(true)}
                                        className="rounded border border-amber-700/60 bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-900/50"
                                    >
                                        Enable Force for next send
                                    </button>
                                    <button
                                        type="button"
                                            disabled={isBroadcastPending || !lastBroadcastPayload}
                                        onClick={() => {
                                            if (!lastBroadcastPayload?.content) return;
                                            setBroadcastForce(true);
                                            setPendingBroadcastScopeIds(lastBroadcastPayload.sessionIds ?? null);
                                            broadcastMutation.mutate({
                                                content: lastBroadcastPayload.content,
                                                force: true,
                                                statusFilter: lastBroadcastPayload.statusFilter,
                                                sessionIds: lastBroadcastPayload.sessionIds,
                                            });
                                        }}
                                        className="rounded border border-amber-500/60 bg-amber-700/40 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/60 disabled:opacity-50"
                                    >
                                        Retry last broadcast with Force
                                    </button>
                                </div>
                            )}
                            {broadcastResult.skippedSessions.length > 0 && (
                                <div className="space-y-1">
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Skipped sessions (last send)</div>
                                    <div className="space-y-1">
                                        {(showAllResultSkippedSessions
                                            ? broadcastResult.skippedSessions
                                            : broadcastResult.skippedSessions.slice(0, 6)).map((session) => (
                                            <div
                                                key={`result-skipped-session-${session.id}`}
                                                className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-800/80 bg-black/30 px-2 py-1 text-[10px] text-zinc-300"
                                            >
                                                <span className="rounded border border-zinc-700/70 bg-zinc-900 px-1.5 py-0.5 text-zinc-300">
                                                    {PROVIDER_LABELS[session.provider]}
                                                </span>
                                                <span>{session.projectName}</span>
                                                <span className="rounded border border-zinc-700/60 bg-zinc-900/70 px-1.5 py-0.5 text-zinc-300">
                                                    {session.status.replace("_", " ")}
                                                </span>
                                                <span className="text-zinc-500">{BROADCAST_SKIP_REASON_LABELS[session.reason]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {broadcastResult.skippedSessions.length > 6 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAllResultSkippedSessions((value) => !value)}
                                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                        >
                                            {showAllResultSkippedSessions
                                                ? "Show fewer skipped sessions"
                                                : `Show all ${broadcastResult.skippedSessions.length} skipped sessions`}
                                        </button>
                                    )}
                                    {broadcastResult.skippedSessionsSampled && (
                                        <div className="text-[10px] text-zinc-500">
                                            Result includes a sampled subset of skipped sessions.
                                        </div>
                                    )}
                                    {resultSkippedStatusSuggestions.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-[10px] text-zinc-500">Add suggested statuses from last send:</div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {resultSkippedStatusSuggestions.map((status) => (
                                                    <button
                                                        key={`add-result-suggested-status-${status}`}
                                                        type="button"
                                                        onClick={() => addBroadcastStatuses([status])}
                                                        className="rounded border border-purple-700/70 bg-purple-900/35 px-2 py-0.5 text-[10px] text-purple-200 hover:bg-purple-900/55"
                                                    >
                                                        + {status.replace("_", " ")}
                                                    </button>
                                                ))}
                                                {resultSkippedStatusSuggestions.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addBroadcastStatuses(resultSkippedStatusSuggestions)}
                                                        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                                    >
                                                        Add all suggested
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setBroadcastStatuses(resultSkippedStatusSuggestions)}
                                                    className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                                                >
                                                    Use only suggested
                                                </button>
                                                {lastBroadcastPayload?.content && (
                                                    <button
                                                        type="button"
                                                            disabled={isBroadcastPending}
                                                        onClick={() => retryLastBroadcastWithStatuses(resultSkippedStatusSuggestions, lastBroadcastPayload.force)}
                                                        className="rounded border border-purple-500/60 bg-purple-700/40 px-2 py-0.5 text-[10px] text-purple-100 hover:bg-purple-700/60 disabled:opacity-50"
                                                    >
                                                        Retry last with result suggestions
                                                    </button>
                                                )}
                                                {lastBroadcastPayload?.content && (broadcastResult.skippedByReason.terminal_requires_force ?? 0) > 0 && !lastBroadcastPayload.force && (
                                                    <button
                                                        type="button"
                                                            disabled={isBroadcastPending}
                                                        onClick={() => retryLastBroadcastWithStatuses(resultSkippedStatusSuggestions, true)}
                                                        className="rounded border border-amber-500/60 bg-amber-700/40 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/60 disabled:opacity-50"
                                                    >
                                                        Retry last with result suggestions + Force
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {broadcastResult.skippedSessionIds.length > 0 && lastBroadcastPayload?.content && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <button
                                                type="button"
                                                disabled={isBroadcastPending}
                                                onClick={() => retryLastBroadcastToSessionIds(broadcastResult.skippedSessionIds, false)}
                                                className="rounded border border-cyan-500/60 bg-cyan-700/35 px-2 py-0.5 text-[10px] text-cyan-100 hover:bg-cyan-700/55 disabled:opacity-50"
                                            >
                                                Retry last to skipped only
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBroadcastPending}
                                                onClick={() => retryLastBroadcastToSessionIds(broadcastResult.skippedSessionIds, true)}
                                                className="rounded border border-amber-500/60 bg-amber-700/35 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-700/55 disabled:opacity-50"
                                            >
                                                Retry skipped only + Force
                                            </button>
                                            {broadcastResult.skippedSessionsSampled && (
                                                <span className="text-[10px] text-zinc-500">
                                                    Skipped rows are sampled, but retry targets full skipped ID set.
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showCreateForm && (
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/80">
                    <h2 className="text-sm font-semibold mb-2">Create Cloud Dev Session</h2>
                    <div className="flex flex-wrap gap-2">
                        <select value={newSession.provider}
                            onChange={(e) => setNewSession({ ...newSession, provider: e.target.value as CloudDevProvider })}
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white">
                            {Object.entries(PROVIDER_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                        <input type="text" value={newSession.projectName}
                            onChange={(e) => setNewSession({ ...newSession, projectName: e.target.value })}
                            placeholder="Project name"
                            className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500" />
                        <input type="text" value={newSession.task}
                            onChange={(e) => setNewSession({ ...newSession, task: e.target.value })}
                            placeholder="Task description"
                            className="flex-[2] min-w-[220px] bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500" />
                        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                            <input type="checkbox" className="accent-amber-500" checked={newSession.autoAcceptPlan}
                                onChange={(e) => setNewSession({ ...newSession, autoAcceptPlan: e.target.checked })} />
                            Auto-accept plan
                        </label>
                        <button onClick={handleCreate} disabled={createMutation.isPending}
                            className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 rounded text-xs">
                            Create
                        </button>
                        <button onClick={() => setShowCreateForm(false)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 p-4 space-y-3">
                {sessionsUnavailable ? (
                    <div className="flex flex-col items-center justify-center py-20 text-red-300">
                        <Cloud className="h-12 w-12 mb-3 opacity-40" />
                        <p className="text-sm">{sessionsQuery.error?.message ?? "Cloud-dev sessions are unavailable."}</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <Cloud className="h-12 w-12 mb-3 opacity-30" />
                        <p className="text-sm">No cloud dev sessions yet.</p>
                        <p className="text-xs mt-1">Click &quot;New Session&quot; to assign a project to a cloud dev agent.</p>
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div key={session.id} className="space-y-1">
                            <div className={`border rounded-lg px-4 py-3 ${STATUS_COLORS[session.status]}`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-600/40">
                                                {PROVIDER_LABELS[session.provider]}
                                            </span>
                                            <span className="font-semibold text-sm truncate">{session.projectName}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium">
                                                {session.status.replace("_", " ")}
                                            </span>
                                            {session.autoAcceptPlan && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-700/30">
                                                    auto-accept
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-300 truncate">{session.task}</p>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                            Updated {new Date(session.updatedAt).toLocaleString()} &middot;{" "}
                                            <span className="text-zinc-600">
                                                {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""} / {session.logCount} log{session.logCount !== 1 ? "s" : ""}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setExpandedSession(expandedSession?.id === session.id ? null : { id: session.id, tab: "chat" })}
                                            className="p-1.5 hover:bg-zinc-700/40 rounded" title="Toggle chat / logs">
                                            {expandedSession?.id === session.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => setExpandedSession({ id: session.id, tab: "logs" })}
                                            className="p-1.5 hover:bg-zinc-700/40 rounded"
                                            title="Open logs"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                        </button>
                                        {session.status === "awaiting_approval" && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "active" })}
                                                className="p-1.5 hover:bg-amber-800/40 rounded" title="Accept Plan">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                                            </button>
                                        )}
                                        {session.status === "pending" && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "active" })}
                                                className="p-1.5 hover:bg-emerald-800/40 rounded" title="Start">
                                                <Play className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status === "active" && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "paused" })}
                                                className="p-1.5 hover:bg-blue-800/40 rounded" title="Pause">
                                                <Pause className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status === "paused" && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "active" })}
                                                className="p-1.5 hover:bg-emerald-800/40 rounded" title="Resume">
                                                <Play className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {(session.status === "active" || session.status === "paused") && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "completed" })}
                                                className="p-1.5 hover:bg-green-800/40 rounded" title="Mark Complete">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {!TERMINAL.has(session.status) && (
                                            <button onClick={() => updateStatusMutation.mutate({ sessionId: session.id, status: "cancelled" })}
                                                className="p-1.5 hover:bg-red-800/40 rounded" title="Cancel">
                                                <XCircle className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        {session.status === "failed" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                                        <button onClick={() => deleteMutation.mutate({ sessionId: session.id })}
                                            className="p-1.5 hover:bg-zinc-700/40 rounded" title="Delete">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {expandedSession?.id === session.id && (
                                <SessionPanel
                                    session={session}
                                    onClose={() => setExpandedSession(null)}
                                    initialTab={expandedSession.tab}
                                    onSessionMutation={() => {
                                        void sessionsQuery.refetch();
                                    }}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
