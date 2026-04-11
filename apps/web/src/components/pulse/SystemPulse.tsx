"use client";

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@borg/ui';
import { Activity, Cpu, HardDrive, AlertTriangle, Clock, Server, MonitorPlay } from 'lucide-react';

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SystemPulse() {
    // Polling System Pulse
    const { data: status, error: statusError } = trpc.pulse.getSystemStatus.useQuery(undefined, { refetchInterval: 5000 });
    const { data: metrics, error: metricsError } = trpc.metrics.systemSnapshot.useQuery(undefined, { refetchInterval: 5000 });
    const { data: logs, error: logsError } = trpc.logs.summary.useQuery({ limit: 1000 }, { refetchInterval: 5000 });
    const { data: events, error: eventsError } = trpc.pulse.getLatestEvents.useQuery({ limit: 50 }, { refetchInterval: 2000 });

    const uptimeStr = metrics
        ? `${Math.floor(metrics.process.uptimeSeconds / 3600)}h ${Math.floor((metrics.process.uptimeSeconds % 3600) / 60)}m`
        : '--';
    const pulseOffline = status?.status === 'offline';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">borg Core Status</CardTitle>
                        {statusError ? (
                            <Badge variant="destructive">Unavailable</Badge>
                        ) : status?.status === 'online' ? (
                            <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Online</Badge>
                        ) : (
                            <Badge variant="destructive">Offline</Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusError ? '—' : ((status as any)?.agents?.length || 0)}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-cyan-500">Active Agents</p>
                        {statusError ? <p className="text-xs text-red-300 mt-2">{statusError.message}</p> : null}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metricsError ? '—' : uptimeStr}</div>
                        <p className="text-xs text-muted-foreground mt-1">PID: {metricsError ? '--' : (metrics?.process?.pid || '--')}</p>
                        {metricsError ? <p className="text-xs text-red-300 mt-2">{metricsError.message}</p> : null}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metricsError ? '—' : metrics ? `${metrics.system.memoryUsagePercent}%` : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {metricsError ? '--' : metrics ? `${formatBytes(metrics.system.usedMemory)} / ${formatBytes(metrics.system.totalMemory)}` : '--'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Node.js Heap</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {metricsError ? '—' : metrics ? formatBytes(metrics.process.heapUsed) : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            of {metricsError ? '--' : metrics ? formatBytes(metrics.process.heapTotal) : '--'} total
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t pt-6 border-zinc-200 dark:border-zinc-800">
                <div className="lg:col-span-2 space-y-4">
                    <Card className="h-[500px] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-500" />
                                Live Event Stream
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono">{eventsError ? '—' : (events?.length || 0)} Events</Badge>
                        </CardHeader>
                        <CardContent className="flex-1 bg-zinc-950 p-4 overflow-y-auto font-mono text-sm space-y-3">
                            {eventsError ? (
                                <div className="italic flex items-center gap-2 h-full justify-center text-rose-300">
                                    <MonitorPlay className="h-4 w-4" /> Event stream unavailable: {eventsError.message}
                                </div>
                            ) : !events || events.length === 0 ? (
                                <div className={`italic flex items-center gap-2 h-full justify-center ${pulseOffline ? 'text-rose-300' : 'text-zinc-500'}`}>
                                    <MonitorPlay className="h-4 w-4" /> {pulseOffline ? 'Pulse runtime offline. Event stream unavailable.' : 'Waiting for events...'}
                                </div>
                            ) : (
                                events.map((event: any, idx: number) => (
                                    <div key={idx} className="flex gap-3 border-l-2 border-zinc-800 pl-3 py-1">
                                        <div className="text-zinc-500 flex-shrink-0 w-20">
                                            {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-blue-400 font-bold mr-2">[{event.type}]</span>
                                            <span className="text-zinc-300">{event.payload?.message || JSON.stringify(event.payload)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="h-[500px] flex flex-col">
                        <CardHeader className="border-b pb-2">
                            <CardTitle className="text-sm font-medium">Top Tools (Last 1k Calls)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0">
                            {logsError ? (
                                <div className="p-8 text-center text-red-300 text-sm">
                                    Tool summary unavailable: {logsError.message}
                                </div>
                            ) : logs?.topTools?.map((tool: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{tool.name}</span>
                                        <span className="text-xs text-muted-foreground">{tool.count} calls</span>
                                    </div>
                                    {tool.errors > 0 ? (
                                        <Badge variant="destructive" className="flex gap-1 items-center">
                                            <AlertTriangle className="h-3 w-3" />
                                            {tool.errors} err
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                            100% OK
                                        </Badge>
                                    )}
                                </div>
                            ))}
                            {!logs?.topTools?.length && (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No tools used yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
