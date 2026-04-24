"use client";

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Textarea, Label } from '@hypercode/ui';
import { Send, Terminal, User, Zap } from 'lucide-react';
import { toast } from 'sonner';

const MESSAGE_TYPES = [
    { value: 'TASK_REQUEST', label: 'Task Request' },
    { value: 'STATE_UPDATE', label: 'State Update' },
    { value: 'CONSENSUS_VOTE', label: 'Consensus Vote' },
    { value: 'HANDOFF', label: 'Handoff' },
    { value: 'CRITIQUE', label: 'Critique' },
];

export function A2AMessageComposer() {
    const [recipient, setRecipient] = useState('BROADCAST');
    const [type, setType] = useState('TASK_REQUEST');
    const [payload, setPayload] = useState('');
    
    const { data: agents } = trpc.agent.listA2AAgents.useQuery(undefined, { refetchInterval: 5000 });
    const broadcastMutation = trpc.agent.a2aBroadcast.useMutation({
        onSuccess: () => {
            toast.success("A2A Message Broadcasted");
            setPayload('');
        },
        onError: (err) => {
            toast.error(`Broadcast failed: ${err.message}`);
        }
    });

    const handleSend = () => {
        let parsedPayload = payload;
        try {
            if (payload.trim().startsWith('{') || payload.trim().startsWith('[')) {
                parsedPayload = JSON.parse(payload);
            }
        } catch (e) {
            // Keep as string if not valid JSON
        }

        broadcastMutation.mutate({
            type,
            payload: {
                target: recipient === 'BROADCAST' ? undefined : recipient,
                content: parsedPayload
            }
        });
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Compose A2A Signal
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-zinc-500">Recipient</Label>
                        <Select value={recipient} onValueChange={setRecipient}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                                <SelectValue placeholder="Broadcast" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="BROADCAST">Broadcast (All)</SelectItem>
                                {agents?.map((agent: string) => (
                                    <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-zinc-500">Signal Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                {MESSAGE_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Payload (Text or JSON)</Label>
                    <Textarea 
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        placeholder='{"task": "summarize", "priority": 1}'
                        className="bg-zinc-950 border-zinc-800 text-sm min-h-[100px] font-mono"
                    />
                </div>

                <Button 
                    onClick={handleSend}
                    disabled={broadcastMutation.isPending || !payload.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                    <Send className="h-4 w-4" />
                    Dispatch Signal
                </Button>
            </CardContent>
        </Card>
    );
}
