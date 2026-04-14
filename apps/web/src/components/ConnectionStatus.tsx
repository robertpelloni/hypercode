"use client";
import { trpc } from "../utils/trpc";
import { motion } from 'framer-motion';

export default function ConnectionStatus() {
    const health = trpc.health.useQuery(undefined, { refetchInterval: 5000 });
    const healthUnavailable = Boolean(health.error) || (health.data !== undefined && (!health.data || typeof health.data !== 'object' || typeof (health.data as { status?: unknown }).status !== 'string'));
    const healthData = !healthUnavailable ? health.data : undefined;

    const isOnline = healthData?.status === 'ok' || healthData?.status === 'operational';

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-4">
            {/* Background Glow */}
            <div className={`absolute inset-0 opacity-20 ${isOnline ? 'bg-green-500' : 'bg-red-500'} blur-3xl`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">🔌</span>
                        Orchestrator Status
                    </h2>
                    {/* Live Indicator */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}
                    />
                </div>

                {healthUnavailable ? (
                    <div className="space-y-2 text-red-300">
                        <div className="font-semibold">Orchestrator unavailable</div>
                        <div className="text-sm text-red-200/80">{health.error?.message ?? 'Health status returned an invalid payload.'}</div>
                    </div>
                ) : !healthData ? (
                    <div className="flex items-center gap-2 text-zinc-400">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full"
                        />
                        Connecting to Core...
                    </div>
                ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <span className="text-zinc-400 text-sm">Service</span>
                                <span className="text-white font-mono text-sm">{healthData.service || 'hypercode-core'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <span className="text-zinc-400 text-sm">State</span>
                            <span className={`font-bold text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                                {isOnline ? '● ONLINE' : '○ OFFLINE'}
                            </span>
                        </div>
                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <span className="text-zinc-400 text-sm">Uptime</span>
                                <span className="text-cyan-400 font-mono text-sm">
                                    {Math.floor((Date.now() - (health.dataUpdatedAt || Date.now())) / 1000)}s ago
                                </span>
                            </div>
                        </div>
                    )}
                </div>
        </div>
    );
}
