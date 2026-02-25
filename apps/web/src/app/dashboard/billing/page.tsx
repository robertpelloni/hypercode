"use client";

import React, { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@borg/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Loader2, DollarSign, Activity, Settings, Key, Zap, AlertCircle, Database, Shield } from 'lucide-react';

export default function ProviderAuthBillingMatrix() {
    const [historyDays, setHistoryDays] = useState(30);

    const { data: status, isLoading: isStatusLoading } = trpc.billing.getStatus.useQuery();
    const { data: quotas, isLoading: isQuotasLoading } = trpc.billing.getProviderQuotas.useQuery();
    const { data: costHistory, isLoading: isHistoryLoading } = trpc.billing.getCostHistory.useQuery({ days: historyDays });
    const { data: pricing, isLoading: isPricingLoading } = trpc.billing.getModelPricing.useQuery();
    const { data: fallback, isLoading: isFallbackLoading } = trpc.billing.getFallbackChain.useQuery();

    const renderCostChart = () => {
        if (isHistoryLoading) return <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>;
        if (!costHistory?.history || costHistory.history.length === 0) return <div className="h-48 flex items-center justify-center text-zinc-500">No cost history data.</div>;

        return (
            <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={costHistory.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#ffffff50" fontSize={10} tickFormatter={(val) => `$${val}`} />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Estimated Cost']}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Database className="h-8 w-8 text-emerald-500" />
                        Provider Auth & Billing Matrix
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Comprehensive overview of AI model quotas, pricing, and system authentication keys.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Manage Budget Limits
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column - Financial Overview & Fallback */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Current Usage Card */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-10 -mt-10 rounded-full" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Current Sprint Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-mono text-white font-bold">
                                    ${isStatusLoading ? '0.00' : status?.usage.currentMonth?.toFixed(2) || '0.00'}
                                </span>
                                <span className="text-sm text-zinc-500 mb-1 font-mono">
                                    / ${isStatusLoading ? '0.00' : status?.usage.limit?.toFixed(2) || '0.00'} Limit
                                </span>
                            </div>

                            {/* Simple usage bar */}
                            <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden mt-4">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (((status?.usage.currentMonth || 0) / (status?.usage.limit || 100)) * 100))}%` }}
                                />
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Cost Breakdown</div>
                                {status?.usage.breakdown.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-zinc-300 capitalize flex items-center gap-2">
                                            {item.provider}
                                        </span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-zinc-500 font-mono">{item.requests} reqs</span>
                                            <span className="font-mono text-emerald-400">${item.cost.toFixed(4)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Routing Fallback Chain */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                Execution Fallback Chain
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            {isFallbackLoading ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
                            ) : (
                                <div className="space-y-3">
                                    {fallback?.chain.map((link: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-zinc-800/50">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/20">
                                                {link.priority}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-zinc-200 capitalize text-sm truncate">{link.provider}</span>
                                                    {link.model && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700 truncate">{link.model}</Badge>}
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-0.5 truncate">{link.reason}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Middle/Right Columns - Charts & Matrices */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Cost History */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                        <CardHeader className="pb-0 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-500" />
                                30-Day Cost Trend
                            </CardTitle>
                            <div className="flex gap-2">
                                {[7, 14, 30].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setHistoryDays(days)}
                                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${historyDays === days ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {days}D
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderCostChart()}
                        </CardContent>
                    </Card>

                    {/* Unified Auth & Quota Matrix */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                        <CardHeader className="bg-black/20 border-b border-white/5 pb-4">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-400" />
                                Provider Capabilities & Limits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-zinc-500 uppercase bg-black/40 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-wider">Provider</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-center">Auth Status</th>
                                        <th className="px-6 py-4 font-bold tracking-wider">Tier</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-right">Quota Used</th>
                                        <th className="px-6 py-4 font-bold tracking-wider text-right">Rate Limit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {isQuotasLoading ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                                    ) : quotas?.map((q: any) => (
                                        <tr key={q.provider} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-200 capitalize">
                                                {q.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {q.configured ? (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">VERIFIED</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]">MISSING KEY</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs px-2 py-0.5 rounded capitalize ${q.tier === 'free' ? 'text-zinc-400 bg-zinc-800' :
                                                    q.tier === 'high' ? 'text-fuchsia-400 bg-fuchsia-900/30' :
                                                        'text-blue-400 bg-blue-900/30'
                                                    }`}>
                                                    {q.tier}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {q.limit ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={q.used >= q.limit ? 'text-red-400' : 'text-zinc-300'}>
                                                            ${q.used.toFixed(2)} / ${q.limit.toFixed(2)}
                                                        </span>
                                                        <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className={`h-full ${q.used >= q.limit ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (q.used / q.limit) * 100)}%` }} />
                                                        </div>
                                                    </div>
                                                ) : <span className="text-zinc-500">Unlimited</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-zinc-400 text-xs">
                                                {q.rateLimitRpm ? `${q.rateLimitRpm} RPM` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* Model Pricing Dictionary */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                        <CardHeader className="bg-black/20 border-b border-white/5 pb-4">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Key className="h-4 w-4 text-indigo-400" />
                                Model Pricing Dictionary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto max-h-[400px]">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-3 font-bold tracking-wider">Model ID</th>
                                        <th className="px-6 py-3 font-bold tracking-wider">Context Window</th>
                                        <th className="px-6 py-3 font-bold tracking-wider text-right">Input/1MT</th>
                                        <th className="px-6 py-3 font-bold tracking-wider text-right">Output/1MT</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {isPricingLoading ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                                    ) : pricing?.models.filter((m: any) => m.inputPrice !== null).map((m: any) => (
                                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-zinc-300 text-xs">{m.id}</span>
                                                    {m.recommended && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/30">RECOMMENDED</Badge>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 font-mono text-zinc-400 text-xs">
                                                {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k` : 'Auto'}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-emerald-400/80 text-xs">
                                                ${(m.inputPricePer1k * 1000).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-blue-400/80 text-xs">
                                                ${(m.outputPricePer1k * 1000).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>

                    {/* OAuth Client Integrations Card Scaffold */}
                    <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                        <CardHeader className="bg-black/20 border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="h-4 w-4 text-purple-400" />
                                OAuth App Integrations
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-7 text-[10px] border-purple-500/20 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10">
                                Register New Client
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 text-center">
                            <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
                                <Shield className="h-8 w-8 opacity-20 mb-2" />
                                <p className="text-sm">No global OAuth clients registered.</p>
                                <p className="text-xs max-w-sm mx-auto">
                                    OAuth flows for specific MCP endpoints are managed per-environment or dynamically requested via the Broker during Agent tool execution.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
