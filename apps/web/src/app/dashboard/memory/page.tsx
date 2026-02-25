"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ScrollArea } from "@borg/ui";
import { Loader2, Brain, Search, Trash2, Database, History, Zap, Filter, Plus, Save } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

export default function MemoryDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [memoryType, setMemoryType] = useState<'session' | 'working' | 'long_term'>('working');
    const [newFact, setNewFact] = useState('');

    const { data: stats } = trpc.memory.getAgentStats.useQuery(undefined, { refetchInterval: 10000 });
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
            className={`w-full text-left p-3 rounded-lg border transition-all ${
                active 
                ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.05)]' 
                : 'bg-transparent border-transparent text-zinc-500 hover:bg-white/5'
            }`}
        >
            <div className="text-sm font-bold">{label}</div>
            <div className={`text-[10px] mt-0.5 ${active ? 'text-pink-400/60' : 'text-zinc-600'}`}>{description}</div>
        </button>
    );
}
