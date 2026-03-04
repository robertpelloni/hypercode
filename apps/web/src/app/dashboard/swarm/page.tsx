'use client';

import React, { useState, useEffect } from 'react';
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
    Play as PlayIcon,
    Radio as RadioIcon,
    Activity as ActivityIcon,
    Shield as ShieldIcon,
    Server as ServerIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SwarmMessage {
    id: string;
    sender: string;
    target?: string;
    type: string;
    payload: any;
    timestamp: number;
}

interface SwarmTask {
    id: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'pending_approval' | 'awaiting_subtask' | 'healing' | 'throttled' | 'verifying';
    result?: string;
    priority: number;
    usage?: { tokens: number; estimatedMemory: number };
    subMissionId?: string;
    retryCount?: number;
    // Phase 88
    verifiedBy?: string;
    slashed?: boolean;
}

interface SwarmMission {
    id: string;
    goal: string;
    status: 'active' | 'completed' | 'failed' | 'paused';
    tasks: SwarmTask[];
    parentId?: string;
    priority: number;
    usage: { tokens: number; estimatedMemory: number };
    context?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export default function SwarmDashboard() {
    const [activeTab, setActiveTab] = useState<'swarm' | 'debate' | 'consensus' | 'telemetry' | 'missions'>('swarm');

    // Telemetry State
    const [messages, setMessages] = useState<SwarmMessage[]>([]);
    const [streamStatus, setStreamStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Persistence & Capabilities (Phase 80)
    const missionHistoryQuery = (trpc.swarm as any).getMissionHistory.useQuery(undefined, {
        refetchInterval: 5000 // Poll for updates
    });
    const meshCapabilitiesQuery = (trpc.swarm as any).getMeshCapabilities.useQuery(undefined, {
        refetchInterval: 10000
    });

    const resumeMissionMutation = (trpc.swarm as any).resumeMission.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });

