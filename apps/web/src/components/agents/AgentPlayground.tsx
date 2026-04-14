"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, ScrollArea } from '@hypercode/ui';
import { trpc } from '@/utils/trpc';
import { Send, Loader2, Bot, User, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
    role: 'user' | 'agent';
    content: string;
}

export function AgentPlayground() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    const chatMutation = trpc.agent.chat.useMutation({
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: 'agent', content: data.response }]);
            if (data.degraded) {
                toast.warning("LLM service responded in degraded mode.");
            }
        },
        onError: (err) => {
            setMessages(prev => [...prev, { role: 'agent', content: `[Error] ${err.message}` }]);
            toast.error("Agent chat failed");
        }
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        chatMutation.mutate({ message: userMsg });
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800 flex flex-col h-[600px] shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4 bg-black/20 shrink-0">
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Agent Playground
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
                <ScrollArea className="flex-1 p-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 p-12 mt-12">
                            <Bot className="h-12 w-12 opacity-20" />
                            <p className="text-sm text-center">
                                Direct connection established. Enter a message to test the default Agent LLM.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-4">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'agent' && (
                                        <div className="h-8 w-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-zinc-950 border border-zinc-800 text-zinc-300'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="h-8 w-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                                            <User className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {chatMutation.isPending && (
                                <div className="flex gap-3 justify-start">
                                    <div className="h-8 w-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 flex items-center">
                                        <span className="flex gap-1">
                                            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce"></span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 bg-black/20 border-t border-white/5 shrink-0">
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Send a message to the agent orchestrator..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-12 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            disabled={chatMutation.isPending}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={chatMutation.isPending || !input.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"
                        >
                            <Send className="h-4 w-4 ml-0.5" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
