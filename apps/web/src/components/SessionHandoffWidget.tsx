"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from "@hypercode/ui";
import { Download, Upload, Copy, Check, Loader2, Save } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

export function SessionHandoffWidget() {
    const [artifact, setArtifact] = useState('');
    const [copied, setCheck] = useState(false);
    const [showImport, setShowImport] = useState(false);

    const handoffMutation = trpc.agentMemory.handoff.useMutation({
        onSuccess: (data) => {
            setArtifact(data);
            toast.success('Session handoff artifact generated');
        }
    });

    const pickupMutation = trpc.agentMemory.pickup.useMutation({
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Successfully restored ${res.count} context items`);
                setShowImport(false);
                setArtifact('');
            } else {
                toast.error('Failed to restore session artifact');
            }
        }
    });

    const copyToClipboard = () => {
        navigator.clipboard.writeText(artifact);
        setCheck(true);
        setTimeout(() => setCheck(false), 2000);
        toast.success('Copied to clipboard');
    };

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Save className="h-4 w-4 text-purple-400" />
                    Session Handoff & Pickup
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-zinc-500">
                    Export your current AI session context as a portable artifact to resume work later or hand off to another agent.
                </p>

                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-zinc-800 hover:bg-zinc-800"
                        onClick={() => {
                            handoffMutation.mutate({ notes: 'Manual handoff from dashboard' });
                            setShowImport(false);
                        }}
                        disabled={handoffMutation.isPending}
                    >
                        {handoffMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Download className="h-3 w-3 mr-2 text-blue-400" />}
                        Export Session
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-zinc-800 hover:bg-zinc-800"
                        onClick={() => {
                            setShowImport(!showImport);
                            setArtifact('');
                        }}
                    >
                        <Upload className="h-3 w-3 mr-2 text-green-400" />
                        {showImport ? 'Cancel' : 'Import Session'}
                    </Button>
                </div>

                {artifact && !showImport && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <div className="relative">
                            <pre className="text-[10px] p-3 bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden max-h-[150px] font-mono text-zinc-400">
                                {artifact}
                            </pre>
                            <button 
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 transition-colors"
                            >
                                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-zinc-400" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center">
                            Keep this string safe. It contains your active working memory.
                        </p>
                    </div>
                )}

                {showImport && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <textarea
                            value={artifact}
                            onChange={(e) => setArtifact(e.target.value)}
                            placeholder="Paste your session handoff JSON here..."
                            className="w-full h-[150px] text-[10px] p-3 bg-zinc-950 border border-zinc-800 rounded-md font-mono text-zinc-400 focus:border-purple-500 outline-none transition-colors"
                        />
                        <Button 
                            size="sm" 
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => pickupMutation.mutate({ artifact })}
                            disabled={!artifact || pickupMutation.isPending}
                        >
                            {pickupMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Check className="h-3 w-3 mr-2" />}
                            Restore Context
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