    const approveTaskMutation = (trpc.swarm as any).approveTask.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });

    const decomposeTaskMutation = (trpc.swarm as any).decomposeTask.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });

    const updateTaskPriorityMutation = (trpc.swarm as any).updateTaskPriority.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });

    const [masterPrompt, setMasterPrompt] = useState("");
    const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
    const [missionPriority, setMissionPriority] = useState(3);
    const [requestedTools, setRequestedTools] = useState("");

    // Initial SSE Connection
    useEffect(() => {
        // Core SSE port is 3001
        const eventSource = new EventSource('http://localhost:3001/api/mesh/stream');

        eventSource.onopen = () => setStreamStatus('online');
        eventSource.onerror = () => setStreamStatus('offline');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'CONNECTED') return;
                setMessages((prev) => [data, ...prev].slice(0, 50));
            } catch (err) {
                console.error('[Mesh] Parse Error', err);
            }
        };

        return () => eventSource.close();
    }, []);

    // Swarm State
    const [swarmPrompt, setSwarmPrompt] = useState('Build a Next.js landing page with Stripe integration and a dark mode toggle.');
    const startSwarmMutation = trpc.swarm.startSwarm.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });
    const launchMutation = trpc.swarm.startSwarm.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });

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

    // Direct Message State
    const [dmTarget, setDmTarget] = useState('');
    const [dmPayload, setDmPayload] = useState('{"hello": "world"}');
    const sendDirectMessageMutation = trpc.swarm.sendDirectMessage.useMutation();

    const handleSendDirectMessage = async () => {
        if (!dmTarget || !dmPayload) return;
        try {
            const parsed = JSON.parse(dmPayload);
            await sendDirectMessageMutation.mutateAsync({ targetNodeId: dmTarget, payload: parsed });
            setDmPayload('{"hello": "world"}');
        } catch (e) {
            alert('Payload must be valid JSON');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 space-y-6 overflow-hidden">
            <PageHeader
                title="Swarm Orchestration"
                description="Horizontal multi-model delegation, adversarial debates, and consensus voting."
            />

            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
                <Button
                    variant={activeTab === 'swarm' ? 'default' : 'ghost'}
                    className={activeTab === 'swarm' ? 'bg-indigo-600' : 'text-slate-400'}
                    onClick={() => setActiveTab('swarm')}
                >
                    <UsersIcon className="w-4 h-4 mr-2" /> Swarm
                </Button>
                <Button
                    variant={activeTab === 'missions' ? 'default' : 'ghost'}
                    className={activeTab === 'missions' ? 'bg-amber-600' : 'text-slate-400'}
                    onClick={() => setActiveTab('missions')}
                >
                    <ActivityIcon className="w-4 h-4 mr-2" /> Missions
                </Button>
                <Button
                    variant={activeTab === 'debate' ? 'default' : 'ghost'}
                    className={activeTab === 'debate' ? 'bg-rose-600' : 'text-slate-400'}
                    onClick={() => setActiveTab('debate')}
                >
                    <ArrowsRightLeftIcon className="w-4 h-4 mr-2" /> Debate
                </Button>
                <Button
                    variant={activeTab === 'consensus' ? 'default' : 'ghost'}
                    className={activeTab === 'consensus' ? 'bg-emerald-600' : 'text-slate-400'}
                    onClick={() => setActiveTab('consensus')}
                >
                    <ScaleIcon className="w-4 h-4 mr-2" /> Consensus
                </Button>
                <Button
                    variant={activeTab === 'telemetry' ? 'default' : 'ghost'}
                    className={activeTab === 'telemetry' ? 'bg-cyan-600' : 'text-slate-400'}
                    onClick={() => setActiveTab('telemetry')}
                >
                    <RadioIcon className={`w-4 h-4 mr-2 ${streamStatus === 'online' ? 'animate-pulse text-cyan-400' : ''}`} /> Telemetry
                </Button>
            </div>

            <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {/* SWARM PANEL */}
                    {activeTab === 'swarm' && (
                        <motion.div
                            key="swarm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full"
                        >
                            <Card className="col-span-1 border-slate-800 bg-slate-900 shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-indigo-400 font-bold uppercase tracking-tighter text-lg">Swarm Settings</CardTitle>
                                    <CardDescription>Split a prompt into parallel workers.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Master Directive</label>
                                        <Textarea
                                            value={masterPrompt}
                                            onChange={e => setMasterPrompt(e.target.value)}
                                            className="bg-slate-950 border-slate-800 min-h-[120px] focus:border-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Requested Tools (Optional)</label>
                                        <Input
                                            value={requestedTools}
                                            onChange={e => setRequestedTools(e.target.value)}
                                            placeholder="e.g. read_file, browser_get_history"
                                            className="bg-slate-950 border-slate-800 text-sm font-mono text-emerald-400 placeholder-emerald-900/50"
                                        />
                                    </div>
                                    <Button
                                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-12"
                                        onClick={() => launchMutation.mutate({
                                            masterPrompt,
                                            model: selectedModel,
                                            priority: missionPriority,
                                            tools: requestedTools.split(',').map(t => t.trim()).filter(Boolean)
                                        })}
                                        disabled={launchMutation.isPending || !masterPrompt}
                                    >
                                        {launchMutation.isPending ? 'DECOMPOSING...' : 'INITIATE SWARM'}
                                    </Button>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-amber-500/50 uppercase font-bold">Priority Level</label>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setMissionPriority(p)}
                                                        className={`w-6 h-6 text-[10px] rounded border transition-all ${missionPriority === p
                                                            ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                                            : 'bg-slate-900 text-amber-500/50 border-slate-700 hover:border-amber-500/30'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] text-amber-500/50 uppercase font-bold">Agent Model</label>
                                            {/* ... existing model selector buttons ... */}
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant={selectedModel === 'gpt-4o-mini' ? 'default' : 'ghost'}
                                                    className={selectedModel === 'gpt-4o-mini' ? 'bg-indigo-600' : 'text-slate-400'}
                                                    onClick={() => setSelectedModel('gpt-4o-mini')}
                                                >
                                                    GPT-4o-mini
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={selectedModel === 'claude-3-5-sonnet-20241022' ? 'default' : 'ghost'}
                                                    className={selectedModel === 'claude-3-5-sonnet-20241022' ? 'bg-indigo-600' : 'text-slate-400'}
                                                    onClick={() => setSelectedModel('claude-3-5-sonnet-20241022')}
                                                >
                                                    Claude 3.5
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="col-span-2 border-slate-800 bg-slate-900">
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase text-slate-500">Mesh Capability Registry</CardTitle>
                                    <CardDescription>Known nodes and their specialized tools.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {meshCapabilitiesQuery.data ? Object.entries(meshCapabilitiesQuery.data).map(([nodeId, tools]) => (
                                            <div key={nodeId} className="p-3 bg-slate-950 border border-slate-800 rounded">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-mono text-cyan-500 truncate mr-2">{nodeId}</span>
                                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(tools as string[]).map((tool: string) => (
                                                        <span key={tool} className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                                            {tool}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )) : <div className="text-slate-600 italic text-xs">Scanning mesh for capabilities...</div>}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* MISSIONS PANEL (PHASE 80 NEW) */}
                    {activeTab === 'missions' && (
                        <motion.div
                            key="missions"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full space-y-4 overflow-y-auto"
                        >
                            {missionHistoryQuery.data?.length === 0 ? (
                                <div className="flex h-60 items-center justify-center text-slate-600 italic">
                                    No persistent missions found in historical records.
                                </div>
                            ) : (
                                missionHistoryQuery.data?.map((mission: SwarmMission) => (
                                    <Card key={mission.id} className="bg-slate-900 border-slate-800 hover:border-amber-500/30 transition-colors">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg text-amber-500 font-bold">{mission.goal.slice(0, 100)}...</CardTitle>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <CardDescription className="text-[10px] font-mono opacity-50">{mission.id}</CardDescription>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${mission.priority >= 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold' :
                                                            mission.priority <= 2 ? 'bg-slate-500/10 text-slate-400 border-slate-500/30' :
                                                                'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                            }`}>
                                                            P{mission.priority}
                                                        </span>
                                                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                                                            <ActivityIcon className="w-2 h-2" />
                                                            {mission.usage?.tokens.toLocaleString()} tokens
                                                        </span>
                                                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                                                            <ServerIcon className="w-2 h-2" />
                                                            {((mission.usage?.estimatedMemory || 0) / 1024 / 1024).toFixed(1)}MB RAM
                                                        </span>
                                                        {mission.parentId && (
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                                Sub-mission of {mission.parentId.slice(0, 8)}...
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${mission.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    mission.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                                                        mission.status === 'paused' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                                                            'bg-cyan-500/20 text-cyan-400'
                                                    }`}>
                                                    {mission.status}
                                                </div>
                                            </div>
                                            {mission.status === 'failed' && (
                                                <Button
                                                    size="sm"
                                                    className="w-full mt-2 h-7 text-[10px] bg-amber-600 hover:bg-amber-500 text-white"
                                                    onClick={() => resumeMissionMutation.mutate({ missionId: mission.id })}
                                                    disabled={resumeMissionMutation.isPending}
                                                >
                                                    RESUME MISSION
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            {/* Phase 90: Mission Context Viewer */}
                                            {mission.context && Object.keys(mission.context).length > 0 && (
                                                <div className="mb-4">
                                                    <details className="group">
                                                        <summary className="cursor-pointer text-xs font-bold text-amber-500 hover:text-amber-400 select-none flex items-center gap-1 uppercase tracking-wider mb-2">
                                                            <ActivityIcon className="w-3 h-3" /> Shared Mission Context
                                                        </summary>
                                                        <pre className="text-[10px] text-amber-300 bg-black/50 p-2 rounded border border-amber-900/50 mt-1 overflow-x-auto">
                                                            {JSON.stringify(mission.context, null, 2)}
                                                        </pre>
                                                    </details>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                                {mission.tasks.map((task: SwarmTask) => (
                                                    <div key={task.id} className="p-2 bg-slate-950 border border-slate-800 rounded text-[10px]">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <div className="flex items-center gap-1 truncate mr-2">
                                                                <span className={`text-[8px] px-1 rounded border shrink-0 ${task.priority >= 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                                                    'bg-slate-800 text-slate-500 border-slate-700'
                                                                    }`}>
                                                                    P{task.priority || 3}
                                                                </span>
                                                                <span className="font-bold text-slate-500 truncate">{task.description}</span>
                                                            </div>
                                                            <span className={`px-1.5 py-0.5 rounded uppercase shrink-0 ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                task.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                                                                    task.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                                                                        task.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' :
                                                                            task.status === 'awaiting_subtask' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                                                                                task.status === 'healing' ? 'bg-fuchsia-500/20 text-fuchsia-400 animate-pulse' :
                                                                                    task.status === 'throttled' ? 'bg-orange-500/20 text-orange-400 animate-pulse' :
                                                                                        task.status === 'verifying' ? 'bg-purple-500/20 text-purple-400 animate-pulse' :
                                                                                            'bg-slate-800 text-slate-500'
                                                                }`}>
                                                                {task.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1 mt-1 items-center flex-wrap">
                                                            {task.slashed && (
                                                                <span className="text-[10px] text-red-500 font-bold mr-1" title="Agent Slashed">🔪</span>
                                                            )}
                                                            {(task.retryCount ?? 0) > 0 && (
                                                                <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 rounded border border-rose-500/30 font-bold">
                                                                    RETRY {task.retryCount}/3
                                                                </span>
                                                            )}

                                                            {/* Dynamic Priority Adjuster for Pending Tasks */}
                                                            {task.status === 'pending' && (
                                                                <div className="flex gap-0.5 mr-2">
                                                                    {[1, 2, 3, 4, 5].map(p => (
                                                                        <button
                                                                            key={p}
                                                                            onClick={() => updateTaskPriorityMutation.mutate({ missionId: mission.id, taskId: task.id, priority: p })}
                                                                            className={`w-3 h-3 text-[6px] rounded-full border transition-all flex items-center justify-center ${task.priority === p
                                                                                ? 'bg-amber-500 border-amber-400 text-black'
                                                                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-amber-500/40'
                                                                                }`}
                                                                        >
                                                                            {p}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {!task.subMissionId && task.status !== 'completed' && task.status !== 'healing' && task.status !== 'throttled' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-5 text-[8px] text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 p-0 px-1 border border-cyan-500/20"
                                                                    onClick={() => decomposeTaskMutation.mutate({ missionId: mission.id, taskId: task.id })}
                                                                    disabled={decomposeTaskMutation.isPending}
                                                                >
                                                                    EXPLODE
                                                                </Button>
                                                            )}
                                                            {task.subMissionId && (
                                                                <span className="text-[8px] text-indigo-400 font-mono">
                                                                    → VIEW SUB-MISSION
                                                                </span>
                                                            )}
                                                        </div>
                                                        {
                                                            task.status === 'pending_approval' && (
                                                                <div className="flex gap-1 mt-2 mb-1">
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 h-6 text-[8px] bg-emerald-700 hover:bg-emerald-600"
                                                                        onClick={() => approveTaskMutation.mutate({ missionId: mission.id, taskId: task.id, approved: true })}
                                                                    >
                                                                        APPROVE
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 h-6 text-[8px] bg-rose-700 hover:bg-rose-600"
                                                                        onClick={() => approveTaskMutation.mutate({ missionId: mission.id, taskId: task.id, approved: false })}
                                                                    >
                                                                        REJECT
                                                                    </Button>
                                                                </div>
                                                            )
                                                        }
                                                        {
                                                            task.result && task.status !== 'pending_approval' && (
                                                                <div className="text-slate-600 italic truncate">{task.result}</div>
                                                            )
                                                        }
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 italic">
                                                <span>Created: {new Date(mission.createdAt).toLocaleString()}</span>
                                                <span>Updated: {new Date(mission.updatedAt).toLocaleString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* DEBATE PANEL */}
                    {activeTab === 'debate' && (
                        <motion.div key="debate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="col-span-1 border-slate-800 bg-slate-900">
                                <CardHeader><CardTitle className="text-rose-400 font-bold uppercase tracking-tighter text-lg">Debate Config</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea value={debateTopic} onChange={e => setDebateTopic(e.target.value)} className="bg-slate-950 border-slate-800" />
                                    <Button className="w-full bg-rose-600 hover:bg-rose-700" onClick={handleStartDebate} disabled={executeDebateMutation.isPending}>
                                        {executeDebateMutation.isPending ? 'Debating...' : 'Initiate Dispute'}
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="col-span-2 border-slate-800 bg-slate-900">
                                <CardHeader><CardTitle className="text-xs uppercase text-slate-500">Transcript</CardTitle></CardHeader>
                                <CardContent>
                                    {executeDebateMutation.data ? (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded text-emerald-100 text-xs">{executeDebateMutation.data.summary}</div>
                                            {executeDebateMutation.data.history.map((turn: any, i: number) => (
                                                <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-400">
                                                    <span className="font-bold text-slate-300">{turn.persona}:</span> {turn.argument}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="h-40 flex items-center justify-center text-slate-600 italic">Ready for adversary input.</div>}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* CONSENSUS PANEL */}
                    {activeTab === 'consensus' && (
                        <motion.div key="consensus" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="col-span-1 border-slate-800 bg-slate-900">
                                <CardHeader><CardTitle className="text-emerald-400">Quorum Decision</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <Textarea value={consensusPrompt} onChange={e => setConsensusPrompt(e.target.value)} className="bg-slate-950 border-slate-800" />
                                    <Button className="w-full bg-emerald-600" onClick={handleSeekConsensus} disabled={seekConsensusMutation.isPending}>Seek Agreement</Button>
                                </CardContent>
                            </Card>
                            <Card className="col-span-2 border-slate-800 bg-slate-900">
                                <CardContent className="pt-6">
                                    {seekConsensusMutation.data ? (
                                        <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300">{seekConsensusMutation.data.verdict}</div>
                                    ) : <div className="h-40 flex items-center justify-center text-slate-600">Awaiting plurality request.</div>}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* TELEMETRY PANEL (PHASE 79 NEW) */}
                    {activeTab === 'telemetry' && (
                        <motion.div
                            key="telemetry"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="flex flex-col h-full space-y-4"
                        >
                            <div className="grid grid-cols-4 gap-4">
                                <Card className="bg-slate-900 border-slate-800 p-4">
                                    <div className="flex items-center space-x-3 text-cyan-400">
                                        <ActivityIcon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Network Health</span>
                                    </div>
                                    <div className="mt-2 text-xl font-bold font-mono">{streamStatus === 'online' ? 'STABLE' : 'LINK LOST'}</div>
                                </Card>
                                <Card className="bg-slate-900 border-slate-800 p-4">
                                    <div className="flex items-center space-x-3 text-purple-400">
                                        <ServerIcon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Active Nodes</span>
                                    </div>
                                    <div className="mt-2 text-xl font-bold font-mono">{new Set(messages.map(m => m.sender)).size}</div>
                                </Card>
                                <Card className="bg-slate-900 border-slate-800 p-4 col-span-2">
                                    <div className="flex items-center space-x-3 text-emerald-400">
                                        <ShieldIcon className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Encryption / Protocol</span>
                                    </div>
                                    <div className="mt-2 text-xs font-mono text-slate-500">SwarmProtocol v2.7.38 / Redis Pub-Sub Encrypted Bridge</div>
                                </Card>
                            </div>

                            <Card className="bg-slate-900 border-slate-800 p-4 shrink-0 flex gap-4 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">Target Node ID</label>
                                    <Input
                                        className="h-8 bg-slate-950 border-slate-800 text-xs font-mono"
                                        placeholder="Node UUID..."
                                        value={dmTarget}
                                        onChange={e => setDmTarget(e.target.value)}
                                    />
                                </div>
                                <div className="flex-[2] space-y-1">
                                    <label className="text-[10px] text-slate-500 uppercase font-bold">JSON Payload</label>
                                    <Input
                                        className="h-8 bg-slate-950 border-slate-800 text-xs font-mono"
                                        placeholder='{"command": "test"}'
                                        value={dmPayload}
                                        onChange={e => setDmPayload(e.target.value)}
                                    />
                                </div>
                                <Button
                                    className="h-8 bg-cyan-700 hover:bg-cyan-600 text-xs px-6 font-bold"
                                    onClick={handleSendDirectMessage}
                                    disabled={sendDirectMessageMutation.isPending || !dmTarget || !dmPayload}
                                >
                                    SEND MESSAGE
                                </Button>
                            </Card>

                            <Card className="flex-1 min-h-0 bg-slate-900 border-slate-800 shadow-inner overflow-hidden flex flex-col">
                                <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Telemetry Feed (SSE-over-HTTP:3001)</span>
                                    <div className="flex space-x-2">
                                        <div className="w-1 h-3 bg-cyan-500 animate-[bounce_1s_infinite_0ms]" />
                                        <div className="w-1 h-3 bg-cyan-500 animate-[bounce_1s_infinite_100ms]" />
                                        <div className="w-1 h-3 bg-cyan-500 animate-[bounce_1s_infinite_200ms]" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono scrollbar-hide">
                                    {messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center flex-col opacity-20">
                                            <RadioIcon className="w-12 h-12 mb-4 animate-ping" />
                                            <span className="text-xs uppercase tracking-[0.3em]">Listening for Borg Swarm Signals...</span>
                                        </div>
                                    ) : (
                                        messages.map((msg, i) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-3 bg-slate-950 border-l-2 border-cyan-500 rounded-r shadow-lg shadow-black/40"
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${msg.type === 'HEARTBEAT' ? 'bg-blue-900/50 text-blue-400' :
                                                        msg.type === 'DIRECT_MESSAGE' ? 'bg-fuchsia-900/50 text-fuchsia-400' :
                                                            msg.type.startsWith('VERIFY') ? 'bg-purple-900/50 text-purple-400' :
                                                                msg.type.startsWith('TASK') ? 'bg-amber-900/50 text-amber-400' :
                                                                    'bg-slate-800 text-slate-400'
                                                        }`}>
                                                        {msg.type}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="text-[10px] flex gap-4 text-slate-300">
                                                    <div className="flex-1 truncate"><span className="text-slate-600">FROM:</span> {msg.sender}</div>
                                                    {msg.target && <div className="flex-1 truncate"><span className="text-slate-600">TO:</span> {msg.target}</div>}
                                                </div>
                                                <div className="mt-2 text-[10px] bg-black/30 p-2 rounded text-cyan-200/50 overflow-x-auto">
                                                    {typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload)}
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
