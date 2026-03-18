"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@borg/ui";
import { Activity, Zap, Cpu, ArrowDownCircle, Loader2 } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

export function ContextHealthWidget() {
    const utils = trpc.useContext();
    
    // In a real scenario, we'd have a specific query for this. 
    // Using agentMemory.stats as a proxy for context health.
    const { data: stats, isLoading } = trpc.agentMemory.stats.useQuery();
    
    // Mock local LLM detection - in production these would be real tRPC queries
    // testing availability of Ollama/LM Studio endpoints
    const localLlmQuery = { data: { ollama: true, lmstudio: false }, isLoading: false };

    const compactMutation = trpc.agentMemory.handoff.useMutation({
        onSuccess: () => {
            utils.agentMemory.stats.invalidate();
            toast.success('Context compacted and archived to long-term memory');
        },
        onError: (err) => {
            toast.error(`Compaction failed: ${err.message}`);
        }
    });

    const tokenCount = stats?.session ? stats.session * 1200 : 0; // Heuristic
    const maxTokens = 128000;
    const usagePercent = Math.min(Math.round((tokenCount / maxTokens) * 100), 100);

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-400" />
                        Cognitive Health
                    </div>
                    <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500 font-mono">
                        v2.7.333
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Token Usage */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        <span>Active Context window</span>
                        <span>{tokenCount.toLocaleString()} / {maxTokens / 1000}k tokens</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                        <div 
                            className={`h-full transition-all duration-500 ${usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>

                {/* Local LLM Pulse */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-colors ${localLlmQuery.data?.ollama ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-zinc-500">Ollama</span>
                            <div className={`h-1.5 w-1.5 rounded-full ${localLlmQuery.data?.ollama ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Cpu className={`h-3.5 w-3.5 ${localLlmQuery.data?.ollama ? 'text-green-400' : 'text-zinc-600'}`} />
                            <span className={`text-xs font-medium ${localLlmQuery.data?.ollama ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {localLlmQuery.data?.ollama ? 'Ready' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className={`p-3 rounded-lg border flex flex-col gap-1 transition-colors ${localLlmQuery.data?.lmstudio ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-zinc-500">LM Studio</span>
                            <div className={`h-1.5 w-1.5 rounded-full ${localLlmQuery.data?.lmstudio ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className={`h-3.5 w-3.5 ${localLlmQuery.data?.lmstudio ? 'text-green-400' : 'text-zinc-600'}`} />
                            <span className={`text-xs font-medium ${localLlmQuery.data?.lmstudio ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {localLlmQuery.data?.lmstudio ? 'Ready' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Maintenance Actions */}
                <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-2"
                    onClick={() => compactMutation.mutate({ notes: 'Manual dashboard cleanup' })}
                    disabled={compactMutation.isPending}
                >
                    {compactMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownCircle className="h-3.5 w-3.5 text-blue-400" />}
                    Compact Context & Prune History
                </Button>
            </CardContent>
        </Card>
    );
}
