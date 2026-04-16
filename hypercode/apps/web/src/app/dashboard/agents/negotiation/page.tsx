"use client";

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@hypercode/ui';
import { Handshake, RefreshCw, Clock, User, Zap, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export default function NegotiationPage() {
    const { data: negotiations, isLoading, refetch } = trpc.agent.getNegotiations.useQuery(undefined, {
        refetchInterval: 5000
    });

    return (
        <div className="p-8 space-y-8">
            <PageHeader 
                title="A2A Task Negotiation" 
                description="Live view of agent bidding and resource negotiation cycles."
            />

            <div className="grid gap-6">
                {negotiations && negotiations.length > 0 ? (
                    negotiations.map((neg: any) => (
                        <Card key={neg.id} className="bg-zinc-900 border-zinc-800 border-l-4 border-l-indigo-500">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-zinc-200">{neg.task}</CardTitle>
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">
                                            Requested by: <span className="text-indigo-400 font-mono">{neg.sender}</span>
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {neg.id}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">
                                        Received Bids ({neg.bids.length})
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {neg.bids.map((bid: any, i: number) => (
                                            <div key={i} className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-cyan-400">{bid.agentId}</span>
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 text-[9px] h-4">
                                                        {bid.estimatedLatencyMs}ms
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-zinc-400 line-clamp-2 italic">
                                                    "{bid.reasoning}"
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {bid.capabilities.map((cap: string) => (
                                                        <span key={cap} className="text-[8px] bg-zinc-800 text-zinc-500 px-1 py-0.5 rounded">
                                                            {cap}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {neg.bids.length === 0 && (
                                            <div className="col-span-3 text-center py-4 text-zinc-600 italic text-sm">
                                                Awaiting bids from active agents...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="bg-zinc-900 border-zinc-800 border-dashed">
                        <CardContent className="h-60 flex flex-col items-center justify-center text-zinc-600">
                            <Handshake className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm italic">No active negotiations in progress.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
