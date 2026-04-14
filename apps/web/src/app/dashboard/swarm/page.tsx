'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageStatusBanner } from '@/components/PageStatusBanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Textarea } from '@hypercode/ui';
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

    // Phase 96/98
    deniedToolEvents?: Array<{
        tool: string;
        reason: string;
        timestamp: number;
    }>;

    // Phase 124
    isRedTeam?: boolean;
}

interface SwarmToolPolicy {
    allow?: string[];
    deny?: string[];
}

interface StartSwarmFeedback {
    missionId?: string;
    taskCount?: number;
    effectiveToolPolicy?: SwarmToolPolicy;
    policyWarnings?: string[];
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

interface SwarmPolicyContext {
    effectiveToolPolicy?: {
        allow?: string[];
        deny?: string[];
    };
    policyWarnings?: string[];
    capturedAt?: number;
}

interface MissionRiskSummary {
    totalMissions: number;
    missionsWithDeniedEvents: number;
    totalDeniedEvents: number;
    topRiskMission: {
        missionId: string;
        deniedEventCount: number;
    } | null;
    severityScore: number;
    topDeniedTools: Array<{ tool: string; count: number }>;
    statusBreakdown: {
        active: number;
        completed: number;
        failed: number;
        paused: number;
    };
    deniedEventsLast24h: number;
    deniedEventsByHour24: Array<{ hourOffset: number; count: number }>;
}

type MissionStatusFilter = 'all' | SwarmMission['status'];

interface MissionRiskRow {
    mission: SwarmMission;
    deniedEventCount: number;
    deniedEventsLast24h: number;
    missionRiskScore: number;
}

interface MissionRiskFacets {
    missionCount: number;
    averageRisk: number;
    maxRisk: number;
    minObservedRisk: number;
    dominantBand: 'low' | 'medium' | 'high';
    health: {
        severity: 'good' | 'warn' | 'critical';
        score: number;
        reasons: string[];
        recommendedAction: string;
        confidence: {
            score: number;
            level: 'high' | 'medium' | 'low';
            drivers: string[];
            inputs: {
                missionCount: number;
                healthReasonCount: number;
                freshnessBucket: 'fresh' | 'recent' | 'stale' | 'unknown';
                evaluatedAt: number;
            };
            components: {
                sampleSizePenalty: number;
                freshnessPenalty: number;
                signalCongestionPenalty: number;
                totalPenalty: number;
            };
            uncertaintyMargin: number;
            scoreRange: {
                min: number;
                max: number;
            };
            stability: 'stable' | 'watch' | 'volatile';
            advice: string;
            alertLevel: 'none' | 'warn' | 'critical';
            alertCount: number;
            hasCriticalAlert: boolean;
            alerts: string[];
        };
    };
    activity: {
        deniedLast24h: number;
        deniedPrev24h: number;
        deniedDelta: number;
        deniedDeltaPct: number;
        deniedTrend: 'up' | 'down' | 'flat';
    };
    freshness: {
        generatedAt: number;
        latestMissionUpdatedAt: number | null;
        latestUpdateAgeSeconds: number | null;
        freshnessBucket: 'fresh' | 'recent' | 'stale' | 'unknown';
    };
    statusDistribution: {
        counts: {
            active: number;
            completed: number;
            failed: number;
            paused: number;
        };
        percentages: {
            active: number;
            completed: number;
            failed: number;
            paused: number;
        };
    };
    bands: {
        low: number;
        medium: number;
        high: number;
    };
    bandPercentages: {
        low: number;
        medium: number;
        high: number;
    };
}

interface MeshStatus {
    nodeId: string;
    peersCount: number;
}

interface RemoteMeshCapabilities {
    capabilities: string[];
    role?: string;
    load?: number;
    cachedAt: number;
}

interface MatchingMeshPeer {
    nodeId: string;
    capabilities: string[];
    role?: string;
    load?: number;
}

function parseCommaSeparatedList(input: string): string[] {
    return input
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
}

type DebateMode = 'standard' | 'adversarial';
type DebateTopicType = 'general' | 'mission-plan';

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
    const missionRiskSummaryQuery = (trpc.swarm as any).getMissionRiskSummary.useQuery(undefined, {
        refetchInterval: 5000
    });
    const meshCapabilitiesQuery = (trpc.swarm as any).getMeshCapabilities.useQuery(undefined, {
        refetchInterval: 10000
    });
    const meshStatusQuery = (trpc.mesh as any).getStatus.useQuery(undefined, {
        refetchInterval: 10000
    });
    const meshPeersQuery = (trpc.mesh as any).getPeers.useQuery(undefined, {
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
    const [policyAllowInput, setPolicyAllowInput] = useState("");
    const [policyDenyInput, setPolicyDenyInput] = useState("");
    const [selectedMeshNode, setSelectedMeshNode] = useState('');
    const [meshCapabilitySearchInput, setMeshCapabilitySearchInput] = useState('git');
    const [lastLaunchFeedback, setLastLaunchFeedback] = useState<StartSwarmFeedback | null>(null);
    const [showDeniedOnly, setShowDeniedOnly] = useState(false);
    const [sortMissionsByRisk, setSortMissionsByRisk] = useState(true);
    const [missionStatusFilter, setMissionStatusFilter] = useState<MissionStatusFilter>('all');
    const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);
    const [riskThresholdInput, setRiskThresholdInput] = useState('50');
    const parsedRiskThreshold = Number.parseInt(riskThresholdInput, 10);
    const riskThreshold = Number.isFinite(parsedRiskThreshold)
        ? Math.max(0, Math.min(100, parsedRiskThreshold))
        : 50;
    const missionRiskRowsQuery = (trpc.swarm as any).getMissionRiskRows.useQuery({
        statusFilter: missionStatusFilter,
        sortBy: sortMissionsByRisk ? 'risk' : 'recent',
        minRisk: showHighRiskOnly ? riskThreshold : undefined
    }, {
        refetchInterval: 5000
    });
    const requiredMeshCapabilities = parseCommaSeparatedList(meshCapabilitySearchInput);
    const remoteMeshCapabilitiesQuery = (trpc.mesh as any).queryCapabilities.useQuery({
        nodeId: selectedMeshNode,
        timeoutMs: 3000
    }, {
        enabled: !!selectedMeshNode,
        refetchInterval: selectedMeshNode ? 10000 : false
    });
    const meshCapabilityMatchQuery = (trpc.mesh as any).findPeerForCapabilities.useQuery({
        requiredCapabilities: requiredMeshCapabilities,
        timeoutMs: 3000
    }, {
        enabled: requiredMeshCapabilities.length > 0,
        refetchInterval: requiredMeshCapabilities.length > 0 ? 10000 : false
    });
    const missionRiskFacetsQuery = (trpc.swarm as any).getMissionRiskFacets.useQuery({
        statusFilter: missionStatusFilter,
        minRisk: showHighRiskOnly ? riskThreshold : undefined
    }, {
        refetchInterval: 5000
    });

    // Initial SSE Connection
    useEffect(() => {
        // Core SSE port is 3001
        // Resolve SSE endpoint from environment, falling back to local dev default.
        const sseBase = process.env.NEXT_PUBLIC_CORE_SSE_URL || 'http://localhost:3001';
        const eventSource = new EventSource(`${sseBase}/api/mesh/stream`);

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

    useEffect(() => {
        const peers = (meshPeersQuery.data ?? []) as string[];
        if (peers.length === 0) {
            if (selectedMeshNode) {
                setSelectedMeshNode('');
            }
            return;
        }

        if (!selectedMeshNode || !peers.includes(selectedMeshNode)) {
            setSelectedMeshNode(peers[0]);
        }
    }, [meshPeersQuery.data, selectedMeshNode]);

    // Swarm State
    const [swarmPrompt, setSwarmPrompt] = useState('Build a Next.js landing page with Stripe integration and a dark mode toggle.');
    const startSwarmMutation = trpc.swarm.startSwarm.useMutation({
        onSuccess: () => missionHistoryQuery.refetch()
    });
    const launchMutation = trpc.swarm.startSwarm.useMutation({
        onSuccess: (data: StartSwarmFeedback) => {
            setLastLaunchFeedback(data);
            missionHistoryQuery.refetch();
        }
    });

    // Debate State
    const [debateTopic, setDebateTopic] = useState('Monorepo vs Polyrepo for enterprise scalability');
    const [debateMode, setDebateMode] = useState<DebateMode>('adversarial');
    const [debateTopicType, setDebateTopicType] = useState<DebateTopicType>('mission-plan');
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
            rounds: 2,
            mode: debateMode,
            topicType: debateTopicType
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

    const riskSummary = missionRiskSummaryQuery.data as MissionRiskSummary | undefined;
    const hourlyDenied = riskSummary?.deniedEventsByHour24 ?? [];
    const maxHourlyDenied = hourlyDenied.reduce((max, point) => Math.max(max, point.count), 0) || 1;
    const missionCards = (missionRiskRowsQuery.data ?? []) as MissionRiskRow[];
    const riskFacets = missionRiskFacetsQuery.data as MissionRiskFacets | undefined;
    const meshStatus = meshStatusQuery.data as MeshStatus | undefined;
    const meshPeers = (meshPeersQuery.data ?? []) as string[];
    const meshCapabilityMap = (meshCapabilitiesQuery.data ?? {}) as Record<string, string[]>;
    const selectedPeerDetails = remoteMeshCapabilitiesQuery.data as RemoteMeshCapabilities | undefined;
    const matchingPeer = meshCapabilityMatchQuery.data as MatchingMeshPeer | null | undefined;
    const missionDataLoading =
        missionRiskSummaryQuery.isLoading ||
        missionRiskRowsQuery.isLoading ||
        missionRiskFacetsQuery.isLoading;
    const missionDataErrors = [
        missionRiskSummaryQuery.isError ? 'risk summary' : null,
        missionRiskRowsQuery.isError ? 'mission rows' : null,
        missionRiskFacetsQuery.isError ? 'risk facets' : null,
    ].filter((value): value is string => Boolean(value));
    const missionDataUnavailable = missionDataErrors.length > 0;

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 space-y-6 overflow-hidden">
            <PageHeader
                title="Swarm Orchestration"
                description="Horizontal multi-model delegation, adversarial debates, and consensus voting."
            />
                <PageStatusBanner
                    status="experimental"
                    message="Swarm multi-agent orchestration is experimental. Consensus, slashing, and adversarial debate features are under active development."
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tool Policy: Allow (Optional)</label>
                                        <Input
                                            value={policyAllowInput}
                                            onChange={e => setPolicyAllowInput(e.target.value)}
                                            placeholder="e.g. read_file, browser_get_history"
                                            className="bg-slate-950 border-slate-800 text-sm font-mono text-cyan-400 placeholder-cyan-900/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tool Policy: Deny (Optional)</label>
                                        <Input
                                            value={policyDenyInput}
                                            onChange={e => setPolicyDenyInput(e.target.value)}
                                            placeholder="e.g. run_shell_command"
                                            className="bg-slate-950 border-slate-800 text-sm font-mono text-rose-400 placeholder-rose-900/50"
                                        />
                                    </div>
                                    <Button
                                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold h-12"
                                        onClick={() => (launchMutation.mutate as any)({
                                            masterPrompt,
                                            model: selectedModel,
                                            priority: missionPriority,
                                            tools: requestedTools.split(',').map(t => t.trim()).filter(Boolean),
                                            toolPolicy: {
                                                allow: policyAllowInput.split(',').map(t => t.trim()).filter(Boolean),
                                                deny: policyDenyInput.split(',').map(t => t.trim()).filter(Boolean)
                                            }
                                        })}
                                        disabled={launchMutation.isPending || !masterPrompt}
                                    >
                                        {launchMutation.isPending ? 'DECOMPOSING...' : 'INITIATE SWARM'}
                                    </Button>
                                    {lastLaunchFeedback && (
                                        <div className="space-y-2 rounded border border-slate-800 bg-slate-950 p-2">
                                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Last Launch Feedback</div>
                                            <div className="text-[10px] text-slate-300">
                                                Mission: <span className="font-mono text-cyan-400">{lastLaunchFeedback.missionId || 'n/a'}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-300">
                                                Task Count: <span className="font-mono text-amber-400">{lastLaunchFeedback.taskCount ?? 'n/a'}</span>
                                            </div>
                                            {lastLaunchFeedback.effectiveToolPolicy && (
                                                <pre className="text-[9px] text-cyan-300 bg-black/40 p-2 rounded border border-cyan-900/40 overflow-x-auto">
                                                    {JSON.stringify(lastLaunchFeedback.effectiveToolPolicy, null, 2)}
                                                </pre>
                                            )}
                                            {Array.isArray(lastLaunchFeedback.policyWarnings) && lastLaunchFeedback.policyWarnings.length > 0 && (
                                                <div className="space-y-1">
                                                    {lastLaunchFeedback.policyWarnings.map((warning, idx) => (
                                                        <div key={idx} className="text-[9px] text-rose-300 bg-rose-900/20 border border-rose-500/30 rounded px-2 py-1">
                                                            {warning}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                    <CardTitle className="text-sm uppercase text-slate-500">Mesh Operator Registry</CardTitle>
                                    <CardDescription>Live node health, peer capability cache, and capability matching.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                                        <div className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
                                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Local Mesh Node</div>
                                            <div className="text-[10px] text-slate-300">
                                                Node: <span className="font-mono text-cyan-400">{meshStatus?.nodeId ?? 'loading...'}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-300">
                                                Peers: <span className="font-mono text-emerald-400">{meshStatus?.peersCount ?? 0}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {(meshStatus?.nodeId ? (meshCapabilityMap[meshStatus.nodeId] ?? []) : []).map((tool) => (
                                                    <span key={tool} className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                                        {tool}
                                                    </span>
                                                ))}
                                                {meshStatus?.nodeId && (meshCapabilityMap[meshStatus.nodeId] ?? []).length === 0 && (
                                                    <span className="text-[9px] text-slate-600 italic">No local capabilities advertised.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2 xl:col-span-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Capability Match</div>
                                                    <div className="text-[10px] text-slate-600">Find the first peer that advertises every requested capability.</div>
                                                </div>
                                            </div>
                                            <Input
                                                value={meshCapabilitySearchInput}
                                                onChange={e => setMeshCapabilitySearchInput(e.target.value)}
                                                placeholder="git, research"
                                                className="bg-slate-950 border-slate-800 text-sm font-mono text-emerald-300"
                                            />
                                            <div className="flex flex-wrap gap-1">
                                                {requiredMeshCapabilities.map((capability) => (
                                                    <span key={capability} className="text-[8px] bg-emerald-950/40 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-900/50">
                                                        {capability}
                                                    </span>
                                                ))}
                                                {requiredMeshCapabilities.length === 0 && (
                                                    <span className="text-[9px] text-slate-600 italic">Enter one or more capabilities to search.</span>
                                                )}
                                            </div>
                                            {meshCapabilityMatchQuery.isLoading ? (
                                                <div className="text-[10px] text-slate-500">Searching mesh peers...</div>
                                            ) : matchingPeer ? (
                                                <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2 text-[10px] text-slate-200">
                                                    <div>
                                                        Match: <span className="font-mono text-emerald-300">{matchingPeer.nodeId}</span>
                                                    </div>
                                                    <div>
                                                        Role: <span className="text-cyan-300">{matchingPeer.role ?? 'unknown'}</span>
                                                    </div>
                                                    <div>
                                                        Load: <span className="text-amber-300">{typeof matchingPeer.load === 'number' ? matchingPeer.load : 'unknown'}</span>
                                                    </div>
                                                </div>
                                            ) : requiredMeshCapabilities.length > 0 ? (
                                                <div className="rounded border border-amber-900/40 bg-amber-950/20 p-2 text-[10px] text-amber-200">
                                                    No peer currently matches all requested capabilities.
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Known Nodes</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {Object.keys(meshCapabilityMap).length > 0 ? Object.entries(meshCapabilityMap).map(([nodeId, tools]) => {
                                                    const isLocalNode = nodeId === meshStatus?.nodeId;
                                                    const isSelected = nodeId === selectedMeshNode;
                                                    return (
                                                        <button
                                                            key={nodeId}
                                                            type="button"
                                                            onClick={() => !isLocalNode && setSelectedMeshNode(nodeId)}
                                                            className={`p-3 bg-slate-950 border rounded text-left transition-colors ${isSelected
                                                                ? 'border-cyan-500'
                                                                : 'border-slate-800 hover:border-slate-700'
                                                                } ${isLocalNode ? 'cursor-default' : 'cursor-pointer'}`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-mono text-cyan-500 truncate mr-2">{nodeId}</span>
                                                                <span className={`text-[8px] uppercase tracking-wider ${isLocalNode ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                                    {isLocalNode ? 'local' : 'peer'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(tools as string[]).map((tool: string) => (
                                                                    <span key={tool} className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                                                        {tool}
                                                                    </span>
                                                                ))}
                                                                {(tools as string[]).length === 0 && (
                                                                    <span className="text-[9px] text-slate-600 italic">No capabilities advertised.</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                }) : <div className="text-slate-600 italic text-xs">Scanning mesh for capabilities...</div>}
                                            </div>
                                        </div>

                                        <div className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
                                            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Selected Peer Detail</div>
                                            {!selectedMeshNode ? (
                                                <div className="text-[10px] text-slate-600 italic">Select a peer once one is discovered.</div>
                                            ) : remoteMeshCapabilitiesQuery.isLoading ? (
                                                <div className="text-[10px] text-slate-500">Refreshing remote capability cache for <span className="font-mono">{selectedMeshNode}</span>...</div>
                                            ) : remoteMeshCapabilitiesQuery.isError ? (
                                                <div className="rounded border border-rose-900/40 bg-rose-950/20 p-2 text-[10px] text-rose-200">
                                                    Unable to query <span className="font-mono">{selectedMeshNode}</span> right now.
                                                </div>
                                            ) : selectedPeerDetails ? (
                                                <>
                                                    <div className="text-[10px] text-slate-300">
                                                        Node: <span className="font-mono text-cyan-400">{selectedMeshNode}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-300">
                                                        Role: <span className="text-cyan-300">{selectedPeerDetails.role ?? 'unknown'}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-300">
                                                        Load: <span className="text-amber-300">{typeof selectedPeerDetails.load === 'number' ? selectedPeerDetails.load : 'unknown'}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-300">
                                                        Cached: <span className="text-slate-400">{new Date(selectedPeerDetails.cachedAt).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                        {selectedPeerDetails.capabilities.map((tool) => (
                                                            <span key={tool} className="text-[8px] bg-cyan-950/30 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-900/50">
                                                                {tool}
                                                            </span>
                                                        ))}
                                                        {selectedPeerDetails.capabilities.length === 0 && (
                                                            <span className="text-[9px] text-slate-600 italic">Peer responded without any advertised capabilities.</span>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-[10px] text-slate-600 italic">No remote detail loaded yet.</div>
                                            )}
                                            {meshPeers.length === 0 && (
                                                <div className="rounded border border-slate-800 bg-black/20 p-2 text-[10px] text-slate-500">
                                                    No remote peers are currently known to the local mesh service.
                                                </div>
                                            )}
                                        </div>
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
                            {missionDataLoading && !missionDataUnavailable ? (
                                <div className="flex h-60 items-center justify-center text-slate-500 italic">
                                    Loading mission governance data...
                                </div>
                            ) : missionDataUnavailable ? (
                                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
                                    Mission governance data unavailable: {missionDataErrors.join(', ')}.
                                </div>
                            ) : missionCards.length === 0 ? (
                                <div className="flex h-60 items-center justify-center text-slate-600 italic">
                                    No missions match the current governance filters.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardContent className="pt-4 pb-4">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Total Missions</div>
                                                <div className="text-lg font-mono text-cyan-400">{riskSummary?.totalMissions ?? 0}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardContent className="pt-4 pb-4">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Missions with Denials</div>
                                                <div className="text-lg font-mono text-rose-400">{riskSummary?.missionsWithDeniedEvents ?? 0}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardContent className="pt-4 pb-4">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Total Denied Events</div>
                                                <div className="text-lg font-mono text-rose-300">{riskSummary?.totalDeniedEvents ?? 0}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardContent className="pt-4 pb-4">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Denied (Last 24h)</div>
                                                <div className="text-lg font-mono text-orange-300">{riskSummary?.deniedEventsLast24h ?? 0}</div>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-slate-900 border-slate-800">
                                            <CardContent className="pt-4 pb-4">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Top Risk Mission</div>
                                                <div className="text-[10px] font-mono text-amber-400 truncate" title={riskSummary?.topRiskMission?.missionId || ''}>
                                                    {riskSummary?.topRiskMission
                                                        ? `${riskSummary.topRiskMission.missionId.slice(0, 8)}... (${riskSummary.topRiskMission.deniedEventCount})`
                                                        : 'None'}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card className="bg-slate-900 border-slate-800">
                                        <CardContent className="pt-4 pb-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Governance Severity</div>
                                                <div className="text-xs font-mono text-rose-300">
                                                    {riskSummary?.severityScore ?? 0}/100
                                                </div>
                                            </div>
                                            <div className="h-2 rounded bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-rose-500 transition-all"
                                                    style={{ width: `${riskSummary?.severityScore ?? 0}%` }}
                                                />
                                            </div>

                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Mission Status Breakdown</div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                {[
                                                    { key: 'active', color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' },
                                                    { key: 'completed', color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
                                                    { key: 'failed', color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
                                                    { key: 'paused', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10' }
                                                ].map(item => (
                                                    <div key={item.key} className={`text-[9px] font-mono rounded border px-1.5 py-1 ${item.color}`}>
                                                        {item.key}: {(riskSummary?.statusBreakdown?.[item.key as keyof MissionRiskSummary['statusBreakdown']] ?? 0)}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Denied Events Trend (24h)</div>
                                            <div className="h-14 rounded border border-slate-800 bg-slate-950/60 p-1 flex items-end gap-[2px]">
                                                {hourlyDenied.length > 0 ? (
                                                    hourlyDenied.map((point) => (
                                                        <div
                                                            key={`hour-${point.hourOffset}`}
                                                            title={`${point.hourOffset}h ago: ${point.count}`}
                                                            className="flex-1 bg-rose-500/70 rounded-t"
                                                            style={{ height: `${Math.max(8, Math.round((point.count / maxHourlyDenied) * 100))}%` }}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="text-[9px] text-slate-500 italic w-full text-center my-auto">
                                                        No denied-event trend data yet.
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Top Denied Tools</div>
                                            <div className="flex flex-wrap gap-1">
                                                {(riskSummary?.topDeniedTools || []).length > 0 ? (
                                                    (riskSummary?.topDeniedTools || []).map((item: { tool: string; count: number }) => (
                                                        <span
                                                            key={`${item.tool}-${item.count}`}
                                                            className="text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded"
                                                        >
                                                            {item.tool} ×{item.count}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] text-slate-500 italic">No denied tools recorded.</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-slate-900 border-slate-800">
                                        <CardContent className="pt-4 pb-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[9px] uppercase tracking-widest text-slate-500">Filtered Risk Facets</div>
                                                <div className="text-[10px] font-mono text-cyan-300">
                                                    {riskFacets?.missionCount ?? 0} missions
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    avg: {riskFacets?.averageRisk ?? 0}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    max: {riskFacets?.maxRisk ?? 0}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    min: {riskFacets?.minObservedRisk ?? 0}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-orange-300 border-orange-500/30 bg-orange-500/10">
                                                    threshold: {showHighRiskOnly ? riskThreshold : 0}
                                                </div>
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Risk Bands</div>
                                            <div className="grid grid-cols-3 gap-1">
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                                                    low (&lt;40): {riskFacets?.bands?.low ?? 0} ({riskFacets?.bandPercentages?.low ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    med (40-69): {riskFacets?.bands?.medium ?? 0} ({riskFacets?.bandPercentages?.medium ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-rose-300 border-rose-500/30 bg-rose-500/10">
                                                    high (≥70): {riskFacets?.bands?.high ?? 0} ({riskFacets?.bandPercentages?.high ?? 0}%)
                                                </div>
                                            </div>
                                            <div className="text-[9px] font-mono text-slate-400 mt-1">
                                                dominant: <span className="text-cyan-300">{riskFacets?.dominantBand ?? 'low'}</span>
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Facet Health</div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                <div className={`text-[9px] font-mono rounded border px-1.5 py-1 ${riskFacets?.health?.severity === 'critical'
                                                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                                                    : riskFacets?.health?.severity === 'warn'
                                                        ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                                                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                                                    }`}>
                                                    severity: {riskFacets?.health?.severity ?? 'good'}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    score: {riskFacets?.health?.score ?? 100}
                                                </div>
                                                <div className={`text-[9px] font-mono rounded border px-1.5 py-1 ${riskFacets?.health?.confidence?.level === 'low'
                                                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                                                    : riskFacets?.health?.confidence?.level === 'medium'
                                                        ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                                                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                                                    }`}>
                                                    confidence: {riskFacets?.health?.confidence?.level ?? 'high'} ({riskFacets?.health?.confidence?.score ?? 100})
                                                </div>
                                            </div>
                                            {(riskFacets?.health?.confidence?.drivers?.length || 0) > 0 && (
                                                <div className="space-y-1 mt-1">
                                                    {(riskFacets?.health?.confidence?.drivers || []).slice(0, 3).map((driver, idx) => (
                                                        <div key={`confidence-driver-${idx}`} className="text-[8px] text-cyan-200 bg-cyan-950/20 border border-cyan-500/20 rounded px-1.5 py-1">
                                                            confidence driver: {driver}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    sample penalty: {riskFacets?.health?.confidence?.components?.sampleSizePenalty ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    freshness penalty: {riskFacets?.health?.confidence?.components?.freshnessPenalty ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    signal penalty: {riskFacets?.health?.confidence?.components?.signalCongestionPenalty ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    total penalty: {riskFacets?.health?.confidence?.components?.totalPenalty ?? 0}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    sample n: {riskFacets?.health?.confidence?.inputs?.missionCount ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    reason count: {riskFacets?.health?.confidence?.inputs?.healthReasonCount ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    source freshness: {riskFacets?.health?.confidence?.inputs?.freshnessBucket ?? 'unknown'}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    eval: {riskFacets?.health?.confidence?.inputs?.evaluatedAt ? new Date(riskFacets.health.confidence.inputs.evaluatedAt).toLocaleTimeString() : 'n/a'}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    uncertainty: ±{riskFacets?.health?.confidence?.uncertaintyMargin ?? 0}
                                                </div>
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10 col-span-1 md:col-span-2">
                                                    score range: {riskFacets?.health?.confidence?.scoreRange?.min ?? 0} - {riskFacets?.health?.confidence?.scoreRange?.max ?? 100}
                                                </div>
                                                <div className={`text-[8px] font-mono rounded border px-1.5 py-1 ${riskFacets?.health?.confidence?.stability === 'volatile'
                                                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                                                    : riskFacets?.health?.confidence?.stability === 'watch'
                                                        ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                                                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                                                    }`}>
                                                    stability: {riskFacets?.health?.confidence?.stability ?? 'stable'}
                                                </div>
                                            </div>
                                            <div className="text-[8px] text-indigo-200 bg-indigo-950/20 border border-indigo-500/20 rounded px-1.5 py-1 mt-1">
                                                confidence advice: {riskFacets?.health?.confidence?.advice ?? 'Confidence is stable; proceed while continuing standard monitoring cadence.'}
                                            </div>
                                            <div className={`text-[8px] rounded px-1.5 py-1 mt-1 border font-mono ${riskFacets?.health?.confidence?.alertLevel === 'critical'
                                                ? 'text-rose-200 bg-rose-950/20 border-rose-500/30'
                                                : riskFacets?.health?.confidence?.alertLevel === 'warn'
                                                    ? 'text-amber-200 bg-amber-950/20 border-amber-500/30'
                                                    : 'text-emerald-200 bg-emerald-950/20 border-emerald-500/30'
                                                }`}>
                                                confidence alert level: {riskFacets?.health?.confidence?.alertLevel ?? 'none'}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-1">
                                                <div className="text-[8px] font-mono rounded border px-1.5 py-1 text-rose-200 bg-rose-950/20 border-rose-500/30">
                                                    alert count: {riskFacets?.health?.confidence?.alertCount ?? 0}
                                                </div>
                                                <div className={`text-[8px] font-mono rounded border px-1.5 py-1 ${riskFacets?.health?.confidence?.hasCriticalAlert
                                                    ? 'text-rose-200 bg-rose-950/20 border-rose-500/30'
                                                    : 'text-emerald-200 bg-emerald-950/20 border-emerald-500/30'
                                                    }`}>
                                                    critical present: {riskFacets?.health?.confidence?.hasCriticalAlert ? 'yes' : 'no'}
                                                </div>
                                            </div>
                                            {(riskFacets?.health?.confidence?.alerts?.length || 0) > 0 && (
                                                <div className="space-y-1 mt-1">
                                                    {(riskFacets?.health?.confidence?.alerts || []).slice(0, 3).map((alert, idx) => (
                                                        <div key={`confidence-alert-${idx}`} className="text-[8px] text-rose-200 bg-rose-950/20 border border-rose-500/20 rounded px-1.5 py-1">
                                                            confidence alert: {alert}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="text-[8px] text-cyan-200 bg-cyan-950/20 border border-cyan-500/20 rounded px-1.5 py-1 mt-1">
                                                action: {riskFacets?.health?.recommendedAction ?? 'Continue monitoring current mission mix'}
                                            </div>
                                            {(riskFacets?.health?.reasons?.length || 0) > 0 && (
                                                <div className="space-y-1 mt-1">
                                                    {(riskFacets?.health?.reasons || []).slice(0, 3).map((reason, idx) => (
                                                        <div key={`health-reason-${idx}`} className="text-[8px] text-slate-300 bg-slate-950/60 border border-slate-700 rounded px-1.5 py-1">
                                                            {reason}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Denied Event Momentum (24h vs prior 24h)</div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-rose-300 border-rose-500/30 bg-rose-500/10">
                                                    last24h: {riskFacets?.activity?.deniedLast24h ?? 0}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    prev24h: {riskFacets?.activity?.deniedPrev24h ?? 0}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    Δ: {riskFacets?.activity?.deniedDelta ?? 0} ({riskFacets?.activity?.deniedDeltaPct ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    trend: {riskFacets?.activity?.deniedTrend ?? 'flat'}
                                                </div>
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Facet Freshness</div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    bucket: {riskFacets?.freshness?.freshnessBucket ?? 'unknown'}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-slate-300 border-slate-500/30 bg-slate-500/10">
                                                    age(s): {riskFacets?.freshness?.latestUpdateAgeSeconds ?? 'n/a'}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    generated: {riskFacets?.freshness?.generatedAt ? new Date(riskFacets.freshness.generatedAt).toLocaleTimeString() : 'n/a'}
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                                                    latest mission: {riskFacets?.freshness?.latestMissionUpdatedAt ? new Date(riskFacets.freshness.latestMissionUpdatedAt).toLocaleTimeString() : 'n/a'}
                                                </div>
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Status Distribution (Filtered)</div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                                                    active: {riskFacets?.statusDistribution?.counts?.active ?? 0} ({riskFacets?.statusDistribution?.percentages?.active ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                                                    completed: {riskFacets?.statusDistribution?.counts?.completed ?? 0} ({riskFacets?.statusDistribution?.percentages?.completed ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-rose-300 border-rose-500/30 bg-rose-500/10">
                                                    failed: {riskFacets?.statusDistribution?.counts?.failed ?? 0} ({riskFacets?.statusDistribution?.percentages?.failed ?? 0}%)
                                                </div>
                                                <div className="text-[9px] font-mono rounded border px-1.5 py-1 text-amber-300 border-amber-500/30 bg-amber-500/10">
                                                    paused: {riskFacets?.statusDistribution?.counts?.paused ?? 0} ({riskFacets?.statusDistribution?.percentages?.paused ?? 0}%)
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex flex-wrap justify-end gap-2 items-center">
                                        <select
                                            value={missionStatusFilter}
                                            onChange={(e) => setMissionStatusFilter(e.target.value as MissionStatusFilter)}
                                            className="h-8 rounded border border-slate-700 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-300 px-2"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="failed">Failed</option>
                                            <option value="paused">Paused</option>
                                        </select>
                                        <Button
                                            size="sm"
                                            variant={sortMissionsByRisk ? 'default' : 'ghost'}
                                            className={sortMissionsByRisk ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold' : 'text-slate-400'}
                                            onClick={() => setSortMissionsByRisk(prev => !prev)}
                                        >
                                            {sortMissionsByRisk ? 'Risk-First Order' : 'Recent-First Order'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={showHighRiskOnly ? 'default' : 'ghost'}
                                            className={showHighRiskOnly ? 'bg-orange-600 hover:bg-orange-500 text-white font-bold' : 'text-slate-400'}
                                            onClick={() => setShowHighRiskOnly(prev => !prev)}
                                        >
                                            {showHighRiskOnly ? `High-Risk Only (≥${riskThreshold})` : `Show High-Risk Only (≥${riskThreshold})`}
                                        </Button>
                                        <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1">
                                            <span className="text-[9px] uppercase tracking-wider text-slate-500">Risk ≥</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={riskThresholdInput}
                                                onChange={(e) => setRiskThresholdInput(e.target.value)}
                                                onBlur={() => setRiskThresholdInput(String(riskThreshold))}
                                                className="w-12 h-6 rounded bg-slate-950 border border-slate-700 text-[10px] text-orange-300 font-mono px-1"
                                            />
                                            <div className="flex gap-1">
                                                {[30, 50, 70].map((preset) => (
                                                    <button
                                                        key={preset}
                                                        onClick={() => setRiskThresholdInput(String(preset))}
                                                        className={`text-[8px] px-1.5 py-0.5 rounded border ${riskThreshold === preset
                                                            ? 'bg-orange-500/30 border-orange-400/50 text-orange-200'
                                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-orange-500/40'
                                                            }`}
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={showDeniedOnly ? 'default' : 'ghost'}
                                            className={showDeniedOnly ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'text-slate-400'}
                                            onClick={() => setShowDeniedOnly(prev => !prev)}
                                        >
                                            {showDeniedOnly ? 'Showing Denied-Only Tasks' : 'Show Denied-Only Tasks'}
                                        </Button>
                                    </div>
                                    {missionCards.map(({ mission, deniedEventCount, deniedEventsLast24h, missionRiskScore }) => {
                                        const visibleTasks = showDeniedOnly
                                            ? mission.tasks.filter(task => Array.isArray(task.deniedToolEvents) && task.deniedToolEvents.length > 0)
                                            : mission.tasks;

                                        return (
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
                                                                {deniedEventCount > 0 && (
                                                                    <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 font-bold">
                                                                        <ShieldIcon className="w-2 h-2" />
                                                                        {deniedEventCount} denied tool event{deniedEventCount === 1 ? '' : 's'}
                                                                    </span>
                                                                )}
                                                                <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono">
                                                                    Risk {missionRiskScore}
                                                                </span>
                                                                {deniedEventsLast24h > 0 && (
                                                                    <span className="text-[8px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/40 font-mono">
                                                                        24h {deniedEventsLast24h}
                                                                    </span>
                                                                )}
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
                                                    {(() => {
                                                        const swarmPolicy = (mission.context?._swarmPolicy || null) as SwarmPolicyContext | null;
                                                        if (!swarmPolicy) return null;

                                                        return (
                                                            <div className="mb-4 p-2 rounded border border-cyan-500/20 bg-cyan-950/10 space-y-2">
                                                                <div className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold">Mission Tool Policy</div>
                                                                {swarmPolicy.effectiveToolPolicy && (
                                                                    <pre className="text-[9px] text-cyan-300 bg-black/30 p-2 rounded border border-cyan-900/40 overflow-x-auto">
                                                                        {JSON.stringify(swarmPolicy.effectiveToolPolicy, null, 2)}
                                                                    </pre>
                                                                )}
                                                                {Array.isArray(swarmPolicy.policyWarnings) && swarmPolicy.policyWarnings.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        {swarmPolicy.policyWarnings.map((warning, idx) => (
                                                                            <div key={idx} className="text-[8px] text-rose-300 bg-rose-900/20 border border-rose-500/30 rounded px-2 py-1">
                                                                                {warning}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

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
                                                        {visibleTasks.map((task: SwarmTask) => (
                                                            <div key={task.id} className={`p-2 rounded text-[10px] ${task.isRedTeam
                                                                ? 'bg-rose-950/20 border border-rose-500/30 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]'
                                                                : 'bg-slate-950 border border-slate-800'
                                                                }`}>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="flex items-center gap-1 truncate mr-2">
                                                                        <span className={`text-[8px] px-1 rounded border shrink-0 ${task.priority >= 4 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                                                            'bg-slate-800 text-slate-500 border-slate-700'
                                                                            }`}>
                                                                            P{task.priority || 3}
                                                                        </span>
                                                                        <span className={`font-bold truncate ${task.isRedTeam ? 'text-rose-200' : 'text-slate-500'}`}>{task.description}</span>
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

                                                                    {Array.isArray(task.deniedToolEvents) && task.deniedToolEvents.length > 0 && (
                                                                        <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 rounded border border-rose-500/40 font-bold">
                                                                            DENIED TOOLS: {task.deniedToolEvents.length}
                                                                        </span>
                                                                    )}

                                                                    {task.isRedTeam && (
                                                                        <span className="text-[8px] bg-red-600/20 text-red-500 px-1 rounded border border-red-500/50 font-bold flex items-center gap-1">
                                                                            <ShieldIcon className="w-2 h-2" /> RED TEAM CRITIQUE
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
                                                                        <div className={`${task.isRedTeam
                                                                            ? 'text-rose-100 bg-rose-950/30 border border-rose-500/20 rounded px-2 py-1 mt-2'
                                                                            : 'text-slate-600 italic truncate'
                                                                            }`}>
                                                                            {task.isRedTeam && <div className="text-[8px] uppercase tracking-widest text-rose-400 font-bold mb-1">Adversarial critique</div>}
                                                                            {task.result}
                                                                        </div>
                                                                    )
                                                                }
                                                                {Array.isArray(task.deniedToolEvents) && task.deniedToolEvents.length > 0 && (
                                                                    <div className="mt-2 border-t border-rose-500/20 pt-2 space-y-1">
                                                                        <div className="text-[8px] uppercase tracking-wide text-rose-400 font-bold">Denied Tool Events</div>
                                                                        {task.deniedToolEvents.slice(-3).map((event, idx) => (
                                                                            <div key={`${event.tool}-${event.timestamp}-${idx}`} className="text-[8px] text-rose-300/90 bg-rose-950/20 border border-rose-500/20 rounded px-1.5 py-1">
                                                                                <div className="font-mono text-rose-200">{event.tool}</div>
                                                                                <div className="text-rose-300/80">{event.reason}</div>
                                                                                <div className="text-rose-400/60">{new Date(event.timestamp).toLocaleTimeString()}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {visibleTasks.length === 0 && (
                                                            <div className="col-span-full text-center text-slate-600 italic py-4 text-xs">
                                                                No tasks match the current filter.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 italic">
                                                        <span>Created: {new Date(mission.createdAt).toLocaleString()}</span>
                                                        <span>Updated: {new Date(mission.updatedAt).toLocaleString()}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* DEBATE PANEL */}
                    {activeTab === 'debate' && (
                        <motion.div key="debate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="col-span-1 border-slate-800 bg-slate-900">
                                <CardHeader><CardTitle className="text-rose-400 font-bold uppercase tracking-tighter text-lg">Debate Config</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Debate Mode</div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant={debateMode === 'standard' ? 'default' : 'ghost'} className={debateMode === 'standard' ? 'bg-slate-700' : 'text-slate-400'} onClick={() => setDebateMode('standard')}>
                                                Standard
                                            </Button>
                                            <Button size="sm" variant={debateMode === 'adversarial' ? 'default' : 'ghost'} className={debateMode === 'adversarial' ? 'bg-rose-600 hover:bg-rose-700' : 'text-slate-400'} onClick={() => setDebateMode('adversarial')}>
                                                Red Team
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Topic Shape</div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant={debateTopicType === 'mission-plan' ? 'default' : 'ghost'}
                                                className={debateTopicType === 'mission-plan' ? 'bg-amber-600 hover:bg-amber-500 text-black' : 'text-slate-400'}
                                                onClick={() => {
                                                    setDebateTopicType('mission-plan');
                                                    if (debateTopic.includes('Monorepo vs Polyrepo')) {
                                                        setDebateTopic('Plan a swarm mission to audit MCP tool-policy denials, validate the fixes, and safely roll out the dashboard changes.');
                                                    }
                                                }}
                                            >
                                                Mission Plan
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={debateTopicType === 'general' ? 'default' : 'ghost'}
                                                className={debateTopicType === 'general' ? 'bg-cyan-700 hover:bg-cyan-600' : 'text-slate-400'}
                                                onClick={() => setDebateTopicType('general')}
                                            >
                                                General Topic
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea value={debateTopic} onChange={e => setDebateTopic(e.target.value)} className="bg-slate-950 border-slate-800" />
                                    <div className={`text-[10px] rounded border px-2 py-2 ${debateMode === 'adversarial'
                                        ? 'text-rose-200 bg-rose-950/20 border-rose-500/30'
                                        : 'text-slate-300 bg-slate-950 border-slate-800'
                                        }`}>
                                        {debateMode === 'adversarial'
                                            ? 'Red Team mode biases the opposing model toward concrete breakpoints, hidden dependencies, rollback gaps, and security flaws.'
                                            : 'Standard mode keeps the debate balanced without intentionally hostile critique prompts.'}
                                    </div>
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
                                            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                                                <span className={`rounded border px-2 py-1 ${executeDebateMutation.data.mode === 'adversarial' ? 'border-rose-500/30 bg-rose-950/20 text-rose-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                                                    mode: {executeDebateMutation.data.mode}
                                                </span>
                                                <span className="rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-amber-200">
                                                    topic: {executeDebateMutation.data.topicType}
                                                </span>
                                                <span className="rounded border border-emerald-500/30 bg-emerald-950/20 px-2 py-1 text-emerald-200">
                                                    winner: {executeDebateMutation.data.winner}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded text-emerald-100 text-xs">{executeDebateMutation.data.summary}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {executeDebateMutation.data.personas?.map((persona: any) => (
                                                    <div key={persona.key} className={`rounded border px-2 py-2 text-[10px] ${persona.isAdversarial
                                                        ? 'border-rose-500/30 bg-rose-950/20 text-rose-100'
                                                        : persona.stance === 'judge'
                                                            ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
                                                            : 'border-slate-700 bg-slate-950 text-slate-300'
                                                        }`}>
                                                        <div className="font-bold uppercase tracking-widest text-[9px]">{persona.label}</div>
                                                        <div className="mt-1 opacity-80">{persona.objective}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            {executeDebateMutation.data.history.map((turn: any, i: number) => (
                                                <div key={i} className={`p-3 rounded text-[11px] ${turn.stance === 'judge'
                                                    ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-100'
                                                    : turn.isAdversarial
                                                        ? 'bg-rose-950/20 border border-rose-500/30 text-rose-100'
                                                        : 'bg-slate-950 border border-slate-800 text-slate-300'
                                                    }`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className={`font-bold ${turn.isAdversarial ? 'text-rose-200' : turn.stance === 'judge' ? 'text-emerald-200' : 'text-slate-100'}`}>
                                                            {turn.label || turn.persona}
                                                        </span>
                                                        <span className="text-[9px] uppercase tracking-widest opacity-70">
                                                            round {turn.round} · {turn.model}
                                                        </span>
                                                    </div>
                                                    <div>{turn.argument}</div>
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
                                            <span className="text-xs uppercase tracking-[0.3em]">Listening for HyperCode Swarm Signals...</span>
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
