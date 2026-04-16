import os from 'os';

export class SystemStatusTool {
    async getSystemStatus() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const uptime = os.uptime();
        const platform = os.platform();
        const release = os.release();

        const memUsage = ((totalMem - freeMem) / totalMem) * 100;

        return {
            platform: `${platform} ${release}`,
            cpu_model: cpus[0]?.model || 'Unknown',
            cpu_cores: cpus.length,
            load_average: loadAvg, // [1min, 5min, 15min]
            memory_total_gb: (totalMem / 1024 / 1024 / 1024).toFixed(2),
            memory_free_gb: (freeMem / 1024 / 1024 / 1024).toFixed(2),
            memory_usage_percent: memUsage.toFixed(1),
            uptime_seconds: uptime,
            // Simple uptime formatting
            uptime_hours: (uptime / 3600).toFixed(1)
        };
    }
}
