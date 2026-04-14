"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, resolveCoreWsUrl } from "@hypercode/ui";
import { Zap, Activity, Shield, Brain, MessageSquare, AlertTriangle, FileText } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

interface PulseEvent {
    type: string;
    source: string;
    timestamp: number;
    payload: any;
}

export function NeuralPulse() {
    const [events, setEvents] = useState<PulseEvent[]>([]);
    const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Connect to HyperCode WebSocket for live NEURAL_PULSE feed
        const ws = new WebSocket(resolveCoreWsUrl(process.env.NEXT_PUBLIC_CORE_WS_URL));

        ws.onopen = () => {
            setConnectionState('connected');
        };

        ws.onclose = () => {
            setConnectionState('disconnected');
        };

        ws.onerror = () => {
            setConnectionState('disconnected');
        };

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data);
                if (data.type === 'NEURAL_PULSE') {
                    setEvents(prev => [data.payload, ...prev].slice(0, 50));
                }
            } catch (e) {
                // Ignore non-json
            }
        };

        return () => ws.close();
    }, []);

    const getIcon = (type: string) => {
        if (type.startsWith('agent:')) return <Brain className="h-3 w-3 text-purple-400" />;
        if (type.startsWith('tool:')) return <Wrench className="h-3 w-3 text-blue-400" />;
        if (type.startsWith('memory:')) return <Brain className="h-3 w-3 text-green-400" />;
        if (type.startsWith('terminal:')) return <AlertTriangle className="h-3 w-3 text-red-400" />;
        if (type.startsWith('file:')) return <FileText className="h-3 w-3 text-zinc-400" />;
        return <Activity className="h-3 w-3 text-zinc-500" />;
    };

    const formatPayload = (payload: any) => {
        if (typeof payload === 'string') return payload;
        if (payload?.tool) return `Tool: ${payload.tool}`;
        if (payload?.error) return `Error: ${payload.error}`;
        if (payload?.text) return payload.text.substring(0, 60) + '...';
        return JSON.stringify(payload).substring(0, 60) + '...';
    };

    return (
        <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden h-[400px] flex flex-col">
            <CardHeader className="py-3 bg-zinc-900/50 border-b border-zinc-800">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Neural Pulse (Live Activity)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-hide" ref={scrollRef}>
                <div className="divide-y divide-zinc-900">
                    <AnimatePresence initial={false}>
                        {events.length === 0 ? (
                            <div className="p-12 text-center text-zinc-600 italic text-xs">
                                {connectionState === 'connected'
                                    ? 'Waiting for cognitive activity...'
                                    : connectionState === 'connecting'
                                        ? 'Connecting to neural pulse feed...'
                                        : 'Neural pulse feed unavailable.'}
                            </div>
                        ) : (
                            events.map((event, i) => (
                                <motion.div 
                                    key={event.timestamp + i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 hover:bg-zinc-900/50 transition-colors flex items-start gap-3 group"
                                >
                                    <div className="mt-0.5">{getIcon(event.type)}</div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                {event.type}
                                            </span>
                                            <span className="text-[9px] text-zinc-700 font-mono">
                                                {new Date(event.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed truncate max-w-[300px]">
                                            {formatPayload(event.payload)}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper icons
function Wrench(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}
