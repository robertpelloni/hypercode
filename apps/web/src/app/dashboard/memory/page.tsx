'use client';

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { MemoryGraph } from '@/components/memory/MemoryGraph';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Brain, Database, Share2, Layers, Clock, Archive } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MemoryPage() {
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState('tiers');
    const [factInput, setFactInput] = useState('');

    const { data: stats } = trpc.knowledge.getStats.useQuery();
    const { data: agentStats, refetch: refetchStats } = trpc.memory.getAgentStats.useQuery();
    const { data: searchResults, refetch: refetchSearch } = trpc.memory.searchAgentMemory.useQuery(
        { query: query || " " },
        { enabled: true }
    );

    // Graph data from KnowledgeService (for visualization)
    const { data: graphData } = trpc.knowledge.getGraph.useQuery({ query });

    const addFactMutation = trpc.memory.addFact.useMutation({
        onSuccess: () => {
            setFactInput('');
            refetchStats();
            refetchSearch();
        }
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        refetchSearch();
    };

    const handleAddFact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!factInput.trim()) return;
        addFactMutation.mutate({ content: factInput, type: 'long_term' });
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hippocampus</h1>
                    <p className="text-muted-foreground">The Agent's tiered memory & knowledge graph.</p>
                </div>
                <div className="flex gap-4">
                    <Card className="w-[150px]">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Session (Short)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{agentStats?.sessionCount || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="w-[150px]">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Working (Mid)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{agentStats?.working || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="w-[150px]">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Long Term</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl font-bold">{agentStats?.long_term || 0}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <form onSubmit={handleSearch} className="flex w-full max-w-lg items-center space-x-2">
                    <Input
                        placeholder="Search memories..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button type="submit" size="icon">
                        <Search className="h-4 w-4" />
                    </Button>
                </form>

                <form onSubmit={handleAddFact} className="flex flex-1 items-center space-x-2 ml-4 border-l pl-4 border-zinc-800">
                    <Input
                        placeholder="Inject new fact directly into Long Term Memory..."
                        value={factInput}
                        onChange={(e) => setFactInput(e.target.value)}
                        className="bg-blue-950/20 border-blue-900/50"
                    />
                    <Button type="submit" variant="secondary" disabled={addFactMutation.isPending}>
                        Inject
                    </Button>
                </form>
            </div>

            <Tabs defaultValue="tiers" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="tiers" className="flex gap-2"><Layers className="w-4 h-4" /> Memory Tiers</TabsTrigger>
                    <TabsTrigger value="graph" className="flex gap-2"><Share2 className="w-4 h-4" /> Knowledge Graph</TabsTrigger>
                </TabsList>

                <TabsContent value="tiers" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Session Memory */}
                        <Card className="border-zinc-800 bg-zinc-950/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Session Memory</CardTitle>
                                <CardDescription>Ephemeral context (30 min)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-4">
                                        {searchResults?.filter((m: any) => m.type === 'session').map((m: any) => (
                                            <div key={m.id} className="p-3 rounded bg-zinc-900 border border-zinc-800 text-sm">
                                                <p>{m.content}</p>
                                                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                                                    <span>{(m.score * 100).toFixed(0)}% relevant</span>
                                                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {searchResults?.filter((m: any) => m.type === 'session').length === 0 && (
                                            <p className="text-zinc-500 text-sm italic">No recent session memories match query.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Working Memory */}
                        <Card className="border-zinc-800 bg-zinc-950/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4 text-yellow-400" /> Working Memory</CardTitle>
                                <CardDescription>Task-relevant facts</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-4">
                                        {searchResults?.filter((m: any) => m.type === 'working').map((m: any) => (
                                            <div key={m.id} className="p-3 rounded bg-zinc-900 border border-zinc-800 text-sm">
                                                <p>{m.content}</p>
                                                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                                                    <Badge variant="outline" className="text-[10px]">{m.namespace}</Badge>
                                                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {searchResults?.filter((m: any) => m.type === 'working').length === 0 && (
                                            <p className="text-zinc-500 text-sm italic">No working memories match query.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Long Term Memory */}
                        <Card className="border-zinc-800 bg-zinc-950/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Archive className="w-4 h-4 text-purple-400" /> Long-Term Memory</CardTitle>
                                <CardDescription>Persistent knowledge</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-4">
                                        {searchResults?.filter((m: any) => m.type === 'long_term').map((m: any) => (
                                            <div key={m.id} className="p-3 rounded bg-zinc-900 border border-zinc-800 text-sm">
                                                <p>{m.content}</p>
                                                <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                                                    <Badge variant="outline" className="text-[10px]">{m.namespace}</Badge>
                                                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {searchResults?.filter((m: any) => m.type === 'long_term').length === 0 && (
                                            <p className="text-zinc-500 text-sm italic">No long-term memories match query.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="graph" className="space-y-4">
                    <Card className="h-[600px] overflow-hidden relative border-zinc-800 bg-black/50">
                        <MemoryGraph data={graphData || { nodes: [], edges: [] }} />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
