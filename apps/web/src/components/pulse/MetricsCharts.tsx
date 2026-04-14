"use client";

import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent } from '@hypercode/ui';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export function MetricsCharts() {
    const { data: timeline, error } = trpc.metrics.getTimeline.useQuery({ windowMs: 1800000, buckets: 30 }, { refetchInterval: 10000 });
    const timelineUnavailable = Boolean(error)
        || (timeline !== undefined && (!timeline || typeof timeline !== 'object' || !Array.isArray((timeline as { series?: unknown }).series)));

    const series = !timelineUnavailable ? (timeline?.series || []) : [];

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">System Telemetry Volume (Last 30 Min)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    {series.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.5} />
                                <XAxis
                                    dataKey="time"
                                    tickFormatter={formatTime}
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#e4e4e7' }}
                                    labelFormatter={(label) => formatTime(label as number)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    name="Trace Volume"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : timelineUnavailable ? (
                        <div className="flex items-center justify-center h-full text-rose-300 text-sm text-center px-4">
                            Metrics timeline unavailable. {error?.message ?? 'Metrics timeline returned an invalid payload.'}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm italic">
                            Awaiting telemetry points...
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
