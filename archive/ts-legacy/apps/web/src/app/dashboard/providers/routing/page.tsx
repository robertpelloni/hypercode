"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/utils/trpc";
import { PageStatusBanner } from "@/components/PageStatusBanner";
import { Network, ArrowUp, ArrowDown, Save, ShieldAlert, Cpu } from "lucide-react";
import { toast } from "sonner";
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/app/dashboard/providers/routing/page.tsx
import { Button } from "@hypercode/ui";
=======
import { Button } from "@borg/ui";
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/app/dashboard/providers/routing/page.tsx

interface CouncilMember {
    name: string;
    provider: string;
    modelId: string;
    systemPrompt: string;
}

function isCouncilMember(value: unknown): value is CouncilMember {
    return typeof value === "object"
        && value !== null
        && typeof (value as { name?: unknown }).name === "string"
        && typeof (value as { provider?: unknown }).provider === "string"
        && typeof (value as { modelId?: unknown }).modelId === "string"
        && typeof (value as { systemPrompt?: unknown }).systemPrompt === "string";
}

export default function RoutingConfigurationPage() {
    const [chain, setChain] = useState<CouncilMember[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const membersQuery = trpc.council.members.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const updateMembersMutation = trpc.council.updateMembers.useMutation({
        onSuccess: () => {
            toast.success("Routing Chain Saved", {
                description: "The global LLM fallback hierarchy has been securely flushed to disk.",
            });
            setIsSaving(false);
            membersQuery.refetch();
        },
        onError: (err) => {
            toast.error("Failed to update routing", { description: err.message });
            setIsSaving(false);
        }
    });

    const membersUnavailable = membersQuery.isError
        || (
            membersQuery.data !== undefined
            && (
                !Array.isArray(membersQuery.data)
                || !membersQuery.data.every(isCouncilMember)
            )
        );

    useEffect(() => {
        if (!membersUnavailable && Array.isArray(membersQuery.data)) {
            // Clone to avoid mutating TRPC cache
            setChain(JSON.parse(JSON.stringify(membersQuery.data)));
            return;
        }

        if (membersUnavailable) {
            setChain([]);
        }
    }, [membersQuery.data, membersUnavailable]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newChain = [...chain];
        const temp = newChain[index - 1];
        newChain[index - 1] = newChain[index];
        newChain[index] = temp;
        setChain(newChain);
    };

    const moveDown = (index: number) => {
        if (index === chain.length - 1) return;
        const newChain = [...chain];
        const temp = newChain[index + 1];
        newChain[index + 1] = newChain[index];
        newChain[index] = temp;
        setChain(newChain);
    };

    const handleSave = () => {
        setIsSaving(true);
        updateMembersMutation.mutate(chain);
    };

    if (membersQuery.isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <p className="text-zinc-500 animate-pulse">Synchronizing network fabric...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-black text-white overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 p-4 border-b border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Network className="h-5 w-5 text-cyan-400" />
                        Routing Hierarchy
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        Configure exact fallback priority for AI provider execution paths during quota exhaustion blocks.
                    </p>
                </div>
                <div>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving || membersUnavailable}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white border-none flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Flushing..." : "Save Route Priorities"}
                    </Button>
                </div>
            </div>

            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
                <PageStatusBanner
                    status="experimental"
                    message="Global LLM Fallback Quotas"
                    note="When an API 402/429 HTTP starvation error blocks execution, the orchestrator cascades automatically down this exact list."
                />
            </div>

            <div className="flex-1 p-4 max-w-4xl mx-auto w-full mt-4">
                <h3 className="text-lg font-semibold mb-4 text-zinc-100 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                    Cascading Recovery Chain
                </h3>

                {membersUnavailable ? (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300">
                        {membersQuery.error?.message ?? "Routing hierarchy is unavailable due to malformed data."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {chain.map((member, idx) => (
                            <div 
                                key={`${member.provider}-${member.modelId}-${idx}`} 
                                className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-lg shadow-sm"
                            >
                                {/* Priority Identifier */}
                                <div className="flex flex-col items-center justify-center shrink-0 w-8 h-8 rounded-full bg-zinc-950 border border-zinc-700 font-mono text-zinc-400">
                                    {idx + 1}
                                </div>

                                {/* Core Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Cpu className="h-4 w-4 text-emerald-400" />
                                        <span className="font-semibold text-zinc-100">{member.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                            {member.provider}
                                        </span>
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono">
                                        {member.modelId}
                                    </div>
                                </div>

                                {/* Reordering Controls */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                        onClick={() => moveUp(idx)}
                                        disabled={idx === 0}
                                        className={`p-1.5 rounded border transition-colors ${
                                            idx === 0 
                                            ? "border-transparent text-zinc-700 cursor-not-allowed" 
                                            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                        }`}
                                    >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => moveDown(idx)}
                                        disabled={idx === chain.length - 1}
                                        className={`p-1.5 rounded border transition-colors ${
                                            idx === chain.length - 1 
                                            ? "border-transparent text-zinc-700 cursor-not-allowed" 
                                            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                        }`}
                                    >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 p-4 rounded bg-blue-950/20 border border-blue-900/30">
                    <p className="text-sm text-blue-300 font-medium">Design Protocol</p>
                    <p className="text-xs text-blue-400/70 mt-1">
                        Place cheapest/local models at the bottom. If OpenAI & Anthropic exhaust their budgets symmetrically, the orchestrator will securely failover to local LMStudio weights mapped at priority N. 
                    </p>
                </div>
            </div>
        </div>
    );
}
