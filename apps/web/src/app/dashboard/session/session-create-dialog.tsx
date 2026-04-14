"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Switch,
    Textarea,
} from '@hypercode/ui';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { trpc } from '@/utils/trpc';

import { parseArgsInput, parseEnvInput } from './session-create-dialog-utils';

interface SessionHarnessCatalogEntry {
    id?: string;
    name?: string;
    command?: string;
    args?: string[];
    homepage?: string;
    docsUrl?: string;
    installHint?: string;
    category?: 'cli' | 'cloud' | 'editor';
    sessionCapable?: boolean;
    versionArgs?: string[];
    installed?: boolean;
    resolvedPath?: string | null;
    version?: string | null;
    detectionError?: string | null;
}

interface SessionCreateDialogProps {
    catalog: SessionHarnessCatalogEntry[];
    onCreated?: () => Promise<void> | void;
}

const EXECUTION_PROFILE_OPTIONS = [
    {
        value: 'auto',
        label: 'Auto',
        description: 'Prefer HyperCode\'s default verified shell for this host.',
    },
    {
        value: 'powershell',
        label: 'PowerShell-native',
        description: 'Bias toward PowerShell for general Windows harness supervision.',
    },
    {
        value: 'posix',
        label: 'POSIX pipelines',
        description: 'Bias toward Cygwin, Git Bash, or WSL when Unix-style pipelines matter.',
    },
    {
        value: 'compatibility',
        label: 'Compatibility-first',
        description: 'Use the most conservative shell posture HyperCode can verify on this host.',
    },
] as const;

function getDefaultHarness(catalog: SessionHarnessCatalogEntry[]): string {
    return catalog.find((entry) => entry.sessionCapable && entry.installed && entry.id)?.id
        ?? catalog.find((entry) => entry.sessionCapable && entry.id)?.id
        ?? '';
}

