'use client';

import { trpc } from '@/utils/trpc';

export default function SystemStatus() {
    const snapshotQuery = trpc.metrics.systemSnapshot.useQuery(undefined, {
        refetchInterval: 5000,
        refetchOnWindowFocus: false,
    });
    const snapshotUnavailable = Boolean(snapshotQuery.error)
        || (snapshotQuery.data !== undefined && (
            !snapshotQuery.data
            || typeof snapshotQuery.data !== 'object'
            || !(snapshotQuery.data as { system?: unknown }).system
            || typeof (snapshotQuery.data as { system?: unknown }).system !== 'object'
            || !(snapshotQuery.data as { process?: unknown }).process
            || typeof (snapshotQuery.data as { process?: unknown }).process !== 'object'
        ));
    const snapshotData = !snapshotUnavailable ? snapshotQuery.data : undefined;

    const load1m = snapshotData?.system.loadAvg?.[0];
    const memPercent = snapshotData?.system.memoryUsagePercent;
    const freeRamGb = snapshotData ? snapshotData.system.freeMemory / (1024 ** 3) : undefined;
    const uptimeHours = snapshotData ? snapshotData.process.uptimeSeconds / 3600 : undefined;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                System Status
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <Stat label="CPU Load (1m)" value={snapshotQuery.isPending ? '…' : snapshotUnavailable ? '—' : load1m?.toFixed(2) ?? '—'} unit="" />
                <Stat label="Memory Usage" value={snapshotQuery.isPending ? '…' : snapshotUnavailable ? '—' : memPercent != null ? String(memPercent) : '—'} unit="%" />
                <Stat label="Free RAM" value={snapshotQuery.isPending ? '…' : snapshotUnavailable ? '—' : freeRamGb?.toFixed(2) ?? '—'} unit="GB" />
                <Stat label="Uptime" value={snapshotQuery.isPending ? '…' : snapshotUnavailable ? '—' : uptimeHours?.toFixed(2) ?? '—'} unit="h" />
            </div>
            {snapshotUnavailable && (
                <div className="text-xs text-red-400 font-mono mt-2">
                    Failed to load system snapshot: {snapshotQuery.error?.message ?? 'System snapshot returned an invalid payload.'}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
    return (
        <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-800/50">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</div>
            <div className="text-emerald-300 font-mono text-xl font-bold mt-1">
                {value}<span className="text-xs text-gray-500 ml-1 font-normal">{unit}</span>
            </div>
        </div>
    )
}
