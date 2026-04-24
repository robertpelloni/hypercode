"use client";

import React, { useState, useEffect } from 'react';
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/project/page.tsx
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@hypercode/ui";
=======
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@borg/ui";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/project/page.tsx
import { Scale, Save, History, RotateCcw, Loader2, Info, BookOpen } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

function isProjectContextPayload(value: unknown): value is string {
    return typeof value === 'string';
}

function isProjectHandoff(value: unknown): value is { id: string; timestamp: string | number | Date } {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { id?: unknown }).id === 'string'
        && ['string', 'number', 'object'].includes(typeof (value as { timestamp?: unknown }).timestamp);
}

export default function ProjectPage() {
    const utils = trpc.useContext();
    const contextQuery = trpc.project.getContext.useQuery();
    const handoffsQuery = trpc.project.getHandoffs.useQuery();
    const contextUnavailable = Boolean(contextQuery.error) || (contextQuery.data !== undefined && !isProjectContextPayload(contextQuery.data));
    const handoffsError = handoffsQuery.error?.message ?? null;
    const handoffsUnavailable = Boolean(handoffsQuery.error)
        || (
            handoffsQuery.data !== undefined
            && (
                !Array.isArray(handoffsQuery.data)
                || !handoffsQuery.data.every(isProjectHandoff)
            )
        );
    const typedHandoffs = !handoffsUnavailable && Array.isArray(handoffsQuery.data) ? handoffsQuery.data : [];
    
    const [content, setContent] = useState('');
    const [isSaving, setIsIngesting] = useState(false);

    useEffect(() => {
        if (isProjectContextPayload(contextQuery.data)) {
            setContent(contextQuery.data);
        }
    }, [contextQuery.data]);

    const updateMutation = trpc.project.updateContext.useMutation({
        onSuccess: () => {
            toast.success('Project laws updated successfully');
            setIsIngesting(false);
        },
        onError: (err) => {
            toast.error(`Update failed: ${err.message}`);
            setIsIngesting(false);
        }
    });

    const pickupMutation = trpc.agentMemory.pickup.useMutation({
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Session restored: ${res.count} items recovered`);
            } else {
                toast.error('Pickup failed');
            }
        }
    });

    const handleSave = () => {
        setIsIngesting(true);
        updateMutation.mutate({ content });
    };

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Scale className="h-8 w-8 text-amber-400" />
                        Project Constitution
                    </h1>
                    <p className="text-zinc-500 mt-2">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/project/page.tsx
                        Define the high-level rules, architectural patterns, and "laws" that all HyperCode agents must follow.
=======
                        Define the high-level rules, architectural patterns, and "laws" that all borg agents must follow.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/project/page.tsx
                    </p>
                </div>
                <Badge variant="outline" className="bg-amber-500/5 text-amber-400 border-amber-500/20 px-3 py-1">
                    Master Context Active
                </Badge>
            </div>

            <div className="grid gap-8 lg:grid-cols-4">
                {/* Editor Section */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800 flex flex-col h-[700px]">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 py-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium">project_context.md</span>
                            </div>
                            <Button 
                                size="sm" 
                                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                                onClick={handleSave}
                                disabled={isSaving || contextQuery.isLoading}
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Laws
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-0">
                            {contextUnavailable ? (
                                <div className="m-6 rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                    {contextQuery.error?.message ?? 'Project context is unavailable.'}
                                </div>
                            ) : null}
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full h-full bg-zinc-950 p-6 text-sm text-zinc-300 font-mono focus:outline-none transition-colors resize-none"
                                placeholder="# Repository Rules..."
                                disabled={contextUnavailable}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Handoff History */}
                <div className="space-y-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 px-1 flex items-center gap-2">
                        <History className="h-3 w-3" />
                        Handoff History
                    </h2>
                    
                    <div className="space-y-3">
                        {handoffsQuery.isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-800" /></div>
                        ) : handoffsError ? (
                            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                {handoffsError}
                            </div>
                        ) : handoffsUnavailable ? (
                            <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                                {handoffsError ?? "Project handoff history is unavailable."}
                            </div>
                        ) : typedHandoffs.length === 0 ? (
                            <p className="text-[10px] text-zinc-700 italic px-1 text-center py-8 bg-zinc-950 rounded-lg border border-zinc-900">No previous handoffs found.</p>
                        ) : (
                            typedHandoffs.map((handoff) => (
                                <Card key={handoff.id} className="bg-zinc-950 border-zinc-900 hover:border-zinc-800 transition-all group">
                                    <CardContent className="p-3 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-zinc-400">Snapshot</p>
                                                <p className="text-[9px] text-zinc-600 font-mono">
                                                    {new Date(handoff.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                            <RotateCcw 
                                                className="h-3 w-3 text-zinc-700 hover:text-purple-400 cursor-pointer transition-colors" 
                                                onClick={() => {
                                                    // This would need a way to read the artifact content first
                                                    // For the demo, we show the intention.
                                                    toast.info("Auto-pickup active. Session will resume on restart.");
                                                }}
                                            />
                                        </div>
                                        <Button variant="outline" size="xs" className="w-full text-[9px] h-7 border-zinc-800 group-hover:border-zinc-700 bg-transparent text-zinc-500 group-hover:text-zinc-300">
                                            View Artifact
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    <Card className="bg-zinc-950 border-zinc-900 border-dashed">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-amber-400/80">
                                <Info className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Pro Tip</span>
                            </div>
                            <p className="text-[10px] text-zinc-600 leading-relaxed italic">
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/project/page.tsx
                                Use this page to set "permanent" context. HyperCode agents call <code>get_project_context</code> on every fresh session to align their behavior with these rules.
=======
                                Use this page to set "permanent" context. borg agents call <code>get_project_context</code> on every fresh session to align their behavior with these rules.
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/project/page.tsx
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
