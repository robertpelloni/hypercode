"use client";

import React, { useState } from 'react';
import { AlertTriangle, GitMerge, FileWarning, Check, X, FileDiff, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@hypercode/ui';
import { Button } from '@hypercode/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hypercode/ui';
import { Badge } from '@hypercode/ui';
import { toast } from 'sonner';

// Mock data to simulate an active pipeline conflict between agents or threads
const MOCK_STATE_CONFLICTS = [
    {
        id: 'conf-auth-102',
        title: 'Authentication Middleware Pipeline',
        agentA: 'The Architect',
        agentB: 'The Critic',
        diffA: 'Return 401 Unauthorized instantly when JWT is expired.',
        diffB: 'Return 403 Forbidden with a context hint for token refresh.',
        status: 'pending'
    },
    {
        id: 'conf-db-409',
        title: 'Database Schema Lock',
        agentA: 'Product Lead',
        agentB: 'Meta-Architect',
        diffA: 'Add JSONB column for rapid feature iteration on User table.',
        diffB: 'Normalize to separate UserPreferences table with strict foreign keys.',
        status: 'pending'
    }
];

export default function ConflictResolutionPage() {
    const [stateConflicts, setStateConflicts] = useState(MOCK_STATE_CONFLICTS);

    const handleResolve = (id: string, side: 'A' | 'B') => {
        setStateConflicts(prev => prev.filter(c => c.id !== id));
        toast.success(`Conflict resolved using Agent ${side}'s branch.`);
    };

    const handleDismiss = (id: string) => {
        setStateConflicts(prev => prev.filter(c => c.id !== id));
        toast.info("Conflict dismissed. Agents will re-evaluate on next tick.");
    };

    return (
        <div className="flex flex-col flex-1 p-8 space-y-8 bg-black min-h-screen max-w-7xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-900/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                        <AlertTriangle className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Conflict Resolution Hub</h1>
                        <p className="text-zinc-500 mt-1">Resolve state branch divergences, unblock execution threads, and enforce consensus.</p>
                    </div>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 py-1.5 px-3">
                    {stateConflicts.length} Active Conflicts
                </Badge>
            </div>

            <Tabs defaultValue="state" className="w-full">
                <TabsList className="bg-zinc-900/50 border border-zinc-800 mb-6">
                    <TabsTrigger value="state" className="data-[state=active]:bg-zinc-800">
                        <GitMerge className="h-4 w-4 mr-2" />
                        Agent State Branches
                    </TabsTrigger>
                    <TabsTrigger value="files" className="data-[state=active]:bg-zinc-800">
                        <FileWarning className="h-4 w-4 mr-2" />
                        File System Locks
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="state" className="space-y-6">
                    {stateConflicts.length === 0 ? (
                        <div className="text-center p-12 border border-zinc-800 border-dashed rounded-lg bg-zinc-900/30">
                            <Check className="h-12 w-12 mx-auto mb-4 text-emerald-500/50" />
                            <h3 className="text-lg font-medium text-white mb-2">All Clear</h3>
                            <p className="text-zinc-500">No active state merges pending resolution across the agent swarm.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {stateConflicts.map((conflict) => (
                                <Card key={conflict.id} className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden">
                                    <CardHeader className="bg-zinc-950/50 border-b border-zinc-800 pb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant="secondary" className="font-mono text-xs">{conflict.id}</Badge>
                                                </div>
                                                <CardTitle className="text-xl font-bold text-white">{conflict.title}</CardTitle>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
                                            {/* Branch A */}
                                            <div className="p-6 relative group hover:bg-zinc-800/20 transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">{conflict.agentA}</span>
                                                    <Badge variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">Branch A</Badge>
                                                </div>
                                                <div className="p-4 bg-black/40 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-300 min-h-[100px]">
                                                    {conflict.diffA}
                                                </div>
                                                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button onClick={() => handleResolve(conflict.id, 'A')} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                                                        <Check className="h-4 w-4 mr-2" /> Accept Branch A
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Branch B */}
                                            <div className="p-6 relative group hover:bg-zinc-800/20 transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest">{conflict.agentB}</span>
                                                    <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-300 bg-fuchsia-500/10">Branch B</Badge>
                                                </div>
                                                <div className="p-4 bg-black/40 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-300 min-h-[100px]">
                                                    {conflict.diffB}
                                                </div>
                                                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button onClick={() => handleResolve(conflict.id, 'B')} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                                                        <Check className="h-4 w-4 mr-2" /> Accept Branch B
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-zinc-950/80 border-t border-zinc-800 p-4 flex justify-between">
                                        <p className="text-xs text-zinc-500 flex items-center">
                                            <AlertTriangle className="h-3 w-3 mr-1.5" />
                                            Resolving will forcefully collapse the divergent thread.
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={() => handleDismiss(conflict.id)} className="text-zinc-500 hover:text-white">
                                            <X className="h-4 w-4 mr-2" /> Dismiss
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="files" className="space-y-6">
                    <div className="text-center p-12 border border-zinc-800 border-dashed rounded-lg bg-zinc-900/30">
                        <FileDiff className="h-12 w-12 mx-auto mb-4 text-emerald-500/50" />
                        <h3 className="text-lg font-medium text-white mb-2">No File System Locks</h3>
                        <p className="text-zinc-500">Workspace synchronization is perfectly stable. No filesystem conflicts detected.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
