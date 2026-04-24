"use client";

import React, { useState } from 'react';
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/intake/page.tsx
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@hypercode/ui";
=======
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@borg/ui";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/intake/page.tsx
import { Database, Upload, FileText, Check, Loader2, Search, Brain, Activity } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

type RecentIngestion = {
    id: string;
    content: string;
    createdAt: string | number | Date;
    metadata?: {
        title?: string;
    } | null;
};

type NormalizedRecentIngestions = {
    data: RecentIngestion[];
    invalid: boolean;
};

function normalizeRecentIngestions(value: unknown): NormalizedRecentIngestions {
    if (value == null) return { data: [], invalid: false };
    if (!Array.isArray(value)) return { data: [], invalid: true };

    let invalid = false;
    const data = value.filter((item): item is RecentIngestion => {
        if (!item || typeof item !== 'object') {
            invalid = true;
            return false;
        }

        const recent = item as Partial<RecentIngestion>;
        const metadata = recent.metadata;
        const metadataValid = metadata == null || (typeof metadata === 'object' && (metadata.title === undefined || typeof metadata.title === 'string'));
        const createdAtValid = recent.createdAt instanceof Date || typeof recent.createdAt === 'string' || typeof recent.createdAt === 'number';
        const rowValid = typeof recent.id === 'string' && typeof recent.content === 'string' && createdAtValid && metadataValid;

        if (!rowValid) {
            invalid = true;
        }

        return rowValid;
    });

    return { data, invalid };
}

export default function IntakePage() {
    const utils = trpc.useContext();
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [isIngesting, setIsIngesting] = useState(false);

    const addMemory = trpc.agentMemory.add.useMutation({
        onSuccess: () => {
            utils.agentMemory.getRecent.invalidate();
            toast.success('Cognitive context ingested successfully');
            setContent('');
            setTitle('');
            setIsIngesting(false);
        },
        onError: (err) => {
            toast.error(`Ingestion failed: ${err.message}`);
            setIsIngesting(false);
        }
    });

    const { data: recent, isLoading: isLoadingRecent, error: recentError } = trpc.agentMemory.getRecent.useQuery({ limit: 5, type: 'long_term' });
    const normalizedRecent = normalizeRecentIngestions(recent);
    const recentIngestions = normalizedRecent.data;
    const recentUnavailable = Boolean(recentError) || normalizedRecent.invalid;

    const handleIngest = () => {
        if (!content.trim()) return;
        setIsIngesting(true);
        addMemory.mutate({
            content,
            type: 'long_term',
            namespace: 'project',
            tags: [
                'manual_intake',
                ...(title?.trim() ? [title.trim()] : []),
            ],
        });
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Database className="h-8 w-8 text-blue-400" />
                    Cognitive Intake
                </h1>
                <p className="text-zinc-500 mt-2">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/intake/page.tsx
                    Manually feed documentation, notes, or raw logs into HyperCode's long-term memory graph.
=======
                    Manually feed documentation, notes, or raw logs into borg's long-term memory graph.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/intake/page.tsx
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Main Ingestion Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-purple-400" />
                                Manual Ingestion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Resource Title</label>
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Project Architecture Rules, Meeting Notes..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Content / Data</label>
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Paste raw text, documentation snippets, or chat logs here..."
                                    className="w-full h-[300px] bg-zinc-950 border border-zinc-800 rounded-md p-3 text-sm text-zinc-300 font-mono focus:border-blue-500 outline-none transition-colors resize-none"
                                />
                            </div>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 py-6 text-lg"
                                onClick={handleIngest}
                                disabled={!content.trim() || isIngesting}
                            >
                                {isIngesting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                                Ingest into Long-Term Memory
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info & Recent */}
                <div className="space-y-6">
                    <Card className="bg-zinc-950 border-zinc-800 border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                Ingestion Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Processing Engine</span>
                                <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20">Active</Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-500">Vector Storage</span>
                                <Badge variant="outline" className="bg-green-500/5 text-green-400 border-green-500/20">LanceDB</Badge>
                            </div>
                            <div className="pt-4 border-t border-zinc-900">
                                <p className="text-[10px] text-zinc-600 italic leading-relaxed">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/intake/page.tsx
                                    HyperCode uses semantic chunking to digest large inputs. Once ingested, this knowledge is available to all agents via <code>search_memory</code> or <code>auto_call_tool</code>.
=======
                                    borg uses semantic chunking to digest large inputs. Once ingested, this knowledge is available to all agents via <code>search_memory</code> or <code>auto_call_tool</code>.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/intake/page.tsx
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1">Recent Ingestions</h3>
                        {isLoadingRecent ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-zinc-700" /></div>
                        ) : recentError ? (
                            <p className="text-[10px] text-red-300 px-1 italic">Recent ingestions unavailable: {recentError.message}</p>
                        ) : recentUnavailable ? (
                            <p className="text-[10px] text-red-300 px-1 italic">Recent ingestions unavailable due to malformed data.</p>
                        ) : recentIngestions.length === 0 ? (
                            <p className="text-[10px] text-zinc-700 px-1 italic">No recent manual ingestions.</p>
                        ) : (
                            <div className="space-y-2">
                                {recentIngestions.map((mem) => (
                                    <div key={mem.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[120px]">
                                                {mem.metadata?.title || 'Untitled'}
                                            </span>
                                            <span className="text-[9px] text-zinc-600 font-mono">
                                                {new Date(mem.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                                            {mem.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
