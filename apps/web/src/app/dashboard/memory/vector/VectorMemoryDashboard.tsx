"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ScrollArea } from "@hypercode/ui";
import { Loader2, Search, Trash2, Database, Network, Plus, Server, Code } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type VectorMemoryResult = {
    id?: string;
    timestamp?: string | number;
    score?: number;
    content?: string;
};

function isVectorMemoryResult(value: unknown): value is VectorMemoryResult {
    return typeof value === 'object' && value !== null;
}

export default function VectorMemoryDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [newVectorText, setNewVectorText] = useState('');

    const { data: results, isLoading, refetch, error } = trpc.memory.searchAgentMemory.useQuery({
        query: searchQuery,
        type: 'long_term',
        limit: 50
    }, { enabled: true });

    const addFactMutation = trpc.memory.addFact.useMutation({
        onSuccess: () => {
            toast.success("Memory vector added successfully.");
            setNewVectorText('');
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to push vector: ${err.message}`);
        }
    });
    const resultsUnavailable = Boolean(error) || (results !== undefined && (!Array.isArray(results) || !results.every(isVectorMemoryResult)));
    const safeResults = !resultsUnavailable && Array.isArray(results) ? results : [];

    const handleInject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVectorText.trim()) return;
        addFactMutation.mutate({ content: newVectorText, type: 'long_term' });
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col bg-black text-white">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-emerald-400 flex items-center gap-3">
                        <Network className="h-8 w-8 text-emerald-500" />
                        Vector Memory Explorer
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Direct low-level manipulation of the HyperCode long-term vector memory index and persistent context records.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 border border-emerald-500/30">
                        <Server className="w-3.5 h-3.5 mr-2" />
                        ChromaDB Active
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-600">
                        <CardHeader className="pb-3 border-b border-zinc-800/50">
                            <CardTitle className="text-sm font-bold text-zinc-100 uppercase tracking-wide flex items-center gap-2">
                                <Code className="h-4 w-4 text-emerald-500" />
                                Vector Injection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Insert raw string representations directly into the high-dimensional vector index. These facts will be natively retrieved by all core AI nodes.
                            </p>
                            <form onSubmit={handleInject} className="space-y-3">
                                <textarea
                                    value={newVectorText}
                                    onChange={e => setNewVectorText(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-md p-3 text-sm text-emerald-50 h-32 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none font-mono"
                                    placeholder="Enter structural memory or context payload here..."
                                />
                                <Button
                                    type="submit"
                                    disabled={addFactMutation.isPending || !newVectorText.trim()}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                                >
                                    {addFactMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Inject Vector String
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-3 border-b border-zinc-800/50">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                DB Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Total Vectors</span>
                                    <span className="text-zinc-200 font-mono">{resultsUnavailable ? '—' : safeResults.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Dimensions</span>
                                    <span className="text-zinc-200 font-mono">1536</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Collections</span>
                                    <span className="text-zinc-200 font-mono">1</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="lg:col-span-3 bg-zinc-900 border-zinc-800 flex flex-col shadow-2xl overflow-hidden">
                    <CardHeader className="border-b border-zinc-800 bg-black/40 pb-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600/50 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Semantic search across embedded vectors..."
                                className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-emerald-50 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-black/20">
                        <ScrollArea className="flex-1">
                            {isLoading ? (
                                <div className="p-16 flex flex-col items-center justify-center text-emerald-500/60 gap-4">
                                    <Loader2 className="h-10 w-10 animate-spin" />
                                    <p className="text-sm font-mono tracking-widest uppercase">Querying ChromaDB Clusters...</p>
                                </div>
                            ) : resultsUnavailable ? (
                                <div className="p-24 text-center text-rose-300">
                                    <Network className="h-16 w-16 mx-auto mb-6 opacity-40" />
                                    <p className="text-xl font-medium">Vector memory unavailable</p>
                                    <p className="text-sm mt-2 text-rose-200">{error?.message ?? 'Vector memory returned an invalid payload.'}</p>
                                </div>
                            ) : safeResults.length === 0 ? (
                                <div className="p-24 text-center text-zinc-600">
                                    <Network className="h-16 w-16 mx-auto mb-6 opacity-20" />
                                    <p className="text-xl font-medium text-zinc-400">Empty Vector Space</p>
                                    <p className="text-sm mt-2 text-zinc-500">No semantic matches found for the current query.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-800/50">
                                    {safeResults.map((memory: any, idx: number) => (
                                        <div key={idx} className="p-5 hover:bg-zinc-800/30 transition-colors group flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                                                        VEC-{memory.id?.substring(0, 8) || String(idx).padStart(8, '0')}
                                                    </Badge>
                                                    <span className="text-[11px] font-mono text-zinc-500">
                                                        {new Date(memory.timestamp || Date.now()).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 transition-colors font-mono text-[10px]">
                                                        Score: {typeof memory.score === 'number' ? memory.score.toFixed(4) : '—'}
                                                    </Badge>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all text-zinc-500" disabled title="Delete action not implemented yet">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="bg-black/50 border border-zinc-800/50 rounded-md p-3">
                                                <p className="text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                    {memory.content}
                                                </p>
                                            </div>
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
