"use client";

import { useState } from "react";
import { trpc } from "@/utils/trpc";
import { Loader2, Play, Square, Settings2, RefreshCw } from "lucide-react";

type LoopType = "test" | "lint" | "build";
type LoopStatus = "running" | "success" | "failed" | "cancelled";

interface AutoDevLoop {
    id: string;
    config: {
        type: LoopType;
        maxAttempts: number;
        target?: string;
    };
    status: LoopStatus;
    currentAttempt: number;
    startTime: number;
    lastOutput: string;
}

function isLoopType(value: string): value is LoopType {
    return value === "test" || value === "lint" || value === "build";
}

export default function AutoDevPage() {
    const [type, setType] = useState<LoopType>("test");
    const [maxAttempts, setMaxAttempts] = useState<number>(5);
    const [target, setTarget] = useState<string>("");
    const [command, setCommand] = useState<string>("");

    const utils = trpc.useUtils();
    const { data: loopsData, isLoading: loopsLoading } = trpc.autoDev.getLoops.useQuery(undefined, {
        refetchInterval: 2000,
    });
    const loops: AutoDevLoop[] = Array.isArray(loopsData) ? (loopsData as AutoDevLoop[]) : [];

    const startLoop = trpc.autoDev.startLoop.useMutation({
        onSuccess: () => {
            utils.autoDev.getLoops.invalidate();
        },
    });

    const cancelLoop = trpc.autoDev.cancelLoop.useMutation({
        onSuccess: () => {
            utils.autoDev.getLoops.invalidate();
        },
    });

    const clearCompleted = trpc.autoDev.clearCompleted.useMutation({
        onSuccess: () => {
            utils.autoDev.getLoops.invalidate();
        },
    });

    const handleStart = () => {
        startLoop.mutate({
            type,
            maxAttempts,
            target: target || undefined,
            command: command || undefined,
        });
    };

    return (
        <div className="p-8 space-y-8 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Auto-Dev Loops</h1>
                <p className="text-zinc-500">Autonomous iterative development cycles (test/fix, lint/fix, build/fix)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="col-span-1 border border-zinc-800 bg-zinc-900 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-medium text-zinc-200 border-b border-zinc-800 pb-2">Start New Loop</h2>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Loop Type</label>
                            <select
                                value={type}
                                onChange={(e) => {
                                    if (isLoopType(e.target.value)) {
                                        setType(e.target.value);
                                    }
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200"
                            >
                                <option value="test">Test & Fix</option>
                                <option value="lint">Lint & Fix</option>
                                <option value="build">Build & Fix</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Max Attempts</label>
                            <input
                                type="number"
                                min="1" max="10"
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 5)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Target Package/Path (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. packages/core"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Custom Command (Optional)</label>
                            <input
                                type="text"
                                placeholder="Override default tool command"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700"
                            />
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={startLoop.isPending}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {startLoop.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Initialize Auto-Dev
                        </button>
                    </div>
                </div>

                {/* Active Loops */}
                <div className="col-span-1 md:col-span-2 border border-zinc-800 bg-zinc-900 rounded-xl p-6 flex flex-col">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4">
                        <h2 className="text-lg font-medium text-zinc-200">Active & Recent Loops</h2>
                        <button
                            onClick={() => clearCompleted.mutate()}
                            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <RefreshCw className="w-3 h-3" /> Clear Completed
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto space-y-3">
                        {loopsLoading ? (
                            <div className="flex justify-center items-center h-32">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                            </div>
                        ) : loops.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                                <Settings2 className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-sm">No auto-dev loops running</p>
                            </div>
                        ) : (
                            loops.map((loop) => (
                                <div key={loop.id} className="border border-zinc-800 bg-zinc-950 rounded-lg p-4 flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${loop.status === 'running' ? 'bg-indigo-500 animate-pulse' :
                                                    loop.status === 'success' ? 'bg-green-500' :
                                                        loop.status === 'failed' ? 'bg-red-500' : 'bg-zinc-500'
                                                }`} />
                                            <span className="font-medium text-zinc-200 capitalize">{loop.config.type} Loop</span>
                                            <span className="text-xs font-mono text-zinc-500 ml-2">{loop.id.split('-')[0]}</span>
                                        </div>
                                        {loop.status === 'running' && (
                                            <button
                                                onClick={() => cancelLoop.mutate({ loopId: loop.id })}
                                                className="text-zinc-500 hover:text-red-400 transition-colors"
                                                title="Cancel Loop"
                                            >
                                                <Square className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                                        <span>Status: <strong className={
                                            loop.status === 'success' ? 'text-green-400' :
                                                loop.status === 'failed' ? 'text-red-400' : 'text-zinc-300'
                                        }>{loop.status}</strong></span>
                                        <span>Attempt: <strong className="text-zinc-300">{loop.currentAttempt} / {loop.config.maxAttempts}</strong></span>
                                        {loop.config.target && <span>Target: <strong className="text-zinc-300 truncate max-w-[150px] inline-block align-bottom">{loop.config.target}</strong></span>}
                                    </div>

                                    {loop.lastOutput && (
                                        <div className="mt-2 text-xs font-mono bg-zinc-900 p-2 rounded text-zinc-500 max-h-24 overflow-y-auto">
                                            Latest: {loop.lastOutput.substring(0, 100)}...
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
