'use client';

import { trpc } from "@/utils/trpc";
import { useState } from 'react';
import { Card } from '@hypercode/ui';
import { Button } from '@hypercode/ui';
import { Input } from '@hypercode/ui';
import { Textarea } from '@hypercode/ui';
import {
    normalizeSupervisorAutonomyLevel,
    normalizeSupervisorPlan,
    type NormalizedSupervisorTask,
    type SupervisorAutonomyLevel,
} from './supervisor-page-normalizers';
import { PageStatusBanner } from '@/components/PageStatusBanner';

export default function SupervisorPage() {
    const [goal, setGoal] = useState('');
    const [plan, setPlan] = useState<NormalizedSupervisorTask[] | null>(null);
    const [executionLog, setExecutionLog] = useState<string>('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [planUnavailableMessage, setPlanUnavailableMessage] = useState<string | null>(null);

    const decomposeMutation = trpc.supervisor.decompose.useMutation();
    const superviseMutation = trpc.supervisor.supervise.useMutation();

    const autonomyQuery = trpc.autonomy.getLevel.useQuery();
    const { data: autonomyLevel, refetch: refetchAutonomy } = autonomyQuery;
    const setAutonomyMutation = trpc.autonomy.setLevel.useMutation({
        onSuccess: () => refetchAutonomy()
    });
    const activateFullMutation = trpc.autonomy.activateFullAutonomy.useMutation({
        onSuccess: (msg) => {
            setExecutionLog(prev => prev + `\n[System] ${msg}`);
            refetchAutonomy();
        }
    });

    const normalizedAutonomyLevel = normalizeSupervisorAutonomyLevel(autonomyLevel);
    const autonomyUnavailable = autonomyQuery.isError;

    const handleDecompose = async () => {
        if (!goal) return;
        try {
            const result = await decomposeMutation.mutateAsync({ goal });
            if (!Array.isArray(result)) {
                setPlan([]);
                setPlanUnavailableMessage('Supervisor plan unavailable due to malformed data.');
                return;
            }
            setPlan(normalizeSupervisorPlan(result));
            setPlanUnavailableMessage(null);
        } catch (e: any) {
            setPlanUnavailableMessage(`Supervisor plan unavailable: ${e.message}`);
            setExecutionLog(prev => prev + `\n[Error] Decomposition failed: ${e.message}`);
        }
    };

    const handleExecute = async () => {
        if (!goal) return;
        setIsExecuting(true);
        setExecutionLog(prev => prev + `\n[System] Starting supervision of goal: "${goal}"...`);
        try {
            const result = await superviseMutation.mutateAsync({ goal });
            setExecutionLog(prev => prev + `\n${result}`);
        } catch (e: any) {
            setExecutionLog(prev => prev + `\n[Error] Execution failed: ${e.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="p-6 space-y-6 h-full flex flex-col">
            <PageStatusBanner
                status="beta"
                message="Supervisor control surface"
                note="Goal decomposition, autonomy toggles, and execution supervision are live. Richer multi-session orchestration and operator guardrails are still being refined."
            />
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">👮 Supervisor</h1>
                    <p className="text-muted-foreground">
                        Hierarchical task delegation and sub-agent orchestration.
                    </p>
                </div>

                {/* Autonomy Controls */}
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-3 gap-4 items-center">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 font-medium">Autonomy Level</span>
                        <div className="text-sm font-bold text-white uppercase">{autonomyUnavailable ? 'unavailable' : normalizedAutonomyLevel}</div>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={normalizedAutonomyLevel}
                            onChange={(e) => {
                                const selectedLevel = normalizeSupervisorAutonomyLevel(e.target.value) as SupervisorAutonomyLevel;
                                setAutonomyMutation.mutate({ level: selectedLevel });
                            }}
                            disabled={setAutonomyMutation.isPending || autonomyUnavailable}
                            className="bg-zinc-950 border border-zinc-700 text-xs rounded px-2 py-1 text-zinc-300"
                        >
                            <option value="low">Low (Requires Approval)</option>
                            <option value="medium">Medium (Auto-Executes Safe Tools)</option>
                            <option value="high">High (Full Automation)</option>
                        </select>
                        <Button
                            variant="destructive" size="sm" className="h-7 text-xs"
                            onClick={() => activateFullMutation.mutate()}
                            disabled={activateFullMutation.isPending || autonomyUnavailable || normalizedAutonomyLevel === 'high'}
                        >
                            Activate Full
                        </Button>
                    </div>
                </div>
            </div>

            {autonomyUnavailable ? (
                <div className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                    Autonomy level unavailable: {autonomyQuery.error.message}
                </div>
            ) : null}

            <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Mission Control</h2>
                <div className="flex gap-4">
                    <Input
                        placeholder="Enter a high-level goal (e.g., 'Research and summarize the latest React 19 features')"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="flex-1"
                    />
                    <Button onClick={handleDecompose} disabled={!goal || decomposeMutation.isPending}>
                        {decomposeMutation.isPending ? 'Planning...' : 'Plan'}
                    </Button>
                    <Button onClick={handleExecute} disabled={!goal || isExecuting} variant="default">
                        {isExecuting ? 'Supervising...' : 'Execute'}
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Plan View */}
                <Card className="p-6 flex flex-col gap-4 overflow-hidden">
                    <h3 className="font-semibold border-b pb-2">Proposed Plan</h3>
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {planUnavailableMessage ? (
                            <div className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-300">
                                {planUnavailableMessage}
                            </div>
                        ) : null}
                        {!plan && !planUnavailableMessage && <div className="text-muted-foreground italic">No plan generated yet.</div>}
                        {plan?.map((task) => (
                            <div key={task.id} className="border rounded p-3 bg-muted/20">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded uppercase">
                                        {task.assignedTo}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{task.status}</span>
                                </div>
                                <p className="text-sm">{task.description}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Execution Log */}
                <Card className="p-6 flex flex-col gap-4 overflow-hidden">
                    <h3 className="font-semibold border-b pb-2">Execution Log</h3>
                    <div className="flex-1 overflow-y-auto bg-black text-green-400 font-mono text-sm p-4 rounded-md whitespace-pre-wrap">
                        {executionLog || "// Ready for orders..."}
                    </div>
                </Card>
            </div>
        </div>
    );
}
