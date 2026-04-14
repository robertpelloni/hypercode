"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, ScrollArea } from "@hypercode/ui";
import { ArrowLeft, Terminal, Loader2, Play, Square, RotateCcw, ActivitySquare, HeartPulse, Link2, Send, Cpu, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type SessionStatus = 'created' | 'starting' | 'running' | 'stopping' | 'stopped' | 'restarting' | 'error';

type SessionLogEntry = {
    timestamp: number;
    stream: 'stdout' | 'stderr' | 'system' | string;
    message: string;
};

function normalizeLogs(payload: unknown): SessionLogEntry[] {
    if (!Array.isArray(payload)) return [];
    return payload
        .map((entry) => {
            if (!entry || typeof entry !== 'object') return null;
            const row = entry as Record<string, unknown>;
            return {
                timestamp: typeof row['timestamp'] === 'number' ? row['timestamp'] : Date.now(),
                stream: typeof row['stream'] === 'string' ? row['stream'] : 'system',
                message: typeof row['message'] === 'string' ? row['message'] : '',
            } as SessionLogEntry;
        })
        .filter((entry): entry is SessionLogEntry => entry !== null);
}

function formatRelativeTime(timestamp: number): string {
    const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
    const deltaHours = Math.round(deltaMinutes / 60);
    return `${deltaHours}h ago`;
}

function statusTone(status: SessionStatus): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
        case 'starting':
        case 'restarting':
            return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
        case 'stopping':
            return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        case 'error':
            return 'bg-red-500/20 text-red-300 border-red-500/30';
        case 'stopped':
            return 'bg-zinc-700/40 text-zinc-300 border-zinc-600';
        default:
            return 'bg-zinc-700/40 text-zinc-300 border-zinc-600';
    }
}

