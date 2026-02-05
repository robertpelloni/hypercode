"use client";

import { useEffect, useState, useRef } from 'react';
import { trpc } from '@/utils/trpc';

interface Packet {
    id: string;
    type: 'TOOL_CALL_START' | 'TOOL_CALL_END' | 'LOG';
    tool?: string;
    args?: any;
    result?: string;
    duration?: number;
    success?: boolean;
    timestamp: number;
}

export function TrafficInspector() {
    const [packets, setPackets] = useState<Packet[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            // Connect to Borg Core Bridge
            const ws = new WebSocket('ws://localhost:3001');

            ws.onopen = () => {
                setIsConnected(true);
                // console.log("Inspector connected");
            };

            ws.onclose = () => {
                setIsConnected(false);
                setTimeout(connect, 3000); // Reconnect
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Filter for interesting events
                    if (msg.type === 'TOOL_CALL_START' || msg.type === 'TOOL_CALL_END') {
                        addPacket({
                            ...msg,
                            timestamp: Date.now()
                        });
                    }
                } catch (e) { }
            };

            wsRef.current = ws;
        };

        connect();

        // Load History
        const fetchHistory = async () => {
            // @ts-ignore
            const history = await utils.client.audit.query.query({ limit: 50 });
            const historicalPackets: Packet[] = history.map((entry: any) => {
                if (entry.event === 'TOOL_START') {
                    return {
                        id: entry.metadata?.id || Math.random().toString(36),
                        type: 'TOOL_CALL_START',
                        tool: entry.details?.tool,
                        args: entry.details?.args,
                        timestamp: new Date(entry.timestamp).getTime()
                    };
                }
                if (entry.event === 'TOOL_END') {
                    return {
                        id: entry.metadata?.id || Math.random().toString(36),
                        type: 'TOOL_CALL_END',
                        result: JSON.stringify(entry.details?.result),
                        success: entry.metadata?.success,
                        duration: entry.metadata?.duration,
                        timestamp: new Date(entry.timestamp).getTime()
                    };
                }
                return null;
            }).filter(Boolean) as Packet[];

            setPackets(prev => [...historicalPackets, ...prev]);
        };
        fetchHistory();

        return () => {
            wsRef.current?.close();
        };
    }, []);

    const addPacket = (packet: Packet) => {
        setPackets(prev => {
            // Avoid duplicates
            if (prev.some(p => p.id === packet.id && p.type === packet.type)) return prev;
            const newPackets = [packet, ...prev].slice(0, 50);
            return newPackets;
        });
    };

    // Replay Logic
    const utils = trpc.useContext();
    const handleReplay = async () => {
        try {
            const result = await utils.client.logs.read.query({ lines: 100 });
            // Parse heuristic logs
            // Log format: [Director] Executing: toolName
            const lines = result.split('\n');
            lines.forEach(line => {
                const match = line.match(/\[Director\] Executing: (\w+)/);
                if (match) {
                    addPacket({
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'TOOL_CALL_START',
                        tool: match[1],
                        args: { _replayed: true, raw: line },
                        timestamp: Date.now() // Approximation
                    });
                }
            });
        } catch (e) {
            console.error("Replay fail", e);
        }
    };

    return (
        <div className="bg-black/80 rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <h2 className="font-mono font-bold text-zinc-300">NETWORK TRAFFIC (MCP)</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReplay}
                        className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded"
                    >
                        REPLAY LOGS
                    </button>
                    <button
                        onClick={() => setPackets([])}
                        className="text-xs text-zinc-500 hover:text-white"
                    >
                        CLEAR
                    </button>
                </div>
            </div>

            {/* Packet Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
                {packets.length === 0 && (
                    <div className="text-zinc-600 text-center mt-20">Waiting for traffic...</div>
                )}
                {packets.map((p, i) => (
                    <PacketRow key={`${p.id}-${p.type}-${i}`} packet={p} />
                ))}
            </div>
        </div>
    );
}

function PacketRow({ packet }: { packet: Packet }) {
    const isStart = packet.type === 'TOOL_CALL_START';

    // Color coding
    const borderColor = isStart ? 'border-blue-900/30' : (packet.success ? 'border-green-900/30' : 'border-red-900/30');
    const bgColor = isStart ? 'bg-blue-900/10' : (packet.success ? 'bg-green-900/10' : 'bg-red-900/10');
    const icon = isStart ? '→' : (packet.success ? '✓' : '✗');
    const iconColor = isStart ? 'text-blue-400' : (packet.success ? 'text-green-400' : 'text-red-400');

    return (
        <div className={`p-3 rounded border ${borderColor} ${bgColor} transition-all hover:bg-zinc-800/50`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <span className={`font-bold ${iconColor}`}>{icon}</span>
                    <span className="text-zinc-300 font-bold">{packet.tool}</span>
                    <span className="text-xs text-zinc-600">#{packet.id.substring(0, 4)}</span>
                </div>
                <span className="text-xs text-zinc-600">
                    {new Date(packet.timestamp).toLocaleTimeString().split(' ')[0]}
                </span>
            </div>

            {/* Details */}
            <div className="mt-2 pl-6">
                {isStart ? (
                    <div className="text-zinc-400 break-all text-xs">
                        Args: <span className="text-blue-300/80">{JSON.stringify(packet.args).substring(0, 200)}</span>
                    </div>
                ) : (
                    <div className="text-zinc-400 break-all text-xs">
                        Result: <span className="text-zinc-500">{packet.result}</span>
                        <div className="mt-1 text-zinc-600">
                            Duration: {packet.duration}ms
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
