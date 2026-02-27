'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import {
    Users as UsersIcon,
    Scale as ScaleIcon,
    ArrowRightLeft as ArrowsRightLeftIcon,
    Play as PlayIcon
} from 'lucide-react';

export default function SwarmDashboard() {
    const [activeTab, setActiveTab] = useState<'swarm' | 'debate' | 'consensus'>('swarm');

    // Swarm State
    const [swarmPrompt, setSwarmPrompt] = useState('Build a Next.js landing page with Stripe integration and a dark mode toggle.');
    const startSwarmMutation = trpc.swarm.startSwarm.useMutation();

    // Debate State
    const [debateTopic, setDebateTopic] = useState('Monorepo vs Polyrepo for enterprise scalability');
    const executeDebateMutation = trpc.swarm.executeDebate.useMutation();

    // Consensus State
    const [consensusPrompt, setConsensusPrompt] = useState('What is the single most critical security vulnerability in standard JWT implementations?');
    const seekConsensusMutation = trpc.swarm.seekConsensus.useMutation();

    const handleStartSwarm = async () => {
        await startSwarmMutation.mutateAsync({ masterPrompt: swarmPrompt, maxConcurrency: 5 });
    };

    const handleStartDebate = async () => {
        await executeDebateMutation.mutateAsync({
            topic: debateTopic,
            proponentModel: 'claude-3-5-sonnet-20241022',
            opponentModel: 'gpt-4o',
            judgeModel: 'gemini-2.5-pro',
            rounds: 2
        });
    };

    const handleSeekConsensus = async () => {
        await seekConsensusMutation.mutateAsync({
            prompt: consensusPrompt,
            models: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-2.5-pro'],
            requiredAgreement: 0.66
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-6 space-y-6 overflow-y-auto">
            <PageHeader
                title="Swarm Orchestration"
                description="Horizontal multi-model delegation, adversarial debates, and consensus voting."
            />

            <div className="flex space-x-2 border-b border-slate-700 pb-2">
                <Button
                    variant={activeTab === 'swarm' ? 'default' : 'ghost'}
                    className={activeTab === 'swarm' ? 'bg-indigo-600' : ''}
                    onClick={() => setActiveTab('swarm')}
                >
                    <UsersIcon className="w-4 h-4 mr-2" /> Swarm Delegation
                </Button>
                <Button
                    variant={activeTab === 'debate' ? 'default' : 'ghost'}
                    className={activeTab === 'debate' ? 'bg-rose-600' : ''}
                    onClick={() => setActiveTab('debate')}
                >
                    <ArrowsRightLeftIcon className="w-4 h-4 mr-2" /> Adversarial Debate
                </Button>
                <Button
                    variant={activeTab === 'consensus' ? 'default' : 'ghost'}
                    className={activeTab === 'consensus' ? 'bg-emerald-600' : ''}
                    onClick={() => setActiveTab('consensus')}
                >
                    <ScaleIcon className="w-4 h-4 mr-2" /> Consensus Quorum
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SWARM PANEL */}
                {activeTab === 'swarm' && (
                    <>
                        <Card className="col-span-1 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center text-indigo-400">
                                    <UsersIcon className="w-5 h-5 mr-2" />
                                    Swarm Settings
                                </CardTitle>
                                <CardDescription className="text-slate-400">Split a prompt into parallel workers.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Master Directive</label>
                                    <Textarea
                                        value={swarmPrompt}
                                        onChange={e => setSwarmPrompt(e.target.value)}
                                        className="bg-slate-900 border-slate-700 min-h-[120px]"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={handleStartSwarm}
                                    disabled={startSwarmMutation.isPending}
                                >
                                    {startSwarmMutation.isPending ? 'Decomposing...' : (
                                        <><PlayIcon className="w-4 h-4 mr-2" /> Execute Swarm</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle>Execution Chain</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {startSwarmMutation.data ? (
                                    <div className="p-4 bg-slate-900 rounded-md border border-slate-700 text-emerald-400 font-mono text-sm">
                                        [Swarm] Synthesized {startSwarmMutation.data.tasksCount} distinct Sub-Tasks.<br />
                                        [Swarm] Spinning up isolated worker agents...<br />
                                        [Status] Initialized. See server logs for ongoing execution pipeline.
                                    </div>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-slate-500 italic">
                                        Ready to initiate Swarm sequence.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* DEBATE PANEL */}
                {activeTab === 'debate' && (
                    <>
                        <Card className="col-span-1 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center text-rose-400">
                                    <ArrowsRightLeftIcon className="w-5 h-5 mr-2" />
                                    Debate Configuration
                                </CardTitle>
                                <CardDescription className="text-slate-400">Force LLMs to argue a scenario.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Debate Topic / Thesis</label>
                                    <Textarea
                                        value={debateTopic}
                                        onChange={e => setDebateTopic(e.target.value)}
                                        className="bg-slate-900 border-slate-700"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-rose-600 hover:bg-rose-700"
                                    onClick={handleStartDebate}
                                    disabled={executeDebateMutation.isPending}
                                >
                                    {executeDebateMutation.isPending ? 'Debating...' : (
                                        <><PlayIcon className="w-4 h-4 mr-2" /> Initiate Debate</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle>Tribunal Transcript</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {executeDebateMutation.isPending && (
                                    <div className="animate-pulse text-rose-400/50">Models are generating opposing arguments...</div>
                                )}

                                {executeDebateMutation.data ? (
                                    <>
                                        <div className="p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-md">
                                            <h4 className="font-bold text-emerald-400 mb-2">Judge's Verdict</h4>
                                            <p className="text-sm text-emerald-100">{executeDebateMutation.data.summary}</p>
                                        </div>

                                        <div className="space-y-3 mt-4">
                                            <h4 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Raw Transcript</h4>
                                            {executeDebateMutation.data.history.map((turn: { round: number; persona: string; model: string; argument: string }, idx: number) => (
                                                <div key={idx} className={`p-3 rounded border text-sm ${turn.persona === 'Proponent' ? 'bg-indigo-900/20 border-indigo-500/30 ml-8' : 'bg-rose-900/20 border-rose-500/30 mr-8'}`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-slate-300">Round {turn.round} - {turn.persona}</span>
                                                        <span className="text-xs text-slate-500">{turn.model}</span>
                                                    </div>
                                                    <p className="text-slate-300">{turn.argument}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-slate-500 italic">
                                        Awaiting proposition.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* CONSENSUS PANEL */}
                {activeTab === 'consensus' && (
                    <>
                        <Card className="col-span-1 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center text-emerald-400">
                                    <ScaleIcon className="w-5 h-5 mr-2" />
                                    Consensus Quorum
                                </CardTitle>
                                <CardDescription className="text-slate-400">Require multiple models to agree mathematically.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Critical Inquiry</label>
                                    <Textarea
                                        value={consensusPrompt}
                                        onChange={e => setConsensusPrompt(e.target.value)}
                                        className="bg-slate-900 border-slate-700"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    onClick={handleSeekConsensus}
                                    disabled={seekConsensusMutation.isPending}
                                >
                                    {seekConsensusMutation.isPending ? 'Polling Models...' : (
                                        <><PlayIcon className="w-4 h-4 mr-2" /> Seek Consensus</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="col-span-2 border-slate-700 bg-slate-800">
                            <CardHeader>
                                <CardTitle>Plurality Matrix</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {seekConsensusMutation.data ? (
                                    <>
                                        <div className={`p-4 border rounded-md ${seekConsensusMutation.data.isConsensusReached
                                            ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-100'
                                            : 'bg-red-900/30 border-red-500/50 text-red-100'
                                            }`}>
                                            <h4 className={`font-bold mb-2 ${seekConsensusMutation.data.isConsensusReached ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {seekConsensusMutation.data.isConsensusReached ? 'Consensus Achieved' : 'Consensus Failed'}
                                            </h4>
                                            <p className="text-sm leading-relaxed">{seekConsensusMutation.data.verdict}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                            {seekConsensusMutation.data.candidates.map((candidate: { model: string; result: string; score: number }, idx: number) => (
                                                <div key={idx} className="bg-slate-900 border border-slate-700 p-3 rounded-md">
                                                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">
                                                        {candidate.model}
                                                    </div>
                                                    <div className="text-sm text-slate-300">
                                                        {candidate.result}
                                                    </div>
                                                    <div className="mt-3 text-xs flex items-center">
                                                        <span className="text-slate-500 mr-2">Overlap Score:</span>
                                                        <span className={candidate.score > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                            {(candidate.score * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-40 items-center justify-center text-slate-500 italic">
                                        Awaiting inquiry dispatch.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

            </div>
        </div>
    );
}