export function SessionCreateDialog({ catalog, onCreated }: SessionCreateDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [cliType, setCliType] = useState(() => getDefaultHarness(catalog));
    const [workingDirectory, setWorkingDirectory] = useState('');
    const [argsInput, setArgsInput] = useState('');
    const [envInput, setEnvInput] = useState('');
    const [executionProfile, setExecutionProfile] = useState<(typeof EXECUTION_PROFILE_OPTIONS)[number]['value']>('auto');
    const [autoRestart, setAutoRestart] = useState(true);
    const [isolateWorktree, setIsolateWorktree] = useState(true);
    const [maxRestartAttempts, setMaxRestartAttempts] = useState('5');

    useEffect(() => {
        if (!catalog.some((entry) => entry.id === cliType)) {
            setCliType(getDefaultHarness(catalog));
        }
    }, [catalog, cliType]);

    const sessionCapableCatalog = useMemo(
        () => catalog.filter((entry): entry is SessionHarnessCatalogEntry & { id: string } => Boolean(entry.sessionCapable && entry.id)),
        [catalog],
    );

    const selectedHarness = sessionCapableCatalog.find((entry) => entry.id === cliType);

    const createMutation = trpc.session.create.useMutation({
        onSuccess: async () => {
            toast.success('Supervised session created');
            setOpen(false);
            setName('');
            setWorkingDirectory('');
            setArgsInput('');
            setEnvInput('');
            setExecutionProfile('auto');
            setAutoRestart(true);
            setIsolateWorktree(true);
            setMaxRestartAttempts('5');
            setCliType(getDefaultHarness(catalog));
            await onCreated?.();
        },
        onError: (error) => {
            toast.error(`Session creation failed: ${error.message}`);
        },
    });

    const canCreate = Boolean(selectedHarness) && Boolean(workingDirectory.trim()) && Boolean(selectedHarness?.installed);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                onClick={() => setOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white"
                title="Create a new supervised CLI session"
            >
                <Plus className="mr-2 h-4 w-4" />
                New Session
            </Button>
            <DialogContent className="sm:max-w-2xl bg-zinc-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Create supervised session</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Spawn a CLI harness under HyperCode supervision with auto-restart and optional worktree isolation.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="session-cli-type">CLI harness</Label>
                        <Select value={cliType} onValueChange={setCliType}>
                            <SelectTrigger id="session-cli-type" className="bg-zinc-900 border-white/10 text-white">
                                <SelectValue placeholder="Select a supervised CLI" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {sessionCapableCatalog.map((entry) => (
                                    <SelectItem key={entry.id} value={entry.id} className="focus:bg-white/10 focus:text-white">
                                        {entry.name ?? entry.id}{entry.installed ? '' : ' (not detected)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedHarness ? (
                        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-white">{selectedHarness.name ?? selectedHarness.id}</span>
                                <Badge className={selectedHarness.installed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}>
                                    {selectedHarness.installed ? 'Installed' : 'Not detected'}
                                </Badge>
                                {selectedHarness.version ? (
                                    <Badge variant="outline" className="border-white/20 text-zinc-300">{selectedHarness.version}</Badge>
                                ) : null}
                            </div>
                            <p className="mt-2 text-zinc-400">Command: <span className="font-mono text-zinc-200">{selectedHarness.command ?? selectedHarness.id}</span></p>
                            {selectedHarness.resolvedPath ? (
                                <p className="mt-1 break-all text-xs text-zinc-500">PATH: {selectedHarness.resolvedPath}</p>
                            ) : null}
                            {!selectedHarness.installed ? (
                                <p className="mt-2 text-amber-300">{selectedHarness.detectionError ?? selectedHarness.installHint ?? 'Install this harness to enable supervised sessions.'}</p>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="session-name">Session name</Label>
                            <Input
                                id="session-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={selectedHarness ? `${selectedHarness.name ?? selectedHarness.id} session` : 'Aider feature branch'}
                                className="bg-zinc-900 border-white/10 text-white"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="session-max-restarts">Max restart attempts</Label>
                            <Input
                                id="session-max-restarts"
                                type="number"
                                min={0}
                                max={20}
                                value={maxRestartAttempts}
                                onChange={(event) => setMaxRestartAttempts(event.target.value)}
                                className="bg-zinc-900 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="session-working-directory">Working directory</Label>
                        <Input
                            id="session-working-directory"
                            value={workingDirectory}
                            onChange={(event) => setWorkingDirectory(event.target.value)}
                            placeholder="C:\\Users\\hyper\\workspace\\hypercode"
                            className="bg-zinc-900 border-white/10 text-white"
                        />
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="session-args">Additional args</Label>
                            <Textarea
                                id="session-args"
                                value={argsInput}
                                onChange={(event) => setArgsInput(event.target.value)}
                                placeholder="--watch\n--model gpt-5-codex"
                                className="min-h-[120px] bg-zinc-900 border-white/10 text-white"
                            />
                            <p className="text-xs text-zinc-500">One arg per line, or comma-separated.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="session-env">Environment overrides</Label>
                            <Textarea
                                id="session-env"
                                value={envInput}
                                onChange={(event) => setEnvInput(event.target.value)}
                                placeholder="OPENAI_API_KEY=...\nBORG_PROFILE=autopilot"
                                className="min-h-[120px] bg-zinc-900 border-white/10 text-white"
                            />
                            <p className="text-xs text-zinc-500">Use KEY=VALUE pairs. Invalid lines are ignored.</p>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="session-execution-profile">Execution profile</Label>
                        <Select value={executionProfile} onValueChange={(value) => setExecutionProfile(value as (typeof EXECUTION_PROFILE_OPTIONS)[number]['value'])}>
                            <SelectTrigger id="session-execution-profile" className="bg-zinc-900 border-white/10 text-white">
                                <SelectValue placeholder="Select an execution profile" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                {EXECUTION_PROFILE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value} className="focus:bg-white/10 focus:text-white">
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500">
                            {EXECUTION_PROFILE_OPTIONS.find((option) => option.value === executionProfile)?.description}
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-white/10 bg-zinc-900/70 p-4 md:grid-cols-2">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Label htmlFor="session-auto-restart" className="text-white">Auto restart</Label>
                                <p className="mt-1 text-xs text-zinc-500">Restart the harness if it crashes unexpectedly.</p>
                            </div>
                            <Switch id="session-auto-restart" checked={autoRestart} onCheckedChange={setAutoRestart} />
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <Label htmlFor="session-isolate-worktree" className="text-white">Worktree isolation</Label>
                                <p className="mt-1 text-xs text-zinc-500">Launch the session in an isolated git worktree when supported.</p>
                            </div>
                            <Switch id="session-isolate-worktree" checked={isolateWorktree} onCheckedChange={setIsolateWorktree} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            createMutation.mutate({
                                name: name.trim() || undefined,
                                cliType,
                                workingDirectory: workingDirectory.trim(),
                                args: parseArgsInput(argsInput),
                                env: parseEnvInput(envInput),
                                executionProfile,
                                autoRestart,
                                isolateWorktree,
                                maxRestartAttempts: Number.isFinite(Number(maxRestartAttempts)) ? Number(maxRestartAttempts) : 5,
                            });
                        }}
                        disabled={!canCreate || createMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        {createMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
                        ) : 'Create session'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}