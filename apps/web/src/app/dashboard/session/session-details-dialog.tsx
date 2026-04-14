"use client";

import { useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    Input,
    DialogTitle,
    ScrollArea,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@hypercode/ui';
import { ActivitySquare, Check, Copy, Loader2, TerminalSquare } from 'lucide-react';
import { toast } from 'sonner';

import { trpc } from '@/utils/trpc';

import { buildAttachCommand, formatRelativeTimestamp, formatRestartCountdown, getHealthTone, getSessionTone } from './session-dashboard-utils';

type ObservationRecord = {
    id?: string;
    content?: string;
    createdAt?: string | number | Date;
    metadata?: {
        structuredObservation?: {
            type?: string;
            title?: string;
            narrative?: string;
            toolName?: string;
            facts?: string[];
            filesRead?: string[];
            filesModified?: string[];
        };
    };
};

type SessionLogEntry = {
    timestamp: number;
    stream: 'stdout' | 'stderr' | 'system';
    message: string;
};

type SessionHealth = {
    status: string;
    lastCheck: number;
    consecutiveFailures: number;
    restartCount: number;
    lastRestartAt?: number;
    nextRestartAt?: number;
    lastExitCode?: number;
    lastExitSignal?: string;
    errorMessage?: string;
};

type SessionAttachInfo = {
    cwd: string;
    command: string;
    args: string[];
    pid?: number;
    attachReadiness?: string;
    attachReadinessReason?: string;
};

export type SessionDetailsDialogSession = {
    id?: string;
    name?: string;
    cliType?: string;
    workingDirectory?: string;
    worktreePath?: string;
    executionProfile?: 'auto' | 'powershell' | 'posix' | 'compatibility';
    executionPolicy?: {
        requestedProfile?: 'auto' | 'powershell' | 'posix' | 'compatibility';
        effectiveProfile?: 'powershell' | 'posix' | 'compatibility' | 'fallback';
        shellId?: string | null;
        shellLabel?: string | null;
        shellFamily?: 'powershell' | 'cmd' | 'posix' | 'wsl' | null;
        shellPath?: string | null;
        supportsPowerShell?: boolean;
        supportsPosixShell?: boolean;
        reason?: string;
    } | null;
    autoRestart?: boolean;
    isolateWorktree?: boolean;
    status?: string;
    restartCount?: number;
    maxRestartAttempts?: number;
    scheduledRestartAt?: number;
    lastActivityAt?: number;
    lastError?: string;
    lastExitCode?: number;
    lastExitSignal?: string;
    metadata?: {
        memoryBootstrap?: {
            prompt?: string;
            summaryCount?: number;
            observationCount?: number;
        };
        memoryBootstrapGeneratedAt?: number;
    };
};

interface SessionDetailsDialogProps {
    session: SessionDetailsDialogSession;
    currentTimestamp: number;
}

function getLogTone(stream: 'stdout' | 'stderr' | 'system'): string {
    switch (stream) {
        case 'stderr':
            return 'border-red-500/20 bg-red-500/10 text-red-200';
        case 'system':
            return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
        default:
            return 'border-zinc-700 bg-zinc-900 text-zinc-200';
    }
}

function isSessionLogEntry(value: unknown): value is SessionLogEntry {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { timestamp?: unknown }).timestamp === 'number'
        && typeof (value as { message?: unknown }).message === 'string'
        && ((value as { stream?: unknown }).stream === 'stdout'
            || (value as { stream?: unknown }).stream === 'stderr'
            || (value as { stream?: unknown }).stream === 'system');
}

function isSessionHealth(value: unknown): value is SessionHealth {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { status?: unknown }).status === 'string'
        && typeof (value as { lastCheck?: unknown }).lastCheck === 'number'
        && typeof (value as { consecutiveFailures?: unknown }).consecutiveFailures === 'number'
        && typeof (value as { restartCount?: unknown }).restartCount === 'number';
}

function isObservationRecord(value: unknown): value is ObservationRecord {
    return typeof value === 'object' && value !== null;
}

function isSessionAttachInfo(value: unknown): value is SessionAttachInfo {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { cwd?: unknown }).cwd === 'string'
        && typeof (value as { command?: unknown }).command === 'string'
        && Array.isArray((value as { args?: unknown }).args);
}

