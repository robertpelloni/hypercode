"use client";

import React from 'react';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription,
    Badge,
    Progress
} from '@hypercode/ui';
import { 
    AlertCircle, 
    Calendar, 
    Clock, 
    Info, 
    RefreshCcw, 
    Zap,
    TrendingUp,
    TrendingDown,
    Activity
} from 'lucide-react';
import { BillingQuotaTableRow, formatProviderAvailabilityLabel } from './billing-page-normalizers';

interface ProviderDetailPanelProps {
    provider: BillingQuotaTableRow | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ProviderDetailPanel({ provider, isOpen, onClose }: ProviderDetailPanelProps) {
    if (!provider) return null;

    const hasWindows = provider.windows && provider.windows.length > 0;
    const lastRefreshed = provider.quotaRefreshedAt 
        ? new Date(provider.quotaRefreshedAt).toLocaleTimeString() 
        : 'Unknown';

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-200 overflow-y-auto">
                <SheetHeader className="border-b border-zinc-800 pb-6 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-zinc-800 text-[10px] uppercase tracking-wider">
                            Provider Detail
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                            provider.authenticated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            provider.configured ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 
                            'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}>
                            {provider.authenticated ? 'CONNECTED' : provider.configured ? 'CONFIGURED' : 'MISSING AUTH'}
                        </Badge>
                    </div>
                    <SheetTitle className="text-2xl font-bold text-white flex items-center gap-2 capitalize">
                        {provider.name}
                    </SheetTitle>
                    <SheetDescription className="text-zinc-500 flex items-center gap-1.5 mt-1">
                        <Info className="h-3.5 w-3.5" />
                        {formatProviderAvailabilityLabel(provider.availability)} · {provider.tier} Tier
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Primary Quota Card */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" />
                            Primary Consumption
                        </h3>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
                            <div className="flex items-end justify-between">
                                <div className="space-y-1">
                                    <div className="text-3xl font-mono font-bold text-white">
                                        ${provider.used.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        of {provider.limit ? `$${provider.limit.toFixed(2)}` : 'Unlimited'} limit
                                    </div>
                                </div>
                                {provider.limit && (
                                    <div className={`flex items-center gap-1 text-xs font-medium ${
                                        (provider.used / provider.limit) > 0.8 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                        {Math.round((provider.used / provider.limit) * 100)}% Used
                                    </div>
                                )}
                            </div>

                            {provider.limit && (
                                <Progress 
                                    value={(provider.used / provider.limit) * 100} 
                                    className="h-2 bg-zinc-950" 
                                    indicatorClassName={(provider.used / provider.limit) > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-tight">Remaining</div>
                                    <div className="text-sm font-mono text-zinc-200">
                                        {provider.limit ? `$${(provider.limit - provider.used).toFixed(2)}` : 'N/A'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-tight font-bold">Reset Date</div>
                                    <div className="text-sm font-mono text-zinc-200 flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 text-zinc-500" />
                                        {provider.resetDate ? new Date(provider.resetDate).toLocaleDateString() : 'None'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Windows / Granular Quotas */}
                    {hasWindows && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                Usage Windows
                            </h3>
                            <div className="space-y-3">
                                {provider.windows.map((window) => {
                                    const ratio = window.limit ? (window.used / window.limit) : 0;
                                    const percent = Math.min(100, Math.round(ratio * 100));
                                    const isExhausted = window.limit ? window.used >= window.limit : false;

                                    return (
                                        <div key={window.key} className="rounded-lg border border-zinc-800 bg-black/40 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
                                                    {window.label}
                                                    {isExhausted && <Badge variant="outline" className="h-4 text-[8px] bg-red-500/10 text-red-400 border-red-500/20">DEPLETED</Badge>}
                                                </div>
                                                <span className="text-[10px] font-mono text-zinc-500">
                                                    {window.used.toFixed(1)} / {window.limit ? window.limit.toFixed(1) : '∞'} {window.unit}
                                                </span>
                                            </div>
                                            
                                            {window.limit && (
                                                <Progress 
                                                    value={percent} 
                                                    className="h-1.5 bg-zinc-950" 
                                                    indicatorClassName={percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-blue-500'}
                                                />
                                            )}

                                            <div className="flex items-center justify-between text-[10px]">
                                                <div className="text-zinc-500 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    Resets {window.resetDate ? new Date(window.resetDate).toLocaleTimeString() : 'periodically'}
                                                </div>
                                                <div className={percent > 90 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                                                    {percent}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Technical Details */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5" />
                            Technical Status
                        </h3>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs space-y-3">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Authentication</span>
                                <span className="text-zinc-300 uppercase">{provider.authMethod.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Data Confidence</span>
                                <span className="text-zinc-300 capitalize">{provider.quotaConfidence}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Rate Limit</span>
                                <span className="text-zinc-300">{provider.rateLimitRpm ? `${provider.rateLimitRpm} RPM` : 'Default'}</span>
                            </div>
                            <div className="flex justify-between border-t border-zinc-800 pt-3">
                                <span className="text-zinc-500">Last Synced</span>
                                <span className="text-zinc-400 flex items-center gap-1">
                                    <RefreshCcw className="h-3 w-3" />
                                    {lastRefreshed}
                                </span>
                            </div>
                        </div>
                    </div>

                    {provider.lastError && (
                        <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-red-400 uppercase tracking-tight">Last Error</div>
                                    <div className="text-xs text-red-300/80 leading-relaxed font-mono">
                                        {provider.lastError}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