export default function SessionDetailPage() {
    const params = useParams<{ id: string }>();
    const sessionId = params?.id ?? '';

    const [shellCommand, setShellCommand] = useState('pwd');

    const sessionQuery = trpc.session.get.useQuery(
        { id: sessionId },
        { enabled: Boolean(sessionId), refetchInterval: 3000 }
    );
    const logsQuery = trpc.session.logs.useQuery(
        { id: sessionId, limit: 250 },
        { enabled: Boolean(sessionId), refetchInterval: 3000 }
    );
    const attachQuery = trpc.session.attachInfo.useQuery(
        { id: sessionId },
        { enabled: Boolean(sessionId), refetchInterval: 7000 }
    );
    const healthQuery = trpc.session.health.useQuery(
        { id: sessionId },
        { enabled: Boolean(sessionId), refetchInterval: 5000 }
    );

    const executeShellMutation = trpc.session.executeShell.useMutation({
        onError: (error) => toast.error(`Shell command failed: ${error.message}`),
    });
    const startMutation = trpc.session.start.useMutation({
        onSuccess: async () => {
            toast.success('Session started');
            await Promise.all([sessionQuery.refetch(), logsQuery.refetch(), healthQuery.refetch()]);
        },
        onError: (error) => toast.error(`Start failed: ${error.message}`),
    });
    const stopMutation = trpc.session.stop.useMutation({
        onSuccess: async () => {
            toast.success('Session stopped');
            await Promise.all([sessionQuery.refetch(), logsQuery.refetch(), healthQuery.refetch()]);
        },
        onError: (error) => toast.error(`Stop failed: ${error.message}`),
    });
    const restartMutation = trpc.session.restart.useMutation({
        onSuccess: async () => {
            toast.success('Session restarted');
            await Promise.all([sessionQuery.refetch(), logsQuery.refetch(), healthQuery.refetch()]);
        },
        onError: (error) => toast.error(`Restart failed: ${error.message}`),
    });

    const session = sessionQuery.data;
    const logs = normalizeLogs(logsQuery.data);
    const currentStatus = (session?.status ?? 'created') as SessionStatus;
    const canStart = currentStatus === 'created' || currentStatus === 'stopped' || currentStatus === 'error';
    const canStop = currentStatus === 'running' || currentStatus === 'starting' || currentStatus === 'restarting';
    const logsPayloadInvalid = logsQuery.data != null && !Array.isArray(logsQuery.data);

    const healthSummary = useMemo(() => {
        if (healthQuery.isError) return `Health unavailable: ${healthQuery.error.message}`;
        if (!healthQuery.data || typeof healthQuery.data !== 'object') return 'No health snapshot';
        const payload = healthQuery.data as Record<string, unknown>;
        if (typeof payload['message'] === 'string') return payload['message'];
        if (typeof payload['status'] === 'string') return payload['status'];
        return 'Health snapshot available';
    }, [healthQuery.data, healthQuery.error, healthQuery.isError]);

    if (sessionQuery.isLoading) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (sessionQuery.isError) {
        return (
            <div className="p-8 space-y-6">
                <Link href="/dashboard/session" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
                    <ArrowLeft className="h-4 w-4" /> Back to sessions
                </Link>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-8 text-center text-red-300">
                        Session details unavailable: {sessionQuery.error.message}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="p-8 space-y-6">
                <Link href="/dashboard/session" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm">
                    <ArrowLeft className="h-4 w-4" /> Back to sessions
                </Link>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-8 text-center text-zinc-400">
                        Session <span className="font-mono">{sessionId}</span> not found.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/dashboard/session" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-3">
                        <ArrowLeft className="h-4 w-4" /> Back to sessions
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Terminal className="h-8 w-8 text-blue-500" />
                        {session.name}
                    </h1>
                    <p className="text-zinc-500 mt-2 font-mono text-xs break-all">
                        {session.id}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={statusTone(currentStatus)}>{currentStatus}</Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">{session.cliType}</Badge>
                    {session.autoRestart ? (
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">Auto Restart</Badge>
                    ) : (
                        <Badge variant="outline" className="border-amber-600/30 text-amber-200">Manual Restart</Badge>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-zinc-300">Session Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-zinc-400">
                        <div><span className="text-zinc-500">Working Dir:</span> <span className="font-mono break-all">{session.workingDirectory}</span></div>
                        <div><span className="text-zinc-500">Requested Dir:</span> <span className="font-mono break-all">{session.requestedWorkingDirectory}</span></div>
                        {session.worktreePath && (
                            <div><span className="text-zinc-500">Worktree:</span> <span className="font-mono break-all">{session.worktreePath}</span></div>
                        )}
                        <div><span className="text-zinc-500">Execution Profile:</span> <span className="font-mono">{session.executionProfile}</span></div>
                        <div><span className="text-zinc-500">Restarts:</span> {session.restartCount} / {session.maxRestartAttempts}</div>
                        <div><span className="text-zinc-500">Last Activity:</span> {formatRelativeTime(session.lastActivityAt)}</div>
                        {session.lastError && (
                            <div className="mt-3 rounded-md border border-red-900/40 bg-red-950/30 p-3 text-red-300 text-xs break-words">
                                {session.lastError}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-zinc-300">Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            className="w-full bg-emerald-700 hover:bg-emerald-600"
                            disabled={!canStart || startMutation.isPending}
                            onClick={() => startMutation.mutate({ id: session.id })}
                        >
                            {startMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Start
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                            disabled={!canStop || stopMutation.isPending}
                            onClick={() => stopMutation.mutate({ id: session.id })}
                        >
                            {stopMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}Stop
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
                            disabled={restartMutation.isPending}
                            onClick={() => restartMutation.mutate({ id: session.id })}
                        >
                            {restartMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}Restart
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-emerald-400" /> Session Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-zinc-400">
                        {healthQuery.isLoading ? 'Loading health...' : healthSummary}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-cyan-400" /> Process Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {attachQuery.isLoading ? (
                            <div className="text-xs text-zinc-500">Loading…</div>
                        ) : attachQuery.isError ? (
                            <div className="rounded-md border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                                Process info unavailable: {attachQuery.error.message}
                            </div>
                        ) : (() => {
                            const info = attachQuery.data as Record<string, unknown> | null | undefined;
                            const attachable = info?.attachable === true;
                            const pid = typeof info?.pid === 'number' ? info.pid : null;
                            const command = typeof info?.command === 'string' ? info.command : null;
                            const args = Array.isArray(info?.args) ? (info!.args as string[]) : [];
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {attachable
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                            : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
                                        <span className={`text-sm font-medium ${attachable ? 'text-emerald-300' : 'text-amber-300'}`}>
                                            {attachable ? 'Process live' : 'Process not running'}
                                        </span>
                                        {pid !== null && (
                                            <Badge variant="outline" className="border-zinc-700 text-zinc-300 font-mono text-xs">
                                                PID {pid}
                                            </Badge>
                                        )}
                                    </div>
                                    {command && (
                                        <div className="rounded-md bg-black/40 border border-zinc-800 px-3 py-2 font-mono text-xs text-zinc-300 break-all">
                                            {[command, ...args].join(' ')}
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                                        <Info className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-zinc-500 leading-relaxed">
                                            HyperCode supervises the session process but does not pass stdin to it.
                                            Use <span className="text-zinc-300 font-medium">Run shell command</span> below to execute commands
                                            in the session&apos;s working directory. For interactive terminal access,
                                            connect directly via the CLI harness.
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <ActivitySquare className="h-4 w-4 text-violet-400" /> Logs (latest {logs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {logsQuery.isError || logsPayloadInvalid ? (
                        <div className="p-6 text-sm text-red-300">
                            Logs unavailable{logsQuery.isError ? `: ${logsQuery.error.message}` : ' due to malformed data'}.
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-6 text-sm text-zinc-500">No logs yet.</div>
                    ) : (
                        <ScrollArea className="max-h-[460px]">
                            <div className="divide-y divide-zinc-800">
                                {logs.map((entry, idx) => (
                                    <div key={`${entry.timestamp}-${idx}`} className="px-4 py-3 hover:bg-zinc-800/30">
                                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500 mb-1">
                                            <span>{entry.stream}</span>
                                            <span>•</span>
                                            <span>{formatRelativeTime(entry.timestamp)}</span>
                                        </div>
                                        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{entry.message}</pre>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-400" /> Shell Execute
                        <span className="font-normal text-zinc-500 text-xs ml-1">— runs in session working directory, not in the supervised process&apos;s stdin</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            value={shellCommand}
                            onChange={(e) => setShellCommand(e.target.value)}
                            placeholder="e.g. git status"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Button
                            onClick={() => executeShellMutation.mutate({ id: session.id, command: shellCommand })}
                            disabled={!shellCommand.trim() || executeShellMutation.isPending}
                            className="bg-blue-700 hover:bg-blue-600"
                        >
                            {executeShellMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Run
                        </Button>
                    </div>

                    {executeShellMutation.data && (
                        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words bg-black/40 border border-zinc-800 rounded p-3 max-h-64 overflow-y-auto">
                            {executeShellMutation.data.output}
                        </pre>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
