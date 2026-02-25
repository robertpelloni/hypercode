"use client";

import { Card, CardContent } from "@borg/ui";
import { Button } from "@borg/ui";
import { Activity, Server, Cpu, HardDrive, Network, Globe, Radio } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import type { ComponentType } from 'react';

export default function SystemStatusDashboard() {
    const { data: status, refetch } = trpc.mcp.getStatus.useQuery();
    const { data: browserStatus, refetch: refetchBrowser } = trpc.browser.status.useQuery(undefined, { refetchInterval: 5000 });

    const closeAllPages = trpc.browser.closeAll.useMutation({
        onSuccess: () => {
            toast.success('Closed all browser pages.');
            void refetchBrowser();
        },
        onError: (err) => toast.error(`Failed to close pages: ${err.message}`),
    });

    const handleRefresh = () => {
        void refetch();
        void refetchBrowser();
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">System Status</h1>
                    <p className="text-zinc-500">
                        Infrastructure health and resource usage
                    </p>
                </div>
                <Button onClick={handleRefresh} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                    <Activity className="mr-2 h-4 w-4" /> Refresh Status
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatusCard
                    title="MCP Server"
                    status={status?.initialized ? 'Healthy' : 'Initializing'}
                    icon={Server}
                    color={status?.initialized ? 'text-green-500' : 'text-yellow-500'}
                />
                <StatusCard
                    title="Database"
                    status="Connected"
                    icon={HardDrive}
                    color="text-green-500"
                    detail="PostgreSQL 15.4"
                />
                <StatusCard
                    title="Redis Cache"
                    status="Connected"
                    icon={Cpu}
                    color="text-green-500"
                    detail="241 keys"
                />
                <StatusCard
                    title="Network"
                    status="Active"
                    icon={Network}
                    color="text-blue-500"
                    detail="Port 3000 / 3001"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-white">Browser Runtime</h3>
                                <p className="text-xs text-zinc-500 mt-1">Live status from `browserRouter`</p>
                            </div>
                            <Globe className="h-5 w-5 text-cyan-400" />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                                <div className="text-zinc-500 text-xs">Available</div>
                                <div className="text-white font-semibold">{browserStatus?.available ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                                <div className="text-zinc-500 text-xs">Active</div>
                                <div className="text-white font-semibold">{browserStatus?.active ? 'Yes' : 'No'}</div>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
                                <div className="text-zinc-500 text-xs">Pages</div>
                                <div className="text-white font-semibold">{browserStatus?.pageCount ?? 0}</div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={() => closeAllPages.mutate()}
                                disabled={!browserStatus?.available || closeAllPages.isPending}
                                variant="outline"
                                className="border-zinc-700 hover:bg-zinc-800"
                            >
                                Close All Pages
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Component Health</h3>
                        <div className="space-y-4">
                            <HealthRow name="Core API" status="Operational" latency="12ms" />
                            <HealthRow name="MCP Aggregator" status="Operational" latency="4ms" />
                            <HealthRow name="Browser Runtime" status={browserStatus?.available ? 'Operational' : 'Unavailable'} latency="-" />
                            <HealthRow name="Vector Store" status="Operational" latency="45ms" />
                            <HealthRow name="Task Queue" status="Idle" latency="-" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-medium text-white mb-4">Environment</h3>
                        <div className="space-y-2 font-mono text-sm text-zinc-400">
                            <div className="flex justify-between border-b border-zinc-800 pb-2">
                                <span>NODE_ENV</span>
                                <span className="text-white">development</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-800 pb-2 pt-2">
                                <span>PLATFORM</span>
                                <span className="text-white">win32</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-800 pb-2 pt-2">
                                <span>UPTIME</span>
                                <span className="text-white">4d 2h 15m</span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span>VERSION</span>
                                <span className="text-blue-400">v0.5.0-beta</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatusCard({ title, status, icon: Icon, color, detail }: { title: string; status: string; icon: ComponentType<{ className?: string }>; color: string; detail?: string }) {
    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-400 font-medium">{title}</span>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{status}</div>
                {detail && <div className="text-xs text-zinc-500">{detail}</div>}
            </CardContent>
        </Card>
    );
}

function HealthRow({ name, status, latency }: { name: string; status: string; latency: string }) {
    const isHealthy = status === 'Operational' || status === 'Healthy' || status === 'Active';
    return (
        <div className="flex items-center justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
            <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`} />
                <span className="text-zinc-200 font-medium">{name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-500">{latency}</span>
                <span className={isHealthy ? 'text-green-400' : 'text-yellow-400'}>{status}</span>
            </div>
        </div>
    );
}
