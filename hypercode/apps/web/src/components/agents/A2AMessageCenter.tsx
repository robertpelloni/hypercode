"use client";

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, ScrollArea } from '@hypercode/ui';
import { MessageSquare, Users, Send, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';

export function A2AMessageCenter() {
    const { data: agents, refetch: refetchAgents } = trpc.agent.listA2AAgents.useQuery(undefined, { refetchInterval: 5000 });
    const { data: messages, refetch: refetchMessages } = trpc.agent.getA2AMessages.useQuery(undefined, { refetchInterval: 2000 });

    const broadcastMutation = trpc.agent.a2aBroadcast.useMutation();

    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleBroadcast = async () => {
        setIsBroadcasting(true);
        try {
            await broadcastMutation.mutateAsync({
                type: 'PING',
                payload: { message: 'Hello from Dashboard' }
            });
        } finally {
            setIsBroadcasting(false);
        }
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    A2A Message Broker
                </CardTitle>
                <div className="flex gap-2">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 gap-1">
                        <Users className="h-3 w-3" />
                        {agents?.length || 0} Agents
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                <ScrollArea className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 p-4">
                    <div className="space-y-4">
                        {messages && messages.length > 0 ? (
                            messages.map((msg: any) => (
                                <div key={msg.id} className="flex flex-col gap-1 border-l-2 border-indigo-500 pl-3 py-1 bg-white/5 rounded-r-md">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">{msg.sender} → {msg.recipient || 'BROADCAST'}</span>
                                        <span className="text-[10px] text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-zinc-800">{msg.type}</Badge>
                                        <span className="text-sm text-zinc-300 line-clamp-2">
                                            {msg.type === 'STATE_UPDATE' && msg.payload?.capabilities 
                                                ? `CAPABILITIES: ${msg.payload.capabilities.join(', ')}`
                                                : typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12">
                                <Zap className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-xs italic">No A2A messages in history</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="flex gap-2 shrink-0">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-zinc-800 bg-zinc-950 text-xs gap-2"
                        onClick={() => refetchMessages()}
                    >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                    </Button>
                    <Button 
                        size="sm" 
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs gap-2"
                        disabled={isBroadcasting}
                        onClick={handleBroadcast}
                    >
                        <Send className="h-3 w-3" />
                        Test Broadcast
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
