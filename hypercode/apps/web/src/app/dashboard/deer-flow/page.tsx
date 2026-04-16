"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@hypercode/ui";
import { Loader2, ExternalLink, Activity, BrainCircuit, Box, Workflow, Network, Cable, ShieldAlert } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { PageStatusBanner } from "@/components/PageStatusBanner";

function isDeerFlowStatus(value: unknown): value is { active: boolean } {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { active?: unknown }).active === 'boolean';
}

type DeerFlowModel = {
    name?: string;
    display_name?: string;
    model?: string;
};

type DeerFlowSkill = {
    name?: string;
    enabled?: boolean;
};

function isDeerFlowModel(value: unknown): value is DeerFlowModel {
    return typeof value === 'object'
        && value !== null
        && (
            (value as { name?: unknown }).name === undefined
            || typeof (value as { name?: unknown }).name === 'string'
        )
        && (
            (value as { display_name?: unknown }).display_name === undefined
            || typeof (value as { display_name?: unknown }).display_name === 'string'
        )
        && (
            (value as { model?: unknown }).model === undefined
            || typeof (value as { model?: unknown }).model === 'string'
        );
}

function isDeerFlowSkill(value: unknown): value is DeerFlowSkill {
    return typeof value === 'object'
        && value !== null
        && (
            (value as { name?: unknown }).name === undefined
            || typeof (value as { name?: unknown }).name === 'string'
        )
        && (
            (value as { enabled?: unknown }).enabled === undefined
            || typeof (value as { enabled?: unknown }).enabled === 'boolean'
        );
}

function isDeerFlowModelsPayload(value: unknown): value is { models: DeerFlowModel[] } {
    return typeof value === 'object'
        && value !== null
        && Array.isArray((value as { models?: unknown }).models)
        && ((value as { models: unknown[] }).models).every(isDeerFlowModel);
}

function isDeerFlowSkillsPayload(value: unknown): value is { skills: DeerFlowSkill[] } {
    return typeof value === 'object'
        && value !== null
        && Array.isArray((value as { skills?: unknown }).skills)
        && ((value as { skills: unknown[] }).skills).every(isDeerFlowSkill);
}

