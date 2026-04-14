"use client";
import React from 'react';
import { trpc } from '../utils/trpc';
import { motion } from 'framer-motion';

export function ShellHistoryWidget() {
    const { data: history, error, refetch, isLoading } = trpc.shell.getSystemHistory.useQuery({ limit: 100 }, {
        refetchInterval: 5000
    });
    const historyUnavailable = Boolean(error) || (history !== undefined && !Array.isArray(history));
    const safeHistory = !historyUnavailable ? ((history as any[] | undefined) ?? []) : [];

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-4 h-full flex flex-col">
            {/* Background Glow */}
            <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-yellow-500 to-orange-500 blur-3xl" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🐚</span>
                        Shell History
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refetch()}
                            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-all"
                        >
                            ↻ Refresh
                        </button>
                        <span className="text-[10px] px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full font-mono">
                            PowerShell
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs custom-scrollbar min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full"
                            />
                        </div>
                    ) : historyUnavailable ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-300">
                            <span className="text-4xl mb-2 opacity-70">🐚</span>
                            <p className="text-sm">Shell history unavailable</p>
                            <p className="text-[10px] px-4 text-center text-red-200/80">{error?.message ?? 'Shell history returned an invalid payload.'}</p>
                        </div>
                    ) : safeHistory.length > 0 ? (
                        safeHistory.slice().reverse().map((cmd: string, i: number) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="flex gap-3 p-2 bg-zinc-800/30 hover:bg-zinc-800/60 rounded-lg cursor-pointer group transition-all border border-transparent hover:border-yellow-500/20"
                            >
                                <span className="text-zinc-600 select-none w-8 text-right shrink-0 font-bold">
                                    {(safeHistory.length - i).toString().padStart(3, '0')}
                                </span>
                                <span className="text-zinc-400 group-hover:text-yellow-400 transition-colors break-all">
                                    {cmd}
                                </span>
                            </motion.div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                            <span className="text-4xl mb-2">📭</span>
                            <p className="text-sm">No history found</p>
                            <p className="text-[10px]">Commands will appear here</p>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] text-zinc-600">
                        {historyUnavailable ? '—' : safeHistory.length} commands
                    </span>
                    <span className="text-[10px] text-zinc-600">
                        Auto-refresh: 5s
                    </span>
                </div>
            </div>
        </div>
    );
}
