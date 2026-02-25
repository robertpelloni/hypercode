"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@borg/ui";
import { Loader2, Activity, Play, Square, Target, Crosshair, HelpCircle, ActivitySquare } from "lucide-react";
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

export default function SessionDashboard() {
    const { data: sessionState, isLoading, refetch } = trpc.session.getState.useQuery(undefined, { refetchInterval: 3000 });
    const updateMutation = trpc.session.updateState.useMutation({
        onSuccess: () => {
            toast.success("Session state updated");
            refetch();
        },
        onError: (err) => {
            toast.error(`Update failed: ${err.message}`);
        }
    });

    const clearMutation = trpc.session.clear.useMutation({
        onSuccess: () => {
            toast.success("Session state cleared");
            refetch();
        }
    });

    const [goalInput, setGoalInput] = useState("");
    const [objectiveInput, setObjectiveInput] = useState("");

    // Keep inputs synced with external state changes only if user hasn't typed
    useEffect(() => {
        if (sessionState) {
            if (!goalInput) setGoalInput(sessionState.activeGoal || "");
            if (!objectiveInput) setObjectiveInput(sessionState.lastObjective || "");
        }
    }, [sessionState]);

    const handleSaveGoal = () => {
        updateMutation.mutate({ activeGoal: goalInput });
    };

    const handleSaveObjective = () => {
        updateMutation.mutate({ lastObjective: objectiveInput });
    };

    const toggleAutoDrive = () => {
        if (!sessionState) return;
        updateMutation.mutate({ isAutoDriveActive: !sessionState.isAutoDriveActive });
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <ActivitySquare className="h-8 w-8 text-blue-500" />
                        Execution Session Control
                    </h1>
                    <p className="text-zinc-500 mt-2">
                        Manage global execution state, Auto-Drive toggles, and system goals.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => clearMutation.mutate()} className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                        Reset Session
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Auto-Drive Control */}
                <Card className={`border-2 ${sessionState?.isAutoDriveActive ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-zinc-800 bg-zinc-900'} shadow-xl transition-all`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className={`h-5 w-5 ${sessionState?.isAutoDriveActive ? 'text-emerald-500 animate-pulse' : 'text-zinc-500'}`} />
                                Auto-Drive Engine
                            </div>
                            <Badge variant={sessionState?.isAutoDriveActive ? "default" : "secondary"} className={sessionState?.isAutoDriveActive ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                {sessionState?.isAutoDriveActive ? "ACTIVE" : "PAUSED"}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <p className="text-sm text-zinc-400">
                            When Auto-Drive is active, background agents will continually pull objectives from the queue and execute them without waiting for manual intervention.
                        </p>
                        <Button
                            onClick={toggleAutoDrive}
                            disabled={updateMutation.isPending}
                            className={`w-full py-6 font-bold tracking-widest ${sessionState?.isAutoDriveActive ? 'bg-red-900/50 hover:bg-red-900/80 text-red-400' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                        >
                            {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
                                sessionState?.isAutoDriveActive ? <><Square className="w-4 h-4 mr-2 fill-current" /> STOP AUTO-DRIVE</> : <><Play className="w-4 h-4 mr-2 fill-current" /> ENGAGE AUTO-DRIVE</>}
                        </Button>
                    </CardContent>
                </Card>

                {/* State Dump */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-300">
                            <HelpCircle className="h-5 w-5" />
                            Raw Session State
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="bg-black border border-zinc-800 rounded-md p-4 h-full">
                            <pre className="text-xs text-green-400 font-mono overflow-auto overflow-wrap-anywhere">
                                {JSON.stringify(sessionState, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Goal Management */}
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                            <Target className="h-5 w-5" />
                            Current Operational Goal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <input
                                value={goalInput}
                                onChange={e => setGoalInput(e.target.value)}
                                className="flex-1 bg-black border border-zinc-800 rounded-md p-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Enter global objective for the system..."
                            />
                            <Button onClick={handleSaveGoal} disabled={updateMutation.isPending || goalInput === sessionState?.activeGoal} className="bg-indigo-600 hover:bg-indigo-500">
                                Set Goal
                            </Button>
                        </div>
                        <div className="pt-2 border-t border-zinc-800">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Crosshair className="w-3 h-3" /> Transient Objective
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={objectiveInput}
                                    onChange={e => setObjectiveInput(e.target.value)}
                                    className="flex-1 bg-black border border-zinc-800 rounded-md p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-zinc-600 outline-none"
                                    placeholder="Enter current micro-task..."
                                />
                                <Button variant="secondary" onClick={handleSaveObjective} disabled={updateMutation.isPending || objectiveInput === sessionState?.lastObjective}>
                                    Update
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