export default function DeerFlowDashboard() {
    const { data: status, isLoading: isStatusLoading, error: statusError } = trpc.deerFlow.status.useQuery(undefined, { refetchInterval: 10000 });
    const statusUnavailable = Boolean(statusError) || (status !== undefined && !isDeerFlowStatus(status));
    const statusData = !statusUnavailable && isDeerFlowStatus(status) ? status : undefined;
    const { data: models, isLoading: isModelsLoading, error: modelsError } = trpc.deerFlow.models.useQuery(undefined, { enabled: Boolean(statusData?.active) });
    const { data: skills, isLoading: isSkillsLoading, error: skillsError } = trpc.deerFlow.skills.useQuery(undefined, { enabled: Boolean(statusData?.active) });

    const [isIframeActive, setIsIframeActive] = useState(false);
    const deerFlowUrl = process.env.NEXT_PUBLIC_DEER_FLOW_URL || 'http://localhost:2026';
    const modelsUnavailable = Boolean(modelsError) || (models !== undefined && !isDeerFlowModelsPayload(models));
    const skillsUnavailable = Boolean(skillsError) || (skills !== undefined && !isDeerFlowSkillsPayload(skills));
    const modelRows: DeerFlowModel[] = !modelsUnavailable && isDeerFlowModelsPayload(models) ? models.models : [];
    const skillRows: DeerFlowSkill[] = !skillsUnavailable && isDeerFlowSkillsPayload(skills) ? skills.skills : [];

    const isLoading = isStatusLoading || isModelsLoading || isSkillsLoading;

    if (isLoading && !status) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
    }

    if (isIframeActive && statusData?.active) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="bg-zinc-950 border-b border-zinc-800 p-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        <Network className="w-5 h-5 text-fuchsia-500" />
                        <span className="font-bold tracking-widest text-white">DEER-FLOW SUPER AGENT HARNESS</span>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 ml-2">CONNECTED</Badge>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(deerFlowUrl, '_blank')} className="border-zinc-700">
                            <ExternalLink className="w-4 h-4 mr-2" /> Pop Out
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsIframeActive(false)} className="border-zinc-700">
                            Close
                        </Button>
                    </div>
                </div>
                <iframe
                    src={deerFlowUrl}
                    className="w-full flex-1 border-none bg-black"
                    title="DeerFlow Interface"
                />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Network className="h-8 w-8 text-fuchsia-500" />
                        DeerFlow Integration Node
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Super Agent harness orchestrating sub-agents, memory, and sandboxes via LangGraph.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant={statusUnavailable ? "destructive" : statusData?.active ? "default" : "destructive"} className={statusUnavailable ? "text-sm py-1 px-3" : statusData?.active ? "bg-emerald-500 hover:bg-emerald-600 text-sm py-1 px-3" : "text-sm py-1 px-3"}>
                        {statusUnavailable ? (
                            <><ShieldAlert className="w-4 h-4 mr-2" /> Gateway Unavailable</>
                        ) : statusData?.active ? (
                            <><Activity className="w-4 h-4 mr-2" /> Gateway Connected ({process.env.NEXT_PUBLIC_DEER_FLOW_API_URL || '8001'})</>
                        ) : (
                            <><ShieldAlert className="w-4 h-4 mr-2" /> Gateway Offline</>
                        )}
                    </Badge>

                            <PageStatusBanner
                                status="experimental"
                                message="DeerFlow is an external LangGraph agent harness. This page requires the DeerFlow service to be running independently."
                                note="Full HyperCode-native orchestration is planned for a future release."
                            />
                </div>
            </div>

            {statusUnavailable ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {statusError?.message ?? 'DeerFlow status returned an invalid payload.'}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Launch Action */}
                <Card className={`md:col-span-3 border-2 ${statusData?.active ? 'border-fuchsia-500/50 bg-fuchsia-950/10' : 'border-zinc-800 bg-zinc-900'} shadow-xl`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Workflow className={`h-6 w-6 ${statusData?.active ? 'text-fuchsia-400 animate-pulse' : 'text-zinc-500'}`} />
                            Workspace Engagement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <p className="text-zinc-400">
                            Launch the DeerFlow interface to spawn background sub-agent swarms, browse the sandboxed file system, and manage long-term cross-session memory threads.
                        </p>
                        <div className="flex gap-4">
                            <Button
                                onClick={() => setIsIframeActive(true)}
                                disabled={!statusData?.active}
                                className="flex-1 py-6 font-bold tracking-widest bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
                            >
                                <Cable className="w-5 h-5 mr-3" /> INITIALIZE EMBEDDED HARNESS
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.open(deerFlowUrl, '_blank')}
                                disabled={!statusData?.active}
                                className="py-6 px-8 border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Models Status */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-md font-bold flex items-center gap-2 text-zinc-300">
                            <BrainCircuit className="h-4 w-4 text-blue-400" />
                            Available Models
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {statusUnavailable ? (
                            <div className="text-sm text-red-300">{statusError?.message ?? 'DeerFlow status returned an invalid payload.'}</div>
                        ) : statusData?.active ? (
                            <ul className="space-y-2">
                                {modelsUnavailable ? (
                                    <li className="text-sm text-red-300">{modelsError?.message ?? 'Model inventory is unavailable.'}</li>
                                ) : null}
                                {modelRows.map((m, i) => (
                                    <li key={i} className="text-sm flex justify-between items-center border-b border-zinc-800 pb-2 last:border-0">
                                        <span className="text-zinc-300">{m.display_name || m.name}</span>
                                        <Badge variant="outline" className="text-xs bg-zinc-950 border-zinc-800 text-zinc-500">{m.model}</Badge>
                                    </li>
                                ))}
                                {!modelsUnavailable && modelRows.length === 0 && <li className="text-sm text-zinc-600">No models configured.</li>}
                            </ul>
                        ) : (
                            <div className="text-sm text-zinc-600 italic">Offline</div>
                        )}
                    </CardContent>
                </Card>

                {/* Skills Status */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-md font-bold flex items-center gap-2 text-zinc-300">
                            <Box className="h-4 w-4 text-emerald-400" />
                            Loaded Skills
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {statusUnavailable ? (
                            <div className="text-sm text-red-300">{statusError?.message ?? 'DeerFlow status returned an invalid payload.'}</div>
                        ) : statusData?.active ? (
                            <ul className="space-y-2">
                                {skillsUnavailable ? (
                                    <li className="text-sm text-red-300">{skillsError?.message ?? 'Skill inventory is unavailable.'}</li>
                                ) : null}
                                {skillRows.map((s, i) => (
                                    <li key={i} className="text-sm flex justify-between items-center border-b border-zinc-800 pb-2 last:border-0">
                                        <span className="text-zinc-300 capitalize">{s.name?.replace(/-/g, ' ')}</span>
                                        <Badge variant="outline" className={s.enabled ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-zinc-500 border-zinc-800"}>
                                            {s.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </li>
                                ))}
                                {!skillsUnavailable && skillRows.length === 0 && <li className="text-sm text-zinc-600">No skills loaded.</li>}
                            </ul>
                        ) : (
                            <div className="text-sm text-zinc-600 italic">Offline</div>
                        )}
                    </CardContent>
                </Card>

                {/* Memory Status overview box */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-md font-bold flex items-center gap-2 text-zinc-300">
                            <Activity className="h-4 w-4 text-orange-400" />
                            Agent Architecture
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 text-sm text-zinc-400 space-y-3">
                        <p>DeerFlow utilizes LangGraph to bind isolated Agent threads. It proxies file system modifications via a localized Sandbox Engine Provider.</p>
                        <p className="text-xs border-t border-zinc-800 pt-3">
                            <strong>Note:</strong> Requires `make dev` execution within the `external/deer-flow` submodule directory to initialize Python hypervisors.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
