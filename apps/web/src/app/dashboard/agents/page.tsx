"use client";

import { Activity, Brain, Database, Network, Terminal } from 'lucide-react';
import { PageStatusBanner } from '@/components/PageStatusBanner';
import { AgentPlayground } from '@/components/agents/AgentPlayground';
import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@hypercode/ui';
import Link from 'next/link';
import { normalizeAgentsDashboardStatus } from './agents-page-normalizers';

export default function AgentsDashboard() {
    const { data: status } = trpc.pulse.getSystemStatus.useQuery(undefined, { refetchInterval: 5000 });
    const normalizedStatus = normalizeAgentsDashboardStatus(status);
    const agents = normalizedStatus.agents;

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <PageStatusBanner status="experimental" message="Agent Command Center" note="Live agent pool, memory access, and AgentPlayground are wired. Full orchestration controls and harness configuration UI are a later release slice." />
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Terminal className="h-8 w-8 text-indigo-500" />
                        Agent Command Center
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Direct interface to the HyperCode LLM orchestration layer and active agent pool
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link href="/dashboard/memory">
                        <Button variant="outline" className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10">
                            <Database className="h-4 w-4 mr-2" />
                            Memory Bank
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Active Agent Pool
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {agents.length > 0 ? (
                                agents.map((agent: string) => (
                                    <div key={agent} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <Brain className="h-4 w-4 text-cyan-500" />
                                            <span className="font-mono text-sm text-zinc-300">{agent}</span>
                                        </div>
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">Active</Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-zinc-500 italic p-4 text-center border border-dashed border-zinc-800 rounded-lg">
                                    No agents currently active in memory
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800 flex-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Network className="h-4 w-4" />
                                Omni-Router Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-zinc-400">Memory System</span>
                                    {normalizedStatus.memoryInitialized ? (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">Connected</Badge>
                                    ) : (
                                        <Badge variant="destructive">Disconnected</Badge>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-zinc-400">Aggregator Uptime</span>
                                    <span className="font-mono text-sm text-cyan-400">{Math.floor(normalizedStatus.uptimeSeconds / 60)}m</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 flex flex-col">
                    <AgentPlayground />
                </div>
            </div>
        </div>
    );
}