export function SessionDetailsDialog({ session, currentTimestamp }: SessionDetailsDialogProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shellCommand, setShellCommand] = useState('');
    const [shellResult, setShellResult] = useState<null | {
        output: string;
        exitCode: number;
        durationMs: number;
        succeeded: boolean;
        shellFamily: 'powershell' | 'cmd' | 'posix' | 'wsl' | 'default';
    }>(null);
    const sessionId = session.id ?? '';

    const logsQuery = trpc.session.logs.useQuery(
        { id: sessionId, limit: 200 },
        { enabled: open && Boolean(sessionId), refetchInterval: open ? 3000 : false },
    );

    const attachInfoQuery = trpc.session.attachInfo.useQuery(
        { id: sessionId },
        { enabled: open && Boolean(sessionId), refetchInterval: open ? 5000 : false },
    );

    const healthQuery = trpc.session.health.useQuery(
        { id: sessionId },
        { enabled: open && Boolean(sessionId), refetchInterval: open ? 5000 : false },
    );

    const observationsQuery = trpc.memory.getRecentObservations.useQuery(
        { limit: 5, namespace: 'project' },
        { enabled: open, refetchInterval: open ? 5000 : false },
    );

    const executeShellMutation = trpc.session.executeShell.useMutation({
        onSuccess: (result) => {
            setShellResult({
                output: result.output,
                exitCode: result.exitCode,
                durationMs: result.durationMs,
                succeeded: result.succeeded,
                shellFamily: result.shellFamily,
            });
            toast.success(result.succeeded ? 'Command completed' : `Command exited with code ${result.exitCode}`);
            void logsQuery.refetch();
        },
        onError: (error) => {
            setShellResult(null);
            toast.error(`Shell command failed: ${error.message}`);
        },
    });

    const attachCommand = useMemo(() => {
        if (!isSessionAttachInfo(attachInfoQuery.data)) {
            return null;
        }

        return buildAttachCommand(
            attachInfoQuery.data.cwd,
            attachInfoQuery.data.command,
            attachInfoQuery.data.args,
            session.executionPolicy,
        );
    }, [attachInfoQuery.data]);

    const logsUnavailable = Boolean(logsQuery.error) || (logsQuery.data !== undefined && !Array.isArray(logsQuery.data));
    const healthUnavailable = Boolean(healthQuery.error) || (healthQuery.data !== undefined && !isSessionHealth(healthQuery.data));
    const attachUnavailable = Boolean(attachInfoQuery.error) || (attachInfoQuery.data !== undefined && !isSessionAttachInfo(attachInfoQuery.data));
    const observationsUnavailable = Boolean(observationsQuery.error) || (observationsQuery.data !== undefined && !Array.isArray(observationsQuery.data));
    const logs = !logsUnavailable && Array.isArray(logsQuery.data) ? logsQuery.data.filter(isSessionLogEntry) : [];
    const healthData = !healthUnavailable && isSessionHealth(healthQuery.data) ? healthQuery.data : undefined;
    const attachInfo = !attachUnavailable && isSessionAttachInfo(attachInfoQuery.data) ? (attachInfoQuery.data as SessionAttachInfo) : undefined;
    const observations = !observationsUnavailable && Array.isArray(observationsQuery.data)
        ? observationsQuery.data.filter(isObservationRecord)
        : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                disabled={!sessionId}
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            >
                <TerminalSquare className="mr-2 h-4 w-4" />
                Details
            </Button>
            <DialogContent className="max-h-[85vh] overflow-hidden border-white/10 bg-zinc-950 text-white sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-2">
                        <span>{session.name ?? 'Unnamed session'}</span>
                        <Badge className={getSessionTone(session.status ?? 'created')}>{session.status ?? 'unknown'}</Badge>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">{session.cliType ?? 'cli'}</Badge>
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Review live logs, supervisor health, and attach information for this supervised CLI session.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="logs" className="mt-2 flex min-h-0 flex-1 flex-col">
                    <TabsList className="w-full justify-start bg-zinc-900">
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="attach">Attach</TabsTrigger>
                    </TabsList>

                    <TabsContent value="logs" className="mt-4 min-h-0 flex-1">
                        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                            <span>{logsUnavailable ? '—' : logs.length} buffered log entries</span>
                            {logsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        </div>
                        <ScrollArea className="h-[48vh] rounded-xl border border-zinc-800 bg-black/40 p-4">
                            <div className="space-y-3">
                                {logsUnavailable ? (
                                    <p className="text-sm text-red-300">Session logs unavailable: {logsQuery.error?.message ?? 'Session logs returned an invalid payload.'}</p>
                                ) : logs.length === 0 ? (
                                    <p className="text-sm text-zinc-500">No logs captured yet. Start the session or wait for fresh supervisor output.</p>
                                ) : logs.map((entry) => (
                                    <div key={`${entry.timestamp}-${entry.stream}-${entry.message.slice(0, 24)}`} className={`rounded-lg border p-3 ${getLogTone(entry.stream)}`}>
                                        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em]">
                                            <span>{entry.stream}</span>
                                            <span>{formatRelativeTimestamp(entry.timestamp, currentTimestamp)}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap break-words font-mono text-xs">{entry.message}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="overview" className="mt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-300">
                                    <ActivitySquare className="h-4 w-4" />
                                    Supervisor health
                                </div>
                                {healthQuery.isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading health…</div>
                                ) : healthUnavailable ? (
                                    <p className="text-sm text-red-300">Supervisor health unavailable: {healthQuery.error?.message ?? 'Session health returned an invalid payload.'}</p>
                                ) : healthData ? (
                                    <div className="space-y-3 text-sm text-zinc-300">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className={getHealthTone(healthData.status)}>{healthData.status}</Badge>
                                            <span className="text-zinc-500">Last check {formatRelativeTimestamp(healthData.lastCheck, currentTimestamp)}</span>
                                        </div>
                                        <p>Consecutive failures: {healthData.consecutiveFailures}</p>
                                        <p>Restart count: {healthData.restartCount}</p>
                                        {healthData.lastRestartAt ? (
                                            <p>Last restart: {formatRelativeTimestamp(healthData.lastRestartAt, currentTimestamp)}</p>
                                        ) : null}
                                        {healthData.nextRestartAt ? (
                                            <p>Queued restart: {formatRestartCountdown(healthData.nextRestartAt, currentTimestamp)}</p>
                                        ) : null}
                                        {typeof healthData.lastExitCode === 'number' || healthData.lastExitSignal ? (
                                            <p>
                                                Last exit: {typeof healthData.lastExitCode === 'number' ? `code ${healthData.lastExitCode}` : 'code unknown'}
                                                {healthData.lastExitSignal ? ` (${healthData.lastExitSignal})` : ''}
                                            </p>
                                        ) : null}
                                        {healthData.errorMessage ? (
                                            <p className="text-red-300">{healthData.errorMessage}</p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <p className="text-sm text-zinc-500">No health data available.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-300">
                                <div className="mb-3 text-sm font-semibold text-zinc-100">Session runtime</div>
                                <div className="space-y-2">
                                    <p>Status: <span className="text-white">{session.status ?? 'unknown'}</span></p>
                                    <p>Restart policy: <span className="text-white">{session.autoRestart === false ? 'Manual only' : 'Automatic'}</span></p>
                                    <p>Worktree isolation: <span className="text-white">{session.isolateWorktree ? 'Enabled' : 'Disabled'}</span></p>
                                    <p>Execution profile: <span className="text-white">{session.executionProfile ?? 'auto'}</span></p>
                                    {session.executionPolicy?.shellLabel ? (
                                        <p>Selected shell: <span className="text-white">{session.executionPolicy.shellLabel}</span></p>
                                    ) : null}
                                    {session.executionPolicy?.reason ? (
                                        <p className="text-zinc-400">Policy: {session.executionPolicy.reason}</p>
                                    ) : null}
                                    <p>Last activity: <span className="text-white">{session.lastActivityAt ? formatRelativeTimestamp(session.lastActivityAt, currentTimestamp) : 'unknown'}</span></p>
                                    <p>Restarts: <span className="text-white">{session.restartCount ?? 0}/{session.maxRestartAttempts ?? 0}</span></p>
                                    {typeof session.lastExitCode === 'number' || session.lastExitSignal ? (
                                        <p>
                                            Last exit: <span className="text-white">{typeof session.lastExitCode === 'number' ? `code ${session.lastExitCode}` : 'code unknown'}</span>
                                            {session.lastExitSignal ? <span className="text-zinc-400"> ({session.lastExitSignal})</span> : null}
                                        </p>
                                    ) : null}
                                    {session.scheduledRestartAt ? (
                                        <p>Queued restart: <span className="text-amber-300">{formatRestartCountdown(session.scheduledRestartAt, currentTimestamp)}</span></p>
                                    ) : null}
                                    <p className="break-all">Workspace: <span className="font-mono text-xs text-zinc-400">{session.worktreePath ?? session.workingDirectory ?? 'unknown'}</span></p>
                                    {session.lastError ? (
                                        <p className="text-red-300">Last error: {session.lastError}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {session.metadata?.memoryBootstrap?.prompt ? (
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-zinc-300">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-indigo-300">Session-start memory bootstrap</span>
                                    {typeof session.metadata.memoryBootstrap.summaryCount === 'number' ? (
                                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-200">
                                            {session.metadata.memoryBootstrap.summaryCount} summaries
                                        </Badge>
                                    ) : null}
                                    {typeof session.metadata.memoryBootstrap.observationCount === 'number' ? (
                                        <Badge variant="outline" className="border-indigo-500/30 text-indigo-200">
                                            {session.metadata.memoryBootstrap.observationCount} observations
                                        </Badge>
                                    ) : null}
                                    {session.metadata.memoryBootstrapGeneratedAt ? (
                                        <span className="text-xs text-zinc-500">
                                            Generated {formatRelativeTimestamp(session.metadata.memoryBootstrapGeneratedAt, currentTimestamp)}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mb-3 text-xs text-zinc-500">
                                    This is the compact context HyperCode prepared when the session started, using recent summaries and observations from the native memory pipeline.
                                </p>
                                <pre className="whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-xs text-zinc-200">
                                    {session.metadata.memoryBootstrap.prompt}
                                </pre>
                            </div>
                        ) : null}

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-zinc-300">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-emerald-300">Recent runtime observations</span>
                                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-200">
                                            {observationsUnavailable ? '—' : observations.length} visible
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        HyperCode records structured observations after tool execution; this view shows the latest memory events from that native runtime pipeline.
                                    </p>
                                </div>
                                {observationsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
                            </div>

                            {observationsUnavailable ? (
                                <p className="text-xs text-red-300">Runtime observations unavailable: {observationsQuery.error?.message ?? 'Runtime observations returned an invalid payload.'}</p>
                            ) : observations.length === 0 ? (
                                <p className="text-xs text-zinc-500">No runtime observations recorded yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {observations.map((memory) => {
                                        const observation = memory.metadata?.structuredObservation;
                                        const timestamp = toTimestamp(memory.createdAt);
                                        const filesTouched = [
                                            ...(observation?.filesRead ?? []).map((file) => `read ${file}`),
                                            ...(observation?.filesModified ?? []).map((file) => `modified ${file}`),
                                        ];

                                        return (
                                            <div key={memory.id ?? `${observation?.title ?? 'observation'}-${timestamp ?? 0}`} className="rounded-lg border border-white/5 bg-black/30 p-3">
                                                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                                                    <Badge className={getObservationTone(observation?.type)}>{observation?.type ?? 'observation'}</Badge>
                                                    {observation?.toolName ? (
                                                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">{observation.toolName}</Badge>
                                                    ) : null}
                                                    {timestamp ? (
                                                        <span className="text-zinc-500">{formatRelativeTimestamp(timestamp, currentTimestamp)}</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm font-medium text-white">{observation?.title ?? 'Untitled observation'}</p>
                                                <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-300">
                                                    {observation?.narrative ?? memory.content ?? 'No observation narrative available.'}
                                                </p>
                                                {observation?.facts && observation.facts.length > 0 ? (
                                                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
                                                        {observation.facts.slice(0, 3).map((fact, index) => (
                                                            <li key={`${memory.id ?? 'obs'}-fact-${index}`}>{fact}</li>
                                                        ))}
                                                    </ul>
                                                ) : null}
                                                {filesTouched.length > 0 ? (
                                                    <p className="mt-2 text-[11px] text-zinc-500">
                                                        Files: {filesTouched.slice(0, 3).join(' · ')}
                                                    </p>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="attach" className="mt-4 space-y-4">
                        <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-300">
                            {attachInfoQuery.isLoading ? (
                                <div className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading attach info…</div>
                            ) : attachUnavailable ? (
                                <p className="text-sm text-red-300">Attach information unavailable: {attachInfoQuery.error?.message ?? 'Attach information returned an invalid payload.'}</p>
                            ) : attachInfo ? (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Nuanced attach readiness indicator */}
                                        {(() => {
                                            const readiness = attachInfo.attachReadiness;
                                            const reason = attachInfo.attachReadinessReason;
                                            
                                            if (readiness === 'ready') {
                                                return (
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-500">
                                                        Ready to attach
                                                    </Badge>
                                                );
                                            } else if (readiness === 'pending') {
                                                return (
                                                    <Badge className="bg-amber-600 hover:bg-amber-500">
                                                        {reason === 'starting' && 'Starting...'}
                                                        {reason === 'restarting' && 'Restarting...'}
                                                        {reason === 'stopping' && 'Stopping...'}
                                                        {!['starting', 'restarting', 'stopping'].includes(reason) && 'Pending'}
                                                    </Badge>
                                                );
                                            } else {
                                                return (
                                                    <Badge className="bg-red-600/70 hover:bg-red-500/70">
                                                        Not attachable
                                                    </Badge>
                                                );
                                            }
                                        })()}
                                        {attachInfo.pid ? <Badge variant="outline" className="border-zinc-700 text-zinc-300">PID {attachInfo.pid}</Badge> : null}
                                    </div>
                                    <div className="space-y-2">
                                        <p>Command: <span className="font-mono text-xs text-zinc-100">{attachInfo.command}</span></p>
                                        <p>Args: <span className="font-mono text-xs text-zinc-100">{attachInfo.args.join(' ') || '—'}</span></p>
                                        <p className="break-all">CWD: <span className="font-mono text-xs text-zinc-100">{attachInfo.cwd}</span></p>
                                        {attachInfo.attachReadinessReason ? (
                                            <p className="text-xs text-zinc-500">
                                                Status: <span className="text-zinc-400">{attachInfo.attachReadinessReason.replace(/-/g, ' ')}</span>
                                            </p>
                                        ) : null}
                                    </div>

                                    {(attachInfo.attachReadiness === 'ready') && (
                                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                                            <p className="text-xs font-semibold text-emerald-300 mb-2">Process is live and attachable</p>
                                            <p className="text-xs text-emerald-200/70">You can connect to this process using the attach command below or interact via shell commands.</p>
                                        </div>
                                    )}

                                    {(attachInfo.attachReadiness === 'pending') && (
                                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                                            <p className="text-xs font-semibold text-amber-300 mb-2">Session in transition</p>
                                            <p className="text-xs text-amber-200/70">The session is {attachInfo.attachReadinessReason}. Attach will be available once the transition completes.</p>
                                        </div>
                                    )}

                                    {attachCommand && (attachInfo.attachReadiness === 'ready') ? (
                                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Attach / relaunch command</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-zinc-300 hover:bg-white/5 hover:text-white"
                                                    onClick={async () => {
                                                        try {
                                                            await navigator.clipboard.writeText(attachCommand);
                                                            setCopied(true);
                                                            toast.success('Attach command copied');
                                                            window.setTimeout(() => setCopied(false), 1500);
                                                        } catch (error) {
                                                            toast.error(`Copy failed: ${error instanceof Error ? error.message : 'Clipboard unavailable'}`);
                                                        }
                                                    }}
                                                >
                                                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                                    {copied ? 'Copied' : 'Copy'}
                                                </Button>
                                            </div>
                                            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">{attachCommand}</pre>
                                        </div>
                                    ) : null}

                                    {(attachInfo.attachReadiness === 'ready') && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Run one-shot shell command</span>
                                            {session.executionPolicy?.shellLabel ? (
                                                <Badge variant="outline" className="border-cyan-500/30 text-cyan-200">
                                                    {session.executionPolicy.shellLabel}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={shellCommand}
                                                onChange={(event) => setShellCommand(event.target.value)}
                                                placeholder="pwd"
                                                className="bg-zinc-900 border-white/10 text-white"
                                            />
                                            <Button
                                                onClick={() => executeShellMutation.mutate({ id: sessionId, command: shellCommand.trim() })}
                                                disabled={!shellCommand.trim() || executeShellMutation.isPending || !sessionId}
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                                            >
                                                {executeShellMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
                                            </Button>
                                        </div>
                                        <p className="mt-2 text-xs text-zinc-500">
                                            Runs inside the session workspace using the selected HyperCode execution policy.
                                        </p>
                                        {shellResult ? (
                                            <div className="mt-3 rounded-md border border-white/5 bg-black/30 p-3">
                                                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                                                    <Badge className={shellResult.succeeded ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}>
                                                        {shellResult.succeeded ? 'Success' : `Exit ${shellResult.exitCode}`}
                                                    </Badge>
                                                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">{shellResult.shellFamily}</Badge>
                                                    <span>{shellResult.durationMs}ms</span>
                                                </div>
                                                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">{shellResult.output || '(no output)'}</pre>
                                            </div>
                                        ) : null}
                                    </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500">Attach information is unavailable for this session.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function getObservationTone(type?: string): string {
    switch (type) {
        case 'decision':
            return 'bg-violet-600 hover:bg-violet-500';
        case 'progress':
            return 'bg-emerald-600 hover:bg-emerald-500';
        case 'warning':
            return 'bg-amber-600 hover:bg-amber-500';
        case 'fix':
            return 'bg-cyan-600 hover:bg-cyan-500';
        default:
            return 'bg-zinc-700 hover:bg-zinc-600';
    }
}

function toTimestamp(value: string | number | Date | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}
