"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, ScrollArea } from "@hypercode/ui";
import { Loader2, Zap, Search, Code, Terminal, Bot, Activity, Brain, Globe, FlaskConical } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

export default function ExpertAgentsDashboard() {
    const { data: status, isLoading, error: statusError, refetch } = trpc.expert.getStatus.useQuery(undefined, { refetchInterval: 5000 });
    
    const [researchQuery, setResearchQuery] = useState('');
    const [researchDepth, setResearchQueryDepth] = useState(2);
    
    const [codeTask, setCodeTask] = useState('');

    const researchMutation = trpc.expert.research.useMutation({
        onSuccess: (data) => {
            toast.success("Research completed");
            console.log("Research Result:", data);
        },
        onError: (err) => {
            toast.error(`Research failed: ${err.message}`);
        }
    });

    const codeMutation = trpc.expert.code.useMutation({
        onSuccess: (data) => {
            toast.success("Coding task completed");
            console.log("Code Result:", data);
        },
        onError: (err) => {
            toast.error(`Coding failed: ${err.message}`);
        }
    });

    const handleResearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!researchQuery.trim()) return;
        researchMutation.mutate({ query: researchQuery, depth: researchDepth });
    };

    const handleCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeTask.trim()) return;
        codeMutation.mutate({ task: codeTask });
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Bot className="h-8 w-8 text-indigo-500" />
                        Specialist Agent Squad
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Deploy dedicated agents for deep technical research and autonomous implementation
                    </p>
                </div>
                <div className="flex gap-4">
                    <AgentStatusCard name="Researcher" status={status?.researcher} unavailable={Boolean(statusError)} icon={<FlaskConical className="h-4 w-4" />} />
                    <AgentStatusCard name="Coder" status={status?.coder} unavailable={Boolean(statusError)} icon={<Code className="h-4 w-4" />} />
                </div>
            </div>

            {statusError ? (
                <Card className="border border-red-900/30 bg-red-950/10">
                    <CardContent className="p-4 text-sm text-red-200">
                        {statusError.message}
                    </CardContent>
                </Card>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Researcher Panel */}
                <Card className="bg-zinc-900 border-zinc-800 border-t-4 border-t-cyan-500 flex flex-col shadow-2xl">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Deep Scholar
                                </CardTitle>
                                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">RESEARCH AGENT</p>
                            </div>
                            <Badge
                                variant={statusError ? 'destructive' : status?.researcher === 'active' ? 'default' : 'secondary'}
                                className={statusError ? '' : status?.researcher === 'active' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : ''}
                            >
                                {statusError ? 'UNAVAILABLE' : status?.researcher === 'active' ? 'READY' : 'OFFLINE'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6">
                        <form onSubmit={handleResearch} className="space-y-4 bg-black/20 p-4 rounded-lg border border-white/5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Research Query</label>
                                <textarea
                                    value={researchQuery}
                                    onChange={e => setResearchQuery(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-white h-24 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
                                    placeholder="e.g. Compare the performance of Pydantic-AI vs CrewAI for multi-agent workflows..."
                                    disabled={Boolean(statusError) || status?.researcher !== 'active' || researchMutation.isPending}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Depth:</label>
                                    <input 
                                        type="number" 
                                        min="1" max="5" 
                                        value={researchDepth} 
                                        onChange={e => setResearchQueryDepth(parseInt(e.target.value))}
                                        className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 w-12"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={Boolean(statusError) || status?.researcher !== 'active' || researchMutation.isPending || !researchQuery.trim()} 
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                                >
                                    {researchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Dispatch Scholar
                                </Button>
                            </div>
                        </form>

                        <div className="flex-1 border border-zinc-800 bg-zinc-950 rounded-lg p-4 font-mono text-[11px] text-zinc-500 overflow-hidden">
                            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                                <span className="text-zinc-600 font-bold uppercase">Activity Log</span>
                                <Activity className="h-3 w-3 text-zinc-700" />
                            </div>
                            <ScrollArea className="h-40">
                                {researchMutation.isPending ? (
                                    <div className="space-y-2">
                                        <p className="text-cyan-500 animate-pulse"> SCHOLAR DISPATCHED...</p>
                                        <p className="text-zinc-600"> [SYSTEM] Initializing recursive search...</p>
                                        <p className="text-zinc-600"> [SYSTEM] Scraping documentation...</p>
                                    </div>
                                ) : researchMutation.data ? (
                                    <div className="text-zinc-400">
                                        <p className="text-green-500 mb-2">RESEARCH COMPLETE</p>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(researchMutation.data, null, 2)}</pre>
                                    </div>
                                ) : (
                                    <p className="text-zinc-800 italic">// Awaiting scholarship...</p>
                                )}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>

                {/* Coder Panel */}
                <Card className="bg-zinc-900 border-zinc-800 border-t-4 border-t-amber-500 flex flex-col shadow-2xl">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-bold text-amber-400 flex items-center gap-2">
                                    <Terminal className="h-5 w-5" />
                                    Forge Master
                                </CardTitle>
                                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">IMPLEMENTATION AGENT</p>
                            </div>
                            <Badge
                                variant={statusError ? 'destructive' : status?.coder === 'active' ? 'default' : 'secondary'}
                                className={statusError ? '' : status?.coder === 'active' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : ''}
                            >
                                {statusError ? 'UNAVAILABLE' : status?.coder === 'active' ? 'READY' : 'OFFLINE'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col space-y-6">
                        <form onSubmit={handleCode} className="space-y-4 bg-black/20 p-4 rounded-lg border border-white/5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Implementation Task</label>
                                <textarea
                                    value={codeTask}
                                    onChange={e => setCodeTask(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-white h-24 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                                    placeholder="e.g. Implement a new tRPC route for system metrics..."
                                    disabled={Boolean(statusError) || status?.coder !== 'active' || codeMutation.isPending}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={Boolean(statusError) || status?.coder !== 'active' || codeMutation.isPending || !codeTask.trim()} 
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
                                >
                                    {codeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Dispatch Architect
                                </Button>
                            </div>
                        </form>

                        <div className="flex-1 border border-zinc-800 bg-zinc-950 rounded-lg p-4 font-mono text-[11px] text-zinc-500 overflow-hidden">
                            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2">
                                <span className="text-zinc-600 font-bold uppercase">Forge Status</span>
                                <Brain className="h-3 w-3 text-zinc-700" />
                            </div>
                            <ScrollArea className="h-40">
                                {codeMutation.isPending ? (
                                    <div className="space-y-2">
                                        <p className="text-amber-500 animate-pulse"> FORGE HEATING UP...</p>
                                        <p className="text-zinc-600"> [SYSTEM] Analyzing task architecture...</p>
                                        <p className="text-zinc-600"> [SYSTEM] Drafting implementation plan...</p>
                                    </div>
                                ) : codeMutation.data ? (
                                    <div className="text-zinc-400">
                                        <p className="text-green-500 mb-2">FORGE COOLED — TASK COMPLETE</p>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(codeMutation.data, null, 2)}</pre>
                                    </div>
                                ) : (
                                    <p className="text-zinc-800 italic">// Awaiting the forge...</p>
                                )}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AgentStatusCard({ name, status, unavailable = false, icon }: { name: string, status?: string, unavailable?: boolean, icon: React.ReactNode }) {
    const isActive = status === 'active';
    return (
        <div className={`flex items-center gap-3 bg-zinc-900 border px-4 py-2 rounded-lg ${unavailable ? 'border-red-900/40' : 'border-zinc-800'} ${isActive && !unavailable ? 'ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : ''}`}>
            <div className={`h-8 w-8 rounded flex items-center justify-center ${unavailable ? 'bg-red-950/30 text-red-300 border border-red-900/40' : isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                {isActive && !unavailable ? <Activity className="h-4 w-4" /> : icon}
            </div>
            <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{name}</div>
                <div className={`text-xs font-medium ${unavailable ? 'text-red-300' : isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {unavailable ? 'UNAVAILABLE' : isActive ? 'ACTIVE' : 'OFFLINE'}
                </div>
            </div>
        </div>
    );
}
