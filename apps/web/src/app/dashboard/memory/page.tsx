"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ScrollArea } from "@borg/ui";
import { Loader2, Brain, Search, Database, History, Zap, Filter, Plus, Save, Download, Upload, RefreshCw } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type MemoryInterchangeFormat = 'json' | 'csv' | 'jsonl' | 'json-provider' | 'claude-mem-store';

const MEMORY_FORMAT_OPTIONS: Array<{ value: MemoryInterchangeFormat; label: string }> = [
    { value: 'json', label: 'Canonical JSON' },
    { value: 'csv', label: 'Canonical CSV' },
    { value: 'jsonl', label: 'Canonical JSONL' },
    { value: 'json-provider', label: 'Borg JSON Provider' },
    { value: 'claude-mem-store', label: 'Claude-Mem Store' },
];

export default function MemoryDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [memoryType, setMemoryType] = useState<'session' | 'working' | 'long_term'>('working');
    const [newFact, setNewFact] = useState('');
    const [exportFormat, setExportFormat] = useState<MemoryInterchangeFormat>('json');
    const [convertToFormat, setConvertToFormat] = useState<MemoryInterchangeFormat>('claude-mem-store');
    const [importing, setImporting] = useState(false);
    const [converting, setConverting] = useState(false);

    const { data: stats } = trpc.memory.getAgentStats.useQuery(undefined, { refetchInterval: 10000 });
    const recentObservationsQuery = trpc.memory.getRecentObservations.useQuery({
        limit: 6,
        namespace: 'project',
    }, { refetchInterval: 10000 });
    const recentPromptsQuery = trpc.memory.getRecentUserPrompts.useQuery({
        limit: 5,
    }, { refetchInterval: 10000 });
    const { data: results, isLoading, refetch } = trpc.memory.searchAgentMemory.useQuery({
        query: searchQuery,
        type: memoryType,
        limit: 20
    }, { enabled: true });

    const addFactMutation = trpc.memory.addFact.useMutation({
        onSuccess: () => {
            toast.success("Fact added to memory");
            setNewFact('');
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to add fact: ${err.message}`);
        }
    });

    const handleAddFact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFact.trim()) return;
        addFactMutation.mutate({ content: newFact, type: memoryType === 'long_term' ? 'long_term' : 'working' });
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Brain className="h-8 w-8 text-pink-500" />
                        Agent Memory Bank
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Inspect and manage the multi-tiered cognitive storage of the Collective
                    </p>
                </div>
                <div className="flex gap-4">
                    <StatCard label="Session" value={(stats as any)?.sessionCount || 0} icon={<History className="h-3 w-3" />} />
                    <StatCard label="Working" value={(stats as any)?.workingCount || 0} icon={<Zap className="h-3 w-3" />} />
                    <StatCard label="Long Term" value={(stats as any)?.longTermCount || 0} icon={<Database className="h-3 w-3" />} />
                    <StatCard label="Observations" value={(stats as any)?.observationCount || 0} icon={<RefreshCw className="h-3 w-3" />} />
                    <StatCard label="Prompts" value={(stats as any)?.promptCount || 0} icon={<Brain className="h-3 w-3" />} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                {/* Sidebar Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Memory Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Storage Tier</label>
                                <div className="flex flex-col gap-1">
                                    <TierButton active={memoryType === 'session'} onClick={() => setMemoryType('session')} label="Session" description="Transient context" />
                                    <TierButton active={memoryType === 'working'} onClick={() => setMemoryType('working')} label="Working" description="Active task data" />
                                    <TierButton active={memoryType === 'long_term'} onClick={() => setMemoryType('long_term')} label="Long Term" description="Persistent facts" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-pink-600">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Inject Fact
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddFact} className="space-y-3">
                                <textarea
                                    value={newFact}
                                    onChange={e => setNewFact(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-white h-20 focus:ring-1 focus:ring-pink-500 outline-none resize-none"
                                    placeholder="Manually add a fact to current tier..."
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={addFactMutation.isPending || !newFact.trim()}
                                    className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs"
                                >
                                    {addFactMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-2" />}
                                    Store Fact
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Export / Import Controls (Phase 70) */}
                    <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-cyan-600">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                Export / Import
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase">Format</label>
                                <select
                                    value={exportFormat}
                                    onChange={e => setExportFormat(e.target.value as MemoryInterchangeFormat)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                >
                                    {MEMORY_FORMAT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                size="sm"
                                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white text-xs"
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/trpc/memory.exportMemories?input=${encodeURIComponent(JSON.stringify({ userId: 'default', format: exportFormat }))}`);
                                        const json = await res.json();
                                        const content = json?.result?.data?.data || '';
                                        const extension = exportFormat === 'csv' ? 'csv' : exportFormat === 'jsonl' ? 'jsonl' : 'json';
                                        const blob = new Blob([content], { type: extension === 'csv' ? 'text/csv' : 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `borg-memories.${extension}`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                        toast.success(`Exported as ${MEMORY_FORMAT_OPTIONS.find(option => option.value === exportFormat)?.label || exportFormat}`);
                                    } catch (err: any) {
                                        toast.error(`Export failed: ${err.message}`);
                                    }
                                }}
                            >
                                <Download className="h-3 w-3 mr-2" />
                                Download Export
                            </Button>
                            <div className="border-t border-zinc-800 pt-3">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase block mb-2">Import File</label>
                                <input
                                    type="file"
                                    accept=".json,.csv,.jsonl"
                                    className="w-full text-[10px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setImporting(true);
                                        try {
                                            const text = await file.text();
                                            const res = await fetch('/api/trpc/memory.importMemories', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ userId: 'default', format: exportFormat, data: text })
                                            });
                                            const result = await res.json();
                                            toast.success(`Imported ${result?.result?.data?.imported || 0} memories`);
                                            refetch();
                                        } catch (err: any) {
                                            toast.error(`Import failed: ${err.message}`);
                                        } finally {
                                            setImporting(false);
                                        }
                                    }}
                                />
                                {importing && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-cyan-400">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Importing...
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-zinc-800 pt-3 space-y-2">
                                <label className="text-[10px] font-bold text-zinc-600 uppercase block">Convert Export</label>
                                <select
                                    value={convertToFormat}
                                    onChange={e => setConvertToFormat(e.target.value as MemoryInterchangeFormat)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                                >
                                    {MEMORY_FORMAT_OPTIONS.filter((option) => option.value !== exportFormat).map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={converting || convertToFormat === exportFormat}
                                    className="w-full border-zinc-700 hover:bg-zinc-800 text-cyan-300 text-xs"
                                    onClick={async () => {
                                        setConverting(true);
                                        try {
                                            const exportResponse = await fetch(`/api/trpc/memory.exportMemories?input=${encodeURIComponent(JSON.stringify({ userId: 'default', format: exportFormat }))}`);
                                            const exportJson = await exportResponse.json();
                                            const sourceData = exportJson?.result?.data?.data || '';

                                            const convertResponse = await fetch('/api/trpc/memory.convertMemories', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    userId: 'default',
                                                    fromFormat: exportFormat,
                                                    toFormat: convertToFormat,
                                                    data: sourceData,
                                                }),
                                            });
                                            const convertJson = await convertResponse.json();
                                            const convertedData = convertJson?.result?.data?.data || '';
                                            const extension = convertToFormat === 'csv' ? 'csv' : convertToFormat === 'jsonl' ? 'jsonl' : 'json';
                                            const blob = new Blob([convertedData], { type: extension === 'csv' ? 'text/csv' : 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `borg-memory-converted.${extension}`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                            toast.success(`Converted ${exportFormat} → ${convertToFormat}`);
                                        } catch (err: any) {
                                            toast.error(`Conversion failed: ${err.message}`);
                                        } finally {
                                            setConverting(false);
                                        }
                                    }}
                                >
                                    {converting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                    Convert & Download
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-600">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Runtime Observations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-zinc-300">
                            {recentObservationsQuery.isLoading ? (
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading observations…
                                </div>
                            ) : !(recentObservationsQuery.data ?? []).length ? (
                                <p className="text-zinc-500">No runtime observations have been captured yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {(recentObservationsQuery.data as any[]).map((memory, index) => {
                                        const observation = memory.metadata?.structuredObservation;
                                        return (
                                            <div key={memory.id ?? `observation-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                                <div className="mb-1 flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                                                        {observation?.type ?? 'observation'}
                                                    </Badge>
                                                    {observation?.toolName ? (
                                                        <span className="font-mono text-[10px] text-zinc-500">{observation.toolName}</span>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm font-medium text-white">{observation?.title ?? 'Untitled observation'}</p>
                                                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[11px] text-zinc-400">
                                                    {observation?.narrative ?? memory.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-violet-600">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                Captured Prompts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-zinc-300">
                            {recentPromptsQuery.isLoading ? (
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading prompt history…
                                </div>
                            ) : !(recentPromptsQuery.data ?? []).length ? (
                                <p className="text-zinc-500">No prompt captures have been recorded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {(recentPromptsQuery.data as any[]).map((memory, index) => {
                                        const prompt = memory.metadata?.structuredUserPrompt;
                                        return (
                                            <div key={memory.id ?? `prompt-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                                                <div className="mb-1 flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="border-violet-500/30 text-violet-300">
                                                        {prompt?.role ?? 'prompt'}
                                                    </Badge>
                                                    <span className="text-[10px] text-zinc-500">#{prompt?.promptNumber ?? '?'}</span>
                                                </div>
                                                <p className="line-clamp-3 whitespace-pre-wrap break-words text-[11px] text-zinc-300">
                                                    {prompt?.content ?? memory.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Results Area */}
                <Card className="lg:col-span-3 bg-zinc-900 border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={`Search ${memoryType} memories...`}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-pink-500 outline-none transition-all"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                        <ScrollArea className="flex-1">
                            {isLoading ? (
                                <div className="p-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm font-mono uppercase tracking-widest">Accessing Synapses...</p>
                                </div>
                            ) : !results || results.length === 0 ? (
                                <div className="p-20 text-center text-zinc-600">
                                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-medium">Tabula Rasa</p>
                                    <p className="text-sm mt-1">No matching memories found in the {memoryType} tier.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {results.map((memory: any, idx: number) => (
                                        <div key={idx} className="p-4 hover:bg-white/[0.02] transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter border-zinc-700 text-zinc-500">
                                                        {memory.metadata?.type || 'fact'}
                                                    </Badge>
                                                    <span className="text-[10px] font-mono text-zinc-600">
                                                        {new Date(memory.timestamp || Date.now()).toLocaleString()}
                                                    </span>
                                                </div>
                                                <Badge variant="secondary" className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Score: {(memory.score || 1).toFixed(2)}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                {memory.content}
                                            </p>
                                            {memory.metadata?.source && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                                                    <span className="text-zinc-700">SOURCE:</span>
                                                    <span className="truncate max-w-xs">{memory.metadata.source}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 flex flex-col items-end min-w-[100px]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {icon} {label}
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{value}</div>
        </div>
    );
}

function TierButton({ active, onClick, label, description }: { active: boolean, onClick: () => void, label: string, description: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border transition-all ${active
                    ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.05)]'
                    : 'bg-transparent border-transparent text-zinc-500 hover:bg-white/5'
                }`}
        >
            <div className="text-sm font-bold">{label}</div>
            <div className={`text-[10px] mt-0.5 ${active ? 'text-pink-400/60' : 'text-zinc-600'}`}>{description}</div>
        </button>
    );
}
