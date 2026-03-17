
export interface MetricEvent {
    timestamp: number;
    type: string;
    value: number;
    tags?: Record<string, string>;
}

export interface MetricsServiceOptions {
    maxEvents?: number;
    monitoringIntervalMs?: number;
}

import os from 'os';

export class MetricsService {
    private static instance: MetricsService;
    private events: MetricEvent[] = [];
    private readonly MAX_EVENTS = 10000;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor() { }

    // Singleton factory method for proper test isolation
    public static getInstance(): MetricsService {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }

    // Cleanup method for test isolation (clears static instance and stops monitoring)
    public dispose(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.events = [];
    }

    public startMonitoring(intervalMs: number = 5000) {
        if (this.monitorInterval) clearInterval(this.monitorInterval);

        console.log("[MetricsService] Starting system monitoring...");
        // const os = require('os'); // Replaced with import

        this.monitorInterval = setInterval(() => {
            const mem = process.memoryUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();

            this.track('memory_heap', mem.heapUsed);
            this.track('memory_rss', mem.rss);
            this.track('system_load', os.loadavg()[0]); // 1 min load
            this.track('system_free_mem', freeMem);
        }, intervalMs);
    }

    public stopMonitoring() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
    }

    track(type: string, value: number, tags?: Record<string, string>) {
        this.events.push({
            timestamp: Date.now(),
            type,
            value,
            tags
        });

        if (this.events.length > this.MAX_EVENTS) {
            this.events = this.events.slice(-this.MAX_EVENTS / 2); // Keep half
        }
    }

    trackDuration(name: string, ms: number, tags?: Record<string, string>) {
        this.track('duration', ms, { name, ...tags });
    }

    getStats(windowMs: number = 3600000) { // Default 1 hour
        const now = Date.now();
        const relevant = this.events.filter(e => e.timestamp > now - windowMs);

        const counts: Record<string, number> = {};
        const sums: Record<string, number> = {};

        relevant.forEach(e => {
            const key = e.type;
            counts[key] = (counts[key] || 0) + 1;
            sums[key] = (sums[key] || 0) + e.value;
        });

        // Calculate averages
        const averages: Record<string, number> = {};
        Object.keys(sums).forEach(k => {
            averages[k] = sums[k] / counts[k];
        });

        return {
            windowMs,
            totalEvents: relevant.length,
            counts,
            averages,
            // Return raw series for graphing (downsampled if needed)
            series: this.downsample(relevant, 60) // 60 data points
        };
    }

    private downsample(events: MetricEvent[], buckets: number) {
        // Simple bucketing
        if (events.length === 0) return [];
        const start = events[0].timestamp;
        const end = Date.now();
        const interval = (end - start) / buckets;

        const res = [];
        for (let i = 0; i < buckets; i++) {
            const bucketStart = start + (i * interval);
            const bucketEnd = bucketStart + interval;
            const inBucket = events.filter(e => e.timestamp >= bucketStart && e.timestamp < bucketEnd);
            res.push({
                time: bucketStart,
                count: inBucket.length,
                value_avg: inBucket.reduce((acc, curr) => acc + curr.value, 0) / (inBucket.length || 1)
            });
        }
        return res;
    }
}
