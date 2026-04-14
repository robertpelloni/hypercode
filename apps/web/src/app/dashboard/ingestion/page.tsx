import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@hypercode/ui';
import { Database, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import fs from 'fs/promises';
import path from 'path';

// Force dynamic rendering and no caching to ensure live telemetry
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function stripJsonComments(content: string) {
    return content.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => (g ? '' : m));
}

async function getMasterIndex() {
    try {
        const filePath = path.join(process.cwd(), '../..', 'BORG_MASTER_INDEX.jsonc');
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(stripJsonComments(content));
    } catch (err) {
        console.error('Failed to load BORG_MASTER_INDEX:', err);
        return null;
    }
}

export default async function IngestionDashboard() {
    const masterIndex = await getMasterIndex();

    if (!masterIndex) {
        return (
            <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 space-y-6">
                <PageHeader title="Ingestion Telemetry" description="External Link Ingestion Queue & Telemetry" />
                <Card className="border-slate-800 bg-slate-900 shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="text-rose-400 font-mono">Error: Could not load BORG_MASTER_INDEX.jsonc. Make sure the sync script has run.</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { stats, ingestion, categories } = masterIndex;
    const { queue } = ingestion;

    // Flatten all entries to find actual failed items for the table
    const allEntries: any[] = [];
    Object.values(categories || {}).forEach((items: any) => {
        allEntries.push(...items);
    });

    const failedItems = allEntries.filter(i => i.fetch_status === 'failed');
    const pendingItems = allEntries.filter(i => i.fetch_status === 'pending').slice(0, 50); // limit for UI

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 space-y-6 overflow-hidden">
            <PageHeader
                title="Ingestion Telemetry"
                description="Monitor sync pipeline queues, failure telemetry, and external corpus ingestion status."
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Tracked</div>
                            <div className="text-2xl font-mono text-cyan-400">{stats.total_links}</div>
                        </div>
                        <Database className="w-8 h-8 text-cyan-900/50" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Processed</div>
                            <div className="text-2xl font-mono text-emerald-400">{queue.processed}</div>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-900/50" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Pending</div>
                            <div className="text-2xl font-mono text-amber-400">{queue.pending}</div>
                        </div>
                        <Clock className="w-8 h-8 text-amber-900/50" />
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Failed</div>
                            <div className="text-2xl font-mono text-rose-400">{queue.failed}</div>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-rose-900/50" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 flex-1 overflow-hidden">
                <Card className="border-slate-800 bg-slate-900 shadow-2xl flex flex-col min-h-0">
                    <CardHeader className="shrink-0 pb-2">
                        <CardTitle className="text-rose-400 font-bold uppercase tracking-tighter text-sm flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" /> Failed Queue ({failedItems.length})
                        </CardTitle>
                        <CardDescription>Items that require manual intervention or retry.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-y-auto min-h-0 space-y-2">
                        {failedItems.length === 0 ? (
                            <div className="text-slate-500 italic text-xs py-4 text-center">No failed ingestion targets.</div>
                        ) : (
                            failedItems.map((item, i) => (
                                <div key={i} className="p-3 bg-red-950/10 border border-rose-900/30 rounded flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <div className="text-xs font-bold text-rose-300 break-all">{item.name}</div>
                                        <div className="text-[9px] font-mono text-slate-500 whitespace-nowrap ml-2">Attempts: {item.fetch_attempts}</div>
                                    </div>
                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-cyan-600 hover:text-cyan-400 hover:underline break-all">
                                        {item.url}
                                    </a>
                                    <div className="mt-1 text-[10px] text-rose-400/80 font-mono bg-rose-950/30 p-1.5 rounded border border-rose-900/50">
                                        Error: {item.fetch_error || "Unknown Failure"}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="text-[9px] text-slate-600">Last checked: {item.last_checked_at || 'Unknown'}</div>
                                        <button className="text-[10px] uppercase font-bold tracking-wider text-rose-400 hover:text-rose-300 border border-rose-900/50 hover:border-rose-500/50 px-2 py-0.5 rounded transition-colors bg-rose-950/20">
                                            Retry Action &rarr;
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900 shadow-2xl flex flex-col min-h-0">
                    <CardHeader className="shrink-0 pb-2">
                        <CardTitle className="text-amber-400 font-bold uppercase tracking-tighter text-sm flex items-center">
                            <Clock className="w-4 h-4 mr-2" /> Pending Queue ({pendingItems.length} shown)
                        </CardTitle>
                        <CardDescription>Items slated for next assimilation cycle.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-y-auto min-h-0 space-y-2">
                        {pendingItems.length === 0 ? (
                            <div className="text-slate-500 italic text-xs py-4 text-center">No pending ingestion targets.</div>
                        ) : (
                            pendingItems.map((item, i) => (
                                <div key={i} className="p-3 bg-amber-950/10 border border-amber-900/30 rounded flex justify-between items-center">
                                    <div className="flex flex-col truncate pr-2">
                                        <div className="text-xs font-bold text-amber-300 truncate">{item.name}</div>
                                        <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-slate-500 hover:text-cyan-400 hover:underline truncate">
                                            {item.url}
                                        </a>
                                    </div>
                                    <div className="shrink-0 flex gap-1">
                                        <span className="text-[8px] uppercase tracking-widest text-slate-500 font-mono border border-slate-700 bg-slate-800 rounded px-1.5 py-0.5">
                                            {item.source}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
