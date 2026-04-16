"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, ScrollArea } from "@hypercode/ui";
import { Layers, Plus, Trash2, Loader2, RefreshCw, FileText, Code2, Copy, Check } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type NormalizedContextFilesResult = {
    data: string[];
    invalid: boolean;
};

function normalizeContextFiles(data: unknown): NormalizedContextFilesResult {
    if (data == null) return { data: [], invalid: false };
    if (!Array.isArray(data)) return { data: [], invalid: true };

    let invalid = false;
    const normalized = data.filter((f): f is string => {
        const isValid = typeof f === 'string';
        if (!isValid) {
            invalid = true;
        }
        return isValid;
    });

    return { data: normalized, invalid };
}

export default function ContextDashboard() {
    const [newFile, setNewFile] = useState('');
    const [copied, setCopied] = useState(false);

    const utils = trpc.useUtils();
    const filesQuery = trpc.hypercodeContext.list.useQuery();
    const promptQuery = trpc.hypercodeContext.getPrompt.useQuery();
    const harvestQuery = trpc.hypercodeContext.getHarvestedContext.useQuery(undefined, { refetchInterval: 5000 });
    const statsQuery = trpc.hypercodeContext.getHarvestStats.useQuery(undefined, { refetchInterval: 5000 });

    const pruneMutation = trpc.hypercodeContext.prune.useMutation({
        onSuccess: async () => {
            toast.success('Pruned inactive context chunks');
            await utils.hypercodeContext.getHarvestedContext.invalidate();
            await utils.hypercodeContext.getHarvestStats.invalidate();
        }
    });

    const compactMutation = trpc.hypercodeContext.compact.useMutation({
        onSuccess: async () => {
            toast.success('Compacted older context chunks');
            await utils.hypercodeContext.getHarvestedContext.invalidate();
            await utils.hypercodeContext.getHarvestStats.invalidate();
        }
    });

    const addMutation = trpc.hypercodeContext.add.useMutation({
        onSuccess: async () => {
            toast.success('File added to context');
            setNewFile('');
            await utils.hypercodeContext.list.invalidate();
            await utils.hypercodeContext.getPrompt.invalidate();
        },
        onError: err => toast.error(`Failed to add: ${err.message}`),
    });

    const removeMutation = trpc.hypercodeContext.remove.useMutation({
        onSuccess: async () => {
            toast.success('File removed from context');
            await utils.hypercodeContext.list.invalidate();
            await utils.hypercodeContext.getPrompt.invalidate();
        },
        onError: err => toast.error(`Failed to remove: ${err.message}`),
    });

    const clearMutation = trpc.hypercodeContext.clear.useMutation({
        onSuccess: async () => {
            toast.success('Context cleared');
            await utils.hypercodeContext.list.invalidate();
            await utils.hypercodeContext.getPrompt.invalidate();
        },
        onError: err => toast.error(`Failed to clear: ${err.message}`),
    });

    const normalizedContextFiles = normalizeContextFiles(filesQuery.data);
    const contextFiles = normalizedContextFiles.data;
    const filesUnavailable = filesQuery.isError || normalizedContextFiles.invalid;
    const promptUnavailable = promptQuery.isError || (promptQuery.data != null && typeof promptQuery.data !== 'string');
    const promptText = typeof promptQuery.data === 'string' ? promptQuery.data : '';

    const handleAdd = () => {
        const trimmed = newFile.trim();
        if (!trimmed) return;
        addMutation.mutate({ filePath: trimmed });
    };

    const handleCopyPrompt = async () => {
        if (!promptText) return;
        await navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Layers className="h-8 w-8 text-sky-500" />
                        Context Manager
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Manage the set of files that are injected into the HyperCode context prompt for active AI sessions.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-400 hover:text-white"
                    onClick={() => { filesQuery.refetch(); promptQuery.refetch(); }}
                    disabled={filesQuery.isFetching || promptQuery.isFetching}
                >
                    {(filesQuery.isFetching || promptQuery.isFetching) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                </Button>
            </div>

            <div className="grid gap-8 xl:grid-cols-2">
                {/* Left: File List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Context Files
                            {contextFiles.length > 0 && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                    {contextFiles.length}
                                </Badge>
                            )}
                        </h2>
                        {contextFiles.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-600 hover:text-red-400 h-7 px-2"
                                onClick={() => { if (confirm('Remove all context files?')) clearMutation.mutate(); }}
                                disabled={clearMutation.isPending}
                            >
                                {clearMutation.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                Clear All
                            </Button>
                        )}
                    </div>

                    {/* Add file input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newFile}
                            onChange={e => setNewFile(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="Path to file (e.g. packages/core/src/trpc.ts)"
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500/50"
                        />
                        <Button
                            onClick={handleAdd}
                            disabled={!newFile.trim() || addMutation.isPending}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-3 shrink-0"
                        >
                            {addMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                        </Button>
                    </div>

                    {/* List */}
                    {filesQuery.isLoading ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                        </div>
                    ) : filesUnavailable ? (
                        <div className="text-center p-10 text-rose-300 text-sm border border-rose-500/30 bg-rose-950/20 rounded-lg">
                            <Layers className="h-8 w-8 mx-auto mb-3 opacity-80" />
                            Context file list unavailable{filesQuery.isError ? `: ${filesQuery.error.message}` : ' due to malformed data'}.
                        </div>
                    ) : contextFiles.length === 0 ? (
                        <div className="text-center p-10 text-zinc-600 text-sm border border-dashed border-zinc-800 rounded-lg">
                            <Layers className="h-8 w-8 mx-auto mb-3 opacity-30" />
                            No files in context. Add a file above.
                        </div>
                    ) : (
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-0">
                                <div className="divide-y divide-zinc-800">
                                    {contextFiles.map(file => (
                                        <div key={file} className="flex items-center gap-3 px-4 py-3 group hover:bg-zinc-800/40 transition-colors">
                                            <FileText className="h-4 w-4 text-sky-500 shrink-0" />
                                            <span className="font-mono text-xs text-zinc-300 flex-1 truncate" title={file}>
                                                {file}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeMutation.mutate({ filePath: file })}
                                                disabled={removeMutation.isPending && (removeMutation.variables as { filePath?: string } | undefined)?.filePath === file}
                                                title="Remove from context"
                                            >
                                                {removeMutation.isPending && (removeMutation.variables as { filePath?: string } | undefined)?.filePath === file ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Assembled Prompt */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Code2 className="h-4 w-4" />
                            Assembled Context Prompt
                        </h2>
                        {promptText && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-zinc-500 hover:text-sky-400"
                                onClick={handleCopyPrompt}
                            >
                                {copied ? (
                                    <><Check className="h-3.5 w-3.5 mr-1 text-green-400" />Copied</>
                                ) : (
                                    <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>
                                )}
                            </Button>
                        )}
                    </div>

                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-2 border-b border-zinc-800">
                            <CardTitle className="text-xs text-zinc-500 font-mono">context_prompt.txt</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {promptQuery.isLoading ? (
                                <div className="flex justify-center p-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                                </div>
                            ) : promptUnavailable ? (
                                <div className="text-center p-10 text-rose-300 text-sm border border-rose-500/30 bg-rose-950/20 rounded-lg m-4">
                                    Context prompt unavailable{promptQuery.isError ? `: ${promptQuery.error.message}` : ' due to malformed data'}.
                                </div>
                            ) : !promptText ? (
                                <div className="text-center p-10 text-zinc-600 text-sm">
                                    No context files — prompt is empty.
                                </div>
                            ) : (
                                <ScrollArea className="h-[480px]">
                                    <pre className="p-4 text-xs font-mono text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                                        {promptText}
                                    </pre>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Harvested Context */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Harvested Context Chunks
                        {statsQuery.data && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {statsQuery.data.totalChunks} chunks ({statsQuery.data.totalTokens} tokens)
                            </Badge>
                        )}
                    </h2>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-500 hover:text-amber-400"
                            onClick={() => pruneMutation.mutate()}
                            disabled={pruneMutation.isPending}
                        >
                            Prune Inactive
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-sky-500 hover:text-sky-400"
                            onClick={() => compactMutation.mutate()}
                            disabled={compactMutation.isPending}
                        >
                            Compact
                        </Button>
                    </div>
                </div>
                <Card className="border-zinc-800 bg-zinc-950/50">
                    <CardContent className="p-0">
                        {harvestQuery.isLoading ? (
                            <div className="p-8 text-center text-zinc-500 flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading context...
                            </div>
                        ) : harvestQuery.isError ? (
                            <div className="p-8 text-center text-red-500">Failed to load harvested context.</div>
                        ) : !harvestQuery.data || (harvestQuery.data as any[]).length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                No context has been harvested yet. Modify files to trigger sensory harvesting.
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px]">
                                <div className="divide-y divide-zinc-800/50">
                                    {(harvestQuery.data as any[]).map((chunk: any) => (
                                        <div key={chunk.id} className="p-4 hover:bg-zinc-900/50 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3 text-xs">
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono">
                                                        {chunk.source}
                                                    </Badge>
                                                    <span className="text-zinc-500 font-mono">{chunk.metadata?.path || 'unknown'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Badge variant="secondary" className="text-xs bg-zinc-800">
                                                        Score: {Number(chunk.relevanceScore).toFixed(2)}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400 font-mono">
                                                        ~{chunk.tokenCount}t
                                                    </Badge>
                                                </div>
                                            </div>
                                            <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed mt-2 bg-black/40 p-3 rounded-md border border-zinc-800/50">
                                                {chunk.content.length > 500 ? chunk.content.substring(0, 500) + '...' : chunk.content}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
